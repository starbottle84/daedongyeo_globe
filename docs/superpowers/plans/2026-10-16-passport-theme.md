# 지구 여권 디자인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 개발용 시제품처럼 보이는 화면을 기준 시안('진짜 여권')과 같은 상업용 어린이 앱 수준으로 바꾼다. 동작은 그대로 둔다.

**Architecture:** 색·질감·글꼴은 CSS 변수(`src/styles/tokens.css`), 그림(동글이·아이콘·장소 그림·문장)은 한 번만 붙이는 SVG 기호 모음(`src/ui/sprite.svg`)으로 둔다. 공통 부품(가죽+종이 카드, 금박 버튼, 말풍선, 동글이)은 `src/ui/`에 두고, 기존 화면 컴포넌트는 구조(JSX)와 CSS만 바꾼다. 판정·여행 흐름·카메라 계산은 건드리지 않는다.

**Tech Stack:** React 19, Vite 6, TypeScript 5.7, MapLibre GL 5.6, vite-plugin-pwa 0.21, `@fontsource/jua`, `@fontsource/gowun-dodum`

**설계 문서:** [docs/superpowers/specs/2026-10-16-passport-theme-design.md](../specs/2026-10-16-passport-theme-design.md)
**기준 시안:** `docs/design/2026-10-16-passport/mockup.html` (아래에서 "시안 N–M줄"은 이 파일의 줄 번호), 장소 장면 그림은 `docs/design/2026-10-16-passport/sticker-reference.html`.

---

## 모든 작업에 공통

- 브랜치 `feat/passport-theme`에서 작업한다. 작업마다 커밋한다(한국어 메시지 + 마지막 줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`).
- 사용자 규칙: 새 기능에는 자동 테스트를 만들지 않는다. 대신 아래 확인을 한다.
  - `npx tsc -p tsconfig.app.json --noEmit` → 출력 없음
  - `npm run lint` → 오류 없음
  - `npm run build` → `✓ built` (한국어 경로라 빌드는 꼭 이 명령으로)
  - 화면 캡처: 개발 서버(`http://localhost:5180`, 이미 떠 있지 않으면 `.claude/launch.json`의 "globe")를 숨은 크롬으로 찍는다. 여러 에이전트가 동시에 써도 부딪히지 않는다. **Browser 창 도구는 쓰지 않는다.**
    ```bash
    node scripts/shot-cdp.mjs http://localhost:5180/ "<scratchpad>/shots/<이름>.png" 390 844
    ```
    찍은 PNG는 Read로 열어 기준 시안 PNG(`docs/design/2026-10-16-passport/*.png`)와 나란히 비교한다.
  - 여행 화면은 주소만으로 열 수 없으므로, 확인용 개발 전용 주소 파라미터를 쓴다(작업 1에서 만든다): `?shot=<장소id>:<단계>:<화면>` 예) `?shot=jeju:preschool:mission`. 지원 화면은 작업 1 참고.
- 파일을 통째로 지우는 일은 계획에 적힌 것만 한다(`src/components/InfoCard.tsx`, `src/components/InfoCard.css` — 사용자 허락 받음).
- 지도 지명 수 기준(1280×800 세 장면 33 / 118 / 38 이상)은 작업 7과 9에서 잰다.

## 파일 구조

| 파일 | 할 일 | 책임 |
|---|---|---|
| `src/styles/tokens.css` | 새로 | 색·질감·글꼴 변수, 숨김 글자, `.ko` |
| `src/styles/global.css` | 고침 | 바탕, 하늘, `.bottom-stack`, 여행 중 숨김 규칙 |
| `src/ui/sprite.svg` | 새로 | 동글이 4표정, 반짝이, 문장, 로제트, 도구 아이콘, 장소 아이콘(`p-*`), 장소 장면(`pl-*`) |
| `src/ui/Sprite.tsx` | 새로 | 기호 모음을 문서에 한 번 붙임 |
| `src/ui/Dongle.tsx` | 새로 | `<Dongle mood size />` |
| `src/ui/Icon.tsx` | 새로 | `<Icon name />` |
| `src/ui/PlaceArt.tsx` | 새로 | 장소 id → 장면 그림(없으면 기본) |
| `src/ui/ui.css` | 새로 | 동글이 크기, 말풍선, 안내 줄, 금박 버튼, 닫기 버튼, 가죽+종이 카드, 머리말, 절취선 |
| `src/ui/Sky.tsx` | 새로 | 지구본 뒤 남색 하늘 + 별 |
| `src/ui/LogoBadge.tsx` | 새로 | 왼쪽 위 '지구 여권' |
| `src/components/MapButtons.tsx` + `.css` | 새로 | 오른쪽 위 위성/확대/축소/투영/북쪽 버튼 |
| `src/dev/shotParams.ts` | 새로 | 개발 전용 `?shot=` 해석 |
| `src/globe/globeHandle.ts` | 고침 | `zoomBy`, `resetNorth`, `getProjection`, `setProjection`, `onCameraChange` 추가, GlobeControl용 임시 처리 제거 |
| `src/globe/GlobeView.tsx` | 고침 | 기본 버튼·확대 단계 보고 제거 |
| `src/globe/themes.ts`, `src/globe/buildStyle.ts` | 고침 | 그림 지도 색, 해안선 두 겹 |
| `src/App.tsx` | 고침 | Sky·LogoBadge·MapButtons·Sprite 붙이기, InfoCard 빼기 |
| `src/trip/TripLauncher.tsx` | 고침 | 여권 펼침 시작 카드 |
| `src/trip/TripPanel.tsx`, `CharacterBubble.tsx` | 고침 | 여행 카드 틀, 압축 카드 |
| `src/trip/missions/*.tsx` | 고침 | 고르기·방향·찾아 누르기·핀·결과 |
| `src/trip/StampCard.tsx` | 고침 | 사증 쪽 도장 |
| `src/trip/trip.css` | 거의 새로 | 여행 카드·미션·결과·도장 모양 |
| `src/components/UpdateBanner.css`, `SatelliteNotice.css` | 고침 | 크림 종이 안내 카드 |
| `src/components/InfoCard.tsx`, `InfoCard.css` | 지움 | (허락 받음) |
| `package.json`, `vite.config.ts`, `src/main.tsx` | 고침 | 글꼴, PWA 미리 저장 |

---

### Task 1: 바탕 — 글꼴·색·그림 모음·동글이·확인용 주소

**Files:**
- Modify: `package.json`, `src/main.tsx`, `vite.config.ts`, `src/App.tsx`
- Create: `src/styles/tokens.css`, `src/ui/sprite.svg`, `src/ui/Sprite.tsx`, `src/ui/Dongle.tsx`, `src/ui/Icon.tsx`, `src/ui/PlaceArt.tsx`, `src/ui/ui.css`, `src/dev/shotParams.ts`

- [ ] **Step 1: 글꼴 설치**

```bash
npm install @fontsource/jua @fontsource/gowun-dodum
```
Expected: `package.json` dependencies에 두 패키지가 생긴다.

- [ ] **Step 2: `src/main.tsx`에서 글꼴·토큰을 불러온다** (global.css보다 먼저)

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/jua';
import '@fontsource/gowun-dodum';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './App';
import { registerPwa } from './lib/registerPwa';
```
(아래 `createRoot(...)`와 `void registerPwa();`는 그대로)

- [ ] **Step 3: PWA가 글꼴 파일도 미리 저장하게 한다** — `vite.config.ts`의 `globPatterns`

```ts
        globPatterns: ['**/*.{js,css,html,svg,png,ico,geojson,pbf,woff2}'],
```
위 주석도 "지도 데이터·글꼴(지도용 pbf, 화면용 woff2)까지 미리 저장해서"로 고친다.

- [ ] **Step 4: `src/styles/tokens.css` 만들기**

시안 11–38줄(`:root{...}` 전체: 색, `--title`, `--body`, `--grain`, `--fiber`, `--guilloche`, `--linen`, `--leather`)을 그대로 옮긴다. 다만 `--title`·`--body`는 이렇게 바꾼다.

```css
  --title: 'Jua', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
  --body: 'Gowun Dodum', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
```
그 아래에 붙인다.

```css
/* 오답 카드(살구색) — 시안 214줄 값 */
:root { --apricot-ink: #8A4F12; }
/* 그림 모음: 0 크기로 숨긴다 (display:none이면 Safari·Firefox에서 그라데이션이 사라진다) */
.sprite { position: absolute; width: 0; height: 0; overflow: hidden; }
.ko { word-break: keep-all; overflow-wrap: break-word; }
.nowrap { white-space: nowrap; }
```

- [ ] **Step 5: `src/ui/sprite.svg` 만들기**

1. 시안 321–534줄(`<svg class="sprite" ...>`부터 `</svg>`까지)을 복사해 새 파일에 넣고, 여는 태그를 `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`로 바꾼다.
2. 로제트(시안 449줄)는 시안에서 스크립트가 채우던 것을 직접 적는다. `<g id="rosette-g" ...>` 안에 다음을 넣는다: 타원 24개 `<ellipse rx="92" ry="34" transform="rotate(K)"/>` (K = 0, 7.5, 15, … 172.5), 타원 18개 `<ellipse rx="54" ry="18" transform="rotate(K)"/>` (K = 5, 15, 25, … 175), `<circle r="96"/>`, `<circle r="20"/>`. 작은 node 한 줄로 만들어 붙여도 된다.
3. `dg-talk`(시안 366–373줄)에 손 흔들기를 더한다. `dg-think`의 턱 괸 손(시안 383–385줄 근처 `<!-- 턱을 괸 손 -->` 아래 도형)과 같은 팔 그라데이션(`url(#dgArm)`, 테두리 `#1C5E9E`)으로, 몸 오른쪽 위(대략 x 96–108, y 52–66)에 손을 들고 있는 작은 원 손 하나를 그린다. 40px에서도 얼굴을 가리지 않게 얼굴 바깥에 둔다.
4. 장소 장면 그림: `sticker-reference.html` 579–675줄 근처의 `pl-pacific`, `pl-asia`, `pl-antarctica`, `pl-seoul`, `pl-dokdo`, `pl-jeju`, `pl-baekdu` 기호와 이들이 쓰는 그라데이션(`gTang`, `gSeoul` 등)·기호(`st-tang` 등, 기호 안에서 `href`로 부르는 것은 모두)를 함께 복사해 `<defs>` 안 끝에 넣는다. id가 시안 것과 겹치면 뒤에 `-st`를 붙여 고친다.
5. 파일을 다 만든 뒤 `grep -o 'href="#[^"]*"' src/ui/sprite.svg | sort -u`로 부르는 id를 모두 뽑고, 각 id가 `id="..."`로 정의돼 있는지 확인한다(없는 id가 하나도 없어야 함).

- [ ] **Step 6: `src/ui/Sprite.tsx`**

```tsx
import sprite from './sprite.svg?raw';

// 그림 모음(동글이·아이콘·장소 그림)을 문서에 한 번만 붙인다. 각 화면은 <use href="#id">로 꺼내 쓴다.
// 우리가 만든 고정 파일이라 innerHTML로 넣어도 안전하다.
export function Sprite() {
  return <div className="sprite" aria-hidden="true" dangerouslySetInnerHTML={{ __html: sprite }} />;
}
```

`src/vite-env.d.ts`에 `/// <reference types="vite/client" />`가 이미 있으면 `?raw` 타입은 따로 선언하지 않아도 된다(없으면 추가).

- [ ] **Step 7: `src/ui/Dongle.tsx`**

```tsx
export type DongleMood = 'talk' | 'think' | 'happy' | 'comfort';
export type DongleSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

interface DongleProps {
  mood: DongleMood;
  size?: DongleSize;
  /** 장식으로만 쓸 때(옆에 같은 내용의 글이 있을 때)는 true */
  decorative?: boolean;
}

// 안내 캐릭터 동글이: 기본(talk) · 음…(think) · 신나요(happy) · 토닥토닥(comfort)
export function Dongle({ mood, size = 'md', decorative = false }: DongleProps) {
  return (
    <svg
      className={`dg dg--${size}`}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': '동글이' })}
    >
      <use href={`#dg-${mood}`} />
    </svg>
  );
}
```

- [ ] **Step 8: `src/ui/Icon.tsx`**

```tsx
export type IconName = 'plane' | 'close' | 'check' | 'plus' | 'minus' | 'sat' | 'globe' | 'north' | 'read';

interface IconProps {
  name: IconName;
  className?: string;
}

// 작은 도구 아이콘 (그림 모음의 i-* 기호). 늘 장식이므로 화면 읽기에서는 빼고, 이름은 버튼에 붙인다.
export function Icon({ name, className }: IconProps) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
```

- [ ] **Step 9: `src/ui/PlaceArt.tsx`**

```tsx
// 장소 그림. 장면 그림(pl-*)이 있는 장소만 그 그림을, 나머지는 지구 그림을 쓴다 (계획 4에서 장소가 늘어나도 깨지지 않게).
const SCENES = new Set(['pacific', 'asia', 'antarctica', 'seoul', 'dokdo', 'jeju', 'baekdu']);

interface PlaceArtProps {
  placeId: string;
  className?: string;
}

export function PlaceArt({ placeId, className }: PlaceArtProps) {
  const id = SCENES.has(placeId) ? `pl-${placeId}` : 'pl-asia';
  return (
    <svg className={className} viewBox="0 0 64 50" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}
```

- [ ] **Step 10: `src/ui/ui.css` — 공통 부품 모양**

시안에서 다음 줄들을 그대로 옮긴다(선택자 이름 유지).
- 87–115줄: `.passport`, `.passport::before`, `.page`, `.page > *`, `.rosette`, `.page--ticket`(마스크), `.pass-head*`, `.close*`, `.tear` — 단 `.dock` 규칙(88줄)은 옮기지 않는다(앱은 `.bottom-stack`을 쓴다).
- 117–136줄: `.dg`, 크기들, `.bubble*`, `.say`, `.note`
- 138–148줄: `.btn` — 단 141–143줄의 배경에서 가운데 대각선 광택 줄(`linear-gradient(112deg, ...)`)을 지우고, 대신 위쪽 하이라이트 띠를 넣는다:

```css
  background:
    linear-gradient(180deg, rgba(255,255,255,.55) 0, rgba(255,255,255,.18) 38%, transparent 40%),
    linear-gradient(180deg,#FAE6A6 0%,#EFCD71 46%,#E1B14D 100%);
```
크기 이름을 앱에 맞게 더한다.

```css
.dg--xs { width: 40px; height: 40px; }
.dg--hero { width: 84px; height: 84px; }
button { -webkit-tap-highlight-color: transparent; }
button:focus-visible, [tabindex]:focus-visible { outline: 3px solid var(--gold-500); outline-offset: 3px; }
```

- [ ] **Step 11: 확인용 주소 해석 `src/dev/shotParams.ts`** (개발 중에만 쓰임)

```ts
import type { Tier } from '../content/types';

/** 개발 중 화면 확인용: ?shot=장소id:단계:화면  (예: jeju:preschool:mission)
 *  화면: depart | explore | mission | stamp | talk  (mission 뒤에 숫자를 붙이면 그 번호 미션: mission2) */
export interface ShotParams {
  placeId: string;
  tier: Tier;
  step: 'depart' | 'explore' | 'mission' | 'stamp' | 'talk';
  missionIndex: number;
}

export function readShotParams(): ShotParams | null {
  if (!import.meta.env.DEV) return null;
  const raw = new URLSearchParams(location.search).get('shot');
  if (!raw) return null;
  const [placeId, tier, screen = 'depart'] = raw.split(':');
  const m = /^(depart|explore|mission|stamp|talk)(\d*)$/.exec(screen);
  if (!placeId || !m || !['preschool', 'lower', 'upper'].includes(tier)) return null;
  return {
    placeId,
    tier: tier as Tier,
    step: m[1] as ShotParams['step'],
    missionIndex: m[2] ? Number(m[2]) - 1 : 0,
  };
}
```

`src/trip/tripReducer.ts`의 `createTripState`가 받는 값을 확인하고, 확인용 시작 상태를 만들 수 있게 `src/App.tsx`와 `TripPanel`에 다음을 연결한다.
- App: 처음 렌더 때 `readShotParams()`가 있으면 `PLACES.find(p => p.id === placeId)`로 그 장소·단계 여행을 시작한다(`useState` 초기값).
- TripPanel: 새 선택 prop `initialStep?: { step: TripStep; missionIndex: number }`을 받아 `useReducer(tripReducer, ..., init)` 초기 상태에 반영한다. `TripStep` 타입은 tripReducer에 이미 있는 단계 타입을 쓴다. (배포 빌드에서는 `readShotParams()`가 늘 null이라 아무 영향이 없다.)

- [ ] **Step 12: App에 Sprite 붙이기** — `src/App.tsx`의 최상위 `<div className=...>` 바로 안 첫 자식으로 `<Sprite />`를 넣고 import한다.

- [ ] **Step 13: 확인**

Run: `npx tsc -p tsconfig.app.json --noEmit` → 출력 없음, `npm run lint` → 오류 없음, `npm run build` → `✓ built`, 그리고 `dist/sw.js`에 `woff2`가 들어갔는지 `grep -c woff2 dist/sw.js` (1 이상).
화면: `node scripts/shot-cdp.mjs "http://localhost:5180/?shot=jeju:preschool:mission" <scratchpad>/shots/t1-mission.png 390 844` → 제주 미션 1 화면이 열린다(모양은 아직 옛것). 브라우저 콘솔에서 `document.fonts.check('20px Jua')` 대신, 캡처한 화면 글자가 이후 작업에서 Jua로 보이는지 확인한다.

- [ ] **Step 14: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/main.tsx src/App.tsx src/styles/tokens.css src/ui src/dev src/trip/TripPanel.tsx src/trip/tripReducer.ts
git commit -m "feat: 디자인 바탕(글꼴·색·질감), 그림 모음과 동글이·아이콘 부품, 개발용 화면 확인 주소"
```

---

### Task 2: 첫 화면 — 하늘·로고·지도 버튼 (InfoCard 없애기)

**Files:**
- Create: `src/ui/Sky.tsx`, `src/ui/LogoBadge.tsx`, `src/components/MapButtons.tsx`, `src/components/MapButtons.css`
- Modify: `src/globe/globeHandle.ts`, `src/globe/GlobeView.tsx`, `src/App.tsx`, `src/styles/global.css`
- Delete: `src/components/InfoCard.tsx`, `src/components/InfoCard.css`

- [ ] **Step 1: `src/ui/Sky.tsx`** — 시안 538–547줄을 옮긴다.

```tsx
// 지구본 뒤 여권 표지 남색 하늘과 별 (지도 캔버스는 지구본 밖이 투명해서 이 하늘이 비친다)
const STARS = [
  { left: '7%', top: '18%', s: 9, d: 0.2 },
  { left: '22%', top: '9.5%', s: 6, o: 0.6, d: 1.1 },
  { left: '62%', top: '7%', s: 7, o: 0.7, d: 0.6 },
  { left: '9%', top: '39%', s: 12, c: '#E9C46A', d: 1.6 },
  { left: '86%', top: '43%', s: 8, o: 0.7, d: 0.9 },
  { left: '77%', top: '13%', s: 5, o: 0.55, d: 2 },
  { left: '4%', top: '28%', s: 5, o: 0.5, d: 0.4 },
  { left: '91%', top: '31%', s: 10, c: '#E9C46A', d: 1.3 },
];

export function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      {STARS.map((st, i) => (
        <span
          key={i}
          className="star"
          style={{
            left: st.left, top: st.top,
            ['--s' as string]: `${st.s}px`, ['--d' as string]: `${st.d}s`,
            ...(st.o ? { ['--o' as string]: st.o } : {}),
            ...(st.c ? { ['--c' as string]: st.c } : {}),
          }}
        >
          <svg><use href="#spark" /></svg>
        </span>
      ))}
    </div>
  );
}
```

`global.css`: 시안 40–55줄(`.sky`, `.sky::after`, `.star`, `@keyframes twinkle`)을 옮기고 `.sky`에 `z-index: 0`을 준다. 기존 `.app .globe`의 `background`는 `transparent`로 바꾸고 `z-index: 0`을 지정한 뒤, `.sky`가 `.globe`보다 먼저(뒤에) 깔리도록 App에서 `<Sky />`를 `<GlobeView>` 앞에 둔다. `body`의 `background`는 `var(--navy-800)`, `font-family`는 `var(--body)`로, `:root`의 옛 변수(`--space`, `--card-*`)는 Task 8에서 정리한다(지금은 둔다). 여행 중에는 시안처럼 하늘 금박 테두리를 숨긴다: `.app--trip .sky::after { display: none; }`.

- [ ] **Step 2: `src/ui/LogoBadge.tsx`** — 시안 581–585줄

```tsx
// 왼쪽 위 '지구 여권' 배지 (장식 영문은 화면 읽기에서 뺀다)
export function LogoBadge() {
  return (
    <div className="logo" role="img" aria-label="지구 여권">
      <svg className="logo__mark" aria-hidden="true"><use href="#emblem" /></svg>
      <span className="logo__words" aria-hidden="true">
        <span className="logo__ko">지구 여권</span>
        <span className="logo__en">EARTH PASSPORT</span>
      </span>
    </div>
  );
}
```
CSS: 시안 61–71줄을 `src/ui/ui.css`에 옮기고, `.logo`의 `z-index`는 2, `.app--trip .logo { display: none; }`를 `global.css`에 둔다.

- [ ] **Step 3: `globeHandle.ts`에 지도 버튼용 기능을 더한다** (`GlobeHandle` 인터페이스와 반환 객체 둘 다)

```ts
  /** 확대(+)·축소(−) 한 단계 */
  zoomBy(delta: number): void;
  /** 북쪽을 위로, 기울기 0으로 */
  resetNorth(): void;
  getProjection(): 'globe' | 'mercator';
  setProjection(type: 'globe' | 'mercator'): void;
  /** 돌림·기울기가 바뀔 때 알려 준다 (북쪽 버튼을 보일지 정하는 데 쓴다) */
  onCameraChange(listener: (cam: { bearing: number; pitch: number }) => void): () => void;
```
구현 (반환 객체 안):

```ts
    zoomBy(delta) {
      map.easeTo({ zoom: map.getZoom() + delta, duration: flightMs(300) });
    },
    resetNorth() {
      map.easeTo({ bearing: 0, pitch: 0, duration: flightMs(400) });
    },
    getProjection() {
      return map.getProjection()?.type === 'mercator' ? 'mercator' : 'globe';
    },
    setProjection(type) {
      map.setProjection({ type });
    },
    onCameraChange(listener) {
      const handler = () => listener({ bearing: map.getBearing(), pitch: map.getPitch() });
      map.on('rotate', handler);
      map.on('pitch', handler);
      handler();
      return () => {
        map.off('rotate', handler);
        map.off('pitch', handler);
      };
    },
```
(`flightMs`는 이미 있는 '동작 줄이기면 0' 함수다. 이름이 다르면 그 함수를 쓴다.)

`restore()` 안의 `map.fire(new maplibregl.Event('styledata', { dataType: 'style' }));` 줄과 바로 위 주석 두 번째 줄(GlobeControl 아이콘 이야기)을 지운다. GlobeControl을 없애므로 필요 없다. 투영을 되돌리는 `setProjection(projectionBeforeTrip)`은 그대로 둔다.

- [ ] **Step 4: `GlobeView.tsx`에서 기본 버튼과 확대 단계 보고를 뺀다**

- `map.addControl(new maplibregl.NavigationControl(), 'top-right');`와 `map.addControl(new maplibregl.GlobeControl(), 'top-right');` 두 줄을 지운다.
- `onZoomChange` prop, `reportZoom`, `map.on('zoom', ...)`, `map.on('load', reportZoom)`을 지운다(InfoCard가 없어져 쓰는 곳이 없다). `callbacks` ref에서도 뺀다.

- [ ] **Step 5: `src/components/MapButtons.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { GlobeHandle } from '../globe/globeHandle';
import type { MapView } from '../globe/themes';
import { Icon } from '../ui/Icon';
import './MapButtons.css';

interface MapButtonsProps {
  globe: GlobeHandle;
  view: MapView;
  onViewChange: (view: MapView) => void;
}

// 오른쪽 위 지도 버튼. 여행 중에는 App이 그리지 않는다.
export function MapButtons({ globe, view, onViewChange }: MapButtonsProps) {
  const [projection, setProjection] = useState<'globe' | 'mercator'>('globe');
  const [tilted, setTilted] = useState(false);

  // 여행이 끝나면 restore()가 투영을 되돌린 뒤 이 버튼이 다시 그려진다.
  // 효과(useEffect)는 여행 카드의 정리(restore)가 끝난 다음에 돌므로 여기서 읽으면 되돌린 값이다.
  useEffect(() => {
    setProjection(globe.getProjection());
    return globe.onCameraChange(({ bearing, pitch }) => setTilted(Math.abs(bearing) > 1 || pitch > 1));
  }, [globe]);

  const toggleProjection = () => {
    const next = projection === 'globe' ? 'mercator' : 'globe';
    globe.setProjection(next);
    setProjection(next);
  };
  const satellite = view === 'satellite';

  return (
    <nav className="tools" aria-label="지도 조작">
      <button
        type="button"
        className="tool tool--labeled"
        aria-pressed={satellite}
        aria-label={satellite ? '그림 지도로 보기' : '위성 지도로 보기'}
        onClick={() => onViewChange(satellite ? 'map' : 'satellite')}
      >
        <Icon name={satellite ? 'globe' : 'sat'} />
        <span className="tool__caption" aria-hidden="true">{satellite ? '그림' : '위성'}</span>
      </button>
      <div className="zoom">
        <button type="button" aria-label="크게 보기" onClick={() => globe.zoomBy(1)}>
          <Icon name="plus" />
        </button>
        <hr />
        <button type="button" aria-label="작게 보기" onClick={() => globe.zoomBy(-1)}>
          <Icon name="minus" />
        </button>
      </div>
      <button
        type="button"
        className="tool"
        aria-label={projection === 'globe' ? '평면 지도로 보기' : '지구본으로 보기'}
        onClick={toggleProjection}
      >
        <Icon name="globe" />
      </button>
      {tilted && (
        <button type="button" className="tool" aria-label="북쪽을 위로" onClick={() => globe.resetNorth()}>
          <Icon name="north" />
        </button>
      )}
    </nav>
  );
}
```

`MapButtons.css`: 시안 73–85줄을 옮기고, 남색 하늘에 묻히지 않게 버튼 면을 밝힌다.

```css
.tool, .zoom {
  /* 시안보다 한 단계 밝은 면 + 밝은 금테 (남색 하늘과 구분) */
  background: var(--grain), radial-gradient(circle at 35% 25%, #5A7DB2 0%, #36548A 55%, #2A4470 100%);
  box-shadow: inset 0 0 0 2px #E2BE6A, inset 0 0 0 3.5px rgba(10,20,40,.35), inset 0 3px 0 3px rgba(255,255,255,.1),
    0 4px 0 #0D1A2E, 0 8px 14px rgba(3,8,20,.4);
}
.tool--labeled { flex-direction: column; gap: 0; }
.tool--labeled svg { width: 22px; height: 22px; }
.tool__caption { font-family: var(--title); font-size: 11px; line-height: 1; color: var(--gold-200); }
.tools { z-index: 2; }
```
(`.tool--labeled`은 `display:flex`로 바꿔 아이콘 아래 글자가 오게 한다.)

- [ ] **Step 6: `src/App.tsx` 정리**

- `InfoCard` import·사용, `zoom` 상태, `setZoom`, `onZoomChange={setZoom}`을 지운다.
- 렌더 순서: `<Sprite />`, `<Sky />`, `<GlobeView ... />`, `<LogoBadge />`, `{globe && !trip && <MapButtons globe={globe} view={view} onViewChange={changeView} />}`, `.bottom-stack`.

- [ ] **Step 7: InfoCard 파일 지우기** (사용자 허락 받음)

```bash
git rm src/components/InfoCard.tsx src/components/InfoCard.css
```

`global.css`에서 이제 쓸모없는 `.app--trip .info-card`와 `.app--trip .maplibregl-ctrl-top-right` 규칙을 지운다(오른쪽 위 MapLibre 버튼이 없어졌다). 오른쪽 아래 출처 표시 숨김 규칙은 그대로 둔다.

- [ ] **Step 8: 확인**

tsc·lint·build 통과. 캡처 `t2-home.png` (390×844)와 `t2-home-tablet.png` (1024×768): 남색 하늘·별, 왼쪽 위 배지, 오른쪽 위 버튼 3개(돌리지 않았으니 북쪽 버튼은 없음), 개발용 카드 없음. 시안 `home.png` 위쪽 절반과 비교.
동작: 개발 서버 콘솔에서(또는 숨은 크롬 평가로) `__map.getProjection()`이 처음 `globe` → 지구본 버튼을 누르면 `mercator` → 다시 누르면 `globe`.

- [ ] **Step 9: Commit**

```bash
git add -A src/ui src/components src/globe/globeHandle.ts src/globe/GlobeView.tsx src/App.tsx src/styles/global.css
git commit -m "feat: 첫 화면 남색 하늘·지구 여권 배지·새 지도 버튼, 개발용 정보 카드와 기본 지도 버튼 없앰"
```

---

### Task 3: 시작 카드 — 여권 펼침 (TripLauncher)

**Files:**
- Modify: `src/trip/TripLauncher.tsx`, `src/trip/trip.css`, `src/content/types.ts`

- [ ] **Step 1: 단계 이름을 둔다** — `src/content/types.ts`에 추가

```ts
/** 탐험 5단계 이름 (설계 문서 2026-10-16-globe-geography-design) */
export const STAGE_NAMES: Record<number, string> = {
  1: '둥근 지구', 2: '우리나라', 3: '이웃 나라', 4: '세계 대륙', 5: '지구 탐험가',
};
```

- [ ] **Step 2: `TripLauncher.tsx`를 시안 602–636줄 구조로 바꾼다**

```tsx
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
  return (
    <section className="passport launcher" aria-label="여행 고르기">
      <div className="page">
        <svg className="rosette" aria-hidden="true"><use href="#rosette" /></svg>
        <div className="spread">
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
    </section>
  );
}
```

- [ ] **Step 3: `trip.css`의 옛 `.launcher*`, `.place-card*` 규칙을 지우고 시안 150–183줄과 280–305줄(태블릿 가로 부분 중 `.globe`·`[data-s]` 규칙 제외)을 옮긴다.** 앱에 맞게 바꿀 점:

```css
/* 장소 표는 4칸 격자로 맞춘다 (1단계 3장 + 빈 칸) */
.tickets { display: grid; grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.ticket__stub { height: var(--perf); padding: 0; overflow: hidden; }
.ticket__stub svg { width: 100%; height: 100%; display: block; }
.ticket-slot { border: 2px dashed rgba(169,126,46,.35); border-radius: 14px; min-height: 78px; }
.launcher { max-height: 60vh; overflow-y: auto; }
/* 가로 태블릿: 시작 카드만 넓게 (여행 카드는 .bottom-stack 너비 그대로) */
@media (orientation: landscape) and (min-width: 900px) {
  .app:not(.app--trip) .bottom-stack { width: min(900px, calc(100vw - 48px)); }
  /* 시안 284–305줄 규칙에서 [data-s="home"] 앞머리는 .launcher 로 바꿔 쓴다 */
}
```
`.ticket__name` 위 점선(시안 178–179줄), `.tickets--1/2`의 `--tint`(180–181줄)는 그대로 둔다. 장면 그림은 위 칸을 꽉 채운다(`slice`).

- [ ] **Step 4: 확인** — tsc·lint·build. 캡처 `t3-home.png` (390×844): 시작 카드가 화면 높이의 50% 이하인지 숨은 크롬으로 잰다.

```bash
MEASURE= node scripts/shot-cdp.mjs http://localhost:5180/ <scratchpad>/shots/t3-home.png 390 844
```
(shot-cdp.mjs의 MEASURE 표현식은 시안용 `.dock > section`을 찾는다. 앱에서는 `.bottom-stack`을 재도록 이 작업에서 표현식을 `document.querySelector('.bottom-stack')`로 바꾼다.) `ratio ≤ 0.50`. `t3-home-tablet.png` (1024×768)와 `t3-home-360.png` (360×740)도 찍어 시안 `home.png`, `home-tablet.png`와 비교한다. 가로 스크롤(`sw`)이 화면 너비와 같아야 한다.

- [ ] **Step 5: Commit**

```bash
git add src/trip/TripLauncher.tsx src/trip/trip.css src/content/types.ts scripts/shot-cdp.mjs
git commit -m "feat: 여권 펼침 모양 시작 카드(동글이 인사, 나이 탭, 절취선 장소 표, 태블릿 두 쪽 펼침)"
```

---

### Task 4: 여행 카드 틀 — 머리말·출발·둘러보기·함께 이야기·압축 카드

**Files:**
- Modify: `src/trip/TripPanel.tsx`, `src/trip/CharacterBubble.tsx`, `src/trip/trip.css`

- [ ] **Step 1: `CharacterBubble.tsx`**

```tsx
import { Dongle, type DongleMood } from '../ui/Dongle';

interface CharacterBubbleProps {
  text: string;
  mood?: DongleMood;
}

// 동글이의 말풍선
export function CharacterBubble({ text, mood = 'talk' }: CharacterBubbleProps) {
  return (
    <div className="say">
      <Dongle mood={mood} size="lg" />
      <p className="bubble bubble--say ko">{text}</p>
    </div>
  );
}
```

- [ ] **Step 2: `TripPanel.tsx` JSX를 시안 639–663줄 틀로 바꾼다.** 바뀌는 부분만:

```tsx
  const compact = mission !== null && mission.type !== 'choice';
  const readAloud = tier === 'preschool' && (
    <p className="note"><Icon name="read" />부모님이 소리 내어 읽어 주세요.</p>
  );

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      className={`passport trip-panel trip-panel--${tier}${compact ? ' trip-panel--compact' : ''}`}
      aria-label={`${place.name} 여행`}
    >
      <div className="page page--ticket">
        <svg className="rosette" aria-hidden="true"><use href="#rosette" /></svg>
        <header className="pass-head">
          <span className="pass-head__tag" aria-hidden="true"><Icon name="plane" /></span>
          <h2 className="pass-head__title">{place.name} 여행 · {TIER_LABELS[tier]}</h2>
          <button type="button" className="close" onClick={onExit} aria-label="여행 그만하기">
            <Icon name="close" />
          </button>
        </header>
        <div className="tear" aria-hidden="true" />

        {state.step === 'depart' && (
          <>
            <CharacterBubble text={place.intro[tier]} />
            {readAloud}
            <button type="button" className="btn" onClick={next}>
              출발! <Icon name="plane" className="btn__plane" />
            </button>
          </>
        )}

        {state.step === 'explore' && (
          <>
            <CharacterBubble text={place.story[tier]} />
            {readAloud}
            <button type="button" className="btn" onClick={next}>미션 시작</button>
          </>
        )}

        {mission && (
          <>
            <div className="progress">
              <span className="progress__label">미션 {state.missionIndex + 1} / {missions.length}</span>
              <span className="pips" aria-hidden="true">
                {missions.map((_, i) => (
                  <i key={i} className={`${i <= state.missionIndex ? 'on' : ''}${i === state.missionIndex ? ' now' : ''}`} />
                ))}
              </span>
            </div>
            <MissionView ... (그대로) />
            {readAloud}
          </>
        )}

        {state.step === 'stamp' && ( <StampCard ... (그대로) /> )}

        {state.step === 'talk' && (
          <div className="talk">
            <h3 className="talk__label">함께 이야기해요</h3>
            <CharacterBubble text={place.familyTalk[tier]} />
            <button type="button" className="link-button" aria-expanded={showNote} onClick={() => setShowNote((v) => !v)}>
              부모님 메모 {showNote ? '닫기' : '보기'}
            </button>
            {showNote && <p className="talk__note ko">{place.parentNote}</p>}
            <button type="button" className="btn" onClick={onExit}>여행 마치기</button>
          </div>
        )}
      </div>
    </section>
  );
```
`Icon` import 추가. 기존 `trip-panel__header`, `trip-panel__progress`, `trip-panel__note`를 쓰는 곳이 없어야 한다. 단계가 바뀔 때 `panel.scrollTop = 0`, `focus()` 하는 효과는 그대로 둔다(스크롤은 `section`에서 일어난다).

- [ ] **Step 3: `trip.css` — 여행 카드 규칙**

먼저 `trip.css`의 `.visually-hidden` 규칙을 `src/styles/tokens.css` 끝으로 옮긴다(핀 결과의 '별 N개' 화면 읽기 글자가 쓴다 — 지우면 글자가 화면에 드러난다). 그다음 옛 `.trip-panel`, `.trip-panel__*`, `.big-button`, `.character*`, `.talk*` 규칙을 지우고 다음을 둔다. 시안 186–193줄(`.progress`, `.pips`, `.ask`)도 옮긴다.

```css
.trip-panel { max-height: 62vh; overflow-y: auto; scroll-padding-bottom: 18px; }
.trip-panel:focus { outline: none; }
.btn__plane { transform: rotate(45deg); }
.trip-panel--preschool .bubble--say { font-size: 22px; }
.talk__label { margin: 0 0 8px; font-family: var(--title); font-weight: 400; font-size: 20px; color: var(--gold-ink); }
.talk__note { margin: 8px 0 0; padding: 10px 12px; border-radius: 14px; background: var(--cream-200); font-size: 17px; line-height: 1.55; color: var(--note); }
.link-button { margin-top: 10px; min-height: 48px; padding: 0 4px; border: 0; background: none; font-family: var(--title);
  font-size: 18px; color: var(--gold-ink); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
/* 압축 카드: 찾아 누르기·핀 꽂기·방향 미션은 지도를 넓게 보여야 한다 (390×844에서 30% 이하, 방향은 40% 이하) */
.trip-panel--compact .page { padding: 12px 14px; }
.trip-panel--compact .tear { margin: 8px -14px; }
.trip-panel--compact .page--ticket { --tear: 66px; }
.trip-panel--compact .progress { margin-bottom: 6px; }
.trip-panel--compact .note { margin-top: 6px; font-size: 15px; }
```
`--tear` 값은 머리말 높이(48px) + 위 여백 + 절취선 위 여백에 맞춰, 반원 홈이 절취선 높이와 맞도록 캡처로 확인해 조정한다.

- [ ] **Step 4: 확인** — tsc·lint·build. 캡처: `?shot=jeju:preschool:depart` (`t4-depart.png`), `?shot=jeju:preschool:talk` (`t4-talk.png`), `?shot=pacific:lower:mission2` (찾아 누르기 압축, `t4-compact.png`). depart를 시안 `depart.png`와 비교하고, 압축 카드는 MEASURE로 `ratio ≤ 0.30`.

- [ ] **Step 5: Commit**

```bash
git add src/trip/TripPanel.tsx src/trip/CharacterBubble.tsx src/trip/trip.css
git commit -m "feat: 여행 카드를 보딩 패스 모양으로(머리말·절취선·동글이 말풍선·금박 버튼), 지도 미션은 압축 카드"
```

---

### Task 5: 미션과 결과

**Files:**
- Modify: `src/trip/missions/ChoiceMission.tsx`, `DirectionMission.tsx`, `TapMission.tsx`, `PinMission.tsx`, `MissionFeedback.tsx`, `src/trip/trip.css`

- [ ] **Step 1: `MissionFeedback.tsx` — 결과 카드** (시안 678–717줄). 지금의 접근성 장치(제목·별·detail·explain을 '다음' 버튼 설명으로 묶기, 결과가 나오면 스크롤·초점 이동, 숨김 글자 "별 N개")는 그대로 유지한다.

```tsx
import { useEffect, useId, useRef } from 'react';
import { Dongle } from '../../ui/Dongle';
import { Icon } from '../../ui/Icon';

interface MissionFeedbackProps {
  correct: boolean;
  /** 정답 보기 (고르기·방향). 칩으로 보여 준다 */
  answer?: { icon?: string; label: string };
  /** 정답 안내나 거리처럼 결과에 붙는 한 줄 */
  detail?: string;
  explain?: string;
  /** 위치 찍기에서 받은 별 (1~3) */
  stars?: number;
  onNext: () => void;
}

const CONFETTI = [
  { left: -6, top: 10, c: '#E9C46A', r: -24, fx: 30, fy: 30, d: 0.05 },
  { left: 84, top: 2, c: '#2E9E5B', r: 28, fx: -30, fy: 30, d: 0.12 },
  { left: -4, top: 70, c: '#7CCBF0', r: 60, fx: 30, fy: -20, d: 0.18 },
  { left: 90, top: 66, c: '#F29A9A', r: -50, fx: -30, fy: -20, d: 0.1 },
];

export function MissionFeedback({ correct, answer, detail, explain, stars, onNext }: MissionFeedbackProps) {
  const nextRef = useRef<HTMLButtonElement>(null);
  // '다음' 버튼으로 초점이 오면 화면 읽기 프로그램은 버튼 이름만 읽으므로, 결과 문장들을 버튼 설명으로 묶어 함께 읽게 한다
  const id = useId();
  const titleId = `${id}-title`;
  const answerId = `${id}-answer`;
  const starsId = `${id}-stars`;
  const detailId = `${id}-detail`;
  const explainId = `${id}-explain`;
  const describedBy = [titleId, answer && answerId, stars !== undefined && starsId, detail && detailId, explain && explainId]
    .filter(Boolean)
    .join(' ');

  // 결과가 나오면 '다음' 버튼이 패널 아래에 숨지 않게 보이는 곳까지 스크롤하고 초점을 옮긴다
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nextRef.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    nextRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="feedback" role="status">
      <div className={`result${correct ? '' : ' result--soft'}`}>
        <div className="result__hero">
          {correct && (
            <>
              <span className="burst" aria-hidden="true" />
              {CONFETTI.map((p, i) => (
                <span
                  key={i}
                  className="confetti"
                  aria-hidden="true"
                  style={{ left: p.left, top: p.top, ['--c' as string]: p.c, ['--r' as string]: `${p.r}deg`,
                    ['--fx' as string]: `${p.fx}px`, ['--fy' as string]: `${p.fy}px`, ['--d' as string]: `${p.d}s` }}
                />
              ))}
            </>
          )}
          <Dongle mood={correct ? 'happy' : 'comfort'} size="hero" decorative />
        </div>
        <div className="result__body">
          <p id={titleId} className="result__title ko">
            {correct ? '잘했어요!' : <><span className="nowrap">괜찮아요,</span> <span className="nowrap">같이 알아봐요</span></>}
          </p>
          {answer && (
            <span id={answerId} className="chip">
              {!correct && <span className="chip__prefix">정답:</span>}
              {answer.icon && <span className="chip__emoji" aria-hidden="true">{answer.icon}</span>}
              {answer.label}
              {correct && <span className="chip__ok" aria-hidden="true"><Icon name="check" /></span>}
            </span>
          )}
          {stars !== undefined && (
            <p id={starsId} className="result__stars">
              <span aria-hidden="true">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
              <span className="visually-hidden">별 {stars}개</span>
            </p>
          )}
        </div>
        {correct && (
          <>
            <span className="spark" style={{ right: 16, top: 10, ['--s' as string]: '20px', ['--d' as string]: '.3s' }} aria-hidden="true"><svg><use href="#spark" /></svg></span>
            <span className="spark" style={{ right: 46, top: 26, ['--s' as string]: '10px', ['--d' as string]: '.9s', ['--c' as string]: '#2E9E5B' }} aria-hidden="true"><svg><use href="#spark" /></svg></span>
            <span className="spark" style={{ right: 22, bottom: 14, ['--s' as string]: '13px', ['--d' as string]: '.6s' }} aria-hidden="true"><svg><use href="#spark" /></svg></span>
          </>
        )}
      </div>
      {detail && <p id={detailId} className="result__detail ko">{detail}</p>}
      {explain && <p id={explainId} className="explain ko">{explain}</p>}
      <button ref={nextRef} type="button" className="btn" aria-describedby={describedBy} onClick={onNext}>
        다음
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 미션들에서 결과 카드에 맞게 넘기는 값을 고친다**

`ChoiceMission.tsx`:
- 질문을 동글이와 함께: `<div className="ask"><Dongle mood="think" size="md" decorative /><p className="ask__prompt ko">{mission.prompt}</p></div>` (기존 `mission__prompt` 대신)
- 보기 묶음: `<div className={`choices${outcome ? ' choices--done' : ''}`} data-count={mission.options.length}>`
- 보기 버튼 안: 아이콘은 `<span className="choice__medal" aria-hidden="true">{option.icon}</span>` (아이콘이 없으면 메달 없이 글자만), 글자는 `<span className="choice__label">{option.label}</span>`
- 결과: `detail` 대신 `answer={mission.options[mission.answer]}`를 넘긴다(정답 칩).

```tsx
        <MissionFeedback
          correct={outcome === 'correct'}
          answer={mission.options[mission.answer]}
          explain={mission.explain}
          onNext={() => onDone({ type: 'choice', correct: outcome === 'correct', attempts })}
        />
```

`DirectionMission.tsx`: 질문 줄을 `<div className="ask"><Dongle mood="think" size="xs" decorative /><p className="ask__prompt ko">{mission.prompt}</p></div>`로 바꾸고, 결과에 `answer={{ label: `${mission.answer}쪽` }}`를 넘기며 `detail`은 지운다.

`TapMission.tsx`, `PinMission.tsx`: 질문 줄을 같은 `ask` + `Dongle think xs` 모양으로 바꾼다. 결과는 지금처럼 `detail`만 쓴다. Pin의 '여기예요!' 버튼 클래스 `big-button` → `btn`.

- [ ] **Step 3: `trip.css` — 미션·결과 규칙**

옛 `.mission__prompt`, `.choices`, `.choice*`, `.compass*`, `.feedback*`, `.is-answer`, `.is-wrong` 규칙을 지우고 시안 195–235줄을 옮긴 뒤, 다음을 더한다.

```css
.mission__hint { margin: 10px 0 0; font-size: 17px; color: var(--note); }
.mission__hint:empty { margin: 0; }
.trip-panel--compact .ask { margin-bottom: 6px; }
.trip-panel--compact .ask__prompt { font-size: 20px; }
/* 유아 힌트: 정답 보기가 반짝인다 / 정답 공개 */
.choice.is-answer { box-shadow: inset 0 0 0 3px var(--green), 0 6px 0 #7FBF95, 0 0 0 6px rgba(46,158,91,.18); animation: answerGlow 1.4s ease-in-out 3; }
@keyframes answerGlow { 50% { box-shadow: inset 0 0 0 3px var(--green), 0 6px 0 #7FBF95, 0 0 0 10px rgba(46,158,91,.08); } }
.choice.is-wrong { opacity: .55; filter: saturate(.6); background: linear-gradient(180deg,#FFF5E9,#FCE9D2); }
/* 답한 뒤: 보기를 한 줄 칩으로 줄여 결과 카드 자리를 만든다 */
.choices--done { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.choices--done .choice { flex-direction: row; min-height: 48px; padding: 4px 14px 4px 6px; gap: 8px; font-size: 18px; border-radius: 999px; box-shadow: inset 0 0 0 2px #E7D7B1; }
.choices--done .choice__medal { width: 38px; height: 38px; font-size: 22px; }
.choices--done .choice__medal::after { inset: 3px; }
.choices--done .choice.is-answer { box-shadow: inset 0 0 0 2.5px var(--green); animation: none; }
.chip__prefix { color: var(--apricot-ink); }
.result__stars { margin: 6px 0 0; font-size: 26px; letter-spacing: 2px; color: var(--gold-600); }
.result__detail { margin: 10px 2px 0; font-size: 17px; line-height: 1.5; color: var(--ink-soft); }
.feedback .btn { margin-top: 14px; }
/* 동글이 깡충: 2~3번만 */
.result:not(.result--soft) .result__hero .dg { animation: hop .5s ease-in-out .1s 3; }
@keyframes hop { 50% { transform: translateY(-6px); } }
/* 방향: 나침반 3×3 (압축 카드라 48px) */
.compass { display: grid; grid-template-columns: repeat(3, 64px); grid-auto-rows: 48px; gap: 6px; justify-content: center; }
.compass__dir { border: 0; border-radius: 14px; font-family: var(--title); font-size: 18px; color: var(--ink);
  background: linear-gradient(180deg,#FFFFFF,#FFFAEE); box-shadow: inset 0 0 0 2px #E7D7B1, 0 4px 0 #D7C292; }
.compass__dir:active { transform: translateY(3px); box-shadow: inset 0 0 0 2px #E7D7B1, 0 1px 0 #D7C292; }
.compass__dir.is-answer { box-shadow: inset 0 0 0 3px var(--green), 0 4px 0 #7FBF95; }
.compass__dir.is-wrong { opacity: .5; }
.compass__center { display: grid; place-items: center; border-radius: 50%; font-family: var(--title); font-size: 15px; color: var(--gold-ink);
  background: radial-gradient(circle,#FFF9E8,#F4E4BE); box-shadow: inset 0 0 0 2px rgba(201,164,90,.45); }
```
시안 `.result__title`(227줄)의 `--soft` 크기(228줄)를 쓰되, 제목이 두 덩이(`nowrap`)로 끊기도록 둔다.

- [ ] **Step 4: 확인** — tsc·lint·build. 캡처:
  - `?shot=jeju:preschool:mission2` → `t5-mission.png` (시안 `mission.png`와 비교, MEASURE `ratio ≤ 0.50`)
  - 정답·오답 화면은 주소로 열 수 없으므로, 숨은 크롬 대신 이 작업에서만 짧은 CDP 스크립트(또는 shot-cdp.mjs에 `CLICK="선택자"` 환경변수로 클릭 한 번 후 찍는 기능을 더해)로 보기를 눌러 찍는다: `t5-correct.png` (귤), `t5-retry.png` (코코넛 한 번, 저학년이면 2번 → 정답 공개 `t5-revealed.png`). 시안 `correct.png`, `wrong.png`와 비교.
  - 보기 3·4개: `?shot=jeju:lower:mission?` / `?shot=jeju:upper:mission?` 중 고르기 미션 번호를 콘텐츠(`src/content/places/jeju.json`)에서 찾아 찍는다 → 시안 `mission-3.png`, `mission-4.png`와 비교.
  - 방향 미션이 있는 장소(콘텐츠에서 `"type": "direction"` 검색)를 찍어 MEASURE `ratio ≤ 0.40`.

- [ ] **Step 5: Commit**

```bash
git add src/trip/missions src/trip/trip.css
git commit -m "feat: 미션 화면(메달 보기 카드·동글이 질문)과 결과 카드(정답 햇살·색종이, 오답 토닥토닥, 정답 칩)"
```

---

### Task 6: 도장 — 사증 쪽

**Files:**
- Modify: `src/trip/StampCard.tsx`, `src/trip/trip.css`

- [ ] **Step 1: `StampCard.tsx`를 시안 720–773줄 구조로**

```tsx
import { useId } from 'react';
import type { Place } from '../content/types';
import { Dongle } from '../ui/Dongle';
import { PlaceArt } from '../ui/PlaceArt';

interface StampCardProps {
  place: Place;
  /** 이번 여행에서 모은 별 (고학년 위치 찍기). 없으면 안 보여 준다 */
  stars?: number;
  nextPlace: Place | null;
  onNext: () => void;
}

// 여권 도장 장면. 도장을 저장하고 여권에 모으는 것은 계획 3에서 붙인다.
export function StampCard({ place, stars, nextPlace, onNext }: StampCardProps) {
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  // 잉크 필터·글자 길 id가 겹치지 않게
  const uid = useId().replace(/:/g, '');
  const inky = `inky-${uid}`;
  const ring = `ring-${uid}`;
  return (
    <div className="visa">
      <div className="stamp-zone thud">
        <svg className="medallion" aria-hidden="true"><use href="#rosette" /></svg>
        <svg className="impact" viewBox="-110 -110 220 220" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">
            <path d="M0-104v-12M74-74l8-8M104 0h12M74 74l8 8M0 104v12M-74 74l-8 8M-104 0h-12M-74-74l-8-8" />
          </g>
        </svg>
        <svg className="stamp-ink" viewBox="0 0 200 200" role="img" aria-label={`${place.name} 도장, ${today}`}>
          {/* 시안 727–753줄. id="inky" → {inky}, id="ringTop" → {ring}, '제주도' → {place.name}, '10월 16일' → {today},
              둘레 글자는 "EARTH PASSPORT", 귤 선 그림(747–750줄) 대신 지구 선 그림:
              <g transform="translate(88 46) scale(1)" fill="none" stroke="#C23A2E" strokeWidth="2.2"><use href="#i-globe" width="24" height="24" /></g> */}
        </svg>
        <svg className="stamp-tool" viewBox="0 0 200 190" aria-hidden="true">
          {/* 시안 757–767줄 그대로 (id="wKnob"/"wBody"는 `${uid}`를 붙여 고유하게) */}
        </svg>
      </div>
      <p className="visa__title ko">{place.name} 도장을 받았어요!</p>
      {stars !== undefined && stars > 0 && <p className="stamp__stars">모은 별 ★ {stars}개</p>}
      {nextPlace && (
        <div className="visa__next">
          <Dongle mood="happy" size="sm" decorative />
          <p className="bubble visa__bubble ko">다음엔 {nextPlace.name}에 가 볼까요?</p>
          <span className="next-slot" aria-hidden="true"><PlaceArt placeId={nextPlace.id} /></span>
        </div>
      )}
      <button type="button" className="btn" onClick={onNext}>계속</button>
    </div>
  );
}
```
위 두 주석 자리는 주석이 아니라 시안의 실제 SVG를 JSX로 옮겨 채운다(속성 이름은 camelCase: `stroke-width`→`strokeWidth`, `font-family`→`fontFamily`, `font-size`→`fontSize`, `letter-spacing`→`letterSpacing`, `text-anchor`→`textAnchor`, `startOffset` 그대로, `stroke-linecap`→`strokeLinecap`, `stop-color`→`stopColor`). 도장 글자 길이가 긴 장소(예: "남극"은 짧고 "백두산" 3글자, 계획 4의 긴 이름 대비)는 이름이 4글자 넘으면 `fontSize` 34 → 26으로 줄인다.

- [ ] **Step 2: `trip.css`** — 옛 `.stamp*` 규칙(단 `.stamp__stars`는 남김)을 지우고 시안 237–259줄을 옮긴다. 덧붙임:

```css
.stamp-zone { width: 140px; height: 140px; }
.visa__next { display: flex; align-items: center; gap: 8px; margin-top: 8px; text-align: left; }
.visa__bubble { flex: 1; padding: 8px 12px; font-size: 18px; line-height: 1.4; }
.next-slot { flex: none; width: 52px; height: 52px; border-radius: 50%; overflow: hidden; border: 2px dashed rgba(169,126,46,.55); opacity: .55; filter: saturate(.4); }
.next-slot svg { width: 100%; height: 100%; display: block; }
/* 금색 '쾅!' 폭발 + 잉크 고리 (스티커북 시안) */
.stamp-zone::after { content: ""; position: absolute; inset: -10px; border-radius: 50%; border: 3px solid rgba(194,58,46,.35);
  opacity: 0; animation: inkRing .6s ease-out .74s both; }
@keyframes inkRing { 0% { opacity: .9; transform: scale(.7); } 100% { opacity: 0; transform: scale(1.35); } }
```
움직임 줄이기 규칙은 Task 8에서 한꺼번에 정리하지만, 시안 310–315줄의 도장 관련 줄(`.stamp-tool,.impact{display:none}` 등)은 지금 같이 옮긴다.

- [ ] **Step 3: 확인** — tsc·lint·build. 캡처 `?shot=jeju:preschool:stamp` → `t6-stamp.png` (등장 움직임이 끝난 뒤 찍힘), MEASURE `ratio ≤ 0.52`, 시안 `stamp.png`와 비교. 다음 장소가 없는 마지막 장소(`baekdu`)도 찍어 말풍선 줄이 빠졌는지 본다. 고학년 핀 미션이 있는 장소 도장에서 별 줄이 보이는지 본다.

- [ ] **Step 4: Commit**

```bash
git add src/trip/StampCard.tsx src/trip/trip.css
git commit -m "feat: 사증 쪽 도장 화면(잉크 도장·나무 도장 쾅·동글이 다음 장소 안내·다음 도장 자리)"
```

---

### Task 7: 그림 지도 색과 해안선

**Files:**
- Modify: `src/globe/themes.ts`, `src/globe/buildStyle.ts`

- [ ] **Step 1: `themes.ts`**

```ts
// 종이 여권 화면과 어울리게 채도를 조금 낮춘 파스텔 (나라 구별용 여러 색은 유지)
export const LAND_COLORS = ['#F3D99A', '#C3E2A4', '#F2C3AE', '#D2C6EA', '#B4DDCD', '#F1CDDF', '#E8DEAE'];
export const OCEAN_COLOR = '#7EC6E3';
```
`THEMES.map`에서: `text: '#23395B'`, `halo: '#FFFDF7'`, `ocean: '#1F5C8A'`, `oceanHalo: 'rgba(255,253,247,0.7)'`. 나머지는 둔다. `satellite`는 바꾸지 않는다.

- [ ] **Step 2: `buildStyle.ts` — 해안선 두 겹** (`country-fill` 바로 **앞**에 넣는다. 땅 밑에 깔린 선이라 바다 쪽 절반만 보여서 나라 경계에는 생기지 않는다)

```ts
      // 해안선 두 겹 (흰 테두리 + 모래색). 땅 아래에 깔아 바다 쪽만 보이게 한다 — 나라 사이 경계에는 생기지 않는다.
      {
        id: 'coast-glow', type: 'line', source: 'countries',
        layout: { visibility: shown(!t.satellite), 'line-join': 'round' },
        paint: { 'line-color': '#FFFFFF', 'line-opacity': 0.55, 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 3, 6, 9] },
      },
      {
        id: 'coast-sand', type: 'line', source: 'countries',
        layout: { visibility: shown(!t.satellite), 'line-join': 'round' },
        paint: { 'line-color': '#EBDDB0', 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 1.4, 6, 4] },
      },
```

- [ ] **Step 3: 지명 수 재기** — 1280×800에서 세 장면의 화면에 그려진 지명 수를 잰다. 숨은 크롬 CDP로 `__map.jumpTo({center, zoom})` → `idle` 기다림 → `__map.queryRenderedFeatures().filter(f => f.layer.type === 'symbol' && f.properties.ko).length` (지금까지 쓰던 방식과 같게: symbol 층의 지명 수). 장면: `([127.5,36],1.6)`, `([127.8,36.3],5.2)`, `([127.6,36.6],7.2)`. Expected: 33 이상, 118 이상, 38 이상. (선·색만 바꿨으니 바뀌지 않아야 한다. 줄었다면 원인을 찾아 고친다.)

- [ ] **Step 4: 확인·캡처** — tsc·lint·build. `t7-home.png` (390×844)와 `?shot=jeju:preschool:mission` (`t7-map.png`): 해안선 흰 테두리·모래색이 보이고, 나라 경계에는 생기지 않았는지 본다. 위성 지도로 바꾼 화면(`t7-sat.png`, 위성 버튼 클릭 또는 `localStorage` 보기 설정)이 예전과 같은지 본다.

- [ ] **Step 5: Commit**

```bash
git add src/globe/themes.ts src/globe/buildStyle.ts
git commit -m "feat: 그림 지도 색을 종이 여권과 맞추고 해안선 두 겹(흰색·모래색) 추가"
```

---

### Task 8: 안내 카드·작은 화면·움직임 줄이기·옛 규칙 정리

**Files:**
- Modify: `src/components/UpdateBanner.css`, `src/components/SatelliteNotice.css`, `src/styles/global.css`, `src/styles/tokens.css`, `src/trip/trip.css`, `src/ui/ui.css`

- [ ] **Step 1: 안내 카드 두 개를 크림 종이 카드로** — 두 CSS 파일의 상자를 `.page`와 같은 종이 바탕(`background-color: var(--cream-100); background-image: var(--fiber), linear-gradient(180deg,#FFFDF7,#F6EEDC)`), 둥근 모서리 18px, `box-shadow: 0 0 0 1px rgba(150,110,40,.25), 0 8px 18px rgba(3,8,20,.4)`, 글자 `var(--ink)`·`var(--body)` 17px로 바꾸고, 버튼은 금박 `.btn`과 같은 모양의 작은 판(최소 높이 48px, `margin-top: 0`, `font-size: 18px`, `width: auto`, 좌우 패딩 16px)으로 만든다(JSX의 버튼에 `className="btn btn--small"`을 붙이고 `ui.css`에 `.btn--small { width:auto; min-height:48px; margin-top:0; padding:0 16px; font-size:18px; border-radius:14px; box-shadow: inset 0 2px 0 rgba(255,255,255,.7), 0 4px 0 #A97E2E; } .btn--small::before { inset:4px; border-radius:10px; }`).

- [ ] **Step 2: 옛 변수·규칙 정리** — `global.css`의 `:root`에서 `--space`, `--card-bg`, `--card-text`, `--card-sub`를 지우고, 이 변수를 쓰는 곳이 없는지 `grep -rn "var(--space)\|var(--card-" src`로 확인(0건). `trip.css`에 남은 옛 선택자(`big-button`, `character`, `place-card`, `launcher__`, `trip-panel__`, `feedback__`)가 없는지 grep으로 확인(0건). `index.html`/manifest의 `theme_color`·`background_color` `#0b1630` → `#1A2C49`.

- [ ] **Step 3: 움직임 줄이기 안전망** — `tokens.css` 끝에:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .stamp-tool, .impact { display: none; }
}
```
(움직임이 꺼지면 등장 애니메이션의 `both` 채우기가 없어지므로, 도장 자국·색종이 등은 최종 모습 그대로 보인다. 캡처로 확인.)

- [ ] **Step 4: 작은 화면** — `ui.css`·`trip.css` 끝에:

```css
@media (max-height: 700px) {
  .page { padding: 12px; }
  .dg--lg { width: 56px; height: 56px; }
  .bubble--say { font-size: 19px; }
  .ask__prompt { font-size: 20px; }
  .choice { min-height: 100px; }
  .stamp-zone { width: 120px; height: 120px; }
  .btn { min-height: 56px; font-size: 22px; margin-top: 12px; }
  .trip-panel { max-height: 66vh; }
}
@media (max-width: 370px) {
  .ticket__name { font-size: 16px; }
  .pass-head__title { font-size: 18px; }
  .tiers button { font-size: 17px; }
}
```

- [ ] **Step 5: 확인** — tsc·lint·build. 캡처를 360×740과 375×667로: 첫 화면, `jeju:preschool:mission2`, `jeju:upper:` 4개 보기 미션, 도장. 가로 스크롤 없음(MEASURE `sw` = 너비), 미션 카드 `ratio ≤ 0.55`. 움직임 줄이기: shot-cdp.mjs에 `REDUCE=1`이면 `Emulation.setEmulatedMedia({features:[{name:'prefers-reduced-motion',value:'reduce'}]})`를 보내도록 더하고, 정답·도장 화면을 찍어 멈춘 최종 모습인지 본다. 새 버전 안내는 개발 중 `UpdateBanner`를 임시로 띄우지 말고, Storybook 없이 컴포넌트 CSS만 비교하므로 코드 리뷰로 확인한다.

- [ ] **Step 6: 1묶음 검토에서 넘어온 항목** (작업 1–3 검토자가 남긴 작은 문제와 계획 빈틈)

1. **첫 화면 지구본 자리 잡기:** 지금은 지구본 가운데가 화면 가운데라 아래 절반이 시작 카드에 가린다(휴대폰·태블릿 둘 다). 기준 시안처럼 지구본 전체가 카드 위 빈 곳에 보이게 한다.
   - 여행이 아닐 때 카메라 padding의 bottom을 `.bottom-stack` 높이로 준다. 지구본이 보이는 영역(카드 위, 로고 아래) 가운데에 오게 하려는 것이다.
   - 보이는 영역에 지구본 지름이 들어가는 확대 단계를 고른다. `globeHandle`의 지구본 반지름 계산(512·2^z/(2π)/cos(lat))을 쓴다. 1280×800 같은 넓은 화면은 지금처럼 1.6을 넘지 않게 둔다.
   - 창 크기가 바뀌거나 여행이 끝나 시작 카드가 다시 뜰 때도 맞춘다. 여행 중에는 하지 않는다(여행은 기존 `panelPadding` 그대로).
   - 지명 수 기준 측정은 `jumpTo`로 하므로 영향이 없다.
2. **지도 출처 표시:** 오른쪽 아래 MapLibre 출처 알약이 시작 카드 모서리에 겹친다.
   - 여행이 아닐 때는 로고 아래 왼쪽으로 옮기고, 작은 반투명 남색 알약(글자 `var(--gold-300)` 12px)으로 바꾼다.
   - 'i' 버튼은 누르는 곳 44px 이상으로 하고, 펼친 모양도 확인한다.
   - `GlobeView`의 Map 옵션 `locale`에 `{ 'AttributionControl.ToggleAttribution': '지도 출처 보기' }`를 넣는다.
3. **아시아 장면 그림(`pl-asia`):** 시베리아가 빠져 '남쪽 아시아'처럼 보인다.
   - `countries.geojson`에서 러시아의 동경 60° 동쪽 부분을 더해 다시 맞춘다(별은 한반도).
   - 기호 위에 만든 방법을 주석 한 줄로 단다.
4. **`PlaceArt` 기본 그림:** 주석을 실제(기본은 아시아 그림)와 맞춘다. 장소가 늘기 전에 64×50 하늘 바탕 지구 장면 `pl-earth`를 더하고 기본값으로 쓴다.
5. **`?shot=…:mission0`:** missionIndex가 -1이 되지 않게 `Math.max(0, …)`로 막는다.
6. **확대·축소 캡슐 안 `<hr>`:** `aria-hidden="true"`를 붙여 화면 읽기에서 '구분선'이 읽히지 않게 한다.
7. **쓰지 않는 `GlobeHandle.getProjection`:** 쓰는 곳이 없으면 지운다(인터페이스와 구현 둘 다).
8. **안전 영역:** 로고 `left`와 지도 버튼 `right`에 `max(16px, env(safe-area-inset-left/right))`를 쓴다(노치 있는 아이폰 가로).
9. **북쪽 버튼 위치:** `nth-child(4)`에 기대지 말고 클래스(`.tool--north`)로 고른다. 높이 768 이상 가로 태블릿에서는 시안처럼 아래로 쌓는다.
10. **높이 단위:** 카드 최대 높이에 쓴 `vh`는 `dvh`로 바꾸고 `vh`를 대비값으로 앞에 둔다(iOS 주소창).
11. **중복 규칙:** `trip.css` 가로 태블릿 블록의 `.ticket__body{--perf:60px}` 중복을 정리한다.
12. **초점 테두리:** 종이 위 초점 테두리는 남색이다(작업 3에서 넣음). 여행 카드 안 버튼에도 같은지 확인한다.
14. **작은 화면 규칙 다시 맞추기 (2묶음 검토):**
   - Step 4의 `@media (max-height: 700px)`는 높이 740인 화면(360×740)에 걸리지 않는다. 기준을 `max-height: 760px`로 올린다.
   - 종이 패딩은 변수 하나로 계산되게 한다. `.trip-panel .page { --pad: 16px; padding: var(--pad); }`, `.pass-body { margin: -2px calc(-1 * var(--pad)) calc(-1 * var(--pad)); padding: 2px var(--pad) var(--pad); }`, `.page--ticket { --tear: calc(var(--pad) + 61.5px); }`(지금 값 77.5px = 16 + 61.5와 같음). 압축 카드도 같은 방식으로 맞춘다. 작은 화면에서는 `--pad: 12px`만 바꾼다.
   - Step 4의 `.trip-panel { max-height: 66vh }`는 쓰지 않는다. 미션 단계(`.trip-panel:has(.progress)` 또는 미션일 때 붙는 클래스)는 작은 화면에서 `max-height: 55dvh`(앞에 `55vh` 대비값), 출발·둘러보기·이야기는 지금 값(62)을 둔다.
   - 고학년 긴 글로 본문이 넘칠 때 주 버튼이 잘려 안 보이는 일이 없게 한다. `.pass-body` 아래쪽에 스크롤할 내용이 남았음을 알리는 옅은 그라데이션(`mask-image` 또는 `::after` 그림자)을 넣거나, 주 버튼을 본문 밖 아래에 고정한다. 둘 중 캡처로 더 나은 쪽을 고른다.
   - 확인: 360×740, 375×667에서 모든 단계를 재서 미션 단계 `ratio ≤ 0.55`, 주 버튼이 처음 화면에 보이거나 스크롤 표시가 보여야 한다.
15. **'함께 이야기해요' 메모를 펼칠 때** `scrollIntoView({ block: 'nearest' })`로 메모가 보이게 한다.
16. **방향 미션 재시도 상태(2묶음 검토):** 한 번 틀리면 '아쉬워요, 한 번 더 골라 볼까요?' 줄이 붙어 390×844에서 0.436이 된다. 압축 카드에서만 이 문구를 `.visually-hidden` 상태 줄로 바꿔 화면 읽기는 그대로 두고, 화면에서는 흐려진 오답 버튼(.is-wrong)이 신호가 되게 한다(0.40 이하 유지).
17. **`?shot=…:missionN` 카메라:** 미션을 바로 열면 TripPanel 출발 효과의 장소 flyTo가 미션 효과보다 나중에 돌아 카메라가 장소 화면이 된다. 개발용 길에서만, `initialStep?.step === 'mission'`이면 장소 flyTo를 건너뛰고 `setInteractive`만 한다.
18. **도장 화면 작은 겹침:** 금색 '쾅!'이 장식 쪽 번호 'P.06'과 겹치고 위 꼭짓점이 조금 잘린다 → '쾅!'을 도장 자리 오른쪽 아래 쪽으로 옮긴다. 넓은 카드(1024×768)에서 다음 도장 자리가 말풍선과 멀리 떨어진다 → `.next-slot`의 `margin-left: auto`를 빼고 말풍선 바로 옆(간격 8~12px)에 둔다.
13. **글꼴 크기:** `@fontsource` 기본 불러오기는 latin-ext·vietnamese 묶음까지 미리 저장한다(woff2 174개, 약 2.5MB). 패키지에 한국어·라틴 묶음만 따로 부르는 CSS가 있으면 그것만 불러서 줄인다. 없으면 그대로 둔다.

- [ ] **Step 7: Commit**

```bash
git add -A src index.html vite.config.ts scripts/shot-cdp.mjs
git commit -m "feat: 안내 카드 종이 모양, 작은 화면 맞춤, 움직임 줄이기 안전망, 첫 화면 지구본 자리·출처 표시, 옛 스타일 정리"
```

---

### Task 9: 전체 확인

**Files:** (고칠 것이 나오면 해당 파일)

- [ ] **Step 1: 코드 검사** — tsc·lint·build 모두 통과.
- [ ] **Step 2: 지명 수** — Task 7 Step 3 방법으로 세 장면 33 / 118 / 38 이상.
- [ ] **Step 3: 여행 21개** — 7곳 × 3단계를 처음부터 끝까지 돌린다(숨은 크롬 CDP로 버튼 클릭·지도 누르기 흉내: 지도 누르기는 지금까지처럼 `__map.fire('click', { point, lngLat, originalEvent })`에 `originalEvent.target`을 캔버스로, `detail: 1`). 각 미션에서 정답 한 번, 저학년·고학년은 첫 장소에서 오답 2번(정답 공개)도 지나간다. 콘솔 오류 0. 여행을 마치면 지구본/평면·지명 보이기·잠금이 원래대로인지 본다(평면으로 바꿔 두고 여행 한 번 → 끝나면 평면, MapButtons 지구본 버튼 이름이 '지구본으로 보기').
- [ ] **Step 4: 화면 비교** — 390×844, 360×740, 1024×768에서 첫 화면·출발·고르기·정답·오답·찾아 누르기·도장을 찍어 기준 시안 PNG와 나란히 비교하고, 크게 다른 점(간격·크기·색·잘림)을 고친다.
- [ ] **Step 5: 카메라** — 찾아 누르기 정답 핀, 핀 꽂기 결과(내 핀 + 정답), 방향 미션 두 표시가 카드에 가려지지 않는지 390×844에서 확인.
- [ ] **Step 6: Commit** (고친 것이 있으면)

```bash
git add -A src
git commit -m "fix: 전체 확인에서 나온 화면 차이 고침"
```
