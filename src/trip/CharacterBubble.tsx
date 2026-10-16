interface CharacterBubbleProps {
  text: string;
}

// 탐험가 캐릭터의 말풍선 (캐릭터 이름·그림은 임시)
export function CharacterBubble({ text }: CharacterBubbleProps) {
  return (
    <div className="character">
      <div className="character__face" aria-hidden="true">
        🧭
      </div>
      <p className="character__text">
        <b className="character__name">탐험가</b>
        {text}
      </p>
    </div>
  );
}
