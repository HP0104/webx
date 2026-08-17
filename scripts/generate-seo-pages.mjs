import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  '/videos/all',
  '/videos/vam',
  '/videos/3d',
  '/blog',
  '/report'
];

const routes = [...new Set(staticRoutes)];
const indexPath = path.join(distDir, 'index.html');

const indexHtml = await readFile(indexPath, 'utf8');

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const titleByRoute = {
  '/': 'WEB18P - Kho game Việt hóa',
  '/games': 'Tất Cả Trò Chơi | WEB18P',
  '/category/hot': 'Game Hot | WEB18P',
  '/category/new': 'Game Mới Nhất | WEB18P',
  '/category/popular': 'Game Nhiều Người Chơi | WEB18P',
  '/category/top-rated': 'Game Đánh Giá Cao | WEB18P',
  '/category/18-plus': 'Game 18+ | WEB18P',
  '/category/18-all': 'Tất Cả Game 18+ | WEB18P',
  '/category/18-vn': 'Việt Hóa 18+ | WEB18P',
  '/category/18-uncensored': '18+ Không Che | WEB18P',
  '/category/18-pc': 'Game 18+ Cho PC | WEB18P',
  '/category/18-android': 'Game 18+ Cho Android | WEB18P',
  '/videos/all': 'Tất Cả Phim | WEB18P',
  '/videos/vam': 'Phim VAM | WEB18P',
  '/videos/3d': 'Phim 3D | WEB18P',
  '/blog': 'Blog | WEB18P',
  '/report': 'Báo Lỗi | WEB18P'
};

const descriptionByRoute = {
  '/': 'WEB18P - kho game Việt hóa, game PC và Android được cập nhật thường xuyên với thông tin chi tiết, ảnh minh họa và link tải.',
  '/games': 'Danh sách tất cả trò chơi đang có trên WEB18P.',
  '/videos/all': 'Xem tất cả phim trên WEB18P - cập nhật liên tục với chất lượng cao.',
  '/videos/vam': 'Xem phim VAM trên WEB18P - bộ sưu tập phim VAM chất lượng cao.',
  '/videos/3d': 'Xem phim 3D trên WEB18P - bộ sưu tập phim 3D chất lượng cao.',
  '/blog': 'Bài viết và cập nhật từ WEB18P.',
  '/report': 'Gửi báo lỗi và góp ý cho WEB18P.'
};

const getRouteMeta = (route) => {
  return {
    title: titleByRoute[route] || 'WEB18P',
    description: descriptionByRoute[route] || `${(titleByRoute[route] || 'WEB18P').replace(' | WEB18P', '')} được cập nhật trên WEB18P.`
  };
};

const buildRouteHtml = (route) => {
  const { title, description } = getRouteMeta(route);
  const canonical = `${siteUrl}${route === '/' ? '/' : `${route}/`}`;
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedCanonical = escapeHtml(canonical);

  return indexHtml
    .replace(/<title>.*?<\/title>/, `<title>${escapedTitle}</title>`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${escapedCanonical}" />`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapedDescription}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapedTitle}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapedDescription}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${escapedCanonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapedTitle}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapedDescription}" />`);
};

await writeFile(indexPath, buildRouteHtml('/'), 'utf8');

for (const route of routes.filter(route => route !== '/')) {
  const routeDir = path.join(distDir, route);
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, 'index.html'), buildRouteHtml(route), 'utf8');
}

await copyFile(indexPath, path.join(distDir, '404.html'));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${siteUrl}${route === '/' ? '/' : `${route}/`}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.startsWith('/game/') ? 'weekly' : route.startsWith('/videos') ? 'daily' : 'daily'}</changefreq>
    <priority>${route === '/' ? '1.0' : route.startsWith('/game/') ? '0.8' : route.startsWith('/videos') ? '0.8' : '0.7'}</priority>
  </url>`).join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

await writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
await writeFile(path.join(distDir, 'robots.txt'), robots, 'utf8');
