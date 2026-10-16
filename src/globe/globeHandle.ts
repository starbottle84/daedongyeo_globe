import maplibregl from 'maplibre-gl';
import type { LngLat } from '../content/types';
import type { TapInfo } from '../trip/judge';
import './markers.css';

export type MarkerKind = 'answer' | 'hint' | 'pin' | 'from' | 'to';

// 여행 화면이 MapLibre를 직접 만지지 않도록, 필요한 동작만 모은 손잡이
export interface GlobeHandle {
  /** 아래쪽 여행 카드에 가려지지 않는 위쪽 영역 한가운데로 날아간다 */
  flyTo(center: LngLat, zoom: number): void;
  /** 여러 지점이 다 보이게 화면을 맞춘다 (날짜변경선을 넘거나 아주 먼 지점도 지구본 기준으로 계산) */
  fitTo(points: LngLat[]): void;
  /** 손으로 돌리기·확대를 켜고 끈다 (유아 여행 중에는 끈다). 누르기는 언제나 된다 */
  setInteractive(on: boolean): void;
  /** 지명을 모두 숨기거나 다시 보여 준다 (위치 찍기 미션용) */
  setLabelsVisible(on: boolean): void;
  /** 지구본을 누를 때마다 알려 준다. 지구본 바깥(우주)을 누른 것은 무시한다. 돌려준 함수를 부르면 그만 듣는다 */
  onTap(listener: (tap: TapInfo) => void): () => void;
  /** 같은 종류의 표시는 하나만 남긴다. 이름표 글자는 textContent로만 넣는다 */
  showMarker(kind: MarkerKind, at: LngLat, label?: string): void;
  clearMarkers(): void;
  /** 여행이 끝나면 지구본을 평소 상태로 되돌린다 (여백·손 조작·표시·지명) */
  restore(): void;
  /** 확대(+)·축소(−) 한 단계 */
  zoomBy(delta: number): void;
  /** 북쪽을 위로, 기울기 0으로 */
  resetNorth(): void;
  getProjection(): 'globe' | 'mercator';
  setProjection(type: 'globe' | 'mercator'): void;
  /** 투영이 바뀔 때 알려 준다 (버튼, 여행 끝 restore, 그림/위성 바꾸기 모두). 듣기 시작할 때 지금 값도 한 번 알려 준다 */
  onProjectionChange(listener: (type: 'globe' | 'mercator') => void): () => void;
  /** 돌림·기울기가 바뀔 때 알려 준다 (북쪽 버튼을 보일지 정하는 데 쓴다) */
  onCameraChange(listener: (cam: { bearing: number; pitch: number }) => void): () => void;
}

/** 아래쪽 카드 묶음(.bottom-stack)을 찾지 못했을 때 쓰는, 카드가 차지하는 화면 높이 비율 (대략) */
const PANEL_SHARE = 0.45;
/** 카드 위쪽 끝과 지도 사이에 남길 틈(px) */
const PANEL_GAP_PX = 12;
/** 카드 여백이 화면 높이의 이 비율을 넘지 않게 한다 */
const MAX_PANEL_SHARE = 0.7;
/** 화면 맞추기 때 지점과 화면 가장자리 사이에 남길 여백(px). 핀 이름표(핀 위 약 62px)가 잘리지 않게 잡는다 */
const FIT_MARGIN_PX = 68;
/** MapLibre가 카메라 가운데로 허용하는 최대 위도 */
const MAX_CENTER_LAT = 85.051129;
const MAX_FIT_ZOOM = 7;
const NO_PADDING = { top: 0, right: 0, bottom: 0, left: 0 };

// 기기에서 '움직임 줄이기'를 켰으면 날아가지 않고 바로 옮긴다 (essential: true는 이 설정을 무시하므로 직접 본다)
const flightMs = (ms: number) => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : ms);

type Vec3 = [number, number, number];
const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const toVec = ([lng, lat]: LngLat): Vec3 => [
  Math.cos(rad(lat)) * Math.cos(rad(lng)),
  Math.cos(rad(lat)) * Math.sin(rad(lng)),
  Math.sin(rad(lat)),
];
const angleBetween = (a: Vec3, b: Vec3) => Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));

// 지구 표면 위에서 여러 지점의 가운데와, 가운데에서 가장 먼 지점까지의 각도(라디안).
// 경도 최솟값·최댓값이 아니라 3차원 방향으로 계산해서 날짜변경선을 넘어도 맞다.
// 가운데는 MapLibre가 허용하는 위도(±85.05°) 안으로 당기고, 각도도 당긴 가운데 기준으로 다시 잰다.
// (지점은 2개를 넘겨 쓰는 곳이 없다. 3개 이상이면 평균 방향이 가운데라서 멀리 떨어진 한 점이 있으면 덜 정확하다.)
function sphericalSpread(points: LngLat[]): { center: LngLat; spread: number } {
  const vecs = points.map(toVec);
  const sum = vecs.reduce<Vec3>((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);
  const len = Math.hypot(sum[0], sum[1], sum[2]);
  const c: Vec3 = len < 1e-9 ? vecs[0] : [sum[0] / len, sum[1] / len, sum[2] / len];
  const lat = Math.max(-MAX_CENTER_LAT, Math.min(MAX_CENTER_LAT, deg(Math.asin(c[2]))));
  const center: LngLat = [deg(Math.atan2(c[1], c[0])), lat];
  const clamped = toVec(center);
  const spread = Math.max(...vecs.map((v) => angleBetween(clamped, v)));
  return { center, spread };
}

export function createGlobeHandle(map: maplibregl.Map): GlobeHandle {
  const markers = new Map<MarkerKind, maplibregl.Marker>();
  // 아래쪽 카드에 가려지는 높이(px). 카드 묶음 높이는 단계마다 달라서 어림값(45%)으로는 지점이 카드 밑에 숨곤 한다.
  // 그래서 일부러 앱의 아래쪽 카드 묶음(.bottom-stack) 요소를 직접 읽어, 지도 아래 끝 ~ 카드 위쪽 끝 + 틈만큼 비운다.
  const panelPx = () => {
    const container = map.getContainer();
    const stack = document.querySelector('.bottom-stack');
    if (!stack) return Math.round(container.clientHeight * PANEL_SHARE);
    const covered = container.getBoundingClientRect().bottom - stack.getBoundingClientRect().top + PANEL_GAP_PX;
    return Math.round(Math.min(Math.max(covered, 0), container.clientHeight * MAX_PANEL_SHARE));
  };
  // 카메라 여백: 아래쪽 카드 높이만큼 비워 두면 가운데가 카드 위쪽 영역의 한가운데가 된다
  const panelPadding = () => ({ top: 0, right: 0, bottom: panelPx(), left: 0 });

  // 지점들이 지구본 위쪽 보이는 영역 안에 다 들어오는 확대 단계.
  // MapLibre 지구본 반지름(px) = 512·2^zoom / (2π) / cos(가운데 위도). 가운데에서 각도 θ인 점은 반지름·sinθ 만큼 떨어져 보인다.
  const zoomToFit = (center: LngLat, spread: number) => {
    const container = map.getContainer();
    const visibleHalf = Math.min(container.clientWidth, container.clientHeight - panelPx()) / 2 - FIT_MARGIN_PX;
    const reach = Math.sin(Math.min(spread, Math.PI / 2));
    if (reach < 1e-6) return MAX_FIT_ZOOM;
    const radiusPx = Math.max(visibleHalf, 40) / reach;
    const zoom = Math.log2((radiusPx * 2 * Math.PI * Math.cos(rad(center[1]))) / 512);
    return Math.min(MAX_FIT_ZOOM, Math.max(map.getMinZoom(), zoom));
  };

  const setInteractive = (on: boolean) => {
    if (on) {
      map.dragPan.enable();
      map.dragRotate.enable();
      map.scrollZoom.enable();
      map.touchZoomRotate.enable();
      map.doubleClickZoom.enable();
      map.keyboard.enable();
      map.touchPitch.enable();
    } else {
      map.dragPan.disable();
      map.dragRotate.disable();
      map.scrollZoom.disable();
      map.touchZoomRotate.disable();
      map.doubleClickZoom.disable();
      map.keyboard.disable();
      map.touchPitch.disable();
    }
  };

  let labelsHidden = false;
  // 바뀌어야 할 층만 건드린다 (같은 값을 다시 넣으면 styledata가 또 와서 계속 돌 수 있다)
  const applyLabels = () => {
    const style = map.getStyle();
    if (!style) return;
    const want = labelsHidden ? 'none' : 'visible';
    for (const layer of style.layers) {
      if (layer.type !== 'symbol') continue;
      if ((map.getLayoutProperty(layer.id, 'visibility') ?? 'visible') !== want) {
        map.setLayoutProperty(layer.id, 'visibility', want);
      }
    }
  };
  const setLabelsVisible = (on: boolean) => {
    labelsHidden = !on;
    applyLabels();
  };
  // 그림/위성 지도를 바꾸면 스타일이 다시 적용되면서 숨긴 지명이 되살아나므로, 숨김 상태면 다시 숨긴다.
  map.on('styledata', () => {
    if (labelsHidden) applyLabels();
  });

  const clearMarkers = () => {
    markers.forEach((marker) => marker.remove());
    markers.clear();
  };

  // 처음 화면에서 지구본/평면 전환 버튼으로 평면 지도로 바꿔 두었으면 여행 내내 평면으로 남는데,
  // 화면 맞추기 계산(zoomToFit)은 지구본 기준이라 지점이 화면 밖이나 카드 밑으로 간다 → 움직이기 전에 지구본으로 되돌린다.
  // 여행이 끝나면 restore()가 원래 투영(평면 등)으로 되돌릴 수 있게 바꾸기 전 값을 기억한다.
  let projectionBeforeTrip: NonNullable<ReturnType<maplibregl.Map['getProjection']>> | null = null;
  const ensureGlobe = () => {
    const current = map.getProjection();
    if (current?.type === 'globe') return;
    if (current && !projectionBeforeTrip) projectionBeforeTrip = current;
    map.setProjection({ type: 'globe' });
  };
  const projectionType = (): 'globe' | 'mercator' => (map.getProjection()?.type === 'mercator' ? 'mercator' : 'globe');

  return {
    // 방향 미션은 북쪽이 위라고 보고 내므로, 날아갈 때 돌리거나 기울인 화면을 바로 세운다(bearing·pitch 0)
    flyTo(center, zoom) {
      ensureGlobe();
      map.flyTo({
        center,
        zoom,
        bearing: 0,
        pitch: 0,
        padding: panelPadding(),
        duration: flightMs(3000),
        essential: true,
      });
    },

    fitTo(points) {
      if (points.length === 0) return;
      ensureGlobe();
      const { center, spread } = sphericalSpread(points);
      map.flyTo({
        center,
        zoom: zoomToFit(center, spread),
        bearing: 0,
        pitch: 0,
        padding: panelPadding(),
        duration: flightMs(2000),
        essential: true,
      });
    },

    setInteractive,
    setLabelsVisible,

    onTap(listener) {
      // 마지막으로 받아 준 누르기 (시각·화면 위치)
      let last: { time: number; x: number; y: number } | null = null;
      const handler = (e: maplibregl.MapMouseEvent) => {
        // 마우스 두 번 누르기는 'click'이 두 번 와서 한 번에 두 번 답한 셈이 되므로, 두 번째부터는 무시한다
        if (((e.originalEvent as MouseEvent | undefined)?.detail ?? 0) > 1) return;
        // 지구본 바깥(우주)을 누르면 MapLibre가 가장자리 지점으로 바꿔 준다.
        // 그 지점을 다시 화면 위치로 바꿨을 때 누른 곳과 다르면 지구본을 누른 것이 아니므로 무시한다.
        const back = map.project(e.lngLat);
        if (Math.hypot(back.x - e.point.x, back.y - e.point.y) > 3) return;
        // 방금 받아 준 누르기와 거의 같은 때(350ms)·같은 곳(24px)이면 손가락이 두 번 닿은 것으로 보고 무시한다
        const now = performance.now();
        if (last && now - last.time < 350 && Math.hypot(e.point.x - last.x, e.point.y - last.y) < 24) return;
        last = { time: now, x: e.point.x, y: e.point.y };
        const hit = map.queryRenderedFeatures(e.point, { layers: ['area-hit'] })[0];
        const ko: unknown = hit?.properties.ko;
        const lat = e.lngLat.lat;
        // 지도 타일은 위도 ±85.05°까지만 있어서 극지방 끝에는 영역 층이 없다 → 남극·북극해로 본다
        const area = typeof ko === 'string' ? ko : lat <= -85.05 ? '남극' : lat >= 85.05 ? '북극해' : null;
        // 영역 층은 처음 내려받는 동안(areas.geojson)과 화면을 옮긴 뒤 새 타일을 만드는 동안 준비가 덜 돼 있다.
        // 그때의 area는 믿을 수 없으므로 함께 알려 주고, 영역이 필요한 미션만 그 누르기를 건너뛴다(핀 꽂기는 그대로 받는다).
        // (isSourceLoaded는 그런 소스가 없으면 오류 이벤트를 내므로, 소스가 있는지부터 본다)
        const areaReady = Boolean(map.getSource('areas')) && map.isSourceLoaded('areas');
        listener({ at: [e.lngLat.lng, lat], area, areaReady });
      };
      map.on('click', handler);
      return () => {
        map.off('click', handler);
      };
    },

    showMarker(kind, at, label) {
      markers.get(kind)?.remove();
      const el = document.createElement('div');
      el.className = `trip-marker trip-marker--${kind}`;
      if (label) {
        const text = document.createElement('span');
        text.className = 'trip-marker__label';
        text.textContent = label;
        el.append(text);
      }
      const marker = new maplibregl.Marker({ element: el, anchor: kind === 'hint' ? 'center' : 'bottom' })
        .setLngLat(at)
        .addTo(map);
      markers.set(kind, marker);
    },

    clearMarkers,

    restore() {
      // 지도가 이미 지워졌으면(개발 중 새로고침·화면 정리) 되돌릴 것이 없다.
      // Map.remove()는 캔버스 묶음을 문서에서 떼어 낸다. getStyle()은 새 스타일을 불러오는 동안에도 비어 있어서 기준으로 쓰지 않는다.
      if (!map.getCanvasContainer().isConnected) return;
      setInteractive(true);
      setLabelsVisible(true);
      clearMarkers();
      map.easeTo({ padding: NO_PADDING, duration: 600 });
      // 여행 전에 평면 지도를 골라 두었으면 그대로 돌려놓는다.
      if (projectionBeforeTrip) {
        map.setProjection(projectionBeforeTrip);
        projectionBeforeTrip = null;
      }
    },

    zoomBy(delta) {
      map.easeTo({ zoom: map.getZoom() + delta, duration: flightMs(300) });
    },
    resetNorth() {
      map.easeTo({ bearing: 0, pitch: 0, duration: flightMs(400) });
    },
    getProjection: projectionType,
    setProjection(type) {
      map.setProjection({ type });
    },
    onProjectionChange(listener) {
      // MapLibre는 setProjection 때도, 스타일을 바꾸며 투영이 달라질 때도 'projectiontransition'을 보낸다
      const handler = () => listener(projectionType());
      map.on('projectiontransition', handler);
      handler();
      return () => {
        map.off('projectiontransition', handler);
      };
    },
    onCameraChange(listener) {
      const handler = () => listener({ bearing: map.getBearing(), pitch: map.getPitch() });
      map.on('rotate', handler);
      map.on('pitch', handler);
      handler();
      return () => {
        map.off('rotate', handler);
        map.off('pitch', handler);
      };
    },
  };
}
