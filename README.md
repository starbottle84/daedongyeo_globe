# 대동여퀴즈 (유아~초등 지구본 지리 교육)

유아부터 초등학생까지 부모와 함께 3D 지구본을 여행하며 지리를 익히는 교육용 콘텐츠입니다.
지도는 [Natural Earth](https://www.naturalearthdata.com/)(퍼블릭 도메인) 데이터를 쓰고, 지명은 한국어로 표시합니다.
"위성 지도" 보기는 NASA Blue Marble 영상을 [NASA GIBS](https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api) 타일로 불러옵니다(인터넷 연결 필요).

## 실행

지도 파일을 브라우저가 읽어야 해서 로컬 서버로 엽니다.

```bash
python -m http.server 5180
```

브라우저에서 http://localhost:5180 을 엽니다.

## 지도 데이터 다시 만들기

`data/*.geojson`은 Natural Earth 원본에서 한국어 지명과 라벨 위치만 골라낸 파일입니다.
원본(`data/raw`, 약 120MB)은 저장소에 올리지 않으니 필요하면 내려받은 뒤 다시 만듭니다.

```bash
node scripts/download-raw.mjs
```

```bash
node scripts/build-data.mjs
```

## 구성

- `index.html`, `js/globe.js` — MapLibre GL JS 지구본, 확대 단계에 따라 지명 표시
- `scripts/build-data.mjs` — 원본 → 경량 GeoJSON 변환 (강 한국어 이름 사전, 짧은 나라 이름 포함)
- `scripts/download-raw.mjs` — Natural Earth 원본 내려받기
- `data/` — 지구본이 읽는 경량 GeoJSON
