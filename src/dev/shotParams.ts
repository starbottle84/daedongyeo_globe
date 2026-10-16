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
