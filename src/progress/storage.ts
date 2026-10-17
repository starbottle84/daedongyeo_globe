import { TIERS } from '../content/types';
import { AVATAR_COLORS, SAVE_VERSION, type Profile, type ProfileProgress, type SaveData, type StampRecord } from './types';

// 같은 GitHub 계정의 다른 앱과 키가 겹치지 않게 앱 이름을 앞에 붙인다
export const SAVE_KEY = 'daedongyeo-globe:save';
const BACKUP_KEY = 'daedongyeo-globe:save-backup';
const MAX_PROFILES = 8;

export function emptySave(): SaveData {
  return { version: SAVE_VERSION, activeProfileId: null, profiles: [], progress: {} };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isYmd = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function normProfile(v: unknown): Profile | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id) return null;
  const name = typeof v.name === 'string' && v.name.trim() ? v.name.trim().slice(0, 10) : '탐험가';
  const tier = TIERS.includes(v.tier as Profile['tier']) ? (v.tier as Profile['tier']) : 'preschool';
  const color = AVATAR_COLORS.includes(v.color as Profile['color']) ? (v.color as Profile['color']) : 'sky';
  return { id: v.id, name, tier, color, createdAt: isYmd(v.createdAt) ? v.createdAt : '2026-01-01' };
}

function normStamp(v: unknown): StampRecord | null {
  if (!isObj(v) || !isYmd(v.firstDate)) return null;
  const lastDate = isYmd(v.lastDate) ? v.lastDate : v.firstDate;
  const visits = Number.isSafeInteger(v.visits) && (v.visits as number) > 0 ? (v.visits as number) : 1;
  const bestStars = Number.isSafeInteger(v.bestStars) && (v.bestStars as number) >= 0 ? Math.min(v.bestStars as number, 99) : 0;
  return { firstDate: v.firstDate, lastDate, visits, bestStars };
}

function normProgress(v: unknown): ProfileProgress {
  const stamps: Record<string, StampRecord> = {};
  if (isObj(v) && isObj(v.stamps)) {
    // 모르는 장소 id(계획 4에서 바뀐 장소 등)의 도장도 지우지 않고 남긴다
    for (const [id, s] of Object.entries(v.stamps)) {
      const n = normStamp(s);
      if (n) stamps[id] = n;
    }
  }
  const stages = isObj(v) && Array.isArray(v.unlockedStages)
    ? v.unlockedStages.filter((s): s is number => Number.isInteger(s) && s >= 1 && s <= 5)
    : [];
  return { stamps, unlockedStages: [...new Set([1, ...stages])].sort((a, b) => a - b) };
}

/** 읽은 값을 믿지 않고 검사해서 맞는 형식으로 만든다. 못 쓰는 값이면 null */
export function normalize(raw: unknown): SaveData | null {
  if (!isObj(raw)) return null;
  const version = raw.version;
  // 더 새로운 버전(새 코드가 쓴 저장)은 건드리지 않는다 — 예전 코드 탭이 새 형식을 망가뜨리지 않게
  if (!Number.isSafeInteger(version) || (version as number) < 1 || (version as number) > SAVE_VERSION) return null;
  const profiles = (Array.isArray(raw.profiles) ? raw.profiles : [])
    .map(normProfile)
    .filter((p): p is Profile => p !== null)
    .filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i)
    .slice(0, MAX_PROFILES);
  const progress: Record<string, ProfileProgress> = {};
  for (const p of profiles) progress[p.id] = normProgress(isObj(raw.progress) ? raw.progress[p.id] : undefined);
  const active = typeof raw.activeProfileId === 'string' && profiles.some((p) => p.id === raw.activeProfileId)
    ? raw.activeProfileId
    : (profiles[0]?.id ?? null);
  return { version: SAVE_VERSION, activeProfileId: active, profiles, progress };
}

function readSlot(key: string): SaveData | null {
  try {
    const text = localStorage.getItem(key);
    return text === null ? null : normalize(JSON.parse(text));
  } catch {
    return null;
  }
}

/** 주 칸만 다시 읽는다 (다른 탭이 그사이 저장한 것과 합칠 때). 없거나 못 읽으면 null */
export function readStored(): SaveData | null {
  return readSlot(SAVE_KEY);
}

/** 주 칸이 망가졌으면 백업 칸, 둘 다 없으면 빈 저장 */
export function loadSave(): SaveData {
  return readSlot(SAVE_KEY) ?? readSlot(BACKUP_KEY) ?? emptySave();
}

/** 이 코드보다 새 버전이 쓴 저장인지 */
function isNewerSave(text: string): boolean {
  try {
    const v = (JSON.parse(text) as { version?: unknown } | null)?.version;
    return typeof v === 'number' && v > SAVE_VERSION;
  } catch {
    return false;
  }
}

/** 저장. 지금 주 칸이 멀쩡하면 백업 칸으로 옮긴 뒤 새 값을 쓴다. 성공 여부를 돌려준다 */
export function writeSave(data: SaveData): boolean {
  try {
    const current = localStorage.getItem(SAVE_KEY);
    // 새 코드가 쓴 저장은 예전 코드가 덮어쓰지 않는다 (저장 안 됨으로 알린다)
    if (current !== null && isNewerSave(current)) return false;
    if (current !== null && readSlot(SAVE_KEY)) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): boolean {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    return true;
  } catch {
    return false;
  }
}

/** 기기에 저장할 수 있는지 시험으로 써 보고 지운다 */
export function canStore(): boolean {
  try {
    const k = 'daedongyeo-globe:probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}
