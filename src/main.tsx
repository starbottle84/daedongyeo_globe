import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/jua';
import '@fontsource/gowun-dodum';
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
