import { useEffect } from 'react';
import type { Mission, Place, View } from '../content/types';
import type { GlobeHandle } from '../globe/globeHandle';
import { Flag } from '../ui/Flag';
import { CharacterBubble } from './CharacterBubble';
import type { LessonScene } from './lesson';
import { COMPASS_FRAME } from './missions/types';

interface LessonViewProps {
  scene: LessonScene;
  /** 몇째 장인지(0부터)와 장 수 */
  index: number;
  count: number;
  place: Place;
  placeView: View;
  globe: GlobeHandle;
  onPrev: () => void;
  /** 다음 장으로. 마지막 장에서는 미션을 시작한다 */
  onNext: () => void;
  onSkip: () => void;
}

// 지도 장면의 이름 줄: 찾아 누르기·핀 꽂기는 찾을 곳, 방향은 '기준 → 목표'
function sceneName(mission: Mission | undefined, place: Place): string | null {
  if (!mission || mission.type === 'choice') return null;
  if (mission.type === 'direction') return `${mission.fromName} → ${mission.toName}`;
  return mission.targetName ?? place.name;
}

// 국기 고르기 장면의 국기: 질문 국기("이 국기는 어느 나라 국기일까요?") 또는 정답 보기 국기("일본 국기를 골라 봐!")
function sceneFlag(mission: Mission | undefined): string | undefined {
  if (mission?.type !== 'choice') return undefined;
  return mission.flag ?? mission.options[mission.answer].flag;
}

// 여행 수업 한 장 (저학년·고학년 둘러보기, 설계 2026-10-19-trip-lesson-design).
// 장마다 지구본이 그 내용을 보여 준다: 찾을 곳 → 초록 핀과 이름표, 방향 → 답한 뒤 화면처럼 방위표 정답 칸과 도착 핀, 이야기·고르기 → 장소 화면
export function LessonView({ scene, index, count, place, placeView, globe, onPrev, onNext, onSkip }: LessonViewProps) {
  const { mission } = scene;

  useEffect(() => {
    if (!mission || mission.type === 'choice') {
      globe.flyTo(placeView.center, placeView.zoom);
    } else if (mission.type === 'direction') {
      // DirectionMission의 답한 뒤 화면과 같다. 도착 핀은 점선 위에 오도록 방위표 다음에 꽂는다
      globe.showCompass({ from: mission.from, to: mission.to, fromName: mission.fromName, points: mission.options });
      globe.revealCompass(mission.answer);
      globe.showMarker('to', mission.to, mission.toName);
      globe.fitTo([mission.from, mission.to], undefined, COMPASS_FRAME);
    } else {
      // 미션에서 정답을 보여 줄 때처럼, 미션 시작 화면의 확대로 찾을 곳에 날아간다 (TapMission·PinMission)
      globe.flyTo(mission.target, (mission.view ?? placeView).zoom);
      globe.showMarker('answer', mission.target, mission.targetName ?? place.name);
    }
    return () => globe.clearMarkers();
  }, [globe, mission, place, placeView]);

  const last = index + 1 >= count;
  const name = sceneName(mission, place);
  const flag = sceneFlag(mission);
  return (
    <div className="lesson">
      <div className="progress">
        <span className="progress__label">여행 수업 {index + 1} / {count}</span>
        <span className="pips" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <i key={i} className={`${i <= index ? 'on' : ''}${i === index ? ' now' : ''}`} />
          ))}
        </span>
      </div>
      {name && <p className={`lesson__name${mission?.type === 'direction' ? '' : ' lesson__name--spot'}`}>{name}</p>}
      {flag && <div className="lesson__flag"><Flag code={flag} /></div>}
      <CharacterBubble text={scene.text} />
      <div className="lesson__actions">
        {index > 0 && <button type="button" className="btn btn--paper" onClick={onPrev}>이전</button>}
        <button type="button" className="btn" onClick={onNext}>{last ? '미션 시작' : '다음'}</button>
      </div>
      {!last && (
        <button type="button" className="link-button lesson__skip" onClick={onSkip}>건너뛰고 문제 풀기</button>
      )}
    </div>
  );
}
