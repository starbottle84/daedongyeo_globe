import { useEffect, useId, useState } from 'react';
import type { LngLat, MissionOf } from '../../content/types';
import { Dongle } from '../../ui/Dongle';
import { judgePin } from '../judge';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps } from './types';

export function PinMission({ mission, globe, placeView, onDone }: MissionProps<MissionOf<'pin'>>) {
  const [pinned, setPinned] = useState<LngLat | null>(null);
  const [result, setResult] = useState<{ km: number; stars: number } | null>(null);
  const moveHintId = useId();

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
  // 정답 가까이 꽂으면 두 점이 붙어 있어 아주 크게 확대되는데, 넓은 바다 한가운데에서는 온통 파란색만 보여 어디인지 알 수 없다.
  // 그래서 미션을 시작한 화면보다 한 단계까지만 더 확대한다.
  const startZoom = (mission.view ?? placeView).zoom;
  useEffect(() => {
    if (result && pinned) globe.fitTo([pinned, mission.target], startZoom + 1);
  }, [globe, mission.target, pinned, result, startZoom]);

  const confirm = () => {
    if (!pinned) return;
    setResult(judgePin(mission, pinned));
    globe.setLabelsVisible(true);
    globe.showMarker('answer', mission.target, '정답');
  };

  return (
    <div className={`mission${result ? ' mission--done' : ''}`}>
      <div className="ask">
        <Dongle mood="think" size="xs" decorative />
        <p className="ask__prompt ko">{mission.prompt}</p>
      </div>
      {/* 안내 글과 '여기예요!' 버튼이 같은 높이의 자리를 나눠 써서, 핀을 꽂아도 카드가 커지지 않는다 — 커지면 카드 바로 위에 꽂은 핀을 가린다.
          카메라 여백은 미션을 시작할 때 재므로 처음부터 버튼 높이가 들어가 있어야 한다 (trip.css .pin-slot) */}
      {!result && (
        <div className="pin-slot">
          {pinned ? (
            <>
              <button type="button" className="btn" aria-describedby={moveHintId} onClick={confirm}>
                여기예요!
              </button>
              <span id={moveHintId} className="visually-hidden">
                다른 곳을 누르면 핀을 옮길 수 있어요.
              </span>
            </>
          ) : (
            <p className="pin-slot__hint">지구본을 눌러 핀을 꽂아 보세요.</p>
          )}
        </div>
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
