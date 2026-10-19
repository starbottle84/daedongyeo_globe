import type { Mission } from '../content/types';

// 여행 한 번의 순서: 출발 → 둘러보기(저학년·고학년은 여행 수업 여러 장) → 미션(여러 개) → 도장 → 함께 이야기
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
  /** 0 = 도장을 받는 첫 미션 묶음, 1부터 = 도장 뒤 '문제 더 풀기'로 이어 푼 차례 */
  round: number;
  /** 둘러보기에서 보고 있는 장(0부터)과 장 수. 유아는 이야기 1장, 저학년·고학년은 여행 수업 여러 장 (lesson.ts) */
  sceneIndex: number;
  sceneCount: number;
}

export type TripAction =
  | { type: 'next' }
  /** 여행 수업 앞 장으로 */
  | { type: 'prev' }
  /** 여행 수업을 건너뛰고 미션으로 */
  | { type: 'skip' }
  | { type: 'missionDone'; result: MissionResult }
  /** '함께 이야기해요'에서 문제를 한 번 더 푼다 (count = 이번에 고른 문제 수, sceneCount = 그 문제로 만든 여행 수업 장 수 — 0이면 바로 미션) */
  | { type: 'more'; count: number; sceneCount: number };

export function createTripState(missionCount: number, sceneCount: number): TripState {
  return { step: 'depart', missionIndex: 0, missionCount, results: [], round: 0, sceneIndex: 0, sceneCount };
}

export function tripReducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case 'next':
      if (state.step === 'depart') return { ...state, step: 'explore' };
      // 둘러보기는 다음 장으로, 마지막 장이면 미션으로
      if (state.step === 'explore') {
        return state.sceneIndex + 1 < state.sceneCount ? { ...state, sceneIndex: state.sceneIndex + 1 } : { ...state, step: 'mission' };
      }
      if (state.step === 'stamp') return { ...state, step: 'talk' };
      return state;
    case 'prev':
      if (state.step !== 'explore' || state.sceneIndex === 0) return state;
      return { ...state, sceneIndex: state.sceneIndex - 1 };
    case 'skip':
      if (state.step !== 'explore') return state;
      return { ...state, step: 'mission' };
    case 'missionDone': {
      if (state.step !== 'mission') return state;
      const results = [...state.results, action.result];
      const isLast = state.missionIndex + 1 >= state.missionCount;
      // 더 풀기 차례는 도장을 이미 받았으니 끝나면 '함께 이야기해요'로 돌아간다
      if (isLast) return { ...state, results, step: state.round > 0 ? 'talk' : 'stamp' };
      return { ...state, results, missionIndex: state.missionIndex + 1 };
    }
    case 'more':
      if (state.step !== 'talk' || action.count < 1) return state;
      return {
        ...state,
        step: action.sceneCount > 0 ? 'explore' : 'mission',
        missionIndex: 0,
        missionCount: action.count,
        results: [],
        round: state.round + 1,
        sceneIndex: 0,
        sceneCount: action.sceneCount,
      };
  }
}
