export const VIDEO_CATEGORIES = [
  { id: 'vam', label: 'VAM', badge: 'VAM', title: 'Phim VAM' },
  { id: '3d', label: '3D Anime', badge: '3D', title: 'Phim 3D Anime' },
  { id: 'cosplay', label: 'Cosplay 18+', badge: 'Cosplay', title: 'Cosplay 18+' },
  { id: 'vietsub', label: 'JAV Vietsub', badge: 'Vietsub', title: 'JAV Vietsub' },
  { id: 'hentai', label: 'Hentai 2D', badge: 'Hentai 2D', title: 'Hentai 2D' },
  { id: 'other', label: 'Khác', badge: 'Khác', title: 'Phim Khác' }
];

export const VIDEO_CATEGORY_LABELS = {
  all: 'Tất Cả Phim',
  vam: 'Phim VAM',
  '3d': 'Phim 3D Anime',
  cosplay: 'Cosplay 18+',
  vietsub: 'JAV Vietsub',
  hentai: 'Hentai 2D'
};

const CATEGORY_MAP = new Map(VIDEO_CATEGORIES.map((cat) => [cat.id, cat]));

function normalizeCategoryKey(category) {
  const key = (category || '').toString().trim().toLowerCase();
  if (key === 'jav') return 'vietsub';
  return key;
}

export function getVideoCategoryPageTitle(category) {
  const normalized = normalizeCategoryKey(category) || 'all';
  if (normalized === 'all') return VIDEO_CATEGORY_LABELS.all;
  return CATEGORY_MAP.get(normalized)?.title || VIDEO_CATEGORY_LABELS[normalized] || 'Tất Cả Phim';
}

export function getVideoCategoryBadgeLabel(category) {
  const normalized = normalizeCategoryKey(category);
  if (!normalized || normalized === 'all') return 'Tất cả';
  return CATEGORY_MAP.get(normalized)?.badge || category.toString().toUpperCase();
}
