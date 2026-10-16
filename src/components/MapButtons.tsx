import { useEffect, useRef, useState } from 'react';
import type { GlobeHandle } from '../globe/globeHandle';
import type { MapView } from '../globe/themes';
import { Icon } from '../ui/Icon';
import './MapButtons.css';

interface MapButtonsProps {
  globe: GlobeHandle;
  view: MapView;
  onViewChange: (view: MapView) => void;
}

// 오른쪽 위 지도 버튼. 여행 중에는 App이 그리지 않는다.
export function MapButtons({ globe, view, onViewChange }: MapButtonsProps) {
  const [projection, setProjection] = useState<'globe' | 'mercator'>('globe');
  const [tilted, setTilted] = useState(false);
  const projectionButton = useRef<HTMLButtonElement>(null);

  // 투영은 지도에서 직접 듣는다. 여행이 끝나 restore()가 되돌릴 때도, 그림/위성 지도를 바꿔
  // 새 스타일에 적힌 투영(지구본)이 다시 들어갈 때도 버튼 이름이 실제 투영과 맞는다.
  useEffect(() => {
    const offProjection = globe.onProjectionChange(setProjection);
    const offCamera = globe.onCameraChange(({ bearing, pitch }) => setTilted(Math.abs(bearing) > 1 || pitch > 1));
    return () => {
      offProjection();
      offCamera();
    };
  }, [globe]);

  const toggleProjection = () => globe.setProjection(projection === 'globe' ? 'mercator' : 'globe');
  // 북쪽 버튼은 바로 세우면 사라지므로, 키보드 초점이 문서 처음으로 떨어지지 않게 투영 버튼으로 옮긴다
  const resetNorth = () => {
    globe.resetNorth();
    projectionButton.current?.focus();
  };
  const satellite = view === 'satellite';

  return (
    <nav className="tools" aria-label="지도 조작">
      <button
        type="button"
        className="tool tool--labeled"
        aria-label={satellite ? '그림 지도로 보기' : '위성 지도로 보기'}
        onClick={() => onViewChange(satellite ? 'map' : 'satellite')}
      >
        <Icon name={satellite ? 'map' : 'sat'} />
        <span className="tool__caption" aria-hidden="true">{satellite ? '그림' : '위성'}</span>
      </button>
      <div className="zoom">
        <button type="button" aria-label="크게 보기" onClick={() => globe.zoomBy(1)}>
          <Icon name="plus" />
        </button>
        <hr aria-hidden="true" />
        <button type="button" aria-label="작게 보기" onClick={() => globe.zoomBy(-1)}>
          <Icon name="minus" />
        </button>
      </div>
      <button
        ref={projectionButton}
        type="button"
        className="tool"
        aria-label={projection === 'globe' ? '평면 지도로 보기' : '지구본으로 보기'}
        onClick={toggleProjection}
      >
        <Icon name="globe" />
      </button>
      {tilted && (
        <button type="button" className="tool tool--north" aria-label="북쪽을 위로" onClick={resetNorth}>
          <Icon name="north" />
        </button>
      )}
    </nav>
  );
}
