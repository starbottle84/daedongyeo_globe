// 방향 문제를 실제 화면(개발 서버)에서 열어 세 단계를 확인한다.
//  1) 답하기 전: 목표 핀·점선·칸 경계가 없고 기준 장소(방위표)가 보이는 칸 한가운데에 있는지 (목표 쪽을 드러내지 않게)
//  2) 한 번 틀린 뒤(힌트): 도착 핀과 점선이 나오는지
//  3) 정답을 누른 뒤 지도 위 방위표가 제대로 보이는지:
//  - 도착 핀(목표 지점)이 칠해진 정답 칸 안에 있고, 칸 경계 점선에서 몇 px 떨어져 있는지
//  - 기준→목표 점선·화살촉이 보이는지
//  - 방위표·'기준' 이름표·도착 핀이 화면 가장자리나 여행 카드(아래, 가로 휴대폰은 오른쪽 옆)에 잘리지 않는지
// 사용: node scripts/measure-directions.mjs [w=1024] [h=768] [장소 id들(쉼표), 비우면 전부] [--base=http://localhost:5180]
// 예: node scripts/measure-directions.mjs 390 844 europe,oceania
// 걸린 문제는 끝에 모아 보이고 종료 코드 1
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const base = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:5180').slice(7);
const [w = '1024', h = '768', placeArg = ''] = args;
const W = Number(w), H = Number(h);
/** 도착 핀이 칸 경계 점선에서 이만큼(px) 안이면 걸림 */
const MIN_SIDE_PX = 10;

const dir = 'src/content/places';
const only = placeArg ? placeArg.split(',').map((s) => s.trim()).filter(Boolean) : null;
const jobs = [];
for (const file of fs.readdirSync(dir).sort()) {
  const place = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  if (only && !only.includes(place.id)) continue;
  for (const tier of ['lower', 'upper']) {
    (place.missions[tier] ?? []).forEach((m, i) => {
      if (m.type === 'direction') jobs.push({ place: place.id, tier, index: i, m });
    });
  }
}

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'measuredir-'));
const port = 9300 + Math.floor(Math.random() * 600);
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`, '--window-size=1200,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanup = () => { try { proc.kill(); } catch {} setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 500); };

// 페이지 안에서: 지도가 멈출 때마다 답 전·오답 뒤·정답 뒤 방위표 그림(DOM)을 잰다
const measureExpr = (m) => `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const settle = async () => { let still = 0; for (let i = 0; i < 150 && still < 4; i++) { await sleep(100); still = window.__map.isMoving() ? 0 : still + 1; } };
  for (let i = 0; i < 80 && !(window.__map && document.querySelector('.trip-compass')); i++) await sleep(100);
  if (!window.__map || !document.querySelector('.trip-compass')) return { error: '방위표 없음' };
  await sleep(400); await settle();
  const shown = (sel) => { const el = document.querySelector(sel); return Boolean(el) && getComputedStyle(el).display !== 'none'; };
  const stageProblems = [];
  // 1) 답하기 전: 목표 핀·점선·칸 경계가 없고, 기준 장소(방위표)가 보이는 칸 한가운데에 있어야 한다 (목표 쪽을 드러내지 않게)
  if (document.querySelector('.trip-marker--to')) stageProblems.push('답 전 도착 핀 보임');
  if (shown('.trip-compass__line')) stageProblems.push('답 전 점선 보임');
  if ([...document.querySelectorAll('.trip-compass__ray')].some((r) => getComputedStyle(r).display !== 'none')) stageProblems.push('답 전 칸 경계 보임');
  {
    const card = document.querySelector('.bottom-stack')?.getBoundingClientRect();
    const box = window.__map.getContainer().getBoundingClientRect();
    const beside = Boolean(card) && card.left + card.width / 2 > box.left + box.width / 2 + 1;
    const right = beside ? card.left - 12 : box.right;
    const bottom = card && !beside ? card.top - 12 : box.bottom;
    const c = document.querySelector('.trip-compass').getBoundingClientRect();
    if (Math.abs(c.left - (box.left + right) / 2) > 8 || Math.abs(c.top - (box.top + bottom) / 2) > 8) stageProblems.push('답 전 기준이 가운데 아님');
  }
  // 2) 한 번 틀리면 힌트: 도착 핀·점선이 나온다
  const dirs = [...document.querySelectorAll('.compass__dir')];
  const wrongBtn = dirs.find((b) => b.textContent !== ${JSON.stringify(m.answer)});
  const btn = dirs.find((b) => b.textContent === ${JSON.stringify(m.answer)});
  if (!btn || !wrongBtn) return { error: '방향 버튼 없음' };
  wrongBtn.click();
  await sleep(500); await settle(); await sleep(200);
  if (!document.querySelector('.trip-marker--to')) stageProblems.push('힌트 때 도착 핀 없음');
  if (!shown('.trip-compass__line')) stageProblems.push('힌트 때 점선 없음');
  // 3) 정답을 누른 뒤의 그림을 잰다
  btn.click();
  await sleep(500); await settle(); await sleep(200);
  const root = document.querySelector('.trip-compass');
  const o = root.getBoundingClientRect();
  const t = window.__map.project(${JSON.stringify(m.to)});
  const mapRect = window.__map.getContainer().getBoundingClientRect();
  const P = { x: mapRect.left + t.x - o.left, y: mapRect.top + t.y - o.top };
  const parse = (s) => (s || '').trim().split(/\\s+/).filter(Boolean).map((xy) => xy.split(',').map(Number)).map(([x, y]) => ({ x, y }));
  const wedgeD = document.querySelector('.trip-compass__wedge')?.getAttribute('d') ?? '';
  const poly = (wedgeD.match(/-?[\\d.]+,-?[\\d.]+/g) || []).map((xy) => { const [x, y] = xy.split(',').map(Number); return { x, y }; });
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > P.y) !== (b.y > P.y) && P.x < ((b.x - a.x) * (P.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  const step = ${m.options === 8 ? 45 : 90};
  const names = ${JSON.stringify(m.options === 8 ? ['북', '북동', '동', '남동', '남', '남서', '서', '북서'] : ['북', '동', '남', '서'])};
  const mid = names.indexOf(${JSON.stringify(m.answer)}) * step;
  const want = [(mid - step / 2 + 360) % 360, (mid + step / 2) % 360];
  const segDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y; const L = dx * dx + dy * dy || 1; const k = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)); return Math.hypot(p.x - a.x - k * dx, p.y - a.y - k * dy); };
  const side = Math.min(...[...document.querySelectorAll('.trip-compass__ray')].filter((r) => want.includes(Number(r.dataset.bearing)))
    .map((r) => { const pts = parse(r.getAttribute('points')); let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(P, pts[i - 1], pts[i])); return d; }));
  const stack = document.querySelector('.bottom-stack')?.getBoundingClientRect();
  // 가로 휴대폰 여행 카드는 오른쪽 옆에 선다(가운데가 아니라 오른쪽에 붙어 있으면) — 그때는 카드 왼쪽 끝까지가 보이는 칸
  const besideCard = Boolean(stack) && stack.left + stack.width / 2 > innerWidth / 2 + 1;
  const bandBottom = stack && !besideCard ? stack.top : innerHeight;
  const bandRight = besideCard ? stack.left : innerWidth;
  const clipped = (el, name) => { if (!el) return name + ' 없음'; const r = el.getBoundingClientRect(); if (r.width === 0) return null;
    return r.left < -1 || r.top < -1 || r.right > bandRight + 1 || r.bottom > bandBottom + 1 ? name + ' 잘림' : null; };
  const problems = [
    ...stageProblems,
    clipped(document.querySelector('.trip-compass__back'), '방위표'),
    clipped(document.querySelector('.trip-compass__tag'), '기준 이름표'),
    clipped(document.querySelector('.trip-marker--to'), '도착 핀'),
    clipped(document.querySelector('.trip-marker--to .trip-marker__label'), '도착 이름표'),
    getComputedStyle(document.querySelector('.trip-compass__line')).display === 'none' ? '점선 없음' : null,
    getComputedStyle(document.querySelector('.trip-compass__head')).display === 'none' ? '화살촉 없음' : null,
    inside ? null : '정답 칸 밖',
    side < ${MIN_SIDE_PX} ? '경계에 붙음' : null,
  ].filter(Boolean);
  return { inside, side, zoom: window.__map.getZoom(), problems };
})()`;

const rows = [];
const bad = [];
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); target = list.find((t) => t.type === 'page'); } catch {}
    if (!target) await sleep(150);
  }
  if (!target) throw new Error('no devtools target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); let loaded = false;
  ws.onmessage = (msg) => { const d = JSON.parse(msg.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method === 'Page.loadEventFired') loaded = true; };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 768, screenWidth: W, screenHeight: H });
  // 날아가는 시간을 없애 빨리 잰다 (globeHandle flightMs가 움직임 줄이기를 보고 바로 옮긴다)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  for (const job of jobs) {
    const { place, tier, index, m } = job;
    let r = null;
    // 다른 작업이 코드를 고쳐 페이지가 새로 고쳐지면 값이 안 나오므로 한 번 더 해 본다
    for (let attempt = 0; attempt < 2 && (!r || r.error); attempt++) {
      loaded = false;
      await send('Page.navigate', { url: `${base}/?seed=one&shot=${place}:${tier}:mission${index + 1}&pool=all` });
      for (let i = 0; i < 100 && !loaded; i++) await sleep(100);
      r = (await send('Runtime.evaluate', { expression: measureExpr(m), awaitPromise: true, returnByValue: true })).result.result?.value;
    }
    const head = `${place} | ${tier}[${index}] | ${m.fromName}→${m.toName} | 정답 ${m.answer}`;
    if (!r || r.error) { const row = `${head} | 잴 수 없음 (${r?.error ?? '값 없음'})`; console.log(row); bad.push(row); continue; }
    const row = `${head} | 경계까지 ${Number.isFinite(r.side) ? r.side.toFixed(0) : '?'}px | 확대 ${r.zoom.toFixed(2)}${r.problems.length ? ' | ' + r.problems.join(', ') : ''}`;
    rows.push(row);
    console.log(row);
    if (r.problems.length) bad.push(row);
  }
  ws.close();
} catch (e) { console.error('failed', e.message); process.exitCode = 1; }
finally { cleanup(); }

console.log(`\n${W}×${H} 방향 문제 ${rows.length}개 잼, 걸린 것 ${bad.length}개`);
if (bad.length) { console.log(bad.join('\n')); process.exitCode = 1; }
