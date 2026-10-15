// Natural Earth 원본(data/raw) → 지구본용 경량 GeoJSON(data/*.geojson)
// 실행: node scripts/build-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(root, 'data', 'raw');
const OUT = path.join(root, 'public', 'data');
const OVERRIDES = JSON.parse(fs.readFileSync(path.join(root, 'data', 'overrides.json'), 'utf8'));

const read = (name) => JSON.parse(fs.readFileSync(path.join(RAW, `${name}.geojson`), 'utf8')).features;
const write = (name, features) => {
  const out = applyOverrides(name, features);
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}.geojson`);
  fs.writeFileSync(file, JSON.stringify({ type: 'FeatureCollection', features: out }));
  console.log(`${name}.geojson  ${out.length} features  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
};

// ---------- 보정 데이터 (data/overrides.json) ----------
function fixName(ko) {
  if (OVERRIDES.names[ko]) return OVERRIDES.names[ko];
  for (const [from, to] of OVERRIDES.suffixRules) {
    if (ko.endsWith(from)) return ko.slice(0, -from.length) + to;
  }
  return ko;
}

function applyOverrides(name, features) {
  const minz = OVERRIDES.minz[name] ?? {};
  for (const f of features) {
    const p = f.properties;
    if (typeof p.ko === 'string' && p.ko) p.ko = fixName(p.ko);
    if (Object.hasOwn(minz, p.ko)) p.minz = minz[p.ko];
  }
  const added = (OVERRIDES.add[name] ?? []).map((a) => point(a.lng, a.lat, a.properties));
  return [...features, ...added];
}

// ---------- 좌표 처리 ----------
const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

function roundCoords(coords, d) {
  if (typeof coords[0] === 'number') return [round(coords[0], d), round(coords[1], d)];
  return coords.map((c) => roundCoords(c, d));
}

// Douglas-Peucker 선 단순화 (도 단위 tolerance)
function simplifyLine(points, tol) {
  if (points.length <= 2) return points;
  const sqTol = tol * tol;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSq = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sq = segDistSq(points[i][0], points[i][1], points[first], points[last]);
      if (sq > maxSq) { maxSq = sq; index = i; }
    }
    if (maxSq > sqTol) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function segDistSq(px, py, a, b) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = b[0]; y = b[1]; } else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}

function simplifyGeometry(geom, tol, d) {
  const line = (pts) => roundCoords(simplifyLine(pts, tol), d);
  switch (geom.type) {
    case 'LineString': return { type: geom.type, coordinates: line(geom.coordinates) };
    case 'MultiLineString': return { type: geom.type, coordinates: geom.coordinates.map(line) };
    case 'Polygon': return { type: geom.type, coordinates: geom.coordinates.map(line) };
    case 'MultiPolygon': return { type: geom.type, coordinates: geom.coordinates.map((p) => p.map(line)) };
    default: return geom;
  }
}

// ---------- 다각형 라벨 위치 (polylabel: 다각형 안쪽에서 가장자리와 가장 먼 점) ----------
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return Math.abs(a / 2);
}

function largestPolygon(geom) {
  if (geom.type === 'Polygon') return geom.coordinates;
  return geom.coordinates.reduce((best, p) => (ringArea(p[0]) > ringArea(best[0]) ? p : best));
}

function pointToPolygonDist(x, y, polygon) {
  let inside = false;
  let minSq = Infinity;
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
      minSq = Math.min(minSq, segDistSq(x, y, a, b));
    }
  }
  return (inside ? 1 : -1) * Math.sqrt(minSq);
}

function polylabel(polygon) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of polygon[0]) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const size = Math.min(maxX - minX, maxY - minY);
  if (size === 0) return [minX, minY];
  const precision = Math.max(maxX - minX, maxY - minY) / 200;
  const cell = (x, y, h) => {
    const d = pointToPolygonDist(x, y, polygon);
    return { x, y, h, d, max: d + h * Math.SQRT2 };
  };
  const queue = [];
  const h = size / 2;
  for (let x = minX; x < maxX; x += size) for (let y = minY; y < maxY; y += size) queue.push(cell(x + h, y + h, h));
  let best = cell(minX + (maxX - minX) / 2, minY + (maxY - minY) / 2, 0);
  while (queue.length) {
    let bi = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i].max > queue[bi].max) bi = i;
    const c = queue.splice(bi, 1)[0];
    if (c.d > best.d) best = c;
    if (c.max - best.d <= precision) continue;
    const ch = c.h / 2;
    queue.push(cell(c.x - ch, c.y - ch, ch), cell(c.x + ch, c.y - ch, ch), cell(c.x - ch, c.y + ch, ch), cell(c.x + ch, c.y + ch, ch));
  }
  return [best.x, best.y];
}

const point = (lng, lat, properties) => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Point', coordinates: [round(lng, 4), round(lat, 4)] },
});

const pick = (...values) => values.find((v) => typeof v === 'string' && v.trim()) ?? '';

// ---------- 1. 나라 (면 + 라벨점) ----------
// 공식 명칭이 긴 나라는 교과서에서 쓰는 짧은 이름으로 바꿔 표시
const COUNTRY_KO_SHORT = { PRK: '북한', CHN: '중국' };
const countries = read('ne_50m_admin_0_countries');
for (const f of countries) {
  const short = COUNTRY_KO_SHORT[f.properties.ADM0_A3];
  if (short) f.properties.NAME_KO = short;
}
write('countries', countries.map((f) => ({
  type: 'Feature',
  properties: {
    id: f.properties.ADM0_A3,
    ko: pick(f.properties.NAME_KO, f.properties.NAME),
    en: pick(f.properties.NAME_EN, f.properties.NAME),
    color: f.properties.MAPCOLOR7,
    continent: f.properties.CONTINENT,
  },
  geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates, 3) },
})));
write('country-labels', countries.map((f) => point(f.properties.LABEL_X, f.properties.LABEL_Y, {
  id: f.properties.ADM0_A3,
  ko: pick(f.properties.NAME_KO, f.properties.NAME),
  en: pick(f.properties.NAME_EN, f.properties.NAME),
  minz: f.properties.MIN_LABEL,
  rank: f.properties.LABELRANK,
})));

// ---------- 2. 도시 (수도 / 주도 / 일반 도시) ----------
const places = read('ne_10m_populated_places').map((f) => {
  const p = f.properties;
  const cls = p.ADM0CAP === 1 ? 'capital' : p.FEATURECLA === 'Admin-1 capital' ? 'admin1' : 'city';
  return point(p.LONGITUDE, p.LATITUDE, {
    ko: pick(p.NAME_KO, p.NAME_EN, p.NAME),
    en: pick(p.NAME_EN, p.NAME),
    cls,
    minz: p.MIN_ZOOM,
    rank: p.LABELRANK,
    pop: p.POP_MAX,
    country: p.ADM0_A3,
  });
});
// 같은 나라에 같은 이름의 수도가 있으면 일반 도시 점은 뺀다 (예: 평양이 두 번 찍히는 문제)
const capitals = new Set(places
  .filter((f) => f.properties.cls === 'capital')
  .map((f) => `${f.properties.country}|${f.properties.ko}`));
write('places', places.filter((f) => f.properties.cls === 'capital'
  || !capitals.has(`${f.properties.country}|${f.properties.ko}`)));

// ---------- 3. 시·도/주 (라벨점 + 경계선) ----------
write('admin1-labels', read('ne_10m_admin_1_states_provinces').map((f) => {
  const p = f.properties;
  return point(p.longitude, p.latitude, {
    ko: pick(p.name_ko, p.name_en, p.name),
    en: pick(p.name_en, p.name),
    minz: p.min_label,
    rank: p.labelrank,
    country: p.adm0_a3,
  });
}));
write('admin1-lines', read('ne_10m_admin_1_states_provinces_lines')
  .filter((f) => f.geometry)
  .map((f) => ({
    type: 'Feature',
    properties: { minz: f.properties.MIN_ZOOM },
    geometry: simplifyGeometry(f.geometry, 0.01, 3),
  })));

// ---------- 4. 바다·만·해협 (라벨점만, 바다는 배경색으로 표현) ----------
write('marine-labels', read('ne_10m_geography_marine_polys')
  .filter((f) => f.geometry && pick(f.properties.name_ko, f.properties.name))
  .map((f) => {
    const p = f.properties;
    const [lng, lat] = polylabel(largestPolygon(f.geometry));
    return point(lng, lat, {
      ko: pick(p.name_ko, p.name_en, p.name),
      en: pick(p.name_en, p.name),
      cls: String(p.featurecla).toLowerCase(),
      minz: p.min_label,
      rank: p.scalerank,
    });
  }));

// ---------- 5. 지형 (대륙·산맥·사막·반도·섬 등) + 산봉우리 ----------
const regionPoints = read('ne_10m_geography_regions_points').map((f) => {
  const p = f.properties;
  const [lng, lat] = f.geometry.coordinates;
  return point(lng, lat, {
    ko: pick(p.name_ko, p.name_en, p.name),
    en: pick(p.name_en, p.name),
    cls: String(p.featurecla).toLowerCase(),
    minz: p.min_zoom,
    rank: p.scalerank,
  });
});
const regionPolys = read('ne_10m_geography_regions_polys')
  .filter((f) => f.geometry && f.properties.FEATURECLA !== 'Dragons-be-here')
  .map((f) => {
    const p = f.properties;
    const [lng, lat] = polylabel(largestPolygon(f.geometry));
    return point(lng, lat, {
      ko: pick(p.NAME_KO, p.NAME_EN, p.NAME),
      en: pick(p.NAME_EN, p.NAME),
      cls: String(p.FEATURECLA).toLowerCase(),
      minz: p.MIN_LABEL,
      rank: p.SCALERANK,
    });
  });
write('regions', [...regionPolys, ...regionPoints]);
write('peaks', read('ne_10m_geography_regions_elevation_points').map((f) => {
  const p = f.properties;
  const [lng, lat] = f.geometry.coordinates;
  return point(lng, lat, {
    ko: pick(p.name_ko, p.name_en, p.name),
    en: pick(p.name_en, p.name),
    cls: String(p.featurecla).toLowerCase(),
    elev: p.elevation,
    minz: p.min_zoom,
    rank: p.scalerank,
  });
}));

// ---------- 6. 호수 (면 + 라벨점) ----------
const lakes = read('ne_50m_lakes').filter((f) => f.geometry);
write('lakes', lakes.map((f) => ({
  type: 'Feature',
  properties: {},
  geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates, 3) },
})));
write('lake-labels', lakes
  .filter((f) => pick(f.properties.name_ko, f.properties.name))
  .map((f) => {
    const p = f.properties;
    const [lng, lat] = polylabel(largestPolygon(f.geometry));
    return point(lng, lat, {
      ko: pick(p.name_ko, p.name_en, p.name),
      en: pick(p.name_en, p.name),
      minz: p.min_label,
      rank: p.scalerank,
    });
  }));

// ---------- 7. 강 (Natural Earth에 한국어 이름이 없어 주요 강만 사전으로 붙임) ----------
const RIVER_KO = {
  Nile: '나일강', 'Victoria Nile': '나일강', 'Albert Nile': '나일강', 'Bahr el Jebel': '백나일강',
  'El Bahr el Abyad': '백나일강', 'El Bahr el Azraq': '청나일강', Abay: '청나일강',
  Amazonas: '아마존강', Mississippi: '미시시피강', Missouri: '미주리강', Ohio: '오하이오강',
  Yangtze: '양쯔강', 'Chang Jiang': '양쯔강', Jinsha: '진사강', Huang: '황허강',
  'Heilong Jiang': '아무르강', Amur: '아무르강', Mekong: '메콩강', Lancang: '메콩강',
  Brahmaputra: '브라마푸트라강', Yarlung: '브라마푸트라강', Ganges: '갠지스강', Indus: '인더스강',
  Euphrates: '유프라테스강', Firat: '유프라테스강', 'Al Furat': '유프라테스강', Tigris: '티그리스강', Dijlah: '티그리스강',
  Volga: '볼가강', Danube: '도나우강', Donau: '도나우강', Rhine: '라인강', Rhein: '라인강',
  Lena: '레나강', Ob: '오브강', Irtysh: '이르티시강', Ertis: '이르티시강', Ertix: '이르티시강',
  Yenisey: '예니세이강', Angara: '앙가라강', Selenga: '셀렝가강',
  Congo: '콩고강', Lualaba: '콩고강', Niger: '니제르강', Zambezi: '잠베지강', Orange: '오렌지강', Limpopo: '림포포강',
  Orinoco: '오리노코강', 'Paraná': '파라나강', Madeira: '마데이라강',
  'St. Lawrence': '세인트로렌스강', Mackenzie: '매켄지강', Yukon: '유콘강', Columbia: '컬럼비아강', Colorado: '콜로라도강',
  Murray: '머리강', Darling: '달링강', Irrawaddy: '이라와디강', 'Chao Phraya': '짜오프라야강',
  Thames: '템스강', Seine: '센강', Loire: '루아르강', Elbe: '엘베강', Dnieper: '드니프로강', Don: '돈강',
  'Amu Darya': '아무다리야강', 'Syr Darya': '시르다리야강', Ural: '우랄강',
};
const KOREA_RIVER_KO = { Han: '한강', Namhan: '남한강', Nakdong: '낙동강', Tumen: '두만강', Yalu: '압록강' };
const inKorea = (geom) => JSON.stringify(geom.coordinates).match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g)
  .some((s) => { const [x, y] = s.split(',').map(Number); return x > 124 && x < 131 && y > 33 && y < 43.5; });

write('rivers', read('ne_10m_rivers_lake_centerlines')
  .filter((f) => f.geometry && f.properties.scalerank <= 9)
  .map((f) => {
    const p = f.properties;
    const ko = RIVER_KO[p.name] ?? (KOREA_RIVER_KO[p.name] && inKorea(f.geometry) ? KOREA_RIVER_KO[p.name] : '');
    return {
      type: 'Feature',
      properties: { ko, en: pick(p.name_en, p.name), minz: p.min_zoom, labelz: p.min_label, rank: p.scalerank },
      geometry: simplifyGeometry(f.geometry, 0.005, 3),
    };
  }));

// ---------- 8. 적도·회귀선·극권·날짜변경선 ----------
write('geo-lines', read('ne_50m_geographic_lines').map((f) => ({
  type: 'Feature',
  properties: {
    ko: pick(f.properties.name_ko, f.properties.name),
    en: pick(f.properties.name_en, f.properties.name),
    cls: f.properties.featurecla,
  },
  geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates, 3) },
})));
