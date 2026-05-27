/**
 * Custom deploy script for Cloudflare Pages.
 * Uses `wrangler pages deploy` to get *.pages.dev domain (free, better China access).
 *
 * Flow:
 * 1. Run OpenNext build (without wrangler config check)
 * 2. Generate correct wrangler.jsonc with proper service name
 * 3. Deploy via wrangler pages deploy with OPEN_NEXT_DEPLOY=true to prevent recursion
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Read package.json for project name
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const projectName = (pkg.name || 'app')
  .toLowerCase()
  .replace(/^@[^/]+\//, '')
  .replace(/_/g, '-')
  .replace(/[^a-z0-9-]/g, '');

console.log(`Project name: ${projectName}`);

// Step 1: Run OpenNext build
console.log('\n▶ Step 1: Running OpenNext build...');
execSync('npx opennextjs-cloudflare build --skipWranglerConfigCheck', {
  stdio: 'inherit',
  cwd: root,
});

// Step 2: Generate wrangler.jsonc for OpenNext compatibility
// Pages deploy doesn't use wrangler.jsonc directly, but OpenNext may reference it
console.log('\n▶ Step 2: Generating wrangler.jsonc...');
const wranglerConfig = {
  name: projectName,
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
};

writeFileSync(
  join(root, 'wrangler.jsonc'),
  JSON.stringify(wranglerConfig, null, 2) + '\n',
  'utf-8'
);

console.log('✓ wrangler.jsonc written');

// Step 3: Deploy via wrangler pages deploy
console.log('\n▶ Step 3: Deploying to Cloudflare Pages...');
execSync(`npx wrangler pages deploy .open-next --project-name ${projectName}`, {
  stdio: 'inherit',
  cwd: root,
  env: {
    ...process.env,
    OPEN_NEXT_DEPLOY: 'true',
  },
});

console.log('\n✓ Pages deploy complete!');
console.log(`\nApp available at: https://${projectName}.pages.dev`);
