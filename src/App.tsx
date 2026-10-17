import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { GlobeView } from './globe/GlobeView';
import type { GlobeHandle } from './globe/globeHandle';
import { loadView, saveView } from './globe/viewStorage';
import type { MapView } from './globe/themes';
import { MapButtons } from './components/MapButtons';
import { SatelliteNotice } from './components/SatelliteNotice';
import { UpdateBanner } from './components/UpdateBanner';
import { PLACES } from './content';
import { TIER_LABELS, type Place, type Tier } from './content/types';
import { readSeed, readShotParams } from './dev/shotParams';
import { AdultGate } from './family/AdultGate';
import { onUpdateReady } from './lib/registerPwa';
import { emptyProgress, nextPlaceFor } from './progress/rules';
import { getSave, useSave } from './progress/store';
import { TripLauncher } from './trip/TripLauncher';
import { TripPanel } from './trip/TripPanel';
import type { TripStep } from './trip/tripReducer';
import { Dongle } from './ui/Dongle';
import { Icon } from './ui/Icon';
import { LogoBadge } from './ui/LogoBadge';
import { Modal } from './ui/Modal';
import { Sky } from './ui/Sky';
import { Sprite } from './ui/Sprite';

interface Trip {
  place: Place;
  tier: Tier;
  /** 도장을 남길 아이. null이면 저장하지 않는다 (개발용 ?shot= 주소를 ?seed= 없이 연 때) */
  profileId: string | null;
  /** 개발용 화면 확인 주소(?shot=)로 바로 연 단계 */
  initialStep?: { step: TripStep; missionIndex: number };
}

// 개발 중 화면 확인용 주소(?shot=장소:단계:화면)가 있으면 그 여행 화면으로 바로 연다 (배포 빌드에서는 늘 null)
function initialTrip(): Trip | null {
  const shot = readShotParams();
  const place = shot && PLACES.find((p) => p.id === shot.placeId);
  if (!shot || !place) return null;
  // ?seed=가 같이 있으면 그 상태의 고른 아이로 연다
  const profileId = readSeed() ? getSave().activeProfileId : null;
  return { place, tier: shot.tier, profileId, initialStep: { step: shot.step, missionIndex: shot.missionIndex } };
}

export function App() {
  const [view, setView] = useState<MapView>(loadView);
  const [satelliteFailed, setSatelliteFailed] = useState(false);
  const [globe, setGlobe] = useState<GlobeHandle | null>(null);
  const [trip, setTrip] = useState<Trip | null>(initialTrip);
  // 나이 구간은 고른 아이(프로필)의 것을 쓴다
  const save = useSave();
  const active = save.profiles.find((p) => p.id === save.activeProfileId) ?? null;
  const activeProgress = active ? (save.progress[active.id] ?? emptyProgress()) : null;
  const [parentOpen, setParentOpen] = useState(false);
  const parentTitleId = useId();
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  // 여행을 한 번이라도 했는지 — 여행이 끝나 시작 카드로 돌아올 때만 지구본을 부드럽게 옮긴다
  const wasTrip = useRef(false);

  const changeView = useCallback((next: MapView) => {
    setView(next);
    saveView(next);
    setSatelliteFailed(false);
  }, []);
  const handleSatelliteError = useCallback(() => setSatelliteFailed(true), []);

  useEffect(() => onUpdateReady((apply) => setApplyUpdate(() => apply)), []);

  // 여행이 아닐 때는 지구본 전체가 시작 카드 위·로고 아래 빈 곳 가운데에 보이게 맞춘다.
  // 창 크기가 바뀌거나, 아래 카드 묶음 높이가 바뀌면(안내 카드가 붙을 때 등) 다시 맞춘다. 여행 중에는 여행 카드가 카메라를 맞춘다.
  useEffect(() => {
    const stack = stackRef.current;
    if (trip) wasTrip.current = true;
    if (!globe || trip || !stack) return;
    // 여행을 마치고 돌아온 때는 사라진 여행 카드 대신 시작 카드에 초점을 준다 (그대로 두면 body로 떨어진다). 앱을 처음 열 때는 옮기지 않는다
    if (wasTrip.current) stack.querySelector<HTMLElement>('.launcher')?.focus({ preventScroll: true });
    globe.frameHome(wasTrip.current);
    wasTrip.current = false;
    const reframe = () => globe.frameHome(false);
    // 지켜보기를 시작하면 지금 크기도 한 번 알려 오므로, 높이가 실제로 바뀔 때만 다시 맞춘다 (방금 시작한 부드러운 이동을 끊지 않게).
    // 쓰는 도중 안내 카드가 붙어 높이가 바뀌면 툭 옮기지 않고 부드럽게 옮긴다 (창 크기·회전은 바로 맞춘다)
    let height = stack.offsetHeight;
    const observer = new ResizeObserver(() => {
      if (stack.offsetHeight === height) return;
      height = stack.offsetHeight;
      globe.frameHome(true);
    });
    observer.observe(stack);
    window.addEventListener('resize', reframe);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', reframe);
    };
  }, [globe, trip]);

  // 다음에 가 볼 곳: 열린 단계에서 아직 도장이 없는 곳. 도장을 저장하면 진행이 바뀌어 다시 그려지므로 '저장 → 단계 열림 → 다음 장소' 순서가 맞는다.
  // 아이 없이 연 개발용 여행(?shot=)은 예전처럼 목록의 다음 장소
  const tripProgress = trip?.profileId ? save.progress[trip.profileId] : undefined;
  const nextPlace = !trip
    ? null
    : tripProgress
      ? nextPlaceFor(PLACES, tripProgress, trip.place)
      : (PLACES[PLACES.indexOf(trip.place) + 1] ?? null);
  const showSatelliteNotice = view === 'satellite' && satelliteFailed;

  return (
    <div className={!trip ? 'app' : trip.tier === 'preschool' ? 'app app--trip app--locked' : 'app app--trip'}>
      <Sprite />
      <Sky />
      <GlobeView view={view} onSatelliteError={handleSatelliteError} onReady={setGlobe} />
      {/* 로고 오른쪽 '부모님' 버튼: 길게 누르고 어른 확인 문제를 풀면 부모님 공간이 열린다 (여행 중에는 숨긴다 — global.css) */}
      <LogoBadge>
        <AdultGate label="부모님" ariaLabel="부모님 공간 — 길게 누르기" className="parent-gate" onUnlock={() => setParentOpen(true)}>
          <Icon name="lock" />
        </AdultGate>
      </LogoBadge>
      {globe && !trip && <MapButtons globe={globe} view={view} onViewChange={changeView} />}
      <div className="bottom-stack" ref={stackRef}>
        {showSatelliteNotice && <SatelliteNotice onUseMap={() => changeView('map')} />}
        {/* 위성 안내가 떠 있는 동안 새 버전 안내는 미룬다 — 두 장이 같이 뜨면 가로 휴대폰에서 시작 카드 종이가 50px 남짓으로 눌려 쓸 수 없다 */}
        {applyUpdate && !trip && !showSatelliteNotice && <UpdateBanner onReload={applyUpdate} />}
        {globe &&
          (trip ? (
            <TripPanel
              key={`${trip.place.id}-${trip.tier}-${trip.profileId}`}
              place={trip.place}
              tier={trip.tier}
              profileId={trip.profileId}
              globe={globe}
              nextPlace={nextPlace}
              initialStep={trip.initialStep}
              onExit={() => setTrip(null)}
            />
          ) : (
            <TripLauncher
              places={PLACES}
              profiles={save.profiles}
              activeProfile={active}
              progress={activeProgress}
              onStart={(place) => active && setTrip({ place, tier: active.tier, profileId: active.id })}
            />
          ))}
      </div>
      {/* 부모님 공간 자리 — 작업 6에서 ParentSpace로 바꾼다. 지금은 아이 목록만 보인다 */}
      <Modal open={parentOpen} size="full" labelledBy={parentTitleId} onClose={() => setParentOpen(false)}>
        <div className="pass-head">
          <h2 id={parentTitleId} className="pass-head__title">부모님 공간</h2>
          <button type="button" className="close" aria-label="닫기" onClick={() => setParentOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <ul className="parent-kids">
          {save.profiles.map((p) => (
            <li key={p.id} className="parent-kid">
              <span className={`avatar avatar--${p.color}`}><Dongle mood="talk" size="xs" decorative /></span>
              <span className="parent-kid__name">{p.name}</span>
              <span className="parent-kid__tier">{TIER_LABELS[p.tier]}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
