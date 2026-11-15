import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import {
  api,
  type Booking,
  BOOKING_LABELS,
  dateTime,
  errorMessage,
  euros,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useBookings, useMe } from '@/lib/queries';
import { colors, space } from '@/theme';
import {
  Button,
  Card,
  Field,
  Heading,
  Muted,
  Notice,
  P,
  QueryState,
  Screen,
  Tag,
  Title,
} from '@/ui';

const CONTRACT_LABELS = { STAGE: 'Stage', ALTERNANCE: 'Alternance', BOTH: 'Stage ou alternance' };

export default function Profil() {
  const router = useRouter();
  const me = useMe();
  const bookings = useBookings();
  const signOut = useAuth((state) => state.signOut);
  const profile = me.data?.studentProfile;

  return (
    <Screen>
      <Title>{me.data ? me.data.firstName : 'Mon profil'}</Title>
      {me.data ? <Muted>{me.data.email}</Muted> : null}

      <Card>
        <Heading>Ma recherche</Heading>
        {profile ? (
          <>
            <P>
              {CONTRACT_LABELS[profile.contractType]} · {profile.domain}
            </P>
            <Muted>{profile.cities.join(', ')}</Muted>
            {profile.keywords.length > 0 ? <Muted>{profile.keywords.join(' · ')}</Muted> : null}
          </>
        ) : (
          <Muted>Profil non renseigné.</Muted>
        )}
        <Button
          label={profile ? 'Modifier' : 'Compléter mon profil'}
          variant="secondary"
          onPress={() => router.push('/onboarding')}
        />
      </Card>

      <Heading>Mes séances de coaching</Heading>
      <QueryState
        loading={bookings.isPending}
        error={bookings.error ? errorMessage(bookings.error) : null}
        empty={bookings.data?.length === 0}
        emptyText="Aucune séance pour l'instant. Trouve un coach sur la carte."
        onRetry={bookings.refetch}
      />
      {bookings.data?.map((booking) => <BookingCard key={booking.id} booking={booking} />)}

      <Heading>Mes données (RGPD)</Heading>
      <DataSection hasPassword={me.data?.hasPassword ?? true} />

      <Button label="Se déconnecter" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = booking.status === 'REQUESTED' || booking.status === 'CONFIRMED';

  const cancel = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post(`/bookings/${booking.id}/cancel`);
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Tag label={BOOKING_LABELS[booking.status]} tone={active ? 'blue' : 'grey'} />
      <Heading>
        {booking.offer.title} avec {booking.coach.displayName}
      </Heading>
      <P>{dateTime(booking.startsAt)}</P>
      <Muted>
        {booking.durationMin} min · {booking.mode === 'VISIO' ? 'En visio' : `À ${booking.coach.city}`}{' '}
        · {euros(booking.priceCents)}
      </Muted>
      <Notice text={error} />
      {active ? (
        <Button label="Annuler la séance" variant="secondary" onPress={cancel} loading={loading} />
      ) : null}
    </Card>
  );
}

/** RGPD : export des données et suppression du compte, depuis l'application. */
function DataSection({ hasPassword }: { hasPassword: boolean }) {
  const clear = useAuth((state) => state.clear);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const { data } = await api.get('/me/export');
      if (Platform.OS === 'web') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mes-donnees-hurden.json';
        link.click();
        URL.revokeObjectURL(url);
        setMessage('Tes données ont été téléchargées.');
      } else {
        setMessage(
          "Export prêt. Le téléchargement sur mobile arrive bientôt : utilise la version web en attendant.",
        );
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.delete('/me', {
        data: hasPassword ? { password } : { confirm: password.trim().toUpperCase() },
      });
      await clear();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Card>
      <Muted>
        Tes données t'appartiennent. Tu peux les récupérer (droit à la portabilité) ou
        exercer ton droit à l'oubli en supprimant ton compte, à tout moment.
      </Muted>
      <Muted>
        <Link href="/legal/confidentialite" style={styles.link}>
          Politique de confidentialité
        </Link>
        {'  ·  '}
        <Link href="/legal/cgu" style={styles.link}>
          Conditions générales
        </Link>
      </Muted>
      <Notice text={message} tone="success" />
      <Notice text={error} />
      <Button label="Exporter mes données" variant="secondary" onPress={exportData} loading={busy && !confirming} />
      {confirming ? (
        <View style={styles.confirm}>
          <P>
            Droit à l'oubli : la suppression est immédiate et définitive. Ton profil, tes
            séances, tes inscriptions et tes demandes d'adhésion seront effacés.
          </P>
          <Field
            label={hasPassword ? 'Confirme avec ton mot de passe' : 'Écris SUPPRIMER pour confirmer'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={hasPassword}
            autoCapitalize={hasPassword ? 'none' : 'characters'}
            autoComplete={hasPassword ? 'current-password' : 'off'}
          />
          <Button
            label="Supprimer définitivement"
            variant="danger"
            onPress={deleteAccount}
            loading={busy}
            disabled={!password}
          />
          <Button
            label="Annuler"
            variant="secondary"
            onPress={() => {
              setConfirming(false);
              setPassword('');
            }}
          />
        </View>
      ) : (
        <Button label="Supprimer mon compte (droit à l'oubli)" variant="secondary" onPress={() => setConfirming(true)} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  confirm: { gap: space.md },
  link: { color: colors.blue, textDecorationLine: 'underline' },
});
