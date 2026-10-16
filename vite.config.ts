import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages(프로젝트 사이트)는 /저장소이름/ 아래에서 열리므로 배포할 때 BASE_PATH로 넘긴다.
// 지도 데이터 주소(import.meta.env.BASE_URL + 'data/...')가 깨지지 않도록 항상 '/'로 끝나게 맞춘다.
const rawBase = process.env.BASE_PATH || '/';
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export default defineConfig({
  base,
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
        // 지도 데이터·글꼴(지도용 pbf, 화면용 woff2)까지 미리 저장해서 그림 지도는 인터넷 없이도 열리게 한다.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,geojson,pbf,woff2}'],
        // 가장 큰 지도 파일(admin1-lines, 약 3.4MB)도 들어가도록 한도를 올린다.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
