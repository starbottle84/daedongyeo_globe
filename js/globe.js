// Natural Earth 데이터로 그린 한국어 지구본
// 지명은 Natural Earth가 정한 "보이기 시작하는 확대 단계(minz)"보다 LABEL_BOOST만큼 일찍 보여준다.
const LABEL_BOOST = 1;

const COLORS = {
  ocean: '#9fd3f0',
  land: ['#f6d58e', '#b8e0a0', '#f5b5a0', '#c9b8e8', '#a8d8c8', '#f2c6de', '#e8dca0'],
  border: '#5b6270',
  river: '#4fa3d9',
  water: '#2f6f9f',
  text: '#1d2433',
  halo: '#ffffff',
};

const FONT = {
  regular: ['Noto Sans Regular'],
  medium: ['Noto Sans Medium'],
  italic: ['Noto Sans Italic'],
};

const source = (file) => ({ type: 'geojson', data: `data/${file}.geojson` });
const visibleFrom = (offset = LABEL_BOOST) => ['>=', ['zoom'], ['-', ['get', 'minz'], offset]];
const koName = ['get', 'ko'];

const labelPaint = (color = COLORS.text, haloWidth = 1.5) => ({
  'text-color': color,
  'text-halo-color': COLORS.halo,
  'text-halo-width': haloWidth,
});

const style = {
  version: 8,
  projection: { type: 'globe' },
  glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
  sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] },
  sources: {
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
    { id: 'ocean', type: 'background', paint: { 'background-color': COLORS.ocean } },
    {
      id: 'country-fill', type: 'fill', source: 'countries',
      paint: {
        'fill-color': ['match', ['get', 'color'],
          1, COLORS.land[0], 2, COLORS.land[1], 3, COLORS.land[2], 4, COLORS.land[3],
          5, COLORS.land[4], 6, COLORS.land[5], COLORS.land[6]],
      },
    },
    { id: 'lake-fill', type: 'fill', source: 'lakes', paint: { 'fill-color': COLORS.ocean } },
    {
      id: 'river-line', type: 'line', source: 'rivers', filter: visibleFrom(),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': COLORS.river,
        'line-width': ['interpolate', ['linear'], ['zoom'],
          2, ['-', 1.6, ['*', ['get', 'rank'], 0.12]],
          8, ['-', 3.2, ['*', ['get', 'rank'], 0.2]]],
      },
    },

    // ---------- 경계선 ----------
    {
      id: 'admin1-line', type: 'line', source: 'admin1Lines', minzoom: 3, filter: visibleFrom(1.5),
      paint: { 'line-color': COLORS.border, 'line-opacity': 0.45, 'line-width': 0.8, 'line-dasharray': [3, 2] },
    },
    {
      id: 'country-line', type: 'line', source: 'countries',
      paint: {
        'line-color': COLORS.border,
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
      paint: labelPaint('#b5482f'),
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
      paint: labelPaint('#7a4b1e'),
    },
    {
      id: 'admin1-label', type: 'symbol', source: 'admin1Labels', filter: visibleFrom(),
      layout: {
        'text-field': koName, 'text-font': FONT.regular,
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 8, 13],
        'text-letter-spacing': 0.05, 'text-max-width': 6,
        'symbol-sort-key': ['get', 'rank'],
      },
      paint: labelPaint('#6a5f73', 1.2),
    },
    {
      id: 'river-label', type: 'symbol', source: 'rivers',
      filter: ['all', ['!=', koName, ''], ['>=', ['zoom'], ['-', ['get', 'labelz'], LABEL_BOOST]]],
      layout: {
        'symbol-placement': 'line', 'symbol-spacing': 400,
        'text-field': koName, 'text-font': FONT.italic, 'text-size': 12,
      },
      paint: labelPaint(COLORS.water),
    },
    {
      id: 'lake-label', type: 'symbol', source: 'lakeLabels', filter: visibleFrom(),
      layout: {
        'text-field': koName, 'text-font': FONT.italic, 'text-size': 11, 'text-max-width': 6,
        'symbol-sort-key': ['get', 'rank'],
      },
      paint: labelPaint(COLORS.water, 1),
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
        'range/mtn', '#8b4f1d',
        'desert', '#b06a10',
        ['plateau', 'plain', 'basin', 'lowland', 'valley', 'foothills', 'tundra', 'wetlands', 'delta'], '#4f6b2a',
        '#3d4a66'], 1.2),
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
      paint: labelPaint(COLORS.water, 1),
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
      paint: labelPaint(COLORS.text, 2),
    },
    {
      id: 'ocean-label', type: 'symbol', source: 'marineLabels',
      filter: ['==', ['get', 'cls'], 'ocean'],
      layout: {
        'text-field': koName, 'text-font': FONT.italic,
        'text-size': ['interpolate', ['linear'], ['zoom'], 1, 16, 5, 24],
        'text-letter-spacing': 0.4,
      },
      paint: { 'text-color': '#2a6496', 'text-halo-color': 'rgba(255,255,255,0.6)', 'text-halo-width': 1 },
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

// ---------- 지도 생성 ----------
const map = new maplibregl.Map({
  container: 'map',
  style,
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
