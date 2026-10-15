import { useCallback, useState } from 'react';
import { GlobeView } from './globe/GlobeView';
import { loadView, saveView } from './globe/viewStorage';
import type { MapView } from './globe/themes';
import { InfoCard } from './components/InfoCard';
import { SatelliteNotice } from './components/SatelliteNotice';

export function App() {
  const [view, setView] = useState<MapView>(loadView);
  const [zoom, setZoom] = useState<number | null>(null);
  const [satelliteFailed, setSatelliteFailed] = useState(false);

  const changeView = useCallback((next: MapView) => {
    setView(next);
    saveView(next);
    setSatelliteFailed(false);
  }, []);
  const handleSatelliteError = useCallback(() => setSatelliteFailed(true), []);

  return (
    <div className="app">
      <GlobeView view={view} onZoomChange={setZoom} onSatelliteError={handleSatelliteError} />
      <InfoCard zoom={zoom} view={view} onViewChange={changeView} />
      {view === 'satellite' && satelliteFailed && <SatelliteNotice onUseMap={() => changeView('map')} />}
    </div>
  );
}
