import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('sortGamesList sorts games accurately by newest, oldest, price_high, downloads, and name without mutating input', async () => {
  const { getEntitySortTimestamp, sortGamesList } = await import('../src/utils/adminListUtils.js');

  const games = [
    { id: 10, title: 'Bravo Game', createdAt: '2026-01-01T00:00:00Z', price: 10000, downloads: 5 },
    { id: 30, title: 'Alpha Game', createdAt: '2026-03-01T00:00:00Z', price: 50000, downloads: 2 },
    { id: 20, title: 'Charlie Game', updatedAt: '2026-04-01T00:00:00Z', createdAt: '2026-02-01T00:00:00Z', price: 20000, downloads: 99 },
    { id: 1780000005000, title: 'Timestamp ID Game', price: 0, downloads: 0 }
  ];
  const snapshot = games.map(g => g.id);

  assert.ok(getEntitySortTimestamp(games[2]) > getEntitySortTimestamp(games[1]));
  assert.ok(getEntitySortTimestamp(games[3]) > getEntitySortTimestamp(games[2]));

  const newest = sortGamesList(games, 'newest').map(g => g.id);
  assert.deepEqual(newest, [1780000005000, 20, 30, 10]);

  const oldest = sortGamesList(games, 'oldest').map(g => g.id);
  assert.deepEqual(oldest, [10, 30, 20, 1780000005000]);

  assert.deepEqual(sortGamesList(games, 'price_high').map(g => g.id), [30, 20, 10, 1780000005000]);
  assert.deepEqual(sortGamesList(games, 'downloads').map(g => g.id), [20, 10, 30, 1780000005000]);
  assert.deepEqual(sortGamesList(games, 'name').map(g => g.id), [30, 10, 20, 1780000005000]);
  assert.deepEqual(games.map(g => g.id), snapshot);
});

test('groupChatReportsFromDocs respects stored status and tracks all channel docIds', async () => {
  const { groupChatReportsFromDocs } = await import('../src/utils/adminListUtils.js');

  const docs = [
    {
      id: 'm1',
      data: { channelId: 'u1', senderId: 'u1', senderName: 'Alice', senderRole: 'user', text: 'Loi 1', status: 'resolved', createdAt: 100 }
    },
    {
      id: 'm2',
      data: { channelId: 'u1', senderId: 'admin', senderName: 'Admin', senderRole: 'admin', text: 'Da fix', createdAt: 200 }
    },
    {
      id: 'm3',
      data: { channelId: 'u2', senderId: 'u2', senderName: 'Bob', senderRole: 'user', text: 'Loi A', status: 'resolved', createdAt: 300 }
    },
    {
      id: 'm4',
      data: { channelId: 'u2', senderId: 'u2', senderName: 'Bob', senderRole: 'user', text: 'Van bi nua', createdAt: 400 }
    }
  ];

  const grouped = groupChatReportsFromDocs(docs);
  assert.equal(grouped.length, 2);

  const u1 = grouped.find(r => r._channelId === 'u1');
  assert.equal(u1.status, 'resolved');
  assert.equal(u1.message, 'Loi 1');
  assert.deepEqual(u1._docIds, ['m1', 'm2']);

  const u2 = grouped.find(r => r._channelId === 'u2');
  assert.equal(u2.status, 'pending');
  assert.equal(u2.message, 'Van bi nua');
  assert.equal(u2._messageCount, 2);
  assert.deepEqual(u2._docIds, ['m3', 'm4']);
});

test('buildContactMessagePayload validates and normalizes Vietnamese NFC input', async () => {
  const { buildContactMessagePayload } = await import('../src/utils/adminListUtils.js');

  const invalid = buildContactMessagePayload({ name: '  ', email: 'bad-email', subject: 'unknown', message: '' });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.error);

  // NFD Vietnamese input should be normalized to NFC
  const nfdName = 'Nguye\u0302\u0303n Va\u0306n A';
  const result = buildContactMessagePayload({
    name: `  ${nfdName}  `,
    email: 'USER@Example.com ',
    subject: 'dmca',
    message: 'Noi dung khieu nai'
  });
  assert.equal(result.valid, true);
  assert.equal(result.payload.name, nfdName.normalize('NFC'));
  assert.equal(result.payload.email, 'USER@Example.com');
  assert.equal(result.payload.subject, 'dmca');
  assert.equal(result.payload.status, 'pending');
});

test('isAdBlockExemptPath exempts auth, wallet, report, privacy, and contact routes', async () => {
  const { isAdBlockExemptPath } = await import('../src/utils/adUtils.js');

  for (const p of ['/auth', '/wallet', '/wallet/', '/report', '/privacy', '/contact']) {
    assert.equal(isAdBlockExemptPath(p), true, `Expected ${p} to be exempt`);
  }
  for (const p of ['/', '/games', '/video/123', '/manga/456']) {
    assert.equal(isAdBlockExemptPath(p), false, `Expected ${p} NOT to be exempt`);
  }
});

test('Phase 5 source fixes: Home URLSearchParams, Contact Firestore submit, Report fallback, CSS clip/spin-anim, popunder guard, VideoAdBanner resize', async () => {
  const [homeSrc, contactSrc, reportSrc, errMgrSrc, gameListSrc, cssSrc, adBannerSrc, videoAdSrc, popSrc, rulesSrc] = await Promise.all([
    fs.readFile(path.join(rootDir, 'src/pages/Home.jsx'), 'utf8'),
    fs.readFile(path.join(rootDir, 'src/pages/Contact.jsx'), 'utf8'),
    fs.readFile(path.join(rootDir, 'src/pages/Report.jsx'), 'utf8'),
    fs.readFile(path.join(rootDir, 'src/components/Admin/ErrorReportManager.jsx'), 'utf8'),
    fs.readFile(path.join(rootDir, 'src/components/Admin/GameList.jsx'), 'utf8'),
    fs.readFile(path.join(rootDir, 'src/index.css'), 'utf8'),
    fs.readFile(path.join(rootDir, 'src/components/AdBanner.jsx'), 'utf8'),
    fs.readFile(path.join(rootDir, 'src/components/VideoAdBanner.jsx'), 'utf8'),
    fs.readFile(path.join(rootDir, 'public/popunder1000.js'), 'utf8'),
    fs.readFile(path.join(rootDir, 'firestore.rules'), 'utf8')
  ]);

  // Home clones URLSearchParams
  assert.match(homeSrc, /new URLSearchParams\(prev\)/);

  // Contact saves to Firestore contact_messages instead of fake setTimeout
  assert.match(contactSrc, /contact_messages/);
  assert.doesNotMatch(contactSrc, /setTimeout\(\(\)\s*=>\s*\{\s*setLoading\(false\);\s*setSubmitted\(true\)/);
  assert.match(rulesSrc, /match \/contact_messages\/\{docId\}/);

  // Report falls back to user.uid and has composite index file
  assert.match(reportSrc, /activeChannelId\s*=\s*isAdmin\s*\?\s*selectedUserId\s*:\s*\(user\.id\s*\|\|\s*user\.uid\)/);
  const indexesRaw = await fs.readFile(path.join(rootDir, 'firestore.indexes.json'), 'utf8');
  const indexesJson = JSON.parse(indexesRaw);
  const hasReportsIndex = (indexesJson.indexes || []).some(
    idx => idx.collectionGroup === 'reports'
      && idx.fields?.some(f => f.fieldPath === 'channelId')
      && idx.fields?.some(f => f.fieldPath === 'createdAt')
  );
  assert.equal(hasReportsIndex, true, 'firestore.indexes.json must include reports(channelId, createdAt)');

  // ErrorReportManager & GameList
  assert.doesNotMatch(errMgrSrc, /status:\s*'pending',\s*\n\s*createdAt:\s*data\.createdAt/);
  assert.match(errMgrSrc, /writeBatch/);
  assert.match(gameListSrc, /sortGamesList/);
  assert.match(gameListSrc, /setSortBy\(e\.target\.value\);\s*setCurrentPage\(1\)/);

  // CSS fixes
  assert.doesNotMatch(cssSrc, /body\s*\{[\s\S]{0,300}overflow-x:\s*hidden/);
  assert.doesNotMatch(cssSrc, /body\s*\{[\s\S]{0,300}cursor:\s*pointer/);
  assert.doesNotMatch(cssSrc, /html\s*\{[\s\S]{0,200}overflow-x:\s*hidden/);
  assert.match(cssSrc, /\.spin-anim/);

  // AdBanner & VideoAdBanner & popunder
  assert.doesNotMatch(adBannerSrc, /ensureExoClickProvider\(\{\s*forceReload:/);
  assert.match(adBannerSrc, /isAdBlockExemptPath/);
  assert.match(videoAdSrc, /addEventListener\(['"]resize['"]/);
  assert.match(videoAdSrc, /removeEventListener\(['"]ended['"]/);
  assert.doesNotMatch(popSrc, /win\s*=\s*\{\s*closed:\s*false\s*\}/);
});
