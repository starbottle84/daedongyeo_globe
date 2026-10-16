import maplibregl from 'maplibre-gl';
import type { LngLat } from '../content/types';
import type { TapInfo } from '../trip/judge';
import './markers.css';

export type MarkerKind = 'answer' | 'hint' | 'pin' | 'from' | 'to';

// 여행 화면이 MapLibre를 직접 만지지 않도록, 필요한 동작만 모은 손잡이
export interface GlobeHandle {
  /** 아래쪽 여행 카드에 가려지지 않게 살짝 위로 올려서 날아간다 */
  flyTo(center: LngLat, zoom: number): void;
  /** 여러 지점이 다 보이게 화면을 맞춘다 */
  fitTo(points: LngLat[]): void;
  /** 손으로 돌리기·확대를 켜고 끈다 (유아 여행 중에는 끈다). 누르기는 언제나 된다 */
  setInteractive(on: boolean): void;
  /** 지명을 모두 숨기거나 다시 보여 준다 (위치 찍기 미션용) */
  setLabelsVisible(on: boolean): void;
  /** 지구본을 누를 때마다 알려 준다. 돌려준 함수를 부르면 그만 듣는다 */
  onTap(listener: (tap: TapInfo) => void): () => void;
  /** 같은 종류의 표시는 하나만 남긴다. 이름표 글자는 textContent로만 넣는다 */
  showMarker(kind: MarkerKind, at: LngLat, label?: string): void;
  clearMarkers(): void;
}

/** 아래쪽 여행 카드가 차지하는 화면 높이 비율 (대략) */
const PANEL_SHARE = 0.45;

export function createGlobeHandle(map: maplibregl.Map): GlobeHandle {
  const markers = new Map<MarkerKind, maplibregl.Marker>();
  const panelPx = () => Math.round(map.getContainer().clientHeight * PANEL_SHARE);

  return {
    flyTo(center, zoom) {
      map.flyTo({ center, zoom, offset: [0, -Math.round(panelPx() / 2)], duration: 3000, essential: true });
    },

    fitTo(points) {
      if (points.length === 0) return;
      const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
      for (const p of points) bounds.extend(p);
      map.fitBounds(bounds, {
        padding: { top: 90, left: 60, right: 60, bottom: panelPx() + 30 },
        maxZoom: 7,
        duration: 2000,
      });
    },

    setInteractive(on) {
      if (on) {
        map.dragPan.enable();
        map.dragRotate.enable();
        map.scrollZoom.enable();
        map.touchZoomRotate.enable();
        map.doubleClickZoom.enable();
        map.keyboard.enable();
      } else {
        map.dragPan.disable();
        map.dragRotate.disable();
        map.scrollZoom.disable();
        map.touchZoomRotate.disable();
        map.doubleClickZoom.disable();
        map.keyboard.disable();
      }
    },

    setLabelsVisible(on) {
      for (const layer of map.getStyle().layers) {
        if (layer.type === 'symbol') map.setLayoutProperty(layer.id, 'visibility', on ? 'visible' : 'none');
      }
    },

    onTap(listener) {
      const handler = (e: maplibregl.MapMouseEvent) => {
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

    clearMarkers() {
      markers.forEach((marker) => marker.remove());
      markers.clear();
    },
  };
}
