import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  /** 화면 읽기용 제목 (보이는 제목 요소의 id를 주면 그걸 쓴다) */
  labelledBy?: string;
  label?: string;
  /** 열릴 때 제목에 이어 읽어 줄 설명 글의 id */
  describedBy?: string;
  onClose: () => void;
  /** 'sheet' = 가운데 종이 카드, 'full' = 화면 가득(여권 책·부모님 공간) */
  size?: 'sheet' | 'full';
  children: ReactNode;
}

// 덮개 화면: <dialog>.showModal()로 맨 위 층에 띄운다 — 초점 가두기·ESC 닫기는 브라우저가 해 주고,
// 닫으면 브라우저가 연 버튼으로 초점을 돌려준다. 아래 카드 묶음 밖이라 지구본 다시 맞추기에도 영향이 없다.
export function Modal({ open, labelledBy, label, describedBy, onClose, size = 'sheet', children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // 누르기가 바깥(덮개)에서 시작했는지. 손을 뗀 자리만 보면, 어른 확인 버튼을 길게 눌러 창이 열린 뒤 손을 뗄 때
  // 브라우저가 만든 click이 손가락 아래 덮개로 가서 창이 바로 닫힌다 (카드 안에서 눌러 바깥에서 떼도 그렇다)
  const pressedBackdrop = useRef(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { pressedBackdrop.current = false; d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);
  // body 바로 아래에 그린다 — 연 자리(시작 카드·여행 카드) 안에 두면 '.launcher .page'의 높이 상한(화면 60%)·'.launcher *'의
  // box-sizing 같은 그 카드의 규칙이 덮개 종이에도 걸려, 아이 추가 양식이 잘리고 연 자리마다 보기 버튼 크기가 달라졌다
  return createPortal(
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      aria-describedby={describedBy}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      // 브라우저가 ESC를 막지 못하고 바로 닫은 경우(사용자 동작 없이 ESC를 거듭 누르면 그렇다)에도 열림 상태를 맞춘다
      onClose={() => { if (open) onClose(); }}
      // pointerdown이어야 한다 — 창이 열린 뒤 따라오는 호환 mousedown은 덮개(dialog)로 가기 때문
      onPointerDown={(e) => { pressedBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        const fromBackdrop = pressedBackdrop.current;
        pressedBackdrop.current = false;
        if (fromBackdrop && e.target === e.currentTarget && size === 'sheet') onClose();
      }}
      // 키를 누르고 있을 때 생기는 자동 반복 Enter·Space는 창 안 버튼을 누르지 않게 한다
      // (✕를 Enter로 길게 누르면 열리자마자 '계속 여행하기'가 눌려 창이 열렸다 닫히기를 되풀이했다)
      onKeyDown={(e) => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }}
    >
      <div className="passport modal__card"><div className="page">{children}</div></div>
    </dialog>,
    document.body,
  );
}
