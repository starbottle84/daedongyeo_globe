import { useEffect, useRef } from 'react';
import type { MissionOf } from '../../content/types';
import { Dongle } from '../../ui/Dongle';
import { Flag } from '../../ui/Flag';
import { flagUrl } from '../../ui/flags';
import { COMMON_VOICE } from '../../voice/lines';
import { ReplayButton } from '../../voice/ReplayButton';
import { useAutoVoice } from '../../voice/useVoice';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps } from './types';
import { useTries } from './useTries';

export function ChoiceMission({ mission, tier, voice, onDone, onAnswered, firstTryOnly = false }: MissionProps<MissionOf<'choice'>>) {
  const { attempts, wrong, outcome, hint, showAnswer, message, pick } = useTries(mission.answer, tier);
  // 답이 정해진 순간 한 번만 알린다 (부모가 그릴 때마다 새 함수를 주어도 다시 부르지 않게)
  const answered = useRef(false);
  useEffect(() => {
    if (outcome === null || answered.current) return;
    answered.current = true;
    onAnswered?.({ type: 'choice', correct: outcome === 'correct', attempts });
  }, [outcome, onAnswered, attempts]);
  // 칭찬('잘했어요!'·꽃가루)은 맞힌 것으로 세는 기준과 같게: 나라 퀴즈는 처음 고른 답으로 맞혔을 때만
  const praised = outcome === 'correct' && (!firstTryOnly || attempts === 1);
  // 유아 음성: 미션을 시작하면 질문, 정답이 반짝이면 힌트 (결과는 MissionFeedback)
  useAutoVoice(voice && [voice.prompt]);
  useAutoVoice(voice && hint && !outcome ? [COMMON_VOICE.hint] : null);

  return (
    <div className={`mission${outcome ? ' mission--done' : ''}`}>
      <div className="ask">
        <Dongle mood="think" size="sm" decorative />
        <p className="ask__prompt ko">{mission.prompt}</p>
        <ReplayButton ids={voice && [voice.prompt]} />
      </div>
      {mission.flag && !outcome && (
        <div className="ask__flag">
          <Flag code={mission.flag} />
        </div>
      )}
      {/* 답한 뒤에는 보기 묶음을 숨기고 결과 카드의 정답 칩만 남긴다 (trip.css .choices--done).
          국기 보기는 그림만 보여 준다 — 나라 이름을 쓰면 "일본 국기를 골라 봐"의 답이 보인다 (이름은 화면 읽기와 결과 칩에) */}
      <div
        className={`choices${outcome ? ' choices--done' : ''}${mission.options[0].flag ? ' choices--flags' : ''}`}
        data-count={mission.options.length}
      >
        {mission.options.map((option, i) => {
          const classes = ['choice'];
          if (showAnswer && i === mission.answer) classes.push('is-answer');
          if (wrong.includes(i)) classes.push('is-wrong');
          return (
            <button
              key={option.label}
              type="button"
              className={classes.join(' ')}
              aria-disabled={wrong.includes(i) || outcome !== null}
              aria-label={option.flag ? `${option.label} 국기` : undefined}
              onClick={() => pick(i)}
            >
              {/* 국기 그림 파일이 없으면(코드 오타 등) 빈 버튼이 되지 않게 글자로 대신한다 */}
              {option.flag && flagUrl(option.flag) ? (
                <Flag code={option.flag} className="choice__flag" />
              ) : (
                <>
                  {option.icon && (
                    <span className="choice__medal" aria-hidden="true">
                      {option.icon}
                    </span>
                  )}
                  <span className="choice__label">{option.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <p className="mission__hint" role="status" aria-live="polite">
        {message}
      </p>
      {outcome && (
        <MissionFeedback
          correct={praised}
          answer={mission.options[mission.answer]}
          explain={mission.explain}
          voice={voice && [praised ? COMMON_VOICE.correct : COMMON_VOICE.soft, voice.explain]}
          onNext={() => onDone({ type: 'choice', correct: outcome === 'correct', attempts })}
        />
      )}
    </div>
  );
}
