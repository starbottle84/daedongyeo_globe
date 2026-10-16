import { useId } from 'react';
import { PLACES } from '../content';
import type { Place } from '../content/types';
import { Dongle } from '../ui/Dongle';
import { PlaceArt } from '../ui/PlaceArt';

interface StampCardProps {
  place: Place;
  /** 이번 여행에서 모은 별 (고학년 위치 찍기). 없으면 안 보여 준다 */
  stars?: number;
  nextPlace: Place | null;
  onNext: () => void;
}

// 여권 도장 장면. 도장을 저장하고 여권에 모으는 것은 계획 3에서 붙인다.
export function StampCard({ place, stars, nextPlace, onNext }: StampCardProps) {
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  // 잉크 필터·글자 길 id가 겹치지 않게
  const uid = useId().replace(/:/g, '');
  const inky = `inky-${uid}`;
  const ring = `ring-${uid}`;
  const knob = `wKnob-${uid}`;
  const body = `wBody-${uid}`;
  // 사증 쪽 번호(장식): 시작 화면의 장소 순서
  const pageNo = `P.${String(PLACES.indexOf(place) + 1).padStart(2, '0')}`;
  return (
    <div className="visa">
      <span className="visa__no" aria-hidden="true">{pageNo}</span>
      <div className="stamp-zone thud">
        <svg className="medallion" aria-hidden="true"><use href="#rosette" /></svg>
        <svg className="impact" viewBox="-110 -110 220 220" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">
            <path d="M0-104v-12M74-74l8-8M104 0h12M74 74l8 8M0 104v12M-74 74l-8 8M-104 0h-12M-74-74l-8-8" />
          </g>
        </svg>
        <svg className="stamp-ink" viewBox="0 0 200 200" role="img" aria-label={`${place.name} 도장, ${today}`}>
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
            <text x="100" y="105" textAnchor="middle" fontFamily="Jua" fontSize={Math.min(34, Math.floor(104 / (place.name.length * 0.86)))}>{place.name}</text>
            <text x="100" y="135" textAnchor="middle" fontFamily="Jua" fontSize="18.5" letterSpacing=".5">{today}</text>
          </g>
        </svg>
        {/* 내려찍는 나무 도장 (애니메이션 동안만 보임) */}
        <svg className="stamp-tool" viewBox="0 0 200 190" aria-hidden="true">
          <defs>
            <radialGradient id={knob} cx="38%" cy="32%" r="70%">
              <stop offset="0" stopColor="#E1A867" /><stop offset=".6" stopColor="#A9693A" /><stop offset="1" stopColor="#7A4722" />
            </radialGradient>
            <linearGradient id={body} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7C4824" /><stop offset=".35" stopColor="#B57A45" /><stop offset=".7" stopColor="#9A6234" /><stop offset="1" stopColor="#6E3E1E" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="32" r="28" fill={`url(#${knob})`} />
          <ellipse cx="90" cy="22" rx="9" ry="5" fill="#fff" opacity=".3" transform="rotate(-25 90 22)" />
          <path d="M86 56h28l6 64H80z" fill={`url(#${body})`} />
          <rect x="22" y="116" width="156" height="44" rx="10" fill={`url(#${body})`} />
          <rect x="22" y="130" width="156" height="6" fill="#E9C46A" opacity=".85" />
          <rect x="16" y="158" width="168" height="16" rx="4" fill="#B3342A" />
          <rect x="16" y="158" width="168" height="4" rx="2" fill="#7E2018" opacity=".6" />
        </svg>
        {/* 금색 '쾅!' 폭발 (스티커북 시안 924–927줄) — 도장이 닿을 때 튀어나왔다가 사라진다 */}
        <svg className="kwang" viewBox="0 0 80 64" aria-hidden="true">
          <polygon
            points="40,4 47,12.2 58,7.8 59.1,17.5 71.2,18 66.1,26.7 76,32 66.1,37.3 71.2,46 59.1,46.5 58,56.2 47,51.8 40,60 33,51.8 22,56.2 20.9,46.5 8.8,46 13.9,37.3 4,32 13.9,26.7 8.8,18 20.9,17.5 22,7.8 33,12.2"
            fill="#F4CB55" stroke="#fff" strokeWidth="4" strokeLinejoin="round"
          />
          <text x="40" y="41" textAnchor="middle" fontFamily="Jua" fontSize="22" fill="#23395B">쾅!</text>
        </svg>
      </div>
      <p className="visa__title ko">{place.name} 도장을 받았어요!</p>
      {/* 쪽 왼쪽 위 모서리에 겹쳐 둔다 — 줄을 따로 쓰면 390×844에서 도장 카드가 52%를 넘는다 */}
      {stars !== undefined && stars > 0 && (
        <p className="stamp__stars"><span className="visually-hidden">모은 별 </span><span aria-hidden="true">★</span> {stars}개</p>
      )}
      {nextPlace && (
        <div className="visa__next">
          <Dongle mood="happy" size="sm" decorative />
          {/* 줄을 나눠 둬야 말풍선이 글자 폭에 맞게 줄어든다(저절로 접히면 상자는 남은 폭을 다 차지한다). 넓은 화면에서는 CSS로 줄바꿈을 뺀다 */}
          <p className="bubble visa__bubble ko">다음엔 {nextPlace.name}에 <br className="visa__br" />가 볼까요?</p>
          <span className="next-slot" aria-hidden="true"><PlaceArt placeId={nextPlace.id} /></span>
        </div>
      )}
      <button type="button" className="btn" onClick={onNext}>계속</button>
    </div>
  );
}
