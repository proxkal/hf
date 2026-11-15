import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { TERMS_VERSION } from '../common/legal.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';

/** Paramètres Argon2id recommandés par l'OWASP (19 Mio, 2 itérations). */
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
const INVALID_CREDENTIALS = 'E-mail ou mot de passe incorrect';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Hash factice : égalise le temps de réponse quand l'e-mail est inconnu. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await hash(dto.password, ARGON2_OPTIONS);
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail');
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        lastLoginAt: new Date(),
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });
    return {
      user: this.publicUser(user),
      ...(await this.issueTokens(user.id, user.role, randomUUID())),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    this.dummyHash ??= hash(randomBytes(16).toString('hex'), ARGON2_OPTIONS);
    const valid = await verify(
      user?.passwordHash ?? (await this.dummyHash),
      dto.password,
    ).catch(() => false);
    if (!user || !user.passwordHash || !valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      user: this.publicUser(user),
      ...(await this.issueTokens(user.id, user.role, randomUUID())),
    };
  }

  /**
   * Rotation du jeton de rafraîchissement : chaque jeton ne sert qu'une fois.
   * Si un jeton déjà utilisé réapparaît, il a probablement été volé :
   * toute la famille de jetons est révoquée et l'utilisateur doit se reconnecter.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!stored) throw new UnauthorizedException('Session expirée');

    const consumed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (consumed.count === 0) {
      await this.revokeFamily(stored.familyId);
      this.logger.warn(
        `Réutilisation d'un jeton de rafraîchissement (utilisateur ${stored.userId})`,
      );
      throw new UnauthorizedException('Session expirée');
    }
    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expirée');
    }
    return this.issueTokens(stored.user.id, stored.user.role, stored.familyId);
  }

  /** Déconnexion : révoque la famille du jeton présenté. Toujours silencieuse. */
  async logout(refreshToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      select: { familyId: true },
    });
    if (stored) await this.revokeFamily(stored.familyId);
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) return false;
    return verify(user.passwordHash, password).catch(() => false);
  }

  /** Révoque toutes les sessions d'un utilisateur (ex. reprise de compte via OAuth). */
  async revokeAllSessions(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async issueTokens(
    userId: string,
    role: string,
    familyId: string,
  ): Promise<AuthTokens> {
    const expiresIn = this.config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS');
    const ttlDays = this.config.getOrThrow<number>('REFRESH_TTL_DAYS');
    const accessToken = await this.jwt.signAsync({ sub: userId, role });
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: sha256(refreshToken),
        familyId,
        userId,
        expiresAt: new Date(Date.now() + ttlDays * 86_400_000),
      },
    });
    return { accessToken, refreshToken, expiresIn };
  }

  publicUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    role: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }
}
