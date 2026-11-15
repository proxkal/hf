import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  type CoachSummary,
  dateTime,
  errorMessage,
  euros,
  EVENT_LABELS,
  type EventItem,
} from '@/lib/api';
import { TOULOUSE, useCoaches, useEvents, useMe } from '@/lib/queries';
import { colors, fonts, radius, space, typeScale } from '@/theme';
import { Card, Chip, ChipRow, Heading, Muted, Notice, P, QueryState, Screen, Tag } from '@/ui';
import { Avatar, DateTile, dateParts, initials } from '@/ui/badges';
import MapView from '@/ui/map';
import { CoachPreview, EventPreview } from '@/ui/map-preview';
import type { MapPoint } from '@/ui/map-types';

type Filter = 'all' | 'coach' | 'event';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'coach', label: 'Coachs' },
  { id: 'event', label: 'Événements' },
];
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
        setLocationError('Position non autorisée : la carte reste centrée sur Toulouse.');
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
  const coachList = useMemo(
    () => (showCoaches ? (coaches.data ?? []) : []),
    [showCoaches, coaches.data],
  );
  const eventList = useMemo(
    () => (showEvents ? (events.data ?? []) : []),
    [showEvents, events.data],
  );

  const points = useMemo<MapPoint[]>(
    () => [
      ...coachList.map((c) => ({
        id: c.id,
        kind: 'coach' as const,
        lat: c.lat,
        lng: c.lng,
        label: `Coach : ${c.displayName}, ${c.headline}`,
        badge: initials(c.displayName),
      })),
      ...eventList.map((e) => {
        const { month, day } = dateParts(e.startsAt);
        return {
          id: e.id,
          kind: 'event' as const,
          lat: e.lat,
          lng: e.lng,
          label: `${EVENT_LABELS[e.type]} : ${e.title}, ${dateTime(e.startsAt)}`,
          badge: day,
          caption: month,
        };
      }),
    ],
    [coachList, eventList],
  );

  const renderPreview = (point: MapPoint) => {
    if (point.kind === 'coach') {
      const coach = coachList.find((c) => c.id === point.id);
      return coach ? (
        <CoachPreview coach={coach} onOpen={() => router.push(`/coach/${coach.id}`)} />
      ) : null;
    }
    const event = eventList.find((e) => e.id === point.id);
    return event ? (
      <EventPreview event={event} onOpen={() => router.push(`/event/${event.id}`)} />
    ) : null;
  };

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

      <View style={styles.mapFrame}>
        <MapView
          points={points}
          center={center}
          selectedId={selectedId}
          onSelect={(point) => setSelectedId(point?.id ?? null)}
          renderPreview={renderPreview}
        />

        {/* Commandes posées sur la carte, façon Uber. */}
        <View style={styles.overlayTop} pointerEvents="box-none">
          <View style={styles.segment} accessibilityRole="tablist">
            {FILTERS.map((item) => {
              const active = filter === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setFilter(item.id);
                    setSelectedId(null);
                  }}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}>
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={located ? 'Recentrer sur Toulouse' : 'Autour de moi'}
          onPress={() => {
            if (located) {
              setCenter(TOULOUSE);
              setLocated(false);
            } else {
              locate();
            }
          }}
          style={({ pressed }) => [styles.locate, pressed && styles.pressed]}>
          {locating ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <View style={[styles.locateDot, located && styles.locateDotOn]} />
              <Text style={styles.locateLabel}>{located ? 'Toulouse' : 'Autour de moi'}</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.toolbarLabel}>Rayon</Text>
        <ChipRow>
          {RADII.map((r) => (
            <Chip key={r} label={`${r} km`} selected={radiusKm === r} onPress={() => setRadiusKm(r)} />
          ))}
        </ChipRow>
      </View>
      <View style={styles.legend}>
        <LegendItem kind="coach" label="Coach" />
        <LegendItem kind="event" label="Événement" />
        <Muted style={styles.legendHint}>Survole ou touche un pin pour un aperçu.</Muted>
      </View>
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

      {coachList.length > 0 ? (
        <SectionTitle overline={`${coachList.length} à proximité`} title="Coachs près de toi" />
      ) : null}
      {coachList.map((coach) => (
        <CoachCard
          key={coach.id}
          coach={coach}
          selected={coach.id === selectedId}
          onPress={() => router.push(`/coach/${coach.id}`)}
        />
      ))}

      {eventList.length > 0 ? (
        <SectionTitle overline={`${eventList.length} à venir`} title="Événements" />
      ) : null}
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

function SectionTitle({ overline, title }: { overline: string; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionOverline}>{overline}</Text>
      <Heading>{title}</Heading>
    </View>
  );
}

function LegendItem({ kind, label }: { kind: 'coach' | 'event'; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={kind === 'coach' ? styles.legendCoach : styles.legendEvent} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
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
      <View style={styles.cardRow}>
        <Avatar name={coach.displayName} size={56} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{coach.displayName}</Text>
          <Text style={styles.cardOverline} numberOfLines={1}>
            {coach.headline}
          </Text>
          <Muted style={styles.cardMeta}>
            {coach.city} · {coach.distanceKm} km
            {coach.fromPriceCents !== null ? ` · dès ${euros(coach.fromPriceCents)}` : ''}
          </Muted>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
      {coach.domains.length > 0 ? (
        <View style={styles.tags}>
          {coach.domains.slice(0, 3).map((domain) => (
            <Tag key={domain} label={domain} />
          ))}
        </View>
      ) : null}
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
      <View style={styles.cardRow}>
        <DateTile iso={event.startsAt} size={56} />
        <View style={styles.cardBody}>
          <Text style={styles.cardOverline}>
            {EVENT_LABELS[event.type]}
            {event.registered ? ' · Inscrit' : ''}
          </Text>
          <Text style={styles.cardTitle}>{event.title}</Text>
          <P style={styles.cardMeta}>{dateTime(event.startsAt)}</P>
          <Muted style={styles.cardMeta}>
            {event.venue}, {event.city} · {euros(event.priceCents)}
            {event.seatsLeft !== null ? ` · ${event.seatsLeft} places restantes` : ''}
          </Muted>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  mapFrame: {
    height: 480,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.grey,
    backgroundColor: colors.white,
  },
  overlayTop: { position: 'absolute', top: space.md, left: space.md, right: space.md, zIndex: 5 },
  segment: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    padding: 4,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  segmentItem: { paddingHorizontal: space.md, minHeight: 36, justifyContent: 'center', borderRadius: radius.pill },
  segmentItemActive: { backgroundColor: colors.black },
  segmentLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  segmentLabelActive: { color: colors.white },
  locate: {
    position: 'absolute',
    left: space.md,
    bottom: space.md,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    shadowColor: colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  locateDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  locateDotOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  locateLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  pressed: { opacity: 0.85 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  toolbarLabel: { ...typeScale.overline, color: colors.muted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendCoach: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: colors.blue,
    backgroundColor: colors.white,
  },
  legendEvent: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.black,
    borderTopWidth: 5,
    borderTopColor: colors.blue,
    backgroundColor: colors.white,
  },
  legendLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.black },
  legendHint: { fontSize: 13, lineHeight: 18 },
  section: { gap: 2, marginTop: space.sm },
  sectionOverline: { ...typeScale.overline, color: colors.blue },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: colors.black },
  cardOverline: { ...typeScale.overline, fontSize: 11, color: colors.blue },
  cardMeta: { fontSize: 14, lineHeight: 20 },
  chevron: { fontFamily: fonts.body, fontSize: 28, color: colors.border, marginLeft: space.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
});
