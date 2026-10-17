export type IconName = 'plane' | 'close' | 'check' | 'plus' | 'minus' | 'lock' | 'sat' | 'map' | 'globe' | 'north' | 'read';

interface IconProps {
  name: IconName;
  className?: string;
}

// 작은 도구 아이콘 (그림 모음의 i-* 기호). 늘 장식이므로 화면 읽기에서는 빼고, 이름은 버튼에 붙인다.
export function Icon({ name, className }: IconProps) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
