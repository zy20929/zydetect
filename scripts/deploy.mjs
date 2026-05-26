/**
 * Custom deploy script for Cloudflare Pages.
 * Bypasses wrangler autoconfig/migrate flow which always injects
 * WORKER_SELF_REFERENCE with the WRONG service name.
 *
 * Flow:
 * 1. Run OpenNext build (without wrangler config check)
 * 2. Generate correct wrangler.jsonc with proper service name
 * 3. Deploy via wrangler with OPEN_NEXT_DEPLOY=true to prevent recursion
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Read package.json for worker name
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const workerName = (pkg.name || 'app')
  .toLowerCase()
  .replace(/^@[^/]+\//, '')
  .replace(/_/g, '-')
  .replace(/[^a-z0-9-]/g, '');

console.log(`Worker name: ${workerName}`);

// Step 1: Run OpenNext build
console.log('\n▶ Step 1: Running OpenNext build...');
execSync('npx opennextjs-cloudflare build --skipWranglerConfigCheck', {
  stdio: 'inherit',
  cwd: root,
});

// Step 2: Generate correct wrangler.jsonc
console.log('\n▶ Step 2: Generating wrangler.jsonc...');
const wranglerConfig = {
  name: workerName,
  main: '.open-next/worker.js',
  compatibility_date: new Date().toISOString().slice(0, 10),
  compatibility_flags: ['nodejs_compat'],
  assets: {
    directory: '.open-next/assets',
    binding: 'ASSETS',
  },
  observability: {
    enabled: true,
  },
  // NO services - WORKER_SELF_REFERENCE is not needed without ISR cache
};

writeFileSync(
  join(root, 'wrangler.jsonc'),
  JSON.stringify(wranglerConfig, null, 2) + '\n',
  'utf-8'
);

console.log('✓ wrangler.jsonc written (no WORKER_SELF_REFERENCE)');

// Step 3: Deploy via wrangler directly
console.log('\n▶ Step 3: Deploying...');
execSync('npx wrangler deploy', {
  stdio: 'inherit',
  cwd: root,
  env: {
    ...process.env,
    OPEN_NEXT_DEPLOY: 'true',
  },
});

console.log('\n✓ Deploy complete!');
