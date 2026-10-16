import { useEffect, useRef, useState } from 'react';
import type { MissionOf } from '../../content/types';
import { afterWrong, judgeTap } from '../judge';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps, Outcome } from './types';

export function TapMission({ mission, tier, globe, placeView, onDone }: MissionProps<MissionOf<'tap'>>) {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [message, setMessage] = useState('지구본에서 찾아 눌러 보세요.');
  const attempts = useRef(0);

  // 미션을 시작하면 찾을 곳이 보이는 화면으로 날아간다. 미션이 끝나면 표시를 지운다.
  useEffect(() => {
    const view = mission.view ?? placeView;
    globe.flyTo(view.center, view.zoom);
    return () => globe.clearMarkers();
  }, [globe, mission, placeView]);

  useEffect(() => {
    if (outcome !== null) return undefined;
    return globe.onTap((tap) => {
      attempts.current += 1;
      if (judgeTap(mission, tap)) {
        globe.showMarker('answer', mission.target);
        setOutcome('correct');
        return;
      }
      const next = afterWrong(tier, attempts.current);
      if (next === 'hint') {
        globe.showMarker('hint', mission.target);
        setMessage('반짝이는 곳을 눌러 봐!');
      } else if (next === 'retry') {
        setMessage('조금 빗나갔어요. 한 번 더 눌러 볼까요?');
      } else {
        globe.showMarker('answer', mission.target);
        setOutcome('revealed');
      }
    });
  }, [globe, mission, tier, outcome]);

  return (
    <div className="mission">
      <p className="mission__prompt">{mission.prompt}</p>
      {outcome === null && <p className="mission__hint">{message}</p>}
      {outcome && (
        <MissionFeedback
          correct={outcome === 'correct'}
          detail={outcome === 'revealed' ? '초록 핀이 정답 위치예요.' : undefined}
          explain={mission.explain}
          onNext={() => onDone({ type: 'tap', correct: outcome === 'correct', attempts: attempts.current })}
        />
      )}
    </div>
  );
}
