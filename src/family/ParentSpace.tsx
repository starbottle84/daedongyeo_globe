import { useEffect, useId, useRef, useState } from 'react';
import { STAGE_NAMES, TIER_LABELS, TIERS, type Mission, type Place } from '../content/types';
import { computeUnlocked, emptyProgress, stagesOf } from '../progress/rules';
import { MAX_PROFILES } from '../progress/storage';
import { createProfile, deleteProfile, eraseAll, updateProfile, useSave, useStorageOk } from '../progress/store';
import type { Profile } from '../progress/types';
import { Dongle } from '../ui/Dongle';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { PlaceArt } from '../ui/PlaceArt';
import { ConfirmDialog } from './ConfirmDialog';
import { ProfileForm } from './ProfileForm';
import './family.css';

interface ParentSpaceProps {
  open: boolean;
  places: Place[];
  onClose: () => void;
}

// 미션 정답을 부모님이 읽기 쉬운 한 줄로: 고르기는 정답 보기, 방향은 'OO쪽'.
// 찾아 누르기에 대륙·대양 이름(area)이 있으면 그곳이 찾을 곳이라 '지도에서 OO'.
// 그 밖에는 찾을 곳이 장소와 다를 때가 있어서(독도 여행의 울릉도, 남극 여행의 킹조지섬) 미션 설명을, 없으면 '지도에서 (장소 이름)'.
// 아이 말투 설명('여기가 독도예요!' 등)은 찾을 곳 이름 칸(targetName)을 둔 뒤 바꾼다 (계획 3 작업 7 Step 0)
function answerOf(m: Mission, place: Place): string {
  switch (m.type) {
    case 'choice': {
      const o = m.options[m.answer];
      return o.icon ? `${o.icon} ${o.label}` : o.label;
    }
    case 'direction':
      return `${m.answer}쪽`;
    case 'tap':
    case 'pin':
      if (m.type === 'tap' && m.area) return `지도에서 ${m.area}`;
      return m.explain ?? `지도에서 ${place.name}`;
  }
}

// 아이폰·아이패드 사파리에서 홈 화면 앱이 아니라 브라우저로 연 때 (아이패드는 데스크톱 모드에서 Mac으로 보여 터치 지점 수도 본다)
function isIosBrowser(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return ios && (navigator as Navigator & { standalone?: boolean }).standalone === false;
}

// 부모님 공간: 어른 확인을 지나야 열린다 (App의 '부모님' 버튼). 열려 있을 때만 내용을 그린다 —
// 닫았다 다시 열면 펼친 양식·접기 목록이 처음 모습으로 돌아온다
export function ParentSpace({ open, places, onClose }: ParentSpaceProps) {
  const titleId = useId();
  return (
    <Modal open={open} size="full" labelledBy={titleId} onClose={onClose}>
      {open && <ParentSpaceBody titleId={titleId} places={places} onClose={onClose} />}
    </Modal>
  );
}

type FormState = { mode: 'edit'; id: string } | { mode: 'add' } | null;

function ParentSpaceBody({ titleId, places, onClose }: { titleId: string; places: Place[]; onClose: () => void }) {
  const save = useSave();
  const storageOk = useStorageOk();
  // 한 번에 양식 하나만 펼친다 (아이 수정 또는 아이 추가)
  const [form, setForm] = useState<FormState>(null);
  // 지울 아이는 창이 닫히는 동안에도 제목에 이름이 남게 열림과 따로 둔다
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const kidsTitleRef = useRef<HTMLHeadingElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const addFormRef = useRef<HTMLDivElement>(null);
  // 양식이 펼쳐지거나 닫힌 뒤, 아이를 지운 뒤 초점을 둘 곳. 누른 버튼이 사라져 초점이 body로 떨어지지 않게 다시 그린 뒤에 옮긴다
  // (확인 창(자식)이 닫히며 초점을 돌려주는 효과 다음에 돌아야 해서 이 자리에 둔다)
  const focusNext = useRef<(() => HTMLElement | null | undefined) | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    target()?.focus();
  });
  const inRow = (id: string, selector: string) => () =>
    listRef.current?.querySelector<HTMLElement>(`[data-kid="${CSS.escape(id)}"] ${selector}`);

  // 배경지식의 미션 정답은 고른 아이의 나이 구간을 맨 앞에 펼쳐 둔다. 열 때 한 번만 정한다 —
  // 연 채로 그 아이의 구간을 고쳐도 펼쳐 둔 장소의 줄 순서·펼침(부모님이 직접 접고 편 것)이 바뀌지 않게. 다음에 열면 새 구간이 앞이다
  const [firstTier] = useState(() => save.profiles.find((p) => p.id === save.activeProfileId)?.tier ?? 'preschool');
  const tierOrder = [firstTier, ...TIERS.filter((t) => t !== firstTier)];
  const iosHint = isIosBrowser();

  return (
    <>
      <header className="ps-head">
        <span className="ps-head__badge" aria-hidden="true"><Icon name="lock" /></span>
        <div className="ps-head__words">
          <p className="ps-head__en" aria-hidden="true">FOR PARENTS</p>
          <h2 id={titleId} className="ps-head__title">부모님 공간</h2>
        </div>
        {/* 열면 초점이 여기로 온다 (Modal의 data-autofocus) — 그러지 않으면 크롬이 스크롤되는 종이(이름 없는 칸)에 먼저 준다 */}
        <button type="button" className="close" aria-label="닫기" data-autofocus onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>

      {/* 아이들: 진행(도장·열린 단계), 같은 자리에서 고치기, 지우기, 아이 추가 (여기는 이미 어른 확인을 지났으므로 게이트 없음) */}
      <section className="ps-section" aria-labelledby={`${titleId}-kids`}>
        <h3 id={`${titleId}-kids`} ref={kidsTitleRef} className="ps-title" tabIndex={-1}>
          <svg aria-hidden="true"><use href="#spark" /></svg>아이들
        </h3>
        {save.profiles.length === 0 && <p className="ps-empty ko">아직 만든 여권이 없어요.</p>}
        <ul className="parent-kids" ref={listRef}>
          {save.profiles.map((p) => {
            const progress = save.progress[p.id] ?? emptyProgress();
            const got = places.filter((pl) => progress.stamps[pl.id]).length;
            const unlocked = computeUnlocked(places, progress).join('·');
            const editing = form?.mode === 'edit' && form.id === p.id;
            return (
              <li key={p.id} className="parent-kid" data-kid={p.id}>
                <span className={`avatar avatar--${p.color}`}><Dongle mood="talk" size="xs" decorative /></span>
                <div className="parent-kid__who">
                  <p className="parent-kid__name">
                    <span className="ko">{p.name}</span>
                    <span className="parent-kid__tier">{TIER_LABELS[p.tier]}</span>
                  </p>
                  <p className="parent-kid__stats">
                    <span className="ps-chip ps-chip--stamp" aria-hidden="true">도장 {got}/{places.length}</span>
                    <span className="visually-hidden">도장 {places.length}개 중 {got}개,</span>
                    <span className="ps-chip">{unlocked}단계 열림</span>
                  </p>
                </div>
                {editing ? (
                  // 펼친 양식에 초점을 줘 화면 읽기에서 어디가 열렸는지 알린다 (이름 칸에 바로 주면 휴대폰 키보드가 나이·색 고르기를 가린다)
                  <div className="parent-kid__form" role="group" aria-label={`${p.name} 여권 고치기`} tabIndex={-1}>
                    <ProfileForm
                      initial={{ name: p.name, tier: p.tier, color: p.color }}
                      submitLabel="저장"
                      onSubmit={(values) => {
                        updateProfile(p.id, values);
                        focusNext.current = inRow(p.id, '.parent-kid__edit');
                        setForm(null);
                      }}
                      onCancel={() => {
                        focusNext.current = inRow(p.id, '.parent-kid__edit');
                        setForm(null);
                      }}
                    />
                  </div>
                ) : (
                  <div className="parent-kid__actions">
                    <button
                      type="button"
                      className="ps-mini parent-kid__edit"
                      aria-label={`${p.name} 여권 수정`}
                      onClick={() => {
                        focusNext.current = inRow(p.id, '.parent-kid__form');
                        setForm({ mode: 'edit', id: p.id });
                      }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="ps-mini ps-mini--danger"
                      aria-label={`${p.name} 여권 삭제`}
                      onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {/* 읽을 때 MAX_PROFILES명으로 자르므로 그보다 많이 만들지 않는다 (시작 카드의 '+'와 같은 규칙) */}
        {save.profiles.length < MAX_PROFILES && (form?.mode === 'add' ? (
          <div ref={addFormRef} className="ps-add-form" role="group" aria-labelledby={`${titleId}-add`} tabIndex={-1}>
            <h4 id={`${titleId}-add`} className="ps-add-form__title">새 여권 만들기</h4>
            <ProfileForm
              submitLabel="추가하기"
              onSubmit={(values) => {
                const made = createProfile(values);
                focusNext.current = made ? inRow(made.id, '.parent-kid__edit') : () => addRef.current;
                setForm(null);
              }}
              onCancel={() => {
                focusNext.current = () => addRef.current;
                setForm(null);
              }}
            />
          </div>
        ) : (
          <button
            ref={addRef}
            type="button"
            className="ps-add"
            onClick={() => {
              focusNext.current = () => addFormRef.current;
              setForm({ mode: 'add' });
            }}
          >
            <Icon name="plus" />아이 추가
          </button>
        ))}
      </section>

      {/* 장소별 배경지식: 단계별로 묶은 접기 목록. 접힌 줄에는 부모님 메모 첫 줄을 미리 보이고, 펼치면 메모 전체와 나이 구간별 미션 정답 */}
      <section className="ps-section" aria-labelledby={`${titleId}-know`}>
        <h3 id={`${titleId}-know`} className="ps-title">
          <svg aria-hidden="true"><use href="#spark" /></svg>장소별 배경지식
        </h3>
        <p className="ps-lead ko">장소를 누르면 부모님 메모와 미션 정답이 나와요.</p>
        {stagesOf(places).map((stage) => (
          <div key={stage} className="ps-stage">
            <h4 className="stage">
              <svg aria-hidden="true"><use href="#spark" /></svg>
              {stage}단계 · {STAGE_NAMES[stage] ?? ''}
            </h4>
            <div className="ps-places">
              {places.filter((p) => p.stage === stage).map((p) => (
                <details key={p.id} className="ps-place">
                  <summary>
                    <span className="ps-place__art" aria-hidden="true"><PlaceArt placeId={p.id} /></span>
                    <span className="ps-place__words">
                      <span className="ps-place__name">{p.name}</span>
                      {/* 미리 보기는 화면 읽기에서 뺀다 — 펼치면 같은 메모를 전부 읽는다 */}
                      <span className="ps-place__peek" aria-hidden="true">{p.parentNote}</span>
                    </span>
                    <span className="ps-chev" aria-hidden="true" />
                  </summary>
                  <div className="ps-place__body">
                    <p className="ps-note ko">{p.parentNote}</p>
                    {tierOrder.map((t) => (
                      <details key={t} className="ps-tier" open={t === firstTier}>
                        <summary>
                          {TIER_LABELS[t]} 미션 정답
                          <span className="ps-chev" aria-hidden="true" />
                        </summary>
                        <ol className="ps-answers">
                          {p.missions[t].map((m, i) => (
                            <li key={i}>
                              <p className="ps-q ko">{m.prompt}</p>
                              <p className="ps-a ko">
                                <Icon name={m.type === 'tap' || m.type === 'pin' ? 'map' : 'check'} />
                                <span><span className="visually-hidden">정답: </span>{answerOf(m, p)}</span>
                              </p>
                            </li>
                          ))}
                        </ol>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* 저장 상태 (D11): 저장이 안 되면 살구색 안내 */}
      <section className="ps-section" aria-labelledby={`${titleId}-store`}>
        <h3 id={`${titleId}-store`} className="ps-title">
          <svg aria-hidden="true"><use href="#spark" /></svg>저장과 개인정보
        </h3>
        <div className={`ps-store${storageOk ? '' : ' ps-store--warn'}`}>
          <Icon name={storageOk ? 'check' : 'lock'} />
          <div>
            <p className="ko">
              {storageOk
                ? '모든 기록은 이 기기에만 저장돼요. 계정·광고·외부 전송이 없어요.'
                : '이 기기에 진행이 저장되지 않고 있어요. 사생활 보호(시크릿) 모드에서는 창을 닫으면 기록이 사라져요.'}
            </p>
            {/* 개인정보 문구(D10)는 저장이 안 될 때도 맞는 말이라 남긴다 */}
            {!storageOk && <p className="ko">계정·광고·외부 전송이 없어요.</p>}
            {iosHint && <p className="ko">홈 화면에 추가하면 기록이 더 오래 남아요.</p>}
          </div>
        </div>
      </section>

      {/* 기록 지우기: 처음엔 작은 버튼, 누르면 한 번 더 묻는다 */}
      <div className="ps-erase">
        <button type="button" className="ps-erase__btn" onClick={() => setEraseOpen(true)}>이 기기의 기록 모두 지우기</button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title={`${deleteTarget?.name ?? ''}의 여권을 지울까요?`}
        body="도장과 기록이 모두 지워지고 되돌릴 수 없어요."
        keepLabel="아니요, 그대로 둘게요"
        leaveLabel="네, 지울게요"
        onKeep={() => setDeleteOpen(false)}
        onLeave={() => {
          if (deleteTarget) deleteProfile(deleteTarget.id);
          // 누른 '삭제' 버튼이 줄과 함께 사라지므로 아이들 제목으로 초점을 옮긴다
          focusNext.current = () => kidsTitleRef.current;
          setDeleteOpen(false);
        }}
      />
      <ConfirmDialog
        open={eraseOpen}
        title="이 기기의 기록을 모두 지울까요?"
        body="아이들의 여권과 도장이 모두 지워지고 되돌릴 수 없어요."
        keepLabel="아니요, 그대로 둘게요"
        leaveLabel="네, 모두 지울게요"
        onKeep={() => setEraseOpen(false)}
        onLeave={() => {
          // 프로필이 모두 없어지므로 부모님 공간을 닫으면 첫 실행(여권 만들기) 화면이다
          eraseAll();
          setEraseOpen(false);
          onClose();
        }}
      />
    </>
  );
}
