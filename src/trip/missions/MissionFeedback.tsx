import { useEffect, useId, useRef } from 'react';

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
  const nextRef = useRef<HTMLButtonElement>(null);
  // '다음' 버튼으로 초점이 오면 화면 읽기 프로그램은 버튼 이름만 읽으므로, 결과 문장들을 버튼 설명으로 묶어 함께 읽게 한다
  const id = useId();
  const titleId = `${id}-title`;
  const detailId = `${id}-detail`;
  const explainId = `${id}-explain`;
  const starsId = `${id}-stars`;
  const describedBy = [titleId, stars !== undefined && starsId, detail && detailId, explain && explainId]
    .filter(Boolean)
    .join(' ');

  // 결과가 나오면 '다음' 버튼이 패널 아래에 숨지 않게 보이는 곳까지 스크롤하고 초점을 옮긴다
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nextRef.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    nextRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={`feedback ${correct ? 'feedback--good' : 'feedback--again'}`} role="status">
      <p id={titleId} className="feedback__title">{correct ? '잘했어요!' : '괜찮아요, 같이 알아봐요'}</p>
      {stars !== undefined && (
        <p id={starsId} className="feedback__stars">
          <span aria-hidden="true">
            {'★'.repeat(stars)}
            {'☆'.repeat(3 - stars)}
          </span>
          <span className="visually-hidden">별 {stars}개</span>
        </p>
      )}
      {detail && <p id={detailId}>{detail}</p>}
      {explain && <p id={explainId}>{explain}</p>}
      <button ref={nextRef} type="button" className="big-button" aria-describedby={describedBy} onClick={onNext}>
        다음
      </button>
    </div>
  );
}
