import type { QuizCountry, Region } from '../content/capitals';
import type { LngLat, Mission, Tier, View } from '../content/types';
import type { QuizRecord } from '../progress/types';

// 나라 퀴즈 한 판의 문제 고르기·만들기 (계획 8 D6~D10). 화면·저장과 떨어진 순수 함수다 — 무작위는 rand로 받는다.

/** 이만큼 맞히면 도감에 스티커가 붙는다 */
export const MASTERED = 2;
/** 한 판 문제 수 */
export const ROUND_SIZE: Record<Tier, number> = { preschool: 5, lower: 10, upper: 10 };

export type QuizRegion = Region | 'all';
/** capital: 이 나라의 수도는? · country: 이 수도는 어느 나라? · pin: 수도 자리 찍기 · flag: 칠한 나라의 국기 고르기(유아) */
export type QuestionKind = 'capital' | 'country' | 'pin' | 'flag';

export interface QuizQuestion {
  country: QuizCountry;
  kind: QuestionKind;
  mission: Mission;
  /** 카메라를 맞출 화면 (위치 찍기 시작 화면이기도 하다) */
  view: View;
}

export const isMastered = (rec: QuizRecord | undefined) => (rec?.right ?? 0) >= MASTERED;

const shuffle = <T,>(list: T[], rand: () => number): T[] => {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** 이번 판에 낼 나라: 틀린 나라(다시 보기) → 안 푼 나라(쉬운 단계부터) → 풀었지만 아직 스티커 없는 나라 → 스티커 붙은 나라(오래전에 푼 것부터).
 *  유아·저학년은 1·2단계 나라부터 내고, 그 나라들에 스티커가 다 붙으면 3단계도 낸다 */
export function pickCountries(pool: QuizCountry[], records: Record<string, QuizRecord>, tier: Tier, rand: () => number): QuizCountry[] {
  const count = ROUND_SIZE[tier];
  const easy = pool.filter((c) => c.level <= 2);
  const eligible = tier === 'upper' || easy.length === 0 || easy.every((c) => isMastered(records[c.code])) ? pool : easy;
  const order = (list: QuizCountry[]) => {
    const mixed = shuffle(list, rand);
    const review = mixed.filter((c) => records[c.code] && !isMastered(records[c.code]) && records[c.code].wrong > 0)
      .sort((a, b) => (records[b.code].wrong - records[b.code].right) - (records[a.code].wrong - records[a.code].right));
    const fresh = mixed.filter((c) => !records[c.code]).sort((a, b) => a.level - b.level);
    const trying = mixed.filter((c) => records[c.code] && !isMastered(records[c.code]) && records[c.code].wrong === 0);
    const done = mixed.filter((c) => isMastered(records[c.code])).sort((a, b) => records[a.code].last.localeCompare(records[b.code].last));
    return [...review, ...fresh, ...trying, ...done];
  };
  // 쉬운 나라가 한 판보다 적은 대륙(오세아니아 등)은 나머지 나라로 채운다 — 한 판이 서너 문제로 끝나지 않게
  const rest = eligible === pool ? [] : pool.filter((c) => !eligible.includes(c));
  return shuffle([...order(eligible), ...order(rest)].slice(0, count), rand);
}

// 받침이 있으면 true (한글이 아닌 글자로 끝나면 받침 없음으로 본다 — 'D.C.'는 '디시'로 읽힌다)
const hasBatchim = (word: string) => {
  const code = word.charCodeAt(word.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 > 0;
};
const topic = (w: string) => (hasBatchim(w) ? '은' : '는');
const object = (w: string) => (hasBatchim(w) ? '을' : '를');
export const copula = (w: string) => (hasBatchim(w) ? '이에요' : '예요');

const rad = (d: number) => (d * Math.PI) / 180;
const distanceKm = ([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) => {
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 그 나라와 둘레가 보이는 화면. 아주 작은 나라도 둘레 나라가 보이게 넓이를 6° 아래로는 줄이지 않는다 */
export function countryView(c: QuizCountry): View {
  const [[w, s], [e, n]] = c.focus;
  const box: LngLat = [(w + e) / 2, (s + n) / 2];
  const spanDeg = Math.max(6, e - w, (n - s) * 1.3);
  // 지구본 반지름(px) = 512·2^zoom/(2π)/cos(위도). 넓이의 반이 화면에서 약 150px이 되게 고른다
  const half = rad(Math.min(spanDeg, 170) / 2);
  const zoom = Math.log2(((150 / Math.sin(half)) * 2 * Math.PI * Math.cos(rad(box[1]))) / 512);
  // 나라가 화면에 다 들어가지 않을 만큼 크면(러시아 등 — 가장 작게 줄여도 넘친다) 가운데를 수도 쪽으로 반쯤 옮긴다.
  // 상자 가운데에 맞추면 폰 세로 화면에서 모스크바가 왼쪽 끝에 걸려 잘린다. 날짜변경선을 넘는 경도 차이는 감싸서 잰다
  const dLng = ((c.capitalAt[0] - box[0] + 540) % 360) - 180;
  const center: LngLat = zoom < MIN_VIEW_ZOOM ? [box[0] + dLng / 2, (box[1] + c.capitalAt[1]) / 2] : box;
  return { center: [((center[0] + 540) % 360) - 180, center[1]], zoom: clamp(zoom, MIN_VIEW_ZOOM, 6) };
}
const MIN_VIEW_ZOOM = 1.2;

// 다른 대륙에 있어도 거의 똑같아 보이는 국기 묶음 — 유아 국기 퀴즈에서 같은 묶음끼리는 보기로 함께 내지 않는다
const LOOKALIKE_FLAGS = [
  ['mc', 'id', 'pl'], ['td', 'ro', 'ad', 'md'], ['ci', 'ie', 'it', 'mx'], ['eg', 'iq', 'sy', 'ye'], ['ne', 'in'], ['tr', 'tn'], ['pk', 'dz'],
  ['ma', 'vn'], ['gb', 'au', 'nz', 'fj', 'tv'], ['us', 'lr', 'my'], ['nl', 'lu', 'py', 'hr'], ['at', 'lv', 'lb', 'pe'], ['gh', 'bo', 'lt', 'et'],
  ['ru', 'si', 'sk', 'rs'], ['jp', 'bd', 'pw'], ['sn', 'ml', 'gn', 'cm'], ['ve', 'co', 'ec'], ['kw', 'ae', 'jo', 'sd'],
];
const lookalikes = (code: string) => new Set(LOOKALIKE_FLAGS.filter((g) => g.includes(code)).flat());

// 같은 대륙에서 오답 보기를 고른다. 저학년·유아는 1·2단계 나라 이름·수도로 (모르는 이름만 늘어놓으면 찍기가 된다)
function distractors(c: QuizCountry, all: QuizCountry[], tier: Tier, n: number, rand: () => number, otherRegion = false): QuizCountry[] {
  const avoid = otherRegion ? lookalikes(c.code) : new Set<string>();
  const others = all.filter((o) => o.code !== c.code && !avoid.has(o.code) && (otherRegion ? o.region !== c.region : o.region === c.region));
  const easy = others.filter((o) => o.level <= 2);
  const from = tier !== 'upper' && easy.length >= n ? easy : others;
  return shuffle(from, rand).slice(0, n);
}

function capitalQuestion(c: QuizCountry, all: QuizCountry[], tier: Tier, rand: () => number): Mission {
  const choices = shuffle([c, ...distractors(c, all, tier, tier === 'upper' ? 3 : 2, rand)], rand);
  return {
    type: 'choice',
    prompt: `${c.country}의 수도는 어디일까${tier === 'upper' ? '요' : ''}?`,
    flag: c.code,
    options: choices.map((o) => ({ label: o.capital })),
    answer: choices.indexOf(c),
    explain: `${c.country}의 수도는 ${c.capital}${copula(c.capital)}.`,
  };
}

// 거꾸로 묻기: 국기를 보이면 답이 되므로 국기 없이, 지도에는 수도 자리만 보인다 (QuizPanel이 지명을 숨긴다)
function countryQuestion(c: QuizCountry, all: QuizCountry[], tier: Tier, rand: () => number): Mission {
  const choices = shuffle([c, ...distractors(c, all, tier, 3, rand)], rand);
  return {
    type: 'choice',
    prompt: `지도에 표시한 ${c.capital}${topic(c.capital)} 어느 나라의 수도일까요?`,
    options: choices.map((o) => ({ label: o.country })),
    answer: choices.indexOf(c),
    explain: `${c.capital}${topic(c.capital)} ${c.country}의 수도예요.`,
  };
}

// 수도 자리 찍기: 별 거리는 나라 크기에 맞춘다 (큰 나라는 넉넉하게, 작은 나라는 좁게)
function pinQuestion(c: QuizCountry, view: View): Mission {
  const sizeKm = distanceKm(c.focus[0], c.focus[1]);
  return {
    type: 'pin',
    prompt: `${c.country}의 수도 ${c.capital}${object(c.capital)} 지구본에 찍어 보세요!`,
    targetName: c.capital,
    target: c.capitalAt,
    starsKm: [Math.round(clamp(sizeKm * 0.1, 30, 250)), Math.round(clamp(sizeKm * 0.3, 90, 700))],
    view,
    explain: `${c.capital}${topic(c.capital)} ${c.country}의 수도예요.`,
  };
}

// 유아: 지구본에 칠한 나라의 국기를 그림 2개 중에서 고른다. 오답 국기는 다른 대륙 나라에서 (같은 대륙은 국기가 닮은 곳이 많다)
function flagQuestion(c: QuizCountry, all: QuizCountry[], rand: () => number): Mission {
  const choices = shuffle([c, ...distractors(c, all, 'preschool', 1, rand, true)], rand);
  return {
    type: 'choice',
    prompt: '반짝이는 나라의 국기를 찾아 봐!',
    options: choices.map((o) => ({ label: o.country, flag: o.code })),
    answer: choices.indexOf(c),
    explain: `${c.country} 국기예요.`,
  };
}

// 수도 이름과 나라 이름이 닮으면(싱가포르·쿠웨이트시·알제·튀니스·브라질리아·비사우·산살바도르 등) 거꾸로 묻기는 답이 뻔하다:
// 앞 두 글자가 같거나, 세 글자 넘게 겹치는 부분이 있거나, 소리가 닮은 나라(코모로-모로니)
const NAME_HINT = new Set(['km']);
const nameAlike = (c: QuizCountry) => {
  const a = c.capital.replace(/\s/g, '');
  const b = c.country.replace(/\s/g, '');
  if (NAME_HINT.has(c.code) || a.slice(0, 2) === b.slice(0, 2)) return true;
  for (let i = 0; i + 3 <= a.length; i++) if (b.includes(a.slice(i, i + 3))) return true;
  return false;
};

/** 고른 나라로 이번 판 문제를 만든다. 고학년은 열에 여섯은 수도 고르기, 둘은 거꾸로 묻기, 둘은 수도 자리 찍기
 *  (이름이 닮은 나라는 거꾸로 묻지 않고 수도 고르기로 낸다) */
export function buildQuestions(countries: QuizCountry[], all: QuizCountry[], tier: Tier, rand: () => number): QuizQuestion[] {
  const upperKinds = shuffle<QuestionKind>(
    Array.from({ length: countries.length }, (_, i) => (i % 5 === 3 ? 'country' : i % 5 === 4 ? 'pin' : 'capital')),
    rand,
  );
  return countries.map((c, i) => {
    const upperKind = upperKinds[i] === 'country' && nameAlike(c) ? 'capital' : upperKinds[i];
    const kind: QuestionKind = tier === 'preschool' ? 'flag' : tier === 'upper' ? upperKind : 'capital';
    const view = countryView(c);
    const mission = kind === 'flag' ? flagQuestion(c, all, rand)
      : kind === 'country' ? countryQuestion(c, all, tier, rand)
        : kind === 'pin' ? pinQuestion(c, view)
          : capitalQuestion(c, all, tier, rand);
    return { country: c, kind, mission, view };
  });
}
