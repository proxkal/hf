import { LegalPage } from '@/ui/legal';

const CONTACT = '[adresse de contact à définir]';

export default function Confidentialite() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updatedAt="15 novembre 2026"
      sections={[
        {
          title: '1. Responsable du traitement',
          paragraphs: [
            `HURDEN (société en cours de création, Toulouse). Référente données personnelles : la présidente. Contact : ${CONTACT}.`,
          ],
        },
        {
          title: '2. Données collectées et finalités',
          paragraphs: [
            'Compte : prénom, nom (facultatif), adresse e-mail, mot de passe (stocké uniquement sous forme chiffrée irréversible). Finalité : créer et sécuriser ton compte. Base légale : exécution du service.',
            'Profil de recherche : domaine, mots-clés, type de contrat, villes. Finalité : te proposer des coachs, événements et bons plans adaptés. Base légale : exécution du service.',
            "Réservations, inscriptions aux événements et demandes d'adhésion. Finalité : organiser les rendez-vous et transmettre ta demande. Base légale : exécution du service.",
            "Clics sur les bons plans. Finalité : mesure d'audience des partenaires et lutte contre la fraude. Base légale : intérêt légitime.",
            'Connexion avec Google ou LinkedIn : seuls ton identifiant, ton e-mail vérifié et ton nom sont reçus. HURDEN ne publie rien et ne lit ni tes contacts ni tes messages.',
          ],
        },
        {
          title: '3. Localisation',
          paragraphs: [
            "Ta position n'est utilisée que si tu appuies sur « Autour de moi », pour centrer la carte. Elle n'est ni enregistrée ni partagée. Sans autorisation, la carte reste centrée sur Toulouse.",
          ],
        },
        {
          title: '4. Destinataires',
          paragraphs: [
            "Tes données ne sont jamais vendues. Un coach ne voit que les informations de la séance que tu lui demandes ; une association ne reçoit que ta demande d'adhésion. Les prestataires techniques (hébergement) agissent sur instruction de HURDEN, avec des données hébergées dans l'Union européenne.",
          ],
        },
        {
          title: '5. Durées de conservation',
          paragraphs: [
            'Compte et profil : pendant la durée du compte, puis suppression après 24 mois sans connexion. Clics et journaux techniques : 13 mois. Session : 30 jours au plus sans activité.',
          ],
        },
        {
          title: "6. Tes droits, dont le droit à l'oubli",
          paragraphs: [
            "Tu disposes d'un droit d'accès, de rectification, d'effacement (« droit à l'oubli »), de portabilité, de limitation et d'opposition.",
            "Depuis ton profil, tu peux à tout moment : modifier tes informations, télécharger toutes tes données (« Exporter mes données ») et supprimer ton compte (« Supprimer mon compte »). La suppression est immédiate et définitive : profil, réservations, inscriptions et demandes d'adhésion sont effacés.",
            `Pour toute autre demande : ${CONTACT}. Tu peux aussi introduire une réclamation auprès de la CNIL (www.cnil.fr).`,
          ],
        },
        {
          title: '7. Sécurité',
          paragraphs: [
            'Mots de passe protégés par Argon2id, échanges chiffrés, sessions courtes et renouvelées, accès cloisonnés (chaque utilisateur ne voit que ses données), limitation des tentatives de connexion.',
          ],
        },
        {
          title: '8. Cookies et traceurs',
          paragraphs: [
            "L'application n'utilise aucun cookie publicitaire ni traceur tiers. Seul un stockage technique, nécessaire au maintien de ta session, est utilisé.",
          ],
        },
        {
          title: '9. Mineurs',
          paragraphs: [
            "L'inscription est possible à partir de 15 ans, âge à partir duquel un mineur peut consentir seul au traitement de ses données en France.",
          ],
        },
      ]}
    />
  );
}
