import { useId, useState, type KeyboardEvent } from 'react';
import { TIER_LABELS, TIERS, type Tier } from '../content/types';
import { AVATAR_COLORS, AVATAR_LABELS, type AvatarColor } from '../progress/types';
import { Dongle } from '../ui/Dongle';
import { Icon } from '../ui/Icon';
import './family.css';

export interface ProfileValues {
  name: string;
  tier: Tier;
  color: AvatarColor;
}

interface ProfileFormProps {
  /** 수정할 때 처음 값 (없으면 새로 만들기) */
  initial?: ProfileValues;
  submitLabel: string;
  onSubmit: (values: ProfileValues) => void;
  onCancel?: () => void;
}

const NAME_IDEAS = ['하늘', '바다', '별님', '숲속'];

// 고르기 묶음(radiogroup)의 화살표 키: 고른 칸만 Tab으로 들어가고, 화살표로 옆 칸을 고르며 초점도 옮긴다
function arrowPick<T>(items: T[], current: T, pick: (v: T) => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = (items.indexOf(current) + step + items.length) % items.length;
    pick(items[i]);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[i]?.focus();
  };
}

// 아이 여권 만들기·고치기: 이름(별명), 나이 구간, 동글이 뒤 바탕색. 이름을 비우면 '탐험가'다 (오류 상태 없음)
export function ProfileForm({ initial, submitLabel, onSubmit, onCancel }: ProfileFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [tier, setTier] = useState<Tier>(initial?.tier ?? 'preschool');
  const [color, setColor] = useState<AvatarColor>(initial?.color ?? 'sky');
  const id = useId();

  return (
    <form
      className="profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: name.trim().slice(0, 10) || '탐험가', tier, color });
      }}
    >
      <label className="profile-form__label" htmlFor={`${id}-name`}>이름이나 별명</label>
      <input
        id={`${id}-name`}
        className="profile-form__name"
        type="text"
        maxLength={10}
        autoComplete="off"
        enterKeyHint="done"
        placeholder="탐험가"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="name-ideas" role="group" aria-label="추천 별명">
        {NAME_IDEAS.map((n) => (
          <button key={n} type="button" className="name-idea" onClick={() => setName(n)}>{n}</button>
        ))}
      </div>

      {/* 나이·바탕색 칸 이름은 화면 읽기에만 둔다 — 보기(유아·저학년·고학년, 색 동그라미)가 스스로 설명하고,
          첫 실행 카드가 390×844에서 화면의 60% 안에 들어 '여권 만들기' 버튼이 스크롤 없이 보이게 */}
      <p id={`${id}-tier`} className="visually-hidden">나이</p>
      <div className="tiers" role="radiogroup" aria-labelledby={`${id}-tier`} onKeyDown={arrowPick(TIERS, tier, setTier)}>
        {TIERS.map((t) => (
          <button key={t} type="button" role="radio" aria-checked={t === tier} tabIndex={t === tier ? 0 : -1} onClick={() => setTier(t)}>
            {TIER_LABELS[t]}
          </button>
        ))}
      </div>

      <p id={`${id}-color`} className="visually-hidden">바탕색</p>
      <div className="avatar-picks" role="radiogroup" aria-labelledby={`${id}-color`} onKeyDown={arrowPick(AVATAR_COLORS, color, setColor)}>
        {AVATAR_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={AVATAR_LABELS[c]}
            tabIndex={c === color ? 0 : -1}
            className="avatar-pick"
            onClick={() => setColor(c)}
          >
            <span className={`avatar avatar--${c}`}><Dongle mood="talk" size="xs" decorative /></span>
            {c === color && <span className="avatar-pick__ok"><Icon name="check" /></span>}
          </button>
        ))}
      </div>

      <button type="submit" className="btn">{submitLabel}</button>
      {onCancel && <button type="button" className="link-button modal__leave" onClick={onCancel}>닫기</button>}
    </form>
  );
}
