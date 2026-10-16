import { useEffect, useId, useRef } from 'react';
import { Dongle } from '../../ui/Dongle';
import { Icon } from '../../ui/Icon';

interface MissionFeedbackProps {
  correct: boolean;
  /** 정답 보기 (고르기·방향). 칩으로 보여 준다 */
  answer?: { icon?: string; label: string };
  /** 정답 안내나 거리처럼 결과에 붙는 한 줄 */
  detail?: string;
  explain?: string;
  /** 위치 찍기에서 받은 별 (1~3) */
  stars?: number;
  onNext: () => void;
}

// 정답일 때 동글이 둘레로 튀어나오는 색종이 (기준 시안 682–685줄)
const CONFETTI = [
  { left: -6, top: 10, c: '#E9C46A', r: -24, fx: 30, fy: 30, d: 0.05 },
  { left: 84, top: 2, c: '#2E9E5B', r: 28, fx: -30, fy: 30, d: 0.12 },
  { left: -4, top: 70, c: '#7CCBF0', r: 60, fx: 30, fy: -20, d: 0.18 },
  { left: 90, top: 66, c: '#F29A9A', r: -50, fx: -30, fy: -20, d: 0.1 },
];

export function MissionFeedback({ correct, answer, detail, explain, stars, onNext }: MissionFeedbackProps) {
  const nextRef = useRef<HTMLButtonElement>(null);
  // '다음' 버튼으로 초점이 오면 화면 읽기 프로그램은 버튼 이름만 읽으므로, 결과 문장들을 버튼 설명으로 묶어 함께 읽게 한다
  const id = useId();
  const titleId = `${id}-title`;
  const answerId = `${id}-answer`;
  const starsId = `${id}-stars`;
  const detailId = `${id}-detail`;
  const explainId = `${id}-explain`;
  const describedBy = [titleId, answer && answerId, stars !== undefined && starsId, detail && detailId, explain && explainId]
    .filter(Boolean)
    .join(' ');

  // 결과가 나오면 '다음' 버튼이 패널 아래에 숨지 않게 보이는 곳까지 스크롤하고 초점을 옮긴다
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nextRef.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    nextRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="feedback" role="status">
      <div className={`result${correct ? '' : ' result--soft'}`}>
        <div className="result__hero">
          {correct && (
            <>
              <span className="burst" aria-hidden="true" />
              {CONFETTI.map((p, i) => (
                <span
                  key={i}
                  className="confetti"
                  aria-hidden="true"
                  style={{
                    left: p.left,
                    top: p.top,
                    ['--c' as string]: p.c,
                    ['--r' as string]: `${p.r}deg`,
                    ['--fx' as string]: `${p.fx}px`,
                    ['--fy' as string]: `${p.fy}px`,
                    ['--d' as string]: `${p.d}s`,
                  }}
                />
              ))}
            </>
          )}
          <Dongle mood={correct ? 'happy' : 'comfort'} size="hero" decorative />
        </div>
        <div className="result__body">
          <p id={titleId} className="result__title ko">
            {correct ? (
              '잘했어요!'
            ) : (
              <>
                <span className="nowrap">괜찮아요,</span> <span className="nowrap">같이 알아봐요</span>
              </>
            )}
          </p>
          {answer && (
            <span id={answerId} className={`chip${answer.icon ? '' : ' chip--plain'}`}>
              {!correct && <span className="chip__prefix">정답:</span>}
              {answer.icon && (
                <span className="chip__emoji" aria-hidden="true">
                  {answer.icon}
                </span>
              )}
              {answer.label}
              {correct && (
                <span className="chip__ok" aria-hidden="true">
                  <Icon name="check" />
                </span>
              )}
            </span>
          )}
          {stars !== undefined && (
            <p id={starsId} className="result__stars">
              <span aria-hidden="true">
                {'★'.repeat(stars)}
                {'☆'.repeat(3 - stars)}
              </span>
              <span className="visually-hidden">별 {stars}개</span>
            </p>
          )}
        </div>
        {correct && (
          <>
            <span className="spark" style={{ right: 16, top: 10, ['--s' as string]: '20px', ['--d' as string]: '.3s' }} aria-hidden="true">
              <svg><use href="#spark" /></svg>
            </span>
            <span
              className="spark"
              style={{ right: 46, top: 26, ['--s' as string]: '10px', ['--d' as string]: '.9s', ['--c' as string]: '#2E9E5B' }}
              aria-hidden="true"
            >
              <svg><use href="#spark" /></svg>
            </span>
            <span className="spark" style={{ right: 22, bottom: 14, ['--s' as string]: '13px', ['--d' as string]: '.6s' }} aria-hidden="true">
              <svg><use href="#spark" /></svg>
            </span>
          </>
        )}
      </div>
      {detail && <p id={detailId} className="result__detail ko">{detail}</p>}
      {explain && <p id={explainId} className="explain ko">{explain}</p>}
      <button ref={nextRef} type="button" className="btn" aria-describedby={describedBy} onClick={onNext}>
        다음
      </button>
    </div>
  );
}
