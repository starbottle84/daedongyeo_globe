import { STAGE_NAMES, TIER_LABELS, TIERS, type Place, type Tier } from '../content/types';
import { Dongle } from '../ui/Dongle';
import { PlaceArt } from '../ui/PlaceArt';
import './trip.css';

interface TripLauncherProps {
  places: Place[];
  /** 고른 나이 구간은 App이 보관한다 (여행이 끝나 이 화면이 다시 떠도 그대로 남게) */
  tier: Tier;
  onTierChange: (tier: Tier) => void;
  onStart: (place: Place, tier: Tier) => void;
}

// 시작 화면: 여권을 펼쳐 나이 구간과 장소를 고른다. 계획 3에서 가족 프로필·여권 기능이 붙는다.
export function TripLauncher({ places, tier, onTierChange, onStart }: TripLauncherProps) {
  const stages = [...new Set(places.map((p) => p.stage))].sort((a, b) => a - b);
  return (
    <section className="passport launcher" aria-label="여행 고르기">
      <div className="page">
        <svg className="rosette" aria-hidden="true"><use href="#rosette" /></svg>
        <div className="spread">
          <div className="spread__left">
            <div className="greet">
              <span className="photo"><Dongle mood="talk" size="md" /></span>
              <p className="bubble bubble--title ko">어디로 떠나 볼까?</p>
            </div>
            <div className="tiers" role="group" aria-label="나이 구간">
              {TIERS.map((t) => (
                <button key={t} type="button" aria-pressed={t === tier} onClick={() => onTierChange(t)}>
                  {TIER_LABELS[t]}
                </button>
              ))}
            </div>
            <p className="mrz" aria-hidden="true">
              P&lt;KOR&lt;&lt;DONGGEURI&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />EARTH&lt;PASSPORT&lt;&lt;2026&lt;&lt;&lt;&lt;&lt;&lt;
            </p>
          </div>
          <div className="spread__spine" aria-hidden="true" />
          <div className="spread__right">
            {stages.map((stage) => {
              const inStage = places.filter((p) => p.stage === stage);
              return (
                <div key={stage} className="stage-block">
                  <h2 className="stage">
                    <svg aria-hidden="true"><use href="#spark" /></svg>
                    {stage}단계 · {STAGE_NAMES[stage] ?? ''}
                  </h2>
                  <div className={`tickets tickets--${stage % 2 === 1 ? 1 : 2}`}>
                    {inStage.map((p) => (
                      <button key={p.id} type="button" className="ticket" onClick={() => onStart(p, tier)}>
                        <span className="ticket__body">
                          <span className="ticket__stub"><PlaceArt placeId={p.id} /></span>
                          <span className="ticket__name">{p.name}</span>
                        </span>
                      </button>
                    ))}
                    {Array.from({ length: (4 - (inStage.length % 4)) % 4 }, (_, i) => (
                      <span key={`slot-${i}`} className="ticket-slot" aria-hidden="true" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
