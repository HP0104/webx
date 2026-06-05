import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INITIAL_GAMES } from '../src/data/games.js';
import { getGamePath } from '../src/utils/gameRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const siteUrl = 'https://web18p.xyz';
const today = new Date().toISOString().slice(0, 10);

const staticRoutes = [
  '/',
  '/games',
  '/category/hot',
  '/category/new',
  '/category/popular',
  '/category/top-rated',
  '/category/18-plus',
  '/category/18-all',
  '/category/18-vn',
  '/category/18-uncensored',
  '/category/18-pc',
  '/category/18-android',
  '/blog',
  '/report'
];

const gameRoutes = INITIAL_GAMES.map(getGamePath);
const routes = [...new Set([...staticRoutes, ...gameRoutes])];
const indexPath = path.join(distDir, 'index.html');

await readFile(indexPath, 'utf8');

for (const route of routes.filter(route => route !== '/')) {
  const routeDir = path.join(distDir, route);
  await mkdir(routeDir, { recursive: true });
  await copyFile(indexPath, path.join(routeDir, 'index.html'));
}

await copyFile(indexPath, path.join(distDir, '404.html'));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${siteUrl}${route === '/' ? '/' : route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.startsWith('/game/') ? 'weekly' : 'daily'}</changefreq>
    <priority>${route === '/' ? '1.0' : route.startsWith('/game/') ? '0.8' : '0.7'}</priority>
  </url>`).join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

await writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
await writeFile(path.join(distDir, 'robots.txt'), robots, 'utf8');
