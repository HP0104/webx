const fs = require('fs');
const path = require('path');

const BOT_TOKEN = '8762474365:AAE8cgyYGC8GoV6tQ5mZi7Ye8tj5Du-FQpo';
const CHANNEL_ID = '-1004320007781';
const TARGET_CHAT_ID = '6221846602';
const CDN_DOMAIN = 'https://img-cdn.takarvn.workers.dev';
const MANGA_ID = '1791559799510';
const SLUG = 'blackgg-martina-bianca';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log(`[🚀] Cứu hộ truyện: ${SLUG} [${MANGA_ID}]`);
  const doc = await fetch(`https://firestore.googleapis.com/v1/projects/webk-a064e/databases/(default)/documents/manga/${MANGA_ID}`).then(r => r.json());
  const chaps = doc.fields?.chapters?.arrayValue?.values || [];
  const chaptersMap = {};

  for (let idx = 0; idx < chaps.length; idx++) {
    const f = chaps[idx].mapValue?.fields || {};
    const chapId = f.id?.stringValue;
    const rawMsgIds = f.message_ids?.arrayValue?.values?.map(v => Number(v.integerValue || v.stringValue)) || [];
    const chapImages = [];
    const deleteQueue = [];
    let pIdx = 1;

    for (const msgId of rawMsgIds) {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TARGET_CHAT_ID, from_chat_id: CHANNEL_ID, message_id: msgId, disable_notification: true })
      }).then(r => r.json());

      if (res.ok && res.result) {
        deleteQueue.push(res.result.message_id);
        if (res.result.photo && res.result.photo.length > 0) {
          const best = res.result.photo[res.result.photo.length - 1];
          const pageStr = `p${String(pIdx).padStart(2, '0')}`;
          const url = `${CDN_DOMAIN}/file/${SLUG}/oneshot/${pageStr}_${best.file_id}.jpg`;
          chapImages.push(url);
          pIdx++;
        }
      }
      await sleep(150);
    }

    if (deleteQueue.length > 0) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TARGET_CHAT_ID, message_ids: deleteQueue })
      }).catch(()=>{});
    }

    chaptersMap[chapId] = chapImages;
    console.log(`[✓] ${chapId}: cứu được ${chapImages.length} ảnh.`);

    const chapPayload = { mangaId: MANGA_ID, chapterId: chapId, totalImages: chapImages.length, images: chapImages };
    fs.writeFileSync(path.join(__dirname, '..', 'public', `restored_${chapId}.json`), JSON.stringify(chapPayload, null, 2), 'utf8');
  }

  const mangaPayload = { mangaId: MANGA_ID, title: doc.fields?.title?.stringValue, slug: SLUG, chapters: chaptersMap };
  fs.writeFileSync(path.join(__dirname, '..', 'public', `restored_${MANGA_ID}.json`), JSON.stringify(mangaPayload, null, 2), 'utf8');
  if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
    fs.writeFileSync(path.join(__dirname, '..', 'dist', `restored_${MANGA_ID}.json`), JSON.stringify(mangaPayload, null, 2), 'utf8');
  }
  console.log(`[✓] Hoàn thành cứu hộ ${SLUG}`);
}

run().catch(console.error);
