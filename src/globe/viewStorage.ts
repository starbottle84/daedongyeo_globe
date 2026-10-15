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
