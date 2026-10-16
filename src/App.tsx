import { useCallback, useEffect, useState } from 'react';
import { GlobeView } from './globe/GlobeView';
import type { GlobeHandle } from './globe/globeHandle';
import { loadView, saveView } from './globe/viewStorage';
import type { MapView } from './globe/themes';
import { InfoCard } from './components/InfoCard';
import { SatelliteNotice } from './components/SatelliteNotice';
import { UpdateBanner } from './components/UpdateBanner';
import { PLACES } from './content';
import type { Place, Tier } from './content/types';
import { readShotParams } from './dev/shotParams';
import { onUpdateReady } from './lib/registerPwa';
import { TripLauncher } from './trip/TripLauncher';
import { TripPanel } from './trip/TripPanel';
import type { TripStep } from './trip/tripReducer';
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
  const [zoom, setZoom] = useState<number | null>(null);
  const [satelliteFailed, setSatelliteFailed] = useState(false);
  const [globe, setGlobe] = useState<GlobeHandle | null>(null);
  const [trip, setTrip] = useState<Trip | null>(initialTrip);
  const [tier, setTier] = useState<Tier>('preschool');
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);

  const changeView = useCallback((next: MapView) => {
    setView(next);
    saveView(next);
    setSatelliteFailed(false);
  }, []);
  const handleSatelliteError = useCallback(() => setSatelliteFailed(true), []);

  useEffect(() => onUpdateReady((apply) => setApplyUpdate(() => apply)), []);

  const nextPlace = trip ? (PLACES[PLACES.indexOf(trip.place) + 1] ?? null) : null;

  return (
    <div className={!trip ? 'app' : trip.tier === 'preschool' ? 'app app--trip app--locked' : 'app app--trip'}>
      <Sprite />
      <GlobeView view={view} onZoomChange={setZoom} onSatelliteError={handleSatelliteError} onReady={setGlobe} />
      <InfoCard zoom={zoom} view={view} onViewChange={changeView} />
      <div className="bottom-stack">
        {view === 'satellite' && satelliteFailed && <SatelliteNotice onUseMap={() => changeView('map')} />}
        {applyUpdate && !trip && <UpdateBanner onReload={applyUpdate} />}
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
