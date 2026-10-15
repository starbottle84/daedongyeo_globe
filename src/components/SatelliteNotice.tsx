import './SatelliteNotice.css';

interface SatelliteNoticeProps {
  onUseMap: () => void;
}

// 위성 사진(NASA GIBS)을 못 불러올 때 그림 지도로 바꾸도록 안내한다. 그림 지도는 기기 안 데이터로 동작한다.
export function SatelliteNotice({ onUseMap }: SatelliteNoticeProps) {
  return (
    <div className="satellite-notice" role="status">
      <p>위성 사진을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>
      <button type="button" onClick={onUseMap}>그림 지도로 보기</button>
    </div>
  );
}
