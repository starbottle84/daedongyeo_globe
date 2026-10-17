import { useEffect, useSyncExternalStore } from 'react';
import { useSave } from '../progress/store';
import { getVoiceFiles, playVoice, stopVoice, subscribeVoiceFiles } from './voice';

/** 이 문장을 지금 들려줄 수 있는지: 소리를 켰고 녹음 파일이 있다. 파일 목록을 받으면 다시 그린다 */
export function useVoiceReady(id: string | null | undefined): boolean {
  const on = useSave().settings.voiceOn;
  const files = useSyncExternalStore(subscribeVoiceFiles, getVoiceFiles);
  return on && !!id && id in files;
}

/** 녹음 파일이 몇 개 있는지 (부모님 공간 안내) */
export function useVoiceFileCount(): number {
  return Object.keys(useSyncExternalStore(subscribeVoiceFiles, getVoiceFiles)).length;
}

/** 문장 목록이 바뀌면(단계·미션·결과가 바뀌면) 처음부터 재생하고, 그 화면을 떠나면 멈춘다. null이면 재생하지 않는다 (유아가 아닐 때) */
export function useAutoVoice(ids: (string | null)[] | null, delayMs = 0): void {
  const key = ids ? ids.filter(Boolean).join(' ') : '';
  useEffect(() => {
    if (!key) return undefined;
    playVoice(key.split(' '), delayMs);
    return stopVoice;
  }, [key, delayMs]);
}
