// 유아 음성 문장 목록 (계획 4 작업 6, D8·D9)
// 앱(재생할 문장 고르기)과 scripts/voice-lines.ts(녹음 대본용 lines.json)가 같이 쓴다 — 그래서 브라우저·Node 어느 쪽 기능도 쓰지 않는다.
// id 규칙: <장소id>.<칸>[.<번호>]-<문장 해시>, 공통 말은 common.<이름>-<문장 해시>. 녹음 파일 이름은 <id>.mp3.
// 문장이 바뀌면 해시가 바뀌어 파일 이름도 바뀐다 — 옛 녹음이 새 글과 다른 말을 하지 않는다 (voice:script가 옛 파일을 알려 준다).
import { STAGE_NAMES, type Place } from '../content/types';

/** 녹음 대본의 '상황' 칸 */
export type VoiceSituation = '출발' | '둘러보기' | '미션 질문' | '정답 설명' | '함께 이야기' | '도장' | '다음 장소' | '결과' | '힌트' | '단계 열림';

export interface VoiceLine {
  id: string;
  text: string;
  /** 장소 이름. 공통 말은 null */
  place: string | null;
  situation: VoiceSituation;
}

// FNV-1a 32비트 해시 → 16진수 6자리. 문장이 같으면 브라우저·Node 어디서나 같은 값이다
function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

const lineId = (key: string, text: string) => `${key}-${hashText(text)}`;

// 받침이 있으면 '이', 없으면 '가' (StampCard와 같다)
const subjectJosa = (word: string) => ((word.charCodeAt(word.length - 1) - 0xac00) % 28 > 0 ? '이' : '가');

/** 공통 말: 화면에 보이는 글과 같은 문장이다 (MissionFeedback·useTries·TapMission·StampCard) */
const COMMON_TEXT = {
  correct: '잘했어요!',
  soft: '괜찮아요, 같이 알아봐요',
  hint: '반짝이는 걸 눌러 봐!',
  hintTap: '반짝이는 곳을 눌러 봐!',
  revisit: '또 왔어요! 도장은 그대로예요',
};
const COMMON_SITUATION: Record<keyof typeof COMMON_TEXT, VoiceSituation> = {
  correct: '결과', soft: '결과', hint: '힌트', hintTap: '힌트', revisit: '도장',
};
export const COMMON_VOICE = Object.fromEntries(
  Object.entries(COMMON_TEXT).map(([key, text]) => [key, lineId(`common.${key}`, text)]),
) as Record<keyof typeof COMMON_TEXT, string>;

const unlockText = (stage: number) => {
  const name = STAGE_NAMES[stage] ?? '';
  return `${stage}단계, ${name}${subjectJosa(name)} 열렸어요!`;
};
/** 도장으로 새 단계가 열렸을 때 하는 말 */
export const unlockVoice = (stage: number) => lineId(`common.unlock.${stage}`, unlockText(stage));

const stampText = (place: Place) => `${place.name} 도장을 받았어요!`;
const nextText = (place: Place) => `다음엔 ${place.name}에 가 볼까요?`;
/** 도장 카드의 '다음엔 ○○에 가 볼까요?' — 가 볼 곳(place)의 이름이 들어간다 */
export const nextVoice = (place: Place) => lineId(`${place.id}.next`, nextText(place));

/** 장소 하나의 유아 문장 id. 미션 설명이 없는 미션은 explain이 null이다 */
export interface PlaceVoice {
  intro: string;
  story: string;
  missions: { prompt: string; explain: string | null }[];
  talk: string;
  stamp: string;
}

export function placeVoice(place: Place): PlaceVoice {
  return {
    intro: lineId(`${place.id}.intro`, place.intro.preschool),
    story: lineId(`${place.id}.story`, place.story.preschool),
    missions: place.missions.preschool.map((m, i) => ({
      prompt: lineId(`${place.id}.prompt.${i + 1}`, m.prompt),
      explain: m.explain ? lineId(`${place.id}.explain.${i + 1}`, m.explain) : null,
    })),
    talk: lineId(`${place.id}.talk`, place.familyTalk.preschool),
    stamp: lineId(`${place.id}.stamp`, stampText(place)),
  };
}

/** 녹음할 문장 전체: 장소 순서대로(출발 → 둘러보기 → 미션 → 도장 → 함께 이야기 → 다음 장소), 그다음 공통 말 */
export function voiceLines(places: Place[]): VoiceLine[] {
  const lines: VoiceLine[] = [];
  for (const place of places) {
    const v = placeVoice(place);
    const add = (id: string, text: string, situation: VoiceSituation) => lines.push({ id, text, place: place.name, situation });
    add(v.intro, place.intro.preschool, '출발');
    add(v.story, place.story.preschool, '둘러보기');
    place.missions.preschool.forEach((m, i) => {
      const { prompt, explain } = v.missions[i];
      add(prompt, m.prompt, '미션 질문');
      if (m.explain && explain) add(explain, m.explain, '정답 설명');
    });
    add(v.stamp, stampText(place), '도장');
    add(v.talk, place.familyTalk.preschool, '함께 이야기');
    add(nextVoice(place), nextText(place), '다음 장소');
  }
  for (const key of Object.keys(COMMON_TEXT) as (keyof typeof COMMON_TEXT)[]) {
    lines.push({ id: COMMON_VOICE[key], text: COMMON_TEXT[key], place: null, situation: COMMON_SITUATION[key] });
  }
  // 1단계는 처음부터 열려 있으니 2단계부터
  const stages = [...new Set(places.map((p) => p.stage))].sort((a, b) => a - b).slice(1);
  for (const stage of stages) lines.push({ id: unlockVoice(stage), text: unlockText(stage), place: null, situation: '단계 열림' });
  return lines;
}
