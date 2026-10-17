// 유아 음성 녹음 대본과 녹음 파일 목록(manifest) 만들기 (계획 4 작업 6 Step 2, D9: 성우 녹음은 나중에)
// 1. public/voice/lines.json(scripts/voice-lines.ts가 만듦)으로 성우용 대본 docs/voice/recording-script.{md,csv}를 만든다.
// 2. public/voice/에 실제로 있는 녹음 파일(<id>.mp3 또는 <id>.m4a)을 훑어 public/voice/manifest.json을 만든다.
//    앱은 manifest에 있는 문장만 재생을 시도한다 — 녹음 파일이 없어도 404 요청이나 콘솔 오류가 생기지 않는다.
// 실행: npm run voice:script (빌드 전에도 저절로 돈다)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VOICE_DIR = fileURLToPath(new URL('../public/voice/', import.meta.url));
const DOCS_DIR = fileURLToPath(new URL('../docs/voice/', import.meta.url));
const lines = JSON.parse(readFileSync(`${VOICE_DIR}lines.json`, 'utf8'));

/** 상황별 읽는 느낌 (공통 말 중 위로하는 말만 따로) */
const NOTES = {
  출발: '설레는 목소리로 밝게, 천천히',
  둘러보기: '이야기 들려주듯 천천히, 문장 사이에 잠깐 쉬기. 의성어·의태어는 리듬 있게',
  '미션 질문': '또박또박. 물어볼 때는 끝을 살짝 올리고, 눌러 보라고 할 때는 다정하게',
  '정답 설명': '칭찬에 이어 다정하게 알려 주듯',
  '함께 이야기': '같이 놀자고 부르듯 신나게',
  도장: '축하하듯 크고 밝게',
  '다음 장소': '궁금한 듯, 끝을 올려서',
  결과: '크게 칭찬하듯 짧고 힘 있게',
  힌트: '살짝 도와주듯 다정하게',
  '단계 열림': '깜짝 소식을 알리듯 신나게',
};
const noteOf = (line) => (line.id.startsWith('common.soft-') ? '따뜻하게 다독이듯, 천천히' : NOTES[line.situation] ?? '');
const fileOf = (line) => `${line.id}.mp3`;

// ───────── 1. 녹음 대본 ─────────
const rows = lines.map((line, i) => ({
  no: i + 1,
  file: fileOf(line),
  place: line.place ?? '공통',
  tier: '유아',
  situation: line.situation,
  text: line.text,
  note: noteOf(line),
}));

const cell = (s) => String(s).replace(/\|/g, '\\|');
const groups = [];
for (const row of rows) {
  const last = groups.at(-1);
  if (last && last.place === row.place) last.rows.push(row);
  else groups.push({ place: row.place, rows: [row] });
}
const md = [
  '# 유아 음성 녹음 대본',
  '',
  '> 자동 생성 파일이에요. 고치지 말고 `npm run voice:script`로 다시 만드세요 (콘텐츠 문장이 바뀌면 파일 이름도 바뀌어요).',
  '',
  '## 녹음 안내',
  '',
  '- **목소리:** 지구본 여행을 안내하는 캐릭터 \'동글이\'. 4~7세 아이에게 말하듯 밝고 따뜻하게, 평소보다 조금 느리게 읽어 주세요.',
  '- **한 줄 = 파일 하나:** 파일 이름은 표의 \'파일 이름\' 그대로 저장해 주세요. 이름 끝 여섯 자리는 문장마다 달라요.',
  '- **형식:** mp3, 44.1kHz, 모노, 128kbps 이상. 앞뒤 무음은 0.3초 이하, 파일마다 소리 크기를 고르게(약 -16 LUFS) 맞춰 주세요.',
  '- **넣는 곳:** 받은 파일을 `public/voice/`에 넣고 `npm run voice:script`를 돌리면 앱이 바로 재생해요. 그전까지 앱은 글(자막)만 보여 줘요.',
  '',
  `모두 ${rows.length}문장 · 장소 ${groups.filter((g) => g.place !== '공통').length}곳 + 공통 말`,
  '',
  ...groups.flatMap((g) => [
    `## ${g.place}`,
    '',
    '| 번호 | 파일 이름 | 장소 | 나이 구간 | 상황 | 읽을 문장 | 읽는 느낌 |',
    '|---:|---|---|---|---|---|---|',
    ...g.rows.map((r) => `| ${r.no} | \`${r.file}\` | ${cell(r.place)} | ${r.tier} | ${r.situation} | ${cell(r.text)} | ${cell(r.note)} |`),
    '',
  ]),
].join('\n');

// 엑셀에서 한글이 깨지지 않게 UTF-8 BOM을 붙인다
const csvCell = (s) => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s));
const csv = `\uFEFF${[
  ['번호', '파일 이름', '장소', '나이 구간', '상황', '읽을 문장', '읽는 느낌'],
  ...rows.map((r) => [r.no, r.file, r.place, r.tier, r.situation, r.text, r.note]),
].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;

mkdirSync(DOCS_DIR, { recursive: true });
writeFileSync(`${DOCS_DIR}recording-script.md`, md);
writeFileSync(`${DOCS_DIR}recording-script.csv`, csv);

// ───────── 2. 있는 녹음 파일 목록 ─────────
const ids = new Set(lines.map((l) => l.id));
const files = {};
const stale = [];
for (const name of readdirSync(VOICE_DIR).sort()) {
  const m = /^(.+)\.(mp3|m4a)$/.exec(name);
  if (!m) continue;
  if (!ids.has(m[1])) stale.push(name);
  // 같은 문장에 mp3·m4a가 둘 다 있으면 mp3를 쓴다
  else if (!files[m[1]] || m[2] === 'mp3') files[m[1]] = name;
}
// lines.json 순서대로 적는다 (파일을 넣고 빼도 차이가 그 줄만 보이게)
const manifest = { files: Object.fromEntries(lines.filter((l) => files[l.id]).map((l) => [l.id, files[l.id]])) };
writeFileSync(`${VOICE_DIR}manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

const have = Object.keys(manifest.files).length;
console.log(`녹음 대본 ${rows.length}줄 → docs/voice/recording-script.md, .csv`);
console.log(`녹음 파일 ${have}/${lines.length}개 있음, 없는 문장 ${lines.length - have}개 → public/voice/manifest.json`);
if (stale.length) console.log(`lines.json에 없는 옛 파일 ${stale.length}개 (문장이 바뀌었으면 다시 녹음): ${stale.join(', ')}`);
