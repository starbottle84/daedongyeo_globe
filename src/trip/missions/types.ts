import type { Mission, Tier, View } from '../../content/types';
import type { GlobeHandle } from '../../globe/globeHandle';
import type { MissionResult } from '../tripReducer';

export interface MissionProps<M extends Mission> {
  mission: M;
  tier: Tier;
  globe: GlobeHandle;
  /** 장소 화면 (미션에 view가 없을 때 여기로 돌아간다) */
  placeView: View;
  onDone: (result: MissionResult) => void;
}

export type Outcome = 'correct' | 'revealed' | null;
