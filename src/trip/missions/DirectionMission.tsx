import { useEffect } from 'react';
import { DIRECTIONS_4, DIRECTIONS_8, type Direction, type MissionOf } from '../../content/types';
import { Dongle } from '../../ui/Dongle';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps } from './types';
import { useTries } from './useTries';

// 나침반처럼 3×3으로 놓는다. 가운데는 기준 장소 이름.
const COMPASS_SLOTS: (Direction | 'center')[] = ['북서', '북', '북동', '서', 'center', '동', '남서', '남', '남동'];

export function DirectionMission({ mission, tier, globe, onDone }: MissionProps<MissionOf<'direction'>>) {
  const { attempts, wrong, outcome, showAnswer, message, pick } = useTries<Direction>(mission.answer, tier);
  const allowed = mission.options === 4 ? DIRECTIONS_4 : DIRECTIONS_8;

  useEffect(() => {
    globe.showMarker('from', mission.from, mission.fromName);
    globe.showMarker('to', mission.to, mission.toName);
    globe.fitTo([mission.from, mission.to]);
    return () => globe.clearMarkers();
  }, [globe, mission]);

  // 답하면 나침반 대신 결과 카드가 들어가 카드 높이가 바뀌므로, 그려진 뒤에 두 표시가 카드 위쪽에 다 보이게 다시 맞춘다 (PinMission과 같은 방식)
  useEffect(() => {
    if (outcome !== null) globe.fitTo([mission.from, mission.to]);
  }, [globe, mission, outcome]);

  return (
    <div className={`mission${outcome ? ' mission--done' : ''}`}>
      <div className="ask">
        <Dongle mood="think" size="xs" decorative />
        <p className="ask__prompt ko">{mission.prompt}</p>
      </div>
      {/* 답한 뒤에는 나침반을 빼서 결과 카드 자리를 만든다 — 정답은 결과 카드의 칩('남쪽' 등)이 보여 주고 지도에는 두 표시가 남는다.
          나침반이 남으면 1024×768 가로 태블릿에서 결과가 카드를 넘쳐 진행 줄이 절취선에 잘린다 */}
      {outcome === null && (
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
                aria-disabled={wrong.includes(slot)}
                onClick={() => pick(slot)}
              >
                {slot}
              </button>
            );
          })}
        </div>
      )}
      <p className="mission__hint" role="status" aria-live="polite">
        {message}
      </p>
      {outcome && (
        <MissionFeedback
          correct={outcome === 'correct'}
          answer={{ label: `${mission.answer}쪽` }}
          explain={mission.explain}
          onNext={() => onDone({ type: 'direction', correct: outcome === 'correct', attempts })}
        />
      )}
    </div>
  );
}
