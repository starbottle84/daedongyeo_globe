import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { buildStyle } from './buildStyle';
import { ICONS } from './icons';
import { createGlobeHandle, type GlobeHandle } from './globeHandle';
import { installEdgeGuard, type EdgeGuard } from './edgeGuard';
import type { MapView } from './themes';

// MapLibre 6은 지도 계산용 일꾼(worker) 파일 주소를 번들러(Vite)가 알려 줘야 한다. 빌드 때 일꾼도 함께 묶여 미리 저장(PWA) 목록에 들어간다
maplibregl.setWorkerUrl(workerUrl);

declare global {
  interface Window {
    // 개발 중 브라우저 콘솔에서 지도를 점검하기 위한 연결 (배포 빌드에는 없음)
    __map?: maplibregl.Map;
  }
}

interface GlobeViewProps {
  view: MapView;
  onSatelliteError: () => void;
  /** 지도가 준비되면 여행 화면용 손잡이를 건네준다 */
  onReady: (handle: GlobeHandle) => void;
}

export function GlobeView({ view, onSatelliteError, onReady }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const guardRef = useRef<EdgeGuard | null>(null);
  const appliedView = useRef(view);
  const callbacks = useRef({ onSatelliteError, onReady });

  useEffect(() => {
    callbacks.current = { onSatelliteError, onReady };
  }, [onSatelliteError, onReady]);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: buildStyle(appliedView.current),
      center: [127.5, 36],
      zoom: 1.6,
      maxZoom: 10,
      // 한글은 서버 글꼴 대신 기기에 깔린 한글 글꼴로 그린다
      localIdeographFontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      // 지도 출처는 오른쪽 아래에 두면 시작 카드 모서리에 겹치므로 왼쪽 위(로고 아래)에 단다 — 모양은 global.css
      attributionControl: false,
      locale: { 'AttributionControl.ToggleAttribution': '지도 출처 보기' },
    });
    map.addControl(new maplibregl.AttributionControl({ customAttribution: 'Natural Earth' }), 'top-left');
    // 폭 640px 이하에서는 MapLibre가 출처를 펼친 채로 시작해 지구본 가장자리를 덮으므로, 처음에는 접힌 'i'로 둔다 (누르면 펼쳐짐).
    // 넓은 화면에서 좁아질 때(가로→세로로 돌림)도 MapLibre가 다시 펼치므로 그때도 접는다 — 좁은 채로 아이가 직접 펼쳐 둔 것은 그대로 둔다
    const attrib = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
    let attribCompact = false;
    const collapseAttrib = () => {
      const compact = !!attrib?.classList.contains('maplibregl-compact');
      if (compact && !attribCompact) {
        attrib?.classList.remove('maplibregl-compact-show');
        attrib?.removeAttribute('open');
      }
      attribCompact = compact;
    };
    collapseAttrib();
    map.on('resize', collapseAttrib); // 출처 컨트롤이 먼저 단 'resize' 처리기(접기/펼치기 바꿈) 다음에 돈다

    // 스타일이 쓰는 아이콘(도시 점·별표·봉우리 등)은 처음 필요할 때 그려 넣는다
    map.setMissingStyleImageResolver((id) => {
      const make = ICONS[id];
      if (make && !map.hasImage(id)) map.addImage(id, make(), { pixelRatio: 2 });
    });
    // 'error' 듣는 쪽이 생기면 MapLibre가 콘솔에 오류를 남기지 않으므로 위성 외 오류는 직접 남긴다
    map.on('error', (e) => {
      if ('sourceId' in e && e.sourceId === 'satellite') callbacks.current.onSatelliteError();
      else console.error(e.error);
    });
    // 지구본 전체가 작게 보일 때 둘레에 걸치는 지명을 막는다 (edgeGuard.ts)
    guardRef.current = installEdgeGuard(map);
    // 여행 손잡이는 스타일(층)이 준비되자마자 만든다. 'load'는 위성 타일을 다 받을 때까지 기다려 여행 시작이 늦어진다.
    // ('style.load'는 처음 넘긴 스타일에도 오고, 언제나 'load'보다 먼저 온다)
    const giveHandle = () => callbacks.current.onReady(createGlobeHandle(map));
    if (map.isStyleLoaded()) giveHandle();
    else map.once('style.load', giveHandle);

    mapRef.current = map;
    if (import.meta.env.DEV) window.__map = map;
    return () => {
      map.remove();
      mapRef.current = null;
      guardRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedView.current === view) return;
    appliedView.current = view;
    map.setStyle(buildStyle(view)); // 바뀐 색·레이어만 골라서 적용됨
    guardRef.current?.refresh(); // 새 스타일의 빈 울타리로 바뀌었으니 지금 화면에 맞춰 다시 두른다
  }, [view]);

  return <div ref={containerRef} className="globe" />;
}
