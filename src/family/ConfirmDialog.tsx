import { useId } from 'react';
import { Dongle } from '../ui/Dongle';
import { Modal } from '../ui/Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: string;
  /** 안전한 쪽 (크게, 앞에) */
  keepLabel: string;
  /** 되돌리기 어려운 쪽 (작게) */
  leaveLabel: string;
  onKeep: () => void;
  onLeave: () => void;
}

// 예/아니요 확인: 동글이 말풍선으로 묻고, 안전한 쪽이 큰 금박 버튼이다. ESC·바깥 누르기는 안전한 쪽(onKeep)으로 닫는다
export function ConfirmDialog({ open, title, body, keepLabel, leaveLabel, onKeep, onLeave }: ConfirmDialogProps) {
  const id = useId();
  return (
    <Modal open={open} labelledBy={`${id}-t`} onClose={onKeep}>
      <div className="say">
        <Dongle mood="think" size="md" decorative />
        <div className="bubble modal__bubble">
          <h2 id={`${id}-t`} className="modal__title ko">{title}</h2>
          {body && <p className="modal__body ko">{body}</p>}
        </div>
      </div>
      <button type="button" className="btn" autoFocus onClick={onKeep}>{keepLabel}</button>
      <button type="button" className="link-button modal__leave" onClick={onLeave}>{leaveLabel}</button>
    </Modal>
  );
}
