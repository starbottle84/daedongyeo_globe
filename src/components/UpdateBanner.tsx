import './UpdateBanner.css';

interface UpdateBannerProps {
  onReload: () => void;
}

export function UpdateBanner({ onReload }: UpdateBannerProps) {
  return (
    <div className="update-banner" role="status">
      <p>새 버전이 나왔어요.</p>
      <button type="button" onClick={onReload}>
        새로 고치기
      </button>
    </div>
  );
}
