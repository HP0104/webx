const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: 'AIzaSyBu21BND7UH8gbWEWYYJw2Ih02MJ_twz5A',
  authDomain: 'webk-a064e.firebaseapp.com',
  projectId: 'webk-a064e'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BOT_TOKEN = '8762474365:AAE8cgyYGC8GoV6tQ5mZi7Ye8tj5Du-FQpo';
const CHANNEL_ID = '-1004320007781';
const USER_ID = '6221846602';
const CDN_DOMAIN = 'https://img-cdn.takarvn.workers.dev';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Forward a single message with retries
async function forwardWithRetry(msgId, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: USER_ID,
          from_chat_id: CHANNEL_ID,
          message_id: msgId,
          disable_notification: true
        })
      }).then(r => r.json());

      if (res.ok) {
        return res.result;
      }

      if (res.error_code === 429) {
        const wait = (res.parameters?.retry_after || 5) + 1;
        console.warn(`[429 RateLimit] Đợi ${wait}s tại msg ${msgId}...`);
        await sleep(wait * 1000);
        continue;
      }

      // If message genuinely not found, return null
      if (res.description?.includes('not found')) {
        return null;
      }
    } catch (e) {
      await sleep(300);
    }
  }
  return null;
}

// Delete messages in batch
async function batchDelete(msgIds) {
  if (!msgIds || msgIds.length === 0) return;
  for (let i = 0; i < msgIds.length; i += 100) {
    const chunk = msgIds.slice(i, i + 100);
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: USER_ID, message_ids: chunk })
      });
    } catch (e) {}
  }
}

/**
 * Rescue a manga by scanning its messages and distributing photos to chapters
 */
async function rescueManga({ mangaId, startId, endId, expectedChapters, slug }) {
  console.log(`\n======================================================`);
  console.log(`🚀 BẮT ĐẦU CỨU HỘ: Manga ID [${mangaId}] (Msg ${startId} -> ${endId})`);
  console.log(`======================================================`);

  const mangaDoc = await getDoc(doc(db, 'manga', mangaId));
  if (!mangaDoc.exists()) {
    console.error('Không tìm thấy manga trong Firestore:', mangaId);
    return;
  }
  const mangaData = mangaDoc.data();
  console.log(`Tiêu đề: "${mangaData.title}" | Số chương: ${mangaData.chapters?.length}`);

  const allPhotos = [];
  const deleteQueue = [];

  for (let id = startId; id <= endId; id++) {
    const msg = await forwardWithRetry(id);
    if (msg) {
      deleteQueue.push(msg.message_id);
      if (msg.photo && msg.photo.length > 0) {
        const best = msg.photo[msg.photo.length - 1];
        allPhotos.push({
          msgId: id,
          fileId: best.file_id,
          caption: msg.caption || ''
        });
      }
    }

    if (deleteQueue.length >= 50) {
      await batchDelete([...deleteQueue]);
      deleteQueue.length = 0;
    }

    if ((id - startId + 1) % 50 === 0 || id === endId) {
      console.log(`[Tiến độ] Đã quét tới msg ${id}/${endId} -> Thu thập ${allPhotos.length} ảnh`);
    }

    await sleep(40);
  }

  if (deleteQueue.length > 0) {
    await batchDelete(deleteQueue);
  }

  console.log(`[✓] Đã thu thập tổng cộng: ${allPhotos.length} ảnh từ Telegram`);

  // Phân bổ ảnh vào từng chapter theo số trang đã lưu trong Firestore
  const chaptersMap = {};
  let photoPointer = 0;

  for (let cIdx = 0; cIdx < mangaData.chapters.length; cIdx++) {
    const ch = mangaData.chapters[cIdx];
    const targetCount = ch.images?.length || 0;
    const chapSlug = `chapter-${cIdx + 1}`;
    const chapterImages = [];

    for (let p = 0; p < targetCount && photoPointer < allPhotos.length; p++) {
      const item = allPhotos[photoPointer++];
      const pageNum = p + 1;
      const pageStr = `p${String(pageNum).padStart(2, '0')}`;
      const url = `${CDN_DOMAIN}/file/${slug}/${chapSlug}/${pageStr}_${item.fileId}.jpg`;
      chapterImages.push(url);
    }

    chaptersMap[ch.id] = chapterImages;
    console.log(`  -> Chương "${ch.title}" (${ch.id}): đã gán ${chapterImages.length}/${targetCount} ảnh`);

    // Lưu từng chapter vào file restored_chapId.json
    const chapPayload = {
      mangaId,
      chapterId: ch.id,
      totalImages: chapterImages.length,
      images: chapterImages
    };
    const cName = `restored_${ch.id}.json`;
    fs.writeFileSync(path.join(__dirname, '..', 'public', cName), JSON.stringify(chapPayload, null, 2), 'utf8');
    if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
      fs.writeFileSync(path.join(__dirname, '..', 'dist', cName), JSON.stringify(chapPayload, null, 2), 'utf8');
    }
  }

  // Lưu file gộp restored_mangaId.json
  const mangaPayload = {
    mangaId,
    title: mangaData.title,
    slug,
    totalImages: allPhotos.length,
    cover: chaptersMap[mangaData.chapters[0]?.id]?.[0] || '',
    chapters: chaptersMap
  };

  const mName = `restored_${mangaId}.json`;
  fs.writeFileSync(path.join(__dirname, '..', 'public', mName), JSON.stringify(mangaPayload, null, 2), 'utf8');
  if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
    fs.writeFileSync(path.join(__dirname, '..', 'dist', mName), JSON.stringify(mangaPayload, null, 2), 'utf8');
  }

  console.log(`[✓] ĐÃ LƯU FILE KHÔI PHỤC THÀNH CÔNG: public/${mName}`);

  // Test kiểm tra ảnh chương 1
  const testSample = chaptersMap[mangaData.chapters[0]?.id]?.[1] || chaptersMap[mangaData.chapters[0]?.id]?.[0];
  if (testSample) {
    const tRes = await fetch(testSample);
    console.log(`[Kiểm tra CDN] Ảnh mẫu: HTTP ${tRes.status} (${tRes.ok ? 'HOẠT ĐỘNG TỐT' : 'LỖI'})`);
  }
}

async function main() {
  const target = process.argv[2] || 'all';

  if (target === 'nhan_the' || target === 'all') {
    // 1. Nhân Thê Dụ Hoặc (464 trang: Msg 1111 -> 1574)
    await rescueManga({
      mangaId: '1789225571301',
      startId: 1111,
      endId: 1574,
      slug: 'nhan-the-du-hoac'
    });
  }

  if (target === 'hoa_hong' || target === 'all') {
    // 2. Hoa Hồng Trầm Luân (695 trang: Msg 1575 -> 2269)
    await rescueManga({
      mangaId: '1789226219331',
      startId: 1575,
      endId: 2269,
      slug: 'hoa-hong-tram-luan'
    });
  }

  if (target === 'muon_nuong_tu' || target === 'all') {
    // 3. Mượn Ngươi Nương Tử Tiết Tiết Hỏa (1194 trang: Msg 2270 -> 3463)
    await rescueManga({
      mangaId: '1789227438028',
      startId: 2270,
      endId: 3463,
      slug: 'muon-nguoi-nuong-tu-tiet-tiet-hoa'
    });
  }

  console.log('\n Hoàn tất cứu hộ nhóm truyện chỉ định!');
  process.exit(0);
}

main().catch(console.error);
