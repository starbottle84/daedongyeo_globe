import pacific from './places/pacific.json';
import asia from './places/asia.json';
import antarctica from './places/antarctica.json';
import seoul from './places/seoul.json';
import dokdo from './places/dokdo.json';
import jeju from './places/jeju.json';
import baekdu from './places/baekdu.json';
import { parsePlace } from './parsePlace';
import type { Place } from './types';

// 계획 2의 견본 장소 7곳 (첫 출시 24곳은 계획 4에서 채운다). 앱이 켜질 때 형식을 검사한다.
// 순서가 시작 화면의 카드 순서이자 "다음엔 ○○에 가 볼까요?"의 순서다.
export const PLACES: Place[] = [pacific, asia, antarctica, seoul, dokdo, jeju, baekdu].map(parsePlace);
