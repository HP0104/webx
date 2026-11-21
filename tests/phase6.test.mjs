import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('generate-seo-pages.mjs includes all active routes, excludes incomplete /blog, and preserves noindex 404.html', async () => {
  const seoGenSrc = await fs.readFile(path.join(rootDir, 'scripts/generate-seo-pages.mjs'), 'utf8');

  for (const route of [
    "'/about'",
    "'/contact'",
    "'/privacy'",
    "'/ai-search'",
    "'/videos/cosplay'",
    "'/videos/vietsub'",
    "'/videos/hentai'"
  ]) {
    assert.ok(seoGenSrc.includes(route), `Expected generate-seo-pages.mjs to include ${route}`);
  }

  assert.doesNotMatch(seoGenSrc, /copyFile\(indexPath,\s*path\.join\(distDir,\s*'404\.html'\)\)/);
  assert.doesNotMatch(seoGenSrc, /staticRoutes\s*=\s*\[[\s\S]*?'\/blog'/);
});

test('cloudflare_worker.js handles /game/ crawler OG metadata, removes self-refresh tag, and paginates sitemap with current video categories', async () => {
  const workerSrc = await fs.readFile(path.join(rootDir, 'cloudflare_worker.js'), 'utf8');

  assert.match(workerSrc, /pathname\.startsWith\(["']\/game\/["']\)/);
  assert.doesNotMatch(workerSrc, /<meta\s+http-equiv=["']refresh["']/i);
  assert.match(workerSrc, /nextPageToken/);

  for (const routeLoc of [
    'https://web18p.xyz/ai-search/',
    'https://web18p.xyz/videos/cosplay/',
    'https://web18p.xyz/videos/vietsub/',
    'https://web18p.xyz/videos/hentai/'
  ]) {
    assert.ok(workerSrc.includes(routeLoc), `Expected worker sitemap to include ${routeLoc}`);
  }
  assert.ok(!workerSrc.includes('<loc>https://web18p.xyz/blog/</loc>'), 'Incomplete /blog/ should not appear in sitemap');
});

test('CI workflow and .env.example stay in sync with client VITE_* env vars', async () => {
  const [workflowSrc, envExampleSrc] = await Promise.all([
    fs.readFile(path.join(rootDir, '.github/workflows/deploy-pages.yml'), 'utf8'),
    fs.readFile(path.join(rootDir, '.env.example'), 'utf8')
  ]);

  for (const envVar of ['VITE_FREEIMAGE_API_KEY', 'VITE_IMGBB_API_KEYS', 'VITE_STREAMHG_API_KEY', 'VITE_BANK_ID']) {
    assert.ok(workflowSrc.includes(envVar), `deploy-pages.yml missing ${envVar}`);
    assert.ok(envExampleSrc.includes(envVar), `.env.example missing ${envVar}`);
  }
});

test('test-e2e-suite.mjs uses .video-card selector and dynamic item resolution instead of stale hardcoded IDs', async () => {
  const e2eSrc = await fs.readFile(path.join(rootDir, 'scripts/test-e2e-suite.mjs'), 'utf8');

  assert.doesNotMatch(e2eSrc, /\.video-card-item/);
  assert.match(e2eSrc, /\.video-card/);
  assert.doesNotMatch(e2eSrc, /freshman-project-sex|1783264708316|1788253638453|1791559799510/);
});
