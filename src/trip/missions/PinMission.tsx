import { useEffect, useState } from 'react';
import type { LngLat, MissionOf } from '../../content/types';
import { judgePin } from '../judge';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps } from './types';

export function PinMission({ mission, globe, placeView, onDone }: MissionProps<MissionOf<'pin'>>) {
  const [pinned, setPinned] = useState<LngLat | null>(null);
  const [result, setResult] = useState<{ km: number; stars: number } | null>(null);

  // 지명이 보이면 문제가 너무 쉬우므로 잠시 숨긴다. 미션이 끝나면 다시 보여 준다.
  useEffect(() => {
    const view = mission.view ?? placeView;
    globe.flyTo(view.center, view.zoom);
    globe.setLabelsVisible(false);
    return () => {
      globe.setLabelsVisible(true);
      globe.clearMarkers();
    };
  }, [globe, mission, placeView]);

  useEffect(() => {
    if (result !== null) return undefined;
    return globe.onTap(({ at }) => {
      setPinned(at);
      globe.showMarker('pin', at);
    });
  }, [globe, result]);

  const confirm = () => {
    if (!pinned) return;
    setResult(judgePin(mission, pinned));
    globe.setLabelsVisible(true);
    globe.showMarker('answer', mission.target);
    globe.fitTo([pinned, mission.target]);
  };

  return (
    <div className="mission">
      <p className="mission__prompt">{mission.prompt}</p>
      {!pinned && <p className="mission__hint">지구본을 눌러 핀을 꽂아 보세요.</p>}
      {pinned && !result && (
        <>
          <p className="mission__hint">다른 곳을 누르면 핀을 옮길 수 있어요.</p>
          <button type="button" className="big-button" onClick={confirm}>
            여기예요!
          </button>
        </>
      )}
      {result && (
        <MissionFeedback
          correct={result.stars >= 2}
          stars={result.stars}
          detail={`정답과 약 ${Math.round(result.km).toLocaleString('ko-KR')}km 떨어졌어요. 초록 핀이 정답이에요.`}
          explain={mission.explain}
          onNext={() => onDone({ type: 'pin', correct: result.stars >= 2, attempts: 1, stars: result.stars })}
        />
      )}
    </div>
  );
}
