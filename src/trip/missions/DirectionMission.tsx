import { useEffect } from 'react';
import { DIRECTIONS_4, DIRECTIONS_8, type Direction, type MissionOf } from '../../content/types';
import type { FitFrame } from '../../globe/globeHandle';
import { Dongle } from '../../ui/Dongle';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps } from './types';
import { useTries } from './useTries';

// 나침반처럼 3×3으로 놓는다. 가운데는 기준 장소 이름.
const COMPASS_SLOTS: (Direction | 'center')[] = ['북서', '북', '북동', '서', 'center', '동', '남서', '남', '남동'];
/** 화면 맞추기: 지도 위 방위표(뒤판 반지름 60px + 기준 이름표)가 화면 가장자리·카드에 잘리지 않게 두 지점 둘레에 100px을 남기고,
 *  우리나라 안처럼 가까운 두 지점은 방위표와 도착 핀이 붙지 않게 확대 9까지 벌려 보인다 (보통 화면 맞추기는 7까지) */
const COMPASS_FRAME: FitFrame = { marginPx: 100, zoomLimit: 9 };

export function DirectionMission({ mission, tier, globe, onDone }: MissionProps<MissionOf<'direction'>>) {
  const { attempts, wrong, outcome, showAnswer, message, pick } = useTries<Direction>(mission.answer, tier);
  const allowed = mission.options === 4 ? DIRECTIONS_4 : DIRECTIONS_8;

  // 기준 장소에는 핀 대신 지구본 표면에 그린 듯한 방위표를 놓는다 — 지구본은 화면 위쪽이 북쪽이 아닐 때가 있어서,
  // 방위표 칸 경계 사이로 기준→목표 점선이 어느 칸에 들어가는지 보고 고르게 한다. 도착 핀은 점선 위에 오도록 방위표 다음에 꽂는다
  useEffect(() => {
    globe.showCompass({ from: mission.from, to: mission.to, fromName: mission.fromName, points: mission.options });
    globe.showMarker('to', mission.to, mission.toName);
    globe.fitTo([mission.from, mission.to], undefined, COMPASS_FRAME);
    return () => globe.clearMarkers();
  }, [globe, mission]);

  // 답하면 나침반 대신 결과 카드가 들어가 카드 높이가 바뀌므로, 그려진 뒤에 두 표시가 카드 위쪽에 다 보이게 다시 맞춘다 (PinMission과 같은 방식).
  // 방위표에는 정답 칸을 칠해 보여 준다
  useEffect(() => {
    if (outcome === null) return;
    globe.revealCompass(mission.answer);
    globe.fitTo([mission.from, mission.to], undefined, COMPASS_FRAME);
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
      {/* 다시 고르라는 말은 화면 읽기에만 들려준다 — 화면에서는 흐려진 오답 버튼(.is-wrong)이 신호다.
          보이게 두면 한 줄이 붙어 압축 카드가 390×844에서 40%를 넘는다 */}
      <p className="mission__hint visually-hidden" role="status" aria-live="polite">
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
