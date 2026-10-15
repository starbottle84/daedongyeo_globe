import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildStyle } from './buildStyle';
import { ICONS } from './icons';
import type { MapView } from './themes';

declare global {
  interface Window {
    // 개발 중 브라우저 콘솔에서 지도를 점검하기 위한 연결 (배포 빌드에는 없음)
    __map?: maplibregl.Map;
  }
}

interface GlobeViewProps {
  view: MapView;
  onZoomChange: (zoom: number) => void;
  onSatelliteError: () => void;
}

export function GlobeView({ view, onZoomChange, onSatelliteError }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const appliedView = useRef(view);
  const callbacks = useRef({ onZoomChange, onSatelliteError });

  useEffect(() => {
    callbacks.current = { onZoomChange, onSatelliteError };
  }, [onZoomChange, onSatelliteError]);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: buildStyle(appliedView.current),
      center: [127.5, 36],
      zoom: 1.6,
      maxZoom: 10,
      // 한글은 서버 글꼴 대신 기기에 깔린 한글 글꼴로 그린다
      localIdeographFontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      attributionControl: { customAttribution: 'Natural Earth' },
    });

    map.on('styleimagemissing', (e) => {
      const make = ICONS[e.id];
      if (make && !map.hasImage(e.id)) map.addImage(e.id, make(), { pixelRatio: 2 });
    });
    // 'error' 듣는 쪽이 생기면 MapLibre가 콘솔에 오류를 남기지 않으므로 위성 외 오류는 직접 남긴다
    map.on('error', (e) => {
      if ('sourceId' in e && e.sourceId === 'satellite') callbacks.current.onSatelliteError();
      else console.error(e.error);
    });
    const reportZoom = () => callbacks.current.onZoomChange(Math.round(map.getZoom() * 10) / 10);
    map.on('zoom', reportZoom);
    map.on('load', reportZoom);

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.GlobeControl(), 'top-right');

    mapRef.current = map;
    if (import.meta.env.DEV) window.__map = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedView.current === view) return;
    appliedView.current = view;
    map.setStyle(buildStyle(view)); // 바뀐 색·레이어만 골라서 적용됨
  }, [view]);

  return <div ref={containerRef} className="globe" />;
}
