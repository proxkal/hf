import { StyleSheet, View } from 'react-native';
import NativeMap, { Marker } from 'react-native-maps';

import { colors } from '@/theme';

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
            anchor={{ x: 0.5, y: 0.5 }}
            onPress={(event) => {
              event.stopPropagation();
              onSelect(point);
            }}>
            <Dot point={point} active={point.id === selectedId} />
          </Marker>
        ))}
      </NativeMap>
      {selected && renderPreview ? (
        <View style={styles.preview}>{renderPreview(selected)}</View>
      ) : null}
    </View>
  );
}

/** Petit pictogramme façon Uber : point bleu pour un coach, mini calendrier pour un événement. */
function Dot({ point, active }: { point: MapPoint; active: boolean }) {
  return (
    <View style={styles.hit}>
      <View
        style={[
          styles.dot,
          point.kind === 'coach' ? styles.coach : styles.event,
          active && (point.kind === 'coach' ? styles.coachActive : styles.eventActive),
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { width: '100%', height: '100%' },
  preview: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  hit: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  dot: {
    width: 14,
    height: 14,
    borderWidth: 2.5,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  coach: { borderRadius: 7, backgroundColor: colors.blue },
  /** Mini calendrier : bandeau bleu en haut, corps blanc cerclé de noir. */
  event: {
    width: 16,
    height: 15,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: colors.black,
    borderTopWidth: 4.5,
    borderTopColor: colors.blue,
    backgroundColor: colors.white,
  },
  coachActive: { width: 20, height: 20, borderWidth: 3, borderRadius: 10 },
  eventActive: { width: 21, height: 20, borderTopWidth: 6 },
});
