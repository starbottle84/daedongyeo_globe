// 콘텐츠 검사 (계획 4 작업 1, 계획 5 작업 2에서 문제 묶음 검사로 바꿈)
// src/content/places/*.json을 앱과 같은 parsePlace로 형식 검사하고, 그 위에 내용(묶음 크기·종류·겹침·보기·정답 분포·영역·방위·좌표)을 확인한다.
// 막아야 하는 것은 '오류'(종료 코드 1), 기준 밖이지만 막지 않는 것은 '알림'으로 나눠 표로 보여 준다.
// 실행: npm run check:content                      (모든 장소 + index.ts의 PLACES 목록)
//       npm run check:content -- --only europe,africa (그 파일들만. 아직 index.ts에 넣지 않은 새 파일도 된다)
import { readFileSync, readdirSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DIRECTIONS_4, DIRECTIONS_8, STAGE_NAMES, TIERS, TIER_LABELS,
  type Direction, type LngLat, type Mission, type Place, type Tier, type View,
} from '../src/content/types.ts';

// 앱 코드는 Vite 방식으로 확장자 없이 import하고('./types'), JSON도 import 속성 없이 불러온다.
// Node는 그대로 읽지 못하므로, 이 스크립트에서만 확장자 없는 상대 경로에 .ts를 붙이고 JSON은 기본 내보내기 모듈로 바꿔 읽는다.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.endsWith('.json')) return nextLoad(url, context);
    return { format: 'module', source: `export default ${readFileSync(fileURLToPath(url), 'utf8')};`, shortCircuit: true };
  },
});
const { parsePlace } = await import('../src/content/parsePlace.ts');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLACES_DIR = join(ROOT, 'src/content/places');

type Level = '오류' | '알림';
type MissionType = Mission['type'];
interface Finding { level: Level; place: string; where: string; message: string }
const findings: Finding[] = [];
const report = (level: Level, place: string, where: string, message: string) => findings.push({ level, place, where, message });
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const pct = (n: number, total: number) => `${Math.round((n / total) * 100)}%`;
const len = (s: string) => [...s].length;

/** 유아 한 문장 글자 수 기준 (넘으면 알림) */
const PRESCHOOL_SENTENCE_MAX = 40;
/** 저학년·고학년 이야기(story) 글자 수 기준 (넘으면 알림) */
const STORY_MAX = 120;
/** 문제 묶음 크기: 장소·구간마다 (계획 5 D1) */
const POOL_SIZE: Record<Tier, number> = { preschool: 8, lower: 12, upper: 12 };
/** 묶음 안 종류별 최소 개수 (계획 5 D5). 여기 없는 종류는 그 구간에 넣지 않는다 */
const POOL_MIN: Record<Tier, Partial<Record<MissionType, number>>> = {
  preschool: { tap: 2, choice: 4 },
  lower: { tap: 3, direction: 3, choice: 4 },
  upper: { pin: 3, direction: 3, choice: 4 },
};
const TYPE_LABELS: Record<MissionType, string> = { tap: '찾아 누르기', choice: '고르기', pin: '위치 찍기', direction: '방향' };
/** 고르기 보기 수 (계획 4 D2) */
const CHOICE_OPTIONS: Record<Tier, number> = { preschool: 2, lower: 3, upper: 4 };
/** 방향 문제 방위 수: 저학년 4방위, 고학년 8방위 (계획 4 D2) */
const DIRECTION_OPTIONS: Partial<Record<Tier, 4 | 8>> = { lower: 4, upper: 8 };
/** 고르기 정답이 한 번호에 이 비율을 넘게 몰리면 알림 */
const ANSWER_SHARE_MAX = 0.6;
/** 찾아 누르기 반경(radiusKm) 최솟값. 장소 화면(place.zoom) 기준이다 */
const RADIUS_MIN_KM: Partial<Record<Tier, number>> = { preschool: 50, lower: 20 };
/** 방위 경계에서 이만큼(°) 안이면 알림. 대권과 평면 지도 둘 다 본다 — 경계 가까운 문제는 어른도 헷갈린다 */
const DIRECTION_EDGE_DEG = 10;
/** 위치 찍기 view: 폰(390×844)에서 아래 카드(50%)에 가리지 않는 지도 영역의 반폭·반높이(px), 가장자리로 볼 폭(px) */
const PHONE_HALF_W = 195;
const PHONE_HALF_H = 211;
const VIEW_EDGE_PX = 30;
/** 지도 타일은 위도 ±85.05°까지라 그 너머를 누르면 앱이 남극·북극해로 본다 (globeHandle onTap과 같음) */
const TILE_MAX_LAT = 85.05;

// ── 지구 계산 ──────────────────────────────────────────────
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

// from에서 to로 가는 대권(지구 표면의 가장 짧은 길)의 처음 방위각. 북 0°, 동 90°
function bearingDeg([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLng = rad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(dLng);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

// 평면 지도(메르카토르)에서 from과 to를 곧게 이은 선의 방위각. 북 0°, 동 90°.
// 우리나라처럼 가까이 확대한 화면은 평면 지도처럼 보여서, 아이는 이 각도로 방향을 읽는다
function flatBearingDeg([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLng = ((lng2 - lng1 + 540) % 360) - 180;
  const psi = (lat: number) => Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2));
  return (deg(Math.atan2(rad(dLng), psi(lat2) - psi(lat1))) + 360) % 360;
}

// 방위각을 4방위·8방위로 나눈 이름과, 가장 가까운 경계까지 남은 각도
function toDirection(bearing: number, count: 4 | 8): { dir: Direction; toEdge: number } {
  const step = 360 / count;
  const k = Math.round(bearing / step);
  return { dir: (count === 8 ? DIRECTIONS_8 : DIRECTIONS_4)[k % count], toEdge: step / 2 - Math.abs(bearing - k * step) };
}

// view 화면에서 지점이 가운데로부터 몇 px 떨어져 보이는지(오른쪽·위가 +). 지구본 정사영 근사이고,
// 지구본 반지름은 globeHandle zoomToFit과 같은 식이다. 지구 뒤쪽이라 안 보이면 null
function screenOffset(view: View, [lng, lat]: LngLat): { x: number; y: number } | null {
  const [lng0, lat0] = view.center;
  const dLng = rad(lng - lng0);
  const cosC = Math.sin(rad(lat0)) * Math.sin(rad(lat)) + Math.cos(rad(lat0)) * Math.cos(rad(lat)) * Math.cos(dLng);
  if (cosC <= 0) return null;
  const radiusPx = (512 * 2 ** view.zoom) / (2 * Math.PI * Math.cos(rad(lat0)));
  return {
    x: radiusPx * Math.cos(rad(lat)) * Math.sin(dLng),
    y: radiusPx * (Math.cos(rad(lat0)) * Math.sin(rad(lat)) - Math.sin(rad(lat0)) * Math.cos(rad(lat)) * Math.cos(dLng)),
  };
}

// ── 대륙·대양 영역 (지도의 area-hit 층과 같은 파일) ─────────────────
interface AreaFeature { properties: { ko: string }; geometry: { coordinates: number[][][][] } }
const areaFeatures = (JSON.parse(readFileSync(join(ROOT, 'public/data/areas.geojson'), 'utf8')) as { features: AreaFeature[] }).features;
const areaNames = new Set(areaFeatures.map((f) => f.properties.ko));

// 짝홀 규칙 점-다각형 판정. 다각형은 [바깥 고리, 구멍...]이라 바깥 안이고 구멍 밖이면 안이다
function inRing([x, y]: LngLat, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inPolygon = (pt: LngLat, polygon: number[][][]) => inRing(pt, polygon[0]) && !polygon.slice(1).some((hole) => inRing(pt, hole));

// ── 나라 (지도의 country-fill 층과 같은 파일) ─────────────────────
interface CountryFeature { properties: { ko: string }; geometry: { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] } }
const countryFeatures = (JSON.parse(readFileSync(join(ROOT, 'public/data/countries.geojson'), 'utf8')) as { features: CountryFeature[] }).features;
const countryNames = new Set(countryFeatures.map((f) => f.properties.ko));
const countryPolygons = (f: CountryFeature) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
// 그 자리를 누르면 나올 수 있는 나라 이름들 (지도 타일은 위도 ±85.05°까지라 그 너머는 나라 판정이 없다)
function countriesAt(pt: LngLat): string[] {
  if (Math.abs(pt[1]) >= TILE_MAX_LAT) return [];
  return countryFeatures.filter((f) => countryPolygons(f).some((polygon) => inPolygon(pt, polygon))).map((f) => f.properties.ko);
}
// 나라 넓이를 같은 넓이 원의 반지름(km)으로. 고리마다 평균 위도에서 경도를 줄여 잰 어림값이다 (작은 나라를 거르는 데만 쓴다)
function countryRadiusKm(name: string): number {
  const ringArea = (ring: number[][]) => {
    const lat0 = rad(ring.reduce((s, [, y]) => s + y, 0) / ring.length);
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      a += ring[j][0] * 111.32 * Math.cos(lat0) * ring[i][1] * 110.57 - ring[i][0] * 111.32 * Math.cos(lat0) * ring[j][1] * 110.57;
    }
    return Math.abs(a) / 2;
  };
  const area = countryFeatures.filter((f) => f.properties.ko === name)
    .flatMap(countryPolygons)
    .reduce((s, [outer, ...holes]) => s + ringArea(outer) - holes.reduce((h, ring) => h + ringArea(ring), 0), 0);
  return Math.sqrt(area / Math.PI);
}

// ── 국기 그림 (src/assets/flags, Flag.tsx) ──────────────────────
const flagCodes = new Set(readdirSync(join(ROOT, 'src/assets/flags')).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)));

// 그 자리를 누르면 나올 수 있는 영역 이름들
function areasAt(pt: LngLat): string[] {
  if (pt[1] <= -TILE_MAX_LAT) return ['남극'];
  if (pt[1] >= TILE_MAX_LAT) return ['북극해'];
  const hits = areaFeatures.filter((f) => f.geometry.coordinates.some((polygon) => inPolygon(pt, polygon)));
  return [...new Set(hits.map((f) => f.properties.ko))];
}

// ── 장소 하나 검사 ───────────────────────────────────────────
const sentences = (text: string) => text.split(/(?<=[.!?~])\s+/).map((s) => s.trim()).filter(Boolean);
const countTypes = (missions: Mission[]) => {
  const n: Record<MissionType, number> = { tap: 0, choice: 0, pin: 0, direction: 0 };
  for (const m of missions) n[m.type]++;
  return n;
};
const countText = (n: Record<MissionType, number>) =>
  (Object.keys(n) as MissionType[]).filter((t) => n[t]).map((t) => `${TYPE_LABELS[t]} ${n[t]}`).join(' · ') || '없음';

// 겹침을 볼 열쇠. 띄어쓰기·문장 부호만 다른 같은 질문도 잡는다.
// 같은 장소·구간 안에서 질문, 고르기의 정답+보기 묶음, 방향의 출발·도착이 같으면 오류(여행에서 같은 문제가 두 번 나온다),
// 찾아 누르기·위치 찍기의 찾을 곳이 같으면 알림(질문이 다르면 괜찮을 수 있다). cross는 다른 장소(같은 구간)와도 비교할지
interface DupKey { key: string; level: Level; what: string; cross: boolean }
const promptKey = (text: string) => text.replace(/[\s\p{P}\p{S}]/gu, '');
function dupKeys(m: Mission, p: Place): DupKey[] {
  const keys: DupKey[] = [{ key: `질문:${promptKey(m.prompt)}`, level: '오류', what: '질문', cross: true }];
  if (m.type === 'choice') {
    const set = m.options.map((o) => o.label).sort().join('/');
    keys.push({ key: `고르기:${m.options[m.answer].label}|${set}`, level: '오류', what: '정답과 보기 묶음', cross: true });
  }
  if (m.type === 'direction') keys.push({ key: `방향:${m.fromName}→${m.toName}`, level: '오류', what: '방향 출발·도착', cross: true });
  if (m.type === 'tap' || m.type === 'pin') {
    keys.push({ key: `${m.type}:${m.targetName ?? (m.type === 'tap' ? m.area ?? m.country : undefined) ?? p.name}`, level: '알림', what: '찾을 곳', cross: false });
  }
  return keys;
}
/** 다른 장소와 겹침: 구간·열쇠 → 처음 나온 장소·칸 (같은 구간끼리만 본다 — 아이는 자기 구간 문제만 푼다) */
const crossSeen = new Map<string, { place: string; where: string }>();

/** 구간별 고르기 정답 번호 세기 (번호 → 개수) */
const answerTally: Record<Tier, number[]> = { preschool: [], lower: [], upper: [] };

function checkPlace(p: Place) {
  const add = (level: Level, where: string, message: string) => report(level, p.id, where, message);

  // 2. 글 길이 (빈칸은 parsePlace가 막는다)
  const preschoolTexts: [string, string | undefined][] = [
    ['intro.preschool', p.intro.preschool],
    ['story.preschool', p.story.preschool],
    ['familyTalk.preschool', p.familyTalk.preschool],
    ...p.missions.preschool.flatMap((m, i): [string, string | undefined][] => [
      [`missions.preschool[${i}].prompt`, m.prompt],
      [`missions.preschool[${i}].explain`, m.explain],
    ]),
  ];
  for (const [where, text] of preschoolTexts) {
    for (const s of sentences(text ?? '')) {
      if (len(s) > PRESCHOOL_SENTENCE_MAX) add('알림', where, `유아 문장이 ${PRESCHOOL_SENTENCE_MAX}자를 넘어요 (${len(s)}자): "${s}"`);
    }
  }
  for (const tier of ['lower', 'upper'] as const) {
    const n = len(p.story[tier]);
    if (n > STORY_MAX) add('알림', `story.${tier}`, `${TIER_LABELS[tier]} 이야기가 ${STORY_MAX}자를 넘어요 (${n}자)`);
  }

  for (const tier of TIERS) {
    const missions = p.missions[tier];
    const n = countTypes(missions);

    // 3. 문제 묶음 (계획 5 D1·D5): 크기, 종류별 최소, 그 구간에 넣지 않는 종류
    const size = POOL_SIZE[tier];
    if (missions.length !== size) {
      add('오류', `missions.${tier}`, `${TIER_LABELS[tier]} 문제 묶음은 ${size}개여야 해요 (지금 ${missions.length}개: ${countText(n)})`);
    }
    const mins = POOL_MIN[tier];
    const allowed = Object.keys(mins) as MissionType[];
    const short = allowed.filter((t) => n[t] < (mins[t] ?? 0));
    if (short.length) {
      const want = short.map((t) => `${TYPE_LABELS[t]} ${mins[t]}개 이상`).join(' · ');
      add('오류', `missions.${tier}`, `${TIER_LABELS[tier]} 묶음에는 ${want}이 있어야 해요 (지금: ${countText(n)})`);
    }
    const stray = (Object.keys(n) as MissionType[]).filter((t) => n[t] && !allowed.includes(t));
    if (stray.length) {
      add('오류', `missions.${tier}`, `${TIER_LABELS[tier]}에는 ${allowed.map((t) => TYPE_LABELS[t]).join('·')}만 넣어요 (넣은 다른 종류: ${stray.map((t) => TYPE_LABELS[t]).join('·')})`);
    }

    // 11. 겹침: 같은 장소·구간 안, 그리고 다른 장소의 같은 구간과
    const firstAt = new Map<string, number>();
    missions.forEach((m, i) => {
      const where = `missions.${tier}[${i}]`;
      for (const { key, level, what, cross } of dupKeys(m, p)) {
        const j = firstAt.get(key);
        if (j === undefined) firstAt.set(key, i);
        else add(level, where, `${what}이 missions.${tier}[${j}]와 같아요: "${m.prompt}"`);
        if (!cross) continue;
        const other = crossSeen.get(`${tier}|${key}`);
        if (!other) crossSeen.set(`${tier}|${key}`, { place: p.id, where });
        else if (other.place !== p.id) add('알림', where, `다른 장소와 ${what}이 같아요 (${other.place} ${other.where}): "${m.prompt}"`);
      }
    });

    missions.forEach((m, i) => {
      const where = `missions.${tier}[${i}]`;
      // 12. 해설: 저학년·고학년 여행 수업은 고른 문제의 해설로 장면을 만든다 (설계 2026-10-19-trip-lesson-design L9)
      if (tier !== 'preschool' && !m.explain) add('오류', where, `${TIER_LABELS[tier]} 문제에는 해설(explain)이 있어야 해요 — 여행 수업 장면에 써요`);
      switch (m.type) {
        case 'choice': {
          // 4. 보기 수·그림·겹침
          const want = CHOICE_OPTIONS[tier];
          if (m.options.length !== want) add('오류', where, `${TIER_LABELS[tier]} 고르기 보기는 ${want}개여야 해요 (지금 ${m.options.length}개)`);
          if (tier === 'preschool' && m.options.some((o) => !o.icon && !o.flag)) add('오류', where, '유아 고르기 보기에는 모두 그림(icon 또는 flag)이 있어야 해요');
          // 국기: 그림 파일이 있어야 하고, 보기끼리 겹치면 안 된다
          for (const code of [m.flag, ...m.options.map((o) => o.flag)]) {
            if (code && !flagCodes.has(code)) add('오류', where, `국기 "${code}" 그림이 src/assets/flags에 없어요 (있는 것: ${[...flagCodes].join(', ')})`);
          }
          const flags = m.options.flatMap((o) => (o.flag ? [o.flag] : []));
          if (new Set(flags).size !== flags.length) add('오류', where, `보기 국기가 겹쳐요: ${flags.join(' ')}`);
          if (m.flag && flags.length) add('오류', where, '질문 국기(flag)와 국기 보기를 함께 쓰지 않아요');
          const labels = m.options.map((o) => o.label);
          if (new Set(labels).size !== labels.length) add('오류', where, `보기 글자가 겹쳐요: ${labels.join(' / ')}`);
          const icons = m.options.flatMap((o) => (o.icon ? [o.icon] : []));
          if (new Set(icons).size !== icons.length) add('오류', where, `보기 그림이 겹쳐요: ${icons.join(' ')}`);
          // 5. 정답 번호 세기 (분포는 마지막에 본다)
          answerTally[tier][m.answer] = (answerTally[tier][m.answer] ?? 0) + 1;
          // 10. 질문에 정답이 그대로 있으면 알림 (국기 보기는 글자가 안 보이고 "일본 국기를 골라 봐"처럼 이름을 묻는 게 맞다)
          const answer = m.options[m.answer].label;
          if (!flags.length && m.prompt.includes(answer)) add('알림', where, `질문에 정답 글자가 그대로 들어 있어요: "${answer}"`);
          break;
        }
        case 'tap': {
          // 6. 찾아 누르기
          if (!m.targetName) add('오류', where, 'targetName(찾을 곳 이름)이 없어요');
          if (m.area !== undefined) {
            if (!areaNames.has(m.area)) {
              add('오류', where, `area "${m.area}"가 areas.geojson에 없는 이름이에요 (있는 이름: ${[...areaNames].join(', ')})`);
              break;
            }
            const here = areasAt(m.target);
            if (!here.includes(m.area)) {
              add('오류', where, `target ${JSON.stringify(m.target)}이 "${m.area}" 영역 밖이에요 (그 자리: ${here.join(', ') || '영역 없음'})`);
            } else if (here.length > 1) {
              add('알림', where, `target 자리가 다른 영역(${here.filter((a) => a !== m.area).join(', ')})과 겹쳐서 판정이 흔들릴 수 있어요`);
            }
          } else if (m.country !== undefined) {
            if (!countryNames.has(m.country)) {
              add('오류', where, `country "${m.country}"가 countries.geojson에 없는 나라 이름이에요`);
              break;
            }
            const here = countriesAt(m.target);
            if (!here.includes(m.country)) {
              add('오류', where, `target ${JSON.stringify(m.target)}이 "${m.country}" 땅 밖이에요 (그 자리: ${here.join(', ') || '나라 없음'})`);
            }
            // 반경 문제와 같은 크기 하한: 장소 화면에서 너무 작은 나라는 (지도를 못 움직이는) 유아가 누르기 어렵다
            const base = RADIUS_MIN_KM[tier];
            const zoomGain = Math.max(0, (m.view?.zoom ?? p.zoom) - p.zoom);
            const min = base === undefined ? undefined : base / 2 ** zoomGain;
            const size = countryRadiusKm(m.country);
            if (min !== undefined && size < min) {
              add('오류', where, `"${m.country}"가 ${TIER_LABELS[tier]}에게 너무 작아요 (같은 넓이 원 반지름 약 ${Math.round(size)}km < ${Math.round(min * 10) / 10}km)`);
            }
          } else {
            const base = RADIUS_MIN_KM[tier];
            // 미션이 장소 화면보다 확대한 화면(view)에서 열리면, 화면에서 같은 크기가 되게 최솟값을 그만큼 줄인다 (줌 1단계 = 2배)
            const zoomGain = Math.max(0, (m.view?.zoom ?? p.zoom) - p.zoom);
            const min = base === undefined ? undefined : base / 2 ** zoomGain;
            if (min !== undefined && (m.radiusKm ?? 0) < min) {
              const why = zoomGain > 0 ? `, 미션 화면이 ${zoomGain.toFixed(1)}단계 더 확대돼서 ${base}km에서 줄인 값` : '';
              add('오류', where, `${TIER_LABELS[tier]} 정답 반경이 좁아요 (radiusKm ${m.radiusKm} < ${Math.round(min * 10) / 10}${why})`);
            }
          }
          break;
        }
        case 'pin': {
          // 7. 위치 찍기 (starsKm 순서는 parsePlace가 막는다)
          if (!m.targetName) add('오류', where, 'targetName(찾을 곳 이름)이 없어요');
          if (!m.view) {
            add('오류', where, 'view(미션 시작 화면)가 없어요');
            break;
          }
          const off = screenOffset(m.view, m.target);
          const room = off && Math.min(PHONE_HALF_W - Math.abs(off.x), PHONE_HALF_H - Math.abs(off.y));
          const offText = off ? `가운데에서 가로 ${Math.round(off.x)}px·세로 ${Math.round(off.y)}px, 폰 지도 영역 반쪽 ${PHONE_HALF_W}×${PHONE_HALF_H}px` : '지구 뒤쪽';
          if (room === null || room < 0) add('오류', where, `target이 view 화면 밖이에요 (${offText})`);
          else if (room < VIEW_EDGE_PX) add('알림', where, `target이 view 화면 가장자리에 가까워요 (${offText})`);
          break;
        }
        case 'direction': {
          // 8. 방향: 대권 방위각을 나눈 값과 정답이 같아야 한다
          const want = DIRECTION_OPTIONS[tier];
          if (want && m.options !== want) add('오류', where, `${TIER_LABELS[tier]} 방향 문제는 ${want}방위여야 해요 (지금 ${m.options}방위)`);
          const bearing = bearingDeg(m.from, m.to);
          const { dir, toEdge } = toDirection(bearing, m.options);
          const angle = `${m.fromName}→${m.toName} 방위각 ${bearing.toFixed(1)}°`;
          if (dir !== m.answer) add('오류', where, `계산한 방위와 정답이 달라요 (계산: ${dir}, 정답: ${m.answer}, ${angle})`);
          else if (toEdge < DIRECTION_EDGE_DEG) add('알림', where, `방위 경계에 가까워요 (${angle}, 경계까지 ${toEdge.toFixed(1)}°)`);
          // 평면 지도에서 곧게 이은 선도 같은 칸이어야 한다 (가까운 장소는 화면이 평면 지도처럼 보인다)
          const flat = flatBearingDeg(m.from, m.to);
          const { dir: flatDir, toEdge: flatEdge } = toDirection(flat, m.options);
          const flatAngle = `${m.fromName}→${m.toName} 평면 지도 방위각 ${flat.toFixed(1)}°`;
          if (flatDir !== m.answer) add('오류', where, `평면 지도에서 본 방위가 정답과 달라요 (평면: ${flatDir}, 정답: ${m.answer}, ${flatAngle})`);
          else if (flatEdge < DIRECTION_EDGE_DEG) add('알림', where, `평면 지도에서 방위 경계에 가까워요 (${flatAngle}, 경계까지 ${flatEdge.toFixed(1)}°)`);
          break;
        }
      }
    });
  }
}

// ── 실행 ────────────────────────────────────────────────
const onlyAt = process.argv.indexOf('--only');
const only = onlyAt < 0 ? null : (process.argv[onlyAt + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
if (only && only.length === 0) {
  console.error('--only 뒤에 장소 id를 쉼표로 이어 적어 주세요. 예: npm run check:content -- --only europe,africa');
  process.exit(2);
}

const fileIds = readdirSync(PLACES_DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -'.json'.length)).sort();
const targets = only ?? fileIds;
const places: Place[] = [];
for (const name of targets) {
  if (!fileIds.includes(name)) {
    report('오류', name, '(파일)', `src/content/places/${name}.json 파일이 없어요`);
    continue;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(PLACES_DIR, `${name}.json`), 'utf8'));
  } catch (e) {
    report('오류', name, '(파일)', `JSON을 읽지 못했어요: ${errorText(e)}`);
    continue;
  }
  try {
    const place = parsePlace(raw);
    if (place.id !== name) report('오류', name, 'id', `파일 이름(${name}.json)과 id("${place.id}")가 달라요`);
    places.push(place);
  } catch (e) {
    report('오류', name, '(형식)', errorText(e));
  }
}

// 1. index.ts의 PLACES와 파일 목록 (--only일 때는 새 파일도 검사할 수 있게 건너뛴다)
let ordered = places;
if (!only) {
  try {
    const { PLACES } = await import('../src/content/index.ts');
    const ids = PLACES.map((p) => p.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) report('오류', 'index.ts', 'PLACES', `id가 겹쳐요: ${[...new Set(dup)].join(', ')}`);
    const missingFile = ids.filter((id) => !fileIds.includes(id));
    if (missingFile.length) report('오류', 'index.ts', 'PLACES', `PLACES에는 있는데 같은 이름의 파일이 없어요: ${missingFile.join(', ')}`);
    const notListed = fileIds.filter((id) => !ids.includes(id));
    if (notListed.length) report('오류', 'index.ts', 'PLACES', `파일은 있는데 PLACES에 없어요: ${notListed.join(', ')}`);
    ordered = PLACES;
  } catch (e) {
    report('오류', 'index.ts', 'PLACES', `불러오지 못했어요: ${errorText(e)}`);
  }
}
const placeIds = places.map((p) => p.id);
const dupIds = placeIds.filter((id, i) => placeIds.indexOf(id) !== i);
if (dupIds.length) report('오류', '(전체)', 'id', `여러 파일의 id가 겹쳐요: ${[...new Set(dupIds)].join(', ')}`);

places.forEach(checkPlace);

// 5. 고르기 정답 번호 분포
const maxOptions = Math.max(...Object.values(CHOICE_OPTIONS));
const distRows = TIERS.map((tier) => {
  const counts = Array.from({ length: maxOptions }, (_, i) => answerTally[tier][i] ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const top = Math.max(...counts);
  // 한쪽 쏠림은 그 구간 전체를 봐야 알 수 있으므로, 몇 곳만 고른 --only 때는 분포만 보여 준다
  if (!only && total > 0 && top / total > ANSWER_SHARE_MAX) {
    report('알림', '(전체)', `고르기 정답 · ${TIER_LABELS[tier]}`, `${counts.indexOf(top) + 1}번 정답이 ${pct(top, total)}예요 (${ANSWER_SHARE_MAX * 100}% 넘음)`);
  }
  return `| ${TIER_LABELS[tier]} | ${total} | ${counts.map((c, i) => (i < CHOICE_OPTIONS[tier] ? `${c}${total ? ` (${pct(c, total)})` : ''}` : '-')).join(' | ')} |`;
});

// ── 출력 ────────────────────────────────────────────────
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
console.log(`\n콘텐츠 검사 — ${only ? `--only ${only.join(',')}` : '모든 장소'} (${places.length}곳 형식 통과 / ${targets.length}곳)`);
console.log('형식(빈칸·좌표 범위·보기 번호·별 거리 순서 등)은 앱과 같은 parsePlace로 검사했어요.\n');

console.log('단계별 장소 수');
const stages = [...new Set(ordered.map((p) => p.stage))].sort((a, b) => a - b);
for (const stage of stages) {
  const ids = ordered.filter((p) => p.stage === stage).map((p) => p.id);
  console.log(`  ${stage}단계 ${STAGE_NAMES[stage] ?? ''}: ${ids.length}곳 — ${ids.join(', ')}`);
}

console.log(`\n고르기 정답 번호 분포${only ? ' (--only로 고른 장소만)' : ''}`);
console.log(`| 구간 | 고르기 | ${Array.from({ length: maxOptions }, (_, i) => `${i + 1}번`).join(' | ')} |`);
console.log(`|---|---|${'---|'.repeat(maxOptions)}`);
distRows.forEach((row) => console.log(row));

const errors = findings.filter((f) => f.level === '오류');
const notices = findings.filter((f) => f.level === '알림');
if (findings.length) {
  console.log('\n| 구분 | 장소 | 칸 | 내용 |');
  console.log('|---|---|---|---|');
  for (const f of [...errors, ...notices]) console.log(`| ${f.level} | ${cell(f.place)} | ${cell(f.where)} | ${cell(f.message)} |`);
}
console.log(`\n결과: 오류 ${errors.length} · 알림 ${notices.length}`);
process.exitCode = errors.length ? 1 : 0;
