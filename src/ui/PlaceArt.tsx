// 장소 그림. 장면 그림(pl-*)이 있는 장소만 그 그림을, 나머지는 기본 지구 그림(pl-earth)을 쓴다 (계획 4에서 장소가 늘어나도 깨지지 않게).
const SCENES = new Set([
  'asia', 'europe', 'africa', 'north-america', 'south-america', 'oceania', 'antarctica',
  'pacific', 'atlantic', 'indian', 'arctic', 'southern',
  'seoul', 'busan', 'jeju', 'ulleungdo', 'dokdo', 'baekdu', 'hallasan', 'hangang', 'nakdonggang',
  'east-sea', 'west-sea', 'south-sea',
  'china', 'japan', 'russia', 'mongolia', 'great-wall', 'shanghai', 'chengdu', 'mount-fuji', 'kyoto', 'hokkaido', 'lake-baikal', 'gobi-desert',
  'taj-mahal', 'angkor-wat', 'paris', 'rome', 'pyramids', 'serengeti', 'new-york', 'grand-canyon', 'machu-picchu', 'amazon', 'sydney', 'great-barrier-reef',
  'equator', 'tropic-of-cancer', 'prime-meridian', 'date-line', 'himalayas', 'andes', 'rockies', 'nile', 'yangtze', 'sahara', 'atacama', 'siberia',
]);

interface PlaceArtProps {
  placeId: string;
  className?: string;
}

export function PlaceArt({ placeId, className }: PlaceArtProps) {
  const id = SCENES.has(placeId) ? `pl-${placeId}` : 'pl-earth';
  return (
    <svg className={className} viewBox="0 0 64 50" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}
