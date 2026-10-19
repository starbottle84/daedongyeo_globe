import type { LngLat, MissionOf, Tier } from '../content/types';
import { distanceKm } from './geo';

/** 지구본을 누른 곳: 좌표와, 그 자리에 있는 대륙·대양 이름과 나라 이름(없으면 null) */
export interface TapInfo {
  at: LngLat;
  area: string | null;
  country: string | null;
  /** 영역 층(area-hit)과 나라 층이 다 준비돼서 area·country를 믿을 수 있는지. 화면이 움직이는 동안이나 처음 받는 중에는 false */
  areaReady: boolean;
}

// 찾아 누르기: 영역 이름이 있으면 그 영역 안을, 나라 이름이 있으면 그 나라 땅 안을, 없으면 target에서 radiusKm 안을 눌러야 정답
export function judgeTap(mission: MissionOf<'tap'>, tap: TapInfo): boolean {
  if (mission.area) return tap.area === mission.area;
  if (mission.country) return tap.country === mission.country;
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
