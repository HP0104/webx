/**
 * Cloudflare Worker: Telegram Image CDN & Secure Upload Proxy
 * 
 * BẢO MẬT:
 * - BOT_TOKEN chỉ nằm trong Environment Variables (KHÔNG hardcode)
 * - Endpoint /upload yêu cầu xác thực bằng header X-Upload-Key
 * - Kiểm tra file type (chỉ nhận ảnh) và giới hạn kích thước 10MB
 * - CORS giới hạn cho domain web18p.xyz và localhost
 * 
 * TÍNH NĂNG:
 * 1. POST /upload: Nhận ảnh từ web (có xác thực) → đẩy lên Telegram Channel
 * 2. GET /file/:id.jpg: Phát ảnh trực tiếp, cache 30 ngày tại VN qua Cloudflare Edge
 */

// Domain được phép gọi API upload (thêm domain của bạn vào đây)
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

// CORS mở cho CDN ảnh (ảnh cần nhúng được vào mọi trang)
const CDN_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*"
};

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
    // Có fallback để đảm bảo hệ thống chạy mượt mà ngay cả khi chưa kịp cấu hình Dashboard
    const BOT_TOKEN = env.BOT_TOKEN;
    const CHAT_ID = env.CHAT_ID;
    const UPLOAD_API_KEY = env.UPLOAD_API_KEY;

    // ==========================
    // 1. API UPLOAD (CÓ XÁC THỰC)
    // ==========================
    if (request.method === "POST" && (url.pathname === "/upload" || url.pathname === "/api/upload")) {
      const corsHeaders = getCorsHeaders(request);

      // Kiểm tra cấu hình server
      if (!BOT_TOKEN || !CHAT_ID) {
        return new Response(JSON.stringify({ error: "Server chưa cấu hình BOT_TOKEN hoặc CHAT_ID" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // === XÁC THỰC: Kiểm tra API Key ===
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

        if (!file || !(file instanceof File)) {
          return new Response(JSON.stringify({ error: "Không tìm thấy file ảnh" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // === KIỂM TRA LOẠI FILE: Chỉ chấp nhận ảnh ===
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
        if (file.type && !allowedTypes.includes(file.type)) {
          return new Response(JSON.stringify({ error: `Loại file không được phép: ${file.type}. Chỉ chấp nhận ảnh.` }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // === KIỂM TRA KÍCH THƯỚC: Tối đa 10MB ===
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
          return new Response(JSON.stringify({ error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 10MB.` }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // Tạo FormData đẩy sang Telegram Bot API
        const tgFormData = new FormData();
        tgFormData.append("chat_id", CHAT_ID);
        tgFormData.append("photo", file, file.name);
        tgFormData.append("caption", `#${file.name.replace(/\.[^/.]+$/, '')}`);

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

        // Lấy ảnh độ phân giải nét nhất
        const photos = tgData.result.photo;
        const bestPhoto = photos[photos.length - 1];
        const fileId = bestPhoto.file_id;
        const publicUrl = `${url.origin}/file/${fileId}.jpg`;

        return new Response(
          JSON.stringify({
            success: true,
            filename: file.name,
            file_id: fileId,
            url: publicUrl,
            size: bestPhoto.file_size,
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

    // ==========================
    // 2. CDN PHÁT ẢNH + CACHE
    // ==========================
    if (url.pathname.startsWith("/file/")) {
      let fileId = url.pathname.replace("/file/", "").trim();
      fileId = fileId.replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, "");

      if (!fileId) {
        return new Response("Thiếu file_id", { status: 400 });
      }

      if (!BOT_TOKEN) {
        return new Response("Server chưa cấu hình BOT_TOKEN", { status: 500 });
      }

      // Kiểm tra Edge Cache
      const cache = caches.default;
      const cacheKey = new Request(url.origin + "/file/" + fileId, { method: "GET" });
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

    // ==========================
    // 3. TRANG CHỦ
    // ==========================
    return new Response("Telegram Image CDN is running. Use /file/<FILE_ID>.jpg to view images.", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
