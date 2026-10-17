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
  // 별은 0~99 정수로 맞춘다 (NaN·음수가 메모리에 남지 않게, 읽을 때 정규화와 같은 범위)
  const starCount = Number.isFinite(stars) ? Math.min(99, Math.max(0, Math.floor(stars))) : 0;
  const before = progress.stamps[placeId];
  const record = before
    ? { ...before, lastDate: today, visits: before.visits + 1, bestStars: Math.max(before.bestStars, starCount) }
    : { firstDate: today, lastDate: today, visits: 1, bestStars: starCount };
  const stamped: ProfileProgress = { ...progress, stamps: { ...progress.stamps, [placeId]: record } };
  const unlockedStages = computeUnlocked(places, stamped);
  const newlyUnlocked = unlockedStages.filter((s) => !progress.unlockedStages.includes(s) && s !== (stagesOf(places)[0] ?? 1));
  return {
    progress: { ...stamped, unlockedStages },
    outcome: {
      isNew: !before,
      firstDate: record.firstDate,
      bestStars: record.bestStars,
      newBest: starCount > (before?.bestStars ?? 0),
      newlyUnlocked,
    },
  };
}

/** 다음에 가 볼 곳: 지금 장소 다음부터(끝에 닿으면 처음부터) 열린 단계에 있고 아직 도장이 없는 첫 장소. 없으면 null */
export function nextPlaceFor(places: Place[], progress: ProfileProgress, current: Place): Place | null {
  const open = new Set(computeUnlocked(places, progress));
  // current가 목록에 없으면 start가 -1이라 처음부터 끝까지 본다. 목록에 있으면 마지막 차례가 current 자신이라 id로 건너뛴다
  const start = places.indexOf(current);
  for (let k = 1; k <= places.length; k++) {
    const p = places[(start + k) % places.length];
    if (p.id !== current.id && open.has(p.stage) && !progress.stamps[p.id]) return p;
  }
  return null;
}

export function emptyProgress(): ProfileProgress {
  return { stamps: {}, unlockedStages: [1] };
}
