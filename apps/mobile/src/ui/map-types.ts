export interface MapPoint {
  id: string;
  kind: 'coach' | 'event';
  lat: number;
  lng: number;
  label: string;
}

export interface MapProps {
  points: MapPoint[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (point: MapPoint) => void;
}
