const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');
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

const MANGA_ID = '1788983108477';
const CHAPTER_ID = 'ch-1788982966751-0';
const START_ID = 79;
const END_ID = 548;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log(`=== BẮT ĐẦU KHÔI PHỤC: Chuyện Tình Của Vợ (Msg ${START_ID} -> ${END_ID}) ===`);

  const mangaDoc = await getDoc(doc(db, 'manga', MANGA_ID));
  if (!mangaDoc.exists()) {
    console.error('Không tìm thấy manga', MANGA_ID);
    process.exit(1);
  }
  const mangaData = mangaDoc.data();
  console.log('Manga:', mangaData.title, '| Chapter ID:', CHAPTER_ID);

  const images = [];
  const pendingDeleteIds = [];

  for (let id = START_ID; id <= END_ID; id++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: USER_ID,
          from_chat_id: CHANNEL_ID,
          message_id: id,
          disable_notification: true
        })
      }).then(r => r.json());

      if (res.ok && res.result) {
        pendingDeleteIds.push(res.result.message_id);
        const photos = res.result.photo;
        if (photos && photos.length > 0) {
          const best = photos[photos.length - 1];
          const pageNum = images.length + 1;
          const pageStr = `p${String(pageNum).padStart(2, '0')}`;
          const newUrl = `${CDN_DOMAIN}/file/chuyen-tinh-cua-vo-thuong-ha/chapter-1/${pageStr}_${best.file_id}.jpg`;
          images.push(newUrl);
        }
      } else if (res.error_code === 429) {
        const wait = (res.parameters?.retry_after || 5) + 1;
        console.log(`[Rate Limit 429] Đợi ${wait}s tại ID ${id}...`);
        await sleep(wait * 1000);
        id--;
        continue;
      }
    } catch (err) {
      console.error(`Lỗi tại msg ${id}:`, err.message);
    }

    // Xóa tin nhắn tạm theo batch 50 tin
    if (pendingDeleteIds.length >= 50) {
      const toDelete = [...pendingDeleteIds];
      pendingDeleteIds.length = 0;
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: USER_ID, message_ids: toDelete })
      }).catch(() => {});
    }

    if (id % 50 === 0 || id === END_ID) {
      console.log(`Đã quét tới msg ${id}/${END_ID} -> Lấy được ${images.length} ảnh`);
    }

    await sleep(50); // delay nhẹ tránh spam
  }

  // Dọn nốt tin nhắn còn lại
  if (pendingDeleteIds.length > 0) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: USER_ID, message_ids: pendingDeleteIds })
    }).catch(() => {});
  }

  console.log(`\n Tổng cộng lấy được: ${images.length} ảnh`);

  if (images.length === 0) {
    console.error('Không trích xuất được ảnh nào!');
    process.exit(1);
  }

  // 1. Lưu file JSON backup
  const restorePayload = {
    mangaId: MANGA_ID,
    chapterId: CHAPTER_ID,
    totalImages: images.length,
    cover: images[0],
    images
  };

  const jsonFileName = `restored_${CHAPTER_ID}.json`;
  const publicPath = path.join(__dirname, '..', 'public', jsonFileName);
  const distPath = path.join(__dirname, '..', 'dist', jsonFileName);

  fs.writeFileSync(publicPath, JSON.stringify(restorePayload, null, 2), 'utf8');
  console.log('Đã ghi file:', publicPath);
  if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
    fs.writeFileSync(distPath, JSON.stringify(restorePayload, null, 2), 'utf8');
    console.log('Đã ghi file:', distPath);
  }

  // 2. Cập nhật trực tiếp lên Firestore
  console.log('Đang đồng bộ lên Firestore...');
  const updatedChapters = (mangaData.chapters || []).map(ch => {
    if (ch.id === CHAPTER_ID) {
      return { ...ch, images };
    }
    return ch;
  });

  await updateDoc(doc(db, 'manga', MANGA_ID), {
    cover: images[0],
    chapters: updatedChapters,
    updatedAt: new Date().toISOString()
  });

  console.log(' ĐÃ CẬP NHẬT FIRESTORE THÀNH CÔNG!');

  // 3. Test kiểm tra lại một số ảnh ngẫu nhiên
  console.log('\n--- KIỂM TRA LẠI ĐỘ HOẠT ĐỘNG QUA CDN ---');
  const testIndices = [0, 1, 2, 5, 10, 50, 100, 200, 300, 400, images.length - 1];
  for (const idx of testIndices) {
    if (idx < images.length) {
      try {
        const testRes = await fetch(images[idx]);
        console.log(`Trang ${idx + 1}: HTTP ${testRes.status} (${testRes.ok ? 'OK' : 'FAIL'})`);
      } catch (e) {
        console.log(`Trang ${idx + 1}: Lỗi kết nối`);
      }
    }
  }

  console.log('\n Hoàn tất cứu hộ bộ Chuyện Tình Của Vợ!');
  process.exit(0);
}

run().catch(console.error);
