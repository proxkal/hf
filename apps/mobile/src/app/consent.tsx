import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Button, Muted, Notice, P, Screen, Title } from '@/ui';
import { TermsCheckbox } from '@/ui/auth-extras';

/**
 * Consentement RGPD demandé après une première connexion Google / LinkedIn,
 * ou quand les conditions ont changé. Sans accord, l'application reste fermée.
 */
export default function Consent() {
  const queryClient = useQueryClient();
  const signOut = useAuth((state) => state.signOut);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.post('/me/consent', { acceptTerms: true });
      // La garde de navigation redirige dès que le profil est à jour.
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Title>Avant de commencer</Title>
      <P>
        HURDEN utilise tes données (profil, recherche, réservations) uniquement pour te
        proposer des coachs, des événements et des bons plans. Tu peux les exporter ou
        supprimer ton compte à tout moment depuis ton profil.
      </P>
      <TermsCheckbox checked={accepted} onChange={setAccepted} />
      <Notice text={error} />
      <Button label="Continuer" onPress={submit} loading={saving} disabled={!accepted} />
      <Button label="Refuser et me déconnecter" variant="secondary" onPress={signOut} />
      <Muted>
        Si tu refuses, ton compte reste inactif. Tu peux demander sa suppression à tout
        moment.
      </Muted>
    </Screen>
  );
}
