import { useEffect, useState } from 'react';
import type { LngLat, MissionOf } from '../../content/types';
import { Dongle } from '../../ui/Dongle';
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

  // 결과 카드가 그려진 뒤에 내 핀과 정답이 다 보이게 화면을 맞춘다. 누르는 순간에 맞추면 결과가 붙기 전의
  // 짧은 카드 높이로 여백을 재서, 카드가 커진 뒤 핀이 카드 밑에 숨는다.
  // useEffect는 화면에 결과 카드가 들어간 뒤에 돌고, 같은 그리기에서는 자식(MissionFeedback)의 효과(스크롤·초점)가
  // 부모인 이 효과보다 먼저 돌므로, 여기서 재는 카드 높이는 다 커진 높이다.
  // 결과가 나온 뒤에는 누르기를 그만 들어서 pinned가 다시 바뀌지 않으므로 한 번만 맞춘다.
  useEffect(() => {
    if (result && pinned) globe.fitTo([pinned, mission.target]);
  }, [globe, mission.target, pinned, result]);

  const confirm = () => {
    if (!pinned) return;
    setResult(judgePin(mission, pinned));
    globe.setLabelsVisible(true);
    globe.showMarker('answer', mission.target, '정답');
  };

  return (
    <div className="mission">
      <div className="ask">
        <Dongle mood="think" size="xs" decorative />
        <p className="ask__prompt ko">{mission.prompt}</p>
      </div>
      {!pinned && <p className="mission__hint">지구본을 눌러 핀을 꽂아 보세요.</p>}
      {pinned && !result && (
        <>
          <p className="mission__hint">다른 곳을 누르면 핀을 옮길 수 있어요.</p>
          <button type="button" className="btn" onClick={confirm}>
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
