import type { MissionOf } from '../../content/types';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps } from './types';
import { useTries } from './useTries';

export function ChoiceMission({ mission, tier, onDone }: MissionProps<MissionOf<'choice'>>) {
  const { attempts, wrong, outcome, showAnswer, pick } = useTries(mission.answer, tier);

  return (
    <div className="mission">
      <p className="mission__prompt">{mission.prompt}</p>
      <div className="choices">
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
                <span className="choice__icon" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {outcome && (
        <MissionFeedback
          correct={outcome === 'correct'}
          detail={outcome === 'revealed' ? `정답: ${mission.options[mission.answer].label}` : undefined}
          explain={mission.explain}
          onNext={() => onDone({ type: 'choice', correct: outcome === 'correct', attempts })}
        />
      )}
    </div>
  );
}
