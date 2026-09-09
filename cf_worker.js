/**
 * Cloudflare Worker: Telegram Image CDN & Advanced Manga Storage Engine
 * 
 * TÍNH NĂNG NÂNG CẤP:
 * 1. ĐĂNG THEO CỤC TO (ALBUM / MEDIA GROUP): Tự động gom tối đa 10 ảnh thành 1 tin nhắn dạng lưới (Collage Grid) trên Telegram qua sendMediaGroup.
 * 2. TỰ ĐỘNG LÀM SẠCH TOKEN: Tự động loại bỏ tiền tố thừa ("bot"), dấu ngoặc kép, khoảng trắng nếu nhập nhầm.
 * 3. ENDPOINT KIỂM TRA: GET /check để kiểm tra kết nối với Bot Telegram và Kênh lưu trữ.
 * 4. PHÂN LOẠI CẤU TRÚC: Tự động gắn thẻ Hashtag, tên truyện, số chapter, trang x/y vào Caption Album.
 * 5. SEMANTIC SEO URLs: Hỗ trợ URL dạng /file/:manga/:chapter/p01_:file_id.jpg (chuẩn SEO Google Images).
 * 6. EDGE CACHE 30 NGÀY: Caching siêu tốc tại các PoP Cloudflare VN với chuẩn hóa cache key theo file_id.
 */

// Domain được phép gọi API upload
const ALLOWED_ORIGINS = [
  "https://web18p.xyz",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173"
];

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.find(o => o === origin) || ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Upload-Key",
    "Vary": "Origin"
  };
}

// Làm sạch và chuẩn hóa Bot Token (chống lỗi nhập thừa "bot" hoặc nhập nhầm Chat ID)
function cleanToken(token) {
  // Token Telegram BẮT BUỘC phải có dấu ':' (ví dụ: 8957921406:AAFPi...)
  // Nếu bị nhập nhầm Chat ID (như -1004320007781) hoặc rỗng, tự động sửa về token chuẩn
  if (!token || !String(token).includes(":")) {
    return "8957921406:AAFPiJkoaJe7Brku-efkizT-3eTzPZaR7P8";
  }
  let t = String(token).trim();
  t = t.replace(/^["']|["']$/g, "").trim();
  if (t.includes("api.telegram.org/bot")) {
    t = t.split("api.telegram.org/bot").pop().split("/")[0];
  }
  t = t.replace(/^bot/i, "").trim();
  return t.includes(":") ? t : "8957921406:AAFPiJkoaJe7Brku-efkizT-3eTzPZaR7P8";
}

// Làm sạch Chat ID
function cleanChatId(chatId) {
  if (!chatId) return "-1004320007781";
  let c = String(chatId).trim();
  c = c.replace(/^["']|["']$/g, "").trim();
  return c || "-1004320007781";
}

// Chuyển chuỗi tiếng Việt thành Hashtag Telegram an toàn (#Vo_Luyen_Dinh_Phong)
function slugifyHashtag(str) {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// Chuyển chuỗi tiếng Việt thành URL Slug chuẩn SEO (vo-luyen-dinh-phong)
function slugifyUrl(str) {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ==========================
    // CORS Preflight
    // ==========================
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: getCorsHeaders(request) });
    }

    // Lấy Token & Chat ID (được làm sạch và fallback tự động)
    const BOT_TOKEN = cleanToken(env.BOT_TOKEN);
    const CHAT_ID = cleanChatId(env.CHAT_ID);
    const UPLOAD_API_KEY = env.UPLOAD_API_KEY;

    // =========================================================================
    // 0. ENDPOINT KIỂM TRA TRẠNG THÁI: GET /check
    // =========================================================================
    if (url.pathname === "/check" || url.pathname === "/api/check") {
      try {
        const [meRes, chatRes] = await Promise.all([
          fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`).then(r => r.json()),
          fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${CHAT_ID}`).then(r => r.json())
        ]);
        return new Response(JSON.stringify({
          status: (meRes.ok && chatRes.ok) ? "CONNECTED_OK" : "ERROR",
          bot_token_preview: `${BOT_TOKEN.slice(0, 8)}...${BOT_TOKEN.slice(-6)}`,
          chat_id: CHAT_ID,
          bot: meRes,
          channel: chatRes
        }, null, 2), {
          headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // =========================================================================
    // 1. API UPLOAD ALBUM (GOM TỐI ĐA 10 ẢNH / CỤC LƯỚI COLLAGE TELEGRAM)
    // =========================================================================
    if (request.method === "POST" && (url.pathname === "/upload-album" || url.pathname === "/api/upload-album")) {
      const corsHeaders = getCorsHeaders(request);

      if (UPLOAD_API_KEY) {
        const clientKey = request.headers.get("X-Upload-Key") || "";
        if (clientKey !== UPLOAD_API_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized: API Key không hợp lệ" }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      try {
        const formData = await request.formData();
        const files = formData.getAll("files");
        const mangaTitle = (formData.get("manga_title") || "").trim();
        const chapter = (formData.get("chapter") || "").trim();
        const startPage = parseInt(formData.get("start_page") || "1", 10);
        const totalPages = parseInt(formData.get("total_pages") || String(files.length), 10);
        const threadId = (formData.get("thread_id") || "").trim();

        if (!files || files.length === 0) {
          return new Response(JSON.stringify({ error: "Không tìm thấy file ảnh nào trong album" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const mangaTag = slugifyHashtag(mangaTitle);
        const chapTag = slugifyHashtag(chapter);
        const mangaSlug = slugifyUrl(mangaTitle);
        const chapSlug = slugifyUrl(chapter);

        // Trường hợp chỉ có 1 file: gửi qua sendPhoto
        if (files.length === 1) {
          const file = files[0];
          let caption = `#${file.name.replace(/\.[^/.]+$/, '')}`;
          if (mangaTag || chapTag) {
            const lines = [];
            if (mangaTag) lines.push(`📚 #${mangaTag}`);
            if (chapTag) lines.push(`📖 #${chapTag} | 📄 Trang ${startPage}/${totalPages}`);
            lines.push(`🔖 ${mangaTitle}${chapter ? ` - ${chapter}` : ''}`);
            caption = lines.join("\n");
          }

          const tgFormData = new FormData();
          tgFormData.append("chat_id", CHAT_ID);
          tgFormData.append("photo", file, file.name);
          tgFormData.append("caption", caption);
          if (threadId) tgFormData.append("message_thread_id", threadId);

          const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: "POST",
            body: tgFormData
          });
          const tgData = await tgRes.json();
          if (!tgData.ok) {
            return new Response(JSON.stringify({ error: tgData.description || "Lỗi Telegram" }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }

          const bestPhoto = tgData.result.photo[tgData.result.photo.length - 1];
          const fileId = bestPhoto.file_id;
          const pagePart = `p${String(startPage).padStart(2, '0')}`;
          let publicUrl = `${url.origin}/file/${fileId}.jpg`;
          if (mangaSlug && chapSlug) {
            publicUrl = `${url.origin}/file/${mangaSlug}/${chapSlug}/${pagePart}_${fileId}.jpg`;
          }

          return new Response(JSON.stringify({
            success: true,
            results: [{
              page: startPage,
              filename: file.name,
              file_id: fileId,
              url: publicUrl
            }]
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // Trường hợp >= 2 file (Tối đa 10 file/album): Gửi qua sendMediaGroup để tạo CỤC LƯỚI
        const endPage = startPage + files.length - 1;
        let albumCaption = '';
        if (mangaTag || chapTag) {
          const lines = [];
          if (mangaTag) lines.push(`📚 #${mangaTag}`);
          if (chapTag) lines.push(`📖 #${chapTag} | 📄 Trang ${startPage}-${endPage}/${totalPages}`);
          lines.push(`🔖 ${mangaTitle}${chapter ? ` - ${chapter}` : ''} (Album ${files.length} trang)`);
          albumCaption = lines.join("\n");
        } else {
          albumCaption = `📁 Album ${files.length} trang truyện (${startPage}-${endPage})`;
        }

        const mediaArray = [];
        const tgFormData = new FormData();
        tgFormData.append("chat_id", CHAT_ID);
        if (threadId) tgFormData.append("message_thread_id", threadId);

        files.forEach((file, idx) => {
          const attachKey = `photo_${idx}`;
          tgFormData.append(attachKey, file, file.name);
          mediaArray.push({
            type: "photo",
            media: `attach://${attachKey}`,
            caption: idx === 0 ? albumCaption : undefined
          });
        });

        tgFormData.append("media", JSON.stringify(mediaArray));

        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
          method: "POST",
          body: tgFormData
        });
        const tgData = await tgRes.json();

        if (!tgData.ok) {
          return new Response(JSON.stringify({ error: tgData.description || "Lỗi Telegram sendMediaGroup" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // tgData.result là mảng Message tương ứng với từng ảnh trong album
        const messages = tgData.result;
        const results = [];

        messages.forEach((msg, idx) => {
          const currentPage = startPage + idx;
          const file = files[idx];
          const photos = msg.photo;
          const bestPhoto = photos ? photos[photos.length - 1] : null;
          const fileId = bestPhoto ? bestPhoto.file_id : '';
          const pagePart = `p${String(currentPage).padStart(2, '0')}`;

          let publicUrl = `${url.origin}/file/${fileId}.jpg`;
          if (mangaSlug && chapSlug) {
            publicUrl = `${url.origin}/file/${mangaSlug}/${chapSlug}/${pagePart}_${fileId}.jpg`;
          }

          results.push({
            page: currentPage,
            filename: file ? file.name : `page_${currentPage}`,
            file_id: fileId,
            url: publicUrl
          });
        });

        return new Response(JSON.stringify({
          success: true,
          count: results.length,
          results
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // =========================================================================
    // 2. API UPLOAD ĐƠN LẺ (DÙNG CHO ẢNH BÌA HOẶC FILE RIÊNG LẺ)
    // =========================================================================
    if (request.method === "POST" && (url.pathname === "/upload" || url.pathname === "/api/upload")) {
      const corsHeaders = getCorsHeaders(request);

      if (UPLOAD_API_KEY) {
        const clientKey = request.headers.get("X-Upload-Key") || "";
        if (clientKey !== UPLOAD_API_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized: API Key không hợp lệ" }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      try {
        const formData = await request.formData();
        const file = formData.get("file");
        const mangaTitle = (formData.get("manga_title") || "").trim();
        const chapter = (formData.get("chapter") || "").trim();
        const pageIndex = (formData.get("page_index") || "").trim();
        const totalPages = (formData.get("total_pages") || "").trim();
        const threadId = (formData.get("thread_id") || "").trim();

        if (!file || !(file instanceof File)) {
          return new Response(JSON.stringify({ error: "Không tìm thấy file ảnh" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
        if (file.type && !allowedTypes.includes(file.type)) {
          return new Response(JSON.stringify({ error: `Loại file không hợp lệ (${file.type}). Chỉ chấp nhận file ảnh.` }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          return new Response(JSON.stringify({ error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 10MB.` }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        let caption = `#${file.name.replace(/\.[^/.]+$/, '')}`;
        if (mangaTitle || chapter) {
          const mangaTag = slugifyHashtag(mangaTitle);
          const chapTag = slugifyHashtag(chapter);
          const lines = [];
          if (mangaTag) lines.push(`📚 #${mangaTag}`);
          if (chapTag) {
            let pageLabel = pageIndex ? (totalPages ? `Trang ${pageIndex}/${totalPages}` : `Trang ${pageIndex}`) : '';
            lines.push(`📖 #${chapTag} ${pageLabel ? `| 📄 ${pageLabel}` : ''}`.trim());
          }
          lines.push(`🔖 ${mangaTitle}${chapter ? ` - ${chapter}` : ''}`);
          caption = lines.join("\n");
        }

        const tgFormData = new FormData();
        tgFormData.append("chat_id", CHAT_ID);
        tgFormData.append("photo", file, file.name);
        tgFormData.append("caption", caption);
        if (threadId) tgFormData.append("message_thread_id", threadId);

        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          body: tgFormData,
        });
        const tgData = await tgRes.json();

        if (!tgData.ok) {
          return new Response(JSON.stringify({ error: tgData.description || "Lỗi Telegram" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const photos = tgData.result.photo;
        const bestPhoto = photos[photos.length - 1];
        const fileId = bestPhoto.file_id;

        const mangaSlug = slugifyUrl(mangaTitle);
        const chapSlug = slugifyUrl(chapter);
        let pagePart = file.name.replace(/\.[^/.]+$/, '');
        if (pageIndex) {
          pagePart = `p${String(pageIndex).padStart(2, '0')}`;
        }

        let publicUrl = `${url.origin}/file/${fileId}.jpg`;
        if (mangaSlug && chapSlug) {
          publicUrl = `${url.origin}/file/${mangaSlug}/${chapSlug}/${pagePart}_${fileId}.jpg`;
        }

        return new Response(
          JSON.stringify({
            success: true,
            filename: file.name,
            file_id: fileId,
            url: publicUrl,
            direct_url: `${url.origin}/file/${fileId}.jpg`,
            size: bestPhoto.file_size,
            manga: mangaTitle,
            chapter: chapter,
            page: pageIndex
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // =========================================================================
    // 3. CDN PHÁT ẢNH + EDGE CACHING (HỖ TRỢ CẢ SEO URL & THƯỜNG)
    // =========================================================================
    if (url.pathname.startsWith("/file/")) {
      let rawPath = url.pathname.replace(/^\/file\//, "").trim();
      rawPath = rawPath.replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, "");

      const segments = rawPath.split("/").filter(Boolean);
      const lastSegment = segments[segments.length - 1] || "";

      let fileId = lastSegment;
      // Bóc tách tiền tố số trang (p01_..., page1_..., 01_...) mà KHÔNG làm đứt file_id chứa dấu gạch dưới
      if (/^(p\d+|page\d*|\d+)_/i.test(lastSegment)) {
        fileId = lastSegment.replace(/^(p\d+|page\d*|\d+)_/i, "");
      } else if (lastSegment.includes("---")) {
        fileId = lastSegment.split("---").pop();
      }

      if (!fileId) {
        return new Response("Thiếu file_id", {
          status: 400,
          headers: { "Cache-Control": "no-cache, no-store", "Access-Control-Allow-Origin": "*" }
        });
      }

      const cache = caches.default;
      const cacheKey = new Request(`${url.origin}/file/${fileId}`, { method: "GET" });
      let cachedResponse = await cache.match(cacheKey);

      if (cachedResponse) {
        const res = new Response(cachedResponse.body, cachedResponse);
        res.headers.set("X-Cache-Status", "HIT");
        res.headers.set("Content-Disposition", "inline");
        res.headers.set("Access-Control-Allow-Origin", "*");
        let ct = res.headers.get("Content-Type") || "";
        if (!ct.startsWith("image/")) {
          res.headers.set("Content-Type", "image/jpeg");
        }
        return res;
      }

      try {
        const getFileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const getFileData = await getFileRes.json();

        if (!getFileData.ok || !getFileData.result || !getFileData.result.file_path) {
          const errMsg = getFileData.description || "Telegram không tìm thấy file hoặc file_id không hợp lệ";
          return new Response(`Ảnh không tồn tại trên Telegram! (${errMsg})`, {
            status: 404,
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }

        const filePath = getFileData.result.file_path;
        const imageRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);

        if (!imageRes.ok) {
          return new Response(`Lỗi khi tải ảnh từ Telegram: ${imageRes.statusText}`, {
            status: imageRes.status,
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }

        let contentType = "image/jpeg";
        const ext = filePath.split(".").pop().toLowerCase();
        if (ext === "png") contentType = "image/png";
        else if (ext === "webp") contentType = "image/webp";
        else if (ext === "gif") contentType = "image/gif";

        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set("Content-Disposition", "inline");
        headers.set("Cache-Control", "public, max-age=2592000, immutable");
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("X-Cache-Status", "MISS");

        const responseToCache = new Response(imageRes.body, { status: 200, headers });
        ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));

        return responseToCache;
      } catch (err) {
        return new Response("Lỗi proxy: " + err.message, {
          status: 500,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }

    // =========================================================================
    // 4. TRANG CHỦ CDN
    // =========================================================================
    return new Response("Telegram Image CDN & Advanced Manga Album Storage is running.\nBatch API: /upload-album (Up to 10 images / collage group)\nSingle API: /upload\nDiagnose: /check\nCDN Format: /file/:manga/:chapter/:page_:file_id.jpg", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
