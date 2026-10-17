// 여행 콘텐츠(장소·이야기·미션)의 형식

export type Tier = 'preschool' | 'lower' | 'upper';
export const TIERS: Tier[] = ['preschool', 'lower', 'upper'];
export const TIER_LABELS: Record<Tier, string> = { preschool: '유아', lower: '저학년', upper: '고학년' };

/** 탐험 5단계 이름 (설계 문서 2026-10-16-globe-geography-design) */
export const STAGE_NAMES: Record<number, string> = {
  1: '둥근 지구', 2: '우리나라', 3: '이웃 나라', 4: '세계 대륙', 5: '지구 탐험가',
};

export type ByTier<T> = Record<Tier, T>;

/** [경도, 위도] */
export type LngLat = [number, number];

export interface View {
  center: LngLat;
  zoom: number;
}

// 8방위. 교과서의 "동남쪽"은 "남동"과 같은 방향이다.
export type Direction = '북' | '북동' | '동' | '남동' | '남' | '남서' | '서' | '북서';
export const DIRECTIONS_4: Direction[] = ['북', '동', '남', '서'];
export const DIRECTIONS_8: Direction[] = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];

export interface ChoiceOption {
  label: string;
  /** 글을 못 읽는 유아용 그림 대신 쓰는 이모지 */
  icon?: string;
}

export type Mission =
  | {
      type: 'tap';
      prompt: string;
      /** 찾을 곳 이름 (부모님 공간 정답 줄 '지도에서 OO'). 장소와 다를 때가 있다 (독도 여행의 울릉도 등) */
      targetName?: string;
      /** 힌트·정답 핀을 꽂을 위치 */
      target: LngLat;
      /** 대륙·대양 이름(area-hit 층). 있으면 그 영역 안을 누르면 정답 */
      area?: string;
      /** area가 없을 때: target에서 이 거리(km) 안을 누르면 정답 */
      radiusKm?: number;
      /** 미션 시작 때 보여 줄 화면 (없으면 장소 화면) */
      view?: View;
      explain?: string;
    }
  | { type: 'choice'; prompt: string; options: ChoiceOption[]; answer: number; explain?: string }
  | {
      type: 'pin';
      prompt: string;
      /** 찾을 곳 이름 (부모님 공간 정답 줄 '지도에서 OO') */
      targetName?: string;
      target: LngLat;
      /** [별 3개 거리, 별 2개 거리](km). 그보다 멀면 별 1개 */
      starsKm: [number, number];
      view?: View;
      explain?: string;
    }
  | {
      type: 'direction';
      prompt: string;
      from: LngLat;
      fromName: string;
      to: LngLat;
      toName: string;
      options: 4 | 8;
      answer: Direction;
      explain?: string;
    };

export type MissionOf<T extends Mission['type']> = Extract<Mission, { type: T }>;

export interface Place {
  id: string;
  /** 탐험 단계 1~5 */
  stage: number;
  name: string;
  center: LngLat;
  zoom: number;
  intro: ByTier<string>;
  story: ByTier<string>;
  missions: ByTier<Mission[]>;
  familyTalk: ByTier<string>;
  parentNote: string;
}
