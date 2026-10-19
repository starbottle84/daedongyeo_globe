// 국기 그림 파일 주소 (flag-icons, MIT — src/assets/flags/LICENSE). 필요한 나라 것만 넣어 두고, 빌드가 파일 주소로 바꾼다.
// 이모지 국기는 윈도우 컴퓨터에서 글자(JP 등)로만 보여서 그림 파일을 쓴다
const FLAGS = import.meta.glob<string>('../assets/flags/*.svg', { eager: true, query: '?url', import: 'default' });

export const flagUrl = (code: string): string | undefined => FLAGS[`../assets/flags/${code}.svg`];
