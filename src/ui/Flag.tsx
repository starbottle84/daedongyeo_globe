import { flagUrl } from './flags';

interface FlagProps {
  code: string;
  className?: string;
}

// 국기 그림 (주소는 flags.ts). 그림이 없는 코드면 아무것도 그리지 않는다 — 쓰는 곳에서 flagUrl로 먼저 보고 글자로 대신한다
export function Flag({ code, className }: FlagProps) {
  const src = flagUrl(code);
  if (!src) return null;
  return <img className={`flag${className ? ` ${className}` : ''}`} src={src} alt="" draggable={false} />;
}
