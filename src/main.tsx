import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// 글꼴은 한국어·라틴 묶음만 부른다. 기본 불러오기는 한국어를 잘게 나눈 조각에 라틴 확장·베트남어까지 더해
// 앱이 미리 저장하는 글꼴이 woff2 174개(약 2.5MB)가 된다 — 한국어 통 파일 + 라틴이면 4개(약 0.8MB)
import '@fontsource/jua/korean-400.css';
import '@fontsource/jua/latin-400.css';
import '@fontsource/gowun-dodum/korean-400.css';
import '@fontsource/gowun-dodum/latin-400.css';
import './styles/tokens.css';
import './styles/global.css';
import './ui/ui.css';
import { App } from './App';
import { registerPwa } from './lib/registerPwa';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void registerPwa();
