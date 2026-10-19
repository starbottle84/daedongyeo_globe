# 계획 7: 여행 수업 (저학년·고학년)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저학년·고학년 여행의 둘러보기를 '여행 수업' 여러 장(이야기 1장 + 고른 문제마다 해설 1장)으로 바꿔, 문제 전에 내용을 한 번 훑게 한다.

**Architecture:** 이번 여행 문제(`picked`)로 장면 목록을 만드는 순수 함수(`lesson.ts`)와 장면 한 장을 그리며 지구본을 움직이는 `LessonView`를 더한다. 여행 상태(`tripReducer`)는 둘러보기 안에서 몇째 장인지(`sceneIndex`)를 기억한다. 유아 여행은 그대로다.

**Tech Stack:** React 19 + TypeScript, MapLibre 6.14 (globeHandle 손잡이만 쓴다)

**설계:** `docs/superpowers/specs/2026-10-19-trip-lesson-design.md` (결정 L1~L9)

**사용자 규칙:** 새 기능이라 테스트는 새로 만들지 않는다. 커밋은 사용자 허락을 받은 뒤에만 한다. 확인은 화면 찍기 + `npm run check:content`·`tsc`·`lint`·`build`.

---

### 작업 1: 장면 목록 (`src/trip/lesson.ts`, 새 파일)

- [ ] 아래 내용으로 만든다

```ts
import type { Mission, Place, Tier } from '../content/types';
import type { PoolMission } from './pickMissions';

/** 여행 수업 한 장 (설계 2026-10-19-trip-lesson-design L1·L2) */
export interface LessonScene {
  /** 동글이 말풍선 글: 이야기 장은 장소 이야기, 문제 장은 그 문제의 해설 */
  text: string;
  /** 이 장이 미리 알려 주는 문제. 없으면 장소 이야기 장이다 */
  mission?: Mission;
}

export function lessonScenes(place: Place, tier: Tier, picked: PoolMission[], withStory: boolean): LessonScene[] {
  const story: LessonScene[] = withStory ? [{ text: place.story[tier] }] : [];
  if (tier === 'preschool') return story;
  return [...story, ...picked.flatMap(({ mission }) => (mission.explain ? [{ text: mission.explain, mission }] : []))];
}
```

### 작업 2: 여행 상태 (`src/trip/tripReducer.ts`)

- [ ] `TripState`에 `sceneIndex`·`sceneCount`를 더하고 `createTripState(missionCount, sceneCount)`로 바꾼다
- [ ] 동작: `next`(둘러보기에서는 다음 장, 마지막 장이면 미션), `prev`(앞 장), `skip`(미션으로), `more`에 `sceneCount`(0이면 바로 미션, 아니면 둘러보기 0장부터)

### 작업 3: 수업 화면 (`src/trip/LessonView.tsx`, 새 파일)

- [ ] 진행 줄 `여행 수업 n / N` + 점, 이름 줄(찾아 누르기·핀 꽂기 = 찾을 곳 + 초록 점, 방향 = `기준 → 목표`), 국기 고르기면 국기 그림, 말풍선, 버튼(첫 장 [다음]만, 마지막 장 [미션 시작]), 마지막 장이 아니면 "건너뛰고 문제 풀기"
- [ ] 지구본 효과 (장이 바뀔 때마다, 정리할 때 `clearMarkers`):
  - 이야기·고르기: `globe.flyTo(장소)`
  - 방향: `showCompass` → `revealCompass(answer)` → `showMarker('to')` → `fitTo([from, to], undefined, COMPASS_FRAME)` (DirectionMission의 답한 뒤 화면과 같다)
  - 찾아 누르기·핀 꽂기: `flyTo(target, (view ?? 장소).zoom)` + `showMarker('answer', target, targetName)`
- [ ] `src/trip/missions/DirectionMission.tsx`의 `COMPASS_FRAME`에 `export`를 붙여 함께 쓴다

### 작업 4: 여행 패널 (`src/trip/TripPanel.tsx`)

- [ ] 처음 장면 수로 상태를 만든다. 개발용 주소 `explore` 뒤 숫자는 여행 수업 몇째 장(`sceneIndex`), `mission` 뒤 숫자는 몇째 미션
- [ ] `scenes = lessonScenes(place, tier, picked, state.round === 0)`
- [ ] 저학년·고학년 둘러보기는 `LessonView`, 유아는 지금 그대로
- [ ] 개발용 주소로 저학년·고학년 둘러보기를 바로 열면 패널이 장소로 날아가지 않는다 (LessonView가 맞춘 화면을 덮지 않게)
- [ ] 장이 바뀌면 본문 스크롤을 맨 위로, 패널로 초점 (효과 의존성에 `state.sceneIndex`)
- [ ] `startMore`가 `sceneCount: lessonScenes(place, tier, nextPick, false).length`를 함께 보낸다

### 작업 5: 모양 (`src/trip/trip.css`)

- [ ] `.lesson__name`, `.lesson__name--spot::before`(초록 점), `.lesson__flag`, `.lesson__actions`(이전 2 : 다음 3, 하나면 한 줄), `.lesson__skip`(`.link-button` 바탕)

### 작업 6: 개발용 주소 설명 (`src/dev/shotParams.ts`)

- [ ] 주석에 `explore3` = 여행 수업 3번째 장을 적는다 (해석은 이미 숫자를 받는다)

### 작업 7: 해설 6개·검사 (`src/content/places/*.json`, `scripts/check-content.ts`)

- [ ] 저학년 '그곳 찾기' 6문제에 해설:
  - asia: 아시아는 우리나라가 있는 대륙이에요. 서쪽으로 유럽과 땅이 이어져 있어요.
  - antarctica: 남극 대륙은 지구본 맨 아래, 남극점 둘레에 있어요. 둘레를 남극해가 감싸고 있어요.
  - atlantic: 대서양은 남북으로 길쭉한 바다예요. 북쪽은 북극해, 남쪽은 남극해와 이어져요.
  - oceania: 오세아니아는 대부분 적도 남쪽에 있어요. 그 가운데 오스트레일리아가 가장 커요.
  - pacific: 태평양은 아시아·오세아니아와 아메리카 사이에 있는 바다예요. 지구본을 돌리면 한쪽 면이 거의 다 태평양이에요.
  - south-america: 남아메리카는 아래로 갈수록 좁아지는 모양이에요. 남쪽 끝은 남극과 가까워요.
- [ ] 검사 12번: 저학년·고학년 문제에 해설이 없으면 오류

### 작업 8: 확인

- [ ] `npm run check:content` 오류 0, `npx tsc -b`, `npm run lint`, `npm run build` 통과
- [ ] `node scripts/shot-cdp.mjs`로 390×844·768×1024에서 `?shot=sahara:lower:explore1~5`, 고학년 방향·핀 장면, 국기 장면을 찍어 본다
- [ ] 빌드가 다시 만드는 녹음 대본(`docs/voice/*`)이 바뀌지 않았는지 `git status`로 본다 (저학년 해설은 녹음하지 않는다)
