const fs = require('fs');
const path = require('path');

const BOT_TOKEN = '8762474365:AAE8cgyYGC8GoV6tQ5mZi7Ye8tj5Du-FQpo';
const CHANNEL_ID = '-1004320007781';
const TARGET_CHAT_ID = '6221846602';
const CDN_DOMAIN = 'https://img-cdn.takarvn.workers.dev';
const MANGA_ID = '1791528146912';
const SLUG = 'ham-muon-trai-luan-thuong';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function forwardWithRetry(msgId) {
  while (true) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TARGET_CHAT_ID,
          from_chat_id: CHANNEL_ID,
          message_id: msgId,
          disable_notification: true
        })
      }).then(r => r.json());

      if (res.ok) return res.result;

      if (res.error_code === 429) {
        const wait = (res.parameters?.retry_after || 10) + 2;
        console.warn(`⏳ [RateLimit 429] Chờ ${wait}s...`);
        await sleep(wait * 1000);
        continue;
      }

      return null;
    } catch (e) {
      await sleep(1000);
    }
  }
}

async function batchDelete(msgIds) {
  if (!msgIds || msgIds.length === 0) return;
  for (let i = 0; i < msgIds.length; i += 100) {
    const chunk = msgIds.slice(i, i + 100);
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TARGET_CHAT_ID, message_ids: chunk })
      });
    } catch (e) {}
  }
}

async function run() {
  console.log(`[🚀] Bắt đầu cứu hộ truyện: ${SLUG} [${MANGA_ID}]`);

  // Lấy dữ liệu truyện từ Firestore
  const doc = await fetch(`https://firestore.googleapis.com/v1/projects/webk-a064e/databases/(default)/documents/manga/${MANGA_ID}`).then(r => r.json());
  const chaps = doc.fields?.chapters?.arrayValue?.values || [];
  console.log(`Tổng số chương: ${chaps.length}`);

  const chaptersMap = {};
  const deleteQueue = [];

  for (let idx = 0; idx < chaps.length; idx++) {
    const f = chaps[idx].mapValue?.fields || {};
    const chapId = f.id?.stringValue;
    const chapTitle = f.title?.stringValue || `Chương ${idx + 1}`;
    const rawMsgIds = f.message_ids?.arrayValue?.values?.map(v => Number(v.integerValue || v.stringValue)) || [];
    const expectedCount = (f.images?.arrayValue?.values || []).length;

    console.log(`\n--- Đang xử lý: ${chapTitle} (${chapId}) | ${rawMsgIds.length} msgs, target ${expectedCount} imgs ---`);

    const chapImages = [];
    let pIdx = 1;

    for (const msgId of rawMsgIds) {
      const msg = await forwardWithRetry(msgId);
      if (msg) {
        deleteQueue.push(msg.message_id);
        if (msg.photo && msg.photo.length > 0) {
          const best = msg.photo[msg.photo.length - 1];
          const pageStr = `p${String(pIdx).padStart(2, '0')}`;
          const chapSlug = `chuong-${String(idx + 1).padStart(2, '0')}`;
          const url = `${CDN_DOMAIN}/file/${SLUG}/${chapSlug}/${pageStr}_${best.file_id}.jpg`;
          chapImages.push(url);
          pIdx++;
        }
      }

      if (deleteQueue.length >= 30) {
        await batchDelete([...deleteQueue]);
        deleteQueue.length = 0;
      }
      await sleep(150);
    }

    if (deleteQueue.length > 0) {
      await batchDelete([...deleteQueue]);
      deleteQueue.length = 0;
    }

    chaptersMap[chapId] = chapImages;
    console.log(`[✓] ${chapTitle}: Đã cứu hộ ${chapImages.length} ảnh hợp lệ.`);

    // Lưu riêng file cho chapter
    const chapPayload = {
      mangaId: MANGA_ID,
      chapterId: chapId,
      title: chapTitle,
      totalImages: chapImages.length,
      images: chapImages
    };
    fs.writeFileSync(path.join(__dirname, '..', 'public', `restored_${chapId}.json`), JSON.stringify(chapPayload, null, 2), 'utf8');
    if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
      fs.writeFileSync(path.join(__dirname, '..', 'dist', `restored_${chapId}.json`), JSON.stringify(chapPayload, null, 2), 'utf8');
    }
  }

  // Lưu file gộp cho toàn bộ manga
  const mangaPayload = {
    mangaId: MANGA_ID,
    title: doc.fields?.title?.stringValue,
    slug: SLUG,
    chapters: chaptersMap
  };
  fs.writeFileSync(path.join(__dirname, '..', 'public', `restored_${MANGA_ID}.json`), JSON.stringify(mangaPayload, null, 2), 'utf8');
  if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
    fs.writeFileSync(path.join(__dirname, '..', 'dist', `restored_${MANGA_ID}.json`), JSON.stringify(mangaPayload, null, 2), 'utf8');
  }

  console.log(`\n🎉 HOÀN THÀNH CỨU HỘ TOÀN BỘ TRUYỆN: public/restored_${MANGA_ID}.json`);
}

run().catch(console.error);
