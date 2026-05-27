const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const openNext = path.join(root, '.open-next');

// Copy worker.js to _worker.js for Pages Functions detection
const workerSrc = path.join(openNext, 'worker.js');
const workerDest = path.join(openNext, '_worker.js');

if (fs.existsSync(workerSrc)) {
  fs.copyFileSync(workerSrc, workerDest);
  console.log('✓ Created _worker.js for Pages Functions');
} else {
  console.error('worker.js not found');
  process.exit(1);
}

// Move assets to root of .open-next
const assetsDir = path.join(openNext, 'assets');
if (fs.existsSync(assetsDir)) {
  const entries = fs.readdirSync(assetsDir);
  for (const entry of entries) {
    const src = path.join(assetsDir, entry);
    const dest = path.join(openNext, entry);
    fs.renameSync(src, dest);
  }
  fs.rmdirSync(assetsDir);
  console.log('✓ Moved assets to .open-next root');
}
