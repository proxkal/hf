import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { useAuth } from '@/lib/auth-store';
import { colors } from '@/theme';
import { Button, Muted, Notice, Screen, Title } from '@/ui';

/** Retour d'une connexion Google / LinkedIn (version web). */
export default function OAuthCallback() {
  const { ticket } = useLocalSearchParams<{ ticket?: string; error?: string }>();
  const completeOAuth = useAuth((state) => state.completeOAuth);
  const router = useRouter();
  const [failed, setFailed] = useState(!ticket);
  const started = useRef(false);

  useEffect(() => {
    if (!ticket || started.current) return;
    started.current = true; // le ticket est à usage unique
    // Une fois connecté, la redirection est gérée par la garde de navigation.
    completeOAuth(ticket).catch(() => setFailed(true));
  }, [ticket, completeOAuth]);

  if (!failed) {
    return (
      <Screen>
        <ActivityIndicator color={colors.black} />
        <Muted style={{ textAlign: 'center' }}>Connexion en cours…</Muted>
      </Screen>
    );
  }
  return (
    <Screen>
      <Title>Connexion impossible</Title>
      <Notice text="La connexion n'a pas abouti ou a expiré. Aucun compte n'a été modifié." />
      <Button label="Revenir à la connexion" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
