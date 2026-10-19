import type * as maplibregl from 'maplibre-gl';
import { OVERVIEW_MAX_ZOOM } from './buildStyle';

// 지구본 둘레 울타리.
// MapLibre는 지명을 화면에 반듯하게 세워 그려서, 이름 자리 점이 지구본 가장자리 가까이 있으면 글자가 둘레를 넘어 하늘로 나간다.
// 게다가 지명을 다 그린 뒤에 둘레의 흰 빛(대기)을 덧그려서, 넘어간 글자 일부가 흐려져 이웃 지명과 겹친 것처럼 보인다
// (아이패드 세로 첫 화면의 독일·스웨덴, 사우디아라비아·아라비아반도, 하늘로 반쯤 나간 아이슬란드·배핀만).
// 그래서 둘레 바로 안쪽에 보이지 않는 칸(맨 위 기호 층 'edge-guard')을 촘촘히 둘러, 둘레에 걸치는 지명이 자리를 못 잡게 한다
// (도시·수도는 이름을 다른 쪽에 놓아 볼 수 있다).
// 지구본 전체를 작게 보는 넓은 화면(확대 OVERVIEW_MAX_ZOOM 아래)에서만 두른다 — 지명 수 기준 장면(1280×800, 확대 1.6)에서 두르면
// 둘레에 걸친 이름 14개가 빠져 35개가 기준(33)보다 적은 21개가 된다.
// 칸은 지도 위 지점에 붙으므로, 움직이는 동안에는 걷고(화면을 따라가지 못해 엉뚱한 지명을 막는다) 멈추면 그때 둘레에 다시 두른다.

const SOURCE_ID = 'edgeGuard';
/** 칸 가운데를 둘레에서 안쪽으로 들이는 거리(px). 칸(12px, icons.ts의 'edge-guard')이 둘레 안쪽 약 10px까지 덮어 흰 빛에 흐려지는 글자도 막는다 */
const GUARD_INSET_PX = 4;
/** 둘레를 따라 놓는 칸 사이 간격(px). 칸 크기보다 작아야 틈이 없다 */
const GUARD_STEP_PX = 6;
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export interface EdgeGuard {
  /** 지금 화면에 맞춰 다시 두른다 (그림/위성 바꾸기로 새 스타일의 빈 울타리가 들어왔을 때) */
  refresh(): void;
}

export function installEdgeGuard(map: maplibregl.Map): EdgeGuard {
  let fenced = false;
  const setFence = (data: GeoJSON.FeatureCollection) => {
    const source = map.getSource<maplibregl.GeoJSONSource>(SOURCE_ID);
    if (!source) return;
    void source.setData(data);
    fenced = data.features.length > 0;
  };

  // 지구본 밖(하늘)의 화면 위치는 지도 지점으로 바꾸면 가장자리 지점이 되어, 다시 화면 위치로 바꿔도 제자리로 오지 않는다 (onTap과 같은 판단)
  const onGlobe = (x: number, y: number) => {
    const back = map.project(map.unproject([x, y]));
    return Math.hypot(back.x - x, back.y - y) <= 1;
  };
  // 화면 위 (x, y)에서 (dx, dy) 방향으로 지구본 둘레까지의 거리(px) — 지구본 위인 곳과 밖인 곳 사이를 반씩 좁혀 찾는다
  const edgeDistance = (x: number, y: number, dx: number, dy: number, far: number) => {
    let inside = 0;
    let outside = far;
    while (outside - inside > 0.5) {
      const mid = (inside + outside) / 2;
      if (onGlobe(x + dx * mid, y + dy * mid)) inside = mid;
      else outside = mid;
    }
    return inside;
  };

  const fence = () => {
    if (map.getZoom() >= OVERVIEW_MAX_ZOOM || map.getProjection()?.type !== 'globe') {
      if (fenced) setFence(EMPTY);
      return;
    }
    // 화면 가운데 지점(여백을 뺀 보이는 영역의 가운데)은 언제나 지구본 위에 있다. 거기서 사방으로 둘레를 찾는다
    const { x, y } = map.project(map.getCenter());
    const container = map.getContainer();
    const far = Math.hypot(container.clientWidth, container.clientHeight);
    const count = Math.max(16, Math.ceil((2 * Math.PI * edgeDistance(x, y, 1, 0, far)) / GUARD_STEP_PX));
    const features: GeoJSON.Feature[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const r = edgeDistance(x, y, dx, dy, far) - GUARD_INSET_PX;
      const at = map.unproject([x + dx * r, y + dy * r]);
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [at.lng, at.lat] }, properties: {} });
    }
    setFence({ type: 'FeatureCollection', features });
  };

  map.on('movestart', () => {
    if (fenced) setFence(EMPTY);
  });
  map.on('moveend', fence);
  // 처음 스타일과 통째로 다시 불러온 스타일(setStyle diff:false)은 빈 울타리로 시작한다
  map.on('style.load', fence);
  return { refresh: fence };
}
