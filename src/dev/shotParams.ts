import { PLACES } from '../content';
import type { Tier } from '../content/types';
import { emptyProgress, stagesOf } from '../progress/rules';
import { emptySave } from '../progress/storage';
import { SAVE_VERSION, type Profile, type SaveData, type StampRecord } from '../progress/types';
import { pickMissions, type PoolMission } from '../trip/pickMissions';

/** 개발 중 화면 확인용: ?shot=장소id:단계:화면  (예: jeju:preschool:mission)
 *  화면: depart | explore | mission | stamp | talk  (mission 뒤에 숫자를 붙이면 그 번호 미션: mission2,
 *  explore 뒤에 숫자를 붙이면 저학년·고학년 여행 수업의 그 번호 장: explore3)
 *  미션 번호는 고정 시드로 고른 이번 여행 문제 중 몇 번째인지다. &pool=all을 붙이면 묶음 전체를 콘텐츠 순서대로 연다 (shotMissions) */
export interface ShotParams {
  placeId: string;
  tier: Tier;
  step: 'depart' | 'explore' | 'mission' | 'stamp' | 'talk';
  /** 화면 뒤 숫자 − 1: mission은 몇째 미션, explore는 여행 수업 몇째 장 */
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
    // mission0처럼 0을 넣어도 -1번 미션이 되지 않게 막는다
    missionIndex: m[2] ? Math.max(0, Number(m[2]) - 1) : 0,
  };
}

/** 고정 시드 난수 (mulberry32). 시드가 같으면 늘 같은 수열이다 */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SHOT_SEED = 20261018;

/** ?shot=로 연 여행의 문제 (D10): 고정 시드로 골라서 주소(와 ?seed= 상태)가 같으면 늘 같은 문제가 나온다.
 *  &pool=all이면 고르지 않고 묶음 전체를 콘텐츠 순서대로 연다 — mission7이 콘텐츠의 7번째 문제다 (새 문제 화면 확인용) */
export function shotMissions(pool: PoolMission[], tier: Tier, seenIds: readonly string[]): PoolMission[] {
  if (new URLSearchParams(location.search).get('pool') === 'all') return pool;
  return pickMissions(pool, tier, seenIds, seededRandom(SHOT_SEED));
}

/** 개발 중 화면 확인용 진행 상태: ?seed=new(프로필 없음) | one(유아 1명, 도장 없음) | siblings(유아·고학년, 1단계 도장 2개 + 저장된 열린 단계 [1,2] = 견본 때 2단계가 열린 아이) | full(유아·고학년 둘 다 모든 도장)
 *  이 상태는 저장하지 않는다. ?shot=과 같이 쓸 수 있다 (예: ?seed=siblings&shot=jeju:preschool:stamp) */
export function readSeed(): SaveData | null {
  if (!import.meta.env.DEV) return null;
  const kind = new URLSearchParams(location.search).get('seed');
  if (!kind) return null;
  const day = '2026-10-16';
  const stamp = (bestStars = 0): StampRecord => ({ firstDate: day, lastDate: day, visits: 1, bestStars });
  const kidA: Profile = { id: 'kid-a', name: '하늘', tier: 'preschool', color: 'sky', createdAt: day };
  const kidB: Profile = { id: 'kid-b', name: '바다', tier: 'upper', color: 'sun', createdAt: day };
  const base = { version: SAVE_VERSION, activeProfileId: 'kid-a', profiles: [kidA, kidB], settings: { voiceOn: true } };
  switch (kind) {
    case 'new':
      return emptySave();
    case 'one':
      return { ...base, profiles: [kidA], progress: { 'kid-a': emptyProgress() } };
    case 'siblings':
      return {
        ...base,
        progress: {
          'kid-a': { stamps: { pacific: stamp(), asia: stamp() }, unlockedStages: [1, 2], seen: {}, quiz: { capital: {}, flag: {} } },
          'kid-b': emptyProgress(),
        },
      };
    case 'full':
      return {
        ...base,
        progress: {
          'kid-a': { stamps: Object.fromEntries(PLACES.map((p) => [p.id, stamp()])), unlockedStages: stagesOf(PLACES), seen: {}, quiz: { capital: {}, flag: {} } },
          // 고학년은 별 1~3개를 섞어 둔다
          'kid-b': { stamps: Object.fromEntries(PLACES.map((p, i) => [p.id, stamp((i % 3) + 1)])), unlockedStages: stagesOf(PLACES), seen: {}, quiz: { capital: {}, flag: {} } },
        },
      };
    default:
      return null;
  }
}
