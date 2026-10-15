# 대동여퀴즈 (유아~초등 지구본 지리 교육)

유아부터 초등학생까지 부모와 함께 3D 지구본을 여행하며 지리를 익히는 교육용 콘텐츠입니다.
지도는 [Natural Earth](https://www.naturalearthdata.com/)(퍼블릭 도메인) 데이터를 쓰고, 지명은 한국어로 표시합니다.
"위성 지도" 보기는 NASA Blue Marble 영상을 [NASA GIBS](https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api) 타일로 불러옵니다(인터넷 연결 필요).

## 실행

```bash
npm install
```

```bash
npm run dev
```

브라우저에서 http://localhost:5180 을 엽니다.

배포용 빌드는 `npm run build`로 만듭니다. 경로에 한글이 있어도 되도록 영문 임시 폴더에서 빌드한 뒤 `dist/`로 가져옵니다.
`main` 브랜치에 푸시하면 GitHub Actions가 GitHub Pages로 자동 배포합니다.

## 지도 데이터 다시 만들기

`public/data/*.geojson`은 Natural Earth 원본에서 한국어 지명과 라벨 위치만 골라낸 파일입니다.
원본(`data/raw`, 약 120MB)은 저장소에 올리지 않으니 필요하면 내려받은 뒤 다시 만듭니다.

```bash
npm run data:download
```

```bash
npm run data:build
```

지명 수정·장소 추가·표시 단계 조정은 `data/overrides.json`에서 합니다.

## 구성

- `src/globe/` — 지구본 스타일(`buildStyle.ts`), 보기 테마(`themes.ts`), 아이콘, 보기 기억, `GlobeView` 컴포넌트
- `src/components/` — 정보 카드, 위성 사진 실패 안내
- `scripts/build-data.mjs` — 원본 → 경량 GeoJSON 변환 (보정 데이터·강 한국어 이름 적용)
- `scripts/download-raw.mjs`, `scripts/download-glyphs.mjs`, `scripts/generate-icons.mjs` — 원본 데이터·글꼴·아이콘 준비
- `scripts/path-safe-build.mjs` — 한글 경로 안전 빌드
- `public/data/`, `public/fonts/`, `public/icons/` — 앱과 함께 배포되는 지도 데이터·글꼴·아이콘
- `data/overrides.json` — 지명 수정표, 추가 장소(독도·울릉도), 표시 단계 조정
