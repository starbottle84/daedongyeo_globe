# 계획 4: 첫 출시 장소 24곳·유아 음성·콘텐츠 검사 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 견본 7곳을 설계 10장의 첫 출시 24곳(1단계 12곳, 2단계 12곳)으로 늘린다. 유아 구간은 안내를 음성으로 들려준다. 콘텐츠가 빠지거나 틀리지 않게 검사 스크립트로 막는다.

**Architecture:**
- **콘텐츠:** 장소마다 JSON 한 파일이다(`src/content/places/*.json`, 형식은 지금과 같음). 앱이 켜질 때 `parsePlace`가 형식을 검사하고, 개발 중에는 `npm run check:content`가 내용까지 검사한다(좌표·영역·방위·보기 개수·정답 위치 분포 등).
- **음성:** 유아 문장 목록을 콘텐츠에서 자동으로 뽑는다. 생성 스크립트가 음성 파일(`public/voice/*.mp3`)을 만들고, 앱은 화면이 바뀔 때 해당 파일을 재생한다.
- **지도:** 바꾸지 않는다. 데이터 보정(`data/overrides.json`)만 더한다.

**Tech Stack:** React 19, Vite 6, TypeScript 5.7, Node 24(`--experimental-strip-types`), MapLibre 5.6

**참고:**
- 설계: [docs/superpowers/specs/2026-10-16-globe-geography-design.md](../specs/2026-10-16-globe-geography-design.md) 3·4·7·8.3·9·10·12장
- 화면 테마: [2026-10-16-passport-theme-design.md](../specs/2026-10-16-passport-theme-design.md)

---

## 결정 사항 (사용자 확인용)

| # | 항목 | 결정 |
|---|---|---|
| D1 | 장소 24곳 | 1단계: 아시아, 유럽, 아프리카, 북아메리카, 남아메리카, 오세아니아, 남극 / 태평양, 대서양, 인도양, 북극해, 남극해. 2단계: 서울, 부산, 제주도, 울릉도, 독도, 백두산, 한라산, 한강, 낙동강, 동해, 서해, 남해. 이 순서가 시작 카드 순서다(대륙 → 대양, 도시 → 섬 → 산 → 강 → 바다) |
| D2 | 미션 구성 | 지금 7곳과 같다. 유아: 찾아 누르기 + 고르기(그림 2개). 저학년: 고르기(3개)·찾아 누르기·방향(4방위). 고학년: 위치 찍기 1개 + 고르기(4개)·방향(8방위) 중 2개 |
| D3 | 단계 열림 | 규칙은 그대로다(2/3 올림). 그래서 1단계 12곳 중 8곳을 모아야 2단계가 열린다. 견본에서 이미 2단계가 열린 아이는 계속 열려 있다(한 번 열리면 유지) |
| D4 | 서해 | 지도 지명은 Natural Earth의 '황해' 그대로 둔다(지명 수 기준 보호). 콘텐츠에서 "서해는 황해라고도 불러요"로 함께 가르친다 |
| D5 | 남해 | 지도에 '남해' 바다 이름이 없어서 보정 데이터로 더한다(독도처럼). 지명이 늘기만 하므로 기준은 지켜진다 |
| D6 | 한라산 이름 | 줌 7.2~9에서 '제주도' 글자에 가려지는 문제를 고친다(한라산이 장소가 되므로). 지명 수 기준을 다시 잰다 |
| D7 | 장소 그림 | 새 장소 17곳에도 지금 7곳처럼 하늘·바다 바탕의 장면 그림을 그린다(시작 카드 표·여권 책·다음 도장 자리) |
| D8 | 유아 음성 범위 | 유아 구간만 넣는다(설계 10장). 출발·둘러보기 말, 미션 질문, 정답 설명, 함께 이야기, 공통 말("잘했어요!" 등)이다. 화면에 들어서면 자동 재생하고, 말풍선 옆 '다시 듣기' 버튼을 둔다. 부모님 공간에서 소리를 끌 수 있다. 재생에 실패하면 자막(지금 글)만 보인다 |
| D9 | 음성 만드는 방식 | **성우 녹음, 나중에** (사용자 결정 2026-10-17). 이번에는 녹음 대본(파일 이름 + 문장)과 재생 기능만 만든다. 녹음 파일을 `public/voice/`에 같은 이름으로 넣으면 바로 재생되고, 그전까지는 자막(지금 글)만 보인다 |
| D10 | 사실 확인 | 모든 새 콘텐츠는 쓰는 에이전트와 다른 에이전트가 사실과 나이 눈높이를 따로 확인한다. 숫자(높이·길이·넓이)는 출처가 분명한 값만 '약'을 붙여 쓴다 |

---

## 콘텐츠 작성 기준 (모든 장소에 공통)

지금 7곳을 다듬으며 정한 기준이다. 검사 스크립트가 잡을 수 있는 것은 스크립트로 막는다.

1. **나이 눈높이**
   - 유아: 한 문장 20자 안팎, 의성어·의태어, 동물·색·크기 같은 직관적인 말, 글 없이 그림(이모지) 보기 2개.
   - 저학년: 이름 익히기, 3학년 사회 교과 수준의 낱말.
   - 고학년: 위치·원리·숫자, 4~6학년 사회 교과 수준.
2. **정답 위치를 골고루:** 고르기 정답 번호가 한쪽에 몰리지 않게 한다. 검사 스크립트가 구간별 분포를 보고한다.
3. **지도에 보이는 답 피하기:** 지명이 보이는 화면에서 그 지명을 묻지 않는다. 위치 찍기는 지명을 숨기므로 괜찮다.
4. **방향 문제:** 계산한 방위(대권 방위각을 8방위로 나눈 것)와 교과서 표현이 같은 조합만 쓴다. 예를 들어 울릉도→독도는 교과서에서 '동남쪽'이지만 계산은 '동'이라 피했다. 검사 스크립트가 계산 방위와 정답이 다르면 막는다.
5. **찾아 누르기:**
   - 대륙·대양은 `area` 판정을 쓴다(영역 이름은 `areas.geojson`에 있어야 함).
   - 그 밖의 곳은 `radiusKm` 판정이다. 유아는 넓게, 저학년은 좁게 한다.
   - `targetName`을 꼭 채운다.
   - `target`이 `area` 안에 있어야 한다(검사).
6. **위치 찍기:** `starsKm`은 장소 크기에 맞춘다(도시·섬은 좁게, 대양은 넓게). `view`는 정답이 화면 안에 들어오되 너무 쉽지 않게 정한다.
7. **사실:**
   - 높이·길이·넓이 같은 숫자는 한국 교과서나 공공기관 값을 쓰고 '약'을 붙인다.
   - 서로 다른 출처가 있으면 교과서 값을 따른다. 예: 에베레스트산은 약 8,849m(지도 지명도 보정함).
8. **부모님 메모(`parentNote`):** 부모가 아이에게 설명해 줄 배경지식 2~3문장. 숫자는 정확하게 쓴다.
9. **함께 이야기:** 유아는 몸으로 하는 놀이(흉내·찾기), 저학년은 경험 묻기, 고학년은 생각을 말하게 하는 질문으로 쓴다.

---

## 모든 작업에 공통

- 브랜치 `feat/plan4-content-voice`에서 작업한다. 작업마다 로컬 커밋을 하고 push는 하지 않는다.
  - 커밋 메시지는 한국어로 쓰고, 마지막 줄에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙인다.
- 새 기능에 자동 테스트는 만들지 않는다. 대신 아래로 확인한다.
  - `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npm run build`
  - `npm run check:content`(작업 1에서 만듦)
  - 숨은 크롬 캡처(`node scripts/shot-cdp.mjs`, `?seed=`·`?shot=` 개발 주소)
  - 같은 크롬 프로필로 흐름을 확인하는 CDP 스크립트(scratchpad)
  - Browser 창 도구는 쓰지 않는다.
- **지명 수 기준:** 1280×800, 세 장면 ≥ 33/118/38. 지구 여권 계획 작업 7 Step 3 방법으로 잰다. 지도 데이터나 스타일을 건드린 작업(2)과 마지막 작업(7)에서 잰다.
- **카드 높이 한도:** 390×844에서 시작 카드 ≤ 50%, 고르기 미션 ≤ 50%, 도장 ≤ 52%.

## 파일 구조

| 파일 | 할 일 | 책임 |
|---|---|---|
| `scripts/check-content.ts` | 새로 | 콘텐츠 검사 (Node strip-types로 실행) |
| `package.json` | 고침 | `check:content` 스크립트 |
| `data/overrides.json` | 고침 | 남해 바다 이름 추가 |
| `src/globe/buildStyle.ts` | 고침(작게) | 한라산 이름 가림 고침 |
| `src/content/places/*.json` | 새로 17개 | europe, africa, north-america, south-america, oceania, atlantic, indian, arctic, southern, busan, ulleungdo, hallasan, hangang, nakdonggang, east-sea, west-sea, south-sea |
| `src/content/index.ts` | 고침 | 24곳 순서 |
| `src/ui/sprite.svg`, `src/ui/PlaceArt.tsx` | 고침 | 장면 그림 17개 |
| `src/voice/*` | 새로 | 음성 재생(자동·다시 듣기·끄기) |
| `scripts/voice-lines.ts`, `scripts/make-voice.mjs` | 새로 | 유아 문장 목록 뽑기, 녹음 대본·있는 파일 목록(manifest) 만들기 |
| `docs/voice/recording-script.{md,csv}` | 새로(생성물) | 성우용 녹음 대본 |
| `public/voice/manifest.json` | 새로(생성물) | 실제로 있는 음성 파일 목록 (녹음 파일은 나중에 같은 폴더에) |

---

### Task 1: 콘텐츠 검사 스크립트

**Files:** Create `scripts/check-content.ts` · Modify `package.json`

- [ ] **Step 0:** `git checkout -b feat/plan4-content-voice`
- [ ] **Step 1: 검사 항목** — `src/content/places/*.json`을 모두 읽어 `parsePlace`로 형식을 검사한다(같은 함수를 import). 그다음 아래를 확인한다. 실패는 '오류', 기준 밖이지만 막지 않는 것은 '알림'으로 나눠 표로 출력한다. 오류가 있으면 종료 코드는 1이다.
  1. `index.ts`의 `PLACES`에 있는 id와 파일 목록이 같다. id가 겹치지 않는다. 단계별 장소 수를 출력한다.
  2. 나이 구간 3개 모두 intro·story·familyTalk가 비어 있지 않다.
     - 유아 문장은 40자를 넘으면 알림이다(한 문장 기준).
     - 저학년·고학년 이야기는 120자를 넘으면 알림이다.
  3. 미션 수와 구성이 D2와 같다.
     - 유아: tap 1 + choice 1
     - 저학년: choice·tap·direction 각 1
     - 고학년: pin 1 + (choice·direction 중 2)
  4. 고르기 보기 수는 유아 2(모두 icon 있음), 저학년 3, 고학년 4다. 보기 글자가 겹치지 않는다.
  5. 고르기 정답 번호를 구간별로 세어 분포를 출력한다. 한 번호가 그 구간 고르기의 60%를 넘으면 알림이다.
  6. 찾아 누르기:
     - `targetName`이 있다.
     - `area`가 있으면 `public/data/areas.geojson`의 `ko` 이름 중 하나이고, `target` 점이 그 영역 다각형 안에 있다(점-다각형 판정).
     - `area`가 없으면 `radiusKm`가 있다(유아 ≥ 50, 저학년 ≥ 20).
  7. 위치 찍기: `targetName`·`starsKm[0] < starsKm[1]`·`view`가 있다. `view` 화면 안에 `target`이 들어가는지 대략 확인한다(줌에 따른 화면 반경 근사).
  8. 방향: `from`→`to`의 대권 방위각을 계산해 8방위(또는 4방위)로 나눈 값이 `answer`와 같다. 경계(±5° 안)면 알림이다.
  9. 좌표가 범위 안이다(경도 −180~180, 위도 −90~90).
  10. 질문(prompt)에 그 고르기의 정답 글자가 그대로 들어 있으면 알림이다.
- [ ] **Step 1-b: 한 장소만 검사** — `--only <id,...>`를 받으면 그 파일들만 검사한다. 아직 `index.ts`에 넣지 않은 새 파일도 검사할 수 있게 하려는 것이다(작업 3·4에서 여러 에이전트가 장소별로 동시에 쓰며 자기 파일만 검사).
- [ ] **Step 2:** `package.json`에 `"check:content": "node --experimental-strip-types scripts/check-content.ts"`를 더한다. strip-types로 `parsePlace`(TS)를 불러오지 못하면, 검사 스크립트 안에 같은 형식 검사를 옮기지 말고 `tsx` 대신 Vite의 `ssrLoadModule` 등 가장 가벼운 방법을 쓴다. 새 패키지가 필요하면 보고한다.
- [ ] **Step 3: 지금 7곳으로 돌려 보기** — 오류 0이어야 한다. 알림은 표로 남긴다. 지금 콘텐츠에서 진짜 문제가 나오면 고친다(예: 방향 계산 불일치).
- [ ] **Step 4: Commit** — `feat: 콘텐츠 검사 스크립트(check:content) — 형식·구성·보기·정답 분포·영역·방위·좌표`

---

### Task 2: 지도 보강 — 남해 이름, 한라산 가림

**Files:** Modify `data/overrides.json`, `scripts/build-data.mjs`(필요하면), `public/data/*.geojson`(생성물), `src/globe/buildStyle.ts`

- [ ] **Step 1: 남해 (D5)** — `overrides.json`의 `add`에 `marine-labels` 항목을 더한다. 위치는 남해안과 제주 사이(대략 [127.9, 34.2]). 속성은 기존 바다 이름과 같은 형식(`ko: '남해'`, `en: 'South Sea'`, 표시 시작 줌은 동해·황해와 비슷하게)으로 한다. `npm run data:build`로 다시 만든다. 대한해협 이름과 겹치지 않게 위치를 캡처로 맞춘다.
- [ ] **Step 2: 한라산 (D6)** — 줌 7.2~9에서 '한라산' 봉우리 이름이 '제주도' 섬 이름에 가려진다. 섬 이름을 섬 중심보다 아래로 놓는 등(겹침 우선순위·`text-offset`·`symbol-sort-key` 중 가장 작은 변경) 둘 다 보이게 한다.
- [ ] **Step 3: 확인**
  - 지명 수 ≥ 33/118/38을 잰다.
  - 남해·한라산이 보이는 캡처를 찍는다(제주 쪽 줌 6·7.2·8).
  - 위성 지도 모습은 그대로다.
- [ ] **Step 4: Commit** — `feat: 남해 바다 이름 더하기, 한라산 이름이 제주도 글자에 가리지 않게`

---

### Task 3: 1단계 새 장소 9곳 콘텐츠

**Files:** Create `src/content/places/{europe,africa,north-america,south-america,oceania,atlantic,indian,arctic,southern}.json` · Modify `src/content/index.ts`

- [ ] **Step 1: 쓰기** — 장소마다 지금 JSON 형식 그대로, '콘텐츠 작성 기준'을 지켜 쓴다. `center`·`zoom`은 그 대륙·대양 전체가 카드 위 영역에 보이게 정한다(지금 asia·pacific 값 참고).
- [ ] **Step 2: 사실 확인 (D10)** — 쓴 사람과 다른 확인자가 장소마다 아래를 확인한다.
  - 사실: 숫자, 이름, 위치, 동물·자연 설명
  - 눈높이
  - 기준 3(지도에 보이는 답)·4(방향)
- [ ] **Step 3: 순서** — `index.ts`의 PLACES를 D1 순서로 바꾼다. 1단계 대륙 7(아시아, 유럽, 아프리카, 북아메리카, 남아메리카, 오세아니아, 남극) → 대양 5(태평양, 대서양, 인도양, 북극해, 남극해)다.
- [ ] **Step 4: 확인**
  - `check:content` 오류 0
  - tsc·lint·build
  - 새 장소마다 유아·저학년·고학년 여행을 숨은 크롬으로 끝까지 돌린다(지금까지 쓰던 여행 흐름 스크립트). 콘솔 오류 0, 미션 판정이 맞아야 한다(정답 좌표를 누르면 정답, 먼 곳은 오답).
- [ ] **Step 5: Commit** — `content: 1단계 새 장소 9곳(유럽·아프리카·북아메리카·남아메리카·오세아니아·대서양·인도양·북극해·남극해)`

---

### Task 4: 2단계 새 장소 8곳 콘텐츠

**Files:** Create `src/content/places/{busan,ulleungdo,hallasan,hangang,nakdonggang,east-sea,west-sea,south-sea}.json` · Modify `src/content/index.ts`

- [ ] **Step 1~2:** 작업 3과 같은 방식으로 쓰고 확인한다.
  - 강(한강·낙동강)의 찾아 누르기는 강 위 점 + `radiusKm`로 한다.
  - 바다(동해·서해·남해)는 바다 가운데 점 + 넓은 `radiusKm`로 한다.
  - 서해는 D4대로 '황해'라는 이름도 함께 가르친다.
- [ ] **Step 3: 순서** — 2단계는 D1 순서다. 서울, 부산, 제주도, 울릉도, 독도, 백두산, 한라산, 한강, 낙동강, 동해, 서해, 남해.
- [ ] **Step 4~5:** 작업 3과 같이 확인하고 커밋한다 — `content: 2단계 새 장소 8곳(부산·울릉도·한라산·한강·낙동강·동해·서해·남해)`

---

### Task 5: 장면 그림 17개

**Files:** Modify `src/ui/sprite.svg`, `src/ui/PlaceArt.tsx`

- [ ] **Step 1:** 새 장소마다 64×50 장면 그림(`pl-<id>`)을 그린다.
  - 지금 7개(스티커북 시안에서 온 것)와 같은 화풍으로 한다: 하늘·바다 바탕, 굵기와 채도.
  - 아이가 알아보는 대표 그림 하나를 넣는다. 예: 유럽 에펠탑·풍차, 아프리카 사자·사바나, 북극해 북극곰, 부산 광안대교·바다, 한강 다리와 강물.
  - 어느 나라 국기나 상표는 넣지 않는다.
- [ ] **Step 2:** `PlaceArt`의 `SCENES` 목록에 더한다.
- [ ] **Step 3: 확인**
  - 시작 카드(390×844, 1024×768), 여권 책(`?seed=full`), 도장 카드 '다음 도장 자리'를 캡처해 그림이 칸을 꽉 채우고 서로 구별되는지 본다.
  - 40px 크기로도 알아볼 수 있어야 한다.
  - 시작 카드 높이 ≤ 50%를 다시 잰다. 1단계 12곳·2단계 12곳이라 표가 3줄씩이 되므로 카드 안 세로 스크롤이 생긴다. 넘침 표시가 보이는지 확인한다.
- [ ] **Step 4: Commit** — `feat: 새 장소 17곳 장면 그림`

---

### Task 6: 유아 음성

**Files:** Create `scripts/voice-lines.ts`, `scripts/make-voice.mjs`, `src/voice/voice.ts`, `src/voice/useVoice.ts`, `public/voice/manifest.json`(생성), `docs/voice/recording-script.{md,csv}`(생성) · Modify `src/trip/TripPanel.tsx`, `src/trip/CharacterBubble.tsx`, 미션 화면들, `src/family/ParentSpace.tsx`, `src/progress/types.ts`·`storage.ts`(소리 켜기 설정)

- [ ] **Step 1: 문장 목록** — `scripts/voice-lines.ts`가 PLACES의 유아 문장을 뽑아 `public/voice/lines.json`(id → 문장)을 만든다.
  - 뽑는 문장: intro, story, 미션 prompt·explain, familyTalk
  - 공통 말: "잘했어요!", "괜찮아요, 같이 알아봐요", "반짝이는 걸 눌러 봐!", "○○ 도장을 받았어요!" 등. 장소 이름이 들어가는 말은 장소마다 만든다.
  - id 규칙: `<placeId>.<field>[.<n>]`, 공통은 `common.<key>`.
  - 문장이 바뀌면 파일 이름이 바뀌게 문장 해시를 id에 붙인다. 그래야 옛 음성이 남지 않는다.
- [ ] **Step 2: 녹음 대본과 파일 목록 (D9: 성우 녹음, 나중에)** — `scripts/make-voice.mjs`(이름은 `scripts/voice-script.mjs`로 바꿔도 됨)가 두 가지를 한다.
  1. `docs/voice/recording-script.md`와 `docs/voice/recording-script.csv`를 만든다. 내용은 파일 이름, 장소, 나이 구간, 상황(출발·미션 질문 등), 읽을 문장, 읽는 느낌 메모(예: "밝고 천천히, 의성어는 리듬 있게")다. 성우에게 그대로 넘길 수 있는 대본이다.
  2. `public/voice/` 안에 실제로 있는 음성 파일을 훑어 `public/voice/manifest.json`(있는 id 목록)을 만든다. `lines.json`에 있는데 파일이 없는 문장 수, 파일은 있는데 `lines.json`에 없는 옛 파일을 보고한다.
  - 앱은 manifest에 있는 id만 재생을 시도한다. 그래서 파일이 없어도 404 요청이나 콘솔 오류가 생기지 않는다.
  - `package.json`에 `"voice:script"` 스크립트를 더한다. 빌드 전에 manifest를 만들도록 `"build"` 앞에 붙인다(path-safe-build 흐름을 깨지 않게).
  - 파일 형식은 mp3(또는 m4a)다. 이름은 `<id>.mp3`.
- [ ] **Step 3: 재생** (D8)
  - `src/voice/voice.ts`: `HTMLAudioElement` 하나를 돌려 쓴다. `play(id)`는 이전 소리를 멈추고 재생한다. 파일이 없거나 재생에 실패하면 조용히 넘어간다.
  - 브라우저 자동 재생 제한: 앱에서 처음 누른 순간(여권 만들기·장소 표·출발)에 소리를 '깨워' 둔다.
  - 유아 여행에서만 단계·미션이 바뀌면 해당 문장을 재생한다. 말풍선·질문 옆에는 '다시 듣기' 버튼(스피커 아이콘, 48px, aria-label '다시 듣기')을 둔다.
  - 결과(정답·오답)와 도장도 공통 말을 재생한다.
  - 여행을 나가면 멈춘다.
- [ ] **Step 4: 소리 끄기** — 저장 데이터에 `settings: { voiceOn: boolean }`(기본 켬)을 더하고, `SAVE_VERSION`은 그대로 두되 없으면 기본값을 쓴다. 부모님 공간에 '유아 음성' 켜기/끄기 스위치를 둔다.
- [ ] **Step 5: PWA** — 음성 파일은 미리 저장하지 않고(용량), 처음 들을 때 저장하는 runtimeCaching(CacheFirst)으로 둔다. 인터넷이 없을 때 처음 듣는 문장은 조용히 자막만 보인다.
- [ ] **Step 6: 확인**
  - tsc·lint·build·`check:content`
  - 대본 md·csv의 줄 수가 `lines.json` 문장 수와 같다.
  - 시험용 무음 mp3 두세 개를 scratchpad에서 만들어 `public/voice/`에 잠시 넣고 manifest를 다시 만든 뒤, 숨은 크롬에서 유아 여행 하나를 돌리며 재생 호출 순서를 기록한다(Audio를 가로채는 스크립트). 확인한 뒤 시험 파일은 지우고 manifest를 다시 만든다(저장소에 넣지 않음).
  - 파일이 하나도 없을 때도 콘솔 오류와 404 요청이 없다. 소리를 끄면 재생하지 않는다.
- [ ] **Step 7: Commit** — `feat: 유아 음성(자동 재생·다시 듣기·끄기)과 음성 문장 목록·생성 스크립트`

---

### Task 7: 전체 확인

- [ ] **Step 1:** tsc·lint·build·`check:content`(오류 0)를 돌리고, 지명 수 ≥ 33/118/38을 잰다.
- [ ] **Step 2: 여행 72개** — 24곳 × 3구간을 숨은 크롬으로 끝까지 돌린다. 각 미션에서 정답 한 번, 저학년·고학년 몇 곳은 오답 두 번(정답 공개)도 지나간다. 콘솔 오류 0, 목표·핀·표시가 카드에 가리지 않아야 한다.
- [ ] **Step 3: 단계 열림** — 새 프로필에서 1단계 7곳은 잠김, 8곳째에 2단계가 열린다. 견본 데이터로 2단계가 이미 열린 저장(`unlockedStages: [1,2]`, 도장 2개)은 그대로 열려 있다.
- [ ] **Step 4: 화면** — 390×844, 360×740, 1024×768에서 다음을 캡처해 테마와 비교한다.
  - 시작 카드(표 24장, 넘침 표시), 여권 책(24칸), 새 장소의 출발·미션·도장 몇 곳
- [ ] **Step 5: 음성** — 유아 여행 3곳에서 재생 순서, 다시 듣기, 끄기를 확인한다.
- [ ] **Step 6: Commit** (고친 것이 있으면) — `fix: 계획 4 전체 확인에서 나온 것 고침`
