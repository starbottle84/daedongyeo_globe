import type { MapView } from '../globe/themes';
import './InfoCard.css';

const VIEW_LABELS: Record<MapView, string> = { map: '그림 지도', satellite: '위성 지도' };

interface InfoCardProps {
  zoom: number | null;
  view: MapView;
  onViewChange: (view: MapView) => void;
}

export function InfoCard({ zoom, view, onViewChange }: InfoCardProps) {
  return (
    <div className="info-card">
      <h1>대동여퀴즈 지구본</h1>
      <p>확대할수록 더 많은 지명이 보여요</p>
      <p className="info-card__zoom">
        확대 단계 <b>{zoom === null ? '-' : zoom.toFixed(1)}</b>
      </p>
      <div className="info-card__views" role="group" aria-label="지도 보기 방식">
        {(Object.keys(VIEW_LABELS) as MapView[]).map((v) => (
          <button key={v} type="button" aria-pressed={v === view} onClick={() => onViewChange(v)}>
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
