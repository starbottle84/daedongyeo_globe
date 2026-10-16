import { useCallback, useEffect, useRef, useState } from 'react';
import { GlobeView } from './globe/GlobeView';
import type { GlobeHandle } from './globe/globeHandle';
import { loadView, saveView } from './globe/viewStorage';
import type { MapView } from './globe/themes';
import { MapButtons } from './components/MapButtons';
import { SatelliteNotice } from './components/SatelliteNotice';
import { UpdateBanner } from './components/UpdateBanner';
import { PLACES } from './content';
import type { Place, Tier } from './content/types';
import { readShotParams } from './dev/shotParams';
import { onUpdateReady } from './lib/registerPwa';
import { TripLauncher } from './trip/TripLauncher';
import { TripPanel } from './trip/TripPanel';
import type { TripStep } from './trip/tripReducer';
import { LogoBadge } from './ui/LogoBadge';
import { Sky } from './ui/Sky';
import { Sprite } from './ui/Sprite';

interface Trip {
  place: Place;
  tier: Tier;
  /** 개발용 화면 확인 주소(?shot=)로 바로 연 단계 */
  initialStep?: { step: TripStep; missionIndex: number };
}

// 개발 중 화면 확인용 주소(?shot=장소:단계:화면)가 있으면 그 여행 화면으로 바로 연다 (배포 빌드에서는 늘 null)
function initialTrip(): Trip | null {
  const shot = readShotParams();
  const place = shot && PLACES.find((p) => p.id === shot.placeId);
  if (!shot || !place) return null;
  return { place, tier: shot.tier, initialStep: { step: shot.step, missionIndex: shot.missionIndex } };
}

export function App() {
  const [view, setView] = useState<MapView>(loadView);
  const [satelliteFailed, setSatelliteFailed] = useState(false);
  const [globe, setGlobe] = useState<GlobeHandle | null>(null);
  const [trip, setTrip] = useState<Trip | null>(initialTrip);
  const [tier, setTier] = useState<Tier>('preschool');
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

  const nextPlace = trip ? (PLACES[PLACES.indexOf(trip.place) + 1] ?? null) : null;

  return (
    <div className={!trip ? 'app' : trip.tier === 'preschool' ? 'app app--trip app--locked' : 'app app--trip'}>
      <Sprite />
      <Sky />
      <GlobeView view={view} onSatelliteError={handleSatelliteError} onReady={setGlobe} />
      <LogoBadge />
      {globe && !trip && <MapButtons globe={globe} view={view} onViewChange={changeView} />}
      <div className="bottom-stack" ref={stackRef}>
        {view === 'satellite' && satelliteFailed && <SatelliteNotice onUseMap={() => changeView('map')} />}
        {/* 위성 안내가 떠 있는 동안 새 버전 안내는 미룬다 — 두 장이 같이 뜨면 가로 휴대폰에서 시작 카드 종이가 50px 남짓으로 눌려 쓸 수 없다 */}
        {applyUpdate && !trip && !(view === 'satellite' && satelliteFailed) && <UpdateBanner onReload={applyUpdate} />}
        {globe &&
          (trip ? (
            <TripPanel
              key={`${trip.place.id}-${trip.tier}`}
              place={trip.place}
              tier={trip.tier}
              globe={globe}
              nextPlace={nextPlace}
              initialStep={trip.initialStep}
              onExit={() => setTrip(null)}
            />
          ) : (
            <TripLauncher
              places={PLACES}
              tier={tier}
              onTierChange={setTier}
              onStart={(place, tier) => setTrip({ place, tier })}
            />
          ))}
      </div>
    </div>
  );
}
