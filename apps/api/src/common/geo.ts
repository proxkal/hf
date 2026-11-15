const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distance à vol d'oiseau entre deux points, en kilomètres. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Rectangle englobant un cercle : pré-filtre SQL avant le calcul exact. */
export function boundingBox(lat: number, lng: number, radiusKm: number) {
  const dLat = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const dLng = dLat / Math.max(Math.cos(toRad(lat)), 0.01);
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

/**
 * Filtre et trie des éléments par distance, et ajoute `distanceKm` (arrondi à 100 m).
 */
export function withinRadius<T extends { lat: number; lng: number }>(
  items: T[],
  lat: number,
  lng: number,
  radiusKm: number,
): (T & { distanceKm: number })[] {
  return items
    .map((item) => ({
      ...item,
      distanceKm:
        Math.round(haversineKm(lat, lng, item.lat, item.lng) * 10) / 10,
    }))
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
