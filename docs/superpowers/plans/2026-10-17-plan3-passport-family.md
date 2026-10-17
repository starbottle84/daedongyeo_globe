# 계획 3: 여권·가족 프로필·어른 확인·저장 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이마다 프로필을 두고, 여행을 마치면 도장이 그 아이의 여권에 남는다. 도장으로 다음 단계가 열린다. 부모님 공간은 어른 확인 뒤에 들어간다. 모든 기록은 기기 안에만 저장한다.

**Architecture:**
- **저장·규칙·상태:** 저장(`src/progress/storage.ts`), 규칙 순수 함수(`src/progress/rules.ts`), 상태(`src/progress/store.ts`, React 19 `useSyncExternalStore`). 새 패키지는 넣지 않는다.
- **덮개 화면:** 대화상자·어른 확인·여권 책·부모님 공간은 네이티브 `<dialog>`(`showModal`)로 띄운다. 맨 위 층에 그려지고, 초점 가두기·ESC를 브라우저가 해 준다. 그래서 `.bottom-stack` 밖에 있어 지구본 다시 맞추기에 영향이 없다.
- **화면 모양:** 지구 여권 테마(`src/styles/tokens.css`, `src/ui/ui.css`, `src/trip/trip.css`)의 가죽+종이 카드, 금박 버튼, 동글이를 그대로 쓴다.

**Tech Stack:** React 19, Vite 6, TypeScript 5.7, MapLibre 5.6(손대지 않음)

**참고:**
- 설계: [docs/superpowers/specs/2026-10-16-globe-geography-design.md](../specs/2026-10-16-globe-geography-design.md) 3·5·6·9·11·12장
- 화면 테마: [2026-10-16-passport-theme-design.md](../specs/2026-10-16-passport-theme-design.md)
- 참고 앱: `D:/결과물/숫자숲마을/src/components/AdultGate.tsx`, `src/store/storage.ts` (패턴만 참고하고 통째로 복사하지 않는다)

---

## 결정 사항 (사용자 확인용)

| # | 항목 | 결정 |
|---|---|---|
| D1 | 프로필 이름 | 부모가 이름이나 별명을 입력한다(최대 10자, 비우면 '탐험가'). 추천 별명 버튼도 둔다. 기기 안에만 저장한다 |
| D2 | 프로필 그림 | 동글이 뒤 배경색 4가지(하늘·숲·해·꽃) 중 고른다 |
| D3 | 첫 실행 | 프로필이 없으면 시작 카드 자리에 '여권 만들기'(이름·나이 구간·색)가 뜬다. 부모가 옆에 있는 장면이라 어른 확인 없이 만든다 |
| D4 | 프로필 바꾸기 | 시작 카드의 나이 탭 자리를 아이 칩(색·이름·구간)으로 바꾼다. 형제가 번갈아 누르면 바뀐다(어른 확인 없음) |
| D5 | 프로필 추가·수정·삭제 | 어른 확인을 거친다. 칩 줄의 '+'는 어른 확인 뒤 만들기, 수정·삭제는 부모님 공간에서 한다 |
| D6 | 도장 | 마지막 미션을 마치는 순간 저장한다. 같은 장소를 다시 하면 도장은 하나 그대로, 방문 횟수만 는다. 처음 받은 날짜는 남기고 고학년 별은 최고 기록을 남긴다 |
| D7 | 단계 열림 | 1단계는 처음부터 열려 있다. 한 단계 장소의 2/3(올림)만큼 도장을 모으면 다음 단계가 열린다(견본: 1단계 3곳 중 2곳). 한 번 열린 단계는 계속 열린다(계획 4에서 장소가 늘어도 다시 잠기지 않게) |
| D8 | 여행 중 ✕ | 도장 전에는 "여행을 그만할까요?" 확인을 띄운다. 큰 버튼은 '계속 여행하기', 작은 버튼은 '그만하기'다. 어른 확인은 아니다. 도장을 받은 뒤에는 바로 나간다 |
| D9 | 어른 확인 | '부모님' 버튼을 1.5초 길게 누르면 두 자리 수 더하기 문제(예: 23 + 48)가 나오고, 보기 3개 중 고른다. 문제와 보기 순서는 매번 바뀐다. 틀리면 새 문제가 나온다. 키보드로도 길게 눌러 열 수 있다 |
| D10 | 부모님 공간 | 아이 관리, 아이별 진행(도장 수·열린 단계), 장소별 배경지식(부모님 메모 + 미션 정답), 저장 상태, 기록 지우기(두 번 확인), 개인정보 문구 |
| D11 | 저장 실패 | 기기에 저장이 안 되면 놀이는 그대로 하고, 부모님 공간과 여권 책에 "이 기기에 진행이 저장되지 않고 있어요"를 보인다 |
| D12 | 나중으로 | 주간 리포트, 하루 여행 수, 가족 여행 핀, 숨은 장소, 다시 가 보기 (설계 10장 '나중에') |

---

## 모든 작업에 공통

- 브랜치 `feat/plan3-passport-family`에서 작업한다(작업 1 시작 때 main에서 만든다). 작업마다 로컬 커밋을 하고, **push는 하지 않는다**(사용자 결정).
  - 커밋 메시지는 한국어로 쓰고, 마지막 줄에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙인다.
- 사용자 규칙: 새 기능에는 자동 테스트를 만들지 않는다. 대신 아래 확인을 한다.
  - `npx tsc -p tsconfig.app.json --noEmit` → 출력 없음
  - `npm run lint` → 오류 없음
  - `npm run build` → `✓ built`
  - 화면 확인: `node scripts/shot-cdp.mjs "<주소>" "<scratchpad>/shots/<이름>.png" 390 844`
    - 숨은 크롬은 매번 빈 저장소로 시작한다. 그래서 프로필·도장이 있는 화면은 작업 1에서 만드는 개발용 `?seed=` 주소로 연다.
    - 클릭 등 동작은 `EVAL="..."` 환경변수로 한다. **Browser 창 도구는 쓰지 않는다.**
  - 순수 함수(규칙)는 `node --experimental-strip-types`로 짧은 확인 스크립트를 scratchpad에 만들어 돌려 본다. 저장소에는 넣지 않는다.
- 카드 높이 한도(지구 여권 설계 5장, 390×844): 시작 카드 ≤ 50%, 고르기 미션 ≤ 50%, 도장 ≤ 52%. 덮개 화면(`<dialog>`)은 한도 밖이다.
- 지도 지명 수(1280×800, 세 장면 ≥ 33/118/38)는 지도 코드를 건드리지 않으니 마지막 작업에서 한 번만 잰다.
- StrictMode: 리듀서·초기화 함수·마운트 효과는 개발 중 두 번 돈다. 저장은 **이벤트 처리기에서만** 부르고, 같은 값을 여러 번 써도 결과가 같게 만든다.

## 파일 구조

| 파일 | 할 일 | 책임 |
|---|---|---|
| `src/progress/types.ts` | 새로 | 저장 데이터 타입, 버전 |
| `src/progress/date.ts` | 새로 | 지역 날짜 문자열(YYYY-MM-DD) |
| `src/progress/storage.ts` | 새로 | localStorage 읽기·쓰기(주+백업 칸), 검사·정규화, 저장 가능 여부 |
| `src/progress/rules.ts` | 새로 | 단계 기준, 열린 단계, 도장 반영, 다음 장소 (순수 함수) |
| `src/progress/store.ts` | 새로 | 메모리 상태 + 동작 + 구독(`useSave`, `useStorageOk`) + 다른 탭 변경 반영 |
| `src/dev/shotParams.ts` | 고침 | `?seed=` 개발용 상태 |
| `src/ui/Modal.tsx` + `modal.css` | 새로 | `<dialog>` 껍데기(종이 카드 모양, 닫기, 초점 돌려주기) |
| `src/family/AdultGate.tsx` | 새로 | 길게 누르기 버튼 + 확인 문제 |
| `src/family/ConfirmDialog.tsx` | 새로 | 예/아니요 확인(✕ 나가기, 지우기) |
| `src/family/ProfileForm.tsx` | 새로 | 이름·나이 구간·색 입력(만들기·수정 같이 씀) |
| `src/family/ProfileChips.tsx` | 새로 | 시작 카드의 아이 칩 줄 + '+' |
| `src/family/ParentSpace.tsx` + `family.css` | 새로 | 부모님 공간 |
| `src/passport/StampSeal.tsx` | 새로 | 빨간 잉크 도장 SVG (StampCard에서 떼어 냄) |
| `src/passport/PassportBook.tsx` + `passport.css` | 새로 | 여권 책(단계별 도장판) |
| `src/App.tsx` | 고침 | tier 상태 대신 활성 프로필, 여행에 profileId, 다음 장소, 부모님 버튼·여권 책 |
| `src/trip/TripLauncher.tsx`, `trip.css` | 고침 | 아이 칩, 표의 도장·잠금, 단계 진행, 첫 실행 |
| `src/trip/TripPanel.tsx` | 고침 | 마지막 미션에서 도장 저장, ✕ 확인 |
| `src/trip/StampCard.tsx` | 고침 | 새 도장/다시 방문, 단계 열림 축하, 최고 별 |

---

### Task 1: 저장·규칙·상태 (화면 변화 없음)

**Files:** Create `src/progress/types.ts`, `date.ts`, `storage.ts`, `rules.ts`, `store.ts` · Modify `src/dev/shotParams.ts`

- [ ] **Step 0: 브랜치**

```bash
git checkout -b feat/plan3-passport-family
```

- [ ] **Step 1: `src/progress/types.ts`**

```ts
import type { Tier } from '../content/types';

/** 저장 형식 버전. 형식을 바꾸면 올리고 storage.ts의 normalize에 옛 형식 처리를 더한다 */
export const SAVE_VERSION = 1;

export type AvatarColor = 'sky' | 'leaf' | 'sun' | 'rose';
export const AVATAR_COLORS: AvatarColor[] = ['sky', 'leaf', 'sun', 'rose'];
export const AVATAR_LABELS: Record<AvatarColor, string> = { sky: '하늘색', leaf: '숲색', sun: '햇살색', rose: '꽃색' };

export interface Profile {
  id: string;
  /** 부모가 입력한 이름이나 별명 (1~10자) */
  name: string;
  tier: Tier;
  color: AvatarColor;
  /** 만든 날 (지역 날짜 YYYY-MM-DD) */
  createdAt: string;
}

export interface StampRecord {
  /** 처음 도장을 받은 날 (지역 날짜) — 다시 와도 바꾸지 않는다 */
  firstDate: string;
  lastDate: string;
  visits: number;
  /** 고학년 위치 찍기 최고 별 합 (0이면 별 없음) */
  bestStars: number;
}

export interface ProfileProgress {
  /** 장소 id → 도장 */
  stamps: Record<string, StampRecord>;
  /** 열린 단계 (오름차순, 1은 늘 들어 있음). 한 번 열리면 지우지 않는다 */
  unlockedStages: number[];
}

export interface SaveData {
  version: number;
  activeProfileId: string | null;
  profiles: Profile[];
  /** 프로필 id → 진행 */
  progress: Record<string, ProfileProgress>;
}

/** 도장을 저장한 결과 — 도장 카드에서 보여 준다 */
export interface StampOutcome {
  isNew: boolean;
  firstDate: string;
  bestStars: number;
  /** 이번 도장으로 새로 열린 단계 */
  newlyUnlocked: number[];
}
```

- [ ] **Step 2: `src/progress/date.ts`**

```ts
// 지역 날짜 문자열 (toISOString은 UTC라 한국 오전 9시 전에는 하루 전 날짜가 된다)
export function localDate(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 'YYYY-MM-DD' → '10월 16일' */
export function koreanDate(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number);
  return `${m}월 ${d}일`;
}
```

- [ ] **Step 3: `src/progress/rules.ts`** (순수 함수)

```ts
import type { Place } from '../content/types';
import type { ProfileProgress, StampOutcome } from './types';

/** 다음 단계를 여는 데 필요한 도장 수: 그 단계 장소 수의 2/3 (올림). 3곳→2, 4곳→3, 12곳→8 */
export function stageThreshold(placeCount: number): number {
  return Math.ceil((placeCount * 2) / 3);
}

/** 장소 목록에 있는 단계 (오름차순) */
export function stagesOf(places: Place[]): number[] {
  return [...new Set(places.map((p) => p.stage))].sort((a, b) => a - b);
}

/** 단계별 도장 수 / 장소 수 */
export function stageCounts(places: Place[], progress: ProfileProgress, stage: number) {
  const inStage = places.filter((p) => p.stage === stage);
  const got = inStage.filter((p) => progress.stamps[p.id]).length;
  return { got, total: inStage.length, need: stageThreshold(inStage.length) };
}

/** 저장된 열린 단계 + 지금 도장으로 열리는 단계 (한 번 열린 단계는 그대로 둔다) */
export function computeUnlocked(places: Place[], progress: ProfileProgress): number[] {
  const stages = stagesOf(places);
  const open = new Set<number>([stages[0] ?? 1, ...progress.unlockedStages]);
  for (let i = 0; i < stages.length - 1; i++) {
    if (!open.has(stages[i])) continue;
    const { got, need } = stageCounts(places, progress, stages[i]);
    if (got >= need) open.add(stages[i + 1]);
  }
  return [...open].sort((a, b) => a - b);
}

/** 도장 반영 (새 객체를 돌려준다). 처음 날짜는 지키고, 방문 횟수는 늘리고, 별은 최고 기록 */
export function applyStamp(
  places: Place[],
  progress: ProfileProgress,
  placeId: string,
  stars: number,
  today: string,
): { progress: ProfileProgress; outcome: StampOutcome } {
  const before = progress.stamps[placeId];
  const record = before
    ? { ...before, lastDate: today, visits: before.visits + 1, bestStars: Math.max(before.bestStars, stars) }
    : { firstDate: today, lastDate: today, visits: 1, bestStars: stars };
  const stamped: ProfileProgress = { ...progress, stamps: { ...progress.stamps, [placeId]: record } };
  const unlockedStages = computeUnlocked(places, stamped);
  const newlyUnlocked = unlockedStages.filter((s) => !progress.unlockedStages.includes(s) && s !== (stagesOf(places)[0] ?? 1));
  return {
    progress: { ...stamped, unlockedStages },
    outcome: { isNew: !before, firstDate: record.firstDate, bestStars: record.bestStars, newlyUnlocked },
  };
}

/** 다음에 가 볼 곳: 지금 장소 다음부터(끝에 닿으면 처음부터) 열린 단계에 있고 아직 도장이 없는 첫 장소. 없으면 null */
export function nextPlaceFor(places: Place[], progress: ProfileProgress, current: Place): Place | null {
  const open = new Set(computeUnlocked(places, progress));
  const start = places.indexOf(current);
  for (let k = 1; k < places.length; k++) {
    const p = places[(start + k) % places.length];
    if (open.has(p.stage) && !progress.stamps[p.id]) return p;
  }
  return null;
}

export function emptyProgress(): ProfileProgress {
  return { stamps: {}, unlockedStages: [1] };
}
```
`newlyUnlocked` 계산에서 첫 단계를 빼는 이유: 첫 단계는 처음부터 열려 있어서 '새로 열림'이 아니다. 저장된 `unlockedStages`에 1이 없는 옛 데이터를 만나도 축하가 잘못 뜨지 않게 하려는 것이다.

- [ ] **Step 4: `src/progress/storage.ts`** — 숫자숲마을 `storage.ts`의 주+백업 칸 패턴을 줄여서 쓴다.

```ts
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

/** 주 칸이 망가졌으면 백업 칸, 둘 다 없으면 빈 저장 */
export function loadSave(): SaveData {
  return readSlot(SAVE_KEY) ?? readSlot(BACKUP_KEY) ?? emptySave();
}

/** 저장. 지금 주 칸이 멀쩡하면 백업 칸으로 옮긴 뒤 새 값을 쓴다. 성공 여부를 돌려준다 */
export function writeSave(data: SaveData): boolean {
  try {
    const current = localStorage.getItem(SAVE_KEY);
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
```

- [ ] **Step 5: `src/progress/store.ts`**

```ts
import { useSyncExternalStore } from 'react';
import { PLACES } from '../content';
import type { Place, Tier } from '../content/types';
import { localDate } from './date';
import { applyStamp, emptyProgress } from './rules';
import { canStore, clearSave, emptySave, loadSave, normalize, SAVE_KEY, writeSave } from './storage';
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
  // 브라우저가 공간이 모자랄 때 이 앱 저장을 먼저 지우지 않게 부탁한다 (안 되면 그만)
  void navigator.storage?.persist?.().catch(() => undefined);
  // 다른 탭(홈 화면 앱과 브라우저 탭 등)이 저장하면 다시 읽는다
  window.addEventListener('storage', (e) => {
    if (e.key !== SAVE_KEY && e.key !== null) return;
    state = loadSave();
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

export function createProfile(input: { name: string; tier: Tier; color: AvatarColor }): Profile {
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
  if (persistEnabled) {
    const fresh = normalize(safeParse(localStorage.getItem(SAVE_KEY)));
    if (fresh) state = mergeStamps(state, fresh);
  }
  const progress = state.progress[profileId];
  if (!progress) return null;
  const { progress: next, outcome } = applyStamp(PLACES, progress, place.id, stars, localDate());
  commit({ ...state, progress: { ...state.progress, [profileId]: next } });
  return outcome;
}

export function eraseAll(): void {
  if (persistEnabled) clearSave();
  state = emptySave();
  notify();
}

function safeParse(text: string | null): unknown {
  try {
    return text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
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
```
`localStorage` 직접 읽기(`recordStamp` 안)는 저장이 막힌 환경에서 예외가 날 수 있으니 `try`로 감싸거나 `safeParse` 앞에서 접근을 감싼다(구현할 때 `readRawSave()` 같은 작은 함수로 storage.ts에 두고 try/catch).

- [ ] **Step 6: 앱 시작 때 초기화** — `src/main.tsx`에서 `createRoot(...)` 전에 `initProgress(readSeed() ?? undefined);`를 부른다(아래 Step 7의 `readSeed`).

- [ ] **Step 7: 개발용 `?seed=`** — `src/dev/shotParams.ts`에 더한다(배포 빌드에서는 늘 null).

```ts
import type { SaveData } from '../progress/types';

/** 개발 중 화면 확인용 진행 상태: ?seed=new(프로필 없음) | one(유아 1명, 도장 없음) | siblings(유아·고학년, 1단계 도장 2개 = 2단계 열림) | full(모든 도장)
 *  이 상태는 저장하지 않는다 */
export function readSeed(): SaveData | null {
  if (!import.meta.env.DEV) return null;
  const kind = new URLSearchParams(location.search).get('seed');
  if (!kind) return null;
  // 각 경우에 맞는 SaveData를 만들어 돌려준다 (프로필 id는 'kid-a', 'kid-b'처럼 고정, 날짜는 '2026-10-16')
  ...
}
```
`...` 자리는 구현자가 위 네 경우를 실제 객체로 채운다. `siblings`에서는 kid-a(유아, 하늘색, '하늘')가 1단계 pacific·asia 도장을 갖고 `unlockedStages: [1, 2]`다. kid-b(고학년, 해색, '바다')는 도장이 없고 `[1]`이다. 활성은 kid-a다.
`?shot=`과 같이 쓸 수 있어야 한다(예: `?seed=siblings&shot=jeju:preschool:stamp`).

- [ ] **Step 8: 확인**
  - tsc·lint·build를 통과한다.
  - scratchpad에 `rules-check.ts`를 만들어 `node --experimental-strip-types`로 돌린다. 장소 7곳 흉내 데이터로 다음을 확인한다.
    - `stageThreshold(3)=2`, `stageThreshold(4)=3`, `stageThreshold(12)=8`
    - 1단계 도장 2개면 `computeUnlocked`가 `[1,2]`
    - `applyStamp`를 두 번 하면 `visits` 2, `firstDate`는 그대로, `bestStars`는 최고값
    - `nextPlaceFor`가 잠긴 단계와 도장 받은 곳을 건너뛰고, 끝에서 처음으로 돌아간다
  - `normalize`에 깨진 값을 넣는다(버전 2, 프로필 id 중복, 이상한 tier). 각각 null 또는 정리된 값이 나와야 한다.
  - 화면은 그대로다. 캡처(`?seed=siblings`)에서 오류가 없어야 한다.

- [ ] **Step 9: Commit** — `feat: 진행 저장(주+백업 칸)·단계 열림 규칙·진행 상태, 개발용 ?seed= 상태`

---

### Task 2: 덮개 껍데기·어른 확인·✕ 확인

**Files:** Create `src/ui/Modal.tsx`, `src/ui/modal.css`, `src/family/AdultGate.tsx`, `src/family/ConfirmDialog.tsx` · Modify `src/trip/TripPanel.tsx`, `src/main.tsx`(css import)

- [ ] **Step 1: `src/ui/Modal.tsx`** — 네이티브 `<dialog>`를 쓴다.

```tsx
import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  /** 화면 읽기용 제목 (보이는 제목 요소의 id를 주면 그걸 쓴다) */
  labelledBy?: string;
  label?: string;
  onClose: () => void;
  /** 'sheet' = 가운데 종이 카드, 'full' = 화면 가득(여권 책·부모님 공간) */
  size?: 'sheet' | 'full';
  children: ReactNode;
}

// 덮개 화면: <dialog>.showModal()로 맨 위 층에 띄운다 — 초점 가두기·ESC 닫기는 브라우저가 해 주고,
// 닫으면 브라우저가 연 버튼으로 초점을 돌려준다. 아래 카드 묶음 밖이라 지구본 다시 맞추기에도 영향이 없다.
export function Modal({ open, labelledBy, label, onClose, size = 'sheet', children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget && size === 'sheet') onClose(); }}
    >
      <div className="passport modal__card"><div className="page">{children}</div></div>
    </dialog>
  );
}
```
`modal.css`: `dialog.modal`의 기본 테두리·여백을 없앤다. `::backdrop`은 `rgba(10,20,40,.55)`로 깐다. `modal--sheet`는 `width: min(440px, calc(100vw - 32px))`, `modal--full`은 `width: min(720px, 100vw); height: min(100dvh, 900px)`이고 종이 안에서 스크롤한다. 등장은 opacity·transform만 짧게 하고, 움직임 줄이기에서는 끈다.

- [ ] **Step 2: `src/family/ConfirmDialog.tsx`**

```tsx
import { useId } from 'react';
import { Dongle } from '../ui/Dongle';
import { Modal } from '../ui/Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: string;
  /** 안전한 쪽 (크게, 앞에) */
  keepLabel: string;
  /** 되돌리기 어려운 쪽 (작게) */
  leaveLabel: string;
  onKeep: () => void;
  onLeave: () => void;
}

export function ConfirmDialog({ open, title, body, keepLabel, leaveLabel, onKeep, onLeave }: ConfirmDialogProps) {
  const id = useId();
  return (
    <Modal open={open} labelledBy={`${id}-t`} onClose={onKeep}>
      <div className="say">
        <Dongle mood="think" size="md" decorative />
        <div>
          <h2 id={`${id}-t`} className="modal__title ko">{title}</h2>
          {body && <p className="modal__body ko">{body}</p>}
        </div>
      </div>
      <button type="button" className="btn" autoFocus onClick={onKeep}>{keepLabel}</button>
      <button type="button" className="link-button modal__leave" onClick={onLeave}>{leaveLabel}</button>
    </Modal>
  );
}
```

- [ ] **Step 3: TripPanel ✕ 확인 (D8)** — `src/trip/TripPanel.tsx`

```tsx
  const [confirmExit, setConfirmExit] = useState(false);
  // 도장을 받기 전에는 실수로 나가지 않게 한 번 묻는다 (도장 뒤에는 이미 저장했으니 바로 나간다)
  const requestExit = () => (state.step === 'stamp' || state.step === 'talk' ? onExit() : setConfirmExit(true));
```
✕ 버튼의 `onClick={onExit}`을 `onClick={requestExit}`로 바꾼다. 패널 끝(섹션 안)에 둔다.

```tsx
      <ConfirmDialog
        open={confirmExit}
        title="여행을 그만할까요?"
        body="끝까지 하면 여권에 도장을 받아요."
        keepLabel="계속 여행하기"
        leaveLabel="그만하기"
        onKeep={() => setConfirmExit(false)}
        onLeave={onExit}
      />
```
단계가 바뀔 때 패널로 초점을 옮기는 효과와 부딪히지 않게 한다. 대화상자가 열려 있는 동안에는 단계가 바뀌지 않으니 그대로 두되, 닫힐 때 초점이 ✕로 돌아오는지 확인한다.

- [ ] **Step 4: `src/family/AdultGate.tsx` (D9)**

```tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';

interface AdultGateProps {
  /** 버튼 글자 (예: '부모님') */
  label: string;
  /** 버튼 접근 이름 (예: '부모님 공간 — 길게 누르기') */
  ariaLabel: string;
  className?: string;
  holdMs?: number;
  onUnlock: () => void;
  children?: React.ReactNode;
}

interface Question { a: number; b: number; options: number[] }

function makeQuestion(): Question {
  const a = 11 + Math.floor(Math.random() * 39);
  const b = 11 + Math.floor(Math.random() * 39);
  const answer = a + b;
  const wrong = new Set<number>();
  for (const d of [10, -10, 1, -1, 11, -9]) {
    if (wrong.size === 2) break;
    if (answer + d > 0) wrong.add(answer + d);
  }
  const options = [answer, ...wrong].sort(() => Math.random() - 0.5);
  return { a, b, options };
}

// 어른 확인: 신원 확인이 아니라 아이가 실수로 들어가지 않게 하는 '한 번 더 생각하기'.
// 1) 버튼을 holdMs 동안 누르고 있으면(손가락·마우스·키보드 Space/Enter 모두) 2) 두 자리 수 더하기 문제가 나오고 3) 맞히면 연다.
export function AdultGate({ label, ariaLabel, className, holdMs = 1500, onUnlock, children }: AdultGateProps) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [holding, setHolding] = useState(false);
  const [q, setQ] = useState<Question>(makeQuestion);
  const [wrong, setWrong] = useState(false);
  const timer = useRef<number | null>(null);
  const done = useRef(false);
  const id = useId();

  const clear = () => { if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; } };
  const start = useCallback(() => {
    clear();
    done.current = false;
    setHint(false);
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      done.current = true;
      setHolding(false);
      setQ(makeQuestion());
      setWrong(false);
      setOpen(true);
    }, holdMs);
  }, [holdMs]);
  const end = () => {
    const wasHolding = timer.current !== null;
    clear();
    setHolding(false);
    if (wasHolding && !done.current) setHint(true);
  };
  const cancel = () => { clear(); setHolding(false); };
  useEffect(() => () => clear(), []);
  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(false), 3000);
    return () => clearTimeout(t);
  }, [hint]);

  const choose = (v: number) => {
    if (v === q.a + q.b) { setOpen(false); onUnlock(); return; }
    setWrong(true);
    setQ(makeQuestion());
  };

  return (
    <span className={`adult-gate ${className ?? ''}`}>
      <button
        type="button"
        className={`adult-gate__btn${holding ? ' is-holding' : ''}`}
        aria-label={ariaLabel}
        style={{ ['--hold' as string]: `${holdMs}ms` }}
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } }}
      >
        {children}
        <span>{label}</span>
      </button>
      {hint && <span className="adult-gate__hint" role="status">길게 눌러 주세요</span>}
      <Modal open={open} labelledBy={`${id}-t`} onClose={() => setOpen(false)}>
        <h2 id={`${id}-t`} className="modal__title">어른 확인</h2>
        <p className="modal__body ko">아래 문제의 답을 골라 주세요.</p>
        <p className="adult-gate__q" aria-live="polite">{q.a} + {q.b} = ?</p>
        <div className="adult-gate__options">
          {q.options.map((v) => (
            <button key={`${q.a}-${q.b}-${v}`} type="button" className="choice adult-gate__opt" onClick={() => choose(v)}>{v}</button>
          ))}
        </div>
        {wrong && <p className="adult-gate__wrong" role="status">다시 한 번 풀어 주세요.</p>}
        <button type="button" className="link-button" onClick={() => setOpen(false)}>닫기</button>
      </Modal>
    </span>
  );
}
```
- **CSS (`modal.css`에 같이 둔다):**
  - `.adult-gate__btn`: 가죽 알약(로고와 같은 질감), 높이 48px, `touch-action: none; user-select: none; -webkit-touch-callout: none`.
  - 누르는 동안(`.is-holding`) 안쪽 금색 띠가 `--hold` 동안 왼쪽에서 오른쪽으로 차오른다. `transform: scaleX`로 움직인다.
  - `.adult-gate__hint`는 `position: absolute`로 버튼 아래 말풍선으로 띄운다.
  - 보기 버튼은 64×64 이상이다.
- **확인:** 1.5초 누르면 열리고, 짧게 누르면 안내가 3초 뒤 사라진다. 틀리면 새 문제가 나온다. ESC와 닫기 버튼으로 닫힌다. 키보드로 Space를 1.5초 누르면 열린다.

- [ ] **Step 5: 확인**
  - tsc·lint·build를 통과한다.
  - 캡처: `?shot=jeju:preschool:mission1` + `EVAL`로 ✕를 클릭해 확인 창을 찍는다(390×844, 1024×768). '계속 여행하기'를 누르면 미션이 그대로이고, '그만하기'를 누르면 시작 카드로 돌아간다.
  - AdultGate는 Task 3·6에서 화면에 붙으므로, 여기서는 임시로 붙이지 말고 코드 리뷰와 Task 3 캡처에서 확인한다.

- [ ] **Step 6: Commit** — `feat: 덮개 껍데기(dialog)·어른 확인·여행 그만하기 확인`

---

### Task 3: 프로필 — 첫 실행·아이 칩·추가

**Files:** Create `src/family/ProfileForm.tsx`, `src/family/ProfileChips.tsx`, `src/family/family.css` · Modify `src/App.tsx`, `src/trip/TripLauncher.tsx`, `src/trip/trip.css`, `src/ui/LogoBadge.tsx`(옆에 부모님 버튼 자리)

- [ ] **Step 1: `ProfileForm.tsx` (D1·D2)** — 만들기와 수정에 같이 쓴다.
  - **Props:** `{ initial?: { name; tier; color }, submitLabel: string, onSubmit(values), onCancel?() }`
  - **이름:**
    - `<input type="text" maxLength={10} autoComplete="off" enterKeyHint="done">`, 라벨 "이름이나 별명"
    - 추천 별명 버튼 4개('하늘', '바다', '별님', '숲속')는 누르면 입력칸을 채운다.
    - 비우면 '탐험가'다.
  - **나이 구간:** 지금 `.tiers` 모양 그대로(유아·저학년·고학년). `role="radiogroup"`과 `aria-checked`로 쓴다.
  - **색:** 동글이(작게)를 색 동그라미 4개 안에 넣는다. `--avatar` 색: sky `#BFE3F2`, leaf `#CDE8B5`, sun `#FBE3A6`, rose `#F6CBD3`. `role="radiogroup"`이고 이름은 `AVATAR_LABELS`.
  - **제출:** 금박 `.btn`.
  - **입력 검사:** 이름은 앞뒤 공백을 지우고 10자를 넘기면 자른다. 오류 상태는 없다(비우면 '탐험가').
- [ ] **Step 2: 첫 실행 (D3)** — `TripLauncher`가 `profiles.length === 0`이면 펼친 여권 대신 이 화면을 그린다.
  - 같은 `.passport.launcher` 껍데기 안에 동글이 말풍선 "탐험가 여권을 만들어 볼까?"를 두고, 그 아래 `ProfileForm`(submit '여권 만들기')을 둔다.
  - 만들면 `createProfile()`가 활성 프로필이 되고 펼친 여권으로 바뀐다.
  - 높이는 390×844에서 60% 이하이고, 넘치면 종이 안에서 스크롤한다(처음 한 번만 보는 화면이라 50% 한도의 예외).
- [ ] **Step 3: `ProfileChips.tsx` (D4·D5)** — 시작 카드의 `.tiers` 자리를 대신한다.
  - **칩:** 색 동그라미 안의 작은 동글이 + 이름 + 작은 구간 글자(유아/저학년/고학년). `aria-pressed`로 표시하고, 누르면 `selectProfile`이다.
  - **배치:** 한 줄이다. 넘치면 가로로 스크롤하고(스크롤 막대는 숨김), 고른 칩은 보이게 스크롤한다.
  - **'+' 칩:** `AdultGate`(label 없이 '+' 그림, ariaLabel '아이 추가 — 길게 누르기')를 쓴다. 풀리면 `Modal` 안의 `ProfileForm`(submit '추가하기')이 열리고, 만들면 그 아이가 활성이 된다.
    - `profiles.length >= MAX_PROFILES`(storage.ts, 8명)이면 '+' 칩을 숨긴다. `createProfile()`도 이때는 만들지 않고 `null`을 돌려준다(읽을 때 8명으로 자르므로 9번째가 새로고침에 사라지지 않게).
  - **높이:** 지금 `.tiers`와 같다(48px).
- [ ] **Step 4: App** — `tier` 상태를 지우고 `const save = useSave(); const active = save.profiles.find((p) => p.id === save.activeProfileId) ?? null;`로 바꾼다.
  - `Trip`에 `profileId: string | null`을 더한다. 시작할 때 `{ place, tier: active.tier, profileId: active.id }`로 만든다.
  - `?shot=`으로 연 여행은 `?seed=`가 있으면 그 활성 프로필을 쓰고, 없으면 `profileId: null`이다(저장하지 않음).
  - TripPanel `key`에 profileId를 더한다.
  - `TripLauncher`에 `profiles`, `activeProfile`을 넘기고, `onTierChange`는 없앤다.
- [ ] **Step 5: 부모님 버튼 자리** — 첫 화면 왼쪽 위, 로고 오른쪽에 같은 줄로 `AdultGate`(label '부모님', ariaLabel '부모님 공간 — 길게 누르기', 자물쇠 아이콘)를 둔다.
  - 이 단계에서는 `onUnlock`이 `ParentSpace`를 여는 자리만 만든다. Task 6 전까지는 빈 `Modal`에 "준비 중" 대신 아이 목록만 보이게 두어도 된다.
  - 여행 중에는 숨긴다(`.app--trip`).
  - 출처 표시 알약·지도 버튼과 겹치지 않는지 360×740과 1024×768에서 확인한다.
- [ ] **Step 6: 확인**
  - tsc·lint·build를 통과한다.
  - 캡처:
    - `?seed=new` → 여권 만들기 화면
    - `?seed=one`, `?seed=siblings` → 칩 줄
    - `?seed=siblings` + `EVAL`로 두 번째 칩 클릭 → 고학년 칩이 고른 상태
    - `?seed=new`에서 이름 입력·구간·색을 고르고 만들기 → 펼친 여권
  - 저장을 확인한다. 같은 크롬 프로필을 유지해야 하므로 짧은 CDP 스크립트로 한다. 만들기 → 새로고침 → 프로필이 남아 있어야 한다.
  - 시작 카드 높이는 50% 이하다(`?seed=siblings`, 390×844).

- [ ] **Step 7: Commit** — `feat: 가족 프로필(첫 실행 여권 만들기, 아이 칩으로 바꾸기, 어른 확인 뒤 추가), 나이 구간은 프로필에서`

---

### Task 4: 여행 저장 연결·도장 카드·시작 카드 표 상태

**Files:** Modify `src/trip/TripPanel.tsx`, `src/trip/StampCard.tsx`, `src/App.tsx`, `src/trip/TripLauncher.tsx`, `src/trip/trip.css`

- [ ] **Step 1: 도장 저장 시점 (D6)** — TripPanel의 `onDone` 처리기에서, 마지막 미션이면 저장하고 결과를 상태에 둔다.

```tsx
  const [stampOutcome, setStampOutcome] = useState<StampOutcome | null>(null);
  // 마지막 정답을 빠르게 두 번 눌러도 한 여행에 한 번만 저장한다 (두 번 부르면 방문 횟수가 2가 되고 '또 왔어요'가 뜬다)
  const stampedRef = useRef(false);
  const handleDone = (result: MissionResult) => {
    const isLast = state.missionIndex + 1 >= missions.length;
    if (isLast && profileId && !stampedRef.current) {
      stampedRef.current = true;
      const results = [...state.results, result];
      const stars = results.reduce((sum, r) => sum + (r.stars ?? 0), 0);
      setStampOutcome(recordStamp(profileId, place, stars));
    }
    dispatch({ type: 'missionDone', result });
  };
```
`MissionView`의 `onDone`에 `handleDone`을 넘긴다. 리듀서는 그대로 둔다(순수 함수). 개발용 `initialStep`으로 stamp 단계를 바로 열었으면 `stampOutcome`은 null이고 저장하지 않는다. 이때 도장 카드는 '새 도장' 모습으로 보인다.
- [ ] **Step 2: 다음 장소** — App의 `nextPlace` 계산을 `nextPlaceFor(PLACES, progressOfActive, trip.place)`로 바꾼다. 도장을 저장하면 상태가 바뀌어 다시 그려지므로, 저장 → 열림 → 다음 장소 순서가 자연히 맞는다. 프로필이 없으면(개발용 shot) 예전처럼 배열 다음 장소를 쓴다.
- [ ] **Step 3: StampCard** — props에 `outcome?: StampOutcome | null`을 더한다.
  - **새 도장:** 지금 그대로 "OO 도장을 받았어요!"
  - **다시 방문(`!outcome.isNew`):** 제목 "또 왔어요! 도장은 그대로예요". 도장 날짜는 `koreanDate(outcome.firstDate)`(처음 받은 날)이다.
  - **단계 열림(`outcome.newlyUnlocked.length`):** 금색 알약 "2단계 · 우리나라가 열렸어요!"를 도장 아래에 한 줄 둔다(스티커처럼 살짝 기울임). 52% 한도를 넘으면 다음 장소 말풍선 문구를 줄인다.
  - **고학년:** 별 알약에 이번 별과 최고 별 중 큰 값을 보인다. 최고 기록을 넘었으면 "최고 기록!"을 붙인다.
  - **날짜:** 다시 방문에서는 처음 날짜를 쓴다. 렌더마다 `new Date()`를 쓰는 지금 코드는 `outcome?.firstDate ?? localDate()`로 바꾼다.
- [ ] **Step 4: 시작 카드 표 상태** — `TripLauncher`가 활성 프로필의 진행을 받는다.
  - **단계 제목:** 오른쪽에 `도장 n/m`(작은 금색 글자)을 둔다.
  - **도장 받은 표:** 오른쪽 위에 작은 빨간 원형 도장 자국(`StampSeal` 작게, Task 5에서 만드는 경우 우선 CSS 원으로)을 둔다. 접근 이름에 "도장 받음"을 더한다(예: `aria-label="태평양, 도장 받음"`).
  - **잠긴 단계:**
    - 표 위에 반투명 종이 덮개와 자물쇠를 둔다. 버튼은 `aria-disabled="true"`이고 누르면 동글이 말풍선이 "1단계 도장을 1개 더 모으면 열려요!"로 바뀐다(2초 뒤 되돌림, `role="status"`).
    - 단계 제목 오른쪽은 `🔒 1개 더` 같은 문구다.
  - **높이:** 시작 카드 50% 이하를 지킨다.
- [ ] **Step 5: 확인**
  - tsc·lint·build를 통과한다.
  - 캡처:
    - `?seed=one` → 2단계가 잠긴 시작 카드
    - `?seed=siblings` → 2단계 열림, 태평양·아시아에 도장 자국
    - 잠긴 표 클릭 → 말풍선 안내
  - 흐름 확인: 짧은 CDP 스크립트로 같은 크롬 프로필을 유지한다.
    1. `?seed` 없이 프로필을 만든다.
    2. 남극 여행을 끝까지 한다(미션 정답 클릭과 지도 누르기 흉내는 지금까지 쓴 방식).
    3. 도장 카드에 '새 도장'이 보인다.
    4. 새로고침하면 남극 표에 도장 자국이 있다.
    5. 태평양도 끝내면 '2단계 · 우리나라가 열렸어요!'가 뜨고, 시작 카드의 2단계가 열린다.
    6. 남극을 다시 하면 '또 왔어요'와 처음 날짜가 보인다.
  - 형제 분리: 두 번째 아이로 바꾸면 도장이 없다.
  - ✕ 확인이 도장 전에만 뜬다.

- [ ] **Step 6: Commit** — `feat: 마지막 미션에서 도장 저장, 다시 방문·단계 열림 도장 카드, 시작 카드 표에 도장 자국·잠금, 다음 장소는 열린 곳 중 안 가 본 곳`

---

### Task 5: 여권 책

**Files:** Create `src/passport/StampSeal.tsx`, `src/passport/PassportBook.tsx`, `src/passport/passport.css` · Modify `src/trip/StampCard.tsx`, `src/trip/TripLauncher.tsx`

- [ ] **Step 1: `StampSeal`** — StampCard의 빨간 잉크 도장 SVG를 `{ name: string; date: string; size?: number }` props 컴포넌트로 떼어 낸다. 잉크 필터와 글자 길 id는 `useId`로 고유하게 만든다. StampCard는 이것을 쓴다(겉모습은 변화 없음).
- [ ] **Step 2: 여권 책 열기** — 시작 카드의 아이 칩 줄 오른쪽 끝에 '여권' 버튼(가죽 작은 책 아이콘, 48px, aria-label "OO의 여권 보기")을 둔다. 누르면 `PassportBook`(`Modal size="full"`)이 열린다.
- [ ] **Step 3: `PassportBook`**
  - **머리:** 가죽 표지 띠에 금박 문장, "OO의 지구 여권", 아이 색 동그라미 동글이, 구간 글자.
  - **단계마다 한 쪽(종이):**
    - 제목 "1단계 · 둥근 지구 — 도장 2/3"
    - 도장판: 3칸 격자(넓으면 4칸)이고 장소마다 한 칸이다.
      - 받은 칸: `StampSeal`(작게, 살짝 다른 기울기) + 장소 이름 + 처음 날짜. 고학년은 최고 별 ★.
      - 안 받은 칸: 점선 원 안에 흐린 `PlaceArt` + 장소 이름.
    - 잠긴 단계: 쪽 전체를 흐린 덮개로 덮고 자물쇠와 "1단계 도장 1개 더 모으면 열려요"를 둔다.
  - **아래:** 저장 상태 안내(D11, `useStorageOk()`가 false일 때만) "이 기기에 진행이 저장되지 않고 있어요. 부모님께 알려 주세요."
  - **닫기:** 머리 오른쪽 ✕(`.close`)와 ESC.
  - **움직임:** 받은 도장은 처음 열 때 하나씩 살짝 '쿵' 하고 나타난다(transform·opacity, 0.05초 간격). 움직임 줄이기에서는 없다.
- [ ] **Step 4: 확인**
  - tsc·lint·build를 통과한다.
  - 캡처: `?seed=siblings` + 여권 버튼 클릭(390×844, 1024×768, 360×740). `?seed=one`(빈 여권)과 `?seed=full`도 찍는다.
  - 화면 읽기: 도장 칸마다 "태평양, 도장 받음, 10월 16일" 또는 "남극, 아직 안 받음"으로 읽힌다(숨김 글자 또는 aria-label).

- [ ] **Step 5: Commit** — `feat: 여권 책(단계별 도장판·잠긴 단계·처음 받은 날), 도장 그림 컴포넌트로 떼어 냄`

---

### Task 6: 부모님 공간

**Files:** Create `src/family/ParentSpace.tsx` · Modify `src/family/family.css`, `src/App.tsx`

- [ ] **Step 1: 열기** — Task 3에서 둔 '부모님' AdultGate가 풀리면 `ParentSpace`(`Modal size="full"`, 제목 "부모님 공간")가 열린다. 새로고침하면 닫힌 상태로 시작한다(게이트를 건너뛸 수 없음).
- [ ] **Step 2: 구성 (D10)** — 위에서 아래로:
  1. **머리:** "부모님 공간"과 닫기(✕).
  2. **아이들:** 아이마다 한 줄이다.
     - 색 동글이, 이름, 구간, `도장 n/전체`, 열린 단계.
     - '수정' 버튼은 같은 자리에서 `ProfileForm`(submit '저장')이 펼쳐진다.
     - '삭제' 버튼은 `ConfirmDialog`(title "OO의 여권을 지울까요?", body "도장과 기록이 모두 지워지고 되돌릴 수 없어요.", keep '아니요, 그대로 둘게요', leave '네, 지울게요')를 띄운다.
     - 아래에 '아이 추가'(바로 `ProfileForm`, 여기는 이미 어른 확인을 지났으므로 게이트 없음)를 둔다. `profiles.length >= MAX_PROFILES`이면 숨긴다(Task 3의 '+' 칩과 같은 규칙).
  3. **장소별 배경지식:**
     - 단계별로 묶은 접기 목록(`<details>`)이다. 장소마다 `parentNote`를 보인다.
     - 펼치면 그 장소의 미션 정답을 나이 구간별로 보인다.
       - 고르기: 질문 → 정답 보기
       - 방향: 질문 → "OO쪽"
       - 찾아 누르기·핀: "지도에서 OO" 형식, 장소 이름
     - 활성 아이의 구간을 먼저 펼친다.
  4. **저장 상태:**
     - 정상이면 "모든 기록은 이 기기에만 저장돼요. 계정·광고·외부 전송이 없어요."
     - 실패면(D11) 살구색 카드 "이 기기에 진행이 저장되지 않고 있어요. 사생활 보호(시크릿) 모드에서는 창을 닫으면 기록이 사라져요."
     - 아이폰·아이패드에서는 "홈 화면에 추가하면 기록이 더 오래 남아요" 한 줄을 붙인다(`navigator.standalone`이 false이고 iOS일 때만).
  5. **기록 지우기:** 처음엔 작은 버튼 '이 기기의 기록 모두 지우기'다. 누르면 `ConfirmDialog`(keep '아니요, 그대로 둘게요' / leave '네, 모두 지울게요')를 띄우고, 지우면 `eraseAll()` 뒤 부모님 공간을 닫는다. 프로필이 없어지므로 첫 실행 화면이 된다.
- [ ] **Step 3: 확인**
  - tsc·lint·build를 통과한다.
  - 캡처: `?seed=siblings`에서 부모님 버튼을 길게 누른다(CDP로 pointerdown → 1.6초 → pointerup). 이어서 문제 보기 중 정답 클릭(EVAL로 문제 글자를 읽어 계산) → 부모님 공간 → 배경지식 하나 펼침.
  - 수정·삭제·지우기 확인 창을 찍는다.
  - 저장 막힘 흉내: CDP로 `localStorage.setItem`을 막는 스크립트를 먼저 주입한 뒤 열면 실패 안내가 보인다.

- [ ] **Step 4: Commit** — `feat: 부모님 공간(아이 관리·진행·장소 배경지식과 정답·저장 상태·기록 지우기)`

---

### Task 7: 전체 확인

- [ ] **Step 0: 작업 1–5 검토에서 넘어온 작은 항목** (먼저 고치고 아래 확인을 한다)
  1. **이름 칸 `enterKeyHint`:** `next` → `done`으로 되돌리고 주석도 '완료'로 고친다. 안드로이드 크롬은 'next' 단추에서 Enter를 보내지 않아, 눌러도 아무 일이 없고 키보드가 남는다. 'done'이면 Enter가 와서 지금 처리(제출 막기 → 나이 칸으로 초점)가 동작한다.
  2. **단계 열림 띠 (360×740):** `.visa__unlock`이 낮은 화면(도장 자리 120px)에서 도장 날짜에 겹친다. 낮은 화면 규칙에서 겹치는 양을 도장 크기에 맞춰 줄인다.
  3. **잠긴 표 접근 이름:** 예) `aria-label="서울, 잠김 — 1단계 도장 1개 더 모으면 열려요"`. 도장 받은 표의 'OO, 도장 받음'과 짝을 맞춘다.
  4. **잠긴 표 안내 읽기:** 말풍선을 `role="status"`로 두면, 2초 뒤 '어디로 떠나 볼까?'로 돌아갈 때도 한 번 더 읽힌다. 안내 문구는 따로 숨김 상태 줄(`.visually-hidden` + `role="status"`)에 넣고, 말풍선 자체는 상태 줄로 쓰지 않는다.
  5. **잠긴 표 흔들기:** 누른 표만 흔들리게 하고, 2초 안에 다시 눌러도 다시 흔들리게 한다(애니메이션 키를 바꿔 다시 시작).
  6. **잠금 안내 문구 (계획 4 대비):** 앞 단계도 잠겨 있으면 '앞 단계부터 열어요'처럼 바로 앞의 열린 단계 기준으로 안내한다.
  7. **여권 책 도장 칸 접근성:**
     - 보이는 이름·날짜를 `aria-hidden`으로 숨기지 말고 그대로 읽히게 한다(VoiceOver로 더듬어 훑어도 읽히게). 도장 그림만 숨긴다.
     - '도장 받음/아직 안 받음'은 숨김 글자로 붙인다.
     - 한 덩어리 글로 만들어(템플릿 문자열) 세 번 끊겨 읽히지 않게 한다.
  8. **여권 책 그리기:** 닫혀 있을 때는 그리지 않는다(열 때만 `PassportBook` 내용을 그림). 계획 4에서 장소가 24곳이 되면 숨은 도장 SVG가 늘어나기 때문이다.
  9. **`StampSeal`의 쓰지 않는 `size` prop:** 지운다.
  10. **작업 1 남은 것:**
      - `nextPlaceFor`의 시작 위치는 `places.findIndex((p) => p.id === current.id)`로 찾는다.
      - `updateProfile`은 `tier: patch.tier ?? p.tier, color: patch.color ?? p.color`로 덮는다.
      - 주 칸이 더 새로운 버전이면 처음부터 저장 안 됨 안내가 뜨게 한다. `storage.ts`에 `storedIsNewer()`를 두고 `initProgress`에서 `storageOk = canStore() && !storedIsNewer()`로 한다.
      - 계획 Task 1 머리에 "구현 뒤 검토로 바뀐 점은 `src/progress/*.ts` 실제 코드가 기준"이라고 한 줄 적는다.

- [ ] **Step 1: 코드 검사** — tsc·lint·build를 통과한다. 지명 수(1280×800 세 장면 ≥ 33/118/38, 지구 여권 계획 작업 7 Step 3 방법)를 잰다.
- [ ] **Step 2: 시나리오** — 같은 크롬 프로필을 유지하는 CDP 스크립트로 처음부터 끝까지 확인한다.
  1. 빈 저장소에서 연다 → 여권 만들기(유아 '하늘').
  2. 1단계 3곳을 모두 마친다. 2곳째에서 2단계가 열린다.
  3. 새로고침한다 → 도장 3개와 2단계 열림이 남아 있다.
  4. '+'(어른 확인)로 고학년 '바다'를 추가한다. 바다는 도장이 없고 2단계가 잠겨 있다.
  5. 바다로 핀 미션 장소를 마친다 → 별 최고 기록이 보인다.
  6. 하늘로 돌아가 같은 장소를 다시 한다 → '또 왔어요'.
  7. 부모님 공간에서 바다 이름을 바꾸고 하늘을 지운다 → 칩 줄이 바뀐다.
  8. 기록을 모두 지운다 → 여권 만들기 화면.
  9. 여행 중 ✕ 확인은 도장 전에만 뜨고, '계속 여행하기'를 누르면 그대로 이어진다.
  10. 콘솔 오류 0.
- [ ] **Step 3: 여러 탭** — 크롬 탭 두 개로 같은 주소를 연다. 탭 A에서 도장을 받으면 탭 B 시작 카드에 도장 자국이 생긴다('storage' 이벤트). 탭 B에서 다른 장소 도장을 받아도 탭 A의 도장이 남는다(합치기).
- [ ] **Step 4: 저장 막힘** — `localStorage` 쓰기를 막은 상태에서 다음을 확인한다.
  - 놀이는 끝까지 된다.
  - 여권 책과 부모님 공간에 안내가 뜬다.
  - 콘솔 오류가 없다.
- [ ] **Step 5: 화면** — 390×844, 360×740, 1024×768에서 다음을 찍어 테마와 어긋남(간격·크기·잘림·대비)을 고친다.
  - 여권 만들기, 칩 줄 시작 카드, 잠긴 표, 여권 책, 어른 확인, 부모님 공간, ✕ 확인
  - 도장 카드 세 가지(새 도장 / 다시 방문 / 단계 열림)
  - 카드 높이 한도를 다시 잰다.
- [ ] **Step 6: 접근성**
  - 모든 덮개는 열리면 초점이 안으로 들어가고, 닫으면 연 버튼으로 돌아온다.
  - 칩·도장 칸·잠긴 표의 접근 이름이 맞다.
  - 어른 확인은 키보드로 열린다.
  - 누르는 곳은 48px 이상이다.
- [ ] **Step 7: Commit** (고친 것이 있으면) — `fix: 계획 3 전체 확인에서 나온 것 고침`
