// Natural Earth 원본(data/raw) → 지구본용 경량 GeoJSON(public/data/*.geojson), data/overrides.json 보정 적용
// 실행: npm run data:build
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
// 적용 순서: names(통째로 바꿀 이름, 끝말 규칙보다 우선) → suffixRules(끝말 규칙, 앞 띄어쓰기 포함)
// → minz(키는 바뀐 뒤의 이름) → props(키는 바뀐 뒤의 이름, 적은 속성만 덮어씀. 예: 산 높이 elev)
// → add(이미 올바른 이름이라 보정을 거치지 않고 덧붙임)
function fixName(ko) {
  if (OVERRIDES.names[ko]) return OVERRIDES.names[ko];
  for (const [from, to] of OVERRIDES.suffixRules) {
    if (ko.endsWith(from)) return ko.slice(0, -from.length) + to;
  }
  return ko;
}

function applyOverrides(name, features) {
  const minz = OVERRIDES.minz[name] ?? {};
  const props = OVERRIDES.props?.[name] ?? {};
  for (const f of features) {
    const p = f.properties;
    if (typeof p.ko === 'string' && p.ko) p.ko = fixName(p.ko);
    if (Object.hasOwn(minz, p.ko)) p.minz = minz[p.ko];
    if (Object.hasOwn(props, p.ko)) Object.assign(p, props[p.ko]);
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
// 이름 보정(write 안에서 적용) 전의 원래 이름으로 비교한다.
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
// 적도는 경도 -180~180을 잇는 선 하나라서, 낮은 줌(약 2.5 아래) 타일에서 동반구 쪽(경도 0~180)이 그려지지 않는다.
// 경도 -90·0·90에서 끊어 네 조각(MultiLineString)으로 나누면 모든 줌에서 그려진다.
const EQUATOR_CUTS = [-90, 0, 90];
function splitAtLngs(coords, cuts) {
  const parts = [[]];
  for (const c of coords) {
    const part = parts[parts.length - 1];
    part.push(c);
    if (cuts.includes(c[0]) && part.length > 1) parts.push([c]);
  }
  return parts.filter((p) => p.length > 1);
}

write('geo-lines', read('ne_50m_geographic_lines').map((f) => {
  const en = pick(f.properties.name_en, f.properties.name);
  let geometry = { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates, 3) };
  if (en.toLowerCase() === 'equator' && geometry.type === 'LineString') {
    geometry = { type: 'MultiLineString', coordinates: splitAtLngs(geometry.coordinates, EQUATOR_CUTS) };
    if (geometry.coordinates.length !== EQUATOR_CUTS.length + 1) throw new Error('적도를 네 조각으로 나누지 못했다');
  }
  return {
    type: 'Feature',
    properties: { ko: pick(f.properties.name_ko, f.properties.name), en, cls: f.properties.featurecla },
    geometry,
  };
}));

// ---------- 9. 대륙·대양 영역 (지도에 그리지 않고 '찾아 누르기' 미션 판정에만 쓴다) ----------
// queryRenderedFeatures는 위에 그려진(뒤 순서) 영역부터 돌려주므로 바다를 앞에, 땅을 뒤에 둔다
// (바다 다각형과 섬·빙붕이 겹치는 곳은 땅으로 판정된다).
// 태평양·대서양은 남북 두 조각이지만 이름(ko)이 같아서 한 영역처럼 판정된다.
const polygonsOf = (geom) => (geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates);

function bboxOf(polygon) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of polygon[0]) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

function inPolygon(x, y, polygon) {
  let inside = false;
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
  }
  return inside;
}

// 단순화하면서 점이 3개 미만으로 줄어든 고리(아주 작은 섬 등)는 버린다. 남는 게 없으면 null.
function areaFeature(ko, kind, geom) {
  const polygons = polygonsOf(simplifyGeometry(geom, 0.05, 2))
    .filter((p) => p[0].length >= 4)
    .map((p) => p.filter((ring) => ring.length >= 4));
  if (!polygons.length) return null;
  return { type: 'Feature', properties: { ko, kind }, geometry: { type: 'MultiPolygon', coordinates: polygons } };
}

// 물: 대양 + 바다·만·해협 등. 바다는 가장 가까운 대양(라벨점에서 대양 다각형 가장자리까지 거리)의
// 이름으로 판정하고, 교과서와 다르게 붙는 것은 overrides.json의 areaOcean으로 바로잡는다.
// 석호·강 하구와 내륙 바다(areaSkip: 카스피해 등)는 대양이 아니므로 뺀다.
const SEA_CLASSES = ['sea', 'gulf', 'bay', 'strait', 'channel', 'sound', 'fjord', 'inlet', 'reef', 'generic'];
const marine = read('ne_10m_geography_marine_polys').filter((f) => f.geometry);
const oceans = marine.filter((f) => f.properties.featurecla === 'ocean');
const oceanKo = (f) => pick(f.properties.name_ko, f.properties.name);
function nearestOcean(lng, lat) {
  let best = '';
  let bestDist = Infinity;
  for (const o of oceans) {
    for (const polygon of polygonsOf(o.geometry)) {
      const dist = -pointToPolygonDist(lng, lat, polygon);
      if (dist < bestDist) { bestDist = dist; best = oceanKo(o); }
    }
  }
  return best;
}
const seas = marine
  .filter((f) => SEA_CLASSES.includes(f.properties.featurecla) && !OVERRIDES.areaSkip.includes(f.properties.name))
  .map((f) => {
    const [lng, lat] = polylabel(largestPolygon(f.geometry));
    return { f, ko: OVERRIDES.areaOcean[f.properties.name] ?? nearestOcean(lng, lat) };
  });

// 땅: 대륙 + 섬·지협(REGION으로 대륙을 정함, 중앙아메리카는 대륙 다각형에 빠져 있음) + 남극 빙붕.
// 섬 무리 중에는 섬들을 느슨하게 감싼 큰 다각형(폴리네시아, 일본 등)이 많아 바다까지 덮으므로,
// 안쪽 격자점의 80% 이상이 실제 땅(나라 면)인 섬만 쓴다. 대륙이 분명하지 않은 섬(REGION이 대양)은 뺀다.
const CONTINENT_KO = {
  Asia: '아시아', Europe: '유럽', Africa: '아프리카', 'North America': '북아메리카',
  'South America': '남아메리카', Oceania: '오세아니아', Antarctica: '남극',
};
const land = countries.flatMap((f) => polygonsOf(f.geometry).map((p) => ({ p, box: bboxOf(p) })));
const onLand = (x, y) => land.some(({ p, box }) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] && inPolygon(x, y, p));
function landShare(geom) {
  let inside = 0;
  let hits = 0;
  for (const p of polygonsOf(geom)) {
    const [minX, minY, maxX, maxY] = bboxOf(p);
    const step = Math.max(maxX - minX, maxY - minY, 0.4) / 20;
    for (let x = minX + step / 2; x < maxX; x += step) {
      for (let y = minY + step / 2; y < maxY; y += step) {
        if (!inPolygon(x, y, p)) continue;
        inside++;
        if (onLand(x, y)) hits++;
      }
    }
  }
  return inside ? hits / inside : 0;
}
const regionAreas = read('ne_10m_geography_regions_polys').filter((f) => f.geometry);
const continents = regionAreas.filter((f) => f.properties.FEATURECLA === 'Continent');
const islands = regionAreas.filter((f) => ['Island', 'Island group', 'Isthmus'].includes(f.properties.FEATURECLA)
  && CONTINENT_KO[f.properties.REGION] && landShare(f.geometry) >= 0.8);
// 땅 비율이 낮아 뺀 섬 무리(노바야제믈랴, 누벨칼레도니 등)는 그 안에 든 실제 땅(나라 면 조각)만 쓴다.
// 이미 대륙·섬 다각형에 든 조각은 건너뛰고, 여러 섬 무리에 들면 가장 작은 섬 무리의 대륙을 따른다.
const inArea = (x, y, f) => polygonsOf(f.geometry).some((p) => inPolygon(x, y, p));
const sizeOf = (f) => polygonsOf(f.geometry).reduce((sum, p) => sum + ringArea(p[0]), 0);
const looseGroups = regionAreas
  .filter((f) => f.properties.FEATURECLA === 'Island group' && CONTINENT_KO[f.properties.REGION] && !islands.includes(f))
  .sort((a, b) => sizeOf(a) - sizeOf(b));
const covered = [...continents, ...islands];
const groupLand = countries.flatMap((c) => polygonsOf(c.geometry)).flatMap((p) => {
  const [x, y] = polylabel(p);
  if (covered.some((f) => inArea(x, y, f))) return [];
  const group = looseGroups.find((f) => inArea(x, y, f));
  return group ? [{ ko: CONTINENT_KO[group.properties.REGION], geometry: { type: 'Polygon', coordinates: p } }] : [];
});
const iceShelves = read('ne_10m_antarctic_ice_shelves_polys').filter((f) => f.geometry);

write('areas', [
  ...oceans.map((f) => areaFeature(oceanKo(f), 'ocean', f.geometry)),
  ...seas.map(({ f, ko }) => areaFeature(ko, 'ocean', f.geometry)),
  ...continents.map((f) => areaFeature(pick(f.properties.NAME_KO, f.properties.NAME), 'continent', f.geometry)),
  ...groupLand.map(({ ko, geometry }) => areaFeature(ko, 'continent', geometry)),
  ...islands.map((f) => areaFeature(CONTINENT_KO[f.properties.REGION], 'continent', f.geometry)),
  ...iceShelves.map((f) => areaFeature('남극', 'continent', f.geometry)),
].filter(Boolean));
