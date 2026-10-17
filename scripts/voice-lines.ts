// 유아 음성 문장 목록 뽑기 (계획 4 작업 6 Step 1)
// 앱과 같은 PLACES(src/content/index.ts)에서 유아 문장을 뽑아 public/voice/lines.json을 만든다.
// 문장 id·공통 말은 앱이 재생할 때 쓰는 src/voice/lines.ts 그대로다. 녹음 대본·manifest는 scripts/voice-script.mjs가 이어서 만든다.
// 실행: npm run voice:script (이 스크립트 → voice-script.mjs)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

// 앱 코드는 Vite 방식으로 확장자 없이 import하고 JSON도 import 속성 없이 불러온다 — check-content.ts와 같은 방법으로 Node에서 읽는다
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
const { PLACES } = await import('../src/content/index.ts');
const { voiceLines } = await import('../src/voice/lines.ts');

const lines = voiceLines(PLACES);
const ids = new Set(lines.map((l) => l.id));
if (ids.size !== lines.length) throw new Error('같은 id의 문장이 둘 있어요');

const outDir = fileURLToPath(new URL('../public/voice/', import.meta.url));
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}lines.json`, `${JSON.stringify(lines, null, 2)}\n`);
console.log(`유아 음성 문장 ${lines.length}개 → public/voice/lines.json`);
