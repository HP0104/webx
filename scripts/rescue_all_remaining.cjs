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
let TARGET_CHAT_ID = process.env.TARGET_CHAT_ID || '6221846602';
const CDN_DOMAIN = 'https://img-cdn.takarvn.workers.dev';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Forward a message with robust rate-limit waiting
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

      if (res.ok) {
        return res.result;
      }

      if (res.error_code === 429) {
        const wait = (res.parameters?.retry_after || 10) + 2;
        console.warn(`⏳ [RateLimit 429] Telegram yêu cầu đợi ${wait}s tại tin nhắn #${msgId}... (${new Date().toLocaleTimeString('vi-VN')})`);
        await sleep(wait * 1000);
        continue;
      }

      if (res.description?.includes('not found')) {
        return null;
      }

      console.warn(`[Cảnh báo] msg #${msgId}:`, res.description);
      return null;
    } catch (e) {
      console.error(`[Lỗi kết nối] msg #${msgId}:`, e.message);
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

async function rescueManga({ mangaId, startId, endId, slug }) {
  console.log(`\n======================================================`);
  console.log(`🚀 BẮT ĐẦU CỨU HỘ: Manga ID [${mangaId}] (Tin nhắn #${startId} -> #${endId})`);
  console.log(`======================================================`);

  const mangaDoc = await getDoc(doc(db, 'manga', mangaId));
  if (!mangaDoc.exists()) {
    console.error(`[X] Không tìm thấy manga trong Firestore: ${mangaId}`);
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
      console.log(`[Tiến độ] Đã quét đến msg #${id}/${endId} -> Thu được ${allPhotos.length} ảnh`);
    }

    // Gentle sleep to avoid instant flood
    await sleep(250);
  }

  if (deleteQueue.length > 0) {
    await batchDelete(deleteQueue);
  }

  console.log(`[✓] Đã thu thập: ${allPhotos.length} ảnh từ Telegram`);

  const chaptersMap = {};
  let photoPointer = 0;

  for (let cIdx = 0; cIdx < mangaData.chapters.length; cIdx++) {
    const ch = mangaData.chapters[cIdx];
    const targetCount = ch.images?.length || 0;
    const chapSlug = `chapter-${cIdx + 1}`;
    const chapterImages = [];

    // Nếu chapter đã có ảnh hợp lệ và manga là "Ham muốn trái luân thường", giữ nguyên ch1 và ch2 nếu không cần đổi
    for (let p = 0; p < targetCount && photoPointer < allPhotos.length; p++) {
      const item = allPhotos[photoPointer++];
      const pageNum = p + 1;
      const pageStr = `p${String(pageNum).padStart(2, '0')}`;
      const url = `${CDN_DOMAIN}/file/${slug}/${chapSlug}/${pageStr}_${item.fileId}.jpg`;
      chapterImages.push(url);
    }

    chaptersMap[ch.id] = chapterImages;
    console.log(`  -> Chương "${ch.title}" (${ch.id}): đã gán ${chapterImages.length}/${targetCount} ảnh`);

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

  const testSample = chaptersMap[mangaData.chapters[0]?.id]?.[1] || chaptersMap[mangaData.chapters[0]?.id]?.[0];
  if (testSample) {
    const tRes = await fetch(testSample);
    console.log(`[Kiểm tra CDN] Ảnh mẫu: HTTP ${tRes.status} (${tRes.ok ? 'HOẠT ĐỘNG TỐT' : 'LỖI'})`);
  }
}

async function main() {
  const target = process.argv[2] || 'all';

  if (target === 'muon_nuong_tu' || target === 'all') {
    // 1. Mượn Ngươi Nương Tử Tiết Tiết Hỏa (1194 trang: Msg 2270 -> 3463)
    await rescueManga({
      mangaId: '1789227438028',
      startId: 2270,
      endId: 3463,
      slug: 'muon-nguoi-nuong-tu-tiet-tiet-hoa'
    });
  }

  if (target === 'vo_toi' || target === 'all') {
    // 2. VỢ TÔI NHIỄM NHIỄM (2525 trang: Msg 3474 -> 6646)
    await rescueManga({
      mangaId: '1789749805106',
      startId: 3474,
      endId: 6646,
      slug: 'vo-toi-nhiem-nhiem'
    });
  }

  if (target === 'ham_muon' || target === 'all') {
    // 3. Ham muốn trái luân thường (1002 trang: Msg 6870 -> 7871)
    await rescueManga({
      mangaId: '1791528146912',
      startId: 6870,
      endId: 7871,
      slug: 'ham-muon-trai-luan-thuong'
    });
  }

  if (target === 'martina' || target === 'all') {
    // 4. [BlackGG] Martina Bianca (97 trang: Msg 7872 -> 7968)
    await rescueManga({
      mangaId: '1791559799510',
      startId: 7872,
      endId: 7968,
      slug: 'martina-bianca'
    });
  }

  console.log('\n🎉 HOÀN TẤT TẤT CẢ CÁC BỘ TRUYỆN CẦN CỨU HỘ!');
  process.exit(0);
}

main().catch(console.error);
