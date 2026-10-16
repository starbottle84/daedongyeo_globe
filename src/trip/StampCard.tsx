import type { Place } from '../content/types';

interface StampCardProps {
  place: Place;
  /** 이번 여행에서 모은 별 (고학년 위치 찍기). 없으면 안 보여 준다 */
  stars?: number;
  nextPlace: Place | null;
  onNext: () => void;
}

// 여권 도장 장면. 도장을 저장하고 여권에 모으는 것은 계획 3에서 붙인다.
export function StampCard({ place, stars, nextPlace, onNext }: StampCardProps) {
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  return (
    <div className="stamp">
      <div className="stamp__seal" role="img" aria-label={`${place.name} 도장`}>
        <span className="stamp__place">{place.name}</span>
        <span className="stamp__date">{today}</span>
      </div>
      <p className="stamp__title">{place.name} 도장을 받았어요!</p>
      {stars !== undefined && stars > 0 && <p className="stamp__stars">모은 별 ★ {stars}개</p>}
      {nextPlace && <p className="stamp__next">다음엔 {nextPlace.name}에 가 볼까요?</p>}
      <button type="button" className="big-button" onClick={onNext}>
        계속
      </button>
    </div>
  );
}
