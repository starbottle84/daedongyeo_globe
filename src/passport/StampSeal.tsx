import { useId } from 'react';

interface StampSealProps {
  name: string;
  /** 도장 날짜 글자 ('10월 16일') */
  date: string;
  className?: string;
}

// 빨간 잉크 여권 도장: 이중 원 테두리, 둘레 글자, 지구 선 그림, 장소 이름, 날짜 띠.
// 잉크가 덜 묻은 얼룩과 번진 가장자리는 SVG 필터로 만든다(움직이지 않는다). 도장 카드·여권 책·시작 카드 표가 같이 쓴다
export function StampSeal({ name, date, className }: StampSealProps) {
  // 한 화면에 여러 개 그려도(여권 책) 잉크 필터·글자 길 id가 겹치지 않게
  const uid = useId().replace(/:/g, '');
  const inky = `inky-${uid}`;
  const ring = `ring-${uid}`;
  return (
    <svg className={className} viewBox="0 0 200 200" role="img" aria-label={`${name} 도장, ${date}`}>
      <defs>
        <filter id={inky} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="11" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -4.2 3.05" result="speck" />
          <feComposite in="SourceGraphic" in2="speck" operator="in" result="ink" />
          <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4" result="warp" />
          <feDisplacementMap in="ink" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <path id={ring} d="M32 100A68 68 0 0 1 168 100" />
      </defs>
      <g filter={`url(#${inky})`} transform="rotate(-9 100 100)" fill="#C23A2E">
        <g fill="none" stroke="#C23A2E">
          <circle cx="100" cy="100" r="92" strokeWidth="6" />
          <circle cx="100" cy="100" r="83.5" strokeWidth="1.8" />
          <circle cx="100" cy="100" r="61" strokeWidth="1.8" />
          <path d="M45 114h110M45 141h110" strokeWidth="2" />
        </g>
        <text fontFamily="Jua" fontSize="12.5" letterSpacing="3.2">
          <textPath href={`#${ring}`} startOffset="50%" textAnchor="middle">EARTH PASSPORT</textPath>
        </text>
        <g transform="translate(100 154) scale(.5)">
          <use href="#sparkle-shape" x="-26" /><use href="#sparkle-shape" /><use href="#sparkle-shape" x="26" />
        </g>
        {/* 지구 (도장 선 그림) — 그림 모음의 지구 아이콘은 선 색이 currentColor라 color로 빨강을 준다 */}
        <g transform="translate(88 46) scale(1)" fill="none" stroke="#C23A2E" strokeWidth="2.2" color="#C23A2E">
          <use href="#i-globe" width="24" height="24" />
        </g>
        {/* 이름이 길면 도장 안쪽 원(지름 122)에 들어가게 글자를 줄인다 — Jua 한 글자 폭 ≈ 0.86em, 이름 폭 104 이하 */}
        <text x="100" y="105" textAnchor="middle" fontFamily="Jua" fontSize={Math.min(34, Math.floor(104 / (name.length * 0.86)))}>{name}</text>
        <text x="100" y="135" textAnchor="middle" fontFamily="Jua" fontSize="18.5" letterSpacing=".5">{date}</text>
      </g>
    </svg>
  );
}
