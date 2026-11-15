import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  type CoachSummary,
  dateTime,
  euros,
  EVENT_LABELS,
  type EventItem,
} from '@/lib/api';
import { colors, fonts, radius, space, typeScale } from '@/theme';

import { Avatar, DateTile } from './badges';

/** Itinéraire vers le point de rendez-vous public (seules les coordonnées du lieu partent). */
function openDirections(lat: number, lng: number) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
}

function Shell({
  media,
  title,
  overline,
  place,
  lines,
  status,
  primary,
  onPrimary,
  onDirections,
}: {
  media: ReactNode;
  title: string;
  overline: string;
  place: string;
  lines: string[];
  status: string;
  primary: string;
  onPrimary: () => void;
  onDirections: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {media}
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.overline} numberOfLines={2}>
            {overline}
          </Text>
        </View>
      </View>

      <View style={styles.placeRow}>
        <View style={styles.placeIcon} />
        <Text style={styles.place} numberOfLines={1}>
          {place}
        </Text>
      </View>

      {lines.length > 0 ? (
        <View style={styles.lines}>
          {lines.map((line) => (
            <Text key={line} style={styles.line} numberOfLines={1}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.status} numberOfLines={2}>
          {status}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onPrimary}
          style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}>
          <Text style={[styles.btnLabel, styles.btnLabelPrimary]}>{primary}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityHint="Ouvre l'itinéraire dans Google Maps"
          onPress={onDirections}
          style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}>
          <Text style={styles.btnLabel}>Itinéraire</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function CoachPreview({ coach, onOpen }: { coach: CoachSummary; onOpen: () => void }) {
  const modes = coach.offersVisio ? 'Présentiel · Visio' : 'Présentiel';
  const price = coach.fromPriceCents !== null ? ` · dès ${euros(coach.fromPriceCents)}` : '';
  const rating =
    coach.ratingCount > 0 ? `★ ${coach.ratingAvg.toFixed(1)} (${coach.ratingCount}) · ` : '';
  const lines = [...coach.domains, ...coach.knownProcesses.map((p) => `Recrutement ${p}`)].slice(0, 3);
  return (
    <Shell
      media={<Avatar name={coach.displayName} size={64} />}
      title={coach.displayName}
      overline={coach.headline}
      place={`${coach.city} · ${coach.distanceKm} km`}
      lines={lines}
      status={`${rating}${modes}${price}`}
      primary="Voir la fiche"
      onPrimary={onOpen}
      onDirections={() => openDirections(coach.lat, coach.lng)}
    />
  );
}

export function EventPreview({ event, onOpen }: { event: EventItem; onOpen: () => void }) {
  const seats = event.seatsLeft !== null ? `${event.seatsLeft} places restantes` : 'Entrée libre';
  return (
    <Shell
      media={<DateTile iso={event.startsAt} size={60} />}
      title={event.title}
      overline={EVENT_LABELS[event.type]}
      place={`${event.venue}, ${event.city}`}
      lines={[dateTime(event.startsAt), `Organisé par ${event.organizerName}`]}
      status={`${event.registered ? 'Tu es inscrit · ' : ''}${euros(event.priceCents)} · ${seats}`}
      primary={event.registered ? 'Voir mon inscription' : "S'inscrire"}
      onPrimary={onOpen}
      onDirections={() => openDirections(event.lat, event.lng)}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.grey,
    borderRadius: radius.lg,
    padding: space.md + 2,
    gap: space.md,
    shadowColor: colors.black,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerText: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.title, fontSize: 20, lineHeight: 24, letterSpacing: -0.5, color: colors.black },
  overline: { ...typeScale.overline, fontSize: 11, color: colors.blue },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  placeIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.muted,
  },
  place: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  lines: { borderLeftWidth: 3, borderLeftColor: colors.blue, paddingLeft: space.md, gap: 6 },
  line: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue },
  status: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  actions: { flexDirection: 'row', gap: space.sm },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  btnPrimary: { backgroundColor: colors.blue },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  btnLabelPrimary: { color: colors.white },
  pressed: { opacity: 0.8 },
});
