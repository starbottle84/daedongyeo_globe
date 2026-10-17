import asia from './places/asia.json';
import europe from './places/europe.json';
import africa from './places/africa.json';
import northAmerica from './places/north-america.json';
import southAmerica from './places/south-america.json';
import oceania from './places/oceania.json';
import antarctica from './places/antarctica.json';
import pacific from './places/pacific.json';
import atlantic from './places/atlantic.json';
import indian from './places/indian.json';
import arctic from './places/arctic.json';
import southern from './places/southern.json';
import seoul from './places/seoul.json';
import jeju from './places/jeju.json';
import dokdo from './places/dokdo.json';
import baekdu from './places/baekdu.json';
import { parsePlace } from './parsePlace';
import type { Place } from './types';

// 첫 출시 장소 (1단계 12곳, 2단계는 견본 4곳 — 나머지 8곳은 다음 커밋에서 더한다). 앱이 켜질 때 형식을 검사한다.
// 순서가 시작 화면의 카드 순서이자 "다음엔 ○○에 가 볼까요?"의 순서다.
// 1단계: 대륙 → 대양. 2단계: 도시 → 섬 → 산 → 강 → 바다.
export const PLACES: Place[] = [
  asia, europe, africa, northAmerica, southAmerica, oceania, antarctica,
  pacific, atlantic, indian, arctic, southern,
  seoul, jeju, dokdo, baekdu,
].map(parsePlace);
