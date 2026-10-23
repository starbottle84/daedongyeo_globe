import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages(프로젝트 사이트)는 /저장소이름/ 아래에서 열리므로 배포할 때 BASE_PATH로 넘긴다.
// 지도 데이터 주소(import.meta.env.BASE_URL + 'data/...')가 깨지지 않도록 항상 '/'로 끝나게 맞춘다.
const rawBase = process.env.BASE_PATH || '/';
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export default defineConfig({
  base,
  build: {
    // 국기 그림(나라 퀴즈 191개국)은 JS 안에 넣지 않고 파일로 내보낸다 — 다 넣으면 앱 파일이 커진다.
    // 파일은 오프라인 저장(workbox globPatterns의 svg)에 들어간다. 다른 작은 파일은 Vite 기본값대로
    assetsInlineLimit: (file) => (/[\\/]assets[\\/]flags[\\/]/.test(file) ? false : undefined),
  },
  server: { port: 5180, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      // 새 버전을 바로 적용하지 않고 안내만 한다 (여행 도중 자동 새로고침으로 진행이 날아가지 않게)
      registerType: 'prompt',
      // 서비스 워커는 src/lib/registerPwa.ts에서 직접 등록한다.
      injectRegister: null,
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: '대동여퀴즈 지구본',
        short_name: '지구본',
        description: '부모와 함께 지구본을 여행하며 지리를 익히는 어린이 교육 놀이',
        lang: 'ko',
        theme_color: '#1A2C49',
        background_color: '#1A2C49',
        display: 'standalone',
        categories: ['education', 'kids'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 지도 데이터·글꼴(지도용 pbf, 화면용 woff2)까지 미리 저장해서 그림 지도는 인터넷 없이도 열리게 한다.
        // 유아 음성은 녹음 파일 목록(manifest.json)만 미리 저장한다 — 목록이 있어야 인터넷 없이도 들었던 문장을 다시 재생한다
        globPatterns: ['**/*.{js,css,html,svg,png,ico,geojson,pbf,woff2}', 'voice/manifest.json'],
        // 가장 큰 지도 파일(admin1-lines, 약 3.4MB)도 들어가도록 한도를 올린다.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // 유아 음성 파일은 용량이 커서 미리 저장하지 않고, 처음 들을 때 저장해 두고 다음부터 저장본을 쓴다.
        // (앱이 fetch로 파일 전체를 받으므로 일부분(206) 응답이 아니라 전체(200) 응답이 저장된다 — src/voice/voice.ts)
        // 인터넷 없이 처음 듣는 문장은 받지 못해 조용히 자막만 보인다
        runtimeCaching: [
          {
            urlPattern: /\/voice\/[^/]+\.(?:mp3|m4a)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'voice',
              expiration: { maxEntries: 400 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
});
