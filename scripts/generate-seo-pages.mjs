import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const siteUrl = 'https://web18p.xyz';
const today = new Date().toISOString().slice(0, 10);
const FIRESTORE_PROJECT_ID = 'webk-a064e';

// Helper function to unwrap Firestore typed JSON into a normal JS object
function unwrapFirestore(fields) {
  if (!fields) return {};
  const result = {};
  for (const [key, val] of Object.entries(fields)) {
    if ('stringValue' in val) result[key] = val.stringValue;
    else if ('integerValue' in val) result[key] = Number(val.integerValue);
    else if ('doubleValue' in val) result[key] = Number(val.doubleValue);
    else if ('booleanValue' in val) result[key] = val.booleanValue;
    else if ('timestampValue' in val) result[key] = val.timestampValue;
    else if ('arrayValue' in val) {
      result[key] = (val.arrayValue.values || []).map(v => {
        if ('stringValue' in v) return v.stringValue;
        if ('integerValue' in v) return Number(v.integerValue);
        if ('doubleValue' in v) return Number(v.doubleValue);
        if ('booleanValue' in v) return v.booleanValue;
        if ('mapValue' in v) return unwrapFirestore(v.mapValue.fields);
        return v;
      });
    } else if ('mapValue' in val) {
      result[key] = unwrapFirestore(val.mapValue.fields);
    }
  }
  return result;
}

// Fetch all documents in a Firestore collection with pagination support
async function fetchFirestoreCollection(collectionName) {
  try {
    const docs = [];
    let pageToken = '';
    do {
      const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const res = await new Promise((resolve) => {
        https.get(url, (r) => {
          let body = '';
          r.on('data', chunk => { body += chunk; });
          r.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve({});
            }
          });
        }).on('error', (err) => {
          console.warn(`[SEO Generator] Error fetching ${collectionName} from Firestore:`, err.message);
          resolve({});
        });
      });

      if (res.documents && Array.isArray(res.documents)) {
        for (const doc of res.documents) {
          const docId = doc.name.split('/').pop();
          const unwrapped = unwrapFirestore(doc.fields);
          docs.push({ id: docId, ...unwrapped });
        }
      }
      pageToken = res.nextPageToken || '';
    } while (pageToken);

    return docs;
  } catch (err) {
    console.warn(`[SEO Generator] Failed to fetch collection ${collectionName}:`, err.message);
    return [];
  }
}

// Slug generator matching src/utils/gameRoutes.js exactly
function createGameSlug(game) {
  const source = game?.title || game?.id?.toString() || 'game';
  return source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'game';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cleanDescription(text, maxLen = 160) {
  if (!text) return '';
  const cleaned = String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen).trim()}...` : cleaned;
}

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
  '/videos',
  '/videos/all',
  '/videos/vam',
  '/videos/3d',
  '/manga',
  '/blog',
  '/report'
];

const titleByRoute = {
  '/': 'WEB18P - Kho Game Việt Hóa và Phim Chất Lượng Cao',
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
  '/videos': 'Kho Phim | WEB18P',
  '/videos/all': 'Tất Cả Phim | WEB18P',
  '/videos/vam': 'Phim VAM | WEB18P',
  '/videos/3d': 'Phim 3D | WEB18P',
  '/manga': 'Kho Truyện Tranh Online | WEB18P',
  '/blog': 'Blog | WEB18P',
  '/report': 'Báo Lỗi | WEB18P'
};

const descriptionByRoute = {
  '/': 'WEB18P - Kho game Việt hóa, game PC và Android, phim VAM, 3D được cập nhật thường xuyên với link tải tốc độ cao.',
  '/games': 'Danh sách tất cả trò chơi Việt hóa đang có trên WEB18P.',
  '/videos': 'Kho phim VAM, 3D sắc nét chất lượng cao cập nhật liên tục.',
  '/videos/all': 'Xem tất cả phim trên WEB18P - cập nhật liên tục với chất lượng cao.',
  '/videos/vam': 'Xem phim VAM trên WEB18P - bộ sưu tập phim VAM chất lượng cao.',
  '/videos/3d': 'Xem phim 3D trên WEB18P - bộ sưu tập phim 3D chất lượng cao.',
  '/manga': 'Đọc truyện tranh online miễn phí cập nhật chương mới liên tục.',
  '/blog': 'Bài viết chia sẻ, hướng dẫn và cập nhật từ WEB18P.',
  '/report': 'Gửi báo lỗi và góp ý cho đội ngũ WEB18P.'
};

async function run() {
  console.log('[SEO Generator] Starting SSG page generation...');
  const indexPath = path.join(distDir, 'index.html');
  const indexHtml = await readFile(indexPath, 'utf8');

  // 1. Fetch dynamic data from Firestore
  const [games, videos, mangaList] = await Promise.all([
    fetchFirestoreCollection('games'),
    fetchFirestoreCollection('videos'),
    fetchFirestoreCollection('manga')
  ]);
  console.log(`[SEO Generator] Fetched: ${games.length} games, ${videos.length} videos, ${mangaList.length} manga.`);

  // 2. Build metadata map
  const routeMeta = {};

  // Static routes
  for (const route of staticRoutes) {
    routeMeta[route] = {
      title: titleByRoute[route] || 'WEB18P',
      description: descriptionByRoute[route] || `${(titleByRoute[route] || 'WEB18P').replace(' | WEB18P', '')} được cập nhật trên WEB18P.`,
      image: 'https://web18p.xyz/favicon.svg',
      type: 'website'
    };
  }

  // Games
  for (const game of games) {
    const slug = createGameSlug(game);
    const route = `/game/${slug}`;
    routeMeta[route] = {
      title: `${game.title || 'Game'} - Tải Game Việt Hóa | WEB18P`,
      description: cleanDescription(game.description) || `Tải ${game.title || 'Game'} Việt hóa miễn phí cho PC và Android trên WEB18P. Link tải nhanh, thông tin chi tiết.`,
      image: game.image || 'https://web18p.xyz/favicon.svg',
      type: 'game',
      data: game
    };
  }

  // Videos
  for (const video of videos) {
    const route = `/video/${video.id}`;
    routeMeta[route] = {
      title: `${video.title || 'Phim'} | WEB18P`,
      description: cleanDescription(video.description) || `Xem video ${video.title || ''} chất lượng cao trên WEB18P.`,
      image: video.thumbnailUrl || 'https://web18p.xyz/favicon.svg',
      type: 'video',
      data: video
    };
  }

  // Manga
  for (const manga of mangaList) {
    const route = `/manga/${manga.id}`;
    routeMeta[route] = {
      title: `Truyện ${manga.title || ''} - Đọc Truyện Online | WEB18P`,
      description: cleanDescription(manga.description) || `Đọc truyện tranh ${manga.title || ''} trọn bộ, cập nhật chương mới trên WEB18P.`,
      image: manga.cover || 'https://web18p.xyz/favicon.svg',
      type: 'manga',
      data: manga
    };
  }

  const allRoutes = Object.keys(routeMeta);
  console.log(`[SEO Generator] Total routes to generate: ${allRoutes.length}`);

  const buildRouteHtml = (route) => {
    const meta = routeMeta[route] || {
      title: 'WEB18P',
      description: 'WEB18P - Kho game Việt hóa và Phim.',
      image: 'https://web18p.xyz/favicon.svg',
      type: 'website'
    };

    const canonical = `${siteUrl}${route === '/' ? '/' : `${route}/`}`;
    const escapedTitle = escapeHtml(meta.title);
    const escapedDescription = escapeHtml(meta.description);
    const escapedCanonical = escapeHtml(canonical);
    const escapedImage = escapeHtml(meta.image);

    // Schema JSON-LD
    let schemaJson;
    if (meta.type === 'game') {
      schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'VideoGame',
        name: meta.title,
        description: meta.description,
        image: meta.image,
        url: canonical,
        operatingSystem: 'Windows, Android',
        applicationCategory: 'Game'
      };
    } else if (meta.type === 'video') {
      schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: meta.title,
        description: meta.description,
        thumbnailUrl: meta.image,
        uploadDate: meta.data?.createdAt || today,
        contentUrl: canonical
      };
    } else if (meta.type === 'manga') {
      schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'Book',
        name: meta.title,
        description: meta.description,
        image: meta.image,
        url: canonical
      };
    } else {
      schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: meta.title,
        description: meta.description,
        url: canonical
      };
    }

    const schemaTag = `<script type="application/ld+json">\n${JSON.stringify(schemaJson, null, 2)}\n</script>`;

    // Semantic pre-rendered content for search crawlers inside #root
    // React createRoot will seamlessly clear this and mount the app when loaded.
    const preRenderContent = `
    <div id="root">
      <main style="max-width:1200px;margin:0 auto;padding:1.5rem;color:#f3f4f6;font-family:system-ui,-apple-system,sans-serif;">
        <h1 style="font-size:1.8rem;margin-bottom:1rem;">${escapedTitle}</h1>
        ${escapedImage && !escapedImage.endsWith('.svg') ? `<img src="${escapedImage}" alt="${escapedTitle}" style="max-width:100%;height:auto;border-radius:8px;margin-bottom:1rem;" />` : ''}
        <p style="font-size:1.1rem;line-height:1.6;color:#d1d5db;">${escapedDescription}</p>
      </main>
    </div>`;

    let html = indexHtml
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapedTitle}</title>`)
      .replace(/<link\s+rel="canonical"[\s\S]*?\/>/, `<link rel="canonical" href="${escapedCanonical}" />`)
      .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${escapedDescription}" />`)
      .replace(/<meta\s+property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${escapedTitle}" />`)
      .replace(/<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${escapedDescription}" />`)
      .replace(/<meta\s+property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${escapedCanonical}" />`)
      .replace(/<meta\s+name="twitter:title"[\s\S]*?\/>/, `<meta name="twitter:title" content="${escapedTitle}" />`)
      .replace(/<meta\s+name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${escapedDescription}" />`)
      .replace(/<div id="root"><\/div>/, preRenderContent);

    // Ensure og:image and twitter:image are present
    if (html.includes('<meta property="og:image"')) {
      html = html.replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${escapedImage}" />`);
    } else {
      html = html.replace('</head>', `  <meta property="og:image" content="${escapedImage}" />\n</head>`);
    }

    if (html.includes('<meta name="twitter:image"')) {
      html = html.replace(/<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${escapedImage}" />`);
    } else {
      html = html.replace('</head>', `  <meta name="twitter:image" content="${escapedImage}" />\n</head>`);
    }

    // Insert schema before </head>
    html = html.replace('</head>', `  ${schemaTag}\n</head>`);

    return html;
  };

  // 3. Write index.html for root
  await writeFile(indexPath, buildRouteHtml('/'), 'utf8');

  // 4. Generate directory /index.html for every sub-route
  let generatedCount = 0;
  for (const route of allRoutes.filter(r => r !== '/')) {
    const routeDir = path.join(distDir, route);
    await mkdir(routeDir, { recursive: true });
    await writeFile(path.join(routeDir, 'index.html'), buildRouteHtml(route), 'utf8');
    generatedCount++;
  }
  console.log(`[SEO Generator] Successfully generated ${generatedCount} static HTML pages.`);

  // 5. Create 404 fallback
  await copyFile(indexPath, path.join(distDir, '404.html'));

  // 6. Generate dynamic sitemap.xml with trailing slashes (0 redirects!)
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(route => {
  const loc = `${siteUrl}${route === '/' ? '/' : `${route}/`}`;
  let priority = '0.7';
  let changefreq = 'daily';

  if (route === '/') {
    priority = '1.0';
    changefreq = 'daily';
  } else if (route === '/games' || route.startsWith('/category/') || route === '/videos' || route === '/videos/all' || route === '/manga') {
    priority = '0.9';
    changefreq = 'daily';
  } else if (route.startsWith('/game/')) {
    priority = '0.8';
    changefreq = 'weekly';
  } else if (route.startsWith('/video/')) {
    priority = '0.8';
    changefreq = 'weekly';
  } else if (route.startsWith('/manga/')) {
    priority = '0.8';
    changefreq = 'weekly';
  } else {
    priority = '0.6';
    changefreq = 'weekly';
  }

  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n')}
</urlset>
`;

  const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

  await writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(path.join(distDir, 'robots.txt'), robots, 'utf8');

  // Also mirror sitemap to public/ for local repository consistency
  const publicDir = path.join(rootDir, 'public');
  await writeFile(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(path.join(publicDir, 'robots.txt'), robots, 'utf8');

  console.log(`[SEO Generator] Sitemap and robots.txt written successfully with ${allRoutes.length} URLs.`);
}

run().catch(err => {
  console.error('[SEO Generator] Fatal error:', err);
  process.exit(1);
});
