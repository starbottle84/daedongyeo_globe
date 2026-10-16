import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { TIER_LABELS, type Place, type Tier, type View } from '../content/types';
import type { GlobeHandle } from '../globe/globeHandle';
import { CharacterBubble } from './CharacterBubble';
import { MissionView } from './missions/MissionView';
import { StampCard } from './StampCard';
import { createTripState, tripReducer } from './tripReducer';
import './trip.css';

interface TripPanelProps {
  place: Place;
  tier: Tier;
  globe: GlobeHandle;
  nextPlace: Place | null;
  onExit: () => void;
}

// 여행 한 번: 출발 → 둘러보기 → 미션 → 도장 → 함께 이야기
export function TripPanel({ place, tier, globe, nextPlace, onExit }: TripPanelProps) {
  const missions = place.missions[tier];
  const [state, dispatch] = useReducer(tripReducer, missions.length, createTripState);
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
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [state.step, state.missionIndex]);

  const next = () => dispatch({ type: 'next' });
  const mission = state.step === 'mission' ? missions[state.missionIndex] : null;
  const stars = state.results.reduce((sum, r) => sum + (r.stars ?? 0), 0);
  const readAloud = tier === 'preschool' && <p className="trip-panel__note">부모님이 소리 내어 읽어 주세요.</p>;

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      className={`trip-panel trip-panel--${tier}`}
      aria-label={`${place.name} 여행`}
    >
      <header className="trip-panel__header">
        <span>
          {place.name} 여행 · {TIER_LABELS[tier]}
        </span>
        <button type="button" className="trip-panel__close" onClick={onExit} aria-label="여행 그만하기">
          ✕
        </button>
      </header>

      {state.step === 'depart' && (
        <>
          <CharacterBubble text={place.intro[tier]} />
          {readAloud}
          <button type="button" className="big-button" onClick={next}>
            출발!
          </button>
        </>
      )}

      {state.step === 'explore' && (
        <>
          <CharacterBubble text={place.story[tier]} />
          {readAloud}
          <button type="button" className="big-button" onClick={next}>
            미션 시작
          </button>
        </>
      )}

      {mission && (
        <>
          <p className="trip-panel__progress">
            미션 {state.missionIndex + 1} / {missions.length}
          </p>
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
          <p className="talk__label">함께 이야기해요</p>
          <p className="talk__text">{place.familyTalk[tier]}</p>
          <button
            type="button"
            className="link-button"
            aria-expanded={showNote}
            onClick={() => setShowNote((v) => !v)}
          >
            부모님 메모 {showNote ? '닫기' : '보기'}
          </button>
          {showNote && <p className="talk__note">{place.parentNote}</p>}
          <button type="button" className="big-button" onClick={onExit}>
            여행 마치기
          </button>
        </div>
      )}
    </section>
  );
}
