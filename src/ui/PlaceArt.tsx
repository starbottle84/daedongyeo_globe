// 장소 그림. 장면 그림(pl-*)이 있는 장소만 그 그림을, 나머지는 지구 그림을 쓴다 (계획 4에서 장소가 늘어나도 깨지지 않게).
const SCENES = new Set(['pacific', 'asia', 'antarctica', 'seoul', 'dokdo', 'jeju', 'baekdu']);

interface PlaceArtProps {
  placeId: string;
  className?: string;
}

export function PlaceArt({ placeId, className }: PlaceArtProps) {
  const id = SCENES.has(placeId) ? `pl-${placeId}` : 'pl-asia';
  return (
    <svg className={className} viewBox="0 0 64 50" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}
