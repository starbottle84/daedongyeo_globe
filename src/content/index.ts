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
import busan from './places/busan.json';
import jeju from './places/jeju.json';
import ulleungdo from './places/ulleungdo.json';
import dokdo from './places/dokdo.json';
import baekdu from './places/baekdu.json';
import hallasan from './places/hallasan.json';
import hangang from './places/hangang.json';
import nakdonggang from './places/nakdonggang.json';
import eastSea from './places/east-sea.json';
import westSea from './places/west-sea.json';
import southSea from './places/south-sea.json';
import china from './places/china.json';
import japan from './places/japan.json';
import russia from './places/russia.json';
import mongolia from './places/mongolia.json';
import greatWall from './places/great-wall.json';
import shanghai from './places/shanghai.json';
import chengdu from './places/chengdu.json';
import mountFuji from './places/mount-fuji.json';
import kyoto from './places/kyoto.json';
import hokkaido from './places/hokkaido.json';
import lakeBaikal from './places/lake-baikal.json';
import gobiDesert from './places/gobi-desert.json';
import tajMahal from './places/taj-mahal.json';
import angkorWat from './places/angkor-wat.json';
import paris from './places/paris.json';
import rome from './places/rome.json';
import pyramids from './places/pyramids.json';
import serengeti from './places/serengeti.json';
import newYork from './places/new-york.json';
import grandCanyon from './places/grand-canyon.json';
import machuPicchu from './places/machu-picchu.json';
import amazon from './places/amazon.json';
import sydney from './places/sydney.json';
import greatBarrierReef from './places/great-barrier-reef.json';
import equator from './places/equator.json';
import tropicOfCancer from './places/tropic-of-cancer.json';
import primeMeridian from './places/prime-meridian.json';
import dateLine from './places/date-line.json';
import himalayas from './places/himalayas.json';
import andes from './places/andes.json';
import rockies from './places/rockies.json';
import nile from './places/nile.json';
import yangtze from './places/yangtze.json';
import sahara from './places/sahara.json';
import atacama from './places/atacama.json';
import siberia from './places/siberia.json';
import { parsePlace } from './parsePlace';
import type { Place } from './types';

// 장소 60곳 (단계마다 12곳). 앱이 켜질 때 형식을 검사한다.
// 순서가 시작 화면의 카드 순서이자 "다음엔 ○○에 가 볼까요?"의 순서다.
// 1단계: 대륙 → 대양. 2단계: 도시 → 섬 → 산 → 강 → 바다. 3단계: 나라 → 중국·일본·러시아·몽골 장소.
// 4단계: 아시아 → 유럽 → 아프리카 → 북아메리카 → 남아메리카 → 오세아니아. 5단계: 지구의 선 → 산맥 → 강 → 사막 → 추운 곳.
export const PLACES: Place[] = [
  asia, europe, africa, northAmerica, southAmerica, oceania, antarctica,
  pacific, atlantic, indian, arctic, southern,
  seoul, busan, jeju, ulleungdo, dokdo, baekdu, hallasan, hangang, nakdonggang,
  eastSea, westSea, southSea,
  china, japan, russia, mongolia, greatWall, shanghai, chengdu, mountFuji, kyoto, hokkaido, lakeBaikal, gobiDesert,
  tajMahal, angkorWat, paris, rome, pyramids, serengeti, newYork, grandCanyon, machuPicchu, amazon, sydney, greatBarrierReef,
  equator, tropicOfCancer, primeMeridian, dateLine, himalayas, andes, rockies, nile, yangtze, sahara, atacama, siberia,
].map(parsePlace);
