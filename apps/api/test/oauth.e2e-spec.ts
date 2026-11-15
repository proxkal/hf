import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { configureApp } from '../src/setup.js';

/**
 * Connexion Google / LinkedIn. Le fournisseur est simulé (fetch remplacé) :
 * aucun appel réseau réel, aucun identifiant réel.
 */
describe('Connexion OAuth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());
  const run = Date.now();
  const DOMAIN = '@oauth-e2e.hurden.local';
  /** Profil que le faux fournisseur renverra au prochain appel. */
  let providerProfile: Record<string, unknown> = {};

  const pair = () => {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
  };

  /** Joue le flux jusqu'au retour vers l'application et renvoie l'URL de retour. */
  const signInWithGoogle = async (challenge: string) => {
    const start = await api()
      .get(`/api/v1/auth/oauth/google/start?challenge=${challenge}`)
      .expect(302);
    const state = new URL(start.headers.location).searchParams.get('state')!;
    const callback = await api()
      .get('/api/v1/auth/oauth/google/callback')
      .query({ code: 'code-de-test', state })
      .expect(302);
    return new URL(callback.headers.location);
  };

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    delete process.env.LINKEDIN_CLIENT_ID;
    delete process.env.LINKEDIN_CLIENT_SECRET;
    process.env.API_PUBLIC_URL = 'http://127.0.0.1:3000';
    process.env.WEB_APP_URL = 'http://localhost:8081';

    vi.stubGlobal('fetch', async (url: string | URL) => {
      const target = String(url);
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), {
          headers: { 'Content-Type': 'application/json' },
        });
      if (target.startsWith('https://oauth2.googleapis.com/token')) {
        return json({ access_token: 'jeton-fournisseur-de-test' });
      }
      if (target.startsWith('https://openidconnect.googleapis.com/')) {
        return json(providerProfile);
      }
      throw new Error(`Appel réseau inattendu : ${target}`);
    });

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    await app.close();
    vi.unstubAllGlobals();
  });

  it('n’annonce que les fournisseurs configurés', async () => {
    await api()
      .get('/api/v1/auth/oauth/providers')
      .expect(200, { google: true, linkedin: false });
    const { challenge } = pair();
    await api()
      .get(`/api/v1/auth/oauth/linkedin/start?challenge=${challenge}`)
      .expect(404);
    await api().get(`/api/v1/auth/oauth/facebook/start?challenge=${challenge}`).expect(400);
    await api().get('/api/v1/auth/oauth/google/start?challenge=trop-court').expect(400);
  });

  it('redirige vers Google avec une adresse de retour fixe', async () => {
    const { challenge } = pair();
    const res = await api()
      .get(`/api/v1/auth/oauth/google/start?challenge=${challenge}`)
      .expect(302);
    const url = new URL(res.headers.location);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://127.0.0.1:3000/api/v1/auth/oauth/google/callback',
    );
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(res.headers.location).not.toContain('test-client-secret');
  });

  it('rejette un state forgé et un e-mail non vérifié', async () => {
    const forged = await api()
      .get('/api/v1/auth/oauth/google/callback')
      .query({ code: 'x', state: 'eyJhbGciOiJub25lIn0.e30.' })
      .expect(302);
    expect(forged.headers.location).toBe(
      'http://localhost:8081/oauth-callback?error=oauth_failed',
    );

    providerProfile = {
      sub: `sub-unverified-${run}`,
      email: `unverified.${run}${DOMAIN}`,
      email_verified: false,
    };
    const back = await signInWithGoogle(pair().challenge);
    expect(back.searchParams.get('error')).toBe('oauth_failed');
    expect(back.searchParams.get('ticket')).toBeNull();
  });

  it('crée le compte, exige le secret de l’application et le consentement aux CGU', async () => {
    providerProfile = {
      sub: `sub-${run}`,
      email: `Lea.${run}${DOMAIN}`,
      email_verified: true,
      given_name: 'Léa',
      family_name: 'Martin',
    };

    // Ticket intercepté par un tiers : inutilisable sans le secret, et détruit à l'essai.
    const first = pair();
    const stolen = (await signInWithGoogle(first.challenge)).searchParams.get('ticket')!;
    await api()
      .post('/api/v1/auth/oauth/exchange')
      .send({ ticket: stolen, verifier: pair().verifier })
      .expect(401);
    await api()
      .post('/api/v1/auth/oauth/exchange')
      .send({ ticket: stolen, verifier: first.verifier })
      .expect(401);

    const second = pair();
    const back = await signInWithGoogle(second.challenge);
    expect(back.origin + back.pathname).toBe('http://localhost:8081/oauth-callback');
    const ticket = back.searchParams.get('ticket')!;
    const session = await api()
      .post('/api/v1/auth/oauth/exchange')
      .send({ ticket, verifier: second.verifier })
      .expect(200);
    expect(session.body.user).toMatchObject({ firstName: 'Léa', role: 'STUDENT' });
    expect(session.body.user.email).toBe(`lea.${run}${DOMAIN}`);
    await api()
      .post('/api/v1/auth/oauth/exchange')
      .send({ ticket, verifier: second.verifier })
      .expect(401);

    const bearer = { Authorization: `Bearer ${session.body.accessToken}` };
    const before = await api().get('/api/v1/me').set(bearer).expect(200);
    expect(before.body.termsUpToDate).toBe(false);
    await api().post('/api/v1/me/consent').set(bearer).send({ acceptTerms: false }).expect(400);
    await api().post('/api/v1/me/consent').set(bearer).send({ acceptTerms: true }).expect(201);
    const after = await api().get('/api/v1/me').set(bearer).expect(200);
    expect(after.body.termsUpToDate).toBe(true);

    // Une seconde connexion retrouve le même compte.
    const third = pair();
    const again = await signInWithGoogle(third.challenge);
    const sameSession = await api()
      .post('/api/v1/auth/oauth/exchange')
      .send({ ticket: again.searchParams.get('ticket'), verifier: third.verifier })
      .expect(200);
    expect(sameSession.body.user.id).toBe(session.body.user.id);

    // Droit à l'oubli pour un compte sans mot de passe : mot de confirmation exigé.
    expect(after.body.hasPassword).toBe(false);
    const fresh = { Authorization: `Bearer ${sameSession.body.accessToken}` };
    await api().delete('/api/v1/me').set(fresh).send({}).expect(403);
    await api().delete('/api/v1/me').set(fresh).send({ confirm: 'SUPPRIMER' }).expect(204);
    await api().get('/api/v1/me').set(fresh).expect(404);
  });

  it('neutralise un compte créé à l’avance par un tiers avec l’e-mail de la victime', async () => {
    const email = `victime.${run}${DOMAIN}`;
    const password = 'Mot-de-passe-du-squatteur';
    const squatter = await api()
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Squatteur', acceptTerms: true })
      .expect(201);

    providerProfile = {
      sub: `sub-victime-${run}`,
      email,
      email_verified: true,
      given_name: 'Victime',
    };
    const keys = pair();
    const back = await signInWithGoogle(keys.challenge);
    const owner = await api()
      .post('/api/v1/auth/oauth/exchange')
      .send({ ticket: back.searchParams.get('ticket'), verifier: keys.verifier })
      .expect(200);
    expect(owner.body.user.id).toBe(squatter.body.user.id);

    // Le squatteur perd son mot de passe et ses sessions.
    await api().post('/api/v1/auth/login').send({ email, password }).expect(401);
    await api()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: squatter.body.refreshToken })
      .expect(401);
  });
});
