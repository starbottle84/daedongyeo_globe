// 수도·도시·섬·산 아이콘을 캔버스로 직접 그린다 (2배 해상도, pixelRatio 2로 등록)
function drawIcon(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  return ctx.getImageData(0, 0, size, size);
}

export const ICONS: Record<string, () => ImageData> = {
  capital: () => drawIcon(32, (ctx, s) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? s * 0.46 : s * 0.2;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      ctx.lineTo(s / 2 + r * Math.cos(a), s / 2 + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = '#e03a3a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
  }),
  'admin1-capital': () => drawIcon(18, (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#1d2433';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
  }),
  city: () => drawIcon(14, (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1d2433';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fill();
  }),
  island: () => drawIcon(16, (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#3a9a5b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
  }),
  peak: () => drawIcon(22, (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s / 2, 2);
    ctx.lineTo(s - 2, s - 3);
    ctx.lineTo(2, s - 3);
    ctx.closePath();
    ctx.fillStyle = '#8b4f1d';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fill();
  }),
  // 지구본 둘레 울타리 칸: 아무것도 그리지 않은 투명한 12px 칸 (edgeGuard.ts가 둘레에 두른다)
  'edge-guard': () => drawIcon(24, () => {}),
};
