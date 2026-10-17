import { Dongle, type DongleMood } from '../ui/Dongle';
import { ReplayButton } from '../voice/ReplayButton';

interface CharacterBubbleProps {
  text: string;
  mood?: DongleMood;
  /** 유아 음성: 이 말풍선 문장 id. 있으면(녹음 파일도 있으면) 동글이 아래에 '다시 듣기'를 둔다 */
  voice?: (string | null)[] | null;
}

// 동글이의 말풍선
export function CharacterBubble({ text, mood = 'talk', voice = null }: CharacterBubbleProps) {
  return (
    <div className="say">
      {/* '다시 듣기'는 동글이 아래에 둔다 — 말풍선 옆에 두면 말풍선 폭이 줄어 짧은 말도 네 줄로 접힌다 */}
      <div className="say__who">
        <Dongle mood={mood} size="lg" />
        <ReplayButton ids={voice} />
      </div>
      <p className="bubble bubble--say ko">{text}</p>
    </div>
  );
}
