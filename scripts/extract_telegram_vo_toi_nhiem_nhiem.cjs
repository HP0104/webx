/**
 * Tool tự động quét và giải cứu toàn bộ ảnh truyện "VỢ TÔI NHIỄM NHIỄM" từ Kênh Telegram
 * Phạm vi tin nhắn: ID 3474 -> 5967 (Tổng cộng ~2,494 ảnh)
 * Kết quả xuất ra file: public/restored_vo_toi_nhiem_nhiem.json
 */

const fs = require('fs');
const path = require('path');

const BOT_TOKEN = '8957921406:AAFPiJkoaJe7Brku-efkizT-3eTzPZaR7P8';
const CHAT_ID = '-1004320007781';
const USER_ID = '6221846602';
const WORKER_DOMAIN = 'https://img-cdn.takarvn.workers.dev';

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'restored_vo_toi_nhiem_nhiem.json');

const START_MSG_ID = 3474;
const END_MSG_ID = 5967;

function slugify(text) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCaption(caption) {
  const data = {
    mangaTitle: 'VỢ TÔI NHIỄM NHIỄM',
    chapterTitle: '',
    startPage: 1,
    endPage: 1,
    totalPages: 0,
    hasStructure: false
  };

  if (!caption || typeof caption !== 'string') return data;

  const bookmarkMatch = caption.match(/🔖\s*([^\n-]+)(?:\s*-\s*([^\n\(\)]+))?/i);
  if (bookmarkMatch) {
    data.mangaTitle = bookmarkMatch[1].trim();
    if (bookmarkMatch[2]) {
      data.chapterTitle = bookmarkMatch[2].trim();
    }
    data.hasStructure = true;
  }

  const pageMatch = caption.match(/Trang\s*(\d+)(?:\s*-\s*(\d+))?(?:\s*\/\s*(\d+))?/i);
  if (pageMatch) {
    data.startPage = parseInt(pageMatch[1], 10);
    data.endPage = pageMatch[2] ? parseInt(pageMatch[2], 10) : data.startPage;
    if (pageMatch[3]) {
      data.totalPages = parseInt(pageMatch[3], 10);
    }
    data.hasStructure = true;
  }

  return data;
}

async function run() {
  console.log('='.repeat(60));
  console.log('🚀 BẮT ĐẦU TRÍCH XUẤT DỮ LIỆU TỪ TELEGRAM CHANNEL');
  console.log(`• Phạm vi Message ID: ${START_MSG_ID} -> ${END_MSG_ID}`);
  console.log(`• File lưu kết quả: ${OUTPUT_PATH}`);
  console.log('='.repeat(60));

  // Đọc dữ liệu đã lưu trước đó nếu có (hỗ trợ tiếp tục quét)
  let restored = {
    title: 'VỢ TÔI NHIỄM NHIỄM',
    slug: 'vo-toi-nhiem-nhiem',
    cover: '',
    lastScannedMsgId: START_MSG_ID - 1,
    chapters: {}
  };

  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
      if (existing && existing.chapters) {
        restored = existing;
        console.log(`[i] Tìm thấy file tiến độ trước đó. Tiếp tục từ Message ID: ${restored.lastScannedMsgId + 1}`);
      }
    } catch (e) {
      console.warn('Không thể đọc file cũ, bắt đầu mới.');
    }
  }

  const startId = Math.max(START_MSG_ID, (restored.lastScannedMsgId || START_MSG_ID - 1) + 1);
  let currentGroup = null;
  const pendingDeleteIds = [];

  for (let id = startId; id <= END_MSG_ID; id++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: USER_ID, from_chat_id: CHAT_ID, message_id: id })
      }).then(r => r.json());

      if (res.ok && res.result) {
        pendingDeleteIds.push(res.result.message_id);

        const caption = res.result.caption || '';
        const photos = res.result.photo;
        const bestPhoto = photos ? photos[photos.length - 1] : null;

        if (caption) {
          const info = parseCaption(caption);
          if (info.hasStructure) {
            currentGroup = {
              chapterTitle: info.chapterTitle || 'Chương 1',
              startPage: info.startPage,
              endPage: info.endPage,
              totalPages: info.totalPages,
              counter: 0
            };
          }
        }

        if (bestPhoto && currentGroup) {
          const chapName = currentGroup.chapterTitle || 'Chương 1';
          const pageNum = currentGroup.startPage + currentGroup.counter;
          currentGroup.counter += 1;

          const fileId = bestPhoto.file_id;
          const mangaSlug = slugify(restored.title);
          const chapSlug = slugify(chapName);
          const pageStr = `p${String(pageNum).padStart(2, '0')}`;
          const cdnUrl = `${WORKER_DOMAIN}/file/${mangaSlug}/${chapSlug}/${pageStr}_${fileId}.jpg`;

          if (!restored.chapters[chapName]) {
            restored.chapters[chapName] = {
              title: chapName,
              expectedTotal: currentGroup.totalPages,
              pages: []
            };
          }

          if (currentGroup.totalPages > (restored.chapters[chapName].expectedTotal || 0)) {
            restored.chapters[chapName].expectedTotal = currentGroup.totalPages;
          }

          // Tránh duplicate page
          if (!restored.chapters[chapName].pages.some(p => p.page === pageNum)) {
            restored.chapters[chapName].pages.push({
              page: pageNum,
              url: cdnUrl,
              fileId
            });
          }

          if (!restored.cover && pageNum === 1 && chapName.includes('1')) {
            restored.cover = cdnUrl;
          }
        }
      } else if (res.error_code === 429) {
        // FloodWait
        const waitSec = res.parameters?.retry_after || 15;
        console.warn(`⏳ [RateLimit 429] Nghỉ ngơi ${waitSec}s tại msg ${id}...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        id--; // Thử lại tin nhắn này
        continue;
      }
    } catch (err) {
      console.warn(`Lỗi msg ${id}:`, err.message);
    }

    // Dọn dẹp tin nhắn đã forward vào chat người dùng sau mỗi 30 tin
    if (pendingDeleteIds.length >= 30) {
      const toDelete = [...pendingDeleteIds];
      pendingDeleteIds.length = 0;
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: USER_ID, message_ids: toDelete })
      }).catch(() => {});
    }

    // Lưu checkpoint mỗi 50 tin
    if (id % 50 === 0 || id === END_MSG_ID) {
      restored.lastScannedMsgId = id;
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(restored, null, 2), 'utf8');
      const totalImgs = Object.values(restored.chapters).reduce((s, c) => s + c.pages.length, 0);
      console.log(`[✓] Đã quét đến ID ${id}/${END_MSG_ID} — Tổng ảnh đã khôi phục: ${totalImgs}`);
    }

    // Delay 100ms an toàn
    await new Promise(r => setTimeout(r, 100));
  }

  // Dọn nốt tin nhắn còn lại
  if (pendingDeleteIds.length > 0) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: USER_ID, message_ids: pendingDeleteIds })
    }).catch(() => {});
  }

  // Chuyển sang format chuẩn của webx
  const finalChapters = [];
  const chapKeys = Object.keys(restored.chapters).sort((a, b) => {
    const numA = parseInt(a.replace(/\D+/g, '') || '0', 10);
    const numB = parseInt(b.replace(/\D+/g, '') || '0', 10);
    return numA - numB;
  });

  chapKeys.forEach(k => {
    const ch = restored.chapters[k];
    ch.pages.sort((a, b) => a.page - b.page);
    const num = parseInt(k.replace(/\D+/g, '') || '1', 10);
    const totalImages = ch.pages.length;
    const expected = ch.expectedTotal || totalImages;
    finalChapters.push({
      id: `ch-tg-${num}`,
      number: num,
      title: k,
      images: ch.pages.map(p => p.url),
      totalImages,
      expectedTotal: expected,
      isMissing: expected > totalImages,
      missingCount: Math.max(0, expected - totalImages)
    });
  });

  const finalOutput = {
    title: restored.title,
    slug: restored.slug,
    cover: finalChapters[0]?.images?.[0] || '',
    totalChapters: finalChapters.length,
    totalImages: finalChapters.reduce((s, c) => s + c.totalImages, 0),
    chapters: finalChapters,
    restoredAt: new Date().toISOString()
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalOutput, null, 2), 'utf8');
  console.log('='.repeat(60));
  console.log(`🎉 HOÀN THÀNH XUẤT SẮC!`);
  console.log(`• Tổng số Chapter: ${finalChapters.length}`);
  console.log(`• Tổng số ảnh: ${finalOutput.totalImages}`);
  console.log(`• File kết quả: ${OUTPUT_PATH}`);
  console.log('='.repeat(60));
}

run();
