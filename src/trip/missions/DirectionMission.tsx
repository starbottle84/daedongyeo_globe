import { useEffect } from 'react';
import { DIRECTIONS_4, DIRECTIONS_8, type Direction, type MissionOf } from '../../content/types';
import { Dongle } from '../../ui/Dongle';
import { MissionFeedback } from './MissionFeedback';
import { COMPASS_FRAME, type MissionProps } from './types';
import { useTries } from './useTries';

// 나침반처럼 3×3으로 놓는다. 가운데는 기준 장소 이름.
const COMPASS_SLOTS: (Direction | 'center')[] = ['북서', '북', '북동', '서', 'center', '동', '남서', '남', '남동'];

export function DirectionMission({ mission, tier, globe, onDone }: MissionProps<MissionOf<'direction'>>) {
  const { attempts, wrong, outcome, showAnswer, message, pick } = useTries<Direction>(mission.answer, tier);
  const allowed = mission.options === 4 ? DIRECTIONS_4 : DIRECTIONS_8;

  // 기준 장소에는 핀 대신 지구본 표면에 그린 듯한 방위표를 놓는다 — 지구본은 화면 위쪽이 북쪽이 아닐 때가 있어서 진짜 북쪽을 보여 준다.
  // 처음에는 목표를 드러내지 않는다: 목표 핀·점선 없이 기준 장소를 화면 가운데에 두고, 목표가 어느 쪽에 있어도 보이는 넓이로 맞춘다.
  // (두 지점을 함께 맞추면 방위표가 한쪽 끝에 붙어 목표가 반대쪽이라는 것이 드러난다.) 아이는 지도에서 목표를 직접 찾아 방향을 고른다
  useEffect(() => {
    globe.showCompass({ from: mission.from, to: mission.to, fromName: mission.fromName, points: mission.options });
    globe.centerOn(mission.from, mission.to, COMPASS_FRAME);
    return () => globe.clearMarkers();
  }, [globe, mission]);

  // 한 번 틀리면 힌트: 도착 핀과 방위표 칸 경계·기준→목표 점선을 보여 주고, 두 지점이 다 보이게 맞춘다.
  // 답하면 나침반 대신 결과 카드가 들어가 카드 높이가 바뀌므로 다시 맞추고(PinMission과 같은 방식), 방위표에 정답 칸을 칠한다.
  // 도착 핀은 점선 위에 오도록 방위표 다음에 꽂는다
  const hinted = wrong.length > 0;
  useEffect(() => {
    if (!hinted && outcome === null) return;
    if (outcome === null) globe.showCompassGuides();
    else globe.revealCompass(mission.answer);
    globe.showMarker('to', mission.to, mission.toName);
    globe.fitTo([mission.from, mission.to], undefined, COMPASS_FRAME);
  }, [globe, mission, hinted, outcome]);

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
        {outcome === null && hinted ? '아쉬워요. 지도에 목표까지 주황 점선이 나왔어요. 점선이 들어간 칸의 방향을 골라 볼까요?' : message}
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
