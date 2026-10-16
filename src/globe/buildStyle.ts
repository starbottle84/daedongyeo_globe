import type { StyleSpecification } from 'maplibre-gl';
import { LAND_COLORS, OCEAN_COLOR, THEMES, type MapView } from './themes';

// 지명은 Natural Earth가 정한 "보이기 시작하는 확대 단계(minz)"보다 LABEL_BOOST만큼 일찍 보여준다.
const LABEL_BOOST = 1;

const FONT = {
  regular: ['Noto Sans Regular'],
  medium: ['Noto Sans Medium'],
  italic: ['Noto Sans Italic'],
};

// MapLibre는 데이터·글꼴 주소를 전체 주소로 받아야 안전하다. {fontstack} 같은 자리표시자가
// 인코딩되지 않도록 URL 객체 대신 문자열로 붙인다.
const ASSET_ROOT = `${window.location.origin}${import.meta.env.BASE_URL}`;

const source = (file: string) => ({ type: 'geojson', data: `${ASSET_ROOT}data/${file}.geojson` });
const visibleFrom = (offset = LABEL_BOOST) => ['>=', ['zoom'], ['-', ['get', 'minz'], offset]];
const koName = ['get', 'ko'];

export function buildStyle(view: MapView): StyleSpecification {
  const t = THEMES[view];
  const shown = (on: boolean) => (on ? 'visible' : 'none');
  const labelPaint = (color: unknown = t.text, haloWidth = 1.5) => ({
    'text-color': color,
    'text-halo-color': t.halo,
    'text-halo-width': haloWidth,
  });

  const style = {
    version: 8,
    projection: { type: 'globe' },
    glyphs: `${ASSET_ROOT}fonts/{fontstack}/{range}.pbf`,
    sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] },
    sources: {
      // NASA Blue Marble 위성 영상 (NASA GIBS, 퍼블릭 도메인, 확대 8단계까지)
      satellite: {
        type: 'raster',
        tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],
        tileSize: 256,
        maxzoom: 8,
        attribution: 'NASA Blue Marble (GIBS)',
      },
      countries: source('countries'),
      countryLabels: source('country-labels'),
      places: source('places'),
      admin1Labels: source('admin1-labels'),
      admin1Lines: source('admin1-lines'),
      marineLabels: source('marine-labels'),
      regions: source('regions'),
      peaks: source('peaks'),
      lakes: source('lakes'),
      lakeLabels: source('lake-labels'),
      rivers: source('rivers'),
      geoLines: source('geo-lines'),
      areas: source('areas'),
    },
    layers: [
      // ---------- 바탕: 바다 · 땅 · 물 ----------
      { id: 'ocean', type: 'background', paint: { 'background-color': OCEAN_COLOR } },
      { id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: shown(t.satellite) } },
      // 해안선 두 겹 (흰 테두리 + 모래색). 땅 아래에 깔아 바다 쪽만 보이게 한다 — 나라 사이 경계에는 생기지 않는다.
      {
        id: 'coast-glow', type: 'line', source: 'countries',
        layout: { visibility: shown(!t.satellite), 'line-join': 'round' },
        paint: { 'line-color': '#FFFFFF', 'line-opacity': 0.55, 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 4, 6, 14] },
      },
      {
        id: 'coast-sand', type: 'line', source: 'countries',
        layout: { visibility: shown(!t.satellite), 'line-join': 'round' },
        paint: { 'line-color': '#EBDDB0', 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 1.4, 6, 4] },
      },
      {
        id: 'country-fill', type: 'fill', source: 'countries',
        layout: { visibility: shown(!t.satellite) },
        paint: {
          'fill-color': ['match', ['get', 'color'],
            1, LAND_COLORS[0], 2, LAND_COLORS[1], 3, LAND_COLORS[2], 4, LAND_COLORS[3],
            5, LAND_COLORS[4], 6, LAND_COLORS[5], LAND_COLORS[6]],
        },
      },
      {
        id: 'lake-fill', type: 'fill', source: 'lakes',
        layout: { visibility: shown(!t.satellite) },
        paint: { 'fill-color': OCEAN_COLOR },
      },
      // 보이지 않는 대륙·대양 영역. '찾아 누르기' 미션에서 어느 영역을 눌렀는지 알아내는 데만 쓴다.
      // visibility를 none으로 하면 판정에서도 빠지므로 투명도 0으로 숨긴다.
      { id: 'area-hit', type: 'fill', source: 'areas', paint: { 'fill-color': '#000000', 'fill-opacity': 0 } },
      {
        id: 'river-line', type: 'line', source: 'rivers', filter: visibleFrom(),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': t.river,
          'line-width': ['interpolate', ['linear'], ['zoom'],
            2, ['-', 1.6, ['*', ['get', 'rank'], 0.12]],
            8, ['-', 3.2, ['*', ['get', 'rank'], 0.2]]],
        },
      },

      // ---------- 경계선 ----------
      {
        id: 'admin1-line', type: 'line', source: 'admin1Lines', minzoom: 3, filter: visibleFrom(1.5),
        paint: { 'line-color': t.border, 'line-opacity': 0.45, 'line-width': 0.8, 'line-dasharray': [3, 2] },
      },
      {
        id: 'country-line', type: 'line', source: 'countries',
        paint: {
          'line-color': t.border,
          'line-opacity': t.borderOpacity,
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 6, 1.6],
        },
      },
      {
        id: 'geo-line', type: 'line', source: 'geoLines',
        paint: {
          // 데이터의 en 값은 'equator'처럼 대소문자가 섞여 있어 소문자로 바꿔 비교한다. 진한 바다 위에서도 보이게 진한 색을 쓴다
          // (그림 지도의 회귀선·극권은 바다색과 대비 약 2.9:1인 진한 주황 — 예전 #C9661E는 약 2.05:1이라 바다에 묻혔다. 굵기를 올리는 것보다 점선 모양이 또렷하다.
          //  어두운 위성 사진 위에서는 예전 색이 더 잘 보여서 그대로 둔다)
          'line-color': ['match', ['downcase', ['get', 'en']], 'equator', '#D23B3B', 'international date line', '#6A4BC4', t.satellite ? '#C9661E' : '#A9500F'],
          'line-width': 1.4,
          'line-dasharray': [4, 3],
        },
      },

      // ---------- 지명 (아래쪽 레이어일수록 겹칠 때 먼저 가려짐) ----------
      // 독도·울릉도처럼 땅 면이 없는 작은 섬의 점. 글을 못 읽는 아이도 섬이 있다는 걸 보게 하고,
      // 맨 아래 기호 레이어 + 배치 무시라서 다른 지명을 가리지 않는다.
      {
        id: 'island-dot', type: 'symbol', source: 'regions',
        filter: ['all', ['has', 'icon'], visibleFrom()],
        layout: { 'icon-image': ['get', 'icon'], 'icon-allow-overlap': true, 'icon-ignore-placement': true },
      },
      {
        id: 'geo-line-label', type: 'symbol', source: 'geoLines',
        layout: {
          'symbol-placement': 'line', 'symbol-spacing': 600,
          'text-field': koName, 'text-font': FONT.medium, 'text-size': 12,
        },
        paint: labelPaint(t.geoLine),
      },
      {
        id: 'peak-label', type: 'symbol', source: 'peaks', filter: visibleFrom(),
        layout: {
          'icon-image': 'peak', 'icon-size': 1,
          'text-field': ['format', koName, {}, '\n', {},
            ['concat', ['number-format', ['get', 'elev'], { locale: 'ko-KR' }], 'm'], { 'font-scale': 0.8 }],
          'text-font': FONT.regular, 'text-size': 11,
          'text-anchor': 'top', 'text-offset': [0, 0.6],
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(t.peak),
      },
      {
        id: 'admin1-label', type: 'symbol', source: 'admin1Labels', filter: visibleFrom(),
        layout: {
          'text-field': koName, 'text-font': FONT.regular,
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 8, 13],
          'text-letter-spacing': 0.05, 'text-max-width': 6,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(t.admin1, 1.2),
      },
      {
        id: 'river-label', type: 'symbol', source: 'rivers',
        filter: ['all', ['!=', koName, ''], ['>=', ['zoom'], ['-', ['get', 'labelz'], LABEL_BOOST]]],
        layout: {
          'symbol-placement': 'line', 'symbol-spacing': 400,
          'text-field': koName, 'text-font': FONT.italic, 'text-size': 12,
        },
        paint: labelPaint(t.water),
      },
      {
        id: 'lake-label', type: 'symbol', source: 'lakeLabels', filter: visibleFrom(),
        layout: {
          'text-field': koName, 'text-font': FONT.italic, 'text-size': 11, 'text-max-width': 6,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(t.water, 1),
      },
      {
        id: 'region-label', type: 'symbol', source: 'regions',
        filter: ['all', ['!=', ['get', 'cls'], 'continent'], visibleFrom()],
        layout: {
          'text-field': koName, 'text-font': FONT.italic,
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 11, 6, 14],
          'text-max-width': 7, 'text-letter-spacing': 0.08,
          // 섬 점(icon)이 있는 독도·울릉도는 이름을 점 아래에 둔다 (가운데에 두면 점이 글자 밑에 가려진다)
          'text-anchor': ['case', ['has', 'icon'], 'top', 'center'],
          'text-offset': ['case', ['has', 'icon'], ['literal', [0, 0.6]], ['literal', [0, 0]]],
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(['match', ['get', 'cls'],
          'range/mtn', t.mountain,
          'desert', t.desert,
          ['plateau', 'plain', 'basin', 'lowland', 'valley', 'foothills', 'tundra', 'wetlands', 'delta'], t.flat,
          t.otherRegion], 1.2),
      },
      {
        id: 'city-label', type: 'symbol', source: 'places',
        filter: ['all', ['!=', ['get', 'cls'], 'capital'], visibleFrom()],
        layout: {
          'icon-image': ['match', ['get', 'cls'], 'admin1', 'admin1-capital', 'city'],
          'text-field': koName, 'text-font': FONT.regular,
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 8, 14],
          'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': 0.6,
          'text-justify': 'auto', 'text-max-width': 7,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(),
      },
      {
        id: 'marine-label', type: 'symbol', source: 'marineLabels',
        filter: ['all', ['!=', ['get', 'cls'], 'ocean'], visibleFrom()],
        layout: {
          'text-field': koName, 'text-font': FONT.italic,
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 12, 6, 15],
          'text-max-width': 6, 'text-letter-spacing': 0.1,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(t.water, 1),
      },
      {
        id: 'capital-label', type: 'symbol', source: 'places',
        filter: ['all', ['==', ['get', 'cls'], 'capital'], visibleFrom()],
        layout: {
          'icon-image': 'capital',
          'text-field': koName, 'text-font': FONT.medium,
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 12, 8, 15],
          'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': 0.7,
          'text-justify': 'auto',
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(),
      },
      {
        id: 'country-label', type: 'symbol', source: 'countryLabels', filter: visibleFrom(),
        layout: {
          'text-field': koName, 'text-font': FONT.medium,
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 12, 4, 16, 7, 20],
          'text-max-width': 6,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(t.text, 2),
      },
      // 대양 이름은 지구본이 작게 다 보이는 첫 화면(휴대폰 약 0~0.6, 태블릿 약 1~1.44)에서는 뺀다.
      // 이름 자리 점이 지구본 가장자리 가까이에 있어(태평양 점은 첫 화면 가운데에서 84°) 글자가 가장자리 밖 하늘에 뜨고 지도 버튼 뒤에 가린다.
      // 여행 장소 화면(1.5)과 지명 수 기준 장면(1.6)에서는 그대로 보인다.
      // 확대 1.45 아래로 넓게 보는 여행 화면(먼 두 점 방향 미션 등)에서도 대양 이름은 빠진다 — 그때도 이름이 가장자리에 걸리기 쉬워 같은 이유로 둔다
      {
        id: 'ocean-label', type: 'symbol', source: 'marineLabels', minzoom: 1.45,
        filter: ['==', ['get', 'cls'], 'ocean'],
        layout: {
          'text-field': koName, 'text-font': FONT.italic,
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 16, 5, 24],
          'text-letter-spacing': 0.4,
        },
        paint: { 'text-color': t.ocean, 'text-halo-color': t.oceanHalo, 'text-halo-width': 1 },
      },
      {
        id: 'continent-label', type: 'symbol', source: 'regions', maxzoom: 3,
        filter: ['==', ['get', 'cls'], 'continent'],
        layout: {
          'text-field': koName, 'text-font': FONT.medium, 'text-size': 20,
          'text-letter-spacing': 0.3, 'text-allow-overlap': true,
          // 오세아니아 이름 자리 점은 첫 화면 지구본 아래 가장자리에 걸려 글자 절반이 하늘로 나온다 — 글자 아래 끝을 점에 맞춰 지구본 안쪽에 둔다
          'text-anchor': ['match', ['get', 'en'], 'Australia', 'bottom', 'center'],
        },
        paint: {
          'text-color': '#ffffff', 'text-halo-color': 'rgba(29, 36, 51, 0.7)', 'text-halo-width': 2,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 1, 3, 0],
        },
      },
    ],
  };

  // MapLibre의 식(expression) 타입은 튜플 유니온이라 배열 리터럴로는 추론이 안 되므로,
  // 완성된 스타일을 경계에서 한 번만 단언한다.
  return style as unknown as StyleSpecification;
}
