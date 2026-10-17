import { useVoiceReady } from './useVoice';
import { playVoice } from './voice';
import './voice.css';

interface ReplayButtonProps {
  /** 다시 들려줄 문장 id들. null이면(유아가 아니면) 그리지 않는다 */
  ids: (string | null)[] | null;
}

// 말풍선·질문 옆 '다시 듣기'. 소리를 껐거나 녹음 파일이 아직 없으면 그리지 않는다 (글만 보인다)
export function ReplayButton({ ids }: ReplayButtonProps) {
  const ready = useVoiceReady(ids?.[0]);
  if (!ids || !ready) return null;
  return (
    <button type="button" className="replay" aria-label="다시 듣기" onClick={() => playVoice(ids)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 9.2h3.4L11.6 5v14l-4.7-4.2H3.5z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M15 9.3a3.8 3.8 0 0 1 0 5.4M17.8 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
