import type { ReactNode } from 'react';

// 왼쪽 위 '지구 여권' 배지 (장식 영문은 화면 읽기에서 뺀다). children(부모님 버튼)은 배지 오른쪽 같은 줄에 둔다
export function LogoBadge({ children }: { children?: ReactNode }) {
  return (
    <div className="corner">
      <div className="logo" role="img" aria-label="지구 여권">
        <svg className="logo__mark" aria-hidden="true"><use href="#emblem" /></svg>
        <span className="logo__words" aria-hidden="true">
          <span className="logo__ko">지구 여권</span>
          <span className="logo__en">EARTH PASSPORT</span>
        </span>
      </div>
      {children}
    </div>
  );
}
