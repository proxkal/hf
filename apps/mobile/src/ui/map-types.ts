import type { ReactNode } from 'react';

export interface MapPoint {
  id: string;
  kind: 'coach' | 'event';
  lat: number;
  lng: number;
  /** Texte lu par les lecteurs d'écran. */
  label: string;
}

export interface MapProps {
  points: MapPoint[];
  center: { lat: number; lng: number };
  /** Pin ouvert par un clic (l'aperçu reste affiché). */
  selectedId: string | null;
  /** Clic sur un pin, ou `null` quand on ferme l'aperçu / clique sur le fond de carte. */
  onSelect: (point: MapPoint | null) => void;
  /** Petite carte d'aperçu affichée au survol ou au clic d'un pin. */
  renderPreview?: (point: MapPoint) => ReactNode;
}
