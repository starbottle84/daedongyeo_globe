// 왼쪽 위 '지구 여권' 배지 (장식 영문은 화면 읽기에서 뺀다)
export function LogoBadge() {
  return (
    <div className="logo" role="img" aria-label="지구 여권">
      <svg className="logo__mark" aria-hidden="true"><use href="#emblem" /></svg>
      <span className="logo__words" aria-hidden="true">
        <span className="logo__ko">지구 여권</span>
        <span className="logo__en">EARTH PASSPORT</span>
      </span>
    </div>
  );
}
