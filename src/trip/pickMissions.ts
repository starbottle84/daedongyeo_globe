import type { Mission, Place, Tier } from '../content/types';

// 장소·나이 구간의 문제 묶음(missions[tier])에서 이번 여행에 낼 문제를 고른다 (계획 5 D2·D3·D4).
// 순수 함수다: 난수(rand)를 밖에서 받는다 — 여행은 Math.random, 개발용 ?shot= 주소는 고정 시드.

type MissionType = Mission['type'];

/** 묶음 안 문제 하나 */
export interface PoolMission {
  mission: Mission;
  /** 콘텐츠 묶음 안 번호 (0부터). 유아 음성 id가 이 번호를 쓴다 (voice/lines.ts placeVoice) */
  index: number;
  /** 문제 id — 푼 문제 기록(seen)과 부모님 공간이 쓴다 */
  id: string;
}

/** 여행 한 번에 내는 문제 수 (D2). 묶음이 이보다 작으면 묶음 전부를 낸다 */
export const TRIP_MISSION_COUNT: Record<Tier, number> = { preschool: 3, lower: 4, upper: 5 };

/** 종류별로 꼭 하나씩 넣을 것(required)과 나머지 칸에 넣을 종류(rest, null이면 아무 종류) (D3).
 *  유아: 누르기 1 + 고르기, 저학년: 누르기 1·방향 1 + 고르기, 고학년: 핀 1·방향 1·고르기 1 + 나머지 무작위 */
const RECIPE: Record<Tier, { required: MissionType[]; rest: MissionType[] | null }> = {
  preschool: { required: ['tap'], rest: ['choice'] },
  lower: { required: ['tap', 'direction'], rest: ['choice'] },
  upper: { required: ['pin', 'direction', 'choice'], rest: null },
};

/** 늘어놓는 순서 (D4): 지도 미션(누르기·핀) → 고르기 → 방향 */
const ORDER: Record<MissionType, number> = { tap: 0, pin: 0, choice: 1, direction: 2 };

// FNV-1a 32비트 해시 → 16진수 8자리. 글이 같으면 브라우저·Node 어디서나 같은 값이다 (voice/lines.ts와 같은 방식)
function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** 문제 id: `장소id.구간.해시(종류+질문)`. 콘텐츠에 칸을 더하지 않으려고 문장으로 만든다 — 질문을 고치면 새 문제가 된다 */
export function missionId(placeId: string, tier: Tier, mission: Mission): string {
  return `${placeId}.${tier}.${hashText(mission.type + mission.prompt)}`;
}

/** 장소·구간의 묶음 전체 (콘텐츠 순서) */
export function missionPool(place: Place, tier: Tier): PoolMission[] {
  return place.missions[tier].map((mission, index) => ({ mission, index, id: missionId(place.id, tier, mission) }));
}

// D4 순서, 같은 순서끼리는 콘텐츠 순서
const byOrder = (a: PoolMission, b: PoolMission) => ORDER[a.mission.type] - ORDER[b.mission.type] || a.index - b.index;

/**
 * 이번 여행 문제를 고른다 (D3).
 * - 안 푼 문제를 먼저 고른다. 다 풀었으면 오래전에 푼 것부터 다시 돈다 (seenIds는 오래된 것이 앞인 목록, rules.ts addSeen)
 * - 종류별로 꼭 하나씩 넣고(RECIPE.required), 남은 칸은 RECIPE.rest 종류에서 채운다. 그 종류가 모자라면 아무 종류로 채운다
 * - 같은 우선순위 안에서는 무작위다
 * 고른 문제는 D4 순서로 돌려준다. 묶음이 TRIP_MISSION_COUNT보다 작거나 같으면 묶음 전부를 낸다.
 */
export function pickMissions(pool: PoolMission[], tier: Tier, seenIds: readonly string[], rand: () => number): PoolMission[] {
  const count = TRIP_MISSION_COUNT[tier];
  if (pool.length <= count) return [...pool].sort(byOrder);

  // 섞은 뒤 '안 푼 것(-1) → 오래전에 푼 것' 순으로 줄 세운다 (정렬은 안정적이라 같은 순위끼리는 섞인 순서 그대로)
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const age = (m: PoolMission) => seenIds.lastIndexOf(m.id);
  const ranked = shuffled.sort((a, b) => age(a) - age(b));

  const { required, rest } = RECIPE[tier];
  const picked: PoolMission[] = [];
  const take = (ok: (m: PoolMission) => boolean) => {
    for (const m of ranked) {
      if (picked.length >= count) return;
      if (!picked.includes(m) && ok(m)) picked.push(m);
    }
  };
  for (const type of required) {
    const m = ranked.find((x) => x.mission.type === type && !picked.includes(x));
    if (m) picked.push(m);
  }
  take((m) => rest === null || rest.includes(m.mission.type));
  take(() => true);
  return picked.sort(byOrder);
}
