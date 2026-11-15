/**
 * Données de DÉMONSTRATION pour Toulouse.
 * Les coachs sont fictifs. Les associations et partenaires portent des noms réels cités
 * dans les documents HURDEN, mais leurs fiches (textes, cotisations, offres) sont des
 * exemples à remplacer par des contenus validés avec eux avant toute mise en ligne.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const inDays = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const coaches = [
  {
    email: 'coach.aero@demo.hurden.local',
    displayName: 'Claire M.',
    headline: 'Ex-recruteuse aéronautique · 9 ans en talent acquisition',
    bio: "J'ai recruté des alternants ingénieurs et supply chain dans l'aéronautique toulousaine. Je t'aide à comprendre les étapes du processus, à préparer les entretiens techniques et RH, et à identifier la certification qui manque à ton CV.",
    domains: ['Aéronautique', 'Ingénierie'],
    knownProcesses: ['Grands groupes aéronautiques', 'Sous-traitants de rang 1'],
    city: 'Blagnac',
    lat: 43.636,
    lng: 1.39,
    ratingAvg: 4.9,
    ratingCount: 31,
    offers: [
      { title: 'Analyse de CV', durationMin: 30, priceCents: 1500 },
      { title: "Simulation d'entretien", durationMin: 60, priceCents: 4000 },
    ],
  },
  {
    email: 'coach.cyber@demo.hurden.local',
    displayName: 'Yanis B.',
    headline: 'Ingénieur cybersécurité · ancien alternant en ESN',
    bio: "Passé par l'alternance en SOC puis en audit, je connais les tests techniques et les questions posées en ESN et chez les intégrateurs. On travaille ton CV, ton GitHub et ton discours.",
    domains: ['Cybersécurité', 'Informatique'],
    knownProcesses: ['ESN', 'SOC', 'Cabinets de conseil'],
    city: 'Toulouse',
    lat: 43.6115,
    lng: 1.4357,
    ratingAvg: 4.8,
    ratingCount: 18,
    offers: [
      { title: 'Relecture CV + LinkedIn', durationMin: 30, priceCents: 1200 },
      { title: 'Préparation entretien technique', durationMin: 45, priceCents: 2500 },
    ],
  },
  {
    email: 'coach.rh@demo.hurden.local',
    displayName: 'Sophie L.',
    headline: 'Chargée de recrutement · banque et assurance',
    bio: "Je reçois chaque année des dizaines de candidatures d'alternants. Je te montre ce que lit un recruteur en 30 secondes et comment passer les filtres automatiques (ATS).",
    domains: ['Banque', 'Commerce', 'Ressources humaines'],
    knownProcesses: ['Banques de réseau', 'Assurances', 'Mutuelles'],
    city: 'Toulouse',
    lat: 43.6005,
    lng: 1.4465,
    ratingAvg: 4.7,
    ratingCount: 42,
    offers: [
      { title: 'CV et filtres ATS', durationMin: 30, priceCents: 1000 },
      { title: 'Entretien RH blanc', durationMin: 45, priceCents: 2000 },
    ],
  },
  {
    email: 'coach.dev@demo.hurden.local',
    displayName: 'Mehdi K.',
    headline: 'Lead développeur · jury de recrutement tech',
    bio: "Je fais passer des entretiens techniques depuis 6 ans. On prépare ensemble les exercices de code, la présentation de tes projets et la négociation de ton alternance.",
    domains: ['Informatique', 'Développement web'],
    knownProcesses: ['Start-up', 'Éditeurs de logiciels'],
    city: 'Labège',
    lat: 43.543,
    lng: 1.512,
    ratingAvg: 4.6,
    ratingCount: 12,
    offers: [
      { title: 'Revue de portfolio', durationMin: 30, priceCents: 1500 },
      { title: 'Entretien technique blanc', durationMin: 60, priceCents: 3500 },
    ],
  },
  {
    email: 'coach.com@demo.hurden.local',
    displayName: 'Inès D.',
    headline: 'Responsable marketing · ancienne alternante en agence',
    bio: "Je t'aide à construire un CV et un book qui racontent une histoire, et à préparer les études de cas demandées en agence comme chez l'annonceur.",
    domains: ['Marketing', 'Communication'],
    knownProcesses: ['Agences', 'Annonceurs'],
    city: 'Toulouse',
    lat: 43.5985,
    lng: 1.432,
    ratingAvg: 4.8,
    ratingCount: 24,
    offers: [
      { title: 'Analyse de CV et book', durationMin: 30, priceCents: 1200 },
      { title: 'Préparation étude de cas', durationMin: 60, priceCents: 3000 },
    ],
  },
  {
    email: 'coach.sante@demo.hurden.local',
    displayName: 'Thomas R.',
    headline: 'RH en santé et biotech · 12 ans de recrutement',
    bio: "Je connais les attentes des laboratoires et des structures de santé pour les stages de fin d'études. On clarifie ton projet et on prépare tes entretiens.",
    domains: ['Santé', 'Biotechnologies'],
    knownProcesses: ['Laboratoires', 'Établissements de santé'],
    city: 'Toulouse',
    lat: 43.5615,
    lng: 1.466,
    ratingAvg: 4.5,
    ratingCount: 9,
    offers: [
      { title: 'Bilan de candidature', durationMin: 45, priceCents: 2000 },
    ],
  },
];

async function main() {
  // Le seed est rejouable : on repart de zéro pour les contenus de démonstration.
  await prisma.dealClick.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.membershipRequest.deleteMany();
  await prisma.association.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@demo.hurden.local' } },
  });

  for (const { email, offers, ...profile } of coaches) {
    await prisma.user.create({
      data: {
        email,
        firstName: profile.displayName.split(' ')[0],
        role: 'COACH',
        coachProfile: {
          create: { ...profile, status: 'APPROVED', offers: { create: offers } },
        },
      },
    });
  }

  const remu = await prisma.association.create({
    data: {
      name: 'ReMU',
      tagline: 'Ressourçons-nous à Mirail Université · Ensemble, faisons bouger les choses',
      mediaKey: 'remu',
      description:
        "Association étudiante du campus du Mirail : entraide, rencontres et projets solidaires. Fiche de démonstration à valider avec l'association.",
      address: 'Campus du Mirail',
      city: 'Toulouse',
      lat: 43.5775,
      lng: 1.403,
      membershipFeeCents: 500,
      needsVolunteers: true,
      status: 'APPROVED',
    },
  });
  await prisma.association.createMany({
    data: [
      {
        name: 'La Main Tendue',
        tagline: 'Solidarité et lien social',
        description:
          "Actions de solidarité et d'accompagnement. Fiche de démonstration à valider avec l'association.",
        address: 'Toulouse centre',
        city: 'Toulouse',
        lat: 43.607,
        lng: 1.449,
        membershipFeeCents: 1000,
        needsVolunteers: true,
        status: 'APPROVED',
      },
      {
        name: "Les Amis de la Cité de l'espace (AACE)",
        tagline: 'Culture spatiale et scientifique',
        description:
          "Conférences et activités autour de l'espace. Fiche de démonstration à valider avec l'association.",
        address: "Avenue Jean Gonord",
        city: 'Toulouse',
        lat: 43.5866,
        lng: 1.4935,
        membershipFeeCents: 2000,
        needsVolunteers: true,
        status: 'APPROVED',
      },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        title: 'Meet-up HURDEN · CV Analyzing',
        description:
          'Fais analyser ton CV gratuitement par des coachs et des professionnels du recrutement, découvre HURDEN en démonstration et rencontre les membres de ReMU. Buffet étudiant sur place.',
        type: 'MEETUP',
        organizerName: 'HURDEN × ReMU',
        associationId: remu.id,
        startsAt: inDays(21, 18),
        endsAt: inDays(21, 21),
        venue: 'Locaux de ReMU',
        address: 'Campus du Mirail',
        city: 'Toulouse',
        lat: 43.5775,
        lng: 1.403,
        capacity: 50,
        status: 'APPROVED',
      },
      {
        title: 'Job dating alternance · numérique',
        description:
          "Rencontres de 10 minutes avec des entreprises toulousaines qui recrutent en alternance dans le numérique. Viens avec plusieurs CV.",
        type: 'JOB_DATING',
        organizerName: 'Démonstration',
        startsAt: inDays(9, 14),
        endsAt: inDays(9, 17, 30),
        venue: 'Quartier Compans-Caffarelli',
        address: 'Boulevard Lascrosses',
        city: 'Toulouse',
        lat: 43.6115,
        lng: 1.4357,
        capacity: 120,
        status: 'APPROVED',
      },
      {
        title: "Conférence · L'IA de confiance",
        description:
          "Table ronde sur l'intelligence artificielle de confiance et ses métiers, suivie d'un temps de réseautage.",
        type: 'CONFERENCE',
        organizerName: 'Démonstration',
        startsAt: inDays(26, 18, 30),
        endsAt: inDays(26, 20, 30),
        venue: 'Centre de congrès',
        address: 'Esplanade Compans-Caffarelli',
        city: 'Toulouse',
        lat: 43.6102,
        lng: 1.4331,
        capacity: 200,
        status: 'APPROVED',
      },
      {
        title: 'Atelier · Réussir son entretien en 45 minutes',
        description:
          'Atelier pratique en petit groupe : se présenter en 2 minutes, répondre aux questions pièges, poser les bonnes questions.',
        type: 'WORKSHOP',
        organizerName: 'Démonstration',
        startsAt: inDays(5, 12, 30),
        endsAt: inDays(5, 13, 30),
        venue: 'Campus Rangueil',
        address: 'Route de Narbonne',
        city: 'Toulouse',
        lat: 43.5615,
        lng: 1.466,
        capacity: 15,
        status: 'APPROVED',
      },
      {
        title: 'Soirée réseau · Entreprendre dans l’impact',
        description:
          'Un moment de réseautage dédié aux étudiants et jeunes diplômés qui veulent rencontrer des entrepreneurs engagés.',
        type: 'NETWORKING',
        organizerName: 'Démonstration',
        startsAt: inDays(14, 19),
        endsAt: inDays(14, 21, 30),
        venue: 'Quartier des Carmes',
        address: 'Place des Carmes',
        city: 'Toulouse',
        lat: 43.5975,
        lng: 1.4445,
        capacity: 80,
        priceCents: 500,
        status: 'APPROVED',
      },
    ],
  });

  await prisma.deal.createMany({
    data: [
      {
        partnerName: 'BNP Paribas',
        category: 'BANK',
        title: 'Ouverture de compte étudiant',
        description:
          "Exemple de fiche partenaire : conditions de l'offre de bienvenue à renseigner par la banque.",
        highlight: 'Offre de démonstration',
        url: 'https://mabanque.bnpparibas/',
        city: 'Toulouse',
        status: 'APPROVED',
      },
      {
        partnerName: 'Crédit Mutuel',
        category: 'BANK',
        title: 'Avantages étudiants',
        description:
          "Exemple de fiche partenaire : conditions de l'offre à renseigner par la banque.",
        highlight: 'Offre de démonstration',
        url: 'https://www.creditmutuel.fr/',
        city: 'Toulouse',
        status: 'APPROVED',
      },
      {
        partnerName: 'Crédit Agricole',
        category: 'BANK',
        title: 'Compte et carte jeunes',
        description:
          "Exemple de fiche partenaire : conditions de l'offre à renseigner par la banque.",
        highlight: 'Offre de démonstration',
        url: 'https://www.credit-agricole.fr/',
        status: 'APPROVED',
      },
      {
        partnerName: 'Société Générale',
        category: 'BANK',
        title: 'Offre étudiants',
        description:
          "Exemple de fiche partenaire : conditions de l'offre à renseigner par la banque.",
        highlight: 'Offre de démonstration',
        url: 'https://particuliers.sg.fr/',
        status: 'APPROVED',
      },
      {
        partnerName: 'Mutuelle étudiante (exemple)',
        category: 'INSURANCE',
        title: 'Complémentaire santé étudiante',
        description:
          'Exemple de fiche partenaire pour une mutuelle : garanties et tarif à renseigner.',
        highlight: 'Offre de démonstration',
        url: 'https://www.ameli.fr/',
        status: 'APPROVED',
      },
      {
        partnerName: 'Résidence étudiante (exemple)',
        category: 'HOUSING',
        title: 'Studios meublés près des campus',
        description:
          'Exemple de fiche partenaire pour une résidence : disponibilités et loyers à renseigner.',
        highlight: 'Offre de démonstration',
        url: 'https://www.crous-toulouse.fr/',
        city: 'Toulouse',
        status: 'APPROVED',
      },
      {
        partnerName: 'Épicerie solidaire (exemple)',
        category: 'FOOD',
        title: 'Paniers de légumes à petit prix',
        description:
          'Exemple de fiche pour une épicerie solidaire partenaire des associations.',
        highlight: 'Offre de démonstration',
        url: 'https://www.crous-toulouse.fr/',
        city: 'Toulouse',
        status: 'APPROVED',
      },
    ],
  });

  console.log(
    `Seed terminé : ${coaches.length} coachs, 3 associations, 5 événements, 7 bons plans.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
