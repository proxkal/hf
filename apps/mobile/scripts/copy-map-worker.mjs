// Copie le worker de MapLibre dans public/ pour que la version web puisse le charger
// depuis notre propre domaine (pas de CDN tiers). Lancé automatiquement après npm install.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
copyFileSync(
  new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url),
  new URL('../public/maplibre-gl-worker.js', import.meta.url),
);
