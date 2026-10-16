import { useState } from 'react';
import type { Tier } from '../../content/types';
import { afterWrong } from '../judge';
import type { Outcome } from './types';

// 보기를 고르는 미션(고르기·방향)의 시도 처리:
// 틀린 보기는 기억하고, 유아는 정답을 반짝여 주고, 저학년·고학년은 두 번 틀리면 정답을 보여 준다.
export function useTries<T>(answer: T, tier: Tier) {
  const [attempts, setAttempts] = useState(0);
  const [wrong, setWrong] = useState<T[]>([]);
  const [hint, setHint] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const pick = (choice: T) => {
    if (outcome !== null || wrong.includes(choice)) return;
    const tries = attempts + 1;
    setAttempts(tries);
    if (choice === answer) {
      setOutcome('correct');
      return;
    }
    setWrong((w) => [...w, choice]);
    const next = afterWrong(tier, tries);
    if (next === 'hint') setHint(true);
    if (next === 'reveal') setOutcome('revealed');
  };

  // 틀렸을 때 보기 아래에 띄우는 한마디 (할 말이 없으면 빈 문자열)
  const message =
    outcome !== null ? '' : hint ? '반짝이는 걸 눌러 봐!' : wrong.length > 0 ? '아쉬워요, 한 번 더 골라 볼까요?' : '';

  return { attempts, wrong, outcome, showAnswer: hint || outcome !== null, message, pick };
}
