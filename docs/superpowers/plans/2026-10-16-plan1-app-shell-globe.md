# 계획 1: 앱 뼈대 · 지구본 이전 · 지도 보정 · 배포 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지금의 HTML 한 장짜리 지구본을 React + Vite + TypeScript 설치형 웹앱(PWA)으로 옮긴다. 지명 디테일은 그대로 유지하고, 지도 보정 데이터를 적용한 뒤 GitHub Pages로 배포한다.

**Architecture:** 지구본 스타일·색 테마·아이콘을 `src/globe/`의 작은 모듈로 나누고, `GlobeView` React 컴포넌트가 MapLibre 지도의 생성·정리·보기 전환을 맡는다. 지도 데이터(`public/data`)와 글꼴(`public/fonts`)은 앱과 함께 배포하고 서비스 워커가 미리 저장한다. 그래서 그림 지도는 인터넷 없이도 열리고, 위성 지도만 NASA GIBS에서 불러온다.

**Tech Stack:** React 19, Vite 6, TypeScript 5.7, maplibre-gl 5.6.0(검증한 버전으로 고정), vite-plugin-pwa 0.21, sharp(아이콘), GitHub Actions + GitHub Pages

**설계 문서:** `docs/superpowers/specs/2026-10-16-globe-geography-design.md`

---

## 전체 계획 지도 (4개 중 1번)

| 계획 | 내용 | 끝나면 되는 것 |
|---|---|---|
| **1 (이 문서)** | 앱 뼈대, 지구본 이전, 지도 보정, 배포 | 웹 주소로 지구본 앱이 열리고 설치 가능 |
| 2 | 여행 엔진, 미션 4종, 콘텐츠 형식, 견본 장소 3곳(독도·서울·태평양) | 나이 3구간으로 여행 1번을 끝까지 진행 |
| 3 | 여권·도장·단계 열림, 가족 프로필, 어른 확인, 부모 카드, 기기 저장 | 형제가 각자 프로필로 도장을 모음 |
| 4 | 첫 출시 콘텐츠 24곳 × 3구간, 유아 음성, 콘텐츠 검사 스크립트 | 첫 출시 |

## 이 계획의 작업 규칙

- **자동 테스트는 새로 만들지 않는다.** 사용자 규칙상 테스트는 버그를 고칠 때만 쓴다. 대신 각 작업 끝에 빌드·린트·브라우저 확인 단계를 둔다.
- **⚠ 표시 단계**(파일 삭제·덮어쓰기·옮기기)는 실행 전에 사용자에게 무엇이 바뀌는지 보여 주고 허락을 받는다.
- **빌드는 항상 `npm run build`로 한다.** 폴더 경로에 한글이 있어 Vite 빌드가 실패할 수 있어서, 영문 임시 폴더에 복사해 빌드하는 스크립트를 거친다.
- **지명 디테일 기준:** `D:\결과물\대동여퀴즈`의 지구본이 기준이다. 작업 8의 비교를 통과하기 전에는 그 폴더를 지우지 않는다.
- 커밋 메시지 끝에는 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`을 붙인다.

## 파일 구조

| 파일 | 역할 | 작업 |
|---|---|---|
| `package.json`, `package-lock.json` | 의존성·명령어 | 1 |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | TypeScript 설정 | 1 |
| `vite.config.ts` | Vite + PWA 설정, 배포 경로 | 1 |
| `eslint.config.js` | 린트 설정 | 1 |
| `scripts/path-safe-build.mjs` | 한글 경로 안전 빌드 | 2 |
| `data/overrides.json` | 지명 수정표·독도/울릉도 추가·표시 단계 조정 | 3 |
| `scripts/build-data.mjs` | 출력 위치를 `public/data`로, 보정 데이터 적용 | 3 |
| `public/data/*.geojson` | 지구본이 읽는 경량 지도 데이터 | 3 |
| `scripts/download-glyphs.mjs`, `public/fonts/**` | 오프라인용 지도 글꼴 | 4 |
| `public/icons/icon.svg`, `scripts/generate-icons.mjs`, `public/icons/*.png` | 앱 아이콘 | 5 |
| `src/globe/themes.ts` | 보기 방식(그림/위성)별 색 테마 | 6 |
| `src/globe/buildStyle.ts` | MapLibre 스타일(모든 지명 층) 만들기 | 6 |
| `src/globe/icons.ts` | 수도·도시·산 아이콘 그리기 | 6 |
| `src/globe/viewStorage.ts` | 마지막 보기 방식 기억 | 6 |
| `src/globe/GlobeView.tsx` | 지도 생성·정리·보기 전환 컴포넌트 | 7 |
| `src/components/InfoCard.tsx/.css` | 제목·확대 단계·보기 전환 버튼 | 7 |
| `src/components/SatelliteNotice.tsx/.css` | 위성 사진 실패 안내 | 7 |
| `src/App.tsx`, `src/main.tsx`, `src/styles/global.css`, `src/vite-env.d.ts`, `src/lib/registerPwa.ts` | 앱 시작점 | 7 |
| `index.html` | Vite 시작 HTML (기존 정적 페이지 대체) | 7 |
| `.claude/launch.json` | 개발 서버·기준 서버 실행 설정 | 8 |
| `.github/workflows/deploy.yml` | GitHub Pages 자동 배포 | 9 |
| `README.md` | 실행·데이터·배포 방법 | 9 |

---

### Task 1: 프로젝트 설정 파일과 설치

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `eslint.config.js`
- Modify: `.gitignore`

- [ ] **Step 1: `package.json` 만들기**

```json
{
  "name": "daedongyeo-globe",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "node scripts/path-safe-build.mjs",
    "lint": "eslint .",
    "preview": "vite preview",
    "data:download": "node scripts/download-raw.mjs",
    "data:build": "node scripts/build-data.mjs",
    "glyphs": "node scripts/download-glyphs.mjs",
    "icons": "node scripts/generate-icons.mjs"
  },
  "dependencies": {
    "maplibre-gl": "5.6.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.17.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.16",
    "globals": "^15.14.0",
    "sharp": "^0.35.3",
    "typescript": "~5.7.2",
    "typescript-eslint": "^8.18.2",
    "vite": "^6.0.7",
    "vite-plugin-pwa": "^0.21.1"
  }
}
```

- [ ] **Step 2: TypeScript 설정 3개 만들기**

`tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "types": ["node"],

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: `vite.config.ts` 만들기**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages(프로젝트 사이트)는 /저장소이름/ 아래에서 열리므로 배포할 때 BASE_PATH로 넘긴다.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  server: { port: 5180, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 서비스 워커는 src/lib/registerPwa.ts에서 직접 등록한다.
      injectRegister: null,
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: '대동여퀴즈 지구본',
        short_name: '지구본',
        description: '부모와 함께 지구본을 여행하며 지리를 익히는 어린이 교육 놀이',
        lang: 'ko',
        theme_color: '#0b1630',
        background_color: '#0b1630',
        display: 'standalone',
        categories: ['education', 'kids'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 지도 데이터·글꼴까지 미리 저장해서 그림 지도는 인터넷 없이도 열리게 한다.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,geojson,pbf}'],
        // 가장 큰 지도 파일(admin1-lines, 약 3.4MB)도 들어가도록 한도를 올린다.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
```

서비스 이름 "대동여퀴즈 지구본"은 임시다 (설계 문서 열린 질문 1). 이름이 정해지면 `vite.config.ts`, `index.html`, `src/components/InfoCard.tsx` 세 곳을 바꾼다.

- [ ] **Step 4: `eslint.config.js` 만들기**

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'dev-dist', 'data/raw'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
```

- [ ] **Step 5: `.gitignore`에 빌드 결과물 추가**

`.gitignore` 끝에 덧붙인다 (`node_modules/`는 이미 있음):

```
# 빌드 결과물
dist/
dev-dist/
*.local
```

- [ ] **Step 6: 설치**

Run: `npm install`
Expected: `added N packages` 출력, `package-lock.json` 생성, 오류 없음.

- [ ] **Step 7: 설치 확인**

Run: `node -p "require('./node_modules/maplibre-gl/package.json').version"`
Expected: `5.6.0`

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js .gitignore
git commit -m "chore: React + Vite + TypeScript 설정 추가"
```

---

### Task 2: 한글 경로 안전 빌드 스크립트

Windows에서 프로젝트 경로에 한글이 있으면 Vite 빌드가 깨질 수 있다. 숫자숲마을과 같은 방식으로, 영문 임시 폴더에 복사해 빌드한 뒤 `dist`만 다시 가져온다.

**Files:**
- Create: `scripts/path-safe-build.mjs`

- [ ] **Step 1: 스크립트 만들기**

```js
// 한글 등 ASCII가 아닌 문자가 들어간 경로(Windows)에서도 Vite 빌드가 되도록,
// 영문 임시 폴더에 빌드 재료를 복사해 빌드하고 dist만 다시 가져온다.
// 실행: npm run build
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { cp, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function needsAsciiMirror(projectPath, platform = process.platform) {
  return platform === 'win32' && /[^\x00-\x7F]/.test(projectPath);
}

export function safeMirrorName(projectPath) {
  const hash = createHash('sha256').update(projectPath).digest('hex').slice(0, 12);
  return `daedongyeo-build-${hash}`;
}

function run(command, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false, env: process.env });
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(new Error(`${basename(command)} exited with ${code ?? signal}`));
    });
  });
}

async function copyBuildInputs(projectRoot, mirrorRoot) {
  const entries = [
    'src',
    'public',
    'index.html',
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
  ];

  await mkdir(mirrorRoot, { recursive: true });
  for (const entry of entries) {
    await cp(join(projectRoot, entry), join(mirrorRoot, entry), { recursive: true, force: true });
  }
  await symlink(join(projectRoot, 'node_modules'), join(mirrorRoot, 'node_modules'), 'junction');
}

export async function buildProject(projectRoot) {
  const root = resolve(projectRoot);
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  await run(process.execPath, [tsc, '-b'], root);

  if (!needsAsciiMirror(root)) {
    const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
    await run(process.execPath, [vite, 'build'], root);
    return;
  }

  const mirrorRoot = join(tmpdir(), safeMirrorName(root));
  await rm(mirrorRoot, { recursive: true, force: true });

  try {
    await copyBuildInputs(root, mirrorRoot);
    const vite = join(mirrorRoot, 'node_modules', 'vite', 'bin', 'vite.js');
    await run(process.execPath, [vite, 'build'], mirrorRoot);
    await rm(join(root, 'dist'), { recursive: true, force: true });
    await cp(join(mirrorRoot, 'dist'), join(root, 'dist'), { recursive: true });
    console.log(`Path-safe build copied dist back to ${root}`);
  } finally {
    await rm(mirrorRoot, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  buildProject(projectRoot).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 2: 문법 확인**

Run: `node --check scripts/path-safe-build.mjs`
Expected: 아무 출력 없이 끝남 (빌드 자체는 작업 7에서 처음 돌린다).

- [ ] **Step 3: 커밋**

```bash
git add scripts/path-safe-build.mjs
git commit -m "build: 한글 경로에서도 빌드되는 스크립트 추가"
```

---

### Task 3: 지도 데이터 위치 이동과 보정 데이터

지도 데이터를 Vite가 그대로 배포하는 `public/data`로 옮기고, 설계 문서 8.3의 보정(독도·울릉도 추가, 어색한 지명 수정, 평양 중복 제거, 대한민국·서울 첫 화면 표시)을 빌드 단계에서 적용한다.

**Files:**
- Create: `data/overrides.json`
- Modify: `scripts/build-data.mjs` (윗부분 상수·`write`, 2번 도시 구역)
- Create (생성됨): `public/data/*.geojson`
- ⚠ Delete: `data/*.geojson` 12개 (같은 내용이 `public/data`에 새로 만들어짐)

- [ ] **Step 1: `data/overrides.json` 만들기**

```json
{
  "names": {
    "제주 아일랜드": "제주도",
    "치리산": "지리산",
    "동조선만": "동한만",
    "평양직할시": "평양",
    "오스트레일리아 대륙": "오세아니아",
    "이즈-쇼토": "이즈 제도"
  },
  "suffixRules": [
    [" 아일랜드", "섬"],
    [" 레인지", "산맥"],
    [" 마운틴스", "산맥"],
    [" 페닌슐라", "반도"],
    [" 샨", "산"],
    ["-산", "산"]
  ],
  "minz": {
    "country-labels": { "대한민국": 0.5 },
    "places": { "서울특별시": 1 }
  },
  "add": {
    "regions": [
      { "lng": 131.8669, "lat": 37.2422, "properties": { "ko": "독도", "en": "Dokdo", "cls": "island", "minz": 4, "rank": 0 } },
      { "lng": 130.8667, "lat": 37.4983, "properties": { "ko": "울릉도", "en": "Ulleungdo", "cls": "island", "minz": 4, "rank": 0 } }
    ]
  }
}
```

규칙:
- `names`는 통째로 바꿀 지명이다. `suffixRules`보다 먼저 적용한다. "제주 아일랜드"는 끝말 규칙을 쓰면 "제주섬"이 되므로 여기서 먼저 "제주도"로 바꾼다.
- `suffixRules`는 끝말 규칙이다. 예를 들어 "유니맥 아일랜드"는 "유니맥섬"이 된다. 앞에 띄어쓰기가 있어야 하므로 나라 이름 "아일랜드"와 "롱아일랜드"는 바뀌지 않는다.
- `minz`의 키는 **바뀐 뒤의 이름**이다. 값이 작을수록 덜 확대해도 보인다.

- [ ] **Step 2: `scripts/build-data.mjs` 윗부분 바꾸기**

기존:

```js
const RAW = path.join(root, 'data', 'raw');
const OUT = path.join(root, 'data');

const read = (name) => JSON.parse(fs.readFileSync(path.join(RAW, `${name}.geojson`), 'utf8')).features;
const write = (name, features) => {
  const file = path.join(OUT, `${name}.geojson`);
  fs.writeFileSync(file, JSON.stringify({ type: 'FeatureCollection', features }));
  console.log(`${name}.geojson  ${features.length} features  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
};
```

새 코드:

```js
const RAW = path.join(root, 'data', 'raw');
const OUT = path.join(root, 'public', 'data');
const OVERRIDES = JSON.parse(fs.readFileSync(path.join(root, 'data', 'overrides.json'), 'utf8'));

const read = (name) => JSON.parse(fs.readFileSync(path.join(RAW, `${name}.geojson`), 'utf8')).features;
const write = (name, features) => {
  const out = applyOverrides(name, features);
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}.geojson`);
  fs.writeFileSync(file, JSON.stringify({ type: 'FeatureCollection', features: out }));
  console.log(`${name}.geojson  ${out.length} features  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
};

// ---------- 보정 데이터 (data/overrides.json) ----------
function fixName(ko) {
  if (OVERRIDES.names[ko]) return OVERRIDES.names[ko];
  for (const [from, to] of OVERRIDES.suffixRules) {
    if (ko.endsWith(from)) return ko.slice(0, -from.length) + to;
  }
  return ko;
}

function applyOverrides(name, features) {
  const minz = OVERRIDES.minz[name] ?? {};
  for (const f of features) {
    const p = f.properties;
    if (typeof p.ko === 'string' && p.ko) p.ko = fixName(p.ko);
    if (Object.hasOwn(minz, p.ko)) p.minz = minz[p.ko];
  }
  const added = (OVERRIDES.add[name] ?? []).map((a) => point(a.lng, a.lat, a.properties));
  return [...features, ...added];
}
```

(`point`는 파일 아래쪽에 정의돼 있지만, `write`가 처음 불리는 1번 나라 구역보다 위에 있으므로 문제없다.)

- [ ] **Step 3: 2번 도시 구역에서 평양 같은 중복 점 빼기**

기존:

```js
// ---------- 2. 도시 (수도 / 주도 / 일반 도시) ----------
write('places', read('ne_10m_populated_places').map((f) => {
  const p = f.properties;
  const cls = p.ADM0CAP === 1 ? 'capital' : p.FEATURECLA === 'Admin-1 capital' ? 'admin1' : 'city';
  return point(p.LONGITUDE, p.LATITUDE, {
    ko: pick(p.NAME_KO, p.NAME_EN, p.NAME),
    en: pick(p.NAME_EN, p.NAME),
    cls,
    minz: p.MIN_ZOOM,
    rank: p.LABELRANK,
    pop: p.POP_MAX,
    country: p.ADM0_A3,
  });
}));
```

새 코드:

```js
// ---------- 2. 도시 (수도 / 주도 / 일반 도시) ----------
const places = read('ne_10m_populated_places').map((f) => {
  const p = f.properties;
  const cls = p.ADM0CAP === 1 ? 'capital' : p.FEATURECLA === 'Admin-1 capital' ? 'admin1' : 'city';
  return point(p.LONGITUDE, p.LATITUDE, {
    ko: pick(p.NAME_KO, p.NAME_EN, p.NAME),
    en: pick(p.NAME_EN, p.NAME),
    cls,
    minz: p.MIN_ZOOM,
    rank: p.LABELRANK,
    pop: p.POP_MAX,
    country: p.ADM0_A3,
  });
});
// 같은 나라에 같은 이름의 수도가 있으면 일반 도시 점은 뺀다 (예: 평양이 두 번 찍히는 문제)
const capitals = new Set(places
  .filter((f) => f.properties.cls === 'capital')
  .map((f) => `${f.properties.country}|${f.properties.ko}`));
write('places', places.filter((f) => f.properties.cls === 'capital'
  || !capitals.has(`${f.properties.country}|${f.properties.ko}`)));
```

- [ ] **Step 4: 데이터 다시 만들기**

Run: `npm run data:build`
Expected: `public/data/`에 12개 파일 생성. `places.geojson`은 기존 7342개보다 조금 적고(중복 제거), `regions.geojson`은 기존 1281개 + 2 = `1283 features`.

- [ ] **Step 5: 보정 결과 확인**

Run:

```bash
node -e "
const fs=require('fs'); const r=n=>JSON.parse(fs.readFileSync('public/data/'+n+'.geojson','utf8')).features;
const all=['regions','marine-labels','peaks','places','country-labels','admin1-labels'].flatMap(n=>r(n).map(f=>[n,f.properties]));
console.log('독도/울릉도:', all.filter(([,p])=>p.ko==='독도'||p.ko==='울릉도').length);
console.log('평양 점:', r('places').filter(f=>f.properties.ko==='평양').length);
console.log('남은 \" 아일랜드\":', all.filter(([,p])=>/ 아일랜드$/.test(p.ko)).length);
console.log('지리산/제주도/동한만/오세아니아:', ['지리산','제주도','동한만','오세아니아'].map(k=>all.some(([,p])=>p.ko===k)).join(','));
console.log('대한민국 minz:', r('country-labels').find(f=>f.properties.id==='KOR').properties.minz);
"
```

Expected:

```
독도/울릉도: 2
평양 점: 1
남은 " 아일랜드": 0
지리산/제주도/동한만/오세아니아: true,true,true,true
대한민국 minz: 0.5
```

- [ ] **Step 6: ⚠ 옛 위치 데이터 지우기 (사용자 확인 후)**

사용자에게 "`data/` 바로 아래의 `.geojson` 12개를 지웁니다. 같은 내용이 보정이 적용된 채로 `public/data/`에 새로 만들어졌습니다. `data/raw/`와 `data/overrides.json`은 그대로 둡니다."라고 보여 주고 허락을 받는다.

Run: `git rm data/*.geojson`
Expected: `rm 'data/admin1-labels.geojson'` 등 12줄.

- [ ] **Step 7: 커밋**

```bash
git add data/overrides.json scripts/build-data.mjs public/data
git commit -m "feat: 지도 보정 데이터 적용, 지도 데이터를 public/data로 이동"
```

---

### Task 4: 오프라인용 지도 글꼴

지명 글자 중 한글은 기기 글꼴로 그리지만, 띄어쓰기·숫자·영문은 글꼴 파일(`.pbf`)이 필요하다. 이 파일을 앱에 포함해서 인터넷 없이도 지명이 깨지지 않게 한다.

**Files:**
- Create: `scripts/download-glyphs.mjs`
- Create (생성됨): `public/fonts/Noto Sans {Regular,Medium,Italic}/{0-255,256-511,8192-8447}.pbf`

- [ ] **Step 1: 스크립트 만들기**

```js
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
```

- [ ] **Step 2: 내려받기**

Run: `npm run glyphs`
Expected: `받음  ...` 9줄.

- [ ] **Step 3: 확인**

Run: `ls -R public/fonts | head -20 && du -sh public/fonts`
Expected: 폴더 3개 × 파일 3개, 합계 약 830KB.

- [ ] **Step 4: 커밋**

```bash
git add scripts/download-glyphs.mjs public/fonts
git commit -m "feat: 오프라인용 지도 글꼴 추가"
```

---

### Task 5: 앱 아이콘

**Files:**
- Create: `public/icons/icon.svg`, `scripts/generate-icons.mjs`
- Create (생성됨): `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`

- [ ] **Step 1: `public/icons/icon.svg` 만들기**

가장자리까지 배경을 채우고 지구본은 가운데 안전 영역(지름의 약 70%)에 둔다. 그래야 둥글게 잘리는 안드로이드 아이콘(maskable)에서도 잘리지 않는다.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="지구본">
  <rect width="512" height="512" fill="#0b1630"/>
  <circle cx="256" cy="256" r="176" fill="#9fd3f0"/>
  <path d="M170 150c40-30 100-28 120 6 14 24-6 44 10 66 18 26 54 18 60 50 6 30-30 52-62 44-30-8-36-40-66-44-34-4-58 22-86 4-26-16-20-58-6-84 8-16 14-30 30-42z" fill="#b8e0a0"/>
  <path d="M300 330c26-6 52 6 56 28 4 22-18 44-42 42-22-2-40-20-36-40 2-14 10-26 22-30z" fill="#f6d58e"/>
  <ellipse cx="256" cy="256" rx="80" ry="176" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="6"/>
  <path d="M256 80v352M80 256h352" stroke="#ffffff" stroke-opacity="0.5" stroke-width="6"/>
  <circle cx="256" cy="256" r="176" fill="none" stroke="#ffffff" stroke-width="10"/>
</svg>
```

- [ ] **Step 2: `scripts/generate-icons.mjs` 만들기**

```js
// public/icons/icon.svg를 PWA·홈 화면용 PNG로 만든다
// 실행: npm run icons
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const iconDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const svg = await readFile(join(iconDir, 'icon.svg'));

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of targets) {
  const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
  await writeFile(join(iconDir, name), png);
  console.log(`wrote ${name} (${size}x${size})`);
}
```

- [ ] **Step 3: 아이콘 만들기**

Run: `npm run icons`
Expected: `wrote icon-192.png (192x192)` 등 4줄.

- [ ] **Step 4: 눈으로 확인**

`public/icons/icon-512.png`를 이미지 보기로 연다. 남색 배경 위에 하늘색 지구본, 초록·노랑 땅, 흰 경선이 보이면 된다.

- [ ] **Step 5: 커밋**

```bash
git add public/icons scripts/generate-icons.mjs
git commit -m "feat: 앱 아이콘 추가"
```

---

### Task 6: 지구본 모듈 옮기기 (스타일·테마·아이콘·보기 기억)

`js/globe.js`의 내용을 역할별 TypeScript 파일로 나눈다. **지명 층, 필터, `LABEL_BOOST = 1`, 글자 크기, 색은 하나도 줄이거나 바꾸지 않는다** (지명 디테일 기준). 바뀌는 것은 두 가지뿐이다: 데이터·글꼴 주소를 배포 경로 기준으로 만들고, 글꼴을 앱 안의 `public/fonts`에서 읽는다.

**Files:**
- Create: `src/vite-env.d.ts`, `src/globe/themes.ts`, `src/globe/buildStyle.ts`, `src/globe/icons.ts`, `src/globe/viewStorage.ts`

- [ ] **Step 0: `src/vite-env.d.ts`** (`import.meta.env`와 PWA 모듈 타입. `buildStyle.ts`가 쓰므로 먼저 만든다)

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
```

- [ ] **Step 1: `src/globe/themes.ts`**

```ts
// 보기 방식별 색. 위성 지도는 어두운 사진 위에 흰 글씨 + 검은 테두리로 읽히게 한다.
export type MapView = 'map' | 'satellite';

export interface Theme {
  satellite: boolean;
  text: string;
  halo: string;
  water: string;
  ocean: string;
  oceanHalo: string;
  admin1: string;
  peak: string;
  geoLine: string;
  border: string;
  borderOpacity: number;
  river: string;
  mountain: string;
  desert: string;
  flat: string;
  otherRegion: string;
}

export const LAND_COLORS = ['#f6d58e', '#b8e0a0', '#f5b5a0', '#c9b8e8', '#a8d8c8', '#f2c6de', '#e8dca0'];
export const OCEAN_COLOR = '#9fd3f0';

export const THEMES: Record<MapView, Theme> = {
  map: {
    satellite: false,
    text: '#1d2433', halo: '#ffffff',
    water: '#2f6f9f', ocean: '#2a6496', oceanHalo: 'rgba(255,255,255,0.6)',
    admin1: '#6a5f73', peak: '#7a4b1e', geoLine: '#b5482f',
    border: '#5b6270', borderOpacity: 1, river: '#4fa3d9',
    mountain: '#8b4f1d', desert: '#b06a10', flat: '#4f6b2a', otherRegion: '#3d4a66',
  },
  satellite: {
    satellite: true,
    text: '#ffffff', halo: 'rgba(0,0,0,0.75)',
    water: '#bfe3ff', ocean: '#d6ecff', oceanHalo: 'rgba(0,0,0,0.5)',
    admin1: '#e8e2f0', peak: '#ffe0b3', geoLine: '#ffb199',
    border: '#ffffff', borderOpacity: 0.6, river: '#7cc4ff',
    mountain: '#ffd2a6', desert: '#ffe08a', flat: '#d8f0b0', otherRegion: '#e6ecff',
  },
};
```

- [ ] **Step 2: `src/globe/buildStyle.ts`**

```ts
import type { StyleSpecification } from 'maplibre-gl';
import { LAND_COLORS, OCEAN_COLOR, THEMES, type MapView } from './themes';

// 지명은 Natural Earth가 정한 "보이기 시작하는 확대 단계(minz)"보다 LABEL_BOOST만큼 일찍 보여준다.
const LABEL_BOOST = 1;

const FONT = {
  regular: ['Noto Sans Regular'],
  medium: ['Noto Sans Medium'],
  italic: ['Noto Sans Italic'],
};

// MapLibre는 데이터·글꼴 주소를 전체 주소로 받아야 안전하다. {fontstack} 같은 자리표시자가
// 인코딩되지 않도록 URL 객체 대신 문자열로 붙인다.
const ASSET_ROOT = `${window.location.origin}${import.meta.env.BASE_URL}`;

const source = (file: string) => ({ type: 'geojson', data: `${ASSET_ROOT}data/${file}.geojson` });
const visibleFrom = (offset = LABEL_BOOST) => ['>=', ['zoom'], ['-', ['get', 'minz'], offset]];
const koName = ['get', 'ko'];

export function buildStyle(view: MapView): StyleSpecification {
  const t = THEMES[view];
  const shown = (on: boolean) => (on ? 'visible' : 'none');
  const labelPaint = (color: unknown = t.text, haloWidth = 1.5) => ({
    'text-color': color,
    'text-halo-color': t.halo,
    'text-halo-width': haloWidth,
  });

  const style = {
    version: 8,
    projection: { type: 'globe' },
    glyphs: `${ASSET_ROOT}fonts/{fontstack}/{range}.pbf`,
    sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] },
    sources: {
      // NASA Blue Marble 위성 영상 (NASA GIBS, 퍼블릭 도메인, 확대 8단계까지)
      satellite: {
        type: 'raster',
        tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],
        tileSize: 256,
        maxzoom: 8,
        attribution: 'NASA Blue Marble (GIBS)',
      },
      countries: source('countries'),
      countryLabels: source('country-labels'),
      places: source('places'),
      admin1Labels: source('admin1-labels'),
      admin1Lines: source('admin1-lines'),
      marineLabels: source('marine-labels'),
      regions: source('regions'),
      peaks: source('peaks'),
      lakes: source('lakes'),
      lakeLabels: source('lake-labels'),
      rivers: source('rivers'),
      geoLines: source('geo-lines'),
    },
    layers: [
      // ---------- 바탕: 바다 · 땅 · 물 ----------
      { id: 'ocean', type: 'background', paint: { 'background-color': OCEAN_COLOR } },
      { id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: shown(t.satellite) } },
      {
        id: 'country-fill', type: 'fill', source: 'countries',
        layout: { visibility: shown(!t.satellite) },
        paint: {
          'fill-color': ['match', ['get', 'color'],
            1, LAND_COLORS[0], 2, LAND_COLORS[1], 3, LAND_COLORS[2], 4, LAND_COLORS[3],
            5, LAND_COLORS[4], 6, LAND_COLORS[5], LAND_COLORS[6]],
        },
      },
      {
        id: 'lake-fill', type: 'fill', source: 'lakes',
        layout: { visibility: shown(!t.satellite) },
        paint: { 'fill-color': OCEAN_COLOR },
      },
      {
        id: 'river-line', type: 'line', source: 'rivers', filter: visibleFrom(),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': t.river,
          'line-width': ['interpolate', ['linear'], ['zoom'],
            2, ['-', 1.6, ['*', ['get', 'rank'], 0.12]],
            8, ['-', 3.2, ['*', ['get', 'rank'], 0.2]]],
        },
      },

      // ---------- 경계선 ----------
      {
        id: 'admin1-line', type: 'line', source: 'admin1Lines', minzoom: 3, filter: visibleFrom(1.5),
        paint: { 'line-color': t.border, 'line-opacity': 0.45, 'line-width': 0.8, 'line-dasharray': [3, 2] },
      },
      {
        id: 'country-line', type: 'line', source: 'countries',
        paint: {
          'line-color': t.border,
          'line-opacity': t.borderOpacity,
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 6, 1.6],
        },
      },
      {
        id: 'geo-line', type: 'line', source: 'geoLines',
        paint: {
          'line-color': ['match', ['get', 'en'], 'Equator', '#e04848', 'International Date Line', '#7a5ccf', '#e08a3c'],
          'line-width': 1.4,
          'line-dasharray': [4, 3],
        },
      },

      // ---------- 지명 (아래쪽 레이어일수록 겹칠 때 먼저 가려짐) ----------
      {
        id: 'geo-line-label', type: 'symbol', source: 'geoLines',
        layout: {
          'symbol-placement': 'line', 'symbol-spacing': 600,
          'text-field': koName, 'text-font': FONT.medium, 'text-size': 12,
        },
        paint: labelPaint(t.geoLine),
      },
      {
        id: 'peak-label', type: 'symbol', source: 'peaks', filter: visibleFrom(),
        layout: {
          'icon-image': 'peak', 'icon-size': 1,
          'text-field': ['format', koName, {}, '\n', {},
            ['concat', ['number-format', ['get', 'elev'], { locale: 'ko-KR' }], 'm'], { 'font-scale': 0.8 }],
          'text-font': FONT.regular, 'text-size': 11,
          'text-anchor': 'top', 'text-offset': [0, 0.6],
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(t.peak),
      },
      {
        id: 'admin1-label', type: 'symbol', source: 'admin1Labels', filter: visibleFrom(),
        layout: {
          'text-field': koName, 'text-font': FONT.regular,
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 8, 13],
          'text-letter-spacing': 0.05, 'text-max-width': 6,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(t.admin1, 1.2),
      },
      {
        id: 'river-label', type: 'symbol', source: 'rivers',
        filter: ['all', ['!=', koName, ''], ['>=', ['zoom'], ['-', ['get', 'labelz'], LABEL_BOOST]]],
        layout: {
          'symbol-placement': 'line', 'symbol-spacing': 400,
          'text-field': koName, 'text-font': FONT.italic, 'text-size': 12,
        },
        paint: labelPaint(t.water),
      },
      {
        id: 'lake-label', type: 'symbol', source: 'lakeLabels', filter: visibleFrom(),
        layout: {
          'text-field': koName, 'text-font': FONT.italic, 'text-size': 11, 'text-max-width': 6,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(t.water, 1),
      },
      {
        id: 'region-label', type: 'symbol', source: 'regions',
        filter: ['all', ['!=', ['get', 'cls'], 'continent'], visibleFrom()],
        layout: {
          'text-field': koName, 'text-font': FONT.italic,
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 11, 6, 14],
          'text-max-width': 7, 'text-letter-spacing': 0.08,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(['match', ['get', 'cls'],
          'range/mtn', t.mountain,
          'desert', t.desert,
          ['plateau', 'plain', 'basin', 'lowland', 'valley', 'foothills', 'tundra', 'wetlands', 'delta'], t.flat,
          t.otherRegion], 1.2),
      },
      {
        id: 'city-label', type: 'symbol', source: 'places',
        filter: ['all', ['!=', ['get', 'cls'], 'capital'], visibleFrom()],
        layout: {
          'icon-image': ['match', ['get', 'cls'], 'admin1', 'admin1-capital', 'city'],
          'text-field': koName, 'text-font': FONT.regular,
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 8, 14],
          'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': 0.6,
          'text-justify': 'auto', 'text-max-width': 7,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(),
      },
      {
        id: 'marine-label', type: 'symbol', source: 'marineLabels',
        filter: ['all', ['!=', ['get', 'cls'], 'ocean'], visibleFrom()],
        layout: {
          'text-field': koName, 'text-font': FONT.italic,
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 12, 6, 15],
          'text-max-width': 6, 'text-letter-spacing': 0.1,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(t.water, 1),
      },
      {
        id: 'capital-label', type: 'symbol', source: 'places',
        filter: ['all', ['==', ['get', 'cls'], 'capital'], visibleFrom()],
        layout: {
          'icon-image': 'capital',
          'text-field': koName, 'text-font': FONT.medium,
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 12, 8, 15],
          'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': 0.7,
          'text-justify': 'auto',
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(),
      },
      {
        id: 'country-label', type: 'symbol', source: 'countryLabels', filter: visibleFrom(),
        layout: {
          'text-field': koName, 'text-font': FONT.medium,
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 12, 4, 16, 7, 20],
          'text-max-width': 6,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(t.text, 2),
      },
      {
        id: 'ocean-label', type: 'symbol', source: 'marineLabels',
        filter: ['==', ['get', 'cls'], 'ocean'],
        layout: {
          'text-field': koName, 'text-font': FONT.italic,
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 16, 5, 24],
          'text-letter-spacing': 0.4,
        },
        paint: { 'text-color': t.ocean, 'text-halo-color': t.oceanHalo, 'text-halo-width': 1 },
      },
      {
        id: 'continent-label', type: 'symbol', source: 'regions', maxzoom: 3,
        filter: ['==', ['get', 'cls'], 'continent'],
        layout: {
          'text-field': koName, 'text-font': FONT.medium, 'text-size': 20,
          'text-letter-spacing': 0.3, 'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff', 'text-halo-color': 'rgba(29, 36, 51, 0.7)', 'text-halo-width': 2,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 1, 3, 0],
        },
      },
    ],
  };

  // MapLibre의 식(expression) 타입은 튜플 유니온이라 배열 리터럴로는 추론이 안 되므로,
  // 완성된 스타일을 경계에서 한 번만 단언한다.
  return style as unknown as StyleSpecification;
}
```

- [ ] **Step 3: `src/globe/icons.ts`**

```ts
// 수도·도시·산 아이콘을 캔버스로 직접 그린다 (2배 해상도, pixelRatio 2로 등록)
function drawIcon(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  return ctx.getImageData(0, 0, size, size);
}

export const ICONS: Record<string, () => ImageData> = {
  capital: () => drawIcon(32, (ctx, s) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? s * 0.46 : s * 0.2;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      ctx.lineTo(s / 2 + r * Math.cos(a), s / 2 + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = '#e03a3a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
  }),
  'admin1-capital': () => drawIcon(18, (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#1d2433';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
  }),
  city: () => drawIcon(14, (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1d2433';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fill();
  }),
  peak: () => drawIcon(22, (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s / 2, 2);
    ctx.lineTo(s - 2, s - 3);
    ctx.lineTo(2, s - 3);
    ctx.closePath();
    ctx.fillStyle = '#8b4f1d';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fill();
  }),
};
```

- [ ] **Step 4: `src/globe/viewStorage.ts`**

```ts
import { THEMES, type MapView } from './themes';

const VIEW_KEY = 'globe-view';

// 저장이 막힌 환경(사생활 보호 모드 등)이면 그림 지도로 시작한다.
export function loadView(): MapView {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    return saved !== null && Object.hasOwn(THEMES, saved) ? (saved as MapView) : 'map';
  } catch {
    return 'map';
  }
}

export function saveView(view: MapView): void {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // 저장하지 못해도 보기 전환 자체에는 지장 없음
  }
}
```

- [ ] **Step 5: 타입 확인**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: 오류 없이 끝남. (`src`에 진입점이 아직 없어도 모듈 단위로 검사된다.)

- [ ] **Step 6: 커밋**

```bash
git add src/vite-env.d.ts src/globe
git commit -m "feat: 지구본 스타일·테마·아이콘을 TypeScript 모듈로 이전"
```

---

### Task 7: React 화면과 앱 시작점

**Files:**
- Create: `src/globe/GlobeView.tsx`, `src/components/InfoCard.tsx`, `src/components/InfoCard.css`, `src/components/SatelliteNotice.tsx`, `src/components/SatelliteNotice.css`, `src/App.tsx`, `src/main.tsx`, `src/styles/global.css`, `src/lib/registerPwa.ts`
- ⚠ Overwrite: `index.html` (정적 지구본 페이지 → Vite 시작 HTML)
- ⚠ Delete: `js/globe.js` (내용은 작업 6에서 `src/globe/`로 옮겨짐)

- [ ] **Step 1: `src/globe/GlobeView.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildStyle } from './buildStyle';
import { ICONS } from './icons';
import type { MapView } from './themes';

declare global {
  interface Window {
    // 개발 중 브라우저 콘솔에서 지도를 점검하기 위한 연결 (배포 빌드에는 없음)
    __map?: maplibregl.Map;
  }
}

interface GlobeViewProps {
  view: MapView;
  onZoomChange: (zoom: number) => void;
  onSatelliteError: () => void;
}

export function GlobeView({ view, onZoomChange, onSatelliteError }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const appliedView = useRef(view);
  const callbacks = useRef({ onZoomChange, onSatelliteError });

  useEffect(() => {
    callbacks.current = { onZoomChange, onSatelliteError };
  }, [onZoomChange, onSatelliteError]);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: buildStyle(appliedView.current),
      center: [127.5, 36],
      zoom: 1.6,
      maxZoom: 10,
      // 한글은 서버 글꼴 대신 기기에 깔린 한글 글꼴로 그린다
      localIdeographFontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      attributionControl: { customAttribution: 'Natural Earth' },
    });

    map.on('styleimagemissing', (e) => {
      const make = ICONS[e.id];
      if (make && !map.hasImage(e.id)) map.addImage(e.id, make(), { pixelRatio: 2 });
    });
    map.on('error', (e) => {
      if ('sourceId' in e && e.sourceId === 'satellite') callbacks.current.onSatelliteError();
    });
    const reportZoom = () => callbacks.current.onZoomChange(Math.round(map.getZoom() * 10) / 10);
    map.on('zoom', reportZoom);
    map.on('load', reportZoom);

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.GlobeControl(), 'top-right');

    mapRef.current = map;
    if (import.meta.env.DEV) window.__map = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedView.current === view) return;
    appliedView.current = view;
    map.setStyle(buildStyle(view)); // 바뀐 색·레이어만 골라서 적용됨
  }, [view]);

  return <div ref={containerRef} className="globe" />;
}
```

- [ ] **Step 2: `src/components/InfoCard.tsx`와 `InfoCard.css`**

`src/components/InfoCard.tsx`:

```tsx
import type { MapView } from '../globe/themes';
import './InfoCard.css';

const VIEW_LABELS: Record<MapView, string> = { map: '그림 지도', satellite: '위성 지도' };

interface InfoCardProps {
  zoom: number | null;
  view: MapView;
  onViewChange: (view: MapView) => void;
}

export function InfoCard({ zoom, view, onViewChange }: InfoCardProps) {
  return (
    <div className="info-card">
      <h1>대동여퀴즈 지구본</h1>
      <p>확대할수록 더 많은 지명이 보여요</p>
      <p className="info-card__zoom">
        확대 단계 <b>{zoom === null ? '-' : zoom.toFixed(1)}</b>
      </p>
      <div className="info-card__views" role="group" aria-label="지도 보기 방식">
        {(Object.keys(VIEW_LABELS) as MapView[]).map((v) => (
          <button key={v} type="button" aria-pressed={v === view} onClick={() => onViewChange(v)}>
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
```

`src/components/InfoCard.css`:

```css
.info-card {
  position: absolute; top: 16px; left: 16px; z-index: 1;
  padding: 12px 16px; border-radius: 14px;
  background: var(--card-bg); color: var(--card-text);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  max-width: calc(100vw - 32px); box-sizing: border-box;
}
.info-card h1 { margin: 0 0 4px; font-size: 18px; }
.info-card p { margin: 0; font-size: 13px; color: var(--card-sub); }
.info-card__zoom { margin-top: 6px; font-size: 12px; }
.info-card__views { display: flex; gap: 4px; margin-top: 10px; padding: 3px; border-radius: 10px; background: #e8ecf3; }
.info-card__views button {
  flex: 1; padding: 6px 12px; border: 0; border-radius: 8px;
  background: transparent; color: var(--card-sub); font: inherit; font-size: 13px; cursor: pointer;
}
.info-card__views button[aria-pressed="true"] {
  background: #ffffff; color: var(--card-text); font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
```

- [ ] **Step 3: `src/components/SatelliteNotice.tsx`와 `SatelliteNotice.css`**

`src/components/SatelliteNotice.tsx`:

```tsx
import './SatelliteNotice.css';

interface SatelliteNoticeProps {
  onUseMap: () => void;
}

// 위성 사진(NASA GIBS)을 못 불러올 때 그림 지도로 바꾸도록 안내한다. 그림 지도는 기기 안 데이터로 동작한다.
export function SatelliteNotice({ onUseMap }: SatelliteNoticeProps) {
  return (
    <div className="satellite-notice" role="status">
      <p>위성 사진을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>
      <button type="button" onClick={onUseMap}>그림 지도로 보기</button>
    </div>
  );
}
```

`src/components/SatelliteNotice.css`:

```css
.satellite-notice {
  position: absolute; left: 50%; bottom: 32px; z-index: 1; transform: translateX(-50%);
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 14px;
  background: var(--card-bg); color: var(--card-text);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  width: max-content; max-width: calc(100vw - 32px); box-sizing: border-box;
}
.satellite-notice p { margin: 0; font-size: 14px; }
.satellite-notice button {
  flex: none; padding: 8px 14px; border: 0; border-radius: 10px;
  background: #2a6496; color: #ffffff; font: inherit; font-size: 14px; cursor: pointer;
}
```

- [ ] **Step 4: `src/App.tsx`**

```tsx
import { useCallback, useState } from 'react';
import { GlobeView } from './globe/GlobeView';
import { loadView, saveView } from './globe/viewStorage';
import type { MapView } from './globe/themes';
import { InfoCard } from './components/InfoCard';
import { SatelliteNotice } from './components/SatelliteNotice';

export function App() {
  const [view, setView] = useState<MapView>(loadView);
  const [zoom, setZoom] = useState<number | null>(null);
  const [satelliteFailed, setSatelliteFailed] = useState(false);

  const changeView = useCallback((next: MapView) => {
    setView(next);
    saveView(next);
    setSatelliteFailed(false);
  }, []);
  const handleSatelliteError = useCallback(() => setSatelliteFailed(true), []);

  return (
    <div className="app">
      <GlobeView view={view} onZoomChange={setZoom} onSatelliteError={handleSatelliteError} />
      <InfoCard zoom={zoom} view={view} onViewChange={changeView} />
      {view === 'satellite' && satelliteFailed && <SatelliteNotice onUseMap={() => changeView('map')} />}
    </div>
  );
}
```

- [ ] **Step 5: `src/styles/global.css`**

```css
:root {
  --space: #0b1630;
  --card-bg: rgba(255, 255, 255, 0.92);
  --card-text: #1d2433;
  --card-sub: #5a6478;
}
html, body, #root { margin: 0; height: 100%; }
body {
  background: var(--space);
  font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
}
.app { position: relative; height: 100%; overflow: hidden; }
.globe {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 50%, #17284d 0%, var(--space) 70%);
}
```

- [ ] **Step 6: `src/lib/registerPwa.ts`, `src/main.tsx`**

`src/lib/registerPwa.ts`:

```ts
// 서비스 워커를 등록한다. 실패해도 앱은 그대로 동작하므로 오류는 기록만 한다.
export async function registerPwa(): Promise<void> {
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  } catch (error) {
    console.error('PWA registration failed', error);
  }
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './App';
import { registerPwa } from './lib/registerPwa';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void registerPwa();
```

- [ ] **Step 7: ⚠ `index.html` 덮어쓰기 (사용자 확인 후)**

사용자에게 "지금의 정적 지구본 페이지 `index.html`을 Vite 시작 HTML로 바꿉니다. 지구본 화면은 `src/` 아래 React 코드가 대신 그립니다."라고 보여 주고 허락을 받는다. 그다음 `index.html` 전체를 아래로 바꾼다.

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0b1630" />
    <meta name="description" content="부모와 함께 지구본을 여행하며 지리를 익히는 어린이 교육 놀이" />
    <title>대동여퀴즈 지구본</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: ⚠ `js/globe.js` 지우기 (사용자 확인 후)**

사용자에게 "`js/globe.js`를 지웁니다. 내용은 `src/globe/` 네 파일로 옮겨졌습니다."라고 보여 주고 허락을 받는다.

Run: `git rm js/globe.js`
Expected: `rm 'js/globe.js'`

- [ ] **Step 9: 빌드와 린트 확인**

Run: `npm run build`
Expected: `tsc -b` 오류 없음 → `vite build` 완료 → `PWA v0.21.x ... precache N entries` → `Path-safe build copied dist back to ...`. `dist/data/`, `dist/fonts/`, `dist/sw.js`가 생긴다.

Run: `npm run lint`
Expected: 오류 0개. 경고는 있어도 됨.

- [ ] **Step 10: 커밋**

```bash
git add index.html src
git commit -m "feat: 지구본을 React 앱으로 이전, 위성 사진 실패 안내 추가"
```

---

### Task 8: 실행 설정과 지명 디테일 비교 (기준: 대동여퀴즈 폴더)

**Files:**
- Modify: `.claude/launch.json`

- [ ] **Step 1: `.claude/launch.json` 바꾸기**

`globe`는 새 앱 개발 서버(5180)이고, `baseline`은 비교용으로 옛 폴더의 지구본을 띄운다(5181). `baseline`은 작업 9 끝에서 지운다.

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "globe",
      "runtimeExecutable": "node",
      "runtimeArgs": ["node_modules/vite/bin/vite.js"],
      "port": 5180
    },
    {
      "name": "baseline",
      "runtimeExecutable": "python",
      "runtimeArgs": ["-m", "http.server", "5181", "--bind", "127.0.0.1", "--directory", "D:/결과물/대동여퀴즈"],
      "port": 5181
    }
  ]
}
```

- [ ] **Step 2: 두 서버 띄우기**

브라우저 창에서 `globe`와 `baseline`을 각각 실행한다 (`preview_start`의 name). 두 탭 모두 화면 크기를 1280×800으로 맞춘다 (`resize_window`). 크기가 다르면 지명 수 비교가 틀어진다.

- [ ] **Step 3: 같은 세 장면에서 지명 수 세기**

두 탭에서 각각 아래 코드를 콘솔(`javascript_tool`)로 실행한다. 새 앱은 `window.__map`, 기준 페이지는 전역 `map`을 쓴다.

```js
const m = window.__map ?? map;
const scenes = [[[127.5, 36], 1.6], [[127.8, 36.3], 5.2], [[127.6, 36.6], 7.2]];
const result = [];
for (const [center, zoom] of scenes) {
  m.jumpTo({ center, zoom });
  await new Promise((r) => m.once('idle', r));
  await new Promise((r) => setTimeout(r, 1500));
  const counts = {};
  for (const f of m.queryRenderedFeatures()) {
    if (f.layer.type === 'symbol') counts[f.layer.id] = (counts[f.layer.id] ?? 0) + 1;
  }
  result.push({ zoom, counts });
}
result;
```

- [ ] **Step 4: 비교 기준 확인**

통과 기준: 세 장면 모두에서 **새 앱의 층별 지명 수 ≥ 기준 페이지의 층별 지명 수**.

허용되는 차이:
- `city-label`이 평양 중복 제거로 1개 적을 수 있다.
- `region-label`이 독도·울릉도로 늘 수 있다.
- `country-label`·`capital-label`이 대한민국·서울 첫 화면 표시로 늘 수 있다.

이 밖에 줄어든 층이 있으면 작업 6의 스타일이 원본과 같은지 지워지기 전 `js/globe.js`와 대조해 고친다. 원본은 `git log --oneline -- js/globe.js`로 지우기 직전 커밋을 찾은 뒤 `git show <그 커밋>~1:js/globe.js`로 본다.

- [ ] **Step 5: 눈으로 확인**

새 앱 탭에서 확인한다.
1. 첫 화면에 "대한민국"과 서울 별표가 보인다.
2. 한반도 확대 5 근처에서 동해에 "독도"와 "울릉도"가 보인다.
3. 확대 7 근처에서 "지리산 1,915m"가 보이고 "치리산"은 없다.
4. "위성 지도" 버튼을 누르면 사진 지도와 흰 글씨로 바뀌고, 새로고침해도 위성 지도로 시작한다.

- [ ] **Step 6: 위성 사진 실패 안내 확인**

새 앱 탭에서 위성 지도로 바꾼 뒤 콘솔에서 실행한다.

```js
window.__map.fire('error', { sourceId: 'satellite', error: new Error('test') });
```

Expected: 화면 아래에 "위성 사진을 불러오지 못했어요…"와 [그림 지도로 보기] 버튼이 뜬다. 버튼을 누르면 그림 지도로 바뀌고 안내가 사라진다.

- [ ] **Step 7: 커밋**

```bash
git add .claude/launch.json
git commit -m "chore: 개발 서버와 지명 디테일 비교용 기준 서버 설정"
```

---

### Task 9: 깃허브 연결과 GitHub Pages 배포

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`, `.claude/launch.json` (baseline 항목 제거)

사용자가 할 일 (Claude가 대신할 수 없음):
1. github.com에서 README 없이 빈 저장소를 만들고 주소(`https://github.com/starbottle19/<이름>.git`)를 알려 준다.
2. 저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 바꾼다.

- [ ] **Step 1: `.github/workflows/deploy.yml` 만들기**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          BASE_PATH: /${{ github.event.repository.name }}/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: `README.md`의 "실행"과 "구성" 바꾸기**

"## 실행" 구역 전체를 아래로 바꾼다.

````markdown
## 실행

```bash
npm install
```

```bash
npm run dev
```

브라우저에서 http://localhost:5180 을 엽니다.

배포용 빌드는 `npm run build`로 만듭니다. 경로에 한글이 있어도 되도록 영문 임시 폴더에서 빌드한 뒤 `dist/`로 가져옵니다.
`main` 브랜치에 푸시하면 GitHub Actions가 GitHub Pages로 자동 배포합니다.
````

"## 지도 데이터 다시 만들기"의 두 명령을 `npm run data:download`, `npm run data:build`로 바꾸고, 설명의 `data/*.geojson`을 `public/data/*.geojson`으로 바꾼다. 그 아래에 한 줄을 덧붙인다.

```markdown
지명 수정·장소 추가·표시 단계 조정은 `data/overrides.json`에서 합니다.
```

"## 구성" 목록 전체를 아래로 바꾼다.

```markdown
- `src/globe/` — 지구본 스타일(`buildStyle.ts`), 보기 테마(`themes.ts`), 아이콘, 보기 기억, `GlobeView` 컴포넌트
- `src/components/` — 정보 카드, 위성 사진 실패 안내
- `scripts/build-data.mjs` — 원본 → 경량 GeoJSON 변환 (보정 데이터·강 한국어 이름 적용)
- `scripts/download-raw.mjs`, `scripts/download-glyphs.mjs`, `scripts/generate-icons.mjs` — 원본 데이터·글꼴·아이콘 준비
- `scripts/path-safe-build.mjs` — 한글 경로 안전 빌드
- `public/data/`, `public/fonts/`, `public/icons/` — 앱과 함께 배포되는 지도 데이터·글꼴·아이콘
- `data/overrides.json` — 지명 수정표, 추가 장소(독도·울릉도), 표시 단계 조정
```

- [ ] **Step 3: `baseline` 항목 지우기**

작업 8 비교를 통과했으므로 `.claude/launch.json`에서 `"name": "baseline"` 객체를 지우고 `globe` 항목만 남긴다.

- [ ] **Step 4: 커밋**

```bash
git add .github/workflows/deploy.yml README.md .claude/launch.json
git commit -m "ci: GitHub Pages 자동 배포 추가, README 갱신"
```

- [ ] **Step 5: 원격 저장소 연결과 푸시 (사용자가 준 주소로)**

Run: `git remote add origin <사용자가 준 주소>`, 이어서 `git push -u origin main`
Expected: `branch 'main' set up to track 'origin/main'`. 처음 푸시할 때 Git Credential Manager 로그인 창이 뜨면 사용자가 직접 로그인한다.

- [ ] **Step 6: 배포 확인**

저장소 Actions 탭에서 "Deploy to GitHub Pages"가 초록색으로 끝나는지 확인한다. 사용자에게 Actions 화면을 열어 달라고 하거나, 브라우저 창에서 `https://github.com/starbottle19/<이름>/actions`를 연다. 그다음 `https://starbottle19.github.io/<이름>/`을 연다.

Expected:
- 지구본과 지명이 보인다.
- "위성 지도"로 바뀐다.
- 개발자 도구 Network에서 `data/*.geojson`과 `fonts/...pbf`가 `/<이름>/` 경로로 200 응답을 받는다.

---

## 계획 1이 끝나면 확인되는 것

- [ ] `npm run build`와 `npm run lint`가 통과한다.
- [ ] 지명 디테일이 기준(대동여퀴즈 폴더)과 같거나 많다 (작업 8).
- [ ] 독도·울릉도가 보이고, 수정표의 지명이 바뀌었고, 평양이 한 번만 찍힌다.
- [ ] 그림/위성 지도 전환이 되고 선택을 기억하며, 위성 실패 시 안내가 뜬다.
- [ ] GitHub Pages 주소에서 앱이 열리고 홈 화면에 추가할 수 있다.

다음은 **계획 2: 여행 엔진과 미션**이다.
