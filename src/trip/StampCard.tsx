import { useId, useRef } from 'react';
import { PLACES } from '../content';
import { STAGE_NAMES, type Place } from '../content/types';
import { StampSeal } from '../passport/StampSeal';
import { koreanDate, localDate } from '../progress/date';
import type { StampOutcome } from '../progress/types';
import { Dongle } from '../ui/Dongle';
import { PlaceArt } from '../ui/PlaceArt';

interface StampCardProps {
  place: Place;
  /** 이번 여행에서 모은 별 (고학년 위치 찍기). 없으면 안 보여 준다 */
  stars?: number;
  /** 저장한 도장 결과. 없으면(개발용 주소로 도장 단계를 바로 연 때) 오늘 받은 새 도장으로 보인다 */
  outcome?: StampOutcome | null;
  nextPlace: Place | null;
  onNext: () => void;
}

// 받침이 있으면 '이', 없으면 '가' (단계 이름 뒤: '우리나라가', '세계 대륙이')
const subjectJosa = (word: string) => ((word.charCodeAt(word.length - 1) - 0xac00) % 28 > 0 ? '이' : '가');

// 여권 도장 장면. 도장은 TripPanel이 마지막 미션을 마친 순간 저장하고, 여기서는 그 결과(새 도장·다시 방문·단계 열림·최고 별)를 보여 준다.
export function StampCard({ place, stars, outcome, nextPlace, onNext }: StampCardProps) {
  // 도장 날짜: 다시 온 때는 처음 받은 날 그대로다 (도장은 하나뿐이라)
  const date = koreanDate(outcome?.firstDate ?? localDate());
  const revisit = outcome?.isNew === false;
  // 이번 도장으로 열린 단계 (도장 하나로는 한 단계씩 열린다)
  const opened = outcome?.newlyUnlocked[0];
  const openedName = opened !== undefined ? (STAGE_NAMES[opened] ?? '') : '';
  // 고학년 별: 이번 별과 최고 기록 중 큰 값. 이번이 최고 기록보다 적으면 '최고'를 붙여 이번 별로 오해하지 않게 한다
  const best = stars !== undefined ? Math.max(stars, outcome?.bestStars ?? 0) : 0;
  const showingBest = stars !== undefined && best > stars;
  // 마지막 미션의 '다음'을 빠르게 두 번 누르면 두 번째 누르기가 같은 자리에 나타난 '계속'으로 가서 도장 장면(단계 열림 소식)을 건너뛰었다
  // — 도장 카드가 나타난 뒤 잠깐(0.7초)은 '계속'을 받지 않는다. 누르기 시각은 사건 시각(e.timeStamp)으로 잰다 (TripLauncher와 같다)
  const shownAt = useRef(performance.now());
  // 나무 도장 그라데이션 id가 겹치지 않게
  const uid = useId().replace(/:/g, '');
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
        <StampSeal className="stamp-ink" name={place.name} date={date} />
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
      {/* 단계 열림: 도장 아래쪽에 겹쳐 붙인 금박 띠 스티커 — 도장에 겹쳐 둬야 390×844에서 도장 카드가 52%를 넘지 않는다 */}
      {opened !== undefined && (
        <p className="visa__unlock ko">
          <svg aria-hidden="true"><use href="#spark" /></svg>
          {opened}단계 · {openedName}{subjectJosa(openedName)} 열렸어요!
        </p>
      )}
      <p className="visa__title ko">{revisit ? '또 왔어요! 도장은 그대로예요' : `${place.name} 도장을 받았어요!`}</p>
      {/* 쪽 왼쪽 위 모서리에 겹쳐 둔다 — 줄을 따로 쓰면 390×844에서 도장 카드가 52%를 넘는다 */}
      {best > 0 && (
        <p className="stamp__stars">
          <span className="visually-hidden">{showingBest ? '최고 기록 별 ' : '모은 별 '}</span>
          <span aria-hidden="true">{showingBest && '최고 '}★</span> {best}개
        </p>
      )}
      {/* 최고 기록을 넘었으면 별 알약 아래에 작은 빨간 잉크 도장으로 찍는다 */}
      {outcome?.newBest && <p className="stamp__best">최고 기록!</p>}
      {nextPlace && (
        <div className="visa__next">
          <Dongle mood="happy" size="sm" decorative />
          {/* 줄을 나눠 둬야 말풍선이 글자 폭에 맞게 줄어든다(저절로 접히면 상자는 남은 폭을 다 차지한다). 넓은 화면에서는 CSS로 줄바꿈을 뺀다.
              단계가 열린 때는 금박 띠만큼 높이가 늘어서 '다음엔'을 빼고 한 줄로 줄인다 (그래도 넘치는 좁은 화면만 두 줄) */}
          {opened !== undefined ? (
            <p className="bubble visa__bubble ko">{nextPlace.name}에 <br className="visa__br--narrow" />가 볼까요?</p>
          ) : (
            <p className="bubble visa__bubble ko">다음엔 {nextPlace.name}에 <br className="visa__br" />가 볼까요?</p>
          )}
          <span className="next-slot" aria-hidden="true"><PlaceArt placeId={nextPlace.id} /></span>
        </div>
      )}
      <button type="button" className="btn" onClick={(e) => { if (e.timeStamp - shownAt.current >= 700) onNext(); }}>계속</button>
    </div>
  );
}
