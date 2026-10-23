import data from './capitals.json';
import type { LngLat } from './types';

// 나라 수도 퀴즈 데이터 (계획 8). capitals.json은 scripts/build-capitals.mjs가 만들고 npm run check:content가 검사한다.
// 앱이 켜질 때 형식을 한 번 더 본다 — 틀린 칸이 있으면 어느 나라 어느 칸인지 알려 주는 오류를 던진다 (parsePlace와 같다)

export type Region = 'asia' | 'europe' | 'africa' | 'north-america' | 'south-america' | 'oceania';
export const REGIONS: Region[] = ['asia', 'europe', 'africa', 'north-america', 'south-america', 'oceania'];
export const REGION_NAMES: Record<Region, string> = {
  asia: '아시아', europe: '유럽', africa: '아프리카', 'north-america': '북아메리카', 'south-america': '남아메리카', oceania: '오세아니아',
};

export interface QuizCountry {
  /** ISO 3166-1 두 글자 소문자 — 국기 그림 이름이자 퀴즈 기록의 열쇠 */
  code: string;
  /** countries.geojson의 id (지구본에서 땅 칠하기) */
  iso3: string;
  country: string;
  capital: string;
  capitalAt: LngLat;
  region: Region;
  /** 1 누구나 아는 나라 · 2 교과서에 자주 나오는 나라 · 3 나머지 */
  level: 1 | 2 | 3;
  /** 카메라를 맞출 [남서, 북동] — 날짜변경선을 넘는 나라는 경도가 180을 넘는다 */
  focus: [LngLat, LngLat];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function parseCountry(raw: unknown, i: number): QuizCountry {
  const fail = (why: string): never => {
    throw new Error(`수도 퀴즈 데이터 오류 [${i}${isObj(raw) && typeof raw.code === 'string' ? ` ${raw.code}` : ''}]: ${why}`);
  };
  if (!isObj(raw)) return fail('객체여야 해요');
  const str = (k: string) => (typeof raw[k] === 'string' && (raw[k] as string).trim() !== '' ? (raw[k] as string) : fail(`${k}는 빈칸이 아닌 글자여야 해요`));
  const point = (v: unknown, k: string): LngLat => {
    if (!Array.isArray(v) || v.length !== 2 || !v.every((n) => typeof n === 'number' && Number.isFinite(n))) return fail(`${k}는 [경도, 위도]여야 해요`);
    return [v[0] as number, v[1] as number];
  };
  const region = str('region');
  if (!REGIONS.includes(region as Region)) fail(`region은 ${REGIONS.join('·')} 중 하나여야 해요`);
  const level = raw.level;
  if (level !== 1 && level !== 2 && level !== 3) fail('level은 1·2·3 중 하나여야 해요');
  const focus = raw.focus;
  if (!Array.isArray(focus) || focus.length !== 2) fail('focus는 [남서, 북동] 두 점이어야 해요');
  return {
    code: str('code'),
    iso3: str('iso3'),
    country: str('country'),
    capital: str('capital'),
    capitalAt: point(raw.capitalAt, 'capitalAt'),
    region: region as Region,
    level: level as 1 | 2 | 3,
    focus: [point((focus as unknown[])[0], 'focus[0]'), point((focus as unknown[])[1], 'focus[1]')],
  };
}

export const QUIZ_COUNTRIES: QuizCountry[] = (isObj(data) && Array.isArray(data.countries) ? data.countries : []).map(parseCountry);
