import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { api, dateTime, errorMessage, euros, EVENT_LABELS } from '@/lib/api';
import { useEvent } from '@/lib/queries';
import { Button, Heading, Muted, Notice, P, QueryState, Screen, Tag, Title } from '@/ui';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const event = useEvent(id);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!event.data) {
    return (
      <Screen>
        <QueryState
          loading={event.isPending}
          error={event.error ? errorMessage(event.error) : null}
          empty={false}
          emptyText=""
          onRetry={event.refetch}
        />
      </Screen>
    );
  }

  const data = event.data;
  const full = data.seatsLeft === 0 && !data.registered;

  const toggle = async () => {
    setError(null);
    setLoading(true);
    try {
      if (data.registered) await api.delete(`/events/${id}/registration`);
      else await api.post(`/events/${id}/registration`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event', id] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
      ]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Tag label={EVENT_LABELS[data.type]} tone="black" />
      <Title>{data.title}</Title>
      <P>
        {dateTime(data.startsAt)} → {dateTime(data.endsAt)}
      </P>
      <Muted>
        {data.venue} · {data.address}, {data.city}
      </Muted>
      <Muted>
        Organisé par {data.organizerName} · {euros(data.priceCents)}
        {data.seatsLeft !== null ? ` · ${data.seatsLeft} places restantes` : ''}
      </Muted>

      <Heading>À propos</Heading>
      <P>{data.description}</P>

      <Notice text={error} />
      {data.registered ? (
        <Notice tone="success" text="Ta place est réservée." />
      ) : null}
      <Button
        label={data.registered ? 'Annuler ma réservation' : full ? 'Complet' : 'Réserver ma place'}
        variant={data.registered ? 'secondary' : 'primary'}
        onPress={toggle}
        loading={loading}
        disabled={full}
      />
      {data.priceCents > 0 && !data.registered ? (
        <Muted>Le paiement en ligne n'est pas encore disponible : règlement sur place.</Muted>
      ) : null}
    </Screen>
  );
}
