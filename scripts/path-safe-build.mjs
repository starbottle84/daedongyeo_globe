// 한글 등 ASCII가 아닌 문자가 들어간 경로(Windows)에서도 Vite 빌드가 되도록,
// 영문 임시 폴더에 빌드 재료를 복사해 빌드하고 dist만 다시 가져온다.
// 실행: npm run build
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { cp, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function needsAsciiMirror(projectPath, platform = process.platform) {
  return platform === 'win32' && /[^\x00-\x7F]/.test(projectPath);
}

export function safeMirrorName(projectPath) {
  const hash = createHash('sha256').update(projectPath).digest('hex').slice(0, 12);
  return `daedongyeo-build-${hash}`;
}

function run(command, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false, env: process.env });
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(new Error(`${basename(command)} exited with ${code ?? signal}`));
    });
  });
}

async function copyBuildInputs(projectRoot, mirrorRoot) {
  const entries = [
    'src',
    'public',
    'index.html',
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
  ];

  await mkdir(mirrorRoot, { recursive: true });
  for (const entry of entries) {
    await cp(join(projectRoot, entry), join(mirrorRoot, entry), { recursive: true, force: true });
  }
  await symlink(join(projectRoot, 'node_modules'), join(mirrorRoot, 'node_modules'), 'junction');
}

export async function buildProject(projectRoot) {
  const root = resolve(projectRoot);
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  await run(process.execPath, [tsc, '-b'], root);

  if (!needsAsciiMirror(root)) {
    const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
    await run(process.execPath, [vite, 'build'], root);
    return;
  }

  const mirrorRoot = join(tmpdir(), safeMirrorName(root));
  await rm(mirrorRoot, { recursive: true, force: true });

  try {
    await copyBuildInputs(root, mirrorRoot);
    const vite = join(mirrorRoot, 'node_modules', 'vite', 'bin', 'vite.js');
    await run(process.execPath, [vite, 'build'], mirrorRoot);
    await rm(join(root, 'dist'), { recursive: true, force: true });
    await cp(join(mirrorRoot, 'dist'), join(root, 'dist'), { recursive: true });
    console.log(`Path-safe build copied dist back to ${root}`);
  } finally {
    await rm(mirrorRoot, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  buildProject(projectRoot).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
