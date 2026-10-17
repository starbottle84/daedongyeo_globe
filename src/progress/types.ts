import type { Tier } from '../content/types';

/** 저장 형식 버전. 형식을 바꾸면 올리고 storage.ts의 normalize에 옛 형식 처리를 더한다 */
export const SAVE_VERSION = 1;

export type AvatarColor = 'sky' | 'leaf' | 'sun' | 'rose';
export const AVATAR_COLORS: AvatarColor[] = ['sky', 'leaf', 'sun', 'rose'];
export const AVATAR_LABELS: Record<AvatarColor, string> = { sky: '하늘색', leaf: '숲색', sun: '햇살색', rose: '꽃색' };

export interface Profile {
  id: string;
  /** 부모가 입력한 이름이나 별명 (1~10자) */
  name: string;
  tier: Tier;
  color: AvatarColor;
  /** 만든 날 (지역 날짜 YYYY-MM-DD) */
  createdAt: string;
}

export interface StampRecord {
  /** 처음 도장을 받은 날 (지역 날짜) — 다시 와도 바꾸지 않는다 */
  firstDate: string;
  lastDate: string;
  visits: number;
  /** 고학년 위치 찍기 최고 별 합 (0이면 별 없음) */
  bestStars: number;
}

export interface ProfileProgress {
  /** 장소 id → 도장 */
  stamps: Record<string, StampRecord>;
  /** 열린 단계 (오름차순, 1은 늘 들어 있음). 한 번 열리면 지우지 않는다 */
  unlockedStages: number[];
}

export interface SaveData {
  version: number;
  activeProfileId: string | null;
  profiles: Profile[];
  /** 프로필 id → 진행 */
  progress: Record<string, ProfileProgress>;
}

/** 도장을 저장한 결과 — 도장 카드에서 보여 준다 */
export interface StampOutcome {
  isNew: boolean;
  firstDate: string;
  bestStars: number;
  /** 이번 별이 앞선 최고 기록보다 많은지 (처음 받은 도장이면 별이 1개 이상일 때) — 도장 카드의 '최고 기록!' */
  newBest: boolean;
  /** 이번 도장으로 새로 열린 단계 */
  newlyUnlocked: number[];
}
