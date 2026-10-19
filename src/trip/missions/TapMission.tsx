import { useEffect, useMemo, useRef, useState } from 'react';
import type { MissionOf, View } from '../../content/types';
import { Dongle } from '../../ui/Dongle';
import { COMMON_VOICE } from '../../voice/lines';
import { ReplayButton } from '../../voice/ReplayButton';
import { useAutoVoice } from '../../voice/useVoice';
import { playVoice } from '../../voice/voice';
import { afterWrong, judgeTap } from '../judge';
import { MissionFeedback } from './MissionFeedback';
import type { MissionProps, Outcome } from './types';

export function TapMission({ mission, tier, globe, placeView, voice, onDone }: MissionProps<MissionOf<'tap'>>) {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [message, setMessage] = useState('지구본에서 찾아 눌러 보세요.');
  const attempts = useRef(0);
  // 시작 화면: 미션에 view가 없으면 영역·나라 미션은 장소 화면, 반경 미션은 target을 가운데에 둔 화면.
  // (장소 화면 그대로면 target이 화면 가장자리·패널 밑에 갈 수 있는데, 유아는 지도를 움직일 수 없다)
  const startView = useMemo<View>(
    () => mission.view ?? (mission.area || mission.country ? placeView : { center: mission.target, zoom: placeView.zoom }),
    [mission, placeView],
  );

  // 미션을 시작하면 찾을 곳이 보이는 화면으로 날아간다. 미션이 끝나면 표시를 지운다.
  useEffect(() => {
    globe.flyTo(startView.center, startView.zoom);
    return () => globe.clearMarkers();
  }, [globe, startView]);

  // 유아 음성: 미션을 시작하면 질문을 읽는다 (힌트는 틀릴 때마다, 결과는 MissionFeedback)
  useAutoVoice(voice && [voice.prompt]);

  useEffect(() => {
    if (outcome !== null) return undefined;
    // 정답을 보여 줄 때는 유아의 반짝이 표시를 지우고 정답 핀만 남긴다
    const showAnswer = () => {
      globe.clearMarkers();
      globe.showMarker('answer', mission.target, '정답');
    };
    return globe.onTap((tap) => {
      // 영역·나라 층이 아직 준비 중이면(처음 받는 중·화면 이동 직후) 대륙·대양·나라 판정을 믿을 수 없으니 기회를 쓰지 않고 넘긴다
      if ((mission.area || mission.country) && !tap.areaReady) return;
      attempts.current += 1;
      if (judgeTap(mission, tap)) {
        showAnswer();
        setOutcome('correct');
        return;
      }
      const next = afterWrong(tier, attempts.current);
      if (next === 'hint') {
        globe.showMarker('hint', mission.target);
        setMessage('반짝이는 곳을 눌러 봐!');
        if (voice) playVoice([COMMON_VOICE.hintTap]);
      } else if (next === 'retry') {
        setMessage('조금 빗나갔어요. 한 번 더 눌러 볼까요?');
      } else {
        showAnswer();
        setOutcome('revealed');
      }
    });
  }, [globe, mission, tier, outcome, voice]);

  // 결과 카드가 그려진 뒤에 초록 핀이 카드 위쪽 보이는 곳 가운데에 오도록 정답 위치로 날아간다.
  // 누르는 순간에 날아가면 결과가 붙기 전의 짧은 카드 높이로 여백을 재서, 카드가 커진 뒤 핀이 카드 밑에 숨는다.
  // (자식 MissionFeedback의 효과가 이 효과보다 먼저 돌므로, 여기서 재는 카드 높이는 다 커진 높이다 — PinMission과 같다)
  useEffect(() => {
    if (outcome !== null) globe.flyTo(mission.target, startView.zoom);
  }, [globe, mission.target, outcome, startView.zoom]);

  return (
    <div className={`mission${outcome ? ' mission--done' : ''}`}>
      <div className="ask">
        <Dongle mood="think" size="xs" decorative />
        <p className="ask__prompt ko">{mission.prompt}</p>
        <ReplayButton ids={voice && [voice.prompt]} />
      </div>
      {outcome === null && (
        <p className="mission__hint" role="status" aria-live="polite">
          {message}
        </p>
      )}
      {outcome && (
        <MissionFeedback
          correct={outcome === 'correct'}
          detail={outcome === 'revealed' ? '초록 핀이 정답 위치예요.' : undefined}
          explain={mission.explain}
          voice={voice && [outcome === 'correct' ? COMMON_VOICE.correct : COMMON_VOICE.soft, voice.explain]}
          onNext={() => onDone({ type: 'tap', correct: outcome === 'correct', attempts: attempts.current })}
        />
      )}
    </div>
  );
}
