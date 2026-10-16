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
import { onUpdateReady } from './lib/registerPwa';
import { TripLauncher } from './trip/TripLauncher';
import { TripPanel } from './trip/TripPanel';

interface Trip {
  place: Place;
  tier: Tier;
}

export function App() {
  const [view, setView] = useState<MapView>(loadView);
  const [zoom, setZoom] = useState<number | null>(null);
  const [satelliteFailed, setSatelliteFailed] = useState(false);
  const [globe, setGlobe] = useState<GlobeHandle | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
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
