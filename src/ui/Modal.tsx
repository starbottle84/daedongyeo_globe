import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  /** 화면 읽기용 제목 (보이는 제목 요소의 id를 주면 그걸 쓴다) */
  labelledBy?: string;
  label?: string;
  onClose: () => void;
  /** 'sheet' = 가운데 종이 카드, 'full' = 화면 가득(여권 책·부모님 공간) */
  size?: 'sheet' | 'full';
  children: ReactNode;
}

// 덮개 화면: <dialog>.showModal()로 맨 위 층에 띄운다 — 초점 가두기·ESC 닫기는 브라우저가 해 주고,
// 닫으면 브라우저가 연 버튼으로 초점을 돌려준다. 아래 카드 묶음 밖이라 지구본 다시 맞추기에도 영향이 없다.
export function Modal({ open, labelledBy, label, onClose, size = 'sheet', children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      // 브라우저가 ESC를 막지 못하고 바로 닫은 경우(사용자 동작 없이 ESC를 거듭 누르면 그렇다)에도 열림 상태를 맞춘다
      onClose={() => { if (open) onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget && size === 'sheet') onClose(); }}
    >
      <div className="passport modal__card"><div className="page">{children}</div></div>
    </dialog>
  );
}
