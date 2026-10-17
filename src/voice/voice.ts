// 유아 음성 재생 (계획 4 작업 6, D8·D9)
// 녹음 파일 목록(public/voice/manifest.json, npm run voice:script가 만듦)에 있는 문장만 재생한다 —
// 파일이 없는 문장은 요청하지 않으니 404나 콘솔 오류가 없고, 화면에는 글(자막)만 남는다.
// 소리 하나(HTMLAudioElement)를 돌려 쓰고, 새로 재생하면 앞 소리를 멈춘다. 재생에 실패하면 조용히 넘어간다.
import { getSave } from '../progress/store';

const BASE = `${import.meta.env.BASE_URL}voice/`;
// 0바이트 무음 wav: 처음 누른 순간 이것을 재생해 소리를 '깨워' 둔다 (iOS 사파리는 누르는 순간에 한 번 재생한 소리만 나중에 스스로 재생할 수 있다)
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

/** 문장 id → 파일 이름 (녹음 파일이 있는 문장만) */
let files: Record<string, string> = {};
const listeners = new Set<() => void>();
const manifestReady: Promise<void> = fetch(`${BASE}manifest.json`)
  .then((r) => (r.ok ? r.json() : null))
  .then((m: { files?: Record<string, string> } | null) => {
    if (m?.files && typeof m.files === 'object') files = m.files;
  })
  .catch(() => undefined)
  .finally(() => listeners.forEach((l) => l()));

export const subscribeVoiceFiles = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getVoiceFiles = () => files;

let audio: HTMLAudioElement | null = null;
let queue: string[] = [];
/** 재생 요청마다 늘린다. 목록·파일을 기다리거나 미루는 사이 새 요청·멈춤이 오면 앞 요청은 버린다 */
let token = 0;
let timer = 0;
/** 앱을 한 번이라도 눌렀는지. 그전에는 브라우저가 자동 재생을 막으므로 시도하지 않는다 */
let woken = false;
/** 지금 재생 중인 문장 파일 주소 */
let current = '';

// 파일은 audio 요소가 직접 받지 않고 fetch로 받아 재생한다 — audio 요소는 일부분(Range) 요청을 보내서
// 서비스 워커가 파일 전체를 저장하지 못한다. fetch로 받으면 처음 들을 때 통째로 저장돼(vite.config.ts runtimeCaching) 인터넷이 없어도 다시 들린다
const urls = new Map<string, Promise<string>>();
function fileUrl(id: string): Promise<string> {
  let url = urls.get(id);
  if (!url) {
    url = fetch(BASE + files[id])
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.blob();
      })
      .then((blob) => URL.createObjectURL(blob));
    // 못 받았으면(인터넷 없이 처음 듣는 문장 등) 다음에 다시 받아 본다
    url.catch(() => urls.delete(id));
    urls.set(id, url);
  }
  return url;
}

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    // 한 문장이 끝나거나 못 읽으면 다음 문장으로 (깨울 때 재생한 무음이 끝난 것은 세지 않는다)
    const done = () => audio?.src === current && playNext();
    audio.addEventListener('ended', done);
    audio.addEventListener('error', done);
  }
  return audio;
}

function playNext() {
  const id = queue.shift();
  if (!id) return;
  const t = token;
  fileUrl(id).then(
    (src) => {
      if (t !== token) return;
      const a = element();
      a.src = current = src;
      // 자동 재생이 막히거나 다음 요청에 끊기면 실패한다 — 자막이 있으니 조용히 넘어간다
      a.play().catch(() => undefined);
    },
    () => t === token && playNext(),
  );
}

const WAKE_EVENTS = ['click', 'touchend', 'keydown'] as const;
function wake() {
  if (woken) return;
  woken = true;
  for (const type of WAKE_EVENTS) document.removeEventListener(type, wake, true);
  const a = element();
  a.src = SILENT;
  a.play().catch(() => undefined);
}
// 앱에서 처음 누른 순간(여권 만들기·장소 표·출발 등 어디든)에 깨운다 — 출발을 누른 그 순간 첫 문장이 재생되게 먼저(capture) 받는다
for (const type of WAKE_EVENTS) document.addEventListener(type, wake, { capture: true, passive: true });

/** 재생 중인 소리를 멈추고 기다리던 문장을 버린다 */
export function stopVoice(): void {
  token += 1;
  queue = [];
  // 앞 문장의 늦은 'ended'·'error'가 다음 목록의 문장을 꺼내지 않게 지금 문장 표시도 지운다 (새 문장을 재생할 때 다시 정한다)
  current = '';
  clearTimeout(timer);
  if (audio && !audio.paused) audio.pause();
}

/** 문장들을 차례로 재생한다 (앞 소리는 멈춘다). 소리를 껐거나 녹음 파일이 없는 문장은 건너뛴다. delayMs만큼 미뤄 시작할 수 있다 */
export function playVoice(ids: (string | null | undefined)[], delayMs = 0): void {
  stopVoice();
  if (!woken || !getSave().settings.voiceOn) return;
  const t = token;
  void manifestReady.then(() => {
    if (t !== token) return;
    queue = ids.filter((id): id is string => !!id && id in files);
    // 뒤 문장도 미리 받아 둬서 문장 사이가 끊기지 않게 한다
    queue.forEach(fileUrl);
    if (!queue.length) return;
    if (delayMs > 0) timer = window.setTimeout(() => t === token && playNext(), delayMs);
    else playNext();
  });
}
