import { useState } from 'react';
import { TIER_LABELS, TIERS, type Place, type Tier } from '../content/types';
import './trip.css';

interface TripLauncherProps {
  places: Place[];
  onStart: (place: Place, tier: Tier) => void;
}

// 임시 시작 화면: 나이 구간과 장소를 고른다. 계획 3에서 가족 프로필·여권으로 바뀐다.
export function TripLauncher({ places, onStart }: TripLauncherProps) {
  const [tier, setTier] = useState<Tier>('preschool');

  return (
    <section className="launcher" aria-label="여행 고르기">
      <p className="launcher__title">누구랑 여행할까요?</p>
      <div className="launcher__tiers" role="group" aria-label="나이 구간">
        {TIERS.map((t) => (
          <button key={t} type="button" aria-pressed={t === tier} onClick={() => setTier(t)}>
            {TIER_LABELS[t]}
          </button>
        ))}
      </div>
      <p className="launcher__title">어디로 갈까요?</p>
      <div className="launcher__places">
        {places.map((p) => (
          <button key={p.id} type="button" className="place-card" onClick={() => onStart(p, tier)}>
            <span className="place-card__stage">{p.stage}단계</span>
            <span className="place-card__name">{p.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
