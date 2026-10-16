import sprite from './sprite.svg?raw';

// 그림 모음(동글이·아이콘·장소 그림)을 문서에 한 번만 붙인다. 각 화면은 <use href="#id">로 꺼내 쓴다.
// 우리가 만든 고정 파일이라 innerHTML로 넣어도 안전하다.
export function Sprite() {
  return <div className="sprite" aria-hidden="true" dangerouslySetInnerHTML={{ __html: sprite }} />;
}
