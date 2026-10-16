import { useEffect, useRef, useState } from 'react';
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
  const pageRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);

  // 종이가 넘쳐(낮은 화면, 안내 카드가 붙어 카드 묶음 높이 상한이 걸린 때 등) 아래에 표가 남아 있으면 여행 카드처럼
  // 아래쪽을 옅게 흐리고 작은 아래 화살표를 둬 스크롤할 수 있음을 알린다 (끝까지 내리면 뺀다).
  // 종이 높이(창 크기·안내 카드)나 내용(늦게 들어온 글꼴)이 바뀔 때도 다시 잰다
  useEffect(() => {
    const page = pageRef.current;
    const spread = spreadRef.current;
    if (!page || !spread) return;
    const update = () => setMoreBelow(page.scrollHeight - page.scrollTop - page.clientHeight > 1);
    update();
    page.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(page);
    observer.observe(spread);
    return () => {
      page.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  return (
    <section className="passport launcher" aria-label="여행 고르기">
      <div className={`page${moreBelow ? ' page--more' : ''}`} ref={pageRef}>
        <svg className="rosette" aria-hidden="true"><use href="#rosette" /></svg>
        <div className="spread" ref={spreadRef}>
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
      {moreBelow && <span className="pass-more" aria-hidden="true" />}
    </section>
  );
}
