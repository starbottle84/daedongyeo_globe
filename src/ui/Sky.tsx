// 지구본 뒤 여권 표지 남색 하늘과 별 (지도 캔버스는 지구본 밖이 투명해서 이 하늘이 비친다)
const STARS = [
  { left: '7%', top: '18%', s: 9, d: 0.2 },
  { left: '22%', top: '9.5%', s: 6, o: 0.6, d: 1.1 },
  { left: '62%', top: '7%', s: 7, o: 0.7, d: 0.6 },
  { left: '9%', top: '39%', s: 12, c: '#E9C46A', d: 1.6 },
  { left: '86%', top: '43%', s: 8, o: 0.7, d: 0.9 },
  { left: '77%', top: '13%', s: 5, o: 0.55, d: 2 },
  { left: '4%', top: '28%', s: 5, o: 0.5, d: 0.4 },
  { left: '91%', top: '31%', s: 10, c: '#E9C46A', d: 1.3 },
];

export function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      {STARS.map((st, i) => (
        <span
          key={i}
          className="star"
          style={{
            left: st.left, top: st.top,
            ['--s' as string]: `${st.s}px`, ['--d' as string]: `${st.d}s`,
            ...(st.o ? { ['--o' as string]: st.o } : {}),
            ...(st.c ? { ['--c' as string]: st.c } : {}),
          }}
        >
          <svg><use href="#spark" /></svg>
        </span>
      ))}
    </div>
  );
}
