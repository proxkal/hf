import 'maplibre-gl/dist/maplibre-gl.css';

import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import { colors } from '@/theme';

import type { MapPoint, MapProps } from './map-types';

/**
 * Fond de carte OpenStreetMap (aucune clé, aucun traceur), passé en niveaux de gris
 * très clairs pour coller à la charte : un fond blanc sur lequel les pins bleus et noirs
 * ressortent. Prévoir un fournisseur de tuiles dédié avant un trafic réel
 * (politique d'usage d'OpenStreetMap).
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
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': colors.white } },
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-saturation': -1,
        // Remonte les zones sombres : fond quasi blanc, routes et libellés en gris doux.
        'raster-brightness-min': 0.45,
        'raster-brightness-max': 1,
        'raster-contrast': -0.15,
      },
    },
  ],
};

// Worker servi par notre propre domaine (copié dans public/ après npm install).
setWorkerUrl('/maplibre-gl-worker.js');

const BLUE_HALO = 'rgba(0,10,255,.55)';

/*
 * MapLibre positionne chaque pin (position absolue + `transform`) sur l'élément racine :
 * on n'y applique jamais `position`, `transform`, `scale` ni `translate`, qui décaleraient
 * le pin de son point géographique.
 *
 * Pins façon Uber : coach = petit point bleu de 14 px ; événement = mini calendrier
 * (bandeau bleu, anneaux, cases) de 16 px. La zone cliquable (le bouton, transparent)
 * fait 28 px pour rester facile à viser ; seul le pictogramme grossit au survol.
 */
const CSS = `
.hp{width:28px;height:28px;display:flex;align-items:center;justify-content:center;padding:0;
  border:0;cursor:pointer;background:none}
.hp:hover,.hp--active{z-index:3}
.hp:focus-visible{outline:2px solid #000;outline-offset:1px;border-radius:999px}
.hp-dot{position:relative;width:14px;height:14px;border:2.5px solid #fff;box-sizing:border-box;
  box-shadow:0 1px 4px rgba(0,0,0,.35);transition:width .15s ease,height .15s ease}
.hp--coach .hp-dot{border-radius:50%;background:${colors.blue}}
.hp--coach:hover .hp-dot,.hp--coach.hp--active .hp-dot{width:20px;height:20px;border-width:3px;
  box-shadow:0 0 0 2px ${colors.blue}55,0 2px 8px rgba(0,0,0,.35)}
.hp--event .hp-dot{width:16px;height:15px;border:1.5px solid #000;border-top:4.5px solid ${colors.blue};
  border-radius:3px;background:#fff;box-shadow:0 0 0 2px #fff,0 1px 5px rgba(0,0,0,.4)}
.hp--event .hp-dot::before{content:'';position:absolute;top:-7px;left:2.5px;width:2px;height:4px;
  border-radius:1px;background:#000;box-shadow:6px 0 0 #000}
.hp--event .hp-dot::after{content:'';position:absolute;left:2px;top:2px;width:2.5px;height:2.5px;
  border-radius:.5px;background:#000;box-shadow:4px 0 0 #000,0 3.5px 0 #000}
.hp--event:hover .hp-dot,.hp--event.hp--active .hp-dot{width:21px;height:20px;border-top-width:6px;
  box-shadow:0 0 0 2px #fff,0 0 0 4px ${colors.blue}55,0 2px 8px rgba(0,0,0,.35)}
.hp--event:hover .hp-dot::before,.hp--event.hp--active .hp-dot::before{top:-9px;left:4px;box-shadow:8px 0 0 #000}
.hp--event:hover .hp-dot::after,.hp--event.hp--active .hp-dot::after{left:3px;top:3px;width:3px;height:3px;
  box-shadow:5.5px 0 0 #000,0 4.5px 0 #000}
.hp--coach .hp-dot::after{content:'';position:absolute;inset:-2.5px;border-radius:50%;
  animation:hp-pulse 2.4s ease-out infinite;pointer-events:none}
.hp--active .hp-dot::after{animation:none}
@keyframes hp-pulse{0%{box-shadow:0 0 0 0 ${BLUE_HALO}}100%{box-shadow:0 0 0 9px rgba(0,10,255,0)}}
@media (prefers-reduced-motion: reduce){.hp-dot::after{animation:none!important}.hp-dot{transition:none}}
.maplibregl-ctrl-group{border-radius:12px!important;box-shadow:0 2px 10px rgba(0,0,0,.15)!important}
`;

/** Délai avant de masquer l'aperçu quand la souris quitte un pin (le temps d'atteindre la carte). */
const HIDE_DELAY_MS = 180;
const PREVIEW_WIDTH = 260;
/** Marge minimale entre l'aperçu et le bord de la carte. */
const MARGIN = 10;
/** En haut, l'aperçu laisse libres les filtres posés sur la carte. */
const TOP_MARGIN = 64;
/** Distance minimale entre un pin ouvert et les bords bas / latéraux de la carte. */
const EDGE = 44;
/** Écart entre le pin et l'aperçu quand celui-ci s'ouvre en dessous. */
const BELOW_GAP = 18;
/** Distance entre le point géographique et le bas de l'aperçu ouvert au-dessus. */
const PIN_GAP = 18;

function buildPin(point: MapPoint) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `hp hp--${point.kind}`;
  // aria-label uniquement : jamais de innerHTML avec des données de l'API.
  element.setAttribute('aria-label', point.label);
  const dot = document.createElement('span');
  dot.className = 'hp-dot';
  element.appendChild(dot);
  return element;
}

export default function MapView({
  points,
  center,
  selectedId,
  onSelect,
  renderPreview,
}: MapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; element: HTMLButtonElement }>());
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoverId, setHoverId] = useState<string | null>(null);
  /**
   * Position écran du pin ouvert et taille de la carte, recalculées à chaque mouvement.
   * Gardées en state (et non lues dans des refs au rendu) pour que le React Compiler
   * ne mette pas le placement de l'aperçu en cache.
   */
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );
  /** Hauteur réelle de l'aperçu, mesurée après rendu, pour le placer sans débordement. */
  const [previewHeight, setPreviewHeight] = useState(300);
  const observer = useRef<ResizeObserver | null>(null);
  const measurePreview = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    observer.current = new ResizeObserver(([entry]) => {
      if (entry) setPreviewHeight(Math.round(entry.contentRect.height));
    });
    observer.current.observe(node);
  }, []);

  const previewId = hoverId ?? selectedId;
  const previewPoint = previewId ? points.find((p) => p.id === previewId) : undefined;
  /** Pin ouvert, lu par les écouteurs de la carte (déplacement, redimensionnement). */
  const previewRef = useRef(previewPoint);

  const reproject = useCallback(() => {
    const instance = map.current;
    const element = container.current;
    const point = previewRef.current;
    if (!instance || !element || !point) {
      setAnchor(null);
      return;
    }
    const { x, y } = instance.project([point.lng, point.lat]);
    setAnchor({ x, y, w: element.clientWidth, h: element.clientHeight });
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }, []);
  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimer.current = setTimeout(() => setHoverId(null), HIDE_DELAY_MS);
  }, [cancelHide]);

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
      zoom: 12,
      attributionControl: { compact: true },
    });
    instance.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
    // Clic sur le fond de carte : ferme l'aperçu.
    instance.on('click', () => onSelectRef.current(null));
    // L'aperçu suit son pin quand la carte bouge.
    instance.on('move', reproject);
    instance.on('resize', reproject);
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

  // Pins : recréés seulement quand la liste change.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    markers.current.forEach(({ marker }) => marker.remove());
    markers.current.clear();
    for (const point of points) {
      const element = buildPin(point);
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelectRef.current(point);
      });
      element.addEventListener('mouseenter', () => {
        cancelHide();
        setHoverId(point.id);
      });
      element.addEventListener('mouseleave', scheduleHide);
      element.addEventListener('focus', () => {
        cancelHide();
        setHoverId(point.id);
      });
      element.addEventListener('blur', scheduleHide);
      const marker = new Marker({ element, anchor: 'center' })
        .setLngLat([point.lng, point.lat])
        .addTo(instance);
      markers.current.set(point.id, { marker, element });
    }
    setHoverId((current) => (current && points.some((p) => p.id === current) ? current : null));
  }, [points, cancelHide, scheduleHide]);

  // État visuel du pin actif, sans recréer les pins.
  useEffect(() => {
    markers.current.forEach(({ element }, id) => {
      element.classList.toggle('hp--active', id === previewId);
      element.setAttribute('aria-expanded', String(id === previewId));
    });
  }, [previewId, points]);

  // Échap ferme l'aperçu.
  useEffect(() => {
    if (!previewId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setHoverId(null);
      onSelectRef.current(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewId]);

  useEffect(() => cancelHide, [cancelHide]);
  useEffect(() => () => observer.current?.disconnect(), []);

  // Au clic, la carte glisse pour que le pin soit visible avec la place de l'aperçu au-dessus.
  useEffect(() => {
    const instance = map.current;
    const element = container.current;
    const point = selectedId ? points.find((p) => p.id === selectedId) : undefined;
    if (!instance || !element || !point) return;
    const { x, y } = instance.project([point.lng, point.lat]);
    const width = element.clientWidth;
    const height = element.clientHeight;
    // +6 px de marge de sécurité (arrondis de projection).
    const minY = TOP_MARGIN + 6 + PIN_GAP + previewHeight;
    const targetY = Math.min(Math.max(y, minY), height - EDGE);
    const targetX = Math.min(Math.max(x, EDGE), width - EDGE);
    if (Math.abs(targetY - y) > 1 || Math.abs(targetX - x) > 1) {
      instance.panBy([x - targetX, y - targetY], { duration: 350 });
    }
    // À l'ouverture d'un pin, puis une fois la hauteur réelle de l'aperçu mesurée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, previewHeight]);

  // Recalcule la position quand on ouvre un autre pin ou que la liste change.
  useEffect(() => {
    previewRef.current = previewPoint;
    reproject();
  }, [previewPoint, reproject]);

  let previewStyle: CSSProperties | null = null;
  if (previewPoint && anchor) {
    const { x, y, w: width, h: height } = anchor;
    const half = Math.min(PREVIEW_WIDTH, width - 2 * MARGIN) / 2;
    const left = Math.max(half + MARGIN, Math.min(width - half - MARGIN, x));
    const above = y - PIN_GAP - previewHeight;
    const below = y + BELOW_GAP;
    // Au-dessus si possible, sinon en dessous, sinon calé dans la carte.
    const top =
      above >= TOP_MARGIN - 1
        ? above
        : below + previewHeight <= height - MARGIN
          ? below
          : Math.max(MARGIN, height - previewHeight - MARGIN);
    previewStyle = {
      position: 'absolute',
      left,
      top,
      width: half * 2,
      transform: 'translateX(-50%)',
      zIndex: 10,
    };
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={container}
        role="region"
        aria-label="Carte des coachs et des événements"
        style={{ width: '100%', height: '100%' }}
      />
      {previewPoint && previewStyle && renderPreview ? (
        <div
          ref={measurePreview}
          role="dialog"
          aria-label={previewPoint.label}
          style={previewStyle}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}>
          {renderPreview(previewPoint)}
        </div>
      ) : null}
    </div>
  );
}
