import { execSync } from 'node:child_process';
import { readFileSync, copyFileSync, renameSync, readdirSync, rmdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const openNext = join(root, '.open-next');

console.log('▶ Step 1: OpenNext build...');
execSync('npx opennextjs-cloudflare build --skipWranglerConfigCheck', {
  stdio: 'inherit',
  cwd: root,
});

console.log('\n▶ Step 2: Prepare for Pages Functions...');

const workerSrc = join(openNext, 'worker.js');
if (!existsSync(workerSrc)) {
  console.error('ERROR: worker.js not found');
  process.exit(1);
}
copyFileSync(workerSrc, join(openNext, '_worker.js'));
console.log('✓ Created _worker.js');

const assetsDir = join(openNext, 'assets');
if (existsSync(assetsDir)) {
  for (const entry of readdirSync(assetsDir)) {
    renameSync(join(assetsDir, entry), join(openNext, entry));
  }
  rmdirSync(assetsDir);
  console.log('✓ Moved assets to root');
}

console.log('\n✓ Build complete');
