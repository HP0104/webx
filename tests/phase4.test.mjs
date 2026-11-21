import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  parseTelegramExportJson,
  getLatestMangaChapter,
  getNextChapterNumber,
} from '../src/utils/mangaUtils.js';

const ROOT = path.resolve(import.meta.dirname, '..');

test('parseTelegramExportJson assigns sequential unique page numbers to captionless follow-up photos and unique chapter IDs', () => {
  const exportData = {
    messages: [
      {
        id: 1,
        media_group_id: 'grp-1',
        photo: 'photo_p1.jpg',
        text: '📚 #BoTest\n📖 #Chapter_1 | 📄 Trang 1-2/3\n🔖 BoTest - Chapter 1 (Album 2 trang)',
      },
      {
        id: 2,
        media_group_id: 'grp-1',
        photo: 'photo_p2.jpg',
        text: '',
      },
      {
        id: 3,
        photo: 'photo_p3.jpg',
        text: '',
      },
      {
        id: 4,
        photo: 'photo_c2_p1.jpg',
        text: '📚 #BoTest\n📖 #Chapter_2 | 📄 Trang 1/1\n🔖 BoTest - Chapter 2',
      },
    ],
  };

  const parsed = parseTelegramExportJson(exportData, 'https://img-cdn.takarvn.workers.dev');
  assert.equal(parsed.mangas.length, 1);
  const [ch1, ch2] = parsed.mangas[0].chapters;
  assert.equal(ch1.images.length, 3);
  assert.match(ch1.images[2], /p03_photo_p3\.jpg$/);
  assert.notEqual(ch1.id, ch2.id);
});

test('getLatestMangaChapter returns highest numbered chapter even when chapters array is unsorted', () => {
  const chapters = [
    { id: 'c10', number: 10, title: 'Chapter 10' },
    { id: 'c2', number: 2, title: 'Chapter 2' },
    { id: 'c5', number: 5, title: 'Chapter 5' },
  ];
  assert.equal(getLatestMangaChapter(chapters)?.id, 'c10');
  assert.equal(getLatestMangaChapter([]), null);
});

test('getNextChapterNumber returns max + 1 instead of array length + 1', () => {
  assert.equal(getNextChapterNumber([{ number: 1 }, { number: 3 }]), 4);
  assert.equal(getNextChapterNumber([{ title: 'Chapter 7' }]), 8);
  assert.equal(getNextChapterNumber([]), 1);
});

test('MangaForm and MangaList contain no hardcoded Vo Toi Nhiem Nhiem polling or broken placeholder path', () => {
  const mangaForm = fs.readFileSync(path.join(ROOT, 'src/components/Admin/MangaForm.jsx'), 'utf8');
  const mangaList = fs.readFileSync(path.join(ROOT, 'src/pages/MangaList.jsx'), 'utf8');

  assert.equal(mangaForm.includes('restored_vo_toi_nhiem_nhiem.json'), false);
  assert.equal(mangaForm.includes('2494'), false);
  assert.equal(mangaList.includes('/placeholder-manga.jpg'), false);
});
