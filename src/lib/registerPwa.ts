// 서비스 워커를 등록한다. 실패해도 앱은 그대로 동작하므로 오류는 기록만 한다.
export async function registerPwa(): Promise<void> {
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  } catch (error) {
    console.error('PWA registration failed', error);
  }
}
