import { LegalPage } from '@/ui/legal';

const CONTACT = '[adresse de contact à définir]';

export default function Cgu() {
  return (
    <LegalPage
      title="Conditions générales d'utilisation"
      updatedAt="15 novembre 2026"
      sections={[
        {
          title: '1. Objet',
          paragraphs: [
            "HURDEN est une application qui met en relation des étudiants en recherche de stage ou d'alternance avec des coachs, des associations, des organisateurs d'événements et des partenaires proposant des offres pour la vie étudiante.",
            "Les présentes conditions encadrent l'accès à l'application et son utilisation. Créer un compte implique de les accepter.",
          ],
        },
        {
          title: '2. Compte',
          paragraphs: [
            "L'inscription est gratuite pour les étudiants. Elle est ouverte à toute personne âgée d'au moins 15 ans. Tu t'engages à fournir des informations exactes et à garder ton mot de passe confidentiel.",
            'Tu peux supprimer ton compte à tout moment depuis ton profil.',
          ],
        },
        {
          title: '3. Coaching',
          paragraphs: [
            "Les coachs sont des professionnels indépendants dont le profil est vérifié avant publication. La séance est une prestation fournie par le coach : HURDEN met en relation et n'est pas partie au contrat entre l'étudiant et le coach.",
            "Les prix et durées sont affichés avant toute demande. Une demande de créneau doit être confirmée par le coach. Tant que le paiement en ligne n'est pas disponible, aucune somme n'est prélevée par l'application.",
          ],
        },
        {
          title: '4. Événements, associations et bons plans',
          paragraphs: [
            "Les événements et les fiches d'associations sont publiés sous la responsabilité de leurs organisateurs. Les bons plans sont des offres de partenaires : leurs conditions sont fixées par le partenaire, sur son propre site.",
            'Certains contenus sont sponsorisés ; ils sont alors identifiés comme tels.',
          ],
        },
        {
          title: '5. Bon usage',
          paragraphs: [
            "Il est interdit d'utiliser l'application pour diffuser des contenus illicites, usurper une identité, démarcher les utilisateurs ou tenter d'accéder aux données d'autrui.",
            'Un compte qui ne respecte pas ces règles peut être suspendu.',
          ],
        },
        {
          title: '6. Responsabilité',
          paragraphs: [
            "HURDEN aide à préparer une candidature mais ne garantit pas l'obtention d'un stage ou d'une alternance. Les outils d'aide (analyse de CV, suggestions) fournissent des recommandations : aucune décision n'est prise automatiquement à ta place.",
          ],
        },
        {
          title: '7. Données personnelles',
          paragraphs: [
            'Le traitement de tes données est décrit dans la politique de confidentialité, qui fait partie intégrante des présentes conditions.',
          ],
        },
        {
          title: '8. Évolution et contact',
          paragraphs: [
            "Ces conditions peuvent évoluer. En cas de changement, ton accord te sera redemandé à la connexion suivante. Droit applicable : droit français.",
            `Contact : ${CONTACT}.`,
          ],
        },
      ]}
    />
  );
}
