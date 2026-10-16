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
}

/** 아래쪽 여행 카드가 차지하는 화면 높이 비율 (대략) */
const PANEL_SHARE = 0.45;
/** 화면 맞추기 때 지점과 화면 가장자리 사이에 남길 여백(px). 핀 이름표(핀 위 약 62px)가 잘리지 않게 잡는다 */
const FIT_MARGIN_PX = 68;
/** MapLibre가 카메라 가운데로 허용하는 최대 위도 */
const MAX_CENTER_LAT = 85.051129;
const MAX_FIT_ZOOM = 7;
const NO_PADDING = { top: 0, right: 0, bottom: 0, left: 0 };

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
  const panelPx = () => Math.round(map.getContainer().clientHeight * PANEL_SHARE);
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

  return {
    flyTo(center, zoom) {
      map.flyTo({ center, zoom, padding: panelPadding(), duration: 3000, essential: true });
    },

    fitTo(points) {
      if (points.length === 0) return;
      const { center, spread } = sphericalSpread(points);
      map.flyTo({ center, zoom: zoomToFit(center, spread), padding: panelPadding(), duration: 2000, essential: true });
    },

    setInteractive,
    setLabelsVisible,

    onTap(listener) {
      const handler = (e: maplibregl.MapMouseEvent) => {
        // 지구본 바깥(우주)을 누르면 MapLibre가 가장자리 지점으로 바꿔 준다.
        // 그 지점을 다시 화면 위치로 바꿨을 때 누른 곳과 다르면 지구본을 누른 것이 아니므로 무시한다.
        const back = map.project(e.lngLat);
        if (Math.hypot(back.x - e.point.x, back.y - e.point.y) > 3) return;
        const hit = map.queryRenderedFeatures(e.point, { layers: ['area-hit'] })[0];
        const ko: unknown = hit?.properties.ko;
        const lat = e.lngLat.lat;
        // 지도 타일은 위도 ±85.05°까지만 있어서 극지방 끝에는 영역 층이 없다 → 남극·북극해로 본다
        const area = typeof ko === 'string' ? ko : lat <= -85.05 ? '남극' : lat >= 85.05 ? '북극해' : null;
        listener({ at: [e.lngLat.lng, lat], area });
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
      // 지도가 이미 지워졌으면(개발 중 새로고침·화면 정리) 되돌릴 것이 없다
      if (!map.getStyle()) return;
      setInteractive(true);
      setLabelsVisible(true);
      clearMarkers();
      map.easeTo({ padding: NO_PADDING, duration: 600 });
    },
  };
}
