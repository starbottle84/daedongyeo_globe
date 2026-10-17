import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Modal } from '../ui/Modal';

interface AdultGateProps {
  /** 버튼 글자 (예: '부모님') */
  label: string;
  /** 버튼 접근 이름 (예: '부모님 공간 — 길게 누르기') */
  ariaLabel: string;
  className?: string;
  holdMs?: number;
  onUnlock: () => void;
  children?: ReactNode;
}

interface Question { a: number; b: number; options: number[] }

function makeQuestion(): Question {
  const a = 11 + Math.floor(Math.random() * 39);
  const b = 11 + Math.floor(Math.random() * 39);
  const answer = a + b;
  const wrong = new Set<number>();
  for (const d of [10, -10, 1, -1, 11, -9]) {
    if (wrong.size === 2) break;
    if (answer + d > 0) wrong.add(answer + d);
  }
  const options = [answer, ...wrong].sort(() => Math.random() - 0.5);
  return { a, b, options };
}

// 어른 확인: 신원 확인이 아니라 아이가 실수로 들어가지 않게 하는 '한 번 더 생각하기'.
// 1) 버튼을 holdMs 동안 누르고 있으면(손가락·마우스·키보드 Space/Enter 모두) 2) 두 자리 수 더하기 문제가 나오고 3) 맞히면 연다.
export function AdultGate({ label, ariaLabel, className, holdMs = 1500, onUnlock, children }: AdultGateProps) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [holding, setHolding] = useState(false);
  const [q, setQ] = useState<Question>(makeQuestion);
  const [wrong, setWrong] = useState(false);
  const timer = useRef<number | null>(null);
  const done = useRef(false);
  const id = useId();

  const clear = () => { if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; } };
  const start = () => {
    clear();
    done.current = false;
    setHint(false);
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      done.current = true;
      setHolding(false);
      setQ(makeQuestion());
      setWrong(false);
      setOpen(true);
    }, holdMs);
  };
  const end = () => {
    const wasHolding = timer.current !== null;
    clear();
    setHolding(false);
    if (wasHolding && !done.current) setHint(true);
  };
  const cancel = () => { clear(); setHolding(false); };
  // 누르는 중에 화면이 사라지면 타이머를 멈춘다
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(false), 3000);
    return () => clearTimeout(t);
  }, [hint]);

  const choose = (v: number) => {
    if (v === q.a + q.b) { setOpen(false); onUnlock(); return; }
    setWrong(true);
    setQ(makeQuestion());
  };

  return (
    <span className={`adult-gate ${className ?? ''}`}>
      <button
        type="button"
        className={`adult-gate__btn${holding ? ' is-holding' : ''}`}
        aria-label={ariaLabel}
        style={{ ['--hold' as string]: `${holdMs}ms` }}
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } }}
      >
        {children}
        {label && <span>{label}</span>}
      </button>
      {hint && <span className="adult-gate__hint" role="status">길게 눌러 주세요</span>}
      <Modal open={open} labelledBy={`${id}-t`} onClose={() => setOpen(false)}>
        <div className="adult-gate__head">
          <h2 id={`${id}-t`} className="modal__title">어른 확인</h2>
          <p className="modal__body ko">아래 문제의 답을 골라 주세요.</p>
        </div>
        {/* 열릴 때 초점은 보기 버튼이 아니라 문제 글에 둔다 — Enter를 길게 눌러 열면 자동 반복 키가 첫 보기를 눌러 버리기 때문 */}
        <p className="adult-gate__q" aria-live="polite" tabIndex={-1}>{q.a} + {q.b} = ?</p>
        <div className="adult-gate__options">
          {q.options.map((v) => (
            <button key={`${q.a}-${q.b}-${v}`} type="button" className="choice adult-gate__opt" onClick={() => choose(v)}>{v}</button>
          ))}
        </div>
        {wrong && <p className="adult-gate__wrong" role="status">다시 한 번 풀어 주세요.</p>}
        <button type="button" className="link-button modal__leave" onClick={() => setOpen(false)}>닫기</button>
      </Modal>
    </span>
  );
}
