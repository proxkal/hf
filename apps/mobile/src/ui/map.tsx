import { StyleSheet, Text, View } from 'react-native';
import NativeMap, { Marker } from 'react-native-maps';

import { colors, fonts } from '@/theme';

import type { MapPoint, MapProps } from './map-types';

/**
 * Carte native iOS / Android. Pas de survol sur mobile : l'aperçu s'ouvre au toucher,
 * ancré en bas de la carte. Non encore testée sur appareil (version web prioritaire).
 */
export default function MapView({
  points,
  center,
  selectedId,
  onSelect,
  renderPreview,
}: MapProps) {
  const selected = selectedId ? points.find((p) => p.id === selectedId) : undefined;
  return (
    <View style={styles.wrap}>
      <NativeMap
        style={styles.map}
        userInterfaceStyle="light"
        onPress={() => onSelect(null)}
        region={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}>
        {points.map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.lat, longitude: point.lng }}
            accessibilityLabel={point.label}
            anchor={{ x: 0.5, y: point.kind === 'event' ? 1 : 0.5 }}
            onPress={(event) => {
              event.stopPropagation();
              onSelect(point);
            }}>
            <Pin point={point} active={point.id === selectedId} />
          </Marker>
        ))}
      </NativeMap>
      {selected && renderPreview ? (
        <View style={styles.preview}>{renderPreview(selected)}</View>
      ) : null}
    </View>
  );
}

function Pin({ point, active }: { point: MapPoint; active: boolean }) {
  if (point.kind === 'coach') {
    return (
      <View style={[styles.coach, active && styles.coachActive]}>
        <View style={[styles.avatar, active && styles.avatarActive]}>
          <Text style={[styles.initials, active && styles.initialsActive]}>{point.badge}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.event}>
      <Text style={[styles.month, active && styles.monthActive]}>{point.caption}</Text>
      <Text style={styles.day}>{point.badge}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { width: '100%', height: '100%' },
  preview: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  coach: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachActive: { backgroundColor: colors.black, transform: [{ scale: 1.12 }] },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: { backgroundColor: colors.blue },
  initials: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.black },
  initialsActive: { color: colors.white },
  event: {
    width: 42,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.black,
  },
  month: {
    backgroundColor: colors.blue,
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
    lineHeight: 15,
    textAlign: 'center',
  },
  monthActive: { backgroundColor: colors.black },
  day: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 24, textAlign: 'center' },
});
