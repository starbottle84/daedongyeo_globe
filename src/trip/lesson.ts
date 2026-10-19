import type { Mission, Place, Tier } from '../content/types';
import type { PoolMission } from './pickMissions';

/** 여행 수업 한 장 (설계 2026-10-19-trip-lesson-design L1·L2) */
export interface LessonScene {
  /** 동글이 말풍선 글: 이야기 장은 장소 이야기, 문제 장은 그 문제의 해설 */
  text: string;
  /** 이 장이 미리 알려 주는 문제. 없으면 장소 이야기 장이다 */
  mission?: Mission;
}

/**
 * 둘러보기 단계의 장면 목록.
 * - 유아: 장소 이야기 1장만 (지금과 같다, L5). 문제 더 풀기(withStory = false)는 0장이라 바로 미션으로 간다
 * - 저학년·고학년: 이야기 1장 + 이번에 고른 문제마다 해설 1장. 문제 더 풀기는 이야기 장 없이 해설만 (L7)
 * 해설이 없는 문제는 장을 만들지 않는다 (저학년·고학년 해설은 check:content가 막는다, L9)
 */
export function lessonScenes(place: Place, tier: Tier, picked: PoolMission[], withStory: boolean): LessonScene[] {
  const story: LessonScene[] = withStory ? [{ text: place.story[tier] }] : [];
  if (tier === 'preschool') return story;
  return [...story, ...picked.flatMap(({ mission }) => (mission.explain ? [{ text: mission.explain, mission }] : []))];
}
