export type DongleMood = 'talk' | 'think' | 'happy' | 'comfort';
export type DongleSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

interface DongleProps {
  mood: DongleMood;
  size?: DongleSize;
  /** 장식으로만 쓸 때(옆에 같은 내용의 글이 있을 때)는 true */
  decorative?: boolean;
}

// 안내 캐릭터 동글이: 기본(talk) · 음…(think) · 신나요(happy) · 토닥토닥(comfort)
export function Dongle({ mood, size = 'md', decorative = false }: DongleProps) {
  return (
    <svg
      className={`dg dg--${size}`}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': '동글이' })}
    >
      <use href={`#dg-${mood}`} />
    </svg>
  );
}
