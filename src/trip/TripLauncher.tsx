import { useEffect, useRef, useState } from 'react';
import { STAGE_NAMES, type Place } from '../content/types';
import { ProfileChips } from '../family/ProfileChips';
import { ProfileForm } from '../family/ProfileForm';
import { PassportBook } from '../passport/PassportBook';
import { StampSeal } from '../passport/StampSeal';
import { koreanDate } from '../progress/date';
import { computeUnlocked, stageCounts, stageLockLeft } from '../progress/rules';
import { createProfile } from '../progress/store';
import type { Profile, ProfileProgress } from '../progress/types';
import { Dongle } from '../ui/Dongle';
import { Icon } from '../ui/Icon';
import { PlaceArt } from '../ui/PlaceArt';
import { useMoreBelow } from '../ui/useMoreBelow';
import './trip.css';

interface TripLauncherProps {
  places: Place[];
  profiles: Profile[];
  /** 고른 아이 (나이 구간은 이 아이 것을 쓴다). 아이가 없으면 null */
  activeProfile: Profile | null;
  /** 고른 아이의 진행 (표의 도장 자국·잠긴 단계). 아이가 없으면 null */
  progress: ProfileProgress | null;
  onStart: (place: Place) => void;
}

// 시작 화면: 여권을 펼쳐 아이와 장소를 고른다. 아이가 아직 없으면(첫 실행) 같은 여권 안에 '여권 만들기' 양식을 그린다
// — 부모가 옆에 있는 장면이라 어른 확인 없이 만든다. 가죽·종이·펼침 상자는 두 모습이 같이 써서, 넘침 알림(useMoreBelow)이 그대로 따라온다
export function TripLauncher({ places, profiles, activeProfile, progress, onStart }: TripLauncherProps) {
  const stages = [...new Set(places.map((p) => p.stage))].sort((a, b) => a - b);
  const unlocked = progress ? computeUnlocked(places, progress) : [];
  // 잠긴 표를 누르면 동글이 말풍선이 여는 방법을 알려 주고 2초 뒤 되돌아온다.
  // 누를 때마다 새 객체라 다시 누르면 2초를 새로 센다. 그사이 다른 아이로 바꾸면 그 아이 것이 아니니 보이지 않는다
  const [lockHint, setLockHint] = useState<{ stage: number; profileId: string } | null>(null);
  useEffect(() => {
    if (!lockHint) return;
    const timer = setTimeout(() => setLockHint(null), 2000);
    return () => clearTimeout(timer);
  }, [lockHint]);
  const hintStage = lockHint && lockHint.profileId === activeProfile?.id ? lockHint.stage : null;
  // 잠긴 단계를 열려면 앞 단계 도장을 몇 개 더 모아야 하는지
  const lockInfo = (kid: ProfileProgress, stage: number) => {
    const { prev, left } = stageLockLeft(places, kid, stage);
    return { left, text: `${prev}단계 도장을 ${left}개 더 모으면 열려요!` };
  };
  const hintText = hintStage !== null && progress ? lockInfo(progress, hintStage).text : null;
  // 여권 책 (아이 칩 줄 오른쪽 끝의 '여권' 버튼으로 연다). 연 아이의 id에 묶어 둔다 — 책이 열린 채 다른 탭에서
  // 그 아이를 지우거나 바꾸면 책이 닫히고, 기록을 지운 뒤 새로 만든 아이(새 id)에서 책이 저절로 열리지 않는다
  const [bookFor, setBookFor] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);
  // 종이가 넘쳐(낮은 화면, 안내 카드가 붙어 카드 묶음 높이 상한이 걸린 때 등) 아래에 표가 남아 있으면 여행 카드처럼
  // 아래쪽을 옅게 흐리고 작은 아래 화살표를 둬 스크롤할 수 있음을 알린다 (끝까지 내리면 뺀다)
  const moreBelow = useMoreBelow(pageRef, spreadRef);
  const sectionRef = useRef<HTMLElement>(null);
  // 프로필을 만든 시각. '여권 만들기'·'추가하기'를 빠르게 두 번 누르면 두 번째 누르기가 방금 그 자리에 나타난 표·칩으로 가서
  // 고르지 않은 여행이 바로 시작됐다 — 만든 뒤 잠깐(0.7초)은 시작 카드 안의 누르기를 무시한다.
  // 누르기 시각은 처리할 때(performance.now)가 아니라 사건 시각(e.timeStamp)으로 잰다 — 펼친 여권을 그리느라 처리가 늦어지면
  // 두 번째 탭이 막는 시간이 지나서야 처리되기도 해서, 처리 시각으로 재면 막지 못했다
  const madeAt = useRef(-Infinity);
  const justMade = () => { madeAt.current = performance.now(); };
  // 첫 실행에서 만들면 양식이 사라져 초점이 body로 떨어진다 — 펼친 여권을 그린 뒤 고른 아이 칩으로 옮겨 다음 갈 곳을 준다
  const focusKid = useRef(false);
  useEffect(() => {
    if (!focusKid.current) return;
    focusKid.current = false;
    sectionRef.current?.querySelector<HTMLElement>('.kid[aria-pressed="true"]')?.focus();
  });

  return (
    <section
      ref={sectionRef}
      // 여행을 마치고 돌아오면 App이 여기로 초점을 옮긴다 (여행 카드가 사라져 초점이 body로 떨어지지 않게)
      tabIndex={-1}
      className={`passport launcher${activeProfile ? '' : ' launcher--new'}`}
      aria-label={activeProfile ? '여행 고르기' : '여권 만들기'}
      onClickCapture={(e) => { if (e.timeStamp - madeAt.current < 700) { e.preventDefault(); e.stopPropagation(); } }}
    >
      <div className={`page${moreBelow ? ' page--more' : ''}`} ref={pageRef}>
        <svg className="rosette" aria-hidden="true"><use href="#rosette" /></svg>
        <div className="spread" ref={spreadRef}>
          <div className="spread__left">
            <div className="greet">
              <span className="photo"><Dongle mood={hintText ? 'think' : 'talk'} size="md" /></span>
              {/* 잠긴 표 안내도 이 말풍선이 한다 (바뀐 말을 화면 읽기 프로그램이 읽게 status) */}
              <p className={`bubble bubble--title ko${hintText ? ' bubble--hint' : ''}`} role={activeProfile ? 'status' : undefined}>
                {!activeProfile ? '탐험가 여권을 만들어 볼까?' : (hintText ?? '어디로 떠나 볼까?')}
              </p>
            </div>
            {activeProfile && (
              <div className="kids-row">
                <ProfileChips profiles={profiles} activeId={activeProfile.id} onAdded={justMade} />
                <button type="button" className="book-btn" aria-label={`${activeProfile.name}의 여권 보기`} onClick={() => setBookFor(activeProfile.id)}>
                  <span className="book-btn__cover" aria-hidden="true">
                    <svg><use href="#emblem" /></svg>
                    <span>여권</span>
                  </span>
                </button>
              </div>
            )}
            <p className="mrz" aria-hidden="true">
              P&lt;KOR&lt;&lt;DONGGEURI&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />EARTH&lt;PASSPORT&lt;&lt;2026&lt;&lt;&lt;&lt;&lt;&lt;
            </p>
          </div>
          <div className="spread__spine" aria-hidden="true" />
          <div className="spread__right">
            {!activeProfile && <ProfileForm submitLabel="여권 만들기" onSubmit={(values) => { if (createProfile(values)) { justMade(); focusKid.current = true; } }} />}
            {activeProfile && progress && stages.map((stage) => {
              const inStage = places.filter((p) => p.stage === stage);
              const { got, total } = stageCounts(places, progress, stage);
              const lock = unlocked.includes(stage) ? null : lockInfo(progress, stage);
              return (
                <div key={stage} className="stage-block">
                  {/* 단계 제목 오른쪽: 모은 도장 수, 잠긴 단계는 열릴 때까지 남은 도장 수 (점선 뒤에 둔다) */}
                  <h2 className="stage">
                    <svg aria-hidden="true"><use href="#spark" /></svg>
                    {stage}단계 · {STAGE_NAMES[stage] ?? ''}
                    {lock ? (
                      <>
                        <span className="stage__count stage__count--locked" aria-hidden="true"><Icon name="lock" />{lock.left}개 더</span>
                        <span className="visually-hidden">, 잠김. {lock.text}</span>
                      </>
                    ) : (
                      <>
                        <span className="stage__count" aria-hidden="true">도장 {got}/{total}</span>
                        <span className="visually-hidden">, 도장 {total}개 중 {got}개</span>
                      </>
                    )}
                  </h2>
                  <div className={`tickets tickets--${stage % 2 === 1 ? 1 : 2}`}>
                    {inStage.map((p) => {
                      const stamp = progress.stamps[p.id];
                      const stamped = Boolean(stamp);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`ticket${stamped ? ' ticket--stamped' : ''}${lock ? ' ticket--locked' : ''}${lock && hintStage === stage ? ' ticket--nudge' : ''}`}
                          aria-label={stamped ? `${p.name}, 도장 받음` : undefined}
                          aria-disabled={lock ? true : undefined}
                          onClick={() => (lock ? setLockHint({ stage, profileId: activeProfile.id }) : onStart(p))}
                        >
                          <span className="ticket__body">
                            <span className="ticket__stub"><PlaceArt placeId={p.id} /></span>
                            <span className="ticket__name">{p.name}</span>
                            {/* 도장 받은 표: 오른쪽 위에 작게 찍힌 빨간 도장 (여권 책과 같은 도장 그림) */}
                            {stamp && <span className="ticket__seal" aria-hidden="true"><StampSeal name={p.name} date={koreanDate(stamp.firstDate)} /></span>}
                            {/* 잠긴 표: 반투명 종이 덮개 + 자물쇠 */}
                            {lock && <span className="ticket__lock" aria-hidden="true"><span className="ticket__lock-badge"><Icon name="lock" /></span></span>}
                          </span>
                        </button>
                      );
                    })}
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
      {activeProfile && progress && (
        <PassportBook open={bookFor === activeProfile.id} profile={activeProfile} progress={progress} places={places} onClose={() => setBookFor(null)} />
      )}
    </section>
  );
}
