import { Dongle, type DongleMood } from '../ui/Dongle';

interface CharacterBubbleProps {
  text: string;
  mood?: DongleMood;
}

// 동글이의 말풍선
export function CharacterBubble({ text, mood = 'talk' }: CharacterBubbleProps) {
  return (
    <div className="say">
      <Dongle mood={mood} size="lg" />
      <p className="bubble bubble--say ko">{text}</p>
    </div>
  );
}
