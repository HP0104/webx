import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameSlug, getGamePath, findGameByRouteParam } from '../src/utils/gameRoutes.js';
import { normalizeString, matchSearch } from '../src/utils/searchUtils.js';
import {
  addMonths,
  createOwnershipRecord,
  normalizeOwnedGames,
  isOwnershipActive,
  getGameOwnership
} from '../src/utils/ownership.js';
import {
  isTrustedEmbedUrl,
  toEmbedUrl,
  getAlternateEmbedUrl,
  getVideoThumbnail,
  isDirectVideo,
  getVideoProviderName
} from '../src/utils/videoUtils.js';
import {
  naturalSort,
  slugify,
  extractChapterNumericValue,
  isSameChapter,
  findDuplicateChapters,
  getLatestMangaChapter,
  getNextChapterNumber
} from '../src/utils/mangaUtils.js';

test('gameRoutes generates Vietnamese-safe slugs, paths, and matches by id or slug', () => {
  const game = { id: 101, title: 'Đại Chiến Đấu Trường: Bản Việt Hóa!' };
  assert.equal(createGameSlug(game), 'dai-chien-dau-truong-ban-viet-hoa');
  assert.equal(getGamePath(game), '/game/dai-chien-dau-truong-ban-viet-hoa');

  assert.equal(findGameByRouteParam([game], '101')?.id, 101);
  assert.equal(findGameByRouteParam([game], 'dai-chien-dau-truong-ban-viet-hoa')?.id, 101);
  assert.equal(findGameByRouteParam([game], 'missing'), null);
  assert.equal(findGameByRouteParam(null, '101'), null);
});

test('searchUtils normalizes diacritics and supports multi-word accent-insensitive matching', () => {
  assert.equal(normalizeString('  Đường   Dẫn  Việt   Hóa '), 'duong dan viet hoa');
  assert.equal(matchSearch('Thế Giới Tu Tiên (Việt Hóa)', 'the tien'), true);
  assert.equal(matchSearch('Thế Giới Tu Tiên', 'action'), false);
  assert.equal(matchSearch('Any Title', '   '), true);
});

test('ownership handles month clamping, normalization deduping, and active/expired checks', () => {
  const jan31 = new Date('2026-01-31T00:00:00.000Z');
  const plusOne = addMonths(jan31, 1);
  assert.equal(plusOne.getUTCMonth(), 1); // February (month index 1)

  const rec = createOwnershipRecord(42, jan31);
  assert.equal(rec.id, '42');
  assert.ok(Date.parse(rec.expiresAt) > Date.parse(rec.purchasedAt));

  const merged = normalizeOwnedGames([
    { id: '42', purchasedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-02-01T00:00:00.000Z' },
    { gameId: 42, purchasedAt: '2026-03-01T00:00:00.000Z', expiresAt: '2026-05-01T00:00:00.000Z' },
    'legacy-7'
  ], jan31);

  assert.equal(merged.length, 2);
  const g42 = getGameOwnership(merged, 42, new Date('2026-04-01T00:00:00.000Z'));
  assert.equal(g42.isActive, true);
  assert.equal(g42.isExpired, false);

  const expiredCheck = getGameOwnership(merged, 42, new Date('2026-06-01T00:00:00.000Z'));
  assert.equal(expiredCheck.isActive, false);
  assert.equal(expiredCheck.isExpired, true);
  assert.equal(isOwnershipActive('legacy-7'), true);
});

test('videoUtils embeds, thumbnails, direct media detection, and host allowlist work as expected', () => {
  assert.equal(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(getAlternateEmbedUrl('https://hgcloud.to/e/abc123', 'server2'), 'https://vibuxer.com/e/abc123');
  assert.equal(getVideoThumbnail('https://voe.sx/e/xyz987'), 'https://voe.sx/cache/xyz987_storyboard_L1.jpg');
  assert.equal(isDirectVideo('https://cdn.example.com/video.m3u8'), true);
  assert.equal(isDirectVideo('<iframe src="https://voe.sx/e/xyz987"></iframe>'), false);
  assert.equal(getVideoProviderName('https://hgcloud.to/e/abc123'), 'StreamHG');
  assert.equal(isTrustedEmbedUrl('https://voe.sx/e/xyz987'), true);
  assert.equal(isTrustedEmbedUrl('javascript:alert(1)'), false);
});

test('mangaUtils sorting, slugify, chapter parsing, duplicate detection, and latest/next chapter helpers work', () => {
  const sorted = ['page10.jpg', 'page2.jpg', 'page1.jpg'].sort(naturalSort);
  assert.deepEqual(sorted, ['page1.jpg', 'page2.jpg', 'page10.jpg']);

  assert.equal(slugify('Vợ Tôi Đáng Yêu!'), 'vo-toi-dang-yeu');
  assert.equal(extractChapterNumericValue({ title: 'Chương 12.5 - Ngoại truyện' }), 12.5);
  assert.equal(isSameChapter({ title: 'Chap 3' }, { number: 3 }), true);

  const dupes = findDuplicateChapters([
    { id: 'a', number: 1 },
    { id: 'b', number: 1 },
    { id: 'c', number: 2 }
  ]);
  assert.equal(dupes.length, 1);
  assert.equal(dupes[0].number, 1);

  assert.equal(getLatestMangaChapter([{ number: 2 }, { number: 10 }, { number: 5 }]).number, 10);
  assert.equal(getNextChapterNumber([{ number: 2 }, { number: 10 }]), 11);
});
