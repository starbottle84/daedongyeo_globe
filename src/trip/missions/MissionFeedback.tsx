interface MissionFeedbackProps {
  correct: boolean;
  /** 정답 안내나 거리처럼 결과에 붙는 한 줄 */
  detail?: string;
  explain?: string;
  /** 위치 찍기에서 받은 별 (1~3) */
  stars?: number;
  onNext: () => void;
}

export function MissionFeedback({ correct, detail, explain, stars, onNext }: MissionFeedbackProps) {
  return (
    <div className={`feedback ${correct ? 'feedback--good' : 'feedback--again'}`} role="status">
      <p className="feedback__title">{correct ? '잘했어요!' : '괜찮아요, 같이 알아봐요'}</p>
      {stars !== undefined && (
        <p className="feedback__stars" aria-label={`별 ${stars}개`}>
          {'★'.repeat(stars)}
          {'☆'.repeat(3 - stars)}
        </p>
      )}
      {detail && <p>{detail}</p>}
      {explain && <p>{explain}</p>}
      <button type="button" className="big-button" onClick={onNext}>
        다음
      </button>
    </div>
  );
}
