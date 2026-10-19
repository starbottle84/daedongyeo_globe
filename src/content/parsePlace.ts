import { DIRECTIONS_4, DIRECTIONS_8, type ByTier, type ChoiceOption, type LngLat, type Mission, type Place, type View } from './types';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

// JSON에서 읽은 장소 콘텐츠가 형식에 맞는지 검사하고, 맞으면 Place로 돌려준다.
// 틀린 곳이 있으면 "어느 장소의 어느 칸이 왜 틀렸는지" 알려 주는 오류를 던진다.
export function parsePlace(raw: unknown): Place {
  const id = isObj(raw) && typeof raw.id === 'string' ? raw.id : '(id 없음)';
  const fail = (path: string, why: string): never => {
    throw new Error(`콘텐츠 오류 [${id}] ${path || '(전체)'}: ${why}`);
  };

  const obj = (v: unknown, path: string): Obj => (isObj(v) ? v : fail(path, '객체여야 해요'));
  const str = (v: unknown, path: string): string =>
    typeof v === 'string' && v.trim() !== '' ? v : fail(path, '빈칸이 아닌 글자여야 해요');
  const num = (v: unknown, path: string): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fail(path, '숫자여야 해요');
  const optStr = (v: unknown, path: string): string | undefined => (v === undefined ? undefined : str(v, path));
  // 국기 코드는 두 글자 소문자 (그림이 있는지는 check:content가 본다 — 앱은 없으면 그림만 비운다)
  const optFlag = (v: unknown, path: string): string | undefined => {
    const code = optStr(v, path);
    return code === undefined || /^[a-z]{2}$/.test(code) ? code : fail(path, '국기 코드는 두 글자 소문자여야 해요 (예: jp)');
  };

  const lngLat = (v: unknown, path: string): LngLat => {
    if (!Array.isArray(v) || v.length !== 2) return fail(path, '[경도, 위도] 두 숫자여야 해요');
    const lng = num(v[0], `${path}[0]`);
    const lat = num(v[1], `${path}[1]`);
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return fail(path, '경도 -180~180, 위도 -90~90 범위를 벗어났어요');
    return [lng, lat];
  };

  const optView = (v: unknown, path: string): View | undefined => {
    if (v === undefined) return undefined;
    const o = obj(v, path);
    return { center: lngLat(o.center, `${path}.center`), zoom: num(o.zoom, `${path}.zoom`) };
  };

  const byTier = <T>(v: unknown, path: string, each: (x: unknown, p: string) => T): ByTier<T> => {
    const o = obj(v, path);
    return {
      preschool: each(o.preschool, `${path}.preschool`),
      lower: each(o.lower, `${path}.lower`),
      upper: each(o.upper, `${path}.upper`),
    };
  };

  const mission = (v: unknown, path: string): Mission => {
    const m = obj(v, path);
    const prompt = str(m.prompt, `${path}.prompt`);
    const explain = optStr(m.explain, `${path}.explain`);

    switch (m.type) {
      case 'tap': {
        const area = optStr(m.area, `${path}.area`);
        const country = optStr(m.country, `${path}.country`);
        const radiusKm = m.radiusKm === undefined ? undefined : num(m.radiusKm, `${path}.radiusKm`);
        if ([area, country, radiusKm].filter((v) => v !== undefined).length !== 1) {
          return fail(path, 'area(대륙·대양 이름)·country(나라 이름)·radiusKm(정답 반경) 중 꼭 하나만 있어야 해요');
        }
        return {
          type: 'tap', prompt, explain, area, country, radiusKm,
          targetName: optStr(m.targetName, `${path}.targetName`),
          target: lngLat(m.target, `${path}.target`),
          view: optView(m.view, `${path}.view`),
        };
      }
      case 'choice': {
        const rawOptions = m.options;
        if (!Array.isArray(rawOptions) || rawOptions.length < 2) return fail(`${path}.options`, '보기가 2개 이상이어야 해요');
        const options: ChoiceOption[] = rawOptions.map((o, i) => {
          const oo = obj(o, `${path}.options[${i}]`);
          return {
            label: str(oo.label, `${path}.options[${i}].label`),
            icon: optStr(oo.icon, `${path}.options[${i}].icon`),
            flag: optFlag(oo.flag, `${path}.options[${i}].flag`),
          };
        });
        if (options.some((o) => o.flag) && !options.every((o) => o.flag)) {
          return fail(`${path}.options`, '국기(flag) 보기는 모든 보기에 있거나 하나도 없어야 해요');
        }
        const answer = num(m.answer, `${path}.answer`);
        if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
          return fail(`${path}.answer`, '보기 번호(0부터 시작)가 범위를 벗어났어요');
        }
        return { type: 'choice', prompt, explain, flag: optFlag(m.flag, `${path}.flag`), options, answer };
      }
      case 'pin': {
        const rawStars = m.starsKm;
        if (!Array.isArray(rawStars) || rawStars.length !== 2) return fail(`${path}.starsKm`, '[별 3개 거리, 별 2개 거리] 두 숫자여야 해요');
        const starsKm: [number, number] = [num(rawStars[0], `${path}.starsKm[0]`), num(rawStars[1], `${path}.starsKm[1]`)];
        if (starsKm[0] >= starsKm[1]) return fail(`${path}.starsKm`, '별 3개 거리가 별 2개 거리보다 작아야 해요');
        return {
          type: 'pin', prompt, explain, starsKm,
          targetName: optStr(m.targetName, `${path}.targetName`),
          target: lngLat(m.target, `${path}.target`),
          view: optView(m.view, `${path}.view`),
        };
      }
      case 'direction': {
        const rawCount = m.options;
        const options = rawCount === 4 || rawCount === 8 ? rawCount : fail(`${path}.options`, '4 또는 8이어야 해요');
        const rawAnswer = m.answer;
        const answer = DIRECTIONS_8.find((d) => d === rawAnswer)
          ?? fail(`${path}.answer`, `8방위(${DIRECTIONS_8.join(', ')}) 중 하나여야 해요`);
        if (options === 4 && !DIRECTIONS_4.includes(answer)) {
          return fail(`${path}.answer`, '4방위 문제의 답은 북·동·남·서 중 하나여야 해요');
        }
        return {
          type: 'direction', prompt, explain, options, answer,
          from: lngLat(m.from, `${path}.from`),
          fromName: str(m.fromName, `${path}.fromName`),
          to: lngLat(m.to, `${path}.to`),
          toName: str(m.toName, `${path}.toName`),
        };
      }
      default:
        return fail(`${path}.type`, 'tap, choice, pin, direction 중 하나여야 해요');
    }
  };

  const missions = (v: unknown, path: string): Mission[] => {
    if (!Array.isArray(v) || v.length === 0) return fail(path, '미션이 1개 이상 있어야 해요');
    return v.map((m, i) => mission(m, `${path}[${i}]`));
  };

  const p = obj(raw, '');
  const stage = num(p.stage, 'stage');
  if (!Number.isInteger(stage) || stage < 1 || stage > 5) fail('stage', '1~5 사이 정수여야 해요');

  return {
    id: str(p.id, 'id'),
    stage,
    name: str(p.name, 'name'),
    center: lngLat(p.center, 'center'),
    zoom: num(p.zoom, 'zoom'),
    intro: byTier(p.intro, 'intro', str),
    story: byTier(p.story, 'story', str),
    missions: byTier(p.missions, 'missions', missions),
    familyTalk: byTier(p.familyTalk, 'familyTalk', str),
    parentNote: str(p.parentNote, 'parentNote'),
  };
}
