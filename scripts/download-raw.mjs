// Natural Earth 원본 GeoJSON을 data/raw에 내려받는다 (이미 있는 파일은 건너뜀)
// 실행: node scripts/download-raw.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'raw');
const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const FILES = [
  'ne_50m_admin_0_countries',
  'ne_10m_populated_places',
  'ne_10m_admin_1_states_provinces',
  'ne_10m_admin_1_states_provinces_lines',
  'ne_10m_geography_marine_polys',
  'ne_10m_geography_regions_points',
  'ne_10m_geography_regions_polys',
  'ne_10m_geography_regions_elevation_points',
  'ne_50m_lakes',
  'ne_10m_rivers_lake_centerlines',
  'ne_50m_rivers_lake_centerlines',
  'ne_50m_geographic_lines',
];

fs.mkdirSync(RAW, { recursive: true });
for (const name of FILES) {
  const file = path.join(RAW, `${name}.geojson`);
  if (fs.existsSync(file)) {
    console.log(`있음  ${name}`);
    continue;
  }
  const res = await fetch(`${BASE}/${name}.geojson`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`받음  ${name}`);
}
