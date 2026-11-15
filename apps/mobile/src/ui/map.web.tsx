import 'maplibre-gl/dist/maplibre-gl.css';

import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import { colors } from '@/theme';

import type { MapProps } from './map-types';

/**
 * Fond de carte OpenStreetMap (aucune clé, aucun traceur).
 * Les tuiles publiques d'OSM conviennent au développement ; prévoir un fournisseur
 * de tuiles dédié avant un trafic réel (politique d'usage d'OpenStreetMap).
 */
const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© Contributeurs OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

// Worker servi par notre propre domaine (copié dans public/ après npm install).
setWorkerUrl('/maplibre-gl-worker.js');

const CSS = `
.hurden-pin{width:18px;height:18px;border-radius:50%;border:3px solid #fff;cursor:pointer;
  box-shadow:0 1px 4px rgba(0,0,0,.4);padding:0}
.hurden-pin:focus-visible{outline:3px solid #000;outline-offset:2px}
.hurden-pin--coach{background:${colors.blue};animation:hurden-pulse 1.6s ease-out infinite}
.hurden-pin--event{background:${colors.black};border-radius:4px}
.hurden-pin--selected{transform:scale(1.5);animation:none}
@keyframes hurden-pulse{0%{box-shadow:0 0 0 0 rgba(0,10,255,.55)}100%{box-shadow:0 0 0 16px rgba(0,10,255,0)}}
@media (prefers-reduced-motion: reduce){.hurden-pin--coach{animation:none}}
`;

export default function MapView({ points, center, selectedId, onSelect }: MapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!container.current) return;
    if (!document.getElementById('hurden-map-css')) {
      const style = document.createElement('style');
      style.id = 'hurden-map-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const instance = new MapLibreMap({
      container: container.current,
      style: STYLE,
      center: [center.lng, center.lat],
      zoom: 11.5,
      attributionControl: { compact: true },
    });
    instance.addControl(new NavigationControl({ showCompass: false }));
    map.current = instance;
    return () => {
      instance.remove();
      map.current = null;
    };
    // La carte n'est créée qu'une fois ; le centre est mis à jour par l'effet suivant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    map.current?.easeTo({ center: [center.lng, center.lat], duration: 600 });
  }, [center.lat, center.lng]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = points.map((point) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = `hurden-pin hurden-pin--${point.kind}${
        point.id === selectedId ? ' hurden-pin--selected' : ''
      }`;
      // textContent/aria-label : jamais de innerHTML avec des données venues de l'API.
      element.setAttribute('aria-label', point.label);
      element.title = point.label;
      element.addEventListener('click', () => onSelectRef.current(point));
      return new Marker({ element })
        .setLngLat([point.lng, point.lat])
        .addTo(instance);
    });
  }, [points, selectedId]);

  return (
    <div
      ref={container}
      role="region"
      aria-label="Carte des coachs et des événements"
      style={{ width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden' }}
    />
  );
}
