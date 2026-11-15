import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

export type OAuthProvider = 'google' | 'linkedin';
export type OAuthTarget = 'web' | 'native';

interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId?: string;
  clientSecret?: string;
}

interface Profile {
  sub: string;
  email: string;
  firstName: string;
  lastName: string | null;
}

const STATE_AUDIENCE = 'oauth-state';
const STATE_TTL_SECONDS = 600;
const TICKET_TTL_MS = 2 * 60 * 1000;
const NATIVE_CALLBACK = 'hurden://oauth-callback';
/** Empreinte SHA-256 encodée en base64url : 43 caractères. */
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const sha256 = (value: string, encoding: 'hex' | 'base64url' = 'hex') =>
  createHash('sha256').update(value).digest(encoding);

/**
 * Connexion Google / LinkedIn en OpenID Connect (flux « authorization code »).
 * L'échange du code se fait côté serveur avec le secret client : il n'est jamais dans l'app.
 *
 * Protection contre le détournement du flux : l'application génère un secret (`verifier`),
 * n'envoie que son empreinte (`challenge`) au départ, et doit présenter le secret à la fin
 * pour obtenir ses jetons. Un lien de retour intercepté ou forgé est donc inutilisable.
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  enabledProviders() {
    return {
      google: this.isEnabled('google'),
      linkedin: this.isEnabled('linkedin'),
    };
  }

  /** Adresse du fournisseur vers laquelle rediriger le navigateur. */
  async authorizationUrl(
    provider: OAuthProvider,
    challenge: string,
    target: OAuthTarget,
  ): Promise<string> {
    const config = this.provider(provider);
    if (!CHALLENGE_PATTERN.test(challenge)) {
      throw new BadRequestException('Paramètre challenge invalide');
    }
    const state = await this.jwt.signAsync(
      { p: provider, c: challenge, t: target, n: randomUUID() },
      { audience: STATE_AUDIENCE, expiresIn: STATE_TTL_SECONDS },
    );
    const url = new URL(config.authorizeUrl);
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId!,
      redirect_uri: this.redirectUri(provider),
      scope: 'openid profile email',
      state,
    }).toString();
    return url.toString();
  }

  /**
   * Retour du fournisseur. Renvoie l'adresse de l'application vers laquelle rediriger,
   * avec un ticket à usage unique en cas de succès ou un code d'erreur sinon.
   */
  async handleCallback(
    provider: OAuthProvider,
    code: string | undefined,
    state: string | undefined,
  ): Promise<string> {
    let target: OAuthTarget = 'web';
    try {
      const config = this.provider(provider);
      if (!code || !state) throw new Error('code ou state manquant');
      const payload = await this.jwt.verifyAsync<{
        p: string;
        c: string;
        t: OAuthTarget;
      }>(state, { audience: STATE_AUDIENCE, algorithms: ['HS256'] });
      target = payload.t === 'native' ? 'native' : 'web';
      if (payload.p !== provider) throw new Error('state émis pour un autre fournisseur');

      const profile = await this.fetchProfile(provider, config, code);
      const userId = await this.findOrCreateUser(provider, profile);

      const ticket = randomBytes(32).toString('base64url');
      await this.prisma.oAuthTicket.create({
        data: {
          tokenHash: sha256(ticket),
          challenge: payload.c,
          userId,
          expiresAt: new Date(Date.now() + TICKET_TTL_MS),
        },
      });
      return this.appUrl(target, { ticket });
    } catch (error) {
      this.logger.warn(
        `Connexion ${provider} refusée : ${error instanceof Error ? error.message : error}`,
      );
      return this.appUrl(target, { error: 'oauth_failed' });
    }
  }

  /** Échange le ticket (à usage unique) contre une session, sur preuve du `verifier`. */
  async exchangeTicket(ticket: string, verifier: string) {
    const stored = await this.prisma.oAuthTicket.findUnique({
      where: { tokenHash: sha256(ticket) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Connexion expirée, réessaie');
    // Suppression avant toute vérification : un ticket ne peut servir qu'une fois.
    const consumed = await this.prisma.oAuthTicket.deleteMany({
      where: { id: stored.id },
    });
    if (
      consumed.count === 0 ||
      stored.expiresAt <= new Date() ||
      sha256(verifier, 'base64url') !== stored.challenge
    ) {
      throw new UnauthorizedException('Connexion expirée, réessaie');
    }
    await this.prisma.user.update({
      where: { id: stored.userId },
      data: { lastLoginAt: new Date() },
    });
    return {
      user: this.auth.publicUser(stored.user),
      ...(await this.auth.issueTokens(
        stored.user.id,
        stored.user.role,
        randomUUID(),
      )),
    };
  }

  private async fetchProfile(
    provider: OAuthProvider,
    config: ProviderConfig,
    code: string,
  ): Promise<Profile> {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri(provider),
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) throw new Error(`échange du code refusé (${tokenResponse.status})`);
    const { access_token: accessToken } = (await tokenResponse.json()) as {
      access_token?: string;
    };
    if (!accessToken) throw new Error('jeton du fournisseur absent');

    const userResponse = await fetch(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!userResponse.ok) throw new Error(`profil indisponible (${userResponse.status})`);
    const info = (await userResponse.json()) as Record<string, unknown>;

    const sub = typeof info.sub === 'string' ? info.sub : '';
    const email = typeof info.email === 'string' ? info.email.trim().toLowerCase() : '';
    // Sans e-mail vérifié par le fournisseur, on ne peut pas rattacher un compte en confiance.
    const verified = info.email_verified === true || info.email_verified === 'true';
    if (!sub || !email || email.length > 254 || !verified) {
      throw new Error('profil sans e-mail vérifié');
    }
    const clean = (value: unknown) =>
      typeof value === 'string' ? value.trim().slice(0, 60) : '';
    return {
      sub,
      email,
      firstName:
        clean(info.given_name) || clean(info.name).split(' ')[0] || email.split('@')[0].slice(0, 60),
      lastName: clean(info.family_name) || null,
    };
  }

  private async findOrCreateUser(provider: OAuthProvider, profile: Profile): Promise<string> {
    const linked = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: { provider, providerUserId: profile.sub },
      },
      select: { userId: true },
    });
    if (linked) return linked.userId;

    const existing = await this.prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true, passwordHash: true },
    });
    if (existing) {
      // Le compte existant a pu être créé par quelqu'un d'autre avec cette adresse (les
      // e-mails saisis à l'inscription ne sont pas vérifiés). Le fournisseur, lui, prouve
      // qui possède l'adresse : on rattache le compte, on invalide l'ancien mot de passe
      // et on ferme toutes les sessions ouvertes.
      await this.prisma.$transaction([
        this.prisma.oAuthAccount.create({
          data: { provider, providerUserId: profile.sub, userId: existing.id },
        }),
        this.prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash: null },
        }),
      ]);
      if (existing.passwordHash) await this.auth.revokeAllSessions(existing.id);
      return existing.id;
    }

    const created = await this.prisma.user.create({
      data: {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        oauthAccounts: { create: { provider, providerUserId: profile.sub } },
      },
      select: { id: true },
    });
    return created.id;
  }

  private provider(provider: OAuthProvider): ProviderConfig {
    const config: ProviderConfig | undefined = {
      google: {
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        clientId: this.config.get<string>('GOOGLE_CLIENT_ID'),
        clientSecret: this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      },
      linkedin: {
        authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
        clientId: this.config.get<string>('LINKEDIN_CLIENT_ID'),
        clientSecret: this.config.get<string>('LINKEDIN_CLIENT_SECRET'),
      },
    }[provider];
    if (!config) throw new NotFoundException('Fournisseur inconnu');
    if (!config.clientId || !config.clientSecret) {
      throw new NotFoundException("Ce mode de connexion n'est pas encore activé");
    }
    return config;
  }

  private isEnabled(provider: OAuthProvider) {
    try {
      this.provider(provider);
      return true;
    } catch {
      return false;
    }
  }

  private redirectUri(provider: OAuthProvider) {
    return `${this.config.getOrThrow<string>('API_PUBLIC_URL')}/api/v1/auth/oauth/${provider}/callback`;
  }

  /** Destination fixe (web ou application) : jamais une adresse fournie par la requête. */
  private appUrl(target: OAuthTarget, params: Record<string, string>) {
    const base =
      target === 'native'
        ? NATIVE_CALLBACK
        : `${this.config.getOrThrow<string>('WEB_APP_URL')}/oauth-callback`;
    return `${base}?${new URLSearchParams(params).toString()}`;
  }
}
