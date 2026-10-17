import { useRef } from 'react';
import { STAGE_NAMES, type Place } from '../content/types';
import { ProfileChips } from '../family/ProfileChips';
import { ProfileForm } from '../family/ProfileForm';
import { createProfile } from '../progress/store';
import type { Profile } from '../progress/types';
import { Dongle } from '../ui/Dongle';
import { PlaceArt } from '../ui/PlaceArt';
import { useMoreBelow } from '../ui/useMoreBelow';
import './trip.css';

interface TripLauncherProps {
  places: Place[];
  profiles: Profile[];
  /** 고른 아이 (나이 구간은 이 아이 것을 쓴다). 아이가 없으면 null */
  activeProfile: Profile | null;
  onStart: (place: Place) => void;
}

// 시작 화면: 여권을 펼쳐 아이와 장소를 고른다. 아이가 아직 없으면(첫 실행) 같은 여권 안에 '여권 만들기' 양식을 그린다
// — 부모가 옆에 있는 장면이라 어른 확인 없이 만든다. 가죽·종이·펼침 상자는 두 모습이 같이 써서, 넘침 알림(useMoreBelow)이 그대로 따라온다
export function TripLauncher({ places, profiles, activeProfile, onStart }: TripLauncherProps) {
  const stages = [...new Set(places.map((p) => p.stage))].sort((a, b) => a - b);
  const pageRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);
  // 종이가 넘쳐(낮은 화면, 안내 카드가 붙어 카드 묶음 높이 상한이 걸린 때 등) 아래에 표가 남아 있으면 여행 카드처럼
  // 아래쪽을 옅게 흐리고 작은 아래 화살표를 둬 스크롤할 수 있음을 알린다 (끝까지 내리면 뺀다)
  const moreBelow = useMoreBelow(pageRef, spreadRef);

  return (
    <section className={`passport launcher${activeProfile ? '' : ' launcher--new'}`} aria-label={activeProfile ? '여행 고르기' : '여권 만들기'}>
      <div className={`page${moreBelow ? ' page--more' : ''}`} ref={pageRef}>
        <svg className="rosette" aria-hidden="true"><use href="#rosette" /></svg>
        <div className="spread" ref={spreadRef}>
          <div className="spread__left">
            <div className="greet">
              <span className="photo"><Dongle mood="talk" size="md" /></span>
              <p className="bubble bubble--title ko">{activeProfile ? '어디로 떠나 볼까?' : '탐험가 여권을 만들어 볼까?'}</p>
            </div>
            {activeProfile && <ProfileChips profiles={profiles} activeId={activeProfile.id} />}
            <p className="mrz" aria-hidden="true">
              P&lt;KOR&lt;&lt;DONGGEURI&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />EARTH&lt;PASSPORT&lt;&lt;2026&lt;&lt;&lt;&lt;&lt;&lt;
            </p>
          </div>
          <div className="spread__spine" aria-hidden="true" />
          <div className="spread__right">
            {!activeProfile && <ProfileForm submitLabel="여권 만들기" onSubmit={(values) => { createProfile(values); }} />}
            {activeProfile && stages.map((stage) => {
              const inStage = places.filter((p) => p.stage === stage);
              return (
                <div key={stage} className="stage-block">
                  <h2 className="stage">
                    <svg aria-hidden="true"><use href="#spark" /></svg>
                    {stage}단계 · {STAGE_NAMES[stage] ?? ''}
                  </h2>
                  <div className={`tickets tickets--${stage % 2 === 1 ? 1 : 2}`}>
                    {inStage.map((p) => (
                      <button key={p.id} type="button" className="ticket" onClick={() => onStart(p)}>
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
