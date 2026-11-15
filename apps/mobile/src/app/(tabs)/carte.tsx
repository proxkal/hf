import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  type CoachSummary,
  dateTime,
  errorMessage,
  euros,
  EVENT_LABELS,
  type EventItem,
} from '@/lib/api';
import { TOULOUSE, useCoaches, useEvents, useMe } from '@/lib/queries';
import { space } from '@/theme';
import {
  Button,
  Card,
  Chip,
  ChipRow,
  Heading,
  Muted,
  Notice,
  P,
  QueryState,
  Screen,
  Tag,
} from '@/ui';
import MapView from '@/ui/map';
import type { MapPoint } from '@/ui/map-types';

type Filter = 'all' | 'coach' | 'event';
const RADII = [5, 15, 30];

export default function Carte() {
  const router = useRouter();
  const me = useMe();
  const [filter, setFilter] = useState<Filter>('all');
  const [radiusKm, setRadiusKm] = useState(15);
  const [center, setCenter] = useState(TOULOUSE);
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const near = { ...center, radiusKm };
  const coaches = useCoaches(near);
  const events = useEvents(near);

  // La position sert uniquement à centrer la recherche : elle n'est ni stockée ni transmise ailleurs.
  const locate = async () => {
    setLocationError(null);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError(
          'Position non autorisée : la carte reste centrée sur Toulouse.',
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
      setLocated(true);
    } catch {
      setLocationError('Impossible de te localiser pour le moment.');
    } finally {
      setLocating(false);
    }
  };

  const showCoaches = filter !== 'event';
  const showEvents = filter !== 'coach';
  const coachList = showCoaches ? (coaches.data ?? []) : [];
  const eventList = showEvents ? (events.data ?? []) : [];
  const points: MapPoint[] = [
    ...coachList.map((c) => ({
      id: c.id,
      kind: 'coach' as const,
      lat: c.lat,
      lng: c.lng,
      label: `Coach : ${c.displayName}, ${c.headline}`,
    })),
    ...eventList.map((e) => ({
      id: e.id,
      kind: 'event' as const,
      lat: e.lat,
      lng: e.lng,
      label: `${EVENT_LABELS[e.type]} : ${e.title}`,
    })),
  ];

  const loading = (showCoaches && coaches.isPending) || (showEvents && events.isPending);
  const failure = (showCoaches && coaches.error) || (showEvents && events.error) || null;

  return (
    <Screen>
      {me.data && !me.data.studentProfile ? (
        <Card onPress={() => router.push('/onboarding')}>
          <Heading>Complète ton profil</Heading>
          <Muted>Indique ton domaine pour des suggestions adaptées.</Muted>
        </Card>
      ) : null}

      <View style={styles.map}>
        <MapView
          points={points}
          center={center}
          selectedId={selectedId}
          onSelect={(point) => setSelectedId(point.id)}
        />
      </View>

      <ChipRow>
        <Chip label="Tout" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Coachs" selected={filter === 'coach'} onPress={() => setFilter('coach')} />
        <Chip label="Événements" selected={filter === 'event'} onPress={() => setFilter('event')} />
        {RADII.map((r) => (
          <Chip
            key={r}
            label={`${r} km`}
            selected={radiusKm === r}
            onPress={() => setRadiusKm(r)}
          />
        ))}
      </ChipRow>
      <Button
        label={located ? 'Recentrer sur Toulouse' : 'Autour de moi'}
        variant="secondary"
        loading={locating}
        onPress={() => {
          if (located) {
            setCenter(TOULOUSE);
            setLocated(false);
          } else {
            locate();
          }
        }}
      />
      <Notice text={locationError} tone="info" />

      <QueryState
        loading={loading}
        error={failure ? errorMessage(failure) : null}
        empty={points.length === 0}
        emptyText="Rien dans ce rayon pour l'instant. Élargis la zone de recherche."
        onRetry={() => {
          coaches.refetch();
          events.refetch();
        }}
      />

      {coachList.length > 0 ? <Heading>Coachs près de toi</Heading> : null}
      {coachList.map((coach) => (
        <CoachCard
          key={coach.id}
          coach={coach}
          selected={coach.id === selectedId}
          onPress={() => router.push(`/coach/${coach.id}`)}
        />
      ))}

      {eventList.length > 0 ? <Heading>Événements à venir</Heading> : null}
      {eventList.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          selected={event.id === selectedId}
          onPress={() => router.push(`/event/${event.id}`)}
        />
      ))}
    </Screen>
  );
}

function CoachCard({
  coach,
  selected,
  onPress,
}: {
  coach: CoachSummary;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} selected={selected}>
      <View style={styles.row}>
        <Tag label="Coach" tone="blue" />
        <Muted>
          {coach.distanceKm} km · {coach.city}
        </Muted>
      </View>
      <Heading>{coach.displayName}</Heading>
      <P>{coach.headline}</P>
      <Muted>
        {coach.ratingCount > 0
          ? `★ ${coach.ratingAvg.toFixed(1)} (${coach.ratingCount} avis)`
          : 'Nouveau coach'}
        {coach.fromPriceCents !== null ? ` · dès ${euros(coach.fromPriceCents)}` : ''}
      </Muted>
    </Card>
  );
}

export function EventCard({
  event,
  selected,
  onPress,
}: {
  event: EventItem;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} selected={selected}>
      <View style={styles.row}>
        <Tag label={EVENT_LABELS[event.type]} tone="black" />
        {event.registered ? <Tag label="Inscrit" tone="blue" /> : null}
      </View>
      <Heading>{event.title}</Heading>
      <P>{dateTime(event.startsAt)}</P>
      <Muted>
        {event.venue}, {event.city} · {euros(event.priceCents)}
        {event.seatsLeft !== null ? ` · ${event.seatsLeft} places restantes` : ''}
      </Muted>
    </Card>
  );
}

const styles = StyleSheet.create({
  map: { height: 340, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
});
