import type { Mission } from '../content/types';

// 여행 한 번의 순서: 출발 → 둘러보기 → 미션(여러 개) → 도장 → 함께 이야기
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
}

export type TripAction =
  | { type: 'next' }
  | { type: 'missionDone'; result: MissionResult }
  /** '함께 이야기해요'에서 문제를 한 번 더 푼다 (count = 이번에 고른 문제 수) */
  | { type: 'more'; count: number };

export function createTripState(missionCount: number): TripState {
  return { step: 'depart', missionIndex: 0, missionCount, results: [], round: 0 };
}

export function tripReducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case 'next':
      if (state.step === 'depart') return { ...state, step: 'explore' };
      if (state.step === 'explore') return { ...state, step: 'mission' };
      if (state.step === 'stamp') return { ...state, step: 'talk' };
      return state;
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
      return { ...state, step: 'mission', missionIndex: 0, missionCount: action.count, results: [], round: state.round + 1 };
  }
}
