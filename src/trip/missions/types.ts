import type { Mission, Tier, View } from '../../content/types';
import type { FitFrame, GlobeHandle } from '../../globe/globeHandle';
import type { MissionResult } from '../tripReducer';

export interface MissionProps<M extends Mission> {
  mission: M;
  tier: Tier;
  globe: GlobeHandle;
  /** 장소 화면 (미션에 view가 없을 때 여기로 돌아간다) */
  placeView: View;
  /** 유아 음성: 이 미션의 질문·설명 문장 id (src/voice/lines.ts). 유아가 아니면 null */
  voice: { prompt: string; explain: string | null } | null;
  onDone: (result: MissionResult) => void;
}

export type Outcome = 'correct' | 'revealed' | null;

/** 방향 미션 화면 맞추기: 지도 위 방위표(뒤판 반지름 60px + 기준 이름표)가 화면 가장자리·카드에 잘리지 않게 지점 둘레에 100px을 남기고,
 *  우리나라 안처럼 가까운 두 지점은 방위표와 도착 핀이 붙지 않게 확대 9까지 벌려 보인다 (보통 화면 맞추기는 7까지).
 *  여행 수업의 방향 장면(LessonView)도 같은 틀로 맞춘다 */
export const COMPASS_FRAME: FitFrame = { marginPx: 100, zoomLimit: 9 };
