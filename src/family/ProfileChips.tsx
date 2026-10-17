import { useEffect, useId, useRef, useState } from 'react';
import { TIER_LABELS } from '../content/types';
import { MAX_PROFILES } from '../progress/storage';
import { createProfile, selectProfile } from '../progress/store';
import type { Profile } from '../progress/types';
import { Dongle } from '../ui/Dongle';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { AdultGate } from './AdultGate';
import { ProfileForm } from './ProfileForm';
import './family.css';

interface ProfileChipsProps {
  profiles: Profile[];
  activeId: string;
}

// 시작 카드의 아이 칩 줄 (나이 탭 자리): 형제가 번갈아 눌러 자기 여권으로 바꾼다 (어른 확인 없음).
// 끝의 '+'는 어른 확인 뒤 아이를 더한다. 아이가 많으면 칩 줄만 가로로 스크롤한다
export function ProfileChips({ profiles, activeId }: ProfileChipsProps) {
  const [adding, setAdding] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // 고른 칩이 줄 밖(가로 스크롤 너머)에 있으면 보이게 옮긴다. scrollIntoView는 바깥 상자(종이·화면)까지 움직일 수 있어 줄만 직접 옮긴다
  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !chip) return;
    const left = chip.offsetLeft - 4;
    const right = chip.offsetLeft + chip.offsetWidth + 4;
    if (left < list.scrollLeft) list.scrollLeft = left;
    else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth;
  }, [activeId, profiles.length]);

  return (
    <div className="kids">
      <div className="kids__list" role="group" aria-label="아이 고르기" ref={listRef}>
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            className="kid"
            aria-pressed={p.id === activeId}
            aria-label={`${p.name}, ${TIER_LABELS[p.tier]}`}
            onClick={() => selectProfile(p.id)}
          >
            <span className={`avatar avatar--${p.color}`}><Dongle mood="talk" size="xs" decorative /></span>
            <span className="kid__text">
              <span className="kid__name">{p.name}</span>
              <span className="kid__tier">{TIER_LABELS[p.tier]}</span>
            </span>
          </button>
        ))}
      </div>
      {/* 읽을 때 MAX_PROFILES명으로 자르므로 그보다 많이 만들지 않게 '+'를 숨긴다 (createProfile도 만들지 않는다) */}
      {profiles.length < MAX_PROFILES && (
        <AdultGate label="" ariaLabel="아이 추가 — 길게 누르기" className="kids__add" onUnlock={() => setAdding(true)}>
          <Icon name="plus" />
        </AdultGate>
      )}
      <Modal open={adding} labelledBy={`${id}-t`} onClose={() => setAdding(false)}>
        <div className="say profile-form__say">
          <Dongle mood="talk" size="md" decorative />
          <div className="bubble modal__bubble">
            <h2 id={`${id}-t`} className="modal__title">새 여권 만들기</h2>
          </div>
        </div>
        {/* 열 때마다 빈 양식으로 시작한다 */}
        {adding && (
          <ProfileForm
            submitLabel="추가하기"
            onSubmit={(values) => {
              createProfile(values);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        )}
      </Modal>
    </div>
  );
}
