import { useEffect } from 'react';
import { DIRECTIONS_4, DIRECTIONS_8, type Direction, type MissionOf } from '../../content/types';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps } from './types';
import { useTries } from './useTries';

// 나침반처럼 3×3으로 놓는다. 가운데는 기준 장소 이름.
const COMPASS_SLOTS: (Direction | 'center')[] = ['북서', '북', '북동', '서', 'center', '동', '남서', '남', '남동'];

export function DirectionMission({ mission, tier, globe, onDone }: MissionProps<MissionOf<'direction'>>) {
  const { attempts, wrong, outcome, showAnswer, pick } = useTries<Direction>(mission.answer, tier);
  const allowed = mission.options === 4 ? DIRECTIONS_4 : DIRECTIONS_8;

  useEffect(() => {
    globe.showMarker('from', mission.from, mission.fromName);
    globe.showMarker('to', mission.to, mission.toName);
    globe.fitTo([mission.from, mission.to]);
    return () => globe.clearMarkers();
  }, [globe, mission]);

  return (
    <div className="mission">
      <p className="mission__prompt">{mission.prompt}</p>
      <div className="compass" role="group" aria-label="방향 고르기">
        {COMPASS_SLOTS.map((slot) => {
          if (slot === 'center') {
            return (
              <span key="center" className="compass__center">
                {mission.fromName}
              </span>
            );
          }
          if (!allowed.includes(slot)) return <span key={slot} aria-hidden="true" />;
          const classes = ['compass__dir'];
          if (showAnswer && slot === mission.answer) classes.push('is-answer');
          if (wrong.includes(slot)) classes.push('is-wrong');
          return (
            <button
              key={slot}
              type="button"
              className={classes.join(' ')}
              aria-disabled={wrong.includes(slot) || outcome !== null}
              onClick={() => pick(slot)}
            >
              {slot}
            </button>
          );
        })}
      </div>
      {outcome && (
        <MissionFeedback
          correct={outcome === 'correct'}
          detail={outcome === 'revealed' ? `정답: ${mission.answer}쪽` : undefined}
          explain={mission.explain}
          onNext={() => onDone({ type: 'direction', correct: outcome === 'correct', attempts })}
        />
      )}
    </div>
  );
}
