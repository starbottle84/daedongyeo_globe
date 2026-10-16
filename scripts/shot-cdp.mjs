// 사용: node scripts/shot-cdp.mjs <html 파일 또는 http 주소> <out.png> [w=390] [h=844] [query]
// 예: node scripts/shot-cdp.mjs http://localhost:5180/ shot.png 390 844
// 숨은 크롬의 창 최소 너비(500px) 때문에 390px 화면이 틀어지지 않도록 DevTools 프로토콜로 화면 크기를 정확히 맞춰 찍는다.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [html, out, w = '390', h = '844', query = ''] = process.argv.slice(2);
const W = Number(w), H = Number(h);
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'shotcdp-'));
const base = /^https?:\/\//.test(html) ? html : pathToFileURL(path.resolve(html)).href;
const url = base + (query ? (base.includes('?') ? '&' : '?') + query : '');
const port = 9300 + Math.floor(Math.random() * 600);
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`, '--window-size=1200,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanup = () => { try { proc.kill(); } catch {} setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 500); };

try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); target = list.find((t) => t.type === 'page'); } catch {}
    if (!target) await sleep(150);
  }
  if (!target) throw new Error('no devtools target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const events = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else events.push(d); };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: process.env.CLIP ? Number(process.env.SCALE || 2) : 1, mobile: W < 768, screenWidth: W, screenHeight: H });
  if (W < 768) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url });
  for (let i = 0; i < 100 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100);
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>1)', awaitPromise: true });
  await sleep(2600); // 등장 애니메이션이 끝날 때까지
  // 찍기 전에 페이지에서 식 하나 실행하고 값 출력: EVAL="__map.setBearing(30)" (지도 돌린 모습 등)
  if (process.env.EVAL) { const r = await send('Runtime.evaluate', { expression: process.env.EVAL, awaitPromise: true, returnByValue: true }); console.log('eval', JSON.stringify(r.result.result?.value ?? r.result.exceptionDetails?.text)); await sleep(1200); }
  // 확대해 보기: CLIP="x,y,w,h" SCALE=2
  const c = (process.env.CLIP || '').split(',').map(Number);
  const clip = c.length === 4 ? { x: c[0], y: c[1], width: c[2], height: c[3], scale: 1 } : { x: 0, y: 0, width: W, height: H, scale: 1 };
  const shot = await send('Page.captureScreenshot', { format: 'png', clip });
  if (process.env.MEASURE) { const r = await send('Runtime.evaluate', { expression: "(()=>{const d=document.querySelector('.bottom-stack');const b=d.getBoundingClientRect();return JSON.stringify({top:Math.round(b.top),h:Math.round(b.height),ratio:+(b.height/innerHeight).toFixed(3),sw:document.documentElement.scrollWidth})})()", returnByValue: true }); console.log('measure', r.result.result.value); }
  fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log('saved', path.resolve(out));
  ws.close();
} catch (e) { console.error('failed', e.message); process.exitCode = 1; }
finally { cleanup(); }
