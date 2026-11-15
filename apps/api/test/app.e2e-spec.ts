import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { configureApp } from '../src/setup.js';

/**
 * Tests de bout en bout sur la base de développement (docker compose + seed).
 * Les comptes créés portent le domaine @e2e.hurden.local et sont supprimés à la fin.
 */
describe('API HURDEN (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());
  const run = Date.now();
  const alice = {
    email: `alice.${run}@e2e.hurden.local`,
    password: 'Mot-de-passe-solide-1',
    firstName: 'Alice',
    acceptTerms: true,
  };
  const bob = {
    email: `bob.${run}@e2e.hurden.local`,
    password: 'Mot-de-passe-solide-2',
    firstName: 'Bob',
    acceptTerms: true,
  };
  let aliceTokens: { accessToken: string; refreshToken: string };
  let bobTokens: { accessToken: string; refreshToken: string };
  const auth = (t: { accessToken: string }) => ({
    Authorization: `Bearer ${t.accessToken}`,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@e2e.hurden.local' } },
    });
    await app.close();
  });

  it('répond sur /health sans authentification', async () => {
    await api().get('/api/v1/health').expect(200, { status: 'ok' });
  });

  it('refuse toute route protégée sans jeton ou avec un jeton falsifié', async () => {
    await api().get('/api/v1/me').expect(401);
    await api().get('/api/v1/coaches').expect(401);
    await api()
      .get('/api/v1/me')
      .set('Authorization', 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.')
      .expect(401);
  });

  it('refuse un mot de passe trop court et les champs inconnus', async () => {
    await api()
      .post('/api/v1/auth/register')
      .send({ ...alice, password: 'court' })
      .expect(400);
    await api()
      .post('/api/v1/auth/register')
      .send({ ...alice, role: 'ADMIN' })
      .expect(400);
    // RGPD : pas de compte sans consentement explicite aux CGU.
    const { acceptTerms: _omitted, ...withoutConsent } = alice;
    await api().post('/api/v1/auth/register').send(withoutConsent).expect(400);
    await api()
      .post('/api/v1/auth/register')
      .send({ ...alice, acceptTerms: false })
      .expect(400);
  });

  it('inscrit deux étudiants sans jamais renvoyer le hash du mot de passe', async () => {
    const a = await api().post('/api/v1/auth/register').send(alice).expect(201);
    const b = await api().post('/api/v1/auth/register').send(bob).expect(201);
    aliceTokens = a.body;
    bobTokens = b.body;
    expect(a.body.user).toMatchObject({ firstName: 'Alice', role: 'STUDENT' });
    expect(JSON.stringify(a.body)).not.toContain('passwordHash');
    await api().post('/api/v1/auth/register').send(alice).expect(409);
  });

  it('refuse un mauvais mot de passe avec le même message qu’un e-mail inconnu', async () => {
    const wrong = await api()
      .post('/api/v1/auth/login')
      .send({ email: alice.email, password: 'mauvais-mot-de-passe' })
      .expect(401);
    const unknown = await api()
      .post('/api/v1/auth/login')
      .send({ email: `nobody.${run}@e2e.hurden.local`, password: 'x' })
      .expect(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('fait tourner le jeton de rafraîchissement et révoque la session en cas de réutilisation', async () => {
    const first = aliceTokens.refreshToken;
    const rotated = await api()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first })
      .expect(200);
    expect(rotated.body.refreshToken).not.toBe(first);

    // Rejouer l'ancien jeton = vol présumé : toute la famille est révoquée.
    await api().post('/api/v1/auth/refresh').send({ refreshToken: first }).expect(401);
    await api()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);

    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: alice.email, password: alice.password })
      .expect(200);
    aliceTokens = login.body;
  });

  it('enregistre le profil étudiant et le renvoie dans /me', async () => {
    await api()
      .put('/api/v1/me/student-profile')
      .set(auth(aliceTokens))
      .send({
        domain: 'Cybersécurité',
        keywords: ['SOC', 'pentest', 'SOC'],
        contractType: 'ALTERNANCE',
        cities: ['Toulouse'],
      })
      .expect(200);
    const me = await api().get('/api/v1/me').set(auth(aliceTokens)).expect(200);
    expect(me.body.firstName).toBe('Alice');
    expect(me.body.termsUpToDate).toBe(true);
    expect(me.body.termsAcceptedAt).toBeTruthy();
    expect(me.body.studentProfile.keywords).toEqual(['SOC', 'pentest']);
    expect(me.body.passwordHash).toBeUndefined();
  });

  it('liste les coachs par distance sans exposer leur e-mail', async () => {
    const res = await api()
      .get('/api/v1/coaches?lat=43.6045&lng=1.444&radiusKm=20')
      .set(auth(aliceTokens))
      .expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(5);
    const distances = res.body.map((c: { distanceKm: number }) => c.distanceKm);
    expect(distances).toEqual([...distances].sort((x, y) => x - y));
    expect(JSON.stringify(res.body)).not.toContain('@demo.hurden.local');

    const near = await api()
      .get('/api/v1/coaches?lat=43.6045&lng=1.444&radiusKm=2')
      .set(auth(aliceTokens))
      .expect(200);
    expect(near.body.length).toBeLessThan(res.body.length);
    await api()
      .get('/api/v1/coaches?lat=999')
      .set(auth(aliceTokens))
      .expect(400);
  });

  it('réserve un coach, bloque le créneau et cloisonne les réservations', async () => {
    const coaches = await api().get('/api/v1/coaches').set(auth(aliceTokens));
    const coach = await api()
      .get(`/api/v1/coaches/${coaches.body[0].id}`)
      .set(auth(aliceTokens))
      .expect(200);
    const offer = coach.body.offers[0];
    const startsAt = new Date(Date.now() + (30 * 24 + (run % 500)) * 3_600_000);
    startsAt.setMinutes(0, 0, 0);

    const booking = await api()
      .post('/api/v1/bookings')
      .set(auth(aliceTokens))
      // Un prix envoyé par le client doit être rejeté, pas pris en compte.
      .send({ offerId: offer.id, startsAt: startsAt.toISOString(), mode: 'IN_PERSON' })
      .expect(201);
    expect(booking.body.priceCents).toBe(offer.priceCents);
    await api()
      .post('/api/v1/bookings')
      .set(auth(aliceTokens))
      .send({ offerId: offer.id, startsAt: startsAt.toISOString(), mode: 'IN_PERSON', priceCents: 1 })
      .expect(400);

    // Bob ne peut ni prendre le même créneau, ni voir, ni annuler la réservation d'Alice.
    await api()
      .post('/api/v1/bookings')
      .set(auth(bobTokens))
      .send({ offerId: offer.id, startsAt: startsAt.toISOString(), mode: 'IN_PERSON' })
      .expect(409);
    const bobList = await api().get('/api/v1/bookings').set(auth(bobTokens));
    expect(bobList.body).toEqual([]);
    await api()
      .post(`/api/v1/bookings/${booking.body.id}/cancel`)
      .set(auth(bobTokens))
      .expect(404);

    await api()
      .post('/api/v1/bookings')
      .set(auth(aliceTokens))
      .send({ offerId: offer.id, startsAt: new Date().toISOString(), mode: 'IN_PERSON' })
      .expect(400);
    await api()
      .post(`/api/v1/bookings/${booking.body.id}/cancel`)
      .set(auth(aliceTokens))
      .expect(200);
  });

  it('gère l’inscription aux événements, l’adhésion et les bons plans', async () => {
    const events = await api().get('/api/v1/events').set(auth(aliceTokens)).expect(200);
    expect(events.body.length).toBeGreaterThanOrEqual(1);
    const id = events.body[0].id;
    await api().post(`/api/v1/events/${id}/registration`).set(auth(aliceTokens)).expect(201);
    const detail = await api().get(`/api/v1/events/${id}`).set(auth(aliceTokens));
    expect(detail.body.registered).toBe(true);
    const asBob = await api().get(`/api/v1/events/${id}`).set(auth(bobTokens));
    expect(asBob.body.registered).toBe(false);
    await api().delete(`/api/v1/events/${id}/registration`).set(auth(aliceTokens)).expect(204);

    const assos = await api().get('/api/v1/associations').set(auth(aliceTokens)).expect(200);
    await api()
      .post(`/api/v1/associations/${assos.body[0].id}/membership-request`)
      .set(auth(aliceTokens))
      .expect(201);

    const deals = await api().get('/api/v1/deals?category=BANK').set(auth(aliceTokens)).expect(200);
    expect(deals.body.every((d: { category: string }) => d.category === 'BANK')).toBe(true);
    expect(deals.body[0].url).toBeUndefined();
    const click = await api()
      .post(`/api/v1/deals/${deals.body[0].id}/click`)
      .set(auth(aliceTokens))
      .expect(201);
    expect(click.body.url).toMatch(/^https:\/\//);
    await api().get('/api/v1/deals?category=PIRATE').set(auth(aliceTokens)).expect(400);
    await api().get('/api/v1/coaches/pas-un-uuid').set(auth(aliceTokens)).expect(400);
  });

  it('exporte puis supprime le compte (RGPD), mot de passe exigé', async () => {
    const exported = await api().get('/api/v1/me/export').set(auth(bobTokens)).expect(200);
    expect(exported.body.data.email).toBe(bob.email);
    await api()
      .delete('/api/v1/me')
      .set(auth(bobTokens))
      .send({ password: 'pas-le-bon-mot-de-passe' })
      .expect(403);
    await api()
      .delete('/api/v1/me')
      .set(auth(bobTokens))
      .send({ confirm: 'SUPPRIMER' })
      .expect(403);
    await api()
      .delete('/api/v1/me')
      .set(auth(bobTokens))
      .send({ password: bob.password })
      .expect(204);
    await api().get('/api/v1/me').set(auth(bobTokens)).expect(404);
    await api()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: bobTokens.refreshToken })
      .expect(401);
  });

  it('limite les tentatives de connexion (anti force brute)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await api()
        .post('/api/v1/auth/login')
        .send({ email: alice.email, password: 'tentative-incorrecte' });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
