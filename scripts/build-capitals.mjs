// 나라 수도 퀴즈 데이터 (계획 8) → src/content/capitals.json
// UN 회원국 193개에서 이스라엘(수도 분쟁)·나우루(공식 수도 없음)를 뺀 191개.
// 나라·수도 이름은 지도 데이터를 그대로 쓰지 않고 아래 손으로 정한 표(TABLE)를 쓴다.
//   나라: 외교부 국가·지역정보(mofa.go.kr, 2026-10 확인)의 짧은 이름. 수도: 국립국어원 외래어 표기(용례·심의 결과), 외교부 표기와 다르면 국어원을 따른다.
// 수도 자리: public/data/places.geojson의 수도 점 → 없거나 다른 도시면 data/raw/ne_10m_populated_places → 그래도 없으면 표의 at(손으로 확인한 좌표)
// 대륙: public/data/countries.geojson의 continent (대양의 섬나라는 REGION_FIX로 가까운 대륙에)
// 카메라 상자(focus): countries.geojson에서 그 나라의 가장 큰 땅(폴리곤)과 수도를 감싸는 [남서, 북동]
//   섬이 여럿이라 나라 모양이 잘리거나 수도가 상자 끝에 붙는 나라는 표에서 focus: 'all'(면 전체) 또는 손으로 정한 상자를 쓴다 (2026-10 대륙별 검증)
// 실행: npm run data:capitals                                   (국기 그림은 있는지만 본다)
//       npm run data:capitals -- --flags <flag-icons의 flags/4x3 폴더> (없는 국기 그림을 src/assets/flags로 복사. 있는 것은 그대로)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'src', 'content', 'capitals.json');
const FLAGS = path.join(root, 'src', 'assets', 'flags');
const readGeo = (...p) => JSON.parse(fs.readFileSync(path.join(root, ...p), 'utf8')).features;

// ── UN 회원국 193개 (ISO 3166-1 세 글자) ─────────────────────────
const UN_MEMBERS = `
AFG ALB DZA AND AGO ATG ARG ARM AUS AUT AZE BHS BHR BGD BRB BLR BEL BLZ BEN BTN
BOL BIH BWA BRA BRN BGR BFA BDI CPV KHM CMR CAN CAF TCD CHL CHN COL COM COG CRI
CIV HRV CUB CYP CZE PRK COD DNK DJI DMA DOM ECU EGY SLV GNQ ERI EST SWZ ETH FJI
FIN FRA GAB GMB GEO DEU GHA GRC GRD GTM GIN GNB GUY HTI HND HUN ISL IND IDN IRN
IRQ IRL ISR ITA JAM JPN JOR KAZ KEN KIR KWT KGZ LAO LVA LBN LSO LBR LBY LIE LTU
LUX MDG MWI MYS MDV MLI MLT MHL MRT MUS MEX FSM MCO MNG MNE MAR MOZ MMR NAM NRU
NPL NLD NZL NIC NER NGA MKD NOR OMN PAK PLW PAN PNG PRY PER PHL POL PRT QAT KOR
MDA ROU RUS RWA KNA LCA VCT WSM SMR STP SAU SEN SRB SYC SLE SGP SVK SVN SLB SOM
ZAF SSD ESP LKA SDN SUR SWE CHE SYR TJK THA TLS TGO TON TTO TUN TUR TKM TUV UGA
UKR ARE GBR TZA USA URY UZB VUT VEN VNM YEM ZMB ZWE`.trim().split(/\s+/);

/** 넣지 않는 회원국과 이유 (계획 8 D2) */
const EXCLUDED = { ISR: '수도 분쟁(예루살렘)', NRU: '공식 수도가 없음' };

// ── 손으로 정한 표: ISO3 → [국기 code, 나라, 수도, 수도 영어 이름(지도 점 찾기), level, 덧붙임] ──
// level 1 = 아이도 아는 나라(G20·이웃 나라·여행지로 유명한 나라 40개), 2 = 교과서·뉴스에 자주 나오는 나라, 3 = 나머지
// 덧붙임: at = 손으로 확인한 수도 좌표, alias = 지도 점의 다른 영어 이름, mapId = countries.geojson id가 ISO3와 다를 때,
//         focus = 카메라 상자를 손으로 정할 때 [[서, 남], [동, 북]] — 'all'이면 그 나라 면 전체 + 수도 (날짜변경선을 넘지 않는 나라만)
// 수도 표기 확인: 표준국어대사전(stdict.korean.go.kr, 2026-10) 표제어·나라 뜻풀이의 '수도는 ○○' — 외래어 표기 용례 사이트(kornorms)는 접속되지 않았다
// 수도가 여럿인 나라는 외교부가 수도로 적는 하나(맨 앞, 또는 헌법상 수도)를 쓴다 — 아래 줄 끝 주석 참고
const TABLE = {
  // 아시아
  AFG: ['af', '아프가니스탄', '카불', 'Kabul', 3],
  ARE: ['ae', '아랍에미리트', '아부다비', 'Abu Dhabi', 1],
  ARM: ['am', '아르메니아', '예레반', 'Yerevan', 3],
  AZE: ['az', '아제르바이잔', '바쿠', 'Baku', 3],
  BGD: ['bd', '방글라데시', '다카', 'Dhaka', 2],
  BHR: ['bh', '바레인', '마나마', 'Manama', 3],
  BRN: ['bn', '브루나이', '반다르스리브가완', 'Bandar Seri Begawan', 3, { focus: 'all' }], // 동쪽 템부롱까지
  BTN: ['bt', '부탄', '팀푸', 'Thimphu', 3], // 표준국어대사전 표제어 '팀푸'·외교부 같음 (지도 이름표는 '팀부')
  CHN: ['cn', '중국', '베이징', 'Beijing', 1],
  CYP: ['cy', '사이프러스', '니코시아', 'Nicosia', 3], // 외교부 표기 '사이프러스'(교과서·국어원은 키프로스)
  GEO: ['ge', '조지아', '트빌리시', 'Tbilisi', 3],
  IDN: ['id', '인도네시아', '자카르타', 'Jakarta', 1, { focus: 'all' }], // 수마트라~파푸아. 누산타라 이전은 대통령령 전이라 수도는 아직 자카르타 (2026-05 헌법재판소)
  IND: ['in', '인도', '뉴델리', 'New Delhi', 1],
  IRN: ['ir', '이란', '테헤란', 'Tehran', 2],
  IRQ: ['iq', '이라크', '바그다드', 'Baghdad', 2],
  JOR: ['jo', '요르단', '암만', 'Amman', 2],
  JPN: ['jp', '일본', '도쿄', 'Tokyo', 1, { focus: [[129.58, 31.01], [145.84, 45.52]] }], // 큰 섬 넷(혼슈·홋카이도·규슈·시코쿠)
  KAZ: ['kz', '카자흐스탄', '아스타나', 'Astana', 2, { alias: ['Nur-Sultan'] }],
  KGZ: ['kg', '키르기스스탄', '비슈케크', 'Bishkek', 3],
  KHM: ['kh', '캄보디아', '프놈펜', 'Phnom Penh', 1],
  KOR: ['kr', '대한민국', '서울', 'Seoul', 1, { focus: [[124.6, 33.1], [131.9, 38.6]] }], // 계획 8 예시 상자 (제주·백령도·독도까지)
  KWT: ['kw', '쿠웨이트', '쿠웨이트시', 'Kuwait City', 2], // 외교부 '쿠웨이트시'(지도 '쿠웨이트 시'). 표준국어대사전은 도시도 '쿠웨이트'라 나라 이름과 구별되게 외교부를 따름
  LAO: ['la', '라오스', '비엔티안', 'Vientiane', 2],
  LBN: ['lb', '레바논', '베이루트', 'Beirut', 3],
  LKA: ['lk', '스리랑카', '콜롬보', 'Colombo', 2], // 외교부: 콜롬보(상업 수도)를 먼저, 스리자야와르데네푸라코테(행정 수도)
  MDV: ['mv', '몰디브', '말레', 'Malé', 2, { focus: 'all' }], // 지도 면 두 조각이 크기가 같아 수도 쪽 조각이 잘리던 것
  MMR: ['mm', '미얀마', '네피도', 'Naypyidaw', 2],
  MNG: ['mn', '몽골', '울란바타르', 'Ulaanbaatar', 1], // 국어원 2026년 심의로 '울란바타르'(울란바토르는 관용)
  MYS: ['my', '말레이시아', '쿠알라룸푸르', 'Kuala Lumpur', 1, { focus: 'all' }], // 말레이반도+보르네오. 행정 중심 푸트라자야가 따로 있지만 외교부 수도는 쿠알라룸푸르
  NPL: ['np', '네팔', '카트만두', 'Kathmandu', 2],
  OMN: ['om', '오만', '무스카트', 'Muscat', 3],
  PAK: ['pk', '파키스탄', '이슬라마바드', 'Islamabad', 2],
  PHL: ['ph', '필리핀', '마닐라', 'Manila', 1, { focus: 'all' }], // 루손~민다나오
  PRK: ['kp', '북한', '평양', 'Pyongyang', 1],
  QAT: ['qa', '카타르', '도하', 'Doha', 2],
  SAU: ['sa', '사우디아라비아', '리야드', 'Riyadh', 1],
  SGP: ['sg', '싱가포르', '싱가포르', 'Singapore', 1],
  SYR: ['sy', '시리아', '다마스쿠스', 'Damascus', 2],
  THA: ['th', '태국', '방콕', 'Bangkok', 1],
  TJK: ['tj', '타지키스탄', '두샨베', 'Dushanbe', 3],
  TKM: ['tm', '투르크메니스탄', '아시가바트', 'Ashgabat', 3], // 표준국어대사전 '수도는 아시가바트'
  TLS: ['tl', '동티모르', '딜리', 'Dili', 3],
  TUR: ['tr', '튀르키예', '앙카라', 'Ankara', 1],
  UZB: ['uz', '우즈베키스탄', '타슈켄트', 'Tashkent', 2],
  VNM: ['vn', '베트남', '하노이', 'Hanoi', 1],
  YEM: ['ye', '예멘', '사나', 'Sanaa', 3], // 외교부 수도 사나 (아덴은 임시 수도)

  // 유럽
  ALB: ['al', '알바니아', '티라나', 'Tirana', 3],
  AND: ['ad', '안도라', '안도라라베야', 'Andorra la Vella', 3], // 표준국어대사전 '수도는 안도라라베야'·지도 같음 (외교부 '안도라 라 벨랴')
  AUT: ['at', '오스트리아', '빈', 'Vienna', 2],
  BEL: ['be', '벨기에', '브뤼셀', 'Brussels', 2],
  BGR: ['bg', '불가리아', '소피아', 'Sofia', 3],
  BIH: ['ba', '보스니아헤르체고비나', '사라예보', 'Sarajevo', 3],
  BLR: ['by', '벨라루스', '민스크', 'Minsk', 3],
  CHE: ['ch', '스위스', '베른', 'Bern', 1],
  CZE: ['cz', '체코', '프라하', 'Prague', 2],
  DEU: ['de', '독일', '베를린', 'Berlin', 1],
  DNK: ['dk', '덴마크', '코펜하겐', 'Copenhagen', 2],
  ESP: ['es', '스페인', '마드리드', 'Madrid', 1],
  EST: ['ee', '에스토니아', '탈린', 'Tallinn', 3],
  FIN: ['fi', '핀란드', '헬싱키', 'Helsinki', 2],
  FRA: ['fr', '프랑스', '파리', 'Paris', 1],
  GBR: ['gb', '영국', '런던', 'London', 1, { focus: [[-8.15, 50.02], [1.75, 58.65]] }], // 그레이트브리튼섬+북아일랜드
  GRC: ['gr', '그리스', '아테네', 'Athens', 1, { focus: 'all' }], // 크레타섬까지
  HRV: ['hr', '크로아티아', '자그레브', 'Zagreb', 2, { focus: 'all' }], // 네움 남쪽 두브로브니크까지
  HUN: ['hu', '헝가리', '부다페스트', 'Budapest', 2],
  IRL: ['ie', '아일랜드', '더블린', 'Dublin', 2],
  ISL: ['is', '아이슬란드', '레이캬비크', 'Reykjavik', 2],
  ITA: ['it', '이탈리아', '로마', 'Rome', 1, { focus: 'all' }], // 시칠리아·사르데냐까지
  LIE: ['li', '리히텐슈타인', '파두츠', 'Vaduz', 3],
  LTU: ['lt', '리투아니아', '빌뉴스', 'Vilnius', 3],
  LUX: ['lu', '룩셈부르크', '룩셈부르크', 'Luxembourg', 3],
  LVA: ['lv', '라트비아', '리가', 'Riga', 3],
  MCO: ['mc', '모나코', '모나코', 'Monaco', 3],
  MDA: ['md', '몰도바', '키시너우', 'Chisinau', 3], // 외교부 '키시나우', 국어원(루마니아어 ă→어) '키시너우'
  MKD: ['mk', '북마케도니아', '스코페', 'Skopje', 3],
  MLT: ['mt', '몰타', '발레타', 'Valletta', 3],
  MNE: ['me', '몬테네그로', '포드고리차', 'Podgorica', 3],
  NLD: ['nl', '네덜란드', '암스테르담', 'Amsterdam', 1], // 헌법상 수도 암스테르담 (정부는 헤이그)
  NOR: ['no', '노르웨이', '오슬로', 'Oslo', 1],
  POL: ['pl', '폴란드', '바르샤바', 'Warsaw', 2],
  PRT: ['pt', '포르투갈', '리스본', 'Lisbon', 1],
  ROU: ['ro', '루마니아', '부쿠레슈티', 'Bucharest', 2],
  RUS: ['ru', '러시아', '모스크바', 'Moscow', 1],
  SMR: ['sm', '산마리노', '산마리노', 'San Marino', 3],
  SRB: ['rs', '세르비아', '베오그라드', 'Belgrade', 3],
  SVK: ['sk', '슬로바키아', '브라티슬라바', 'Bratislava', 3],
  SVN: ['si', '슬로베니아', '류블랴나', 'Ljubljana', 3],
  SWE: ['se', '스웨덴', '스톡홀름', 'Stockholm', 1],
  UKR: ['ua', '우크라이나', '키이우', 'Kyiv', 2],

  // 아프리카
  AGO: ['ao', '앙골라', '루안다', 'Luanda', 3],
  BDI: ['bi', '부룬디', '기테가', 'Gitega', 3, { at: [29.9247, -3.4264] }], // 2019년 정치 수도를 기테가로 (외교부 기테가). 지도 점은 부줌부라
  BEN: ['bj', '베냉', '포르토노보', 'Porto-Novo', 3], // 외교부 수도 포르토노보 (경제 수도 코토누)
  BFA: ['bf', '부르키나파소', '와가두구', 'Ouagadougou', 3],
  BWA: ['bw', '보츠와나', '가보로네', 'Gaborone', 3],
  CAF: ['cf', '중앙아프리카공화국', '방기', 'Bangui', 3],
  CIV: ['ci', '코트디부아르', '야무수크로', 'Yamoussoukro', 3], // 외교부 수도 야무수크로 (경제 수도 아비장)
  CMR: ['cm', '카메룬', '야운데', 'Yaounde', 3],
  COD: ['cd', '콩고민주공화국', '킨샤사', 'Kinshasa', 3],
  COG: ['cg', '콩고공화국', '브라자빌', 'Brazzaville', 3],
  COM: ['km', '코모로', '모로니', 'Moroni', 3, { focus: 'all' }], // 섬 셋
  CPV: ['cv', '카보베르데', '프라이아', 'Praia', 3, { focus: 'all' }], // 외교부 '프라야', 국어원 '프라이아'. 섬 10개 전체
  DJI: ['dj', '지부티', '지부티', 'Djibouti', 3],
  DZA: ['dz', '알제리', '알제', 'Algiers', 2],
  EGY: ['eg', '이집트', '카이로', 'Cairo', 1],
  ERI: ['er', '에리트레아', '아스마라', 'Asmara', 3],
  ETH: ['et', '에티오피아', '아디스아바바', 'Addis Ababa', 2],
  GAB: ['ga', '가봉', '리브르빌', 'Libreville', 3],
  GHA: ['gh', '가나', '아크라', 'Accra', 2],
  GIN: ['gn', '기니', '코나크리', 'Conakry', 3],
  GMB: ['gm', '감비아', '반줄', 'Banjul', 3],
  GNB: ['gw', '기니비사우', '비사우', 'Bissau', 3],
  // 적도기니: 2026-01-02 대통령령으로 법적 수도가 시우다드데라파스(지블로호주)가 됐지만 기관 이전(기한 1년) 중이고 외교부는 아직 말라보.
  //   시우다드데라파스는 보기(오답)에 넣지 않는다. 2027-01 뒤 외교부 국가정보를 다시 보고, 바뀌었으면 capital '시우다드데라파스', at [10.67, 1.58] 근처로 바꾼다
  GNQ: ['gq', '적도기니', '말라보', 'Malabo', 3, { focus: 'all' }], // 수도가 있는 비오코섬 + 본토
  KEN: ['ke', '케냐', '나이로비', 'Nairobi', 1],
  LBR: ['lr', '라이베리아', '몬로비아', 'Monrovia', 3],
  LBY: ['ly', '리비아', '트리폴리', 'Tripoli', 3],
  LSO: ['ls', '레소토', '마세루', 'Maseru', 3],
  MAR: ['ma', '모로코', '라바트', 'Rabat', 2, { focus: [[-13.18, 27.65], [-1.06, 35.93]] }], // 지도 MAR 면이 서사하라(D2 인정이 갈리는 곳)까지 덮어 본토(북위 27.66 위)만
  MDG: ['mg', '마다가스카르', '안타나나리보', 'Antananarivo', 2],
  MLI: ['ml', '말리', '바마코', 'Bamako', 3],
  MOZ: ['mz', '모잠비크', '마푸투', 'Maputo', 3],
  MRT: ['mr', '모리타니아', '누악쇼트', 'Nouakchott', 3], // 외교부 표기 '모리타니아'(국어원은 모리타니)
  MUS: ['mu', '모리셔스', '포트루이스', 'Port Louis', 3],
  MWI: ['mw', '말라위', '릴롱궤', 'Lilongwe', 3],
  NAM: ['na', '나미비아', '빈트후크', 'Windhoek', 3], // 외교부 '빈트훅', 국어원 '빈트후크'
  NER: ['ne', '니제르', '니아메', 'Niamey', 3],
  NGA: ['ng', '나이지리아', '아부자', 'Abuja', 2],
  RWA: ['rw', '르완다', '키갈리', 'Kigali', 3],
  SDN: ['sd', '수단', '하르툼', 'Khartoum', 3], // 외교부 '카르툼', 국어원 '하르툼'
  SEN: ['sn', '세네갈', '다카르', 'Dakar', 3],
  SLE: ['sl', '시에라리온', '프리타운', 'Freetown', 3],
  SOM: ['so', '소말리아', '모가디슈', 'Mogadishu', 3],
  SSD: ['ss', '남수단', '주바', 'Juba', 3, { mapId: 'SDS' }], // 지도(Natural Earth)는 남수단 id가 SDS — capitals.json의 iso3 칸은 countries.geojson id라 남수단만 ISO(SSD)와 다르다
  STP: ['st', '상투메프린시페', '상투메', 'Sao Tome', 3, { focus: 'all' }], // 프린시페섬까지
  SWZ: ['sz', '에스와티니', '음바바네', 'Mbabane', 3], // 외교부 수도 음바바네 (왕실·입법 수도 로밤바)
  SYC: ['sc', '세이셸', '빅토리아', 'Victoria', 3],
  TCD: ['td', '차드', '은자메나', "N'Djamena", 3],
  TGO: ['tg', '토고', '로메', 'Lome', 3],
  TUN: ['tn', '튀니지', '튀니스', 'Tunis', 2],
  TZA: ['tz', '탄자니아', '도도마', 'Dodoma', 2], // 외교부 수도 도도마 (지도 점은 다르에스살람)
  UGA: ['ug', '우간다', '캄팔라', 'Kampala', 3],
  ZAF: ['za', '남아프리카공화국', '프리토리아', 'Pretoria', 1], // 외교부: 프리토리아(행정)·케이프타운(입법)·블룸폰테인(사법) 중 맨 앞
  ZMB: ['zm', '잠비아', '루사카', 'Lusaka', 3],
  ZWE: ['zw', '짐바브웨', '하라레', 'Harare', 3],

  // 북아메리카 (중앙아메리카·카리브 포함)
  ATG: ['ag', '앤티가바부다', '세인트존스', "Saint John's", 3, { focus: 'all' }], // 바부다섬까지
  BHS: ['bs', '바하마', '나소', 'Nassau', 3, { focus: 'all' }], // 가장 큰 섬(안드로스)만 잡으면 나소가 상자 끝에 붙는다
  BLZ: ['bz', '벨리즈', '벨모판', 'Belmopan', 3],
  BRB: ['bb', '바베이도스', '브리지타운', 'Bridgetown', 3],
  CAN: ['ca', '캐나다', '오타와', 'Ottawa', 1],
  CRI: ['cr', '코스타리카', '산호세', 'San Jose', 3],
  CUB: ['cu', '쿠바', '아바나', 'Havana', 2],
  DMA: ['dm', '도미니카연방', '로조', 'Roseau', 3],
  DOM: ['do', '도미니카공화국', '산토도밍고', 'Santo Domingo', 3],
  GRD: ['gd', '그레나다', '세인트조지스', "St. George's", 3],
  GTM: ['gt', '과테말라', '과테말라시티', 'Guatemala City', 3],
  HND: ['hn', '온두라스', '테구시갈파', 'Tegucigalpa', 3],
  HTI: ['ht', '아이티', '포르토프랭스', 'Port-au-Prince', 3],
  JAM: ['jm', '자메이카', '킹스턴', 'Kingston', 2],
  KNA: ['kn', '세인트키츠네비스', '바스테르', 'Basseterre', 3],
  LCA: ['lc', '세인트루시아', '캐스트리스', 'Castries', 3],
  MEX: ['mx', '멕시코', '멕시코시티', 'Mexico City', 1],
  NIC: ['ni', '니카라과', '마나과', 'Managua', 3],
  PAN: ['pa', '파나마', '파나마시티', 'Panama City', 2],
  SLV: ['sv', '엘살바도르', '산살바도르', 'San Salvador', 3],
  TTO: ['tt', '트리니다드토바고', '포트오브스페인', 'Port of Spain', 3, { focus: 'all' }], // 토바고섬까지
  USA: ['us', '미국', '워싱턴 D.C.', 'Washington', 1], // 외교부 '워싱턴(Washington, D.C)' — 워싱턴주와 헷갈리지 않게 D.C.까지
  VCT: ['vc', '세인트빈센트그레나딘', '킹스타운', 'Kingstown', 3, { focus: 'all' }], // 그레나딘 제도 남쪽까지

  // 남아메리카
  ARG: ['ar', '아르헨티나', '부에노스아이레스', 'Buenos Aires', 1],
  BOL: ['bo', '볼리비아', '수크레', 'Sucre', 2], // 헌법상 수도 수크레 (정부는 라파스) — 계획 8 D3
  BRA: ['br', '브라질', '브라질리아', 'Brasilia', 1],
  CHL: ['cl', '칠레', '산티아고', 'Santiago', 1],
  COL: ['co', '콜롬비아', '보고타', 'Bogota', 2],
  ECU: ['ec', '에콰도르', '키토', 'Quito', 2],
  GUY: ['gy', '가이아나', '조지타운', 'Georgetown', 3],
  PER: ['pe', '페루', '리마', 'Lima', 1],
  PRY: ['py', '파라과이', '아순시온', 'Asuncion', 3],
  SUR: ['sr', '수리남', '파라마리보', 'Paramaribo', 3],
  URY: ['uy', '우루과이', '몬테비데오', 'Montevideo', 2],
  VEN: ['ve', '베네수엘라', '카라카스', 'Caracas', 2],

  // 오세아니아
  AUS: ['au', '호주', '캔버라', 'Canberra', 1, { focus: [[113.18, -43.62], [153.62, -10.7]] }], // 본토+태즈메이니아
  FJI: ['fj', '피지', '수바', 'Suva', 2],
  FSM: ['fm', '마이크로네시아', '팔리키르', 'Palikir', 3], // 외교부 표기 '마이크로네시아'(국어원은 미크로네시아)
  KIR: ['ki', '키리바시', '타라와', 'Tarawa', 3, { alias: ['South Tarawa'], focus: [[172.6, -2.7], [176.9, 3.4]] }], // 섬이 경도 40° 넘게 흩어져 수도가 있는 길버트 제도만
  MHL: ['mh', '마셜제도', '마주로', 'Majuro', 3],
  NZL: ['nz', '뉴질랜드', '웰링턴', 'Wellington', 1, { focus: [[166.47, -47.27], [178.54, -34.42]] }], // 남섬·북섬·스튜어트섬 (채텀 제도 등 먼 섬은 뺌)
  PLW: ['pw', '팔라우', '응어룰무드', 'Ngerulmud', 3, { at: [134.6242, 7.5006] }], // 표준국어대사전 표제어 '응어룰무드' (외교부 '응게룰무드'). 지도 점은 멜레케오크 주
  PNG: ['pg', '파푸아뉴기니', '포트모르즈비', 'Port Moresby', 2],
  SLB: ['sb', '솔로몬제도', '호니아라', 'Honiara', 3],
  TON: ['to', '통가', '누쿠알로파', "Nuku'alofa", 3], // 외교부 '누쿠아로파', 국어원 '누쿠알로파'
  TUV: ['tv', '투발루', '푸나푸티', 'Funafuti', 3],
  VUT: ['vu', '바누아투', '포트빌라', 'Port Vila', 3, { focus: 'all' }], // 수도가 있는 에파테섬이 잘리지 않게
  WSM: ['ws', '사모아', '아피아', 'Apia', 3, { focus: 'all' }], // 수도가 있는 우폴루섬이 잘리지 않게
};

/** countries.geojson continent → region */
const CONTINENT = {
  Asia: 'asia', Europe: 'europe', Africa: 'africa',
  'North America': 'north-america', 'South America': 'south-america', Oceania: 'oceania',
};
/** 지도에서 대양(Seven seas)으로 분류된 섬나라 → 가까운 대륙 */
const REGION_FIX = { MDV: 'asia', MUS: 'africa', SYC: 'africa' };
const REGION_ORDER = ['asia', 'europe', 'africa', 'north-america', 'south-america', 'oceania'];
/** 카메라 상자의 가장 작은 폭·높이(°). 지도에 면이 없는 나라도 수도 둘레를 이만큼 잡는다 */
const MIN_SPAN = 0.5;

// ── 표 확인 ─────────────────────────────────────────────
const problems = [];
if (UN_MEMBERS.length !== 193) problems.push(`UN 회원국이 ${UN_MEMBERS.length}개예요 (193개여야 해요)`);
if (new Set(UN_MEMBERS).size !== UN_MEMBERS.length) problems.push('UN 회원국 목록에 겹치는 코드가 있어요');
const wanted = UN_MEMBERS.filter((c) => !EXCLUDED[c]);
const missing = wanted.filter((c) => !TABLE[c]);
const extra = Object.keys(TABLE).filter((c) => !wanted.includes(c));
if (missing.length) problems.push(`표에 없는 나라: ${missing.join(', ')}`);
if (extra.length) problems.push(`표에 있으면 안 되는 나라: ${extra.join(', ')}`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

// ── 지도 데이터 ──────────────────────────────────────────
const countries = new Map(readGeo('public', 'data', 'countries.geojson').map((f) => [f.properties.id, f]));
const placeCaps = readGeo('public', 'data', 'places.geojson').filter((f) => f.properties.cls === 'capital');
const nePlaces = readGeo('data', 'raw', 'ne_10m_populated_places.geojson');

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

// 수도 자리: 손으로 정한 좌표 → places 수도 점(같은 나라, 같은 이름) → Natural Earth 마을 점(같은 나라, 같은 이름, 수도 점 먼저)
function findCapital(iso3, code, en, opt) {
  if (opt.at) return { at: opt.at, from: '손으로 확인한 좌표' };
  const names = new Set([en, ...(opt.alias ?? [])].map(norm));
  const place = placeCaps.find((f) => f.properties.country === iso3 && (names.has(norm(f.properties.en)) || f.properties.ko === TABLE[iso3][2]));
  if (place) return { at: place.geometry.coordinates, from: 'places' };
  const ne = nePlaces
    .filter((f) => (f.properties.ADM0_A3 === iso3 || f.properties.ISO_A2 === code.toUpperCase())
      && [f.properties.NAME, f.properties.NAMEASCII, f.properties.NAME_EN, ...String(f.properties.NAMEALT ?? '').split('|')].some((n) => names.has(norm(n))))
    .sort((a, b) => Number(!/^Admin-0 capital/.test(a.properties.FEATURECLA)) - Number(!/^Admin-0 capital/.test(b.properties.FEATURECLA)));
  if (ne.length) return { at: ne[0].geometry.coordinates, from: `ne_10m_populated_places (${ne[0].properties.FEATURECLA})` };
  return null;
}

// 폴리곤 넓이(km² 어림): 고리마다 평균 위도에서 경도를 줄여 잰다
function ringArea(ring) {
  const k = Math.cos((ring.reduce((s, [, y]) => s + y, 0) / ring.length) * Math.PI / 180);
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * k * ring[i][1] - ring[i][0] * k * ring[j][1];
  return (Math.abs(a) / 2) * 111.32 * 110.57;
}
const polygonArea = ([outer, ...holes]) => ringArea(outer) - holes.reduce((s, h) => s + ringArea(h), 0);
const polygonsOf = (f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
const EDGE = 179.9;
const touches = (polygon, side) => polygon[0].some(([x]) => (side > 0 ? x >= EDGE : x <= -EDGE));

// 카메라 상자: 가장 큰 땅 + 수도 (all이면 면 전체 + 수도). 가장 큰 땅이 날짜변경선에 닿으면 건너편에 닿은 땅을 경도 +360으로 이어 붙인다 (러시아 추코트카)
function focusOf(feature, capitalAt, all = false) {
  let xs = [];
  let ys = [];
  if (feature) {
    const polygons = polygonsOf(feature);
    const main = polygons.reduce((a, b) => (polygonArea(b) > polygonArea(a) ? b : a));
    const parts = all ? polygons : [main];
    for (const side of [1, -1]) {
      if (all || !touches(main, side)) continue;
      for (const p of polygons) if (p !== main && touches(p, -side)) parts.push(p);
    }
    const eastSide = touches(main, 1);
    for (const p of parts) {
      for (const [x, y] of p[0]) {
        xs.push(all || p === main ? x : eastSide && x < 0 ? x + 360 : !eastSide && x > 0 ? x - 360 : x);
        ys.push(y);
      }
    }
  }
  // 수도는 상자 가운데에서 가까운 쪽(±360)으로 붙인다
  let [cx, cy] = capitalAt;
  if (xs.length) {
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
    cx = [cx - 360, cx, cx + 360].reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
  }
  xs.push(cx);
  ys.push(cy);
  let [w, e, s, n] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  if (w < -180) [w, e] = [w + 360, e + 360]; // 날짜변경선을 넘으면 180을 넘는 경도로 적는다
  if (e - w < MIN_SPAN) [w, e] = [(w + e) / 2 - MIN_SPAN / 2, (w + e) / 2 + MIN_SPAN / 2];
  if (n - s < MIN_SPAN) [s, n] = [(s + n) / 2 - MIN_SPAN / 2, (s + n) / 2 + MIN_SPAN / 2];
  const out = (v, up) => (up ? Math.ceil(v * 100) : Math.floor(v * 100)) / 100;
  return [[out(w, false), out(s, false)], [out(e, true), out(n, true)]];
}

// ── 만들기 ──────────────────────────────────────────────
const rows = [];
const notes = [];
for (const iso3 of wanted) {
  const [code, country, capital, en, level, opt = {}] = TABLE[iso3];
  const mapId = opt.mapId ?? iso3;
  const feature = countries.get(mapId);
  if (!feature) notes.push(`${iso3} ${country}: countries.geojson에 면이 없어 수도 둘레 ${MIN_SPAN}° 상자로 잡아요`);
  const found = findCapital(iso3, code, en, opt);
  if (!found) {
    problems.push(`${iso3} ${country}: 수도 ${capital}(${en}) 자리를 찾지 못했어요 — 표에 at을 적어 주세요`);
    continue;
  }
  if (found.from !== 'places') notes.push(`${iso3} ${country}: 수도 ${capital} 자리 ← ${found.from}`);
  const region = REGION_FIX[iso3] ?? CONTINENT[feature?.properties.continent];
  if (!region) {
    problems.push(`${iso3} ${country}: 대륙 "${feature?.properties.continent}"을 정하지 못했어요 — REGION_FIX에 적어 주세요`);
    continue;
  }
  const capitalAt = [round(found.at[0], 3), round(found.at[1], 3)];
  if (opt.focus === 'all' && (!feature || polygonsOf(feature).some((p) => touches(p, 1) || touches(p, -1)))) {
    problems.push(`${iso3} ${country}: focus 'all'은 지도에 면이 있고 날짜변경선을 넘지 않는 나라만 써요`);
    continue;
  }
  const focus = Array.isArray(opt.focus) ? opt.focus : focusOf(feature, capitalAt, opt.focus === 'all');
  rows.push({ code, iso3: mapId, country, capital, capitalAt, region, level, focus });
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

rows.sort((a, b) => REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region) || a.country.localeCompare(b.country, 'ko'));
fs.writeFileSync(OUT, `{ "countries": [\n${rows.map((r) => `  ${JSON.stringify(r)}`).join(',\n')}\n] }\n`);

// ── 국기 그림 ────────────────────────────────────────────
const flagsAt = process.argv.indexOf('--flags');
const flagSrc = flagsAt < 0 ? null : process.argv[flagsAt + 1];
let copied = 0;
const noFlag = [];
for (const { code } of rows) {
  const dest = path.join(FLAGS, `${code}.svg`);
  if (fs.existsSync(dest)) continue;
  const src = flagSrc && path.join(flagSrc, `${code}.svg`);
  if (src && fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    copied++;
  } else noFlag.push(code);
}

// ── 보고 ────────────────────────────────────────────────
const count = (key) => Object.entries(rows.reduce((m, r) => ({ ...m, [r[key]]: (m[r[key]] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(' · ');
console.log(`capitals.json  ${rows.length}개국 (UN ${UN_MEMBERS.length}개 중 뺀 나라: ${Object.entries(EXCLUDED).map(([c, why]) => `${c} ${why}`).join(', ')})`);
console.log(`  대륙: ${count('region')}`);
console.log(`  단계: ${count('level')}`);
console.log(`  국기: ${copied}개 복사${noFlag.length ? ` · 그림 없음 ${noFlag.length}개: ${noFlag.join(' ')}${flagSrc ? '' : ' (--flags <폴더>로 복사)'}` : ''}`);
for (const n of notes) console.log(`  · ${n}`);
