// 지도 글꼴(.pbf)을 public/fonts에 내려받는다 (이미 있는 파일은 건너뜀)
// 0-255: 기본 영문·숫자·띄어쓰기, 256-511: 악센트 붙은 영문, 8192-8447: ’ – … 같은 문장부호
// 실행: npm run glyphs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fonts');
const BASE = 'https://protomaps.github.io/basemaps-assets/fonts';
const STACKS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'];
const RANGES = ['0-255', '256-511', '8192-8447'];

for (const stack of STACKS) {
  const dir = path.join(OUT, stack);
  fs.mkdirSync(dir, { recursive: true });
  for (const range of RANGES) {
    const file = path.join(dir, `${range}.pbf`);
    if (fs.existsSync(file)) {
      console.log(`있음  ${stack}/${range}`);
      continue;
    }
    const res = await fetch(`${BASE}/${encodeURIComponent(stack)}/${range}.pbf`);
    if (!res.ok) throw new Error(`${stack}/${range}: HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`받음  ${stack}/${range}`);
  }
}
