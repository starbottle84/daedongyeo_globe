# 계획 2: 여행 엔진 · 미션 4종 · 견본 장소 7곳 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 견본 장소 7곳(1단계 태평양·아시아·남극, 2단계 서울·독도·제주도·백두산) 중 하나를 고르면, 나이 구간(유아·저학년·고학년)에 맞춰 출발 → 둘러보기 → 미션 → 도장 → 함께 이야기까지 여행 한 번을 끝까지 할 수 있게 한다.

**Architecture:** 장소 콘텐츠는 JSON 파일(`src/content/places/*.json`)로 두고, 앱이 켜질 때 검사기(`parsePlace`)가 형식을 확인한다. 여행 진행은 순수한 상태 기계(`tripReducer`)가 맡고, 정답 판정도 순수 함수(`judge`)로 분리한다. 화면은 지구본 위 아래쪽 카드(`TripPanel`)에 그린다. 지구본 조작(날아가기, 탭 받기, 표시 핀, 지명 숨기기, 손 조작 잠금)은 `GlobeHandle` 하나로 감싸서 여행 화면이 MapLibre를 직접 만지지 않게 한다. 대륙·대양처럼 넓은 곳은 보이지 않는 영역 층(`area-hit`)으로 "어디를 눌렀는지" 판정한다.

**Tech Stack:** React 19, TypeScript 5.7, maplibre-gl 5.6.0(6.x 업그레이드는 별도 작업, 이 계획의 API는 둘 다에서 동작), vite-plugin-pwa(prompt 모드)

**설계 문서:** `docs/superpowers/specs/2026-10-16-globe-geography-design.md` (4·5·6·7·9·11장)

---

## 전체 계획 지도 (4개 중 2번)

| 계획 | 내용 | 상태 |
|---|---|---|
| 1 | 앱 뼈대, 지구본 이전, 지도 보정, 배포 설정 | 완료 (main) |
| **2 (이 문서)** | 여행 엔진, 미션 4종, 콘텐츠 형식, 견본 장소 7곳 | |
| 3 | 여권·도장 저장·단계 열림, 가족 프로필, 어른 확인, 부모 카드, 기기 저장 | |
| 4 | 첫 출시 콘텐츠 24곳 × 3구간, 유아 음성, 콘텐츠 검사 스크립트 | |

**이 계획에서 일부러 하지 않는 것** (뒤 계획 몫): 도장 저장·여권 화면·단계 열림(계획 3), 가족 프로필(계획 3, 이번에는 시작 화면의 임시 나이 선택으로 대신), 유아 음성 파일(계획 4, 이번에는 "부모님이 읽어 주세요" 안내), 별 모아 숨은 장소·다시 가 보기(나중).

## 이 계획의 작업 규칙

- **자동 테스트는 새로 만들지 않는다** (사용자 규칙: 테스트는 버그를 고칠 때만). 각 작업 끝의 확인 단계(타입 검사·린트·빌드·작은 실행 확인·브라우저 확인)로 대신한다.
- **⚠ 표시 단계**(지우기·덮어쓰기)는 실행 전에 사용자 허락을 받는다. 이 계획에는 ⚠ 단계가 없다(기존 파일은 부분 수정만 한다).
- 빌드는 항상 `npm run build`(한글 경로 안전 빌드). Git Bash에서 `BASE_PATH=/x`처럼 슬래시로 시작하는 값을 넘기면 경로가 바뀌므로 그런 시험은 PowerShell에서 한다.
- **지명 디테일 기준 유지:** 여행을 하지 않을 때의 지명 표시는 계획 1과 같아야 한다(작업 10에서 다시 센다: 1280×800, 세 장면 33 / 118 / 38 이상).
- 아이용 화면 규칙: 누르는 버튼은 높이 44px 이상(큰 버튼 56px), 글자 17px 이상(유아 질문 22px).
- 콘텐츠 글자를 지도에 넣을 때는 `textContent`만 쓴다(HTML로 해석 금지 — MapLibre 5.6 보안 권고 대응).
- 작업 브랜치 `feat/plan2-trip`에서 작업한다(main에 바로 커밋하지 않음).
- 커밋 메시지 끝에는 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`을 붙인다.

## 파일 구조

| 파일 | 역할 | 작업 |
|---|---|---|
| `tsconfig.app.json` | JSON 가져오기 허용(`resolveJsonModule`) | 1 |
| `src/content/types.ts` | 나이 구간·방위·미션·장소 타입 | 1 |
| `src/content/parsePlace.ts` | JSON 장소 콘텐츠 검사기 | 1 |
| `src/content/places/{pacific,asia,antarctica,seoul,dokdo,jeju,baekdu}.json` | 견본 장소 7곳 | 2 |
| `src/content/index.ts` | 장소 목록(`PLACES`) | 2 |
| `scripts/build-data.mjs`, `public/data/areas.geojson` | 대륙 7 + 대양 영역 데이터 | 3 |
| `src/globe/buildStyle.ts` | 보이지 않는 `area-hit` 층 추가 | 3 |
| `src/trip/geo.ts` | 두 지점 사이 거리(km) | 4 |
| `src/trip/judge.ts` | 정답 판정, 틀렸을 때 다음 행동 규칙 | 4 |
| `src/trip/tripReducer.ts` | 여행 진행 상태 기계 | 4 |
| `src/globe/globeHandle.ts`, `src/globe/markers.css` | 여행 화면용 지구본 조작 손잡이, 표시 핀 | 5 |
| `src/globe/GlobeView.tsx` | 지도 준비되면 손잡이 전달(`onReady`) | 5 |
| `src/trip/trip.css` | 여행 화면 전체 스타일 | 6 |
| `src/trip/missions/*` | 미션 4종 화면, 공통 피드백, 시도 처리 | 6 |
| `src/trip/CharacterBubble.tsx`, `StampCard.tsx`, `TripPanel.tsx` | 여행 카드 | 7 |
| `vite.config.ts`, `src/lib/registerPwa.ts`, `src/components/UpdateBanner.*` | 새 버전 알림(여행 중 자동 새로고침 막기) | 8 |
| `src/trip/TripLauncher.tsx` | 임시 시작 화면(나이 구간·장소 고르기) | 9 |
| `src/App.tsx`, `src/styles/global.css`, `src/components/SatelliteNotice.css`, `src/components/InfoCard.css`, `README.md` | 화면 연결, 아래쪽 카드 쌓기, 버튼 크기 | 9 |

---

### Task 0: 작업 브랜치 만들기

- [ ] **Step 1: 브랜치**

Run: `git checkout -b feat/plan2-trip`
Expected: `Switched to a new branch 'feat/plan2-trip'`

---

### Task 1: 콘텐츠 형식과 검사기

**Files:**
- Modify: `tsconfig.app.json`
- Create: `src/content/types.ts`, `src/content/parsePlace.ts`

- [ ] **Step 1: `tsconfig.app.json`에 JSON 가져오기 허용**

`"noUncheckedSideEffectImports": true` 줄 바로 아래(같은 `compilerOptions` 안)에 한 줄 추가한다. 앞 줄 끝에 쉼표를 붙이는 것을 잊지 않는다.

```json
    "noUncheckedSideEffectImports": true,
    "resolveJsonModule": true
```

- [ ] **Step 2: `src/content/types.ts`**

```ts
// 여행 콘텐츠(장소·이야기·미션)의 형식

export type Tier = 'preschool' | 'lower' | 'upper';
export const TIERS: Tier[] = ['preschool', 'lower', 'upper'];
export const TIER_LABELS: Record<Tier, string> = { preschool: '유아', lower: '저학년', upper: '고학년' };

export type ByTier<T> = Record<Tier, T>;

/** [경도, 위도] */
export type LngLat = [number, number];

export interface View {
  center: LngLat;
  zoom: number;
}

// 8방위. 교과서의 "동남쪽"은 "남동"과 같은 방향이다.
export type Direction = '북' | '북동' | '동' | '남동' | '남' | '남서' | '서' | '북서';
export const DIRECTIONS_4: Direction[] = ['북', '동', '남', '서'];
export const DIRECTIONS_8: Direction[] = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];

export interface ChoiceOption {
  label: string;
  /** 글을 못 읽는 유아용 그림 대신 쓰는 이모지 */
  icon?: string;
}

export type Mission =
  | {
      type: 'tap';
      prompt: string;
      /** 힌트·정답 핀을 꽂을 위치 */
      target: LngLat;
      /** 대륙·대양 이름(area-hit 층). 있으면 그 영역 안을 누르면 정답 */
      area?: string;
      /** area가 없을 때: target에서 이 거리(km) 안을 누르면 정답 */
      radiusKm?: number;
      /** 미션 시작 때 보여 줄 화면 (없으면 장소 화면) */
      view?: View;
      explain?: string;
    }
  | { type: 'choice'; prompt: string; options: ChoiceOption[]; answer: number; explain?: string }
  | {
      type: 'pin';
      prompt: string;
      target: LngLat;
      /** [별 3개 거리, 별 2개 거리](km). 그보다 멀면 별 1개 */
      starsKm: [number, number];
      view?: View;
      explain?: string;
    }
  | {
      type: 'direction';
      prompt: string;
      from: LngLat;
      fromName: string;
      to: LngLat;
      toName: string;
      options: 4 | 8;
      answer: Direction;
      explain?: string;
    };

export type MissionOf<T extends Mission['type']> = Extract<Mission, { type: T }>;

export interface Place {
  id: string;
  /** 탐험 단계 1~5 */
  stage: number;
  name: string;
  center: LngLat;
  zoom: number;
  intro: ByTier<string>;
  story: ByTier<string>;
  missions: ByTier<Mission[]>;
  familyTalk: ByTier<string>;
  parentNote: string;
}
```

- [ ] **Step 3: `src/content/parsePlace.ts`**

```ts
import { DIRECTIONS_4, DIRECTIONS_8, type ByTier, type ChoiceOption, type LngLat, type Mission, type Place, type View } from './types';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

// JSON에서 읽은 장소 콘텐츠가 형식에 맞는지 검사하고, 맞으면 Place로 돌려준다.
// 틀린 곳이 있으면 "어느 장소의 어느 칸이 왜 틀렸는지" 알려 주는 오류를 던진다.
export function parsePlace(raw: unknown): Place {
  const id = isObj(raw) && typeof raw.id === 'string' ? raw.id : '(id 없음)';
  const fail = (path: string, why: string): never => {
    throw new Error(`콘텐츠 오류 [${id}] ${path || '(전체)'}: ${why}`);
  };

  const obj = (v: unknown, path: string): Obj => (isObj(v) ? v : fail(path, '객체여야 해요'));
  const str = (v: unknown, path: string): string =>
    typeof v === 'string' && v.trim() !== '' ? v : fail(path, '빈칸이 아닌 글자여야 해요');
  const num = (v: unknown, path: string): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fail(path, '숫자여야 해요');
  const optStr = (v: unknown, path: string): string | undefined => (v === undefined ? undefined : str(v, path));

  const lngLat = (v: unknown, path: string): LngLat => {
    if (!Array.isArray(v) || v.length !== 2) return fail(path, '[경도, 위도] 두 숫자여야 해요');
    const lng = num(v[0], `${path}[0]`);
    const lat = num(v[1], `${path}[1]`);
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return fail(path, '경도 -180~180, 위도 -90~90 범위를 벗어났어요');
    return [lng, lat];
  };

  const optView = (v: unknown, path: string): View | undefined => {
    if (v === undefined) return undefined;
    const o = obj(v, path);
    return { center: lngLat(o.center, `${path}.center`), zoom: num(o.zoom, `${path}.zoom`) };
  };

  const byTier = <T>(v: unknown, path: string, each: (x: unknown, p: string) => T): ByTier<T> => {
    const o = obj(v, path);
    return {
      preschool: each(o.preschool, `${path}.preschool`),
      lower: each(o.lower, `${path}.lower`),
      upper: each(o.upper, `${path}.upper`),
    };
  };

  const mission = (v: unknown, path: string): Mission => {
    const m = obj(v, path);
    const prompt = str(m.prompt, `${path}.prompt`);
    const explain = optStr(m.explain, `${path}.explain`);

    switch (m.type) {
      case 'tap': {
        const area = optStr(m.area, `${path}.area`);
        const radiusKm = m.radiusKm === undefined ? undefined : num(m.radiusKm, `${path}.radiusKm`);
        if (area === undefined && radiusKm === undefined) {
          return fail(path, 'area(대륙·대양 이름)나 radiusKm(정답 반경) 중 하나는 있어야 해요');
        }
        return {
          type: 'tap', prompt, explain, area, radiusKm,
          target: lngLat(m.target, `${path}.target`),
          view: optView(m.view, `${path}.view`),
        };
      }
      case 'choice': {
        const rawOptions = m.options;
        if (!Array.isArray(rawOptions) || rawOptions.length < 2) return fail(`${path}.options`, '보기가 2개 이상이어야 해요');
        const options: ChoiceOption[] = rawOptions.map((o, i) => {
          const oo = obj(o, `${path}.options[${i}]`);
          return { label: str(oo.label, `${path}.options[${i}].label`), icon: optStr(oo.icon, `${path}.options[${i}].icon`) };
        });
        const answer = num(m.answer, `${path}.answer`);
        if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
          return fail(`${path}.answer`, '보기 번호(0부터 시작)가 범위를 벗어났어요');
        }
        return { type: 'choice', prompt, explain, options, answer };
      }
      case 'pin': {
        const rawStars = m.starsKm;
        if (!Array.isArray(rawStars) || rawStars.length !== 2) return fail(`${path}.starsKm`, '[별 3개 거리, 별 2개 거리] 두 숫자여야 해요');
        const starsKm: [number, number] = [num(rawStars[0], `${path}.starsKm[0]`), num(rawStars[1], `${path}.starsKm[1]`)];
        if (starsKm[0] >= starsKm[1]) return fail(`${path}.starsKm`, '별 3개 거리가 별 2개 거리보다 작아야 해요');
        return {
          type: 'pin', prompt, explain, starsKm,
          target: lngLat(m.target, `${path}.target`),
          view: optView(m.view, `${path}.view`),
        };
      }
      case 'direction': {
        const rawCount = m.options;
        const options = rawCount === 4 || rawCount === 8 ? rawCount : fail(`${path}.options`, '4 또는 8이어야 해요');
        const rawAnswer = m.answer;
        const answer = DIRECTIONS_8.find((d) => d === rawAnswer)
          ?? fail(`${path}.answer`, `8방위(${DIRECTIONS_8.join(', ')}) 중 하나여야 해요`);
        if (options === 4 && !DIRECTIONS_4.includes(answer)) {
          return fail(`${path}.answer`, '4방위 문제의 답은 북·동·남·서 중 하나여야 해요');
        }
        return {
          type: 'direction', prompt, explain, options, answer,
          from: lngLat(m.from, `${path}.from`),
          fromName: str(m.fromName, `${path}.fromName`),
          to: lngLat(m.to, `${path}.to`),
          toName: str(m.toName, `${path}.toName`),
        };
      }
      default:
        return fail(`${path}.type`, 'tap, choice, pin, direction 중 하나여야 해요');
    }
  };

  const missions = (v: unknown, path: string): Mission[] => {
    if (!Array.isArray(v) || v.length === 0) return fail(path, '미션이 1개 이상 있어야 해요');
    return v.map((m, i) => mission(m, `${path}[${i}]`));
  };

  const p = obj(raw, '');
  const stage = num(p.stage, 'stage');
  if (!Number.isInteger(stage) || stage < 1 || stage > 5) fail('stage', '1~5 사이 정수여야 해요');

  return {
    id: str(p.id, 'id'),
    stage,
    name: str(p.name, 'name'),
    center: lngLat(p.center, 'center'),
    zoom: num(p.zoom, 'zoom'),
    intro: byTier(p.intro, 'intro', str),
    story: byTier(p.story, 'story', str),
    missions: byTier(p.missions, 'missions', missions),
    familyTalk: byTier(p.familyTalk, 'familyTalk', str),
    parentNote: str(p.parentNote, 'parentNote'),
  };
}
```

- [ ] **Step 4: 타입·린트 확인**

Run: `npx tsc -p tsconfig.app.json --noEmit && npx eslint src/content`
Expected: 출력 없이 끝남.

- [ ] **Step 5: 검사기가 틀린 곳을 알려 주는지 확인**

```bash
npx esbuild src/content/parsePlace.ts --bundle --platform=node --format=esm --outfile=node_modules/.tmp/parsePlace.mjs --log-level=warning && node -e "
import('./node_modules/.tmp/parsePlace.mjs').then(({ parsePlace }) => {
  const t = (raw) => { try { parsePlace(raw); console.log('통과'); } catch (e) { console.log(e.message); } };
  t({ id: 'x', stage: 9 });
  t({ id: 'x', stage: 2, name: '시험', center: [200, 0] });
});"
```

Expected:

```
콘텐츠 오류 [x] stage: 1~5 사이 정수여야 해요
콘텐츠 오류 [x] center: 경도 -180~180, 위도 -90~90 범위를 벗어났어요
```

- [ ] **Step 6: 커밋**

```bash
git add tsconfig.app.json src/content/types.ts src/content/parsePlace.ts
git commit -m "feat: 여행 콘텐츠 형식과 검사기 추가"
```

---

### Task 2: 견본 장소 7곳

첫 출시 목록(설계 문서 10장)에서 골랐다 — 1단계: 태평양·아시아·남극, 2단계: 서울·독도·제주도·백두산. 대양·대륙(영역 판정), 도시, 섬, 산이 고루 들어가고 미션 4종이 모두 쓰인다.

사실 관계는 계획 작성 때 계산·확인했다.
- 방향(대권 첫 방위각): 서울→독도 동(93°) 433km, 서울→부산 남동(144°) 325km, 서울→제주도 남(185°) 467km, 서울→백두산 북(10°) 502km, 한반도→제주도 남(197°), 대한민국→서태평양 동(102°), 대한민국→인도 서(263°), 대한민국→에베레스트 서(268°) 약 3,900km, 대한민국→남극 남(180°).
- 쓰지 않은 방향 문제: 울릉도→독도는 계산상 "동"(108°)인데 교과서는 "동남쪽", 아시아→오세아니아는 147°(4방위 경계 근처), 부산→제주도는 230°(남서, 4방위 경계) — 아이가 헷갈릴 수 있어 뺐다.
- 독도: 동도·서도와 89개 부속 섬, 울릉도에서 약 87km. 서울: 1394년부터 수도. 태평양: 지구 표면의 약 3분의 1, 마리아나 해구 약 11,000m. 아시아: 가장 넓은 대륙, 세계 인구의 약 60%. 남극: 땅의 약 98%가 평균 두께 약 2km의 얼음, 세종과학기지(1988, 킹조지섬)·장보고과학기지(2014). 제주도: 가장 큰 화산섬, 한라산 1,947m(지도 데이터는 1,950m라 보기는 "약 1,950m"), 2007년 유네스코 세계자연유산. 백두산: 2,744m, 꼭대기에 칼데라 호수 천지, 압록강·두만강이 시작됨, 북한·중국 국경.
- 고르기 보기 수는 설계 문서대로 유아 2개(그림), 저학년 3개, 고학년 4개.

**Files:**
- Create: `src/content/places/{pacific,asia,antarctica,seoul,dokdo,jeju,baekdu}.json`, `src/content/index.ts`

- [ ] **Step 1: `src/content/places/pacific.json`**

```json
{
  "id": "pacific",
  "stage": 1,
  "name": "태평양",
  "center": [-170, 5],
  "zoom": 1.5,
  "intro": {
    "preschool": "세상에서 제일 큰 바다로 가 볼까?",
    "lower": "오늘은 지구에서 가장 넓은 바다, 태평양으로 가 볼까?",
    "upper": "오늘의 목적지는 다섯 대양 중 가장 넓은 태평양이에요."
  },
  "story": {
    "preschool": "태평양은 아주아주 넓은 바다예요. 고래와 거북이가 헤엄쳐요.",
    "lower": "태평양은 지구에서 가장 넓은 바다예요. 우리나라 동쪽부터 아메리카 대륙까지 넓게 펼쳐져 있어요.",
    "upper": "태평양은 지구 표면의 약 3분의 1을 덮는 가장 넓은 대양이에요. 아시아·오세아니아와 아메리카 대륙 사이에 있고, 지구에서 가장 깊은 바다인 마리아나 해구도 태평양에 있어요."
  },
  "missions": {
    "preschool": [
      { "type": "tap", "prompt": "제일 큰 바다, 태평양을 눌러 봐!", "target": [-160, 0], "area": "태평양", "explain": "태평양은 지구에서 가장 넓은 바다예요." },
      { "type": "choice", "prompt": "태평양에 사는 동물은 누구일까?", "options": [{ "label": "고래", "icon": "🐋" }, { "label": "낙타", "icon": "🐫" }], "answer": 0, "explain": "넓은 바다 태평양에는 고래가 살아요." }
    ],
    "lower": [
      { "type": "choice", "prompt": "지구에서 가장 넓은 바다는 어디일까?", "options": [{ "label": "태평양" }, { "label": "대서양" }, { "label": "인도양" }], "answer": 0, "explain": "태평양이 다섯 대양 중 가장 넓어요." },
      { "type": "tap", "prompt": "지구본에서 태평양을 찾아 눌러 봐!", "target": [-160, 0], "area": "태평양" },
      { "type": "direction", "prompt": "우리나라에서 보면 태평양은 어느 쪽에 있을까?", "from": [127.8, 36.3], "fromName": "대한민국", "to": [150, 30], "toName": "태평양", "options": 4, "answer": "동", "explain": "태평양은 우리나라의 동쪽에 넓게 펼쳐져 있어요." }
    ],
    "upper": [
      { "type": "pin", "prompt": "지명이 사라졌어요! 태평양 한가운데를 찍어 보세요.", "target": [-160, 0], "starsKm": [1500, 4000], "view": { "center": [140, 15], "zoom": 1.4 }, "explain": "태평양 한가운데는 하와이 남쪽, 적도 근처예요." },
      { "type": "choice", "prompt": "태평양에서 가장 깊은 곳의 이름은 무엇일까요?", "options": [{ "label": "마리아나 해구" }, { "label": "그랜드캐니언" }, { "label": "사하라" }, { "label": "에베레스트" }], "answer": 0, "explain": "마리아나 해구는 깊이가 약 11,000m로, 지구에서 가장 깊은 바다예요." },
      { "type": "choice", "prompt": "태평양은 지구 표면의 약 얼마를 덮고 있을까요?", "options": [{ "label": "약 10분의 1" }, { "label": "약 3분의 1" }, { "label": "약 2분의 1" }, { "label": "약 4분의 3" }], "answer": 1, "explain": "태평양은 지구 표면의 약 3분의 1을 덮고 있어요." }
    ]
  },
  "familyTalk": {
    "preschool": "고래 흉내를 같이 내 볼까? 푸우~",
    "lower": "바다에 가 본 적 있어? 그 바다는 어느 바다였을까?",
    "upper": "태평양을 건너 여행한다면 어디에 가 보고 싶어? 지구본에서 같이 찾아보자."
  },
  "parentNote": "태평양은 지구 표면의 약 3분의 1을 차지하는 가장 큰 대양이에요. 가장 깊은 곳은 마리아나 해구(약 11,000m)예요."
}
```

- [ ] **Step 2: `src/content/places/seoul.json`**

```json
{
  "id": "seoul",
  "stage": 2,
  "name": "서울",
  "center": [126.978, 37.566],
  "zoom": 7,
  "intro": {
    "preschool": "우리나라에서 제일 큰 도시로 가 보자!",
    "lower": "오늘은 우리나라의 수도, 서울로 가 볼까?",
    "upper": "오늘의 목적지는 대한민국의 수도, 서울이에요."
  },
  "story": {
    "preschool": "서울에는 높은 건물과 사람이 아주 많아요. 가운데로 커다란 강이 흘러요.",
    "lower": "서울은 우리나라의 수도예요. 도시 한가운데로 한강이 흐르고, 나라의 중요한 일을 하는 곳이 많이 모여 있어요.",
    "upper": "서울은 대한민국의 수도로, 900만 명이 넘는 사람이 살아요. 한강이 도시를 남북으로 나누며 흐르고, 1394년 조선의 도읍이 된 뒤 600년 넘게 나라의 중심이었어요."
  },
  "missions": {
    "preschool": [
      { "type": "tap", "prompt": "빨간 별이 있는 큰 도시, 서울을 눌러 봐!", "target": [126.978, 37.566], "radiusKm": 40, "explain": "빨간 별은 나라의 수도를 알려 줘요." },
      { "type": "choice", "prompt": "서울 한가운데로 흐르는 건 무엇일까?", "options": [{ "label": "강", "icon": "🌊" }, { "label": "사막", "icon": "🏜️" }], "answer": 0, "explain": "서울 한가운데로 한강이 흘러요." }
    ],
    "lower": [
      { "type": "choice", "prompt": "우리나라의 수도는 어디일까?", "options": [{ "label": "부산" }, { "label": "서울" }, { "label": "제주" }], "answer": 1, "explain": "우리나라의 수도는 서울이에요." },
      { "type": "tap", "prompt": "지구본에서 서울을 찾아 눌러 봐!", "target": [126.978, 37.566], "radiusKm": 25, "explain": "빨간 별은 나라의 수도를 알려 줘요." },
      { "type": "direction", "prompt": "서울에서 보면 제주도는 어느 쪽에 있을까?", "from": [126.978, 37.566], "fromName": "서울", "to": [126.53, 33.38], "toName": "제주도", "options": 4, "answer": "남", "explain": "제주도는 서울에서 남쪽 바다에 있어요." }
    ],
    "upper": [
      { "type": "pin", "prompt": "지명이 사라졌어요! 서울의 위치를 찍어 보세요.", "target": [126.978, 37.566], "starsKm": [15, 60], "view": { "center": [127.8, 36.2], "zoom": 6 }, "explain": "서울은 한반도 서쪽 가운데, 한강 하류에 있어요." },
      { "type": "direction", "prompt": "서울에서 보면 부산은 어느 방향에 있을까요?", "from": [126.978, 37.566], "fromName": "서울", "to": [129.075, 35.18], "toName": "부산", "options": 8, "answer": "남동", "explain": "부산은 서울에서 남동쪽으로 약 320km 떨어져 있어요." },
      { "type": "choice", "prompt": "서울은 몇 년 넘게 우리나라의 중심이었을까요?", "options": [{ "label": "약 60년" }, { "label": "약 600년" }, { "label": "약 6,000년" }, { "label": "약 6만 년" }], "answer": 1, "explain": "서울은 1394년 조선의 도읍이 된 뒤 600년 넘게 나라의 중심이었어요." }
    ]
  },
  "familyTalk": {
    "preschool": "높은 건물을 본 적 있어? 어디서 봤는지 이야기해 보자.",
    "lower": "우리 집에서 서울은 어느 쪽일까? 지구본에서 같이 찾아보자.",
    "upper": "수도에는 어떤 곳들이 모여 있을까? 우리 지역과 서울을 비교해 이야기해 보자."
  },
  "parentNote": "서울은 1394년 조선의 도읍이 된 뒤 600년 넘게 우리나라의 중심이었어요. 지금은 900만 명이 넘게 사는 대한민국 최대 도시예요."
}
```

- [ ] **Step 3: `src/content/places/dokdo.json`**

```json
{
  "id": "dokdo",
  "stage": 2,
  "name": "독도",
  "center": [130.6, 37.3],
  "zoom": 6.5,
  "intro": {
    "preschool": "갈매기 친구들이 사는 섬으로 가 볼까?",
    "lower": "오늘은 우리나라 동쪽 끝에 있는 섬, 독도로 가 볼까?",
    "upper": "오늘의 목적지는 우리나라 가장 동쪽에 있는 섬, 독도예요."
  },
  "story": {
    "preschool": "독도는 바다 한가운데 있는 바위섬이에요. 괭이갈매기가 아주 많이 살아요. 끼룩끼룩!",
    "lower": "독도는 동도와 서도, 두 개의 큰 섬으로 되어 있어요. 괭이갈매기가 많이 살고, 독도를 지키는 사람들도 있어요.",
    "upper": "독도는 동도와 서도, 그리고 89개의 작은 바위섬으로 이루어져 있어요. 울릉도에서 동남쪽으로 약 87km 떨어져 있어요."
  },
  "missions": {
    "preschool": [
      { "type": "tap", "prompt": "갈매기가 사는 섬, 독도를 눌러 봐!", "target": [131.8669, 37.2422], "radiusKm": 80, "explain": "여기가 독도예요!" },
      { "type": "choice", "prompt": "독도에 많이 사는 새는 누구일까?", "options": [{ "label": "괭이갈매기", "icon": "🐦" }, { "label": "펭귄", "icon": "🐧" }], "answer": 0, "explain": "독도에는 괭이갈매기가 아주 많이 살아요." }
    ],
    "lower": [
      { "type": "choice", "prompt": "독도는 어느 바다에 있을까?", "options": [{ "label": "동해" }, { "label": "서해" }, { "label": "남해" }], "answer": 0, "explain": "독도는 우리나라 동쪽 바다, 동해에 있어요." },
      { "type": "tap", "prompt": "독도와 가장 가까운 섬, 울릉도를 찾아 눌러 봐!", "target": [130.8667, 37.4983], "radiusKm": 30, "explain": "울릉도는 독도에서 가장 가까운 우리 섬이에요." },
      { "type": "direction", "prompt": "서울에서 보면 독도는 어느 쪽에 있을까?", "from": [126.978, 37.566], "fromName": "서울", "to": [131.8669, 37.2422], "toName": "독도", "options": 4, "answer": "동", "explain": "독도는 서울에서 동쪽으로 멀리 떨어져 있어요." }
    ],
    "upper": [
      { "type": "pin", "prompt": "지명이 사라졌어요! 독도의 위치를 찍어 보세요.", "target": [131.8669, 37.2422], "starsKm": [20, 80], "view": { "center": [128.5, 36], "zoom": 5.2 }, "explain": "독도는 울릉도에서 동남쪽으로 약 87km 떨어져 있어요." },
      { "type": "direction", "prompt": "서울에서 보면 독도는 어느 방향에 있을까요?", "from": [126.978, 37.566], "fromName": "서울", "to": [131.8669, 37.2422], "toName": "독도", "options": 8, "answer": "동", "explain": "독도는 서울에서 거의 정동쪽으로 약 430km 떨어져 있어요." },
      { "type": "choice", "prompt": "독도에는 동도와 서도 말고도 작은 바위섬이 몇 개쯤 있을까요?", "options": [{ "label": "약 9개" }, { "label": "약 89개" }, { "label": "약 890개" }, { "label": "약 8,900개" }], "answer": 1, "explain": "독도는 동도·서도와 89개의 작은 바위섬으로 이루어져 있어요." }
    ]
  },
  "familyTalk": {
    "preschool": "갈매기 소리를 같이 흉내 내 볼까? 끼룩끼룩!",
    "lower": "우리가 가 본 섬은 어디였지? 지구본에서 같이 찾아보자.",
    "upper": "독도가 우리 땅인 이유를 가족에게 설명해 볼래?"
  },
  "parentNote": "독도는 경상북도 울릉군에 속한 우리나라 가장 동쪽의 섬이에요. 동도와 서도, 89개의 부속 섬으로 이루어져 있고 울릉도에서 동남쪽으로 약 87.4km 떨어져 있어요."
}
```

- [ ] **Step 4: `src/content/places/asia.json`**

```json
{
  "id": "asia",
  "stage": 1,
  "name": "아시아",
  "center": [100, 35],
  "zoom": 1.5,
  "intro": {
    "preschool": "우리나라가 있는 아주 큰 땅으로 가 볼까?",
    "lower": "오늘은 우리나라가 있는 대륙, 아시아로 가 볼까?",
    "upper": "오늘의 목적지는 일곱 대륙 중 가장 넓은 아시아예요."
  },
  "story": {
    "preschool": "아시아는 아주아주 큰 땅이에요. 우리나라도 아시아에 있어요. 판다도 아시아에 살아요.",
    "lower": "아시아는 세계에서 가장 넓은 대륙이에요. 우리나라와 중국, 일본, 인도 같은 많은 나라가 아시아에 있어요.",
    "upper": "아시아는 가장 넓은 대륙으로, 세계 사람의 절반이 넘게 살아요. 세계에서 가장 높은 산인 에베레스트산도 아시아의 히말라야산맥에 있어요."
  },
  "missions": {
    "preschool": [
      { "type": "tap", "prompt": "우리나라가 있는 큰 땅, 아시아를 눌러 봐!", "target": [95, 45], "area": "아시아", "explain": "우리나라도 아시아에 있어요." },
      { "type": "choice", "prompt": "아시아에 사는 동물은 누구일까?", "options": [{ "label": "판다", "icon": "🐼" }, { "label": "캥거루", "icon": "🦘" }], "answer": 0, "explain": "판다는 아시아의 중국에 살아요." }
    ],
    "lower": [
      { "type": "choice", "prompt": "우리나라는 어느 대륙에 있을까?", "options": [{ "label": "아시아" }, { "label": "유럽" }, { "label": "아프리카" }], "answer": 0, "explain": "우리나라는 아시아 대륙의 동쪽에 있어요." },
      { "type": "tap", "prompt": "지구본에서 아시아를 찾아 눌러 봐!", "target": [95, 45], "area": "아시아" },
      { "type": "direction", "prompt": "우리나라에서 보면 인도는 어느 쪽에 있을까?", "from": [127.8, 36.3], "fromName": "대한민국", "to": [78.96, 20.59], "toName": "인도", "options": 4, "answer": "서", "explain": "인도는 우리나라의 서쪽에 있어요." }
    ],
    "upper": [
      { "type": "pin", "prompt": "지명이 사라졌어요! 세계에서 가장 높은 산, 에베레스트산을 찍어 보세요.", "target": [86.925, 27.988], "starsKm": [300, 1000], "view": { "center": [100, 35], "zoom": 2 }, "explain": "에베레스트산은 네팔과 중국 사이, 히말라야산맥에 있어요." },
      { "type": "direction", "prompt": "우리나라에서 보면 에베레스트산은 어느 방향에 있을까요?", "from": [127.8, 36.3], "fromName": "대한민국", "to": [86.925, 27.988], "toName": "에베레스트산", "options": 8, "answer": "서", "explain": "에베레스트산은 우리나라에서 서쪽으로 약 3,900km 떨어져 있어요." },
      { "type": "choice", "prompt": "아시아에는 세계 사람의 약 얼마가 살까요?", "options": [{ "label": "약 10분의 1" }, { "label": "약 4분의 1" }, { "label": "절반이 넘게" }, { "label": "거의 전부" }], "answer": 2, "explain": "세계 사람 10명 중 6명쯤이 아시아에 살아요." }
    ]
  },
  "familyTalk": {
    "preschool": "판다 흉내를 같이 내 볼까? 대나무를 냠냠!",
    "lower": "아시아에 있는 나라 중에 아는 나라를 같이 말해 보자.",
    "upper": "아시아에서 가 보고 싶은 나라는 어디야? 지구본에서 같이 찾아보자."
  },
  "parentNote": "아시아는 지구 육지의 약 30%를 차지하는 가장 넓은 대륙이고, 세계 인구의 약 60%가 살아요. 세계에서 가장 높은 에베레스트산(약 8,849m)이 있어요."
}
```

- [ ] **Step 5: `src/content/places/antarctica.json`**

```json
{
  "id": "antarctica",
  "stage": 1,
  "name": "남극",
  "center": [60, -72],
  "zoom": 1.5,
  "intro": {
    "preschool": "펭귄 친구들이 사는 얼음 나라로 가 볼까?",
    "lower": "오늘은 지구의 가장 남쪽, 남극으로 가 볼까?",
    "upper": "오늘의 목적지는 지구에서 가장 추운 대륙, 남극이에요."
  },
  "story": {
    "preschool": "남극은 꽁꽁 언 얼음 나라예요. 뒤뚱뒤뚱 펭귄이 살아요.",
    "lower": "남극은 지구의 가장 남쪽에 있는 대륙이에요. 아주 춥고 땅이 두꺼운 얼음으로 덮여 있어요. 펭귄이 살아요.",
    "upper": "남극은 지구에서 가장 춥고 바람이 센 대륙으로, 땅의 대부분이 평균 두께 약 2km의 얼음으로 덮여 있어요. 우리나라는 세종과학기지와 장보고과학기지에서 남극을 연구해요."
  },
  "missions": {
    "preschool": [
      { "type": "tap", "prompt": "펭귄이 사는 얼음 땅, 남극을 눌러 봐!", "target": [60, -80], "area": "남극", "explain": "여기가 꽁꽁 언 남극이에요." },
      { "type": "choice", "prompt": "남극에 사는 동물은 누구일까?", "options": [{ "label": "펭귄", "icon": "🐧" }, { "label": "기린", "icon": "🦒" }], "answer": 0, "explain": "남극에는 펭귄이 살아요." }
    ],
    "lower": [
      { "type": "choice", "prompt": "남극은 어떤 곳일까?", "options": [{ "label": "얼음으로 덮인 추운 곳" }, { "label": "뜨거운 모래사막" }, { "label": "나무가 빽빽한 숲" }], "answer": 0, "explain": "남극은 땅 대부분이 두꺼운 얼음으로 덮여 있어요." },
      { "type": "tap", "prompt": "지구본에서 남극을 찾아 눌러 봐!", "target": [60, -80], "area": "남극" },
      { "type": "direction", "prompt": "우리나라에서 보면 남극은 어느 쪽에 있을까?", "from": [127.8, 36.3], "fromName": "대한민국", "to": [127.8, -75], "toName": "남극", "options": 4, "answer": "남", "explain": "남극은 지구의 가장 남쪽에 있어요." }
    ],
    "upper": [
      { "type": "pin", "prompt": "지명이 사라졌어요! 우리나라 세종과학기지가 있는 킹조지섬을 찍어 보세요.", "target": [-58.787, -62.223], "starsKm": [300, 1000], "view": { "center": [-30, -68], "zoom": 1.8 }, "explain": "킹조지섬은 남아메리카 끝과 가까운 남극반도 북쪽에 있어요." },
      { "type": "choice", "prompt": "남극 얼음의 평균 두께는 약 얼마일까요?", "options": [{ "label": "약 2m" }, { "label": "약 200m" }, { "label": "약 2km" }, { "label": "약 20km" }], "answer": 2, "explain": "남극 얼음의 평균 두께는 약 2km(2,000m)예요." },
      { "type": "choice", "prompt": "남극에 있는 우리나라 과학기지는 어느 것일까요?", "options": [{ "label": "세종과학기지" }, { "label": "나로우주센터" }, { "label": "독도경비대" }, { "label": "국립중앙박물관" }], "answer": 0, "explain": "세종과학기지는 1988년 킹조지섬에 세운 우리나라의 첫 남극 기지예요." }
    ]
  },
  "familyTalk": {
    "preschool": "펭귄처럼 뒤뚱뒤뚱 걸어 볼까?",
    "lower": "남극에 간다면 무엇을 챙겨 가야 할까?",
    "upper": "남극에서 과학자들은 무엇을 연구할까? 함께 이야기해 보자."
  },
  "parentNote": "남극은 땅의 약 98%가 얼음으로 덮인 가장 추운 대륙이에요. 우리나라는 1988년 세종과학기지, 2014년 장보고과학기지를 세워 남극을 연구하고 있어요."
}
```

- [ ] **Step 6: `src/content/places/jeju.json`**

```json
{
  "id": "jeju",
  "stage": 2,
  "name": "제주도",
  "center": [126.8, 34.4],
  "zoom": 6.3,
  "intro": {
    "preschool": "귤이 주렁주렁 열리는 섬으로 가 볼까?",
    "lower": "오늘은 우리나라에서 가장 큰 섬, 제주도로 가 볼까?",
    "upper": "오늘의 목적지는 화산이 만든 섬, 제주도예요."
  },
  "story": {
    "preschool": "제주도는 바다 위에 있는 큰 섬이에요. 돌하르방 할아버지가 섬을 지켜요.",
    "lower": "제주도는 우리나라에서 가장 큰 섬이에요. 가운데에 높은 한라산이 있고, 귤이 많이 나요.",
    "upper": "제주도는 화산 활동으로 생긴 섬이에요. 한가운데 있는 한라산(1,947m)은 남한에서 가장 높은 산이고, 제주의 화산섬과 용암 동굴은 유네스코 세계자연유산이에요."
  },
  "missions": {
    "preschool": [
      { "type": "tap", "prompt": "귤이 많이 나는 섬, 제주도를 눌러 봐!", "target": [126.55, 33.38], "radiusKm": 50, "explain": "여기가 제주도예요!" },
      { "type": "choice", "prompt": "제주도에서 많이 나는 과일은 무엇일까?", "options": [{ "label": "귤", "icon": "🍊" }, { "label": "코코넛", "icon": "🥥" }], "answer": 0, "explain": "제주도에서는 귤이 많이 나요." }
    ],
    "lower": [
      { "type": "choice", "prompt": "제주도는 우리나라 섬 가운데 어떤 섬일까?", "options": [{ "label": "가장 큰 섬" }, { "label": "가장 작은 섬" }, { "label": "가장 북쪽 섬" }], "answer": 0, "explain": "제주도는 우리나라에서 가장 큰 섬이에요." },
      { "type": "tap", "prompt": "제주도 한가운데 있는 한라산을 찾아 눌러 봐!", "target": [126.5312, 33.3617], "radiusKm": 12, "view": { "center": [126.55, 33.38], "zoom": 8 }, "explain": "한라산은 제주도 한가운데에 있는 산이에요." },
      { "type": "direction", "prompt": "한반도에서 보면 제주도는 어느 쪽 바다에 있을까?", "from": [127.5, 36], "fromName": "한반도", "to": [126.53, 33.38], "toName": "제주도", "options": 4, "answer": "남", "explain": "제주도는 한반도 남쪽 바다에 있어요." }
    ],
    "upper": [
      { "type": "pin", "prompt": "지명이 사라졌어요! 한라산 꼭대기를 찍어 보세요.", "target": [126.5312, 33.3617], "starsKm": [5, 15], "view": { "center": [126.55, 33.38], "zoom": 8 }, "explain": "한라산 꼭대기에는 백록담이라는 호수가 있어요." },
      { "type": "choice", "prompt": "한라산의 높이는 약 몇 m일까요?", "options": [{ "label": "약 950m" }, { "label": "약 1,950m" }, { "label": "약 2,950m" }, { "label": "약 8,850m" }], "answer": 1, "explain": "한라산은 높이 1,947m로 남한에서 가장 높은 산이에요." },
      { "type": "direction", "prompt": "서울에서 보면 제주도는 어느 방향에 있을까요?", "from": [126.978, 37.566], "fromName": "서울", "to": [126.53, 33.38], "toName": "제주도", "options": 8, "answer": "남", "explain": "제주도는 서울에서 남쪽으로 약 470km 떨어져 있어요." }
    ]
  },
  "familyTalk": {
    "preschool": "돌하르방처럼 두 손을 배에 올려 볼까?",
    "lower": "섬에 가려면 무엇을 타야 할까? 같이 이야기해 보자.",
    "upper": "화산이 만든 섬에서는 어떤 돌을 볼 수 있을까? 함께 찾아보자."
  },
  "parentNote": "제주도는 우리나라에서 가장 큰 화산섬이에요. 한라산(1,947m)은 남한에서 가장 높은 산이고, 2007년 '제주 화산섬과 용암 동굴'이 유네스코 세계자연유산이 되었어요."
}
```

- [ ] **Step 7: `src/content/places/baekdu.json`**

```json
{
  "id": "baekdu",
  "stage": 2,
  "name": "백두산",
  "center": [128.06, 41.4],
  "zoom": 7,
  "intro": {
    "preschool": "한반도에서 제일 높은 산으로 가 볼까?",
    "lower": "오늘은 한반도에서 가장 높은 산, 백두산으로 가 볼까?",
    "upper": "오늘의 목적지는 한반도에서 가장 높은 산, 백두산이에요."
  },
  "story": {
    "preschool": "백두산은 아주아주 높은 산이에요. 꼭대기에 커다란 호수가 있어요.",
    "lower": "백두산은 한반도에서 가장 높은 산이에요. 꼭대기에 천지라는 큰 호수가 있고, 압록강과 두만강이 백두산에서 시작돼요.",
    "upper": "백두산은 높이 2,744m로 한반도에서 가장 높은 화산이에요. 꼭대기에는 칼데라 호수인 천지가 있고, 압록강과 두만강이 백두산에서 시작돼요. 지금은 북한과 중국의 국경에 걸쳐 있어요."
  },
  "missions": {
    "preschool": [
      { "type": "tap", "prompt": "한반도에서 제일 높은 산, 백두산을 눌러 봐!", "target": [128.0554, 42.0063], "radiusKm": 40, "explain": "여기가 백두산이에요!" },
      { "type": "choice", "prompt": "백두산 꼭대기에 있는 것은 무엇일까?", "options": [{ "label": "호수", "icon": "🏞️" }, { "label": "사막", "icon": "🏜️" }], "answer": 0, "explain": "백두산 꼭대기에는 천지라는 큰 호수가 있어요." }
    ],
    "lower": [
      { "type": "choice", "prompt": "백두산 꼭대기에 있는 호수의 이름은 무엇일까?", "options": [{ "label": "천지" }, { "label": "백록담" }, { "label": "소양호" }], "answer": 0, "explain": "천지는 백두산 꼭대기에 있어요. 백록담은 한라산 꼭대기의 호수예요." },
      { "type": "tap", "prompt": "압록강과 두만강이 시작되는 백두산을 찾아 눌러 봐!", "target": [128.0554, 42.0063], "radiusKm": 30 },
      { "type": "direction", "prompt": "서울에서 보면 백두산은 어느 쪽에 있을까?", "from": [126.978, 37.566], "fromName": "서울", "to": [128.0554, 42.0063], "toName": "백두산", "options": 4, "answer": "북", "explain": "백두산은 서울에서 북쪽으로 약 500km 떨어져 있어요." }
    ],
    "upper": [
      { "type": "pin", "prompt": "지명이 사라졌어요! 백두산의 위치를 찍어 보세요.", "target": [128.0554, 42.0063], "starsKm": [25, 80], "view": { "center": [127.8, 38.8], "zoom": 5.5 }, "explain": "백두산은 한반도 북쪽 끝, 압록강과 두만강이 시작되는 곳에 있어요." },
      { "type": "choice", "prompt": "백두산의 높이는 약 몇 m일까요?", "options": [{ "label": "약 744m" }, { "label": "약 1,744m" }, { "label": "약 2,744m" }, { "label": "약 8,744m" }], "answer": 2, "explain": "백두산은 높이 2,744m로 한반도에서 가장 높은 산이에요." },
      { "type": "direction", "prompt": "서울에서 보면 백두산은 어느 방향에 있을까요?", "from": [126.978, 37.566], "fromName": "서울", "to": [128.0554, 42.0063], "toName": "백두산", "options": 8, "answer": "북", "explain": "백두산은 서울에서 거의 정북쪽으로 약 500km 떨어져 있어요." }
    ]
  },
  "familyTalk": {
    "preschool": "높은 산에 올라가면 무엇이 보일까? 같이 상상해 보자.",
    "lower": "아주 높은 산에 올라간다면 무엇을 챙겨 갈까?",
    "upper": "백두산에서 시작하는 강들은 어디로 흘러갈까? 지구본에서 같이 따라가 보자."
  },
  "parentNote": "백두산은 높이 2,744m로 한반도에서 가장 높은 산이자 화산이에요. 꼭대기에 칼데라 호수 천지가 있고, 압록강과 두만강이 백두산에서 시작돼요. 지금은 북한과 중국의 국경에 있어요."
}
```

- [ ] **Step 8: `src/content/index.ts`**

```ts
import pacific from './places/pacific.json';
import asia from './places/asia.json';
import antarctica from './places/antarctica.json';
import seoul from './places/seoul.json';
import dokdo from './places/dokdo.json';
import jeju from './places/jeju.json';
import baekdu from './places/baekdu.json';
import { parsePlace } from './parsePlace';
import type { Place } from './types';

// 계획 2의 견본 장소 7곳 (첫 출시 24곳은 계획 4에서 채운다). 앱이 켜질 때 형식을 검사한다.
// 순서가 시작 화면의 카드 순서이자 "다음엔 ○○에 가 볼까요?"의 순서다.
export const PLACES: Place[] = [pacific, asia, antarctica, seoul, dokdo, jeju, baekdu].map(parsePlace);
```

- [ ] **Step 9: 일곱 장소가 검사를 통과하는지 확인**

```bash
npx esbuild src/content/index.ts --bundle --platform=node --format=esm --outfile=node_modules/.tmp/content.mjs --log-level=warning && node -e "
import('./node_modules/.tmp/content.mjs').then(({ PLACES }) => {
  for (const p of PLACES) console.log(p.id, p.stage, p.name, Object.entries(p.missions).map(([t, m]) => t + ':' + m.map((x) => x.type).join('/')).join(' '));
});"
```

Expected:

```
pacific 1 태평양 preschool:tap/choice lower:choice/tap/direction upper:pin/choice/choice
asia 1 아시아 preschool:tap/choice lower:choice/tap/direction upper:pin/direction/choice
antarctica 1 남극 preschool:tap/choice lower:choice/tap/direction upper:pin/choice/choice
seoul 2 서울 preschool:tap/choice lower:choice/tap/direction upper:pin/direction/choice
dokdo 2 독도 preschool:tap/choice lower:choice/tap/direction upper:pin/direction/choice
jeju 2 제주도 preschool:tap/choice lower:choice/tap/direction upper:pin/choice/direction
baekdu 2 백두산 preschool:tap/choice lower:choice/tap/direction upper:pin/choice/direction
```

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: 출력 없음.

- [ ] **Step 10: 커밋**

```bash
git add src/content
git commit -m "feat: 견본 장소 7곳(태평양·아시아·남극·서울·독도·제주도·백두산) 콘텐츠 추가"
```

---

### Task 3: 대륙·대양 영역 데이터와 판정용 층

"태평양을 눌러 봐" 같은 미션은 점 하나로부터의 거리로 판정하면 엉성하다(일본 동쪽 바다를 눌러도 오답). Natural Earth의 대륙 7개·대양 경계를 단순화해 `areas.geojson`으로 만들고, 지구본에 **보이지 않는**(투명도 0) 채우기 층 `area-hit`으로 올린다. MapLibre는 숨김(`visibility: none`)이 아닌 한 투명도 0 층도 "누른 곳의 지물 찾기"에 포함한다(계획 작성 때 MapLibre 소스의 `isHidden`이 확대 범위·visibility만 본다는 것을 확인함). 지명 층은 바뀌지 않는다.

**Files:**
- Modify: `scripts/build-data.mjs` (파일 끝에 9번 구역 추가)
- Create (생성됨): `public/data/areas.geojson`
- Modify: `src/globe/buildStyle.ts` (sources에 `areas`, layers에 `area-hit`)

- [ ] **Step 1: `scripts/build-data.mjs` 끝에 9번 구역 추가**

파일 맨 끝(8번 `geo-lines` 구역 다음)에 덧붙인다.

```js

// ---------- 9. 대륙·대양 영역 (지도에 그리지 않고 '찾아 누르기' 미션 판정에만 쓴다) ----------
// 태평양·대서양은 남북 두 조각이지만 이름(ko)이 같아서 한 영역처럼 판정된다.
const continents = read('ne_10m_geography_regions_polys')
  .filter((f) => f.geometry && f.properties.FEATURECLA === 'Continent');
const oceans = read('ne_10m_geography_marine_polys')
  .filter((f) => f.geometry && f.properties.featurecla === 'ocean');
write('areas', [
  ...continents.map((f) => ({
    type: 'Feature',
    properties: { ko: pick(f.properties.NAME_KO, f.properties.NAME), kind: 'continent' },
    geometry: simplifyGeometry(f.geometry, 0.05, 2),
  })),
  ...oceans.map((f) => ({
    type: 'Feature',
    properties: { ko: pick(f.properties.name_ko, f.properties.name), kind: 'ocean' },
    geometry: simplifyGeometry(f.geometry, 0.05, 2),
  })),
]);
```

(`write`가 보정 데이터를 적용하므로 "오스트레일리아 대륙"은 "오세아니아"가 된다.)

- [ ] **Step 2: 데이터 다시 만들기와 확인**

Run: `npm run data:build`
Expected: 마지막 줄에 `areas.geojson  14 features  N KB` (N은 약 300~900). 다른 11개 파일은 내용이 바뀌지 않는다.

Run:

```bash
git status --short public/data && node -e "
const f = JSON.parse(require('fs').readFileSync('public/data/areas.geojson','utf8')).features;
console.log([...new Set(f.map((x) => x.properties.kind + ':' + x.properties.ko))].join(', '));"
```

Expected: `?? public/data/areas.geojson` 한 줄만 바뀜. 이름 목록은 `continent:남아메리카, continent:오세아니아, continent:아프리카, continent:남극, continent:아시아, continent:유럽, continent:북아메리카, ocean:북극해, ocean:남극해, ocean:대서양, ocean:태평양, ocean:인도양`.

- [ ] **Step 3: `src/globe/buildStyle.ts`에 영역 출처와 층 추가**

sources의 마지막 항목 뒤에 한 줄 추가:

기존:

```ts
      rivers: source('rivers'),
      geoLines: source('geo-lines'),
    },
```

새 코드:

```ts
      rivers: source('rivers'),
      geoLines: source('geo-lines'),
      areas: source('areas'),
    },
```

`lake-fill` 층 바로 다음에 층 하나 추가:

기존:

```ts
      {
        id: 'lake-fill', type: 'fill', source: 'lakes',
        layout: { visibility: shown(!t.satellite) },
        paint: { 'fill-color': OCEAN_COLOR },
      },
```

새 코드:

```ts
      {
        id: 'lake-fill', type: 'fill', source: 'lakes',
        layout: { visibility: shown(!t.satellite) },
        paint: { 'fill-color': OCEAN_COLOR },
      },
      // 보이지 않는 대륙·대양 영역. '찾아 누르기' 미션에서 어느 영역을 눌렀는지 알아내는 데만 쓴다.
      // visibility를 none으로 하면 판정에서도 빠지므로 투명도 0으로 숨긴다.
      { id: 'area-hit', type: 'fill', source: 'areas', paint: { 'fill-color': '#000000', 'fill-opacity': 0 } },
```

- [ ] **Step 4: 확인**

Run: `npx tsc -p tsconfig.app.json --noEmit && npm run lint`
Expected: 오류 없음.

- [ ] **Step 5: 커밋**

```bash
git add scripts/build-data.mjs public/data/areas.geojson src/globe/buildStyle.ts
git commit -m "feat: 대륙·대양 영역 데이터와 보이지 않는 판정용 층 추가"
```

---

### Task 4: 판정 규칙과 여행 진행 상태

**Files:**
- Create: `src/trip/geo.ts`, `src/trip/judge.ts`, `src/trip/tripReducer.ts`

- [ ] **Step 1: `src/trip/geo.ts`**

```ts
import type { LngLat } from '../content/types';

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

// 두 지점 사이의 지구 표면 거리(km). 하버사인 공식.
export function distanceKm([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
```

- [ ] **Step 2: `src/trip/judge.ts`**

```ts
import type { LngLat, MissionOf, Tier } from '../content/types';
import { distanceKm } from './geo';

/** 지구본을 누른 곳: 좌표와, 그 자리에 있는 대륙·대양 이름(없으면 null) */
export interface TapInfo {
  at: LngLat;
  area: string | null;
}

// 찾아 누르기: 영역 이름이 있으면 그 영역 안을, 없으면 target에서 radiusKm 안을 눌러야 정답
export function judgeTap(mission: MissionOf<'tap'>, tap: TapInfo): boolean {
  if (mission.area) return tap.area === mission.area;
  return distanceKm(tap.at, mission.target) <= (mission.radiusKm ?? 0);
}

// 위치 찍기: 정답과 가까울수록 별이 많다 (starsKm[0] 안이면 3개, starsKm[1] 안이면 2개, 그 밖은 1개)
export function judgePin(mission: MissionOf<'pin'>, pinned: LngLat): { km: number; stars: number } {
  const km = distanceKm(pinned, mission.target);
  const stars = km <= mission.starsKm[0] ? 3 : km <= mission.starsKm[1] ? 2 : 1;
  return { km, stars };
}

/** 저학년·고학년은 두 번 틀리면 정답을 보여 주고 넘어간다 */
export const MAX_TRIES = 2;

// 답이 틀렸을 때 다음에 할 일. 유아는 실패가 없다: 정답을 반짝여 주고 맞힐 때까지 다시 해 본다.
export function afterWrong(tier: Tier, attempts: number): 'hint' | 'retry' | 'reveal' {
  if (tier === 'preschool') return 'hint';
  return attempts >= MAX_TRIES ? 'reveal' : 'retry';
}
```

- [ ] **Step 3: `src/trip/tripReducer.ts`**

```ts
import type { Mission } from '../content/types';

// 여행 한 번의 순서: 출발 → 둘러보기 → 미션(여러 개) → 도장 → 함께 이야기
export type TripStep = 'depart' | 'explore' | 'mission' | 'stamp' | 'talk';

export interface MissionResult {
  type: Mission['type'];
  correct: boolean;
  attempts: number;
  /** 위치 찍기에서 받은 별 */
  stars?: number;
}

export interface TripState {
  step: TripStep;
  missionIndex: number;
  missionCount: number;
  results: MissionResult[];
}

export type TripAction = { type: 'next' } | { type: 'missionDone'; result: MissionResult };

export function createTripState(missionCount: number): TripState {
  return { step: 'depart', missionIndex: 0, missionCount, results: [] };
}

export function tripReducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case 'next':
      if (state.step === 'depart') return { ...state, step: 'explore' };
      if (state.step === 'explore') return { ...state, step: 'mission' };
      if (state.step === 'stamp') return { ...state, step: 'talk' };
      return state;
    case 'missionDone': {
      if (state.step !== 'mission') return state;
      const results = [...state.results, action.result];
      const isLast = state.missionIndex + 1 >= state.missionCount;
      return isLast
        ? { ...state, results, step: 'stamp' }
        : { ...state, results, missionIndex: state.missionIndex + 1 };
    }
  }
}
```

- [ ] **Step 4: 타입·린트 확인**

Run: `npx tsc -p tsconfig.app.json --noEmit && npx eslint src/trip`
Expected: 출력 없음.

- [ ] **Step 5: 판정과 진행이 기대대로인지 실행 확인**

```bash
npx esbuild src/trip/judge.ts src/trip/tripReducer.ts --bundle --platform=node --format=esm --outdir=node_modules/.tmp/trip --out-extension:.js=.mjs --log-level=warning && node -e "
Promise.all([import('./node_modules/.tmp/trip/judge.mjs'), import('./node_modules/.tmp/trip/tripReducer.mjs')]).then(([j, r]) => {
  const tap = { type: 'tap', prompt: '', target: [126.978, 37.566], radiusKm: 25 };
  console.log('서울 근처 탭:', j.judgeTap(tap, { at: [127.0, 37.5], area: null }), '/ 부산 탭:', j.judgeTap(tap, { at: [129.075, 35.18], area: null }));
  const area = { type: 'tap', prompt: '', target: [-160, 0], area: '태평양' };
  console.log('영역 판정:', j.judgeTap(area, { at: [150, 35], area: '태평양' }), j.judgeTap(area, { at: [-30, 20], area: '대서양' }));
  const pin = { type: 'pin', prompt: '', target: [126.978, 37.566], starsKm: [15, 60] };
  console.log('별:', j.judgePin(pin, [126.978, 37.566]).stars, j.judgePin(pin, [127.3, 37.4]).stars, j.judgePin(pin, [129, 35]).stars);
  console.log('유아/저학년 1번째/2번째:', j.afterWrong('preschool', 5), j.afterWrong('lower', 1), j.afterWrong('upper', 2));
  let s = r.createTripState(2);
  for (const a of [{ type: 'next' }, { type: 'next' }, { type: 'missionDone', result: { type: 'tap', correct: true, attempts: 1 } }, { type: 'missionDone', result: { type: 'choice', correct: false, attempts: 2 } }, { type: 'next' }]) s = r.tripReducer(s, a);
  console.log('끝 상태:', s.step, s.results.length);
});"
```

Expected:

```
서울 근처 탭: true / 부산 탭: false
영역 판정: true false
별: 3 2 1
유아/저학년 1번째/2번째: hint retry reveal
끝 상태: talk 2
```

- [ ] **Step 6: 커밋**

```bash
git add src/trip/geo.ts src/trip/judge.ts src/trip/tripReducer.ts
git commit -m "feat: 정답 판정 규칙과 여행 진행 상태 기계 추가"
```

---

### Task 5: 지구본 조작 손잡이 (GlobeHandle)

**Files:**
- Create: `src/globe/globeHandle.ts`, `src/globe/markers.css`
- Modify: `src/globe/GlobeView.tsx`

- [ ] **Step 1: `src/globe/markers.css`**

```css
/* 여행 미션에서 지구본 위에 꽂는 표시 (정답·힌트·내 핀·출발·도착) */
.trip-marker { position: relative; width: 28px; height: 28px; pointer-events: none; }
.trip-marker::before {
  content: ''; position: absolute; left: 50%; bottom: 0;
  width: 22px; height: 22px; margin-left: -11px;
  border: 3px solid #ffffff; border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
.trip-marker--answer::before { background: #2fb36b; }
.trip-marker--pin::before { background: #e03a3a; }
.trip-marker--from::before { background: #2a6496; }
.trip-marker--to::before { background: #f0a020; }
.trip-marker--hint { width: 72px; height: 72px; }
.trip-marker--hint::before {
  inset: 0; width: auto; height: auto; margin: 0;
  border: 4px solid #ffd23f; border-radius: 50%; transform: none;
  background: rgba(255, 210, 63, 0.25);
  animation: trip-pulse 1.2s ease-out infinite;
}
.trip-marker__label {
  position: absolute; left: 50%; bottom: 34px; transform: translateX(-50%);
  white-space: nowrap; padding: 2px 8px; border-radius: 8px;
  background: #ffffff; color: #1d2433; font-size: 14px; font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}
@keyframes trip-pulse {
  from { transform: scale(0.6); opacity: 1; }
  to { transform: scale(1.3); opacity: 0.2; }
}
@media (prefers-reduced-motion: reduce) {
  .trip-marker--hint::before { animation: none; }
}
```

- [ ] **Step 2: `src/globe/globeHandle.ts`**

```ts
import maplibregl from 'maplibre-gl';
import type { LngLat } from '../content/types';
import type { TapInfo } from '../trip/judge';
import './markers.css';

export type MarkerKind = 'answer' | 'hint' | 'pin' | 'from' | 'to';

// 여행 화면이 MapLibre를 직접 만지지 않도록, 필요한 동작만 모은 손잡이
export interface GlobeHandle {
  /** 아래쪽 여행 카드에 가려지지 않게 살짝 위로 올려서 날아간다 */
  flyTo(center: LngLat, zoom: number): void;
  /** 여러 지점이 다 보이게 화면을 맞춘다 */
  fitTo(points: LngLat[]): void;
  /** 손으로 돌리기·확대를 켜고 끈다 (유아 여행 중에는 끈다). 누르기는 언제나 된다 */
  setInteractive(on: boolean): void;
  /** 지명을 모두 숨기거나 다시 보여 준다 (위치 찍기 미션용) */
  setLabelsVisible(on: boolean): void;
  /** 지구본을 누를 때마다 알려 준다. 돌려준 함수를 부르면 그만 듣는다 */
  onTap(listener: (tap: TapInfo) => void): () => void;
  /** 같은 종류의 표시는 하나만 남긴다. 이름표 글자는 textContent로만 넣는다 */
  showMarker(kind: MarkerKind, at: LngLat, label?: string): void;
  clearMarkers(): void;
}

/** 아래쪽 여행 카드가 차지하는 화면 높이 비율 (대략) */
const PANEL_SHARE = 0.45;

export function createGlobeHandle(map: maplibregl.Map): GlobeHandle {
  const markers = new Map<MarkerKind, maplibregl.Marker>();
  const panelPx = () => Math.round(map.getContainer().clientHeight * PANEL_SHARE);

  return {
    flyTo(center, zoom) {
      map.flyTo({ center, zoom, offset: [0, -Math.round(panelPx() / 2)], duration: 3000, essential: true });
    },

    fitTo(points) {
      if (points.length === 0) return;
      const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
      for (const p of points) bounds.extend(p);
      map.fitBounds(bounds, {
        padding: { top: 90, left: 60, right: 60, bottom: panelPx() + 30 },
        maxZoom: 7,
        duration: 2000,
      });
    },

    setInteractive(on) {
      if (on) {
        map.dragPan.enable();
        map.dragRotate.enable();
        map.scrollZoom.enable();
        map.touchZoomRotate.enable();
        map.doubleClickZoom.enable();
        map.keyboard.enable();
      } else {
        map.dragPan.disable();
        map.dragRotate.disable();
        map.scrollZoom.disable();
        map.touchZoomRotate.disable();
        map.doubleClickZoom.disable();
        map.keyboard.disable();
      }
    },

    setLabelsVisible(on) {
      for (const layer of map.getStyle().layers) {
        if (layer.type === 'symbol') map.setLayoutProperty(layer.id, 'visibility', on ? 'visible' : 'none');
      }
    },

    onTap(listener) {
      const handler = (e: maplibregl.MapMouseEvent) => {
        const hit = map.queryRenderedFeatures(e.point, { layers: ['area-hit'] })[0];
        const ko: unknown = hit?.properties.ko;
        listener({ at: [e.lngLat.lng, e.lngLat.lat], area: typeof ko === 'string' ? ko : null });
      };
      map.on('click', handler);
      return () => {
        map.off('click', handler);
      };
    },

    showMarker(kind, at, label) {
      markers.get(kind)?.remove();
      const el = document.createElement('div');
      el.className = `trip-marker trip-marker--${kind}`;
      if (label) {
        const text = document.createElement('span');
        text.className = 'trip-marker__label';
        text.textContent = label;
        el.append(text);
      }
      const marker = new maplibregl.Marker({ element: el, anchor: kind === 'hint' ? 'center' : 'bottom' })
        .setLngLat(at)
        .addTo(map);
      markers.set(kind, marker);
    },

    clearMarkers() {
      markers.forEach((marker) => marker.remove());
      markers.clear();
    },
  };
}
```

- [ ] **Step 3: `src/globe/GlobeView.tsx`에 `onReady` 연결**

가져오기 한 줄 추가 — 기존:

```tsx
import { ICONS } from './icons';
```

새 코드:

```tsx
import { ICONS } from './icons';
import { createGlobeHandle, type GlobeHandle } from './globeHandle';
```

props와 콜백 보관 — 기존:

```tsx
interface GlobeViewProps {
  view: MapView;
  onZoomChange: (zoom: number) => void;
  onSatelliteError: () => void;
}

export function GlobeView({ view, onZoomChange, onSatelliteError }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const appliedView = useRef(view);
  const callbacks = useRef({ onZoomChange, onSatelliteError });

  useEffect(() => {
    callbacks.current = { onZoomChange, onSatelliteError };
  }, [onZoomChange, onSatelliteError]);
```

새 코드:

```tsx
interface GlobeViewProps {
  view: MapView;
  onZoomChange: (zoom: number) => void;
  onSatelliteError: () => void;
  /** 지도가 준비되면 여행 화면용 손잡이를 건네준다 */
  onReady: (handle: GlobeHandle) => void;
}

export function GlobeView({ view, onZoomChange, onSatelliteError, onReady }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const appliedView = useRef(view);
  const callbacks = useRef({ onZoomChange, onSatelliteError, onReady });

  useEffect(() => {
    callbacks.current = { onZoomChange, onSatelliteError, onReady };
  }, [onZoomChange, onSatelliteError, onReady]);
```

`load` 때 손잡이 전달 — 기존:

```tsx
    map.on('zoom', reportZoom);
    map.on('load', reportZoom);
```

새 코드:

```tsx
    map.on('zoom', reportZoom);
    map.on('load', reportZoom);
    map.on('load', () => callbacks.current.onReady(createGlobeHandle(map)));
```

- [ ] **Step 4: 확인**

`App.tsx`가 아직 `onReady`를 넘기지 않으므로 이 시점의 타입 검사는 `App.tsx`에서 "onReady가 없다"는 오류 하나만 나는 것이 정상이다. 작업 9에서 연결한다.

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: `src/App.tsx`의 `Property 'onReady' is missing` 오류 1개만 나옴. 그 밖의 오류가 있으면 고친다.

Run: `npx eslint src/globe`
Expected: 출력 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/globe/globeHandle.ts src/globe/markers.css src/globe/GlobeView.tsx
git commit -m "feat: 여행 화면용 지구본 손잡이(날아가기·탭·표시 핀·지명 숨기기) 추가"
```

---

### Task 6: 미션 화면 4종과 여행 화면 스타일

**Files:**
- Create: `src/trip/trip.css`, `src/trip/missions/types.ts`, `src/trip/missions/useTries.ts`, `src/trip/missions/MissionFeedback.tsx`, `src/trip/missions/ChoiceMission.tsx`, `src/trip/missions/TapMission.tsx`, `src/trip/missions/PinMission.tsx`, `src/trip/missions/DirectionMission.tsx`, `src/trip/missions/MissionView.tsx`

- [ ] **Step 1: `src/trip/trip.css`** (작업 6·7·9의 여행 화면 스타일 전부)

```css
/* 여행 화면: 지구본 아래쪽 카드 */
.trip-panel,
.launcher {
  background: var(--card-bg); color: var(--card-text);
  border-radius: 20px; padding: 16px 18px 18px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
  max-height: 55vh; overflow-y: auto; box-sizing: border-box;
}
.trip-panel__header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-bottom: 10px; font-size: 15px; color: var(--card-sub);
}
.trip-panel__close {
  flex: none; width: 44px; height: 44px; border: 0; border-radius: 50%;
  background: #e8ecf3; color: var(--card-text); font: inherit; font-size: 18px; cursor: pointer;
}
.trip-panel__progress { margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #2a6496; }
.trip-panel__note { margin: 8px 0 0; font-size: 14px; color: var(--card-sub); }

.big-button {
  display: block; width: 100%; min-height: 56px; margin-top: 14px;
  border: 0; border-radius: 16px; background: #2a6496; color: #ffffff;
  font: inherit; font-size: 20px; font-weight: 700; cursor: pointer;
}
.big-button:active { transform: scale(0.98); }
.link-button {
  margin-top: 10px; min-height: 44px; padding: 0 4px; border: 0; background: none;
  color: #2a6496; font: inherit; font-size: 16px; text-decoration: underline; cursor: pointer;
}

/* 캐릭터 말풍선 */
.character { display: flex; gap: 12px; align-items: flex-start; }
.character__face {
  flex: none; width: 52px; height: 52px; border-radius: 50%;
  background: #ffe7a3; display: grid; place-items: center; font-size: 30px;
}
.character__text {
  margin: 0; padding: 12px 14px; border-radius: 4px 16px 16px 16px;
  background: #eef4fb; font-size: 18px; line-height: 1.55;
}
.character__name { display: block; margin-bottom: 2px; font-size: 14px; color: #2a6496; }
.trip-panel--preschool .character__text { font-size: 22px; }

/* 미션 */
.mission__prompt { margin: 0 0 10px; font-size: 20px; font-weight: 700; line-height: 1.45; }
.trip-panel--preschool .mission__prompt { font-size: 22px; }
.mission__hint { margin: 0; font-size: 17px; color: var(--card-sub); }

.choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
.choice {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  min-height: 64px; padding: 10px; border: 3px solid #d5dde9; border-radius: 16px;
  background: #ffffff; color: var(--card-text); font: inherit; font-size: 19px; font-weight: 700; cursor: pointer;
}
.choice__icon { font-size: 44px; line-height: 1; }

.compass {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
  max-width: 300px; margin: 0 auto;
}
.compass__dir {
  min-height: 56px; border: 3px solid #d5dde9; border-radius: 14px;
  background: #ffffff; color: var(--card-text); font: inherit; font-size: 19px; font-weight: 700; cursor: pointer;
}
.compass__center {
  display: grid; place-items: center; font-size: 15px; font-weight: 700; color: #2a6496; text-align: center;
}

/* 보기·방향 버튼의 상태 */
.is-wrong { border-color: #e9b4b4; background: #fbeeee; color: #a04444; }
.is-answer { border-color: #2fb36b; background: #e8f7ee; animation: answer-glow 1s ease-in-out infinite alternate; }
@keyframes answer-glow {
  from { box-shadow: 0 0 0 0 rgba(47, 179, 107, 0.5); }
  to { box-shadow: 0 0 0 8px rgba(47, 179, 107, 0); }
}

/* 미션 결과 */
.feedback { margin-top: 14px; padding: 14px; border-radius: 16px; }
.feedback--good { background: #e8f7ee; }
.feedback--again { background: #fff4e0; }
.feedback__title { margin: 0 0 4px; font-size: 21px; font-weight: 700; }
.feedback__stars { margin: 0 0 4px; font-size: 30px; color: #f0a020; letter-spacing: 2px; }
.feedback p { margin: 4px 0 0; font-size: 17px; line-height: 1.5; }

/* 도장 */
.stamp { text-align: center; }
.stamp__seal {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  width: 150px; height: 150px; border: 6px double #d9473b; border-radius: 50%;
  color: #d9473b; transform: rotate(-8deg); animation: stamp-in 0.5s cubic-bezier(0.2, 1.6, 0.4, 1);
}
.stamp__place { font-size: 26px; font-weight: 800; }
.stamp__date { font-size: 15px; }
.stamp__title { margin: 12px 0 0; font-size: 21px; font-weight: 700; }
.stamp__stars,
.stamp__next { margin: 6px 0 0; font-size: 17px; color: var(--card-sub); }
@keyframes stamp-in {
  from { transform: rotate(-8deg) scale(2); opacity: 0; }
  to { transform: rotate(-8deg) scale(1); opacity: 1; }
}

/* 함께 이야기해요 */
.talk__label { margin: 0; font-size: 15px; font-weight: 700; color: #2a6496; }
.talk__text { margin: 6px 0 0; font-size: 20px; line-height: 1.5; }
.talk__note {
  margin: 6px 0 0; padding: 10px 12px; border-radius: 12px;
  background: #f3f5f9; font-size: 16px; line-height: 1.5;
}

/* 시작 화면 (계획 3에서 여권·가족 프로필로 바뀐다) */
.launcher__title { margin: 0 0 8px; font-size: 19px; font-weight: 700; }
.launcher__tiers { display: flex; gap: 8px; margin-bottom: 16px; }
.launcher__tiers button {
  flex: 1; min-height: 52px; border: 3px solid #d5dde9; border-radius: 14px;
  background: #ffffff; color: var(--card-text); font: inherit; font-size: 18px; font-weight: 700; cursor: pointer;
}
.launcher__tiers button[aria-pressed="true"] { border-color: #2a6496; background: #eef4fb; color: #2a6496; }
.launcher__places { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.place-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  min-height: 72px; padding: 12px 14px; border: 0; border-radius: 16px;
  background: #2a6496; color: #ffffff; font: inherit; text-align: left; cursor: pointer;
}
.place-card__stage { font-size: 14px; opacity: 0.85; }
.place-card__name { font-size: 22px; font-weight: 800; }

@media (prefers-reduced-motion: reduce) {
  .is-answer,
  .stamp__seal { animation: none; }
}
```

- [ ] **Step 2: `src/trip/missions/types.ts`**

```ts
import type { Mission, Tier, View } from '../../content/types';
import type { GlobeHandle } from '../../globe/globeHandle';
import type { MissionResult } from '../tripReducer';

export interface MissionProps<M extends Mission> {
  mission: M;
  tier: Tier;
  globe: GlobeHandle;
  /** 장소 화면 (미션에 view가 없을 때 여기로 돌아간다) */
  placeView: View;
  onDone: (result: MissionResult) => void;
}

export type Outcome = 'correct' | 'revealed' | null;
```

- [ ] **Step 3: `src/trip/missions/useTries.ts`**

```ts
import { useState } from 'react';
import type { Tier } from '../../content/types';
import { afterWrong } from '../judge';
import type { Outcome } from './types';

// 보기를 고르는 미션(고르기·방향)의 시도 처리:
// 틀린 보기는 기억하고, 유아는 정답을 반짝여 주고, 저학년·고학년은 두 번 틀리면 정답을 보여 준다.
export function useTries<T>(answer: T, tier: Tier) {
  const [attempts, setAttempts] = useState(0);
  const [wrong, setWrong] = useState<T[]>([]);
  const [hint, setHint] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const pick = (choice: T) => {
    if (outcome !== null || wrong.includes(choice)) return;
    const tries = attempts + 1;
    setAttempts(tries);
    if (choice === answer) {
      setOutcome('correct');
      return;
    }
    setWrong((w) => [...w, choice]);
    const next = afterWrong(tier, tries);
    if (next === 'hint') setHint(true);
    if (next === 'reveal') setOutcome('revealed');
  };

  return { attempts, wrong, outcome, showAnswer: hint || outcome !== null, pick };
}
```

- [ ] **Step 4: `src/trip/missions/MissionFeedback.tsx`**

```tsx
interface MissionFeedbackProps {
  correct: boolean;
  /** 정답 안내나 거리처럼 결과에 붙는 한 줄 */
  detail?: string;
  explain?: string;
  /** 위치 찍기에서 받은 별 (1~3) */
  stars?: number;
  onNext: () => void;
}

export function MissionFeedback({ correct, detail, explain, stars, onNext }: MissionFeedbackProps) {
  return (
    <div className={`feedback ${correct ? 'feedback--good' : 'feedback--again'}`} role="status">
      <p className="feedback__title">{correct ? '잘했어요!' : '괜찮아요, 같이 알아봐요'}</p>
      {stars !== undefined && (
        <p className="feedback__stars" aria-label={`별 ${stars}개`}>
          {'★'.repeat(stars)}
          {'☆'.repeat(3 - stars)}
        </p>
      )}
      {detail && <p>{detail}</p>}
      {explain && <p>{explain}</p>}
      <button type="button" className="big-button" onClick={onNext}>
        다음
      </button>
    </div>
  );
}
```

- [ ] **Step 5: `src/trip/missions/ChoiceMission.tsx`**

```tsx
import type { MissionOf } from '../../content/types';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps } from './types';
import { useTries } from './useTries';

export function ChoiceMission({ mission, tier, onDone }: MissionProps<MissionOf<'choice'>>) {
  const { attempts, wrong, outcome, showAnswer, pick } = useTries(mission.answer, tier);

  return (
    <div className="mission">
      <p className="mission__prompt">{mission.prompt}</p>
      <div className="choices">
        {mission.options.map((option, i) => {
          const classes = ['choice'];
          if (showAnswer && i === mission.answer) classes.push('is-answer');
          if (wrong.includes(i)) classes.push('is-wrong');
          return (
            <button
              key={option.label}
              type="button"
              className={classes.join(' ')}
              aria-disabled={wrong.includes(i) || outcome !== null}
              onClick={() => pick(i)}
            >
              {option.icon && (
                <span className="choice__icon" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {outcome && (
        <MissionFeedback
          correct={outcome === 'correct'}
          detail={outcome === 'revealed' ? `정답: ${mission.options[mission.answer].label}` : undefined}
          explain={mission.explain}
          onNext={() => onDone({ type: 'choice', correct: outcome === 'correct', attempts })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: `src/trip/missions/TapMission.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import type { MissionOf } from '../../content/types';
import { afterWrong, judgeTap } from '../judge';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps, Outcome } from './types';

export function TapMission({ mission, tier, globe, placeView, onDone }: MissionProps<MissionOf<'tap'>>) {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [message, setMessage] = useState('지구본에서 찾아 눌러 보세요.');
  const attempts = useRef(0);

  // 미션을 시작하면 찾을 곳이 보이는 화면으로 날아간다. 미션이 끝나면 표시를 지운다.
  useEffect(() => {
    const view = mission.view ?? placeView;
    globe.flyTo(view.center, view.zoom);
    return () => globe.clearMarkers();
  }, [globe, mission, placeView]);

  useEffect(() => {
    if (outcome !== null) return undefined;
    return globe.onTap((tap) => {
      attempts.current += 1;
      if (judgeTap(mission, tap)) {
        globe.showMarker('answer', mission.target);
        setOutcome('correct');
        return;
      }
      const next = afterWrong(tier, attempts.current);
      if (next === 'hint') {
        globe.showMarker('hint', mission.target);
        setMessage('반짝이는 곳을 눌러 봐!');
      } else if (next === 'retry') {
        setMessage('조금 빗나갔어요. 한 번 더 눌러 볼까요?');
      } else {
        globe.showMarker('answer', mission.target);
        setOutcome('revealed');
      }
    });
  }, [globe, mission, tier, outcome]);

  return (
    <div className="mission">
      <p className="mission__prompt">{mission.prompt}</p>
      {outcome === null && <p className="mission__hint">{message}</p>}
      {outcome && (
        <MissionFeedback
          correct={outcome === 'correct'}
          detail={outcome === 'revealed' ? '초록 핀이 정답 위치예요.' : undefined}
          explain={mission.explain}
          onNext={() => onDone({ type: 'tap', correct: outcome === 'correct', attempts: attempts.current })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7: `src/trip/missions/PinMission.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { LngLat, MissionOf } from '../../content/types';
import { judgePin } from '../judge';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps } from './types';

export function PinMission({ mission, globe, placeView, onDone }: MissionProps<MissionOf<'pin'>>) {
  const [pinned, setPinned] = useState<LngLat | null>(null);
  const [result, setResult] = useState<{ km: number; stars: number } | null>(null);

  // 지명이 보이면 문제가 너무 쉬우므로 잠시 숨긴다. 미션이 끝나면 다시 보여 준다.
  useEffect(() => {
    const view = mission.view ?? placeView;
    globe.flyTo(view.center, view.zoom);
    globe.setLabelsVisible(false);
    return () => {
      globe.setLabelsVisible(true);
      globe.clearMarkers();
    };
  }, [globe, mission, placeView]);

  useEffect(() => {
    if (result !== null) return undefined;
    return globe.onTap(({ at }) => {
      setPinned(at);
      globe.showMarker('pin', at);
    });
  }, [globe, result]);

  const confirm = () => {
    if (!pinned) return;
    setResult(judgePin(mission, pinned));
    globe.setLabelsVisible(true);
    globe.showMarker('answer', mission.target);
    globe.fitTo([pinned, mission.target]);
  };

  return (
    <div className="mission">
      <p className="mission__prompt">{mission.prompt}</p>
      {!pinned && <p className="mission__hint">지구본을 눌러 핀을 꽂아 보세요.</p>}
      {pinned && !result && (
        <>
          <p className="mission__hint">다른 곳을 누르면 핀을 옮길 수 있어요.</p>
          <button type="button" className="big-button" onClick={confirm}>
            여기예요!
          </button>
        </>
      )}
      {result && (
        <MissionFeedback
          correct={result.stars >= 2}
          stars={result.stars}
          detail={`정답과 약 ${Math.round(result.km).toLocaleString('ko-KR')}km 떨어졌어요. 초록 핀이 정답이에요.`}
          explain={mission.explain}
          onNext={() => onDone({ type: 'pin', correct: result.stars >= 2, attempts: 1, stars: result.stars })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 8: `src/trip/missions/DirectionMission.tsx`**

```tsx
import { useEffect } from 'react';
import { DIRECTIONS_4, DIRECTIONS_8, type Direction, type MissionOf } from '../../content/types';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps } from './types';
import { useTries } from './useTries';

// 나침반처럼 3×3으로 놓는다. 가운데는 기준 장소 이름.
const COMPASS_SLOTS: (Direction | 'center')[] = ['북서', '북', '북동', '서', 'center', '동', '남서', '남', '남동'];

export function DirectionMission({ mission, tier, globe, onDone }: MissionProps<MissionOf<'direction'>>) {
  const { attempts, wrong, outcome, showAnswer, pick } = useTries<Direction>(mission.answer, tier);
  const allowed = mission.options === 4 ? DIRECTIONS_4 : DIRECTIONS_8;

  useEffect(() => {
    globe.showMarker('from', mission.from, mission.fromName);
    globe.showMarker('to', mission.to, mission.toName);
    globe.fitTo([mission.from, mission.to]);
    return () => globe.clearMarkers();
  }, [globe, mission]);

  return (
    <div className="mission">
      <p className="mission__prompt">{mission.prompt}</p>
      <div className="compass" role="group" aria-label="방향 고르기">
        {COMPASS_SLOTS.map((slot) => {
          if (slot === 'center') {
            return (
              <span key="center" className="compass__center">
                {mission.fromName}
              </span>
            );
          }
          if (!allowed.includes(slot)) return <span key={slot} aria-hidden="true" />;
          const classes = ['compass__dir'];
          if (showAnswer && slot === mission.answer) classes.push('is-answer');
          if (wrong.includes(slot)) classes.push('is-wrong');
          return (
            <button
              key={slot}
              type="button"
              className={classes.join(' ')}
              aria-disabled={wrong.includes(slot) || outcome !== null}
              onClick={() => pick(slot)}
            >
              {slot}
            </button>
          );
        })}
      </div>
      {outcome && (
        <MissionFeedback
          correct={outcome === 'correct'}
          detail={outcome === 'revealed' ? `정답: ${mission.answer}쪽` : undefined}
          explain={mission.explain}
          onNext={() => onDone({ type: 'direction', correct: outcome === 'correct', attempts })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 9: `src/trip/missions/MissionView.tsx`**

```tsx
import type { Mission } from '../../content/types';
import { ChoiceMission } from './ChoiceMission';
import { DirectionMission } from './DirectionMission';
import { PinMission } from './PinMission';
import { TapMission } from './TapMission';
import type { MissionProps } from './types';

// 미션 종류에 맞는 화면을 고른다
export function MissionView(props: MissionProps<Mission>) {
  const { mission } = props;
  switch (mission.type) {
    case 'choice':
      return <ChoiceMission {...props} mission={mission} />;
    case 'tap':
      return <TapMission {...props} mission={mission} />;
    case 'pin':
      return <PinMission {...props} mission={mission} />;
    case 'direction':
      return <DirectionMission {...props} mission={mission} />;
  }
}
```

- [ ] **Step 10: 확인**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: 작업 5와 같은 `src/App.tsx`의 `onReady` 오류 1개만 나옴.

Run: `npx eslint src/trip`
Expected: 출력 없음.

- [ ] **Step 11: 커밋**

```bash
git add src/trip/trip.css src/trip/missions
git commit -m "feat: 미션 화면 4종(고르기·찾아 누르기·위치 찍기·방향) 추가"
```

---

### Task 7: 여행 카드 (캐릭터 말풍선·도장·진행)

캐릭터 이름과 생김새는 아직 정하지 않았다(설계 문서 열린 질문 2). 지금은 나침반 이모지와 "탐험가"라는 임시 이름을 쓴다.

**Files:**
- Create: `src/trip/CharacterBubble.tsx`, `src/trip/StampCard.tsx`, `src/trip/TripPanel.tsx`

- [ ] **Step 1: `src/trip/CharacterBubble.tsx`**

```tsx
interface CharacterBubbleProps {
  text: string;
}

// 탐험가 캐릭터의 말풍선 (캐릭터 이름·그림은 임시)
export function CharacterBubble({ text }: CharacterBubbleProps) {
  return (
    <div className="character">
      <div className="character__face" aria-hidden="true">
        🧭
      </div>
      <p className="character__text">
        <b className="character__name">탐험가</b>
        {text}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: `src/trip/StampCard.tsx`**

```tsx
import type { Place } from '../content/types';

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
  return (
    <div className="stamp">
      <div className="stamp__seal" role="img" aria-label={`${place.name} 도장`}>
        <span className="stamp__place">{place.name}</span>
        <span className="stamp__date">{today}</span>
      </div>
      <p className="stamp__title">{place.name} 도장을 받았어요!</p>
      {stars !== undefined && stars > 0 && <p className="stamp__stars">모은 별 ★ {stars}개</p>}
      {nextPlace && <p className="stamp__next">다음엔 {nextPlace.name}에 가 볼까요?</p>}
      <button type="button" className="big-button" onClick={onNext}>
        계속
      </button>
    </div>
  );
}
```

- [ ] **Step 3: `src/trip/TripPanel.tsx`**

```tsx
import { useEffect, useMemo, useReducer, useState } from 'react';
import { TIER_LABELS, type Place, type Tier, type View } from '../content/types';
import type { GlobeHandle } from '../globe/globeHandle';
import { CharacterBubble } from './CharacterBubble';
import { MissionView } from './missions/MissionView';
import { StampCard } from './StampCard';
import { createTripState, tripReducer } from './tripReducer';
import './trip.css';

interface TripPanelProps {
  place: Place;
  tier: Tier;
  globe: GlobeHandle;
  nextPlace: Place | null;
  onExit: () => void;
}

// 여행 한 번: 출발 → 둘러보기 → 미션 → 도장 → 함께 이야기
export function TripPanel({ place, tier, globe, nextPlace, onExit }: TripPanelProps) {
  const missions = place.missions[tier];
  const [state, dispatch] = useReducer(tripReducer, missions.length, createTripState);
  const [showNote, setShowNote] = useState(false);
  const placeView = useMemo<View>(() => ({ center: place.center, zoom: place.zoom }), [place]);

  // 출발: 지구본이 목적지로 날아간다. 유아는 길을 잃지 않게 손 조작을 잠근다(누르기는 된다).
  useEffect(() => {
    globe.flyTo(place.center, place.zoom);
    globe.setInteractive(tier !== 'preschool');
    return () => {
      globe.setInteractive(true);
      globe.clearMarkers();
    };
  }, [globe, place, tier]);

  const next = () => dispatch({ type: 'next' });
  const mission = state.step === 'mission' ? missions[state.missionIndex] : null;
  const stars = state.results.reduce((sum, r) => sum + (r.stars ?? 0), 0);
  const readAloud = tier === 'preschool' && <p className="trip-panel__note">부모님이 소리 내어 읽어 주세요.</p>;

  return (
    <section className={`trip-panel trip-panel--${tier}`} aria-label={`${place.name} 여행`}>
      <header className="trip-panel__header">
        <span>
          {place.name} 여행 · {TIER_LABELS[tier]}
        </span>
        <button type="button" className="trip-panel__close" onClick={onExit} aria-label="여행 그만하기">
          ✕
        </button>
      </header>

      {state.step === 'depart' && (
        <>
          <CharacterBubble text={place.intro[tier]} />
          {readAloud}
          <button type="button" className="big-button" onClick={next}>
            출발!
          </button>
        </>
      )}

      {state.step === 'explore' && (
        <>
          <CharacterBubble text={place.story[tier]} />
          {readAloud}
          <button type="button" className="big-button" onClick={next}>
            미션 시작
          </button>
        </>
      )}

      {mission && (
        <>
          <p className="trip-panel__progress">
            미션 {state.missionIndex + 1} / {missions.length}
          </p>
          <MissionView
            key={state.missionIndex}
            mission={mission}
            tier={tier}
            globe={globe}
            placeView={placeView}
            onDone={(result) => dispatch({ type: 'missionDone', result })}
          />
          {readAloud}
        </>
      )}

      {state.step === 'stamp' && (
        <StampCard place={place} stars={tier === 'upper' ? stars : undefined} nextPlace={nextPlace} onNext={next} />
      )}

      {state.step === 'talk' && (
        <div className="talk">
          <p className="talk__label">함께 이야기해요</p>
          <p className="talk__text">{place.familyTalk[tier]}</p>
          <button
            type="button"
            className="link-button"
            aria-expanded={showNote}
            onClick={() => setShowNote((v) => !v)}
          >
            부모님 메모 {showNote ? '닫기' : '보기'}
          </button>
          {showNote && <p className="talk__note">{place.parentNote}</p>}
          <button type="button" className="big-button" onClick={onExit}>
            여행 마치기
          </button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: 확인**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: `src/App.tsx`의 `onReady` 오류 1개만.

Run: `npx eslint src/trip`
Expected: 출력 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/trip/CharacterBubble.tsx src/trip/StampCard.tsx src/trip/TripPanel.tsx
git commit -m "feat: 여행 카드(출발·둘러보기·미션·도장·함께 이야기) 추가"
```

---

### Task 8: 새 버전 알림 (여행 중 자동 새로고침 막기)

지금 설정(`registerType: 'autoUpdate'`)은 새 버전을 배포하면 열려 있던 앱을 저절로 새로고침해서, 여행 도중이면 진행이 날아간다. "새 버전이 있어요" 안내를 띄우고, 여행 중이 아닐 때 사용자가 눌러서 새로고침하게 바꾼다.

**Files:**
- Modify: `vite.config.ts`, `src/lib/registerPwa.ts`
- Create: `src/components/UpdateBanner.tsx`, `src/components/UpdateBanner.css`

- [ ] **Step 1: `vite.config.ts`**

기존:

```ts
      registerType: 'autoUpdate',
```

새 코드:

```ts
      // 새 버전을 바로 적용하지 않고 안내만 한다 (여행 도중 자동 새로고침으로 진행이 날아가지 않게)
      registerType: 'prompt',
```

- [ ] **Step 2: `src/lib/registerPwa.ts` 전체 바꾸기**

```ts
type UpdateListener = (apply: () => void) => void;

let pendingApply: (() => void) | null = null;
const listeners = new Set<UpdateListener>();

// 새 버전이 준비되면 알려 준다. 받은 apply를 부르면 새 버전으로 새로고침한다.
// 이미 준비된 뒤에 듣기 시작해도 바로 알려 준다.
export function onUpdateReady(listener: UpdateListener): () => void {
  listeners.add(listener);
  if (pendingApply) listener(pendingApply);
  return () => {
    listeners.delete(listener);
  };
}

// 서비스 워커를 등록한다. 실패해도 앱은 그대로 동작하므로 오류는 기록만 한다.
export async function registerPwa(): Promise<void> {
  try {
    const { registerSW } = await import('virtual:pwa-register');
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        const apply = () => void updateSW(true);
        pendingApply = apply;
        listeners.forEach((listener) => listener(apply));
      },
    });
  } catch (error) {
    console.error('PWA registration failed', error);
  }
}
```

(`src/main.tsx`는 그대로 `void registerPwa();`를 부른다.)

- [ ] **Step 3: `src/components/UpdateBanner.tsx`와 `.css`**

`src/components/UpdateBanner.tsx`:

```tsx
import './UpdateBanner.css';

interface UpdateBannerProps {
  onReload: () => void;
}

export function UpdateBanner({ onReload }: UpdateBannerProps) {
  return (
    <div className="update-banner" role="status">
      <p>새 버전이 나왔어요.</p>
      <button type="button" onClick={onReload}>
        새로 고치기
      </button>
    </div>
  );
}
```

`src/components/UpdateBanner.css`:

```css
.update-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border-radius: 14px;
  background: var(--card-bg); color: var(--card-text);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}
.update-banner p { margin: 0; font-size: 16px; }
.update-banner button {
  flex: none; min-height: 44px; padding: 0 16px; border: 0; border-radius: 12px;
  background: #2a6496; color: #ffffff; font: inherit; font-size: 16px; cursor: pointer;
}
```

- [ ] **Step 4: 확인**

Run: `npx tsc -p tsconfig.app.json --noEmit && npx tsc -p tsconfig.node.json --noEmit`
Expected: `src/App.tsx`의 `onReady` 오류 1개만.

- [ ] **Step 5: 커밋**

```bash
git add vite.config.ts src/lib/registerPwa.ts src/components/UpdateBanner.tsx src/components/UpdateBanner.css
git commit -m "feat: 새 버전 알림으로 바꿔 여행 중 자동 새로고침 막기"
```

---

### Task 9: 시작 화면과 앱 연결

**Files:**
- Create: `src/trip/TripLauncher.tsx`
- Modify: `src/App.tsx`(전체), `src/styles/global.css`, `src/components/SatelliteNotice.css`, `src/components/InfoCard.css`, `README.md`

- [ ] **Step 1: `src/trip/TripLauncher.tsx`**

```tsx
import { useState } from 'react';
import { TIER_LABELS, TIERS, type Place, type Tier } from '../content/types';
import './trip.css';

interface TripLauncherProps {
  places: Place[];
  onStart: (place: Place, tier: Tier) => void;
}

// 임시 시작 화면: 나이 구간과 장소를 고른다. 계획 3에서 가족 프로필·여권으로 바뀐다.
export function TripLauncher({ places, onStart }: TripLauncherProps) {
  const [tier, setTier] = useState<Tier>('preschool');

  return (
    <section className="launcher" aria-label="여행 고르기">
      <p className="launcher__title">누구랑 여행할까요?</p>
      <div className="launcher__tiers" role="group" aria-label="나이 구간">
        {TIERS.map((t) => (
          <button key={t} type="button" aria-pressed={t === tier} onClick={() => setTier(t)}>
            {TIER_LABELS[t]}
          </button>
        ))}
      </div>
      <p className="launcher__title">어디로 갈까요?</p>
      <div className="launcher__places">
        {places.map((p) => (
          <button key={p.id} type="button" className="place-card" onClick={() => onStart(p, tier)}>
            <span className="place-card__stage">{p.stage}단계</span>
            <span className="place-card__name">{p.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: `src/App.tsx` 전체 바꾸기**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { GlobeView } from './globe/GlobeView';
import type { GlobeHandle } from './globe/globeHandle';
import { loadView, saveView } from './globe/viewStorage';
import type { MapView } from './globe/themes';
import { InfoCard } from './components/InfoCard';
import { SatelliteNotice } from './components/SatelliteNotice';
import { UpdateBanner } from './components/UpdateBanner';
import { PLACES } from './content';
import type { Place, Tier } from './content/types';
import { onUpdateReady } from './lib/registerPwa';
import { TripLauncher } from './trip/TripLauncher';
import { TripPanel } from './trip/TripPanel';

interface Trip {
  place: Place;
  tier: Tier;
}

export function App() {
  const [view, setView] = useState<MapView>(loadView);
  const [zoom, setZoom] = useState<number | null>(null);
  const [satelliteFailed, setSatelliteFailed] = useState(false);
  const [globe, setGlobe] = useState<GlobeHandle | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);

  const changeView = useCallback((next: MapView) => {
    setView(next);
    saveView(next);
    setSatelliteFailed(false);
  }, []);
  const handleSatelliteError = useCallback(() => setSatelliteFailed(true), []);

  useEffect(() => onUpdateReady((apply) => setApplyUpdate(() => apply)), []);

  const nextPlace = trip ? (PLACES[PLACES.indexOf(trip.place) + 1] ?? null) : null;

  return (
    <div className="app">
      <GlobeView view={view} onZoomChange={setZoom} onSatelliteError={handleSatelliteError} onReady={setGlobe} />
      <InfoCard zoom={zoom} view={view} onViewChange={changeView} />
      <div className="bottom-stack">
        {view === 'satellite' && satelliteFailed && <SatelliteNotice onUseMap={() => changeView('map')} />}
        {applyUpdate && !trip && <UpdateBanner onReload={applyUpdate} />}
        {globe &&
          (trip ? (
            <TripPanel
              key={`${trip.place.id}-${trip.tier}`}
              place={trip.place}
              tier={trip.tier}
              globe={globe}
              nextPlace={nextPlace}
              onExit={() => setTrip(null)}
            />
          ) : (
            <TripLauncher places={PLACES} onStart={(place, tier) => setTrip({ place, tier })} />
          ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/styles/global.css` 끝에 아래쪽 카드 쌓기 추가**

```css
/* 지구본 아래쪽에 쌓이는 카드들 (위성 안내 · 새 버전 알림 · 여행 카드) */
.bottom-stack {
  position: absolute; left: 50%; z-index: 1; transform: translateX(-50%);
  bottom: max(16px, env(safe-area-inset-bottom));
  width: min(560px, calc(100vw - 32px));
  display: flex; flex-direction: column; gap: 12px;
}
```

- [ ] **Step 4: `src/components/SatelliteNotice.css` — 쌓기 안으로 들어가므로 자체 위치 지정 빼기**

기존 첫 블록:

```css
.satellite-notice {
  position: absolute; left: 50%; bottom: 32px; z-index: 1; transform: translateX(-50%);
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 14px;
  background: var(--card-bg); color: var(--card-text);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  width: max-content; max-width: calc(100vw - 32px); box-sizing: border-box;
}
```

새 코드:

```css
.satellite-notice {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 14px;
  background: var(--card-bg); color: var(--card-text);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}
```

같은 파일의 버튼 규칙에 `min-height: 44px;`를 더한다 — 기존:

```css
  flex: none; padding: 8px 14px; border: 0; border-radius: 10px;
```

새 코드:

```css
  flex: none; min-height: 44px; padding: 8px 14px; border: 0; border-radius: 10px;
```

- [ ] **Step 5: `src/components/InfoCard.css` — 보기 전환 버튼을 아이 손가락 크기로**

기존:

```css
  flex: 1; padding: 6px 12px; border: 0; border-radius: 8px;
```

새 코드:

```css
  flex: 1; min-height: 44px; padding: 6px 12px; border: 0; border-radius: 8px;
```

- [ ] **Step 6: `README.md`의 "## 구성" 목록에 두 줄 추가**

`- \`src/components/\` — ...` 줄 바로 아래에 덧붙인다.

```markdown
- `src/content/` — 여행 콘텐츠 형식(`types.ts`), 검사기(`parsePlace.ts`), 장소 JSON(`places/`)
- `src/trip/` — 여행 진행(`tripReducer.ts`), 정답 판정(`judge.ts`), 여행 카드·미션 화면
```

그리고 "## 구성" 바로 위에 구역 하나를 넣는다.

```markdown
## 여행 콘텐츠 추가하기

`src/content/places/`에 장소 JSON을 만들고 `src/content/index.ts`의 목록에 넣습니다. 형식이 틀리면 앱이 켜질 때 "콘텐츠 오류 [장소id] 칸: 이유"로 알려 줍니다.
미션 종류는 `tap`(찾아 누르기: `radiusKm` 또는 대륙·대양 이름 `area`), `choice`(고르기), `pin`(위치 찍기, 고학년), `direction`(방향 고르기: 4 또는 8방위)입니다.

```

- [ ] **Step 7: 확인**

Run: `npm run build`
Expected: `tsc -b` 오류 없음, PWA `precache 38 entries`(areas.geojson이 하나 늘어남) 근처, `Path-safe build copied dist back`.

Run: `npm run lint`
Expected: 오류 0개.

- [ ] **Step 8: 커밋**

```bash
git add src/trip/TripLauncher.tsx src/App.tsx src/styles/global.css src/components/SatelliteNotice.css src/components/InfoCard.css README.md
git commit -m "feat: 임시 시작 화면과 여행 카드를 앱에 연결"
```

---

### Task 10: 브라우저 확인 (여행 3구간 · 지명 디테일)

개발 서버를 띄우고(`npm run dev`, http://localhost:5180) 브라우저 창에서 확인한다. 같은 주소에서 예전에 다른 서버를 띄운 적이 있으면 브라우저가 옛 지도 파일을 캐시할 수 있으니, 주소 뒤에 `?fresh=1`을 붙여 연다. 탭은 앞에 띄워 둔다(뒤에 있으면 지도를 다시 그리지 않음).

콘솔에서 지도 누르기를 흉내 낼 때는 아래 함수를 쓴다(`window.__map`은 개발 서버에서만 있다).

```js
window.__tap = (lng, lat) => window.__map.fire('click', { lngLat: { lng, lat }, point: window.__map.project([lng, lat]) });
```

- [ ] **Step 1: 시작 화면**

첫 화면 아래쪽에 "누구랑 여행할까요?"(유아·저학년·고학년)와 장소 카드 7개(1단계 태평양·아시아·남극, 2단계 서울·독도·제주도·백두산)가 보인다. 카드가 많아 카드 영역이 화면 아래 절반을 넘으면 카드 안에서 스크롤된다. 콘솔에 "콘텐츠 오류"를 포함한 오류가 없다.

- [ ] **Step 2: 유아 · 독도 (실패 없음, 손 조작 잠금)**

1. 유아 → 독도. 지구본이 동해로 날아가고, 말풍선 + "부모님이 소리 내어 읽어 주세요"가 보인다.
2. 콘솔: `window.__map.dragPan.isEnabled()` → `false`.
3. [출발!] → [미션 시작] → "미션 1 / 2".
4. 콘솔에서 틀리게 누른다: `__tap(129, 35.5)` → 노란 반짝임이 독도에 나타나고 "반짝이는 곳을 눌러 봐!".
5. `__tap(131.87, 37.24)` → "잘했어요!", 초록 핀. [다음].
6. 고르기에서 펭귄을 누른다 → 펭귄이 빨갛게, 괭이갈매기가 초록으로 반짝인다. 괭이갈매기를 누른다 → "잘했어요!". [다음].
7. 도장 화면("독도 도장을 받았어요!") → [계속] → "함께 이야기해요" + [부모님 메모 보기]를 누르면 메모가 펼쳐진다 → [여행 마치기].
8. 시작 화면으로 돌아오고, 콘솔: `window.__map.dragPan.isEnabled()` → `true`.

- [ ] **Step 3: 저학년 · 독도 (두 번 틀리면 정답 공개, 4방위)**

1. 저학년 → 독도 → 미션 1(어느 바다): 서해 → 남해를 누른다 → 두 번째에 "괜찮아요, 같이 알아봐요", "정답: 동해". [다음].
2. 미션 2(울릉도 찾기): `__tap(131.87, 37.24)`(독도) → "조금 빗나갔어요…" → `__tap(130.87, 37.5)` → "잘했어요!".
3. 미션 3(방향): 지구본에 "서울"(파란)·"독도"(주황) 핀이 함께 보이게 맞춰지고, 나침반에 북·동·남·서 4개만 있다. "동" → "잘했어요!".
4. 도장에 별 표시가 없다(저학년).

- [ ] **Step 4: 고학년 · 서울 (위치 찍기 · 8방위)**

1. 고학년 → 서울 → 미션 1(위치 찍기): 지명이 모두 사라진다(콘솔: `window.__map.getLayoutProperty('country-label','visibility')` → `none`).
2. `__tap(127.3, 37.4)` → 빨간 핀, [여기예요!] → 별 2개, "정답과 약 34km…", 초록 정답 핀, 지명이 다시 보인다(`visible`).
3. 미션 2(부산 방향): 나침반에 8방위가 모두 있다. "남동" → "잘했어요!".
4. 미션 3 → 도장에 "모은 별 ★ 2개".

- [ ] **Step 5: 대륙·대양 영역 판정 (태평양 · 아시아 · 남극)**

1. 저학년 → 태평양 → 미션 2(태평양 찾기)에서 `__tap(150, 35)`(일본 동쪽 바다)를 누르면 "잘했어요!"(점 판정이었다면 오답이었을 곳).
2. 다시 저학년 → 태평양 → 미션 2에서 `__tap(-30, 20)`(대서양) → "조금 빗나갔어요…".
3. 저학년 → 아시아 → 미션 2(아시아 찾기)에서 `__tap(135, -25)`(오스트레일리아) → "조금 빗나갔어요…", 이어서 `__tap(80, 50)`(카자흐스탄 쪽) → "잘했어요!".
4. 유아 → 남극 → 미션 1에서 `__tap(0, -75)` → "잘했어요!"(남극 대륙 안이면 어디든 정답).
5. 만약 영역 판정이 항상 빗나가면(`area`가 늘 null) — 콘솔에서 `window.__map.queryRenderedFeatures(window.__map.project([150, 35]), { layers: ['area-hit'] }).length`가 0인지 본다. 0이면 투명도 0 층이 판정에서 빠지는 경우이므로 `buildStyle.ts`의 `area-hit` `fill-opacity`를 `0.01`로 바꾸고 다시 확인한다.

- [ ] **Step 6: 지명 디테일이 그대로인지 (여행하지 않는 상태)**

시작 화면 상태에서 탭을 1280×800으로 맞추고(`resize_window`), 계획 1 작업 8과 같은 방식으로 세 장면의 층별 지명 수를 센다. 첫 장면이 시작 위치와 같아서 `idle`이 안 올 수 있으므로 `triggerRepaint()`와 8초 제한을 함께 쓴다.

```js
window.__countScene = async (center, zoom) => {
  const m = window.__map;
  m.jumpTo({ center, zoom });
  m.triggerRepaint();
  await Promise.race([new Promise((r) => m.once('idle', r)), new Promise((r) => setTimeout(r, 8000))]);
  await new Promise((r) => setTimeout(r, 1500));
  const counts = {};
  for (const f of m.queryRenderedFeatures()) if (f.layer.type === 'symbol') counts[f.layer.id] = (counts[f.layer.id] ?? 0) + 1;
  return { zoom, total: Object.values(counts).reduce((a, b) => a + b, 0), counts };
};
JSON.stringify([await __countScene([127.5, 36], 1.6), await __countScene([127.8, 36.3], 5.2), await __countScene([127.6, 36.6], 7.2)]);
```

Expected: 합계가 각각 33 이상, 118 이상, 38 이상(계획 1 결과). 확인 뒤 `resize_window`를 desktop으로 되돌린다.

- [ ] **Step 7: 휴대폰 크기**

`resize_window`를 mobile(375×812)로 바꾸고 독도 저학년 여행을 한 번 넘겨 본다. 여행 카드가 화면 아래 절반 안에 들어가고, 버튼이 잘리지 않으며, 미션 중 지구본의 찾을 곳이 카드 위쪽에 보인다. 확인 뒤 desktop으로 되돌린다.

- [ ] **Step 8: 최종 빌드·린트**

Run: `npm run build && npm run lint`
Expected: 둘 다 통과.

- [ ] **Step 9: 커밋할 것이 있으면 커밋**

확인 중 고친 것이 있으면 무엇을 왜 고쳤는지 메시지에 적어 커밋한다. 없으면 이 단계는 건너뛴다.

---

## 계획 2가 끝나면 확인되는 것

- [ ] 장소 7곳 × 나이 3구간으로 여행 한 번을 처음부터 끝까지 할 수 있다.
- [ ] 유아는 실패 없이(힌트 반짝임) 끝까지 가고, 여행 중 손 조작이 잠기며 끝나면 풀린다.
- [ ] 저학년·고학년은 두 번 틀리면 정답을 보여 주고 넘어간다.
- [ ] 위치 찍기는 지명을 숨기고 거리로 별 1~3개를 준다. 방향은 4/8방위 나침반으로 고른다.
- [ ] "태평양을 눌러 봐"가 실제 바다 모양으로 판정된다.
- [ ] 여행하지 않을 때의 지명 디테일이 계획 1과 같다.
- [ ] 새 버전이 나와도 여행 중에는 저절로 새로고침되지 않는다.
- [ ] `npm run build`, `npm run lint` 통과.

다음은 **계획 3: 여권·가족 프로필·기기 저장**이다.
