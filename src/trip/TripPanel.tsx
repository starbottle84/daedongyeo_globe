import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { TIER_LABELS, type Place, type Tier, type View } from '../content/types';
import { ConfirmDialog } from '../family/ConfirmDialog';
import type { GlobeHandle } from '../globe/globeHandle';
import { recordStamp } from '../progress/store';
import type { StampOutcome } from '../progress/types';
import { Icon } from '../ui/Icon';
import { useMoreBelow } from '../ui/useMoreBelow';
import { COMMON_VOICE, nextVoice, placeVoice, unlockVoice } from '../voice/lines';
import { useAutoVoice, useVoiceReady } from '../voice/useVoice';
import { CharacterBubble } from './CharacterBubble';
import { MissionView } from './missions/MissionView';
import { StampCard } from './StampCard';
import { createTripState, tripReducer, type MissionResult, type TripStep } from './tripReducer';
import './trip.css';

/** 도장 말은 나무 도장이 종이에 닿은 뒤(trip.css .thud 0.72s)에 시작한다 */
const STAMP_VOICE_DELAY_MS = 800;

interface TripPanelProps {
  place: Place;
  tier: Tier;
  /** 도장을 남길 아이. null이면 저장하지 않는다 (개발용 ?shot= 주소) */
  profileId: string | null;
  globe: GlobeHandle;
  nextPlace: Place | null;
  /** 개발용 화면 확인 주소(?shot=)로 열 때 시작할 단계 */
  initialStep?: { step: TripStep; missionIndex: number };
  onExit: () => void;
}

// 여행 한 번: 출발 → 둘러보기 → 미션 → 도장 → 함께 이야기
export function TripPanel({ place, tier, profileId, globe, nextPlace, initialStep, onExit }: TripPanelProps) {
  const missions = place.missions[tier];
  const [state, dispatch] = useReducer(tripReducer, missions.length, (count) =>
    initialStep
      ? { ...createTripState(count), step: initialStep.step, missionIndex: Math.min(initialStep.missionIndex, count - 1) }
      : createTripState(count),
  );
  const [showNote, setShowNote] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  // 마지막 미션을 마친 순간 저장한 도장 결과 (새 도장·다시 방문·열린 단계·최고 별). 개발용 주소로 도장 단계를 바로 열었으면 null
  const [stampOutcome, setStampOutcome] = useState<StampOutcome | null>(null);
  // 마지막 정답을 빠르게 두 번 눌러도 한 여행에 한 번만 저장한다 (두 번 부르면 방문 횟수가 2가 되고 '또 왔어요'가 뜬다)
  const stampedRef = useRef(false);
  const placeView = useMemo<View>(() => ({ center: place.center, zoom: place.zoom }), [place]);
  const panelRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  // 개발용 화면 확인 주소로 지도 미션(찾아 누르기·핀 꽂기·방향)을 바로 열 때는 그 미션이 카메라를 맞춘다.
  // (부모 효과가 자식보다 나중에 돌아서, 장소로 날아가면 미션이 맞춘 화면을 덮는다. 고르기 미션은 카메라를 옮기지 않으니 장소로 날아간다)
  const openedAtMapMission =
    initialStep?.step === 'mission' && missions[Math.min(initialStep.missionIndex, missions.length - 1)].type !== 'choice';

  // 출발: 지구본이 목적지로 날아간다. 유아는 길을 잃지 않게 손 조작을 잠근다(누르기는 된다).
  useEffect(() => {
    if (!openedAtMapMission) globe.flyTo(place.center, place.zoom);
    globe.setInteractive(tier !== 'preschool');
    return () => globe.restore();
  }, [globe, place, tier, openedAtMapMission]);

  // 카메라 여백은 날아갈 때 한 번만 재므로, 카드 높이가 바뀌면(고르기 결과 카드가 붙는 등) 여백만 다시 맞춘다 — 목표가 카드 뒤로 들어가지 않게.
  // 한 그리기에서 여러 번 알려 와도 한 번만 맞추게 다음 그림 틀(requestAnimationFrame)로 묶는다. 날아가는 중이면 globe가 비행 뒤로 미룬다
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => globe.refitPadding());
    });
    // 카드 묶음(.bottom-stack)을 지켜본다 — 여행 중 위성 안내 카드가 붙어 묶음이 커져도 여백을 다시 맞추게
    observer.observe(panel.parentElement ?? panel);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [globe]);

  // 본문이 넘쳐 아래에 내용(주 버튼 등)이 남아 있으면 아래쪽을 옅게 흐리고 작은 아래 화살표를 둬 스크롤할 수 있음을 알린다 (끝까지 내리면 뺀다)
  const moreBelow = useMoreBelow(bodyRef, contentRef);

  // 부모님 메모를 펼치면 본문 아래쪽에 생기므로 메모가 보이는 곳까지 스크롤한다
  useEffect(() => {
    if (showNote) noteRef.current?.scrollIntoView({ block: 'nearest' });
  }, [showNote]);

  // 단계나 미션이 바뀌면 패널로 초점을 옮겨 화면 읽기 프로그램이 새 내용부터 읽게 한다.
  // (미션 결과가 나오면 나중에 나타나는 MissionFeedback이 '다음' 버튼으로 초점을 옮긴다)
  // 같은 패널을 계속 쓰므로, 앞 미션 결과에서 '다음' 버튼까지 내려 둔 본문 스크롤을 맨 위로 되돌린다.
  // (머리말과 절취선은 고정이고 그 아래 본문만 종이 안에서 스크롤한다)
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    panel.focus({ preventScroll: true });
  }, [state.step, state.missionIndex]);

  const next = () => dispatch({ type: 'next' });
  // 도장은 마지막 미션의 '다음'을 누른 이 처리기에서 저장한다 (리듀서는 순수 함수로 두고, StrictMode에서 두 번 돌지 않게)
  const handleDone = (result: MissionResult) => {
    const isLast = state.missionIndex + 1 >= missions.length;
    if (isLast && profileId && !stampedRef.current) {
      stampedRef.current = true;
      const total = [...state.results, result].reduce((sum, r) => sum + (r.stars ?? 0), 0);
      setStampOutcome(recordStamp(profileId, place, total));
    }
    dispatch({ type: 'missionDone', result });
  };
  // 도장을 받기 전에는 실수로 나가지 않게 한 번 묻는다 (도장 뒤에는 이미 저장했으니 바로 나간다)
  const requestExit = () => (state.step === 'stamp' || state.step === 'talk' ? onExit() : setConfirmExit(true));
  const mission = state.step === 'mission' ? missions[state.missionIndex] : null;
  const stars = state.results.reduce((sum, r) => sum + (r.stars ?? 0), 0);
  // 찾아 누르기·핀 꽂기·방향 미션은 지도를 넓게 보여야 해서 카드를 줄인다
  const compact = mission !== null && mission.type !== 'choice';
  // 유아 음성 (D8): 단계가 바뀌면 동글이가 그 단계의 말을 한다. 미션의 질문·힌트·결과는 미션 화면이 재생한다
  const voice = useMemo(() => (tier === 'preschool' ? placeVoice(place) : null), [place, tier]);
  const missionVoice = voice && mission ? voice.missions[state.missionIndex] : null;
  const opened = stampOutcome?.newlyUnlocked[0];
  const stepVoice = !voice
    ? null
    : state.step === 'depart'
      ? [voice.intro]
      : state.step === 'explore'
        ? [voice.story]
        : state.step === 'stamp'
          ? [
              stampOutcome?.isNew === false ? COMMON_VOICE.revisit : voice.stamp,
              opened !== undefined ? unlockVoice(opened) : null,
              nextPlace ? nextVoice(nextPlace, opened !== undefined) : null,
            ]
          : state.step === 'talk'
            ? [voice.talk]
            : null;
  useAutoVoice(stepVoice, state.step === 'stamp' ? STAMP_VOICE_DELAY_MS : 0);
  // 동글이가 읽어 주는 화면에서는 '부모님이 소리 내어 읽어 주세요'를 빼고, 녹음이 없거나 소리를 끈 때만 보인다
  const speaking = useVoiceReady(missionVoice ? missionVoice.prompt : stepVoice?.[0]);
  const readAloud = tier === 'preschool' && !speaking && (
    <p className="note"><Icon name="read" />부모님이 소리 내어 읽어 주세요.</p>
  );

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      className={`passport trip-panel trip-panel--${tier}${mission ? ' trip-panel--mission' : ''}${compact ? ' trip-panel--compact' : ''}`}
      aria-label={`${place.name} 여행`}
    >
      <div className="page page--ticket">
        <svg className="rosette" aria-hidden="true"><use href="#rosette" /></svg>
        <header className="pass-head">
          <span className="pass-head__tag" aria-hidden="true"><Icon name="plane" /></span>
          <h2 className="pass-head__title">{place.name} 여행 · {TIER_LABELS[tier]}</h2>
          <button type="button" className="close" onClick={requestExit} aria-label="여행 그만하기">
            <Icon name="close" />
          </button>
        </header>
        <div className="tear" aria-hidden="true" />

        {/* 넘치면 이 본문만 종이 안에서 스크롤한다 — 가죽 바느질 점선·머리말·닫기 버튼·절취선 홈은 제자리에 */}
        <div className={`pass-body${moreBelow ? ' pass-body--more' : ''}`} ref={bodyRef}>
          {/* 내용 높이가 바뀌는 것을 재기 위한 묶음 (위 '아래에 내용이 남았는지' 참고) */}
          <div ref={contentRef}>
            {state.step === 'depart' && (
              <>
                <CharacterBubble text={place.intro[tier]} voice={stepVoice} />
                {readAloud}
                <button type="button" className="btn" onClick={next}>
                  출발! <Icon name="plane" className="btn__plane" />
                </button>
              </>
            )}

            {state.step === 'explore' && (
              <>
                <CharacterBubble text={place.story[tier]} voice={stepVoice} />
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
                  voice={missionVoice}
                  onDone={handleDone}
                />
                {readAloud}
              </>
            )}

            {state.step === 'stamp' && (
              <StampCard
                place={place}
                stars={tier === 'upper' ? stars : undefined}
                outcome={stampOutcome}
                nextPlace={nextPlace}
                onNext={next}
              />
            )}

            {state.step === 'talk' && (
              <div className="talk">
                <h3 className="talk__label">함께 이야기해요</h3>
                <CharacterBubble text={place.familyTalk[tier]} voice={stepVoice} />
                <button
                  type="button"
                  className="link-button"
                  aria-expanded={showNote}
                  onClick={() => setShowNote((v) => !v)}
                >
                  부모님 메모 {showNote ? '닫기' : '보기'}
                </button>
                {showNote && <p ref={noteRef} className="talk__note ko">{place.parentNote}</p>}
                <button type="button" className="btn" onClick={onExit}>
                  여행 마치기
                </button>
              </div>
            )}
          </div>
        </div>
        {moreBelow && <span className="pass-more" aria-hidden="true" />}
      </div>
      <ConfirmDialog
        open={confirmExit}
        title="여행을 그만할까요?"
        body="끝까지 하면 여권에 도장을 받아요."
        keepLabel="계속 여행하기"
        leaveLabel="그만하기"
        onKeep={() => setConfirmExit(false)}
        onLeave={onExit}
      />
    </section>
  );
}
