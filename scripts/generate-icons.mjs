// public/icons/icon.svg를 PWA·홈 화면용 PNG로 만든다
// 실행: npm run icons
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const iconDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const svg = await readFile(join(iconDir, 'icon.svg'));

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of targets) {
  const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
  await writeFile(join(iconDir, name), png);
  console.log(`wrote ${name} (${size}x${size})`);
}
