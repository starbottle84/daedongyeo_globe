import { TIERS, type Place } from '../content/types';
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

/** 잠긴 단계를 열려면 어느 단계 도장을 몇 개 더 모아야 하는지 (남은 수는 최소 1). 시작 카드·여권 책이 같이 쓴다.
 *  바로 앞의 열린 단계를 기준으로 한다: prev = 도장을 모을 열린 단계, opens = 그 도장으로 열리는 단계.
 *  앞 단계도 잠겨 있으면(계획 4에서 단계가 늘면) opens가 stage보다 앞이다 — 그 단계부터 열어야 한다 */
export function stageLockLeft(places: Place[], progress: ProfileProgress, stage: number): { prev: number; opens: number; left: number } {
  const stages = stagesOf(places);
  const open = computeUnlocked(places, progress);
  let i = stages.indexOf(stage) - 1;
  while (i > 0 && !open.includes(stages[i])) i--;
  const prev = stages[i];
  const { got, need } = stageCounts(places, progress, prev);
  return { prev, opens: stages[i + 1], left: Math.max(1, need - got) };
}

/** 잠긴 단계 안내 문구 (시작 카드와 여권 책이 같이 쓴다): 짧은 표시(badge)와 문장(text) */
export function stageLockMessage(places: Place[], progress: ProfileProgress, stage: number): { badge: string; text: string } {
  const { prev, opens, left } = stageLockLeft(places, progress, stage);
  return opens === stage
    ? { badge: `${left}개 더`, text: `${prev}단계 도장을 ${left}개 더 모으면 열려요` }
    : { badge: `${opens}단계 먼저`, text: `먼저 ${opens}단계를 열어요` };
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
  // 시작 위치는 id로 찾는다 (같은 장소의 다른 객체가 와도 맞게). 목록에 없으면 start가 -1이라 처음부터 끝까지 본다.
  // 목록에 있으면 마지막 차례가 current 자신이라 id로 건너뛴다
  const start = places.findIndex((p) => p.id === current.id);
  for (let k = 1; k <= places.length; k++) {
    const p = places[(start + k) % places.length];
    if (p.id !== current.id && open.has(p.stage) && !progress.stamps[p.id]) return p;
  }
  return null;
}

/** 장소마다 기억하는 푼 문제 수의 한도: 가장 큰 문제 묶음 크기. 넘치면 오래전에 푼 것부터 뺀다 */
export function seenLimit(places: Place[]): number {
  return Math.max(1, ...places.flatMap((p) => TIERS.map((t) => p.missions[t].length)));
}

/** 이번 여행에 푼 문제 id를 그 장소 기록 끝에 더한다 (새 객체). 이미 있던 id는 끝으로 옮겨서, 앞에는 오래전에 푼 문제가 남는다 */
export function addSeen(progress: ProfileProgress, placeId: string, ids: string[], limit: number): ProfileProgress {
  const added = new Set(ids);
  const list = [...(progress.seen[placeId] ?? []).filter((id) => !added.has(id)), ...added].slice(-limit);
  return { ...progress, seen: { ...progress.seen, [placeId]: list } };
}

export function emptyProgress(): ProfileProgress {
  return { stamps: {}, unlockedStages: [1], seen: {}, quiz: { capital: {}, flag: {} } };
}
