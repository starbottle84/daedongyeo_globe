import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { TIER_LABELS, type Place, type Tier, type View } from '../content/types';
import type { GlobeHandle } from '../globe/globeHandle';
import { Icon } from '../ui/Icon';
import { CharacterBubble } from './CharacterBubble';
import { MissionView } from './missions/MissionView';
import { StampCard } from './StampCard';
import { createTripState, tripReducer, type TripStep } from './tripReducer';
import './trip.css';

interface TripPanelProps {
  place: Place;
  tier: Tier;
  globe: GlobeHandle;
  nextPlace: Place | null;
  /** 개발용 화면 확인 주소(?shot=)로 열 때 시작할 단계 */
  initialStep?: { step: TripStep; missionIndex: number };
  onExit: () => void;
}

// 여행 한 번: 출발 → 둘러보기 → 미션 → 도장 → 함께 이야기
export function TripPanel({ place, tier, globe, nextPlace, initialStep, onExit }: TripPanelProps) {
  const missions = place.missions[tier];
  const [state, dispatch] = useReducer(tripReducer, missions.length, (count) =>
    initialStep
      ? { ...createTripState(count), step: initialStep.step, missionIndex: Math.min(initialStep.missionIndex, count - 1) }
      : createTripState(count),
  );
  const [showNote, setShowNote] = useState(false);
  const placeView = useMemo<View>(() => ({ center: place.center, zoom: place.zoom }), [place]);
  const panelRef = useRef<HTMLElement>(null);

  // 출발: 지구본이 목적지로 날아간다. 유아는 길을 잃지 않게 손 조작을 잠근다(누르기는 된다).
  useEffect(() => {
    globe.flyTo(place.center, place.zoom);
    globe.setInteractive(tier !== 'preschool');
    return () => globe.restore();
  }, [globe, place, tier]);

  // 단계나 미션이 바뀌면 패널로 초점을 옮겨 화면 읽기 프로그램이 새 내용부터 읽게 한다.
  // (미션 결과가 나오면 나중에 나타나는 MissionFeedback이 '다음' 버튼으로 초점을 옮긴다)
  // 같은 패널을 계속 쓰므로, 앞 미션 결과에서 '다음' 버튼까지 내려 둔 스크롤을 맨 위로 되돌려 제목부터 보이게 한다.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTop = 0;
    panel.focus({ preventScroll: true });
  }, [state.step, state.missionIndex]);

  const next = () => dispatch({ type: 'next' });
  const mission = state.step === 'mission' ? missions[state.missionIndex] : null;
  const stars = state.results.reduce((sum, r) => sum + (r.stars ?? 0), 0);
  // 찾아 누르기·핀 꽂기·방향 미션은 지도를 넓게 보여야 해서 카드를 줄인다
  const compact = mission !== null && mission.type !== 'choice';
  const readAloud = tier === 'preschool' && (
    <p className="note"><Icon name="read" />부모님이 소리 내어 읽어 주세요.</p>
  );

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      className={`passport trip-panel trip-panel--${tier}${compact ? ' trip-panel--compact' : ''}`}
      aria-label={`${place.name} 여행`}
    >
      <div className="page page--ticket">
        <svg className="rosette" aria-hidden="true"><use href="#rosette" /></svg>
        <header className="pass-head">
          <span className="pass-head__tag" aria-hidden="true"><Icon name="plane" /></span>
          <h2 className="pass-head__title">{place.name} 여행 · {TIER_LABELS[tier]}</h2>
          <button type="button" className="close" onClick={onExit} aria-label="여행 그만하기">
            <Icon name="close" />
          </button>
        </header>
        <div className="tear" aria-hidden="true" />

        {state.step === 'depart' && (
          <>
            <CharacterBubble text={place.intro[tier]} />
            {readAloud}
            <button type="button" className="btn" onClick={next}>
              출발! <Icon name="plane" className="btn__plane" />
            </button>
          </>
        )}

        {state.step === 'explore' && (
          <>
            <CharacterBubble text={place.story[tier]} />
            {readAloud}
            <button type="button" className="btn" onClick={next}>미션 시작</button>
          </>
        )}

        {mission && (
          <>
            <div className="progress">
              <span className="progress__label">미션 {state.missionIndex + 1} / {missions.length}</span>
              <span className="pips" aria-hidden="true">
                {missions.map((_, i) => (
                  <i key={i} className={`${i <= state.missionIndex ? 'on' : ''}${i === state.missionIndex ? ' now' : ''}`} />
                ))}
              </span>
            </div>
            <MissionView
              key={state.missionIndex}
              mission={mission}
              tier={tier}
              globe={globe}
              placeView={placeView}
              onDone={(result) => dispatch({ type: 'missionDone', result })}
            />
            {readAloud}
          </>
        )}

        {state.step === 'stamp' && (
          <StampCard place={place} stars={tier === 'upper' ? stars : undefined} nextPlace={nextPlace} onNext={next} />
        )}

        {state.step === 'talk' && (
          <div className="talk">
            <h3 className="talk__label">함께 이야기해요</h3>
            <CharacterBubble text={place.familyTalk[tier]} />
            <button
              type="button"
              className="link-button"
              aria-expanded={showNote}
              onClick={() => setShowNote((v) => !v)}
            >
              부모님 메모 {showNote ? '닫기' : '보기'}
            </button>
            {showNote && <p className="talk__note ko">{place.parentNote}</p>}
            <button type="button" className="btn" onClick={onExit}>
              여행 마치기
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
