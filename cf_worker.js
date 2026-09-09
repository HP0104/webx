/**
 * Cloudflare Worker: Telegram Image CDN & Advanced Manga Storage Engine
 * 
 * TÍNH NĂNG NÂNG CẤP CHUYÊN SÂU:
 * 1. PHÂN LOẠI CẤU TRÚC: Tự động gắn thẻ Hashtag, tên truyện, số chapter, trang x/y vào Caption Telegram.
 * 2. TELEGRAM TOPICS: Hỗ trợ message_thread_id để tự động nhóm ảnh vào Topic/Diễn đàn riêng của từng truyện.
 * 3. SEMANTIC SEO URLs: Hỗ trợ URL dạng /file/:manga/:chapter/p01_:file_id.jpg (chuẩn SEO Google Images).
 * 4. EDGE CACHE 30 NGÀY: Caching siêu tốc tại các PoP Cloudflare VN với chuẩn hóa cache key theo file_id.
 * 5. BẢO MẬT TUYỆT ĐỐI: Ẩn bot token, kiểm tra MIME type, chặn file > 10MB, CORS theo domain cho phép.
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

    // Lấy Token & Chat ID từ Cloudflare Variables (Settings -> Variables)
    // Có fallback để đảm bảo chạy mượt mà
    const BOT_TOKEN = env.BOT_TOKEN;
    const CHAT_ID = env.CHAT_ID;
    const UPLOAD_API_KEY = env.UPLOAD_API_KEY;

    // ==========================================
    // 1. API UPLOAD (CÓ PHÂN LOẠI & SEO)
    // ==========================================
    if (request.method === "POST" && (url.pathname === "/upload" || url.pathname === "/api/upload")) {
      const corsHeaders = getCorsHeaders(request);

      if (!BOT_TOKEN || !CHAT_ID) {
        return new Response(JSON.stringify({ error: "Server chưa cấu hình BOT_TOKEN hoặc CHAT_ID" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // Kiểm tra API Key nếu có cấu hình
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

        // Kiểm tra loại file (chỉ nhận ảnh)
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
        if (file.type && !allowedTypes.includes(file.type)) {
          return new Response(JSON.stringify({ error: `Loại file không hợp lệ (${file.type}). Chỉ chấp nhận file ảnh.` }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // Giới hạn kích thước (10MB)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          return new Response(JSON.stringify({ error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 10MB.` }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // === CẤU TRÚC CAPTION THÔNG MINH CHO TELEGRAM ===
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

        // Tạo FormData đẩy sang Telegram Bot API
        const tgFormData = new FormData();
        tgFormData.append("chat_id", CHAT_ID);
        tgFormData.append("photo", file, file.name);
        tgFormData.append("caption", caption);

        // Hỗ trợ Telegram Forum Topic (Supergroup)
        if (threadId) {
          tgFormData.append("message_thread_id", threadId);
        }

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

        // Lấy ảnh độ nét cao nhất
        const photos = tgData.result.photo;
        const bestPhoto = photos[photos.length - 1];
        const fileId = bestPhoto.file_id;

        // === TẠO URL CDN NGỮ NGHĨA (SEMANTIC SEO URL) ===
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

    // ==========================================
    // 2. CDN PHÁT ẢNH + CACHE (HỖ TRỢ CẢ SEO URL)
    // ==========================================
    if (url.pathname.startsWith("/file/")) {
      let rawPath = url.pathname.replace(/^\/file\//, "").trim();
      rawPath = rawPath.replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, "");

      // Hỗ trợ cả 2 định dạng:
      // 1. /file/AgACAgIA...jpg
      // 2. /file/ten-truyen/chap-1/p01_AgACAgIA...jpg
      const segments = rawPath.split("/").filter(Boolean);
      const lastSegment = segments[segments.length - 1] || "";

      let fileId = lastSegment;
      if (lastSegment.includes("_")) {
        fileId = lastSegment.split("_").pop();
      }

      if (!fileId) {
        return new Response("Thiếu file_id", { status: 400 });
      }

      if (!BOT_TOKEN) {
        return new Response("Server chưa cấu hình BOT_TOKEN", { status: 500 });
      }

      // Kiểm tra Edge Cache (chuẩn hóa key theo fileId)
      const cache = caches.default;
      const cacheKey = new Request(`${url.origin}/file/${fileId}`, { method: "GET" });
      let cachedResponse = await cache.match(cacheKey);

      if (cachedResponse) {
        const res = new Response(cachedResponse.body, cachedResponse);
        res.headers.set("X-Cache-Status", "HIT");
        res.headers.set("Content-Disposition", "inline");
        let ct = res.headers.get("Content-Type") || "";
        if (!ct.startsWith("image/")) {
          res.headers.set("Content-Type", "image/jpeg");
        }
        return res;
      }

      try {
        const getFileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const getFileData = await getFileRes.json();

        if (!getFileData.ok || !getFileData.result.file_path) {
          return new Response("Ảnh không tồn tại trên Telegram!", { status: 404 });
        }

        const filePath = getFileData.result.file_path;
        const imageRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);

        if (!imageRes.ok) {
          return new Response("Lỗi khi tải ảnh từ Telegram", { status: imageRes.status });
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
        return new Response("Lỗi proxy: " + err.message, { status: 500 });
      }
    }

    // ==========================================
    // 3. TRANG CHỦ CDN
    // ==========================================
    return new Response("Telegram Image CDN & Manga Storage Engine is running.\nCDN URL Format: /file/:manga/:chapter/:page_:file_id.jpg\nDirect: /file/:file_id.jpg", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
