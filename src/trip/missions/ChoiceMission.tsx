import type { MissionOf } from '../../content/types';
import { Dongle } from '../../ui/Dongle';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps } from './types';
import { useTries } from './useTries';

export function ChoiceMission({ mission, tier, onDone }: MissionProps<MissionOf<'choice'>>) {
  const { attempts, wrong, outcome, showAnswer, message, pick } = useTries(mission.answer, tier);

  return (
    <div className={`mission${outcome ? ' mission--done' : ''}`}>
      <div className="ask">
        <Dongle mood="think" size="sm" decorative />
        <p className="ask__prompt ko">{mission.prompt}</p>
      </div>
      {/* 답한 뒤에는 보기 묶음을 숨기고 결과 카드의 정답 칩만 남긴다 (trip.css .choices--done) */}
      <div className={`choices${outcome ? ' choices--done' : ''}`} data-count={mission.options.length}>
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
              onClick={() => pick(i)}
            >
              {option.icon && (
                <span className="choice__medal" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              <span className="choice__label">{option.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mission__hint" role="status" aria-live="polite">
        {message}
      </p>
      {outcome && (
        <MissionFeedback
          correct={outcome === 'correct'}
          answer={mission.options[mission.answer]}
          explain={mission.explain}
          onNext={() => onDone({ type: 'choice', correct: outcome === 'correct', attempts })}
        />
      )}
    </div>
  );
}
