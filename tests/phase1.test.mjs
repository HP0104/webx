import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VIDEO_CATEGORIES,
  getVideoCategoryPageTitle,
  getVideoCategoryBadgeLabel,
} from '../src/constants/videoCategories.js';
import {
  buildEditableVideoData,
  parseSeriesBatchText,
  shouldAutoFetchThumbnailOnBlur,
} from '../src/utils/videoFormUtils.js';

test('VIDEO_CATEGORIES includes all 5 primary video categories plus other', () => {
  const ids = VIDEO_CATEGORIES.map((c) => c.id);
  assert.deepEqual(ids, ['vam', '3d', 'cosplay', 'vietsub', 'hentai', 'other']);
});

test('getVideoCategoryPageTitle maps all video categories including cosplay, vietsub, jav, hentai', () => {
  assert.equal(getVideoCategoryPageTitle('all'), 'Tất Cả Phim');
  assert.equal(getVideoCategoryPageTitle('vam'), 'Phim VAM');
  assert.equal(getVideoCategoryPageTitle('3d'), 'Phim 3D Anime');
  assert.equal(getVideoCategoryPageTitle('cosplay'), 'Cosplay 18+');
  assert.equal(getVideoCategoryPageTitle('vietsub'), 'JAV Vietsub');
  assert.equal(getVideoCategoryPageTitle('jav'), 'JAV Vietsub');
  assert.equal(getVideoCategoryPageTitle('hentai'), 'Hentai 2D');
});

test('getVideoCategoryBadgeLabel returns proper short badge labels instead of mislabeling categories as 3D', () => {
  assert.equal(getVideoCategoryBadgeLabel('vam'), 'VAM');
  assert.equal(getVideoCategoryBadgeLabel('3d'), '3D');
  assert.equal(getVideoCategoryBadgeLabel('cosplay'), 'Cosplay');
  assert.equal(getVideoCategoryBadgeLabel('vietsub'), 'Vietsub');
  assert.equal(getVideoCategoryBadgeLabel('jav'), 'Vietsub');
  assert.equal(getVideoCategoryBadgeLabel('hentai'), 'Hentai 2D');
  assert.equal(getVideoCategoryBadgeLabel('other'), 'Khác');
});

test('buildEditableVideoData preserves series fields so editing does not wipe episodes', () => {
  const seriesVideo = {
    id: 'vid-1',
    title: 'Phim Bộ Test',
    videoUrl: 'https://hgcloud.to/e/ep1',
    category: 'cosplay',
    tags: ['18+', 'Cosplay'],
    isSeries: true,
    episodes: [
      { id: 'ep1', episodeNumber: 1, title: 'Tập 1', videoUrl: 'https://hgcloud.to/e/ep1' },
      { id: 'ep2', episodeNumber: 2, title: 'Tập 2', videoUrl: 'https://hgcloud.to/e/ep2' },
    ],
    totalEpisodes: 2,
    views: 99,
  };

  const edited = buildEditableVideoData(seriesVideo);
  assert.equal(edited.isSeries, true);
  assert.equal(edited.episodes.length, 2);
  assert.equal(edited.episodes[1].videoUrl, 'https://hgcloud.to/e/ep2');
  assert.equal(edited.totalEpisodes, 2);
  assert.equal(edited.category, 'cosplay');
  assert.equal(edited.tags, '18+, Cosplay');
});

test('buildEditableVideoData safely handles missing episodes array on single videos', () => {
  const single = { id: 'vid-2', title: 'Single', videoUrl: 'https://voe.sx/abc' };
  const edited = buildEditableVideoData(single, { id: 'u1', username: 'mod' });
  assert.equal(edited.isSeries, false);
  assert.deepEqual(edited.episodes, []);
  assert.equal(edited.totalEpisodes, 1);
  assert.equal(edited.uploaderId, 'u1');
  assert.equal(edited.uploaderName, 'mod');
});

test('parseSeriesBatchText rejects title-only lines without pipe URL instead of saving text as videoUrl', () => {
  const input = [
    'Tập 1: Khởi đầu',
    'Tập 2: Tiếp theo | https://hgcloud.to/e/abc123',
    'https://voe.sx/xyz789',
  ].join('\n');

  const result = parseSeriesBatchText(input, 0, () => 'ep_test');
  assert.equal(result.episodes.length, 2);
  assert.equal(result.episodes[0].title, 'Tập 2: Tiếp theo');
  assert.equal(result.episodes[0].videoUrl, 'https://hgcloud.to/e/abc123');
  assert.equal(result.episodes[1].episodeNumber, 2);
  assert.equal(result.episodes[1].videoUrl, 'https://voe.sx/xyz789');
  assert.deepEqual(result.invalidLines, ['Tập 1: Khởi đầu']);
});

test('shouldAutoFetchThumbnailOnBlur skips auto-fetch when manual thumbnail already exists', () => {
  assert.equal(shouldAutoFetchThumbnailOnBlur('https://example.com/custom.jpg'), false);
  assert.equal(shouldAutoFetchThumbnailOnBlur('   '), true);
  assert.equal(shouldAutoFetchThumbnailOnBlur(''), true);
  assert.equal(shouldAutoFetchThumbnailOnBlur(null), true);
});
