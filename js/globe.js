// Natural Earth 데이터로 그린 한국어 지구본 (그림 지도 / 위성 지도)
// 지명은 Natural Earth가 정한 "보이기 시작하는 확대 단계(minz)"보다 LABEL_BOOST만큼 일찍 보여준다.
const LABEL_BOOST = 1;

const LAND_COLORS = ['#f6d58e', '#b8e0a0', '#f5b5a0', '#c9b8e8', '#a8d8c8', '#f2c6de', '#e8dca0'];
const OCEAN_COLOR = '#9fd3f0';

// 보기 방식별 색. 위성 지도는 어두운 사진 위에 흰 글씨 + 검은 테두리로 읽히게 한다.
const THEMES = {
  map: {
    satellite: false,
    text: '#1d2433', halo: '#ffffff',
    water: '#2f6f9f', ocean: '#2a6496', oceanHalo: 'rgba(255,255,255,0.6)',
    admin1: '#6a5f73', peak: '#7a4b1e', geoLine: '#b5482f',
    border: '#5b6270', borderOpacity: 1, river: '#4fa3d9',
    mountain: '#8b4f1d', desert: '#b06a10', flat: '#4f6b2a', otherRegion: '#3d4a66',
  },
  satellite: {
    satellite: true,
    text: '#ffffff', halo: 'rgba(0,0,0,0.75)',
    water: '#bfe3ff', ocean: '#d6ecff', oceanHalo: 'rgba(0,0,0,0.5)',
    admin1: '#e8e2f0', peak: '#ffe0b3', geoLine: '#ffb199',
    border: '#ffffff', borderOpacity: 0.6, river: '#7cc4ff',
    mountain: '#ffd2a6', desert: '#ffe08a', flat: '#d8f0b0', otherRegion: '#e6ecff',
  },
};

const FONT = {
  regular: ['Noto Sans Regular'],
  medium: ['Noto Sans Medium'],
  italic: ['Noto Sans Italic'],
};

const source = (file) => ({ type: 'geojson', data: `data/${file}.geojson` });
const visibleFrom = (offset = LABEL_BOOST) => ['>=', ['zoom'], ['-', ['get', 'minz'], offset]];
const koName = ['get', 'ko'];

function buildStyle(view) {
  const t = THEMES[view];
  const shown = (on) => (on ? 'visible' : 'none');
  const labelPaint = (color = t.text, haloWidth = 1.5) => ({
    'text-color': color,
    'text-halo-color': t.halo,
    'text-halo-width': haloWidth,
  });

  return {
    version: 8,
    projection: { type: 'globe' },
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
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
    },
    layers: [
      // ---------- 바탕: 바다 · 땅 · 물 ----------
      { id: 'ocean', type: 'background', paint: { 'background-color': OCEAN_COLOR } },
      { id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: shown(t.satellite) } },
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
          'line-color': ['match', ['get', 'en'], 'Equator', '#e04848', 'International Date Line', '#7a5ccf', '#e08a3c'],
          'line-width': 1.4,
          'line-dasharray': [4, 3],
        },
      },

      // ---------- 지명 (아래쪽 레이어일수록 겹칠 때 먼저 가려짐) ----------
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
      {
        id: 'ocean-label', type: 'symbol', source: 'marineLabels',
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
        },
        paint: {
          'text-color': '#ffffff', 'text-halo-color': 'rgba(29, 36, 51, 0.7)', 'text-halo-width': 2,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 1, 3, 0],
        },
      },
    ],
  };
}

// ---------- 아이콘 (캔버스로 직접 그림, 2배 해상도) ----------
function drawIcon(size, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  return ctx.getImageData(0, 0, size, size);
}

const ICONS = {
  capital: () => drawIcon(32, (ctx, s) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? s * 0.46 : s * 0.2;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      ctx.lineTo(s / 2 + r * Math.cos(a), s / 2 + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = '#e03a3a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
  }),
  'admin1-capital': () => drawIcon(18, (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#1d2433';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
  }),
  city: () => drawIcon(14, (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1d2433';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fill();
  }),
  peak: () => drawIcon(22, (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s / 2, 2);
    ctx.lineTo(s - 2, s - 3);
    ctx.lineTo(2, s - 3);
    ctx.closePath();
    ctx.fillStyle = '#8b4f1d';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fill();
  }),
};

// ---------- 보기 방식 기억 (저장 안 되는 환경이면 그림 지도로 시작) ----------
const VIEW_KEY = 'globe-view';
function loadView() {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    return saved in THEMES ? saved : 'map';
  } catch {
    return 'map';
  }
}
function saveView(view) {
  try { localStorage.setItem(VIEW_KEY, view); } catch { /* 저장 못 해도 동작에는 지장 없음 */ }
}

// ---------- 지도 생성 ----------
let currentView = loadView();

const map = new maplibregl.Map({
  container: 'map',
  style: buildStyle(currentView),
  center: [127.5, 36],
  zoom: 1.6,
  maxZoom: 10,
  // 한글은 서버 글꼴 대신 컴퓨터에 깔린 한글 글꼴로 그림
  localIdeographFontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
  attributionControl: { customAttribution: 'Natural Earth' },
});

map.on('styleimagemissing', (e) => {
  const make = ICONS[e.id];
  if (make && !map.hasImage(e.id)) map.addImage(e.id, make(), { pixelRatio: 2 });
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.addControl(new maplibregl.GlobeControl(), 'top-right');

const zoomEl = document.getElementById('zoom');
const showZoom = () => { zoomEl.textContent = map.getZoom().toFixed(1); };
map.on('zoom', showZoom);
map.on('load', showZoom);

// ---------- 그림 지도 / 위성 지도 전환 ----------
const viewButtons = document.querySelectorAll('[data-view]');
function markView() {
  viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === currentView)));
}
viewButtons.forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.view === currentView) return;
  currentView = b.dataset.view;
  map.setStyle(buildStyle(currentView)); // 바뀐 색·레이어만 골라서 적용됨
  saveView(currentView);
  markView();
}));
markView();
