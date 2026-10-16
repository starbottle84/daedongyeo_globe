type UpdateListener = (apply: () => void) => void;

let pendingApply: (() => void) | null = null;
const listeners = new Set<UpdateListener>();

// 새 버전이 준비되면 알려 준다. 받은 apply를 부르면 새 버전으로 새로고침한다.
// 이미 준비된 뒤에 듣기 시작해도 바로 알려 준다.
export function onUpdateReady(listener: UpdateListener): () => void {
  listeners.add(listener);
  if (pendingApply) listener(pendingApply);
  return () => {
    listeners.delete(listener);
  };
}

// 서비스 워커를 등록한다. 실패해도 앱은 그대로 동작하므로 오류는 기록만 한다.
export async function registerPwa(): Promise<void> {
  try {
    const { registerSW } = await import('virtual:pwa-register');
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        const apply = () => void updateSW(true);
        pendingApply = apply;
        listeners.forEach((listener) => listener(apply));
      },
    });
  } catch (error) {
    console.error('PWA registration failed', error);
  }
}
