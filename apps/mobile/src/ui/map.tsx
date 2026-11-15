import { StyleSheet } from 'react-native';
import NativeMap, { Marker } from 'react-native-maps';

import { colors } from '@/theme';

import type { MapProps } from './map-types';

/** Carte native iOS / Android. Non encore testée sur appareil (version web prioritaire). */
export default function MapView({ points, center, selectedId, onSelect }: MapProps) {
  return (
    <NativeMap
      style={styles.map}
      region={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.18,
        longitudeDelta: 0.18,
      }}>
      {points.map((point) => (
        <Marker
          key={point.id}
          coordinate={{ latitude: point.lat, longitude: point.lng }}
          title={point.label}
          pinColor={
            point.id === selectedId
              ? 'red'
              : point.kind === 'coach'
                ? colors.blue
                : colors.black
          }
          onPress={() => onSelect(point)}
        />
      ))}
    </NativeMap>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%', borderRadius: 14 },
});
