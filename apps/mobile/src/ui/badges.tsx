import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

/** « Camille Durand » → « CD ». */
export function initials(name: string) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' });
const DAY = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'Europe/Paris' });

/** « 2026-11-29T18:00Z » → { month: 'NOV', day: '29' }. */
export function dateParts(iso: string) {
  const date = new Date(iso);
  return {
    month: MONTH.format(date).replace('.', '').slice(0, 4).toUpperCase(),
    day: DAY.format(date),
  };
}

/** Médaillon à initiales cerclé de bleu, façon photo de profil. */
export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const ring = Math.max(2, Math.round(size / 18));
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2, padding: ring }]}>
      <View style={[styles.gap, { borderRadius: size / 2, padding: ring }]}>
        <View style={[styles.face, { borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.32 }]}>{initials(name)}</Text>
        </View>
      </View>
    </View>
  );
}

/** Tuile date d'un événement : mois sur bandeau bleu, jour en grand. */
export function DateTile({ iso, size = 52 }: { iso: string; size?: number }) {
  const { month, day } = dateParts(iso);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { width: size, borderRadius: size * 0.22 }]}>
      <Text style={[styles.month, { fontSize: size * 0.19, lineHeight: size * 0.32 }]}>{month}</Text>
      <Text style={[styles.day, { fontSize: size * 0.42, lineHeight: size * 0.6 }]}>{day}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { backgroundColor: colors.blue },
  gap: { flex: 1, backgroundColor: colors.white },
  face: { flex: 1, backgroundColor: colors.grey, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.bodyBold, color: colors.black, letterSpacing: 0.3 },
  tile: { overflow: 'hidden', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.black },
  month: {
    backgroundColor: colors.blue,
    color: colors.white,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1,
    textAlign: 'center',
  },
  day: { fontFamily: fonts.title, color: colors.black, textAlign: 'center', letterSpacing: -0.5 },
});
