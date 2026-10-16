import { useEffect, useState, type RefObject } from 'react';

// 스크롤하는 상자(scrollRef) 아래에 아직 보이지 않는 내용이 남았는지 알려 준다 (끝까지 내리면 false).
// 상자 높이(창 크기·안내 카드)나 안의 내용(contentRef: 단계·결과·메모·늦게 들어온 글꼴)이 바뀔 때도 다시 잰다.
// 시작 카드 종이와 여행 카드 본문이 함께 쓴다 — 아래쪽을 옅게 흐리고 작은 아래 화살표를 둘지 정할 때
export function useMoreBelow(scrollRef: RefObject<HTMLElement | null>, contentRef: RefObject<HTMLElement | null>): boolean {
  const [moreBelow, setMoreBelow] = useState(false);

  useEffect(() => {
    const box = scrollRef.current;
    const content = contentRef.current;
    if (!box || !content) return;
    const update = () => setMoreBelow(box.scrollHeight - box.scrollTop - box.clientHeight > 1);
    update();
    box.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(box);
    observer.observe(content);
    return () => {
      box.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [scrollRef, contentRef]);

  return moreBelow;
}
