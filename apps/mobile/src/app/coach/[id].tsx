import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { api, dateTime, errorMessage, euros } from '@/lib/api';
import { useCoach } from '@/lib/queries';
import {
  Button,
  Card,
  Chip,
  ChipRow,
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

const HOURS = [9, 10, 11, 14, 15, 16, 17, 18, 19];

/** Les 10 prochains jours, à partir de demain. */
function nextDays() {
  return Array.from({ length: 10 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() + index + 1);
    day.setHours(0, 0, 0, 0);
    return day;
  });
}

const dayLabel = (day: Date) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(day);

export default function CoachScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const coach = useCoach(id);
  const [days] = useState(nextDays);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [mode, setMode] = useState<'IN_PERSON' | 'VISIO'>('IN_PERSON');
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!coach.data) {
    return (
      <Screen>
        <QueryState
          loading={coach.isPending}
          error={coach.error ? errorMessage(coach.error) : null}
          empty={false}
          emptyText=""
          onRetry={coach.refetch}
        />
      </Screen>
    );
  }

  const data = coach.data;
  const offer = data.offers.find((o) => o.id === offerId) ?? null;
  const startsAt =
    dayIndex !== null && hour !== null
      ? new Date(days[dayIndex].getTime() + hour * 3_600_000)
      : null;

  const book = async () => {
    if (!offer || !startsAt) return;
    setError(null);
    setLoading(true);
    try {
      await api.post('/bookings', {
        offerId: offer.id,
        startsAt: startsAt.toISOString(),
        mode,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setBooked(`${offer.title} — ${dateTime(startsAt.toISOString())}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Tag label="Coach vérifié" tone="blue" />
      <Title>{data.displayName}</Title>
      <P>{data.headline}</P>
      <Muted>
        {data.city}
        {data.ratingCount > 0
          ? ` · ★ ${data.ratingAvg.toFixed(1)} (${data.ratingCount} avis)`
          : ''}
        {data.offersVisio ? ' · visio possible' : ''}
      </Muted>
      <P>{data.bio}</P>

      <Heading>Connaît les recrutements de</Heading>
      <ChipRow>
        {data.knownProcesses.map((process) => (
          <Chip key={process} label={process} />
        ))}
      </ChipRow>

      {booked ? (
        <Card>
          <Notice tone="success" text={`Demande envoyée : ${booked}.`} />
          <Muted>
            Le coach doit encore confirmer le créneau. Le paiement en ligne n'est pas encore
            disponible : aucun montant n'a été prélevé.
          </Muted>
          <Button label="Voir mes séances" onPress={() => router.replace('/profil')} />
        </Card>
      ) : (
        <>
          <Heading>1. Choisis une séance</Heading>
          {data.offers.map((o) => (
            <Card key={o.id} selected={o.id === offerId} onPress={() => setOfferId(o.id)}>
              <Heading>{o.title}</Heading>
              <Muted>
                {o.durationMin} min · {euros(o.priceCents)}
              </Muted>
            </Card>
          ))}

          <Heading>2. Format</Heading>
          <ChipRow>
            <Chip
              label={`En personne à ${data.city}`}
              selected={mode === 'IN_PERSON'}
              onPress={() => setMode('IN_PERSON')}
            />
            {data.offersVisio ? (
              <Chip label="En visio" selected={mode === 'VISIO'} onPress={() => setMode('VISIO')} />
            ) : null}
          </ChipRow>

          <Heading>3. Date et heure</Heading>
          <ChipRow>
            {days.map((day, index) => (
              <Chip
                key={day.toISOString()}
                label={dayLabel(day)}
                selected={dayIndex === index}
                onPress={() => setDayIndex(index)}
              />
            ))}
          </ChipRow>
          <ChipRow>
            {HOURS.map((h) => (
              <Chip key={h} label={`${h} h`} selected={hour === h} onPress={() => setHour(h)} />
            ))}
          </ChipRow>

          <Field
            label="Message au coach (facultatif)"
            hint="Le poste ou l'entreprise que tu vises, ce que tu veux travailler."
            value={note}
            onChangeText={setNote}
            maxLength={500}
            multiline
          />
          <Notice text={error} />
          <Button
            label={offer ? `Demander ce créneau · ${euros(offer.priceCents)}` : 'Demander ce créneau'}
            onPress={book}
            loading={loading}
            disabled={!offer || !startsAt}
          />
          <Muted>Aucun paiement n'est demandé à cette étape.</Muted>
        </>
      )}
    </Screen>
  );
}
