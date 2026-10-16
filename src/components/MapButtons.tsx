import { useEffect, useState } from 'react';
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

  // 여행이 끝나면 restore()가 투영을 되돌린 뒤 이 버튼이 다시 그려진다.
  // 효과(useEffect)는 여행 카드의 정리(restore)가 끝난 다음에 돌므로 여기서 읽으면 되돌린 값이다.
  useEffect(() => {
    setProjection(globe.getProjection());
    return globe.onCameraChange(({ bearing, pitch }) => setTilted(Math.abs(bearing) > 1 || pitch > 1));
  }, [globe]);
  // 그림/위성 지도를 바꾸면 새 스타일에 적힌 투영(지구본)이 다시 들어가므로 실제 값을 다시 읽는다.
  // (App에서 GlobeView가 이 버튼보다 앞에 있어서, 스타일을 바꾸는 GlobeView의 효과가 이 효과보다 먼저 돈다)
  useEffect(() => {
    setProjection(globe.getProjection());
  }, [globe, view]);

  const toggleProjection = () => {
    const next = projection === 'globe' ? 'mercator' : 'globe';
    globe.setProjection(next);
    setProjection(next);
  };
  const satellite = view === 'satellite';

  return (
    <nav className="tools" aria-label="지도 조작">
      <button
        type="button"
        className="tool tool--labeled"
        aria-pressed={satellite}
        aria-label={satellite ? '그림 지도로 보기' : '위성 지도로 보기'}
        onClick={() => onViewChange(satellite ? 'map' : 'satellite')}
      >
        <Icon name={satellite ? 'globe' : 'sat'} />
        <span className="tool__caption" aria-hidden="true">{satellite ? '그림' : '위성'}</span>
      </button>
      <div className="zoom">
        <button type="button" aria-label="크게 보기" onClick={() => globe.zoomBy(1)}>
          <Icon name="plus" />
        </button>
        <hr />
        <button type="button" aria-label="작게 보기" onClick={() => globe.zoomBy(-1)}>
          <Icon name="minus" />
        </button>
      </div>
      <button
        type="button"
        className="tool"
        aria-label={projection === 'globe' ? '평면 지도로 보기' : '지구본으로 보기'}
        onClick={toggleProjection}
      >
        <Icon name="globe" />
      </button>
      {tilted && (
        <button type="button" className="tool" aria-label="북쪽을 위로" onClick={() => globe.resetNorth()}>
          <Icon name="north" />
        </button>
      )}
    </nav>
  );
}
