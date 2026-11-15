import 'maplibre-gl/dist/maplibre-gl.css';

import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import { colors, fonts } from '@/theme';

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
 * le pin de son point géographique. Le pin survolé ou ouvert est signalé par un contour.
 */
const CSS = `
.hp{display:flex;align-items:center;justify-content:center;padding:0;border:0;
  cursor:pointer;background:none;font-family:${fonts.bodyBold},system-ui,sans-serif;
  transition:box-shadow .15s ease}
.hp:hover,.hp--active{z-index:3}
.hp--coach:hover,.hp--coach.hp--active{box-shadow:0 0 0 3px #fff,0 0 0 5px #000,0 6px 16px rgba(0,0,0,.3)}
.hp--event:hover,.hp--event.hp--active{box-shadow:0 0 0 3px #fff,0 0 0 5px ${colors.blue},0 6px 16px rgba(0,0,0,.3)}
.hp:focus-visible{outline:3px solid #000;outline-offset:3px;border-radius:999px}
.hp--coach{width:44px;height:44px;border-radius:50%;background:${colors.blue};
  box-shadow:0 4px 12px rgba(0,0,0,.22)}
.hp--coach::after{content:'';position:absolute;inset:0;border-radius:50%;
  animation:hp-pulse 2.2s ease-out infinite;pointer-events:none}
.hp--coach.hp--active::after{animation:none}
.hp-avatar{width:36px;height:36px;border-radius:50%;background:#fff;color:#000;display:flex;
  align-items:center;justify-content:center;font-size:13px;letter-spacing:.3px}
.hp--coach.hp--active{background:#000}
.hp--coach.hp--active .hp-avatar{background:${colors.blue};color:#fff}
.hp--event{width:42px;flex-direction:column;border-radius:10px;overflow:visible;background:#fff;
  border:1px solid #000;box-shadow:0 4px 12px rgba(0,0,0,.22)}
.hp--event::before{content:'';position:absolute;bottom:-7px;left:50%;width:12px;height:12px;
  background:#fff;border-right:1px solid #000;border-bottom:1px solid #000;
  transform:translateX(-50%) rotate(45deg);border-radius:0 0 2px 0}
.hp-month{border-radius:9px 9px 0 0}
.hp-month{width:100%;border-radius:10px 10px 0 0;background:${colors.blue};color:#fff;
  font-size:9px;letter-spacing:1px;line-height:15px;text-align:center;position:relative}
.hp-day{color:#000;font-size:17px;line-height:24px;position:relative}
.hp--event.hp--active .hp-month{background:#000}
@keyframes hp-pulse{0%{box-shadow:0 0 0 0 ${BLUE_HALO}}100%{box-shadow:0 0 0 14px rgba(0,10,255,0)}}
@media (prefers-reduced-motion: reduce){.hp--coach::after{animation:none}.hp{transition:none}}.maplibregl-ctrl-group{border-radius:12px!important;box-shadow:0 2px 10px rgba(0,0,0,.15)!important}
`;

/** Délai avant de masquer l'aperçu quand la souris quitte un pin (le temps d'atteindre la carte). */
const HIDE_DELAY_MS = 180;
const PREVIEW_WIDTH = 320;
/** Marge minimale entre l'aperçu et le bord de la carte. */
const MARGIN = 10;
/** En haut, l'aperçu laisse libres les filtres posés sur la carte. */
const TOP_MARGIN = 64;
/** Distance minimale entre un pin ouvert et les bords bas / latéraux de la carte. */
const EDGE = 44;
/** Écart entre le pin et l'aperçu quand celui-ci s'ouvre en dessous. */
const BELOW_GAP = 30;
/** Distance entre le point géographique et le haut du pin (le pin événement est ancré par sa pointe). */
const pinOffset = (point: MapPoint) => (point.kind === 'event' ? 62 : 32);

function buildPin(point: MapPoint) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `hp hp--${point.kind}`;
  // textContent / aria-label uniquement : jamais de innerHTML avec des données de l'API.
  element.setAttribute('aria-label', point.label);
  if (point.kind === 'coach') {
    const avatar = document.createElement('span');
    avatar.className = 'hp-avatar';
    avatar.textContent = point.badge;
    element.appendChild(avatar);
  } else {
    const month = document.createElement('span');
    month.className = 'hp-month';
    month.textContent = point.caption ?? '';
    const day = document.createElement('span');
    day.className = 'hp-day';
    day.textContent = point.badge;
    element.append(month, day);
  }
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
      const marker = new Marker({ element, anchor: point.kind === 'event' ? 'bottom' : 'center' })
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
    const minY = TOP_MARGIN + 6 + pinOffset(point) + previewHeight;
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
    const above = y - pinOffset(previewPoint) - previewHeight;
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
