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
}

export type TripAction = { type: 'next' } | { type: 'missionDone'; result: MissionResult };

export function createTripState(missionCount: number): TripState {
  return { step: 'depart', missionIndex: 0, missionCount, results: [] };
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
      return isLast
        ? { ...state, results, step: 'stamp' }
        : { ...state, results, missionIndex: state.missionIndex + 1 };
    }
  }
}
