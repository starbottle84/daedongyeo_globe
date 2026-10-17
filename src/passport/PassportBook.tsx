import { useId, type CSSProperties } from 'react';
import { STAGE_NAMES, TIER_LABELS, type Place } from '../content/types';
import { koreanDate } from '../progress/date';
import { computeUnlocked, stageCounts, stagesOf } from '../progress/rules';
import { useStorageOk } from '../progress/store';
import type { Profile, ProfileProgress } from '../progress/types';
import { Dongle } from '../ui/Dongle';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { PlaceArt } from '../ui/PlaceArt';
import { StampSeal } from './StampSeal';
import '../family/family.css';
import './passport.css';

interface PassportBookProps {
  open: boolean;
  profile: Profile;
  progress: ProfileProgress;
  places: Place[];
  onClose: () => void;
}

// 도장 칸마다 조금씩 다른 기울기 (손으로 하나씩 찍은 것처럼). 장소 순서로 정해서 열 때마다 같다
const TILTS = [-6, 5, -2, 8, -8, 3, -4, 6];

// 여권 책: 가죽 표지 띠(이름·사진·구간) 아래에 단계마다 도장판 한 쪽. 받은 칸은 빨간 잉크 도장과 처음 받은 날,
// 안 받은 칸은 점선 원 안의 흐린 장소 그림이다. 잠긴 단계는 쪽 전체를 흐린 종이로 덮고 여는 방법을 알려 준다.
// 단계 제목 줄(.stage, .stage__count)은 시작 카드(trip.css)와 같은 모양을 쓴다
export function PassportBook({ open, profile, progress, places, onClose }: PassportBookProps) {
  const titleId = useId();
  const storageOk = useStorageOk();
  const stages = stagesOf(places);
  const unlocked = computeUnlocked(places, progress);
  // 잠긴 단계를 열려면 앞 단계 도장을 몇 개 더 모아야 하는지 (시작 카드의 잠긴 표 안내와 같은 계산)
  const lockInfo = (stage: number) => {
    const prev = stages[stages.indexOf(stage) - 1];
    const { got, need } = stageCounts(places, progress, prev);
    const left = Math.max(1, need - got);
    return { left, text: `${prev}단계 도장을 ${left}개 더 모으면 열려요` };
  };
  // 받은 도장이 '쿵' 하고 나타나는 차례 (단계를 넘어 이어서 센다)
  let order = 0;

  return (
    <Modal open={open} size="full" labelledBy={titleId} onClose={onClose}>
      <header className="pb-cover">
        <span className={`avatar avatar--${profile.color} pb-cover__photo`}><Dongle mood="talk" size="xs" decorative /></span>
        <div className="pb-cover__words">
          <p className="pb-cover__en" aria-hidden="true"><svg><use href="#emblem" /></svg>EARTH PASSPORT</p>
          <h2 id={titleId} className="pb-cover__title ko">{profile.name}의 지구 여권</h2>
          <p className="pb-cover__tier">{TIER_LABELS[profile.tier]}</p>
        </div>
        <button type="button" className="close" aria-label="닫기" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      {stages.map((stage) => {
        const inStage = places.filter((p) => p.stage === stage);
        const { got, total } = stageCounts(places, progress, stage);
        const lock = unlocked.includes(stage) ? null : lockInfo(stage);
        return (
          <section key={stage} className={`pb-page${lock ? ' pb-page--locked' : ''}`} aria-labelledby={`${titleId}-s${stage}`}>
            <svg className="rosette" aria-hidden="true"><use href="#rosette" /></svg>
            <h3 id={`${titleId}-s${stage}`} className="stage">
              <svg aria-hidden="true"><use href="#spark" /></svg>
              {stage}단계 · {STAGE_NAMES[stage] ?? ''}
              {lock ? (
                <>
                  <span className="stage__count stage__count--locked" aria-hidden="true"><Icon name="lock" />{lock.left}개 더</span>
                  <span className="visually-hidden">, 잠김</span>
                </>
              ) : (
                <>
                  <span className="stage__count" aria-hidden="true">도장 {got}/{total}</span>
                  <span className="visually-hidden">, 도장 {total}개 중 {got}개</span>
                </>
              )}
            </h3>
            {/* 잠긴 쪽의 덮개 (화면 읽기에서는 제목 바로 다음에 읽히게 도장판보다 앞에 둔다) */}
            {lock && (
              <div className="pb-lock">
                <span className="pb-lock__badge" aria-hidden="true"><Icon name="lock" /></span>
                <p className="pb-lock__text ko">{lock.text}</p>
              </div>
            )}
            <ul className="pb-grid">
              {inStage.map((p) => {
                const stamp = progress.stamps[p.id];
                const tilt = `${TILTS[places.indexOf(p) % TILTS.length]}deg`;
                if (!stamp) {
                  return (
                    <li key={p.id} className="pb-cell">
                      <span className="visually-hidden">{p.name}, 아직 안 받음</span>
                      <span className="pb-cell__slot" aria-hidden="true"><PlaceArt placeId={p.id} /></span>
                      <span className="pb-cell__name" aria-hidden="true">{p.name}</span>
                    </li>
                  );
                }
                const date = koreanDate(stamp.firstDate);
                // 고학년은 위치 찍기 최고 별을 도장 오른쪽 위에 둔다
                const stars = profile.tier === 'upper' ? stamp.bestStars : 0;
                return (
                  <li key={p.id} className="pb-cell pb-cell--got" style={{ '--i': order++, '--tilt': tilt } as CSSProperties}>
                    <span className="visually-hidden">{p.name}, 도장 받음, {date}{stars > 0 && `, 최고 별 ${stars}개`}</span>
                    <span className="pb-cell__slot" aria-hidden="true"><StampSeal className="pb-seal" name={p.name} date={date} /></span>
                    <span className="pb-cell__name" aria-hidden="true">{p.name}</span>
                    <span className="pb-cell__date" aria-hidden="true">{date}</span>
                    {stars > 0 && <span className="pb-cell__stars" aria-hidden="true">★ {stars}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {/* 기기에 저장이 안 될 때만 (D11) — 놀이는 그대로 하지만 창을 닫으면 도장이 사라질 수 있다 */}
      {!storageOk && <p className="pb-warn ko">이 기기에 진행이 저장되지 않고 있어요. 부모님께 알려 주세요.</p>}
    </Modal>
  );
}
