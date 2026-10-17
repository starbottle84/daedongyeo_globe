import { useSyncExternalStore } from 'react';
import { PLACES } from '../content';
import type { Place, Tier } from '../content/types';
import { localDate } from './date';
import { applyStamp, emptyProgress } from './rules';
import { canStore, clearSave, emptySave, loadSave, MAX_PROFILES, readStored, SAVE_KEY, writeSave } from './storage';
import type { AvatarColor, Profile, SaveData, StampOutcome } from './types';

// 앱 전체가 같이 보는 진행 상태. 바꿀 때마다 기기에 저장하고, 구독한 화면을 다시 그린다.
let state: SaveData = emptySave();
let storageOk = true;
/** 개발용 ?seed= 상태는 저장하지 않는다 */
let persistEnabled = true;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function initProgress(seed?: SaveData): void {
  if (seed) {
    state = seed;
    persistEnabled = false;
    storageOk = true;
    return;
  }
  storageOk = canStore();
  state = loadSave();
  // 다른 탭(홈 화면 앱과 브라우저 탭 등)이 저장하면 다시 읽는다
  window.addEventListener('storage', (e) => {
    if (e.key !== SAVE_KEY && e.key !== null) return;
    // 주 칸이 지워졌으면(기록 지우기) 백업을 읽지 않고 비운다 — 지운 기록이 이 탭에서 되살아나 다시 저장되지 않게
    state = e.key === null || e.newValue === null ? emptySave() : loadSave();
    notify();
  });
}

function commit(next: SaveData): void {
  state = next;
  if (persistEnabled) storageOk = writeSave(next) && storageOk;
  notify();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSave(): SaveData {
  return useSyncExternalStore(subscribe, () => state);
}
export function useStorageOk(): boolean {
  return useSyncExternalStore(subscribe, () => storageOk);
}
export function getSave(): SaveData {
  return state;
}

const newId = () => (crypto.randomUUID?.() ?? `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

/** 아이를 더하고 활성으로 만든다. 이미 MAX_PROFILES명이면 만들지 않고 null */
export function createProfile(input: { name: string; tier: Tier; color: AvatarColor }): Profile | null {
  if (state.profiles.length >= MAX_PROFILES) return null;
  const profile: Profile = {
    id: newId(),
    name: input.name.trim().slice(0, 10) || '탐험가',
    tier: input.tier,
    color: input.color,
    createdAt: localDate(),
  };
  commit({
    ...state,
    activeProfileId: profile.id,
    profiles: [...state.profiles, profile],
    progress: { ...state.progress, [profile.id]: emptyProgress() },
  });
  // 브라우저가 공간이 모자랄 때 이 앱 저장을 먼저 지우지 않게 부탁한다 (안 되면 그만).
  // 시작하자마자가 아니라 어른이 옆에 있는 프로필 만들기 때 부른다 — 권한 창이 아이 첫 화면에 뜨지 않게
  if (persistEnabled) void navigator.storage?.persist?.().catch(() => undefined);
  return profile;
}

export function updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'tier' | 'color'>>): void {
  commit({
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === id ? { ...p, ...patch, name: (patch.name ?? p.name).trim().slice(0, 10) || '탐험가' } : p,
    ),
  });
}

export function deleteProfile(id: string): void {
  const profiles = state.profiles.filter((p) => p.id !== id);
  const progress = { ...state.progress };
  delete progress[id];
  commit({
    ...state,
    profiles,
    progress,
    activeProfileId: state.activeProfileId === id ? (profiles[0]?.id ?? null) : state.activeProfileId,
  });
}

export function selectProfile(id: string): void {
  if (state.activeProfileId !== id && state.profiles.some((p) => p.id === id)) commit({ ...state, activeProfileId: id });
}

/** 마지막 미션을 마친 순간 한 번 부른다 (이벤트 처리기에서). 다른 탭이 그사이 저장한 도장도 잃지 않게 저장소를 다시 읽어 합친다 */
export function recordStamp(profileId: string, place: Place, stars: number): StampOutcome | null {
  const fresh = persistEnabled ? readStored() : null;
  // 합친 값은 프로필이 있을 때만 commit으로 넣는다 (구독한 화면이 모르게 state만 바뀌지 않게)
  const base = fresh ? mergeStamps(state, fresh) : state;
  const progress = base.progress[profileId];
  if (!progress) return null;
  const { progress: next, outcome } = applyStamp(PLACES, progress, place.id, stars, localDate());
  commit({ ...base, progress: { ...base.progress, [profileId]: next } });
  return outcome;
}

export function eraseAll(): void {
  // 지우지 못했으면 기록이 기기에 남아 있으니 저장 상태 안내(D11)를 띄운다
  if (persistEnabled && !clearSave()) storageOk = false;
  state = emptySave();
  notify();
}

/** 도장·열린 단계만 합친다 (늘어나기만 하는 값이라 합쳐도 안전). 프로필 목록은 이 탭 것을 쓴다 */
function mergeStamps(mine: SaveData, other: SaveData): SaveData {
  const progress = { ...mine.progress };
  for (const id of Object.keys(progress)) {
    const o = other.progress[id];
    if (!o) continue;
    const stamps = { ...o.stamps, ...progress[id].stamps };
    for (const [pid, s] of Object.entries(o.stamps)) {
      const m = progress[id].stamps[pid];
      if (m) stamps[pid] = {
        firstDate: m.firstDate < s.firstDate ? m.firstDate : s.firstDate,
        lastDate: m.lastDate > s.lastDate ? m.lastDate : s.lastDate,
        visits: Math.max(m.visits, s.visits),
        bestStars: Math.max(m.bestStars, s.bestStars),
      };
    }
    const unlockedStages = [...new Set([...progress[id].unlockedStages, ...o.unlockedStages])].sort((a, b) => a - b);
    progress[id] = { stamps, unlockedStages };
  }
  return { ...mine, progress };
}
