import * as maplibregl from 'maplibre-gl';
import { DIRECTIONS_4, DIRECTIONS_8, type Direction, type LngLat } from '../content/types';

// 방향 미션의 방위표: 기준 장소 위에 '지구본 표면에 그린 그림'처럼 놓는다.
// 지구본은 둥글어서 화면 위쪽이 북쪽이 아닐 때가 많고(모스크바 근처는 약 15° 기욺), 가장자리로 갈수록 방위 사이 각도도 찌그러진다.
// 그래서 방위표는 기준 장소에서 동·북으로 조금 간 지점을 화면에 비춰 그 모양대로 기울이고 눌러 그리며,
// 방위 칸 경계와 기준→목표 선은 지구 위의 대권(가장 짧은 길)을 따라 그린다. 같은 점에서 나간 대권끼리는 다시 만나지 않으므로
// 목표는 화면을 어떻게 돌리거나 옮겨도 늘 '처음 방향'(정답 계산과 같은 대권 방위각)의 칸 안에 보인다. 답한 뒤에는 정답 칸을 칠한다.

export interface CompassOptions {
  from: LngLat;
  to: LngLat;
  fromName: string;
  /** 저학년 4방위, 고학년 8방위 */
  points: 4 | 8;
  /** 지도 안에서 여행 카드(아래, 가로 휴대폰은 오른쪽 옆)에 가리지 않는 칸의 오른쪽·아래 끝(px, 지도 왼쪽 위가 0). 방위표 크기와 이름표 자리를 정한다 */
  visibleArea: () => { right: number; bottom: number };
}

export interface Compass {
  /** 답한 뒤 정답 칸을 칠한다 */
  reveal(answer: Direction): void;
  remove(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** 바늘 원·글자 고리·뒤판 반지름(px, 크기 1일 때). 뒤판은 아래 지명을 흐리게 덮어 방위 글자가 읽히게 한다 */
const ROSE_R = 30;
const LABEL_R = 45;
const BACK_R = 60;
/** 보이는 띠 높이가 이보다 낮으면(아주 낮은 창) 방위표를 줄인다. 가장 작게는 MIN_SCALE배, 그보다 작으면 사이 방위 글자는 뺀다 */
const FULL_BAND_PX = 300;
const MIN_SCALE = 0.6;
const MINOR_LABEL_MIN_SCALE = 0.8;
/** 칸 경계는 화면에서 목표보다 이만큼(px) 더 길게, 적어도 이만큼 */
const RAY_EXTRA_PX = 48;
const RAY_MIN_PX = 130;
/** 칸 경계 대권을 몇 번에 나눠 그릴지: 목표까지 거리의 1/RAY_STEPS씩, 많아야 RAY_MAX_SAMPLES점 */
const RAY_STEPS = 16;
const RAY_MAX_SAMPLES = 64;
const LINE_SAMPLES = 40;
const WEDGE_EDGE_SAMPLES = 12;
/** 이름표·도착 핀과 띄울 틈(px) */
const TAG_GAP_PX = 20;
const PIN_GAP_PX = 4;
/** 도착 핀(markers.css .trip-marker)이 목표 지점 기준으로 차지하는 상자: 몸통 폭 28·높이 30, 이름표는 위로 36~64px */
const PIN_HALF_W = 14;
const PIN_H = 30;
const PIN_LABEL_TOP = 64;
const PIN_LABEL_BOTTOM = 36;
/** 방위표 모양을 재려고 기준 장소에서 조금 옮기는 각도(라디안, 약 5.5km) */
const LOCAL_STEP = 0.00087;
/** 지도 가운데에서 이 각도(°)보다 먼 점만 지구 뒤쪽인지 따져 본다 (앞쪽 반구 안쪽은 늘 보인다) */
const HORIZON_CHECK_DEG = 60;

type Pt = { x: number; y: number };
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const f = (n: number) => n.toFixed(1);
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

// 지구 위 점 p에서 방위각 bearing(°)으로 각도 dist(라디안)만큼 간 점
function destination([lng, lat]: LngLat, bearing: number, dist: number): LngLat {
  const p1 = rad(lat);
  const t = rad(bearing);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(dist) + Math.cos(p1) * Math.sin(dist) * Math.cos(t));
  const l2 = rad(lng) + Math.atan2(Math.sin(t) * Math.sin(dist) * Math.cos(p1), Math.cos(dist) - Math.sin(p1) * Math.sin(p2));
  return [((deg(l2) + 540) % 360) - 180, deg(p2)];
}
// 두 점 사이 대권 각도(라디안)
function angularDistance([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
// from에서 to로 가는 대권 위, 비율 k(0~1) 지점
function along(from: LngLat, to: LngLat, k: number, total: number): LngLat {
  if (total < 1e-9) return from;
  const [l1, p1, l2, p2] = [rad(from[0]), rad(from[1]), rad(to[0]), rad(to[1])];
  const a = Math.sin((1 - k) * total) / Math.sin(total);
  const b = Math.sin(k * total) / Math.sin(total);
  const x = a * Math.cos(p1) * Math.cos(l1) + b * Math.cos(p2) * Math.cos(l2);
  const y = a * Math.cos(p1) * Math.sin(l1) + b * Math.cos(p2) * Math.sin(l2);
  const z = a * Math.sin(p1) + b * Math.sin(p2);
  return [deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.hypot(x, y)))];
}
const pointsAttr = (pts: Pt[]) => pts.map((p) => `${f(p.x)},${f(p.y)}`).join(' ');
// 꺾은선을 끝에서 len(px)만큼 잘라 낸다
function trimEnd(pts: Pt[], len: number): Pt[] {
  const out = pts.slice();
  let left = len;
  while (out.length >= 2 && left > 0) {
    const b = out[out.length - 1];
    const a = out[out.length - 2];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg > left) {
      const k = (seg - left) / seg;
      out[out.length - 1] = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      return out;
    }
    left -= seg;
    out.pop();
  }
  return out;
}

export function createCompass(map: maplibregl.Map, { from, to, fromName, points, visibleArea }: CompassOptions): Compass {
  const names = points === 8 ? DIRECTIONS_8 : DIRECTIONS_4;
  const step = 360 / points;
  const totalDist = angularDistance(from, to);
  // 방위표가 떠 있는 동안 지도를 기울이지 못하게 한다 — 기울인 화면에서는 방위 사이 각도가 크게 찌그러져 칸을 읽기 어렵다
  const maxPitchBefore = map.getMaxPitch();
  map.setMaxPitch(0);

  const root = document.createElement('div');
  root.className = `trip-compass trip-compass--${points}`;
  root.setAttribute('aria-hidden', 'true');
  // 크기 0인 svg는 브라우저가 그리지 않으므로 1px로 두고 넘쳐 그린다
  const art = svg('svg', { class: 'trip-compass__svg', width: 1, height: 1 });
  // 정답 칸(답한 뒤에만 보임) → 칸 경계 → 기준→목표 점선 → 뒤판·바늘 → 글자 순으로 쌓는다
  const wedge = svg('path', { class: 'trip-compass__wedge' });
  const rays = names.map((_, i) => {
    const ray = svg('polyline', { class: 'trip-compass__ray' });
    ray.dataset.bearing = String(i * step + step / 2);
    return ray;
  });
  const line = svg('polyline', { class: 'trip-compass__line' });
  const head = svg('path', { class: 'trip-compass__head' });
  // 방위표 몸통: 그리는 좌표는 '오른쪽 = 동, 위 = 북'이고, 화면에 비춘 모양(기울기·눌림)으로 바꾸는 행렬을 씌운다
  const rose = svg('g');
  rose.append(
    svg('circle', { class: 'trip-compass__back', r: BACK_R }),
    svg('circle', { class: 'trip-compass__dial', r: ROSE_R }),
  );
  // 바늘: 동서남북은 길게(북은 빨강), 8방위의 사이 방위는 짧게
  DIRECTIONS_8.forEach((name, i) => {
    const main = i % 2 === 0;
    if (!main && points === 4) return;
    const len = main ? ROSE_R - 2 : ROSE_R - 9;
    const half = main ? 6 : 4;
    rose.append(svg('path', {
      class: `trip-compass__needle${name === '북' ? ' is-north' : main ? '' : ' is-minor'}`,
      d: `M0,${-len} L${half},-4 L${-half},-4 Z`,
      transform: `rotate(${i * 45})`,
    }));
  });
  rose.append(svg('circle', { class: 'trip-compass__hub', r: 4.5 }));
  // 글자는 행렬을 씌우지 않고 자리만 옮긴다 (눌리거나 기울지 않고 바로 서 있게)
  const labels = names.map((name, i) => {
    const text = svg('text', {
      class: `trip-compass__label${name === '북' ? ' is-north' : name.length > 1 ? ' is-minor' : ''}`,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    });
    text.textContent = name;
    text.dataset.bearing = String(i * step);
    return text;
  });
  art.append(wedge, ...rays, line, head, rose, ...labels);
  const tag = document.createElement('span');
  tag.className = 'trip-compass__tag';
  const tagWord = document.createElement('small');
  tagWord.textContent = '기준';
  tag.append(tagWord, document.createTextNode(` ${fromName}`));
  root.append(art, tag);

  let revealed: Direction | null = null;

  // 화면이 움직일 때마다 다시 그린다
  const update = () => {
    const { right: bandRight, bottom: bandBottom } = visibleArea();
    const scale = Math.max(MIN_SCALE, Math.min(1, bandBottom / FULL_BAND_PX));
    const back = BACK_R * scale;
    const a = map.project(from);
    const center = map.getCenter();
    const centerLngLat: LngLat = [center.lng, center.lat];
    // 지구 위 점을 기준 장소에서 본 화면 위치로. 지구 뒤쪽이면 null (화면 위치를 다시 지구 위 점으로 바꿨을 때 다른 곳이 나온다)
    const screen = (p: LngLat): Pt | null => {
      const q = map.project(p);
      if (deg(angularDistance(p, centerLngLat)) > HORIZON_CHECK_DEG) {
        const backTo = map.unproject(q);
        if (deg(angularDistance([backTo.lng, backTo.lat], p)) > 0.05) return null;
      }
      return { x: q.x - a.x, y: q.y - a.y };
    };

    // 방위표 모양: 기준 장소에서 동·북으로 조금 간 지점이 화면에서 어느 쪽·얼마만큼인지
    const east = screen(destination(from, 90, LOCAL_STEP)) ?? { x: 1, y: 0 };
    const north = screen(destination(from, 0, LOCAL_STEP)) ?? { x: 0, y: -1 };
    const unit = Math.max(Math.hypot(east.x, east.y), Math.hypot(north.x, north.y)) / scale;
    const m = [east.x / unit, east.y / unit, -north.x / unit, -north.y / unit];
    rose.setAttribute('transform', `matrix(${m.map((v) => v.toFixed(4)).join(' ')} 0 0)`);
    const toScreen = (x: number, y: number): Pt => ({ x: m[0] * x + m[2] * y, y: m[1] * x + m[3] * y });
    const showMinor = scale >= MINOR_LABEL_MIN_SCALE;
    for (const label of labels) {
      const b = rad(Number(label.dataset.bearing));
      const p = toScreen(LABEL_R * Math.sin(b), -LABEL_R * Math.cos(b));
      label.setAttribute('x', f(p.x));
      label.setAttribute('y', f(p.y));
      label.style.display = showMinor || !label.classList.contains('is-minor') || label.classList.contains('is-answer') ? '' : 'none';
    }

    const t = screen(to);
    const tPlain = map.project(to);
    const dist = Math.hypot(tPlain.x - a.x, tPlain.y - a.y);
    const rayLen = Math.max(RAY_MIN_PX * scale, dist + RAY_EXTRA_PX * scale);
    // 기준 장소에서 bearing 방향 대권을 화면에서 rayLen까지(또는 지구 가장자리까지) 그린 점들(뒤판 밖부터)과, 마지막 점까지의 대권 각도
    const rayStep = Math.max(totalDist, 0.002) / RAY_STEPS;
    const rayPoints = (bearing: number): { pts: Pt[]; reach: number } => {
      const pts: Pt[] = [];
      let reach = 0;
      for (let i = 1; i <= RAY_MAX_SAMPLES; i++) {
        const p = screen(destination(from, bearing, rayStep * i));
        if (!p) break;
        reach = rayStep * i;
        const r = Math.hypot(p.x, p.y);
        if (r >= back + 2) pts.push(p);
        if (r >= rayLen) break;
      }
      return { pts, reach };
    };
    const rayCache = new Map<number, { pts: Pt[]; reach: number }>();
    for (const ray of rays) {
      const traced = rayPoints(Number(ray.dataset.bearing));
      rayCache.set(Number(ray.dataset.bearing), traced);
      ray.setAttribute('points', pointsAttr(traced.pts));
    }

    // 기준→목표 대권. 목표가 지구 뒤쪽이면 보이는 데까지만 그리고 화살촉은 뺀다
    let path: Pt[] = [];
    let reached = true;
    for (let i = 1; i <= LINE_SAMPLES; i++) {
      const p = screen(along(from, to, i / LINE_SAMPLES, totalDist));
      if (!p) {
        reached = false;
        break;
      }
      if (Math.hypot(p.x, p.y) >= back + 2) path.push(p);
    }
    // 끝은 도착 핀 몸통과 이름표 상자에 닿지 않게 줄인다 (목표가 바로 아래면 이름표 위에서 멈춘다)
    if (reached && t && path.length >= 2) {
      const last = path[path.length - 2];
      const dx = t.x - last.x;
      const dy = t.y - last.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const pinLabel = map.getContainer().querySelector<HTMLElement>('.trip-marker--to .trip-marker__label');
      const labelHalf = (pinLabel?.offsetWidth ?? 80) / 2;
      const inPin = (x: number, y: number) =>
        (Math.abs(x) <= PIN_HALF_W && y <= 0 && y >= -PIN_H) || (Math.abs(x) <= labelHalf && y <= -PIN_LABEL_BOTTOM && y >= -PIN_LABEL_TOP);
      let gap = 8;
      for (let s = 0; s <= PIN_LABEL_TOP + labelHalf; s += 2) if (inPin(-ux * s, -uy * s)) gap = s + PIN_GAP_PX;
      path = trimEnd(path, gap);
    }
    const showLine = path.length >= 2 && Math.hypot(path[path.length - 1].x, path[path.length - 1].y) > back + 16;
    line.style.display = showLine ? '' : 'none';
    head.style.display = showLine && reached ? '' : 'none';
    if (showLine) {
      line.setAttribute('points', pointsAttr(trimEnd(path, 6)));
      const tip = path[path.length - 1];
      const prev = path[path.length - 2];
      const len = Math.hypot(tip.x - prev.x, tip.y - prev.y) || 1;
      const ux = (tip.x - prev.x) / len;
      const uy = (tip.y - prev.y) / len;
      // 화살촉: 끝점에서 뒤로 12px, 양옆 7px
      const bx = tip.x - ux * 12;
      const by = tip.y - uy * 12;
      head.setAttribute('d', `M${f(tip.x)},${f(tip.y)} L${f(bx - uy * 7)},${f(by + ux * 7)} L${f(bx + uy * 7)},${f(by - ux * 7)} Z`);
    }

    // 정답 칸: 양쪽 경계 대권과, 그 끝을 잇는 바깥 테두리
    if (revealed) {
      const mid = names.indexOf(revealed) * step;
      const left = rayCache.get((mid - step / 2 + 360) % 360) ?? rayPoints(mid - step / 2);
      const right = rayCache.get(mid + step / 2) ?? rayPoints(mid + step / 2);
      const reach = Math.max(left.reach, right.reach, rayStep);
      const outer: Pt[] = [];
      for (let i = 1; i < WEDGE_EDGE_SAMPLES; i++) {
        const b = mid - step / 2 + (step * i) / WEDGE_EDGE_SAMPLES;
        let p: Pt | null = null;
        // 지구 가장자리에 걸리면 조금씩 안으로 당긴다
        for (let k = 1; k >= 0.2 && !p; k -= 0.2) p = screen(destination(from, b, reach * k));
        if (p) outer.push(p);
      }
      const poly = [{ x: 0, y: 0 }, ...left.pts, ...outer, ...right.pts.slice().reverse()];
      wedge.setAttribute('d', `M${poly.map((p) => `${f(p.x)},${f(p.y)}`).join(' L')} Z`);
      wedge.classList.add('is-on');
    }

    // 기준 이름표: 보이는 띠 안에 다 들어가는 첫 자리 — 목표 반대쪽 위/아래, 다른 쪽 위/아래, 목표 반대쪽 옆
    const tw = tag.offsetWidth;
    const th = tag.offsetHeight;
    const vy = back + TAG_GAP_PX - 6;
    const tdx = t ? t.x : 0;
    const tdy = t ? t.y : 0;
    const vertical = tdy > 0 ? [-vy, vy] : [vy, -vy];
    const candidates: Pt[] = [
      { x: 0, y: vertical[0] },
      { x: 0, y: vertical[1] },
      { x: (tdx > 0 ? -1 : 1) * (back + 8 + tw / 2), y: 0 },
    ];
    const fits = (c: Pt) => {
      const left = a.x + c.x - tw / 2;
      const top = a.y + c.y - th / 2;
      return left >= 2 && left + tw <= bandRight - 2 && top >= 2 && top + th <= bandBottom - 2;
    };
    const spot = candidates.find(fits) ?? candidates[0];
    tag.style.transform = `translate(-50%, -50%) translate(${f(spot.x)}px, ${f(spot.y)}px)`;
  };

  // 지구 뒤쪽으로 돌아가면 방위표도 숨긴다 (MapLibre가 기준 지점이 가려졌는지 보고 투명도를 바꾼다)
  const marker = new maplibregl.Marker({ element: root, anchor: 'center', opacityWhenCovered: '0' }).setLngLat(from).addTo(map);
  map.on('move', update);
  map.on('resize', update);
  update();

  return {
    reveal(answer) {
      revealed = answer;
      labels.find((l) => l.textContent === answer)?.classList.add('is-answer');
      update();
    },
    remove() {
      map.off('move', update);
      map.off('resize', update);
      marker.remove();
      map.setMaxPitch(maxPitchBefore);
    },
  };
}
