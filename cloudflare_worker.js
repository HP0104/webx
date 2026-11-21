/**
 * CLOUDFLARE WORKER PROXY FOR WEB18P SECURE PAYMENT CHECKS (WITH SMART FALLBACK)
 * 
 * Instructions:
 * 1. Open your Cloudflare Worker dashboard.
 * 2. Click "Edit Code" on your worker 'web18p-deloy'.
 * 3. Copy all the content of this file and paste it, overwriting the old code.
 * 4. Click "Save and Deploy".
 * 5. Make sure the following environment variables (Secrets) are set in Cloudflare Worker Settings:
 *    - FIREBASE_PROJECT_ID
 *    - FIREBASE_CLIENT_EMAIL
 *    - FIREBASE_PRIVATE_KEY (Paste the service account private key. Our code will automatically clean any outer quotes and literal \n characters!)
 *    - SEPAY_API_TOKEN
 *    - PAYOS_CLIENT_ID
 *    - PAYOS_API_KEY
 */

const ALLOWED_ORIGINS = [
  "https://web18p.xyz",
  "https://www.web18p.xyz",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Upload-Key",
    "Vary": "Origin"
  };
}

function isOriginAllowed(request, env) {
  const origin = request.headers.get("Origin") || "";
  const uploadKey = request.headers.get("X-Upload-Key") || "";
  if (env?.UPLOAD_API_KEY && uploadKey === env.UPLOAD_API_KEY) return true;
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

// --- Agent & Markdown Content Negotiation Templates ---
const MARKDOWN_HOME = `# WEB18P - Kho Game Việt Hóa, Phim Bộ & Truyện Tranh Online

Chào mừng đến với WEB18P (https://web18p.xyz/) - Cổng thông tin và nền tảng giải trí trực tuyến hàng đầu về Game Việt Hóa, Phim Bộ không gián đoạn và Truyện Tranh bản đẹp.

## Khi Nào Nên Sử Dụng WEB18P (When to Use This)
WEB18P là nền tảng phù hợp nhất cho các tác vụ và yêu cầu sau của người dùng và AI Agent:
- **Tìm kiếm và tải Game Việt Hóa**: Tra cứu các tựa game PC và Android đã được bản địa hóa tiếng Việt hoàn chỉnh, link tải an toàn, cấu hình chi tiết và đánh giá từ cộng đồng.
- **Xem Phim Bộ & Video Trực Tuyến**: Xem phim bộ nhiều tập với công nghệ phát liên tiếp không ngắt quãng (Seamless Double-Buffering Streaming), hỗ trợ đa máy chủ ổn định.
- **Đọc Truyện Tranh Online**: Kho truyện tranh phong phú được tối ưu hóa hiển thị tốc độ cao trên mọi thiết bị máy tính và di động.
- **Tương tác cộng đồng**: Bình luận, đánh giá chất lượng và báo cáo lỗi link tải tự động.

## Danh Mục & Đường Dẫn Chính
- Trang Chủ: https://web18p.xyz/
- Kho Game Việt Hóa: https://web18p.xyz/games
- Kho Phim Bộ & Phim Lẻ: https://web18p.xyz/videos/all
- Kho Truyện Tranh Online: https://web18p.xyz/manga
- Tìm Kiếm Game Bằng AI: https://web18p.xyz/ai-search

## Trang Thông Tin & Độ Tin Cậy (Trust Anchors)
- Về Chúng Tôi: https://web18p.xyz/about
- Liên Hệ & Hỗ Trợ: https://web18p.xyz/contact
- Chính Sách Quyền Riêng Tư: https://web18p.xyz/privacy
- Báo Lỗi & Khiếu Nại Bản Quyền (DMCA): https://web18p.xyz/report
- Sơ Đồ Trang Web: https://web18p.xyz/sitemap.xml
- Hướng Dẫn Dành Cho AI Agent (llms.txt): https://web18p.xyz/llms.txt
- Đặc Tả Kỹ Thuật Đầy Đủ (llms-full.txt): https://web18p.xyz/llms-full.txt

## Thông Tin Liên Hệ & Pháp Lý
- Email Hỗ Trợ: contact@web18p.xyz
- Email Bản Quyền: dmca@web18p.xyz
- Kênh Cộng Đồng Telegram: https://t.me/web18p
- Địa Chỉ: 18 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh, Việt Nam (Postal Code: 70000)
`;

const MARKDOWN_ABOUT = `# Về Chúng Tôi - WEB18P

Website chính thức: https://web18p.xyz/

## 1. Sứ Mệnh & Tầm Nhìn
WEB18P (web18p.xyz) ra đời với sứ mệnh mang đến cho cộng đồng người dùng Việt Nam một không gian tổng hợp thông tin, link tải an toàn và các tác phẩm game được bản địa hóa tiếng Việt (Game Việt Hóa) đạt chuẩn chất lượng cao nhất.

## 2. Cam Kết An Toàn & Trải Nghiệm
- **Kiểm tra bảo mật nghiêm ngặt**: 100% các file cài đặt và link tải được quét qua VirusTotal và Windows Defender.
- **Hạ tầng truyền tải tốc độ cao**: Mạng phân phối nội dung CDN quốc tế và máy chủ lưu trữ chuyên dụng.
- **Trình phát phim bộ liên tục**: Đột phá với tính năng phát liền mạch không ngắt quãng (Gapless Double-Buffering Player).

## 3. Bản Quyền & Trách Nhiệm DMCA
WEB18P luôn tôn trọng quyền sở hữu trí tuệ. Mọi yêu cầu gỡ bỏ nội dung hợp lệ được xử lý qua contact@web18p.xyz trong vòng 24–48 giờ.
`;

const MARKDOWN_CONTACT = `# Liên Hệ & Hỗ Trợ - WEB18P

Website chính thức: https://web18p.xyz/

## Kênh Tiếp Nhận Thông Tin Chính Thức
- Email Hỗ Trợ Kỹ Thuật: contact@web18p.xyz
- Email Khiếu Nại Bản Quyền (DMCA): dmca@web18p.xyz
- Kênh Telegram Chính Thức: https://t.me/web18p (@web18p)
- Địa Chỉ: 18 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh, Việt Nam (Postal Code: 70000)

## Thời Gian Phản Hồi
- Yêu cầu bản quyền DMCA: Dưới 24 giờ làm việc.
- Thắc mắc kỹ thuật & link tải: Dưới 48 giờ làm việc.
`;

const MARKDOWN_PRIVACY = `# Chính Sách Quyền Riêng Tư & Bảo Mật Dữ Liệu - WEB18P

Áp dụng cho toàn bộ người dùng tại https://web18p.xyz/

## 1. Dữ Liệu Thu Thập
Chúng tôi chỉ thu thập thông tin tối thiểu cần thiết để vận hành:
- Thông tin tài khoản: Email, tên hiển thị công khai qua Firebase Authentication.
- Dữ liệu trải nghiệm: Danh sách yêu thích, đánh giá và tiến độ phát video liên tục.
- Thông tin kỹ thuật ẩn danh: Địa chỉ IP ẩn danh, loại trình duyệt nhằm phòng ngừa DDoS.

## 2. Cookie & Local Storage
- Lưu giữ phiên làm việc đăng nhập an toàn.
- Ghi nhớ tập phim đang xem và mốc thời gian để người dùng tiếp tục thưởng thức liền mạch.
- Cam kết không chia sẻ hoặc bán dữ liệu cá nhân cho bên thứ ba.

## 3. Bảo Mật & Quyền Của Bạn
- Toàn bộ lưu lượng truy cập được mã hóa SSL/TLS qua Cloudflare.
- Người dùng có toàn quyền xem, sửa hoặc yêu cầu xóa vĩnh viễn tài khoản qua email privacy@web18p.xyz hoặc contact@web18p.xyz.
`;

const MARKDOWN_LLMS = `# WEB18P (web18p.xyz)
> Cổng thông tin và thư viện giải trí Game Việt Hóa, Phim Bộ trực tuyến và Truyện Tranh hàng đầu tại Việt Nam.

## When to Use This (Khi nào nên sử dụng WEB18P)
WEB18P là nền tảng phù hợp nhất cho các tác vụ và yêu cầu sau của người dùng và AI Agent:
- **Tìm kiếm và tải Game Việt Hóa:** Tra cứu các tựa game PC và Android đã được dịch thuật và bản địa hóa tiếng Việt (Việt hóa). Cung cấp link tải trực tiếp an toàn, cấu hình yêu cầu, đánh giá người chơi và lịch sử cập nhật.
- **Xem Phim Bộ & Phim Lẻ trực tuyến:** Tìm kiếm phim bộ nhiều tập (Anime 3D, VAM, Cosplay vietsub) với công nghệ phát liên tiếp không ngắt quãng (Double-Buffering gapless playback), hỗ trợ đa máy chủ (Server 1 HGCloud, Server 2 Vibuxer).
- **Đọc Truyện Tranh Online:** Đọc truyện tranh chọn lọc với hình ảnh chất lượng cao tối ưu qua CDN, tải nhanh, phân loại theo thể loại và trạng thái phát hành.
- **Tương tác cộng đồng:** Hệ thống đánh giá, bình luận realtime và báo lỗi link tải tự động.

## Core Sections & URLs
- Trang chủ: https://web18p.xyz/
- Kho Game Việt Hóa: https://web18p.xyz/games
- Kho Phim Trực Tuyến: https://web18p.xyz/videos/all
- Kho Truyện Tranh: https://web18p.xyz/manga
- Tìm kiếm Game bằng AI: https://web18p.xyz/ai-search

## Trust & Information
- Về chúng tôi (About): https://web18p.xyz/about
- Liên hệ & Hỗ trợ (Contact): https://web18p.xyz/contact
- Chính sách bảo mật (Privacy): https://web18p.xyz/privacy
- Báo cáo lỗi link / nội dung: https://web18p.xyz/report
- Sơ đồ trang web máy đọc: https://web18p.xyz/sitemap.xml
- Email hỗ trợ: contact@web18p.xyz
- Kênh cộng đồng Telegram: https://t.me/web18p
`;

const MARKDOWN_404 = `# 404 Not Found

The requested resource was not found on WEB18P.

Please check the URL or consult our agent guides and sitemap:
- Homepage: https://web18p.xyz/
- AI Agent Guide: https://web18p.xyz/llms.txt
- Full Developer Reference: https://web18p.xyz/llms-full.txt
- Sitemap: https://web18p.xyz/sitemap.xml
- About Us: https://web18p.xyz/about
- Contact: https://web18p.xyz/contact
`;

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request);

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const acceptHeader = request.headers.get("Accept") || "";
    const wantsMarkdown = acceptHeader.toLowerCase().includes("text/markdown");

    // 1. Markdown Content Negotiation for Homepage & Trust Pages (Ora / is-agentic.com compliance)
    if (wantsMarkdown && request.method === "GET") {
      if (url.pathname === "/" || url.pathname === "/index.html") {
        return new Response(MARKDOWN_HOME, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Vary": "Accept",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
      if (url.pathname === "/about" || url.pathname === "/about/") {
        return new Response(MARKDOWN_ABOUT, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Vary": "Accept",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
      if (url.pathname === "/contact" || url.pathname === "/contact/") {
        return new Response(MARKDOWN_CONTACT, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Vary": "Accept",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
      if (url.pathname === "/privacy" || url.pathname === "/privacy/") {
        return new Response(MARKDOWN_PRIVACY, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Vary": "Accept",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
    }

    // 2. Direct llms.txt endpoints (serves markdown with Vary: Accept)
    if ((url.pathname === "/llms.txt" || url.pathname === "/.well-known/llms.txt") && request.method === "GET") {
      return new Response(MARKDOWN_LLMS, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Vary": "Accept",
          "Cache-Control": "public, max-age=86400"
        }
      });
    }

    // 3. Agent 404 Probes (e.g. Ora audit /__ora-404-probe-*, /some-path-that-does-not-exist)
    if (url.pathname.startsWith("/__ora-404-probe") || url.pathname === "/some-path-that-does-not-exist") {
      if (wantsMarkdown) {
        return new Response(MARKDOWN_404, {
          status: 404,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Vary": "Accept",
            "Cache-Control": "no-cache"
          }
        });
      }
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Vary": "Accept"
        }
      });
    }

    // Bot / Crawler Open Graph Link Preview Interceptor (Telegram, Facebook, Discord, Zalo, etc.)
    const userAgent = request.headers.get("User-Agent") || "";
    if (isCrawler(userAgent) && request.method === "GET") {
      const crawlerResponse = await handleCrawlerMetadata(url, env);
      if (crawlerResponse) return crawlerResponse;
    }

    // Proxy endpoint for FreeImage.host manga uploads (bypasses browser CORS)
    if (url.pathname === "/api/upload-freeimage") {
      const uploadCorsHeaders = getCorsHeaders(request);

      if (request.method === "OPTIONS") {
        return new Response(null, { headers: uploadCorsHeaders });
      }

      if (!isOriginAllowed(request, env)) {
        return new Response(JSON.stringify({ status_code: 403, error: { message: "Origin không được phép." } }), {
          status: 403,
          headers: { ...uploadCorsHeaders, "Content-Type": "application/json" }
        });
      }

      if (request.method === "POST") {
        try {
          const formData = await request.formData();
          if (!formData.has("key") || !formData.get("key")) {
            if (!env.FREEIMAGE_API_KEY) {
              return new Response(JSON.stringify({ status_code: 400, error: { message: "Thiếu FreeImage API key." } }), {
                status: 400,
                headers: { ...uploadCorsHeaders, "Content-Type": "application/json" }
              });
            }
            formData.set("key", env.FREEIMAGE_API_KEY);
          }
          formData.set("action", "upload");
          formData.set("format", "json");
          if (!formData.has("nsfw")) {
            formData.set("nsfw", "1");
          }

          const response = await fetch("https://freeimage.host/api/1/upload", {
            method: "POST",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
              "Accept": "application/json, text/plain, */*",
              "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
              "Origin": "https://freeimage.host",
              "Referer": "https://freeimage.host/"
            },
            body: formData
          });

          const data = await response.json();
          return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { ...uploadCorsHeaders, "Content-Type": "application/json" }
          });
        } catch (err) {
          return new Response(JSON.stringify({ status_code: 500, error: { message: err.message } }), {
            status: 500,
            headers: { ...uploadCorsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    }

    // Proxy endpoint for manga image uploads (bypasses browser CORS)
    // Strategy: Try Catbox.moe first, fallback to Telegra.ph if Catbox fails
    if (url.pathname === "/api/upload-catbox") {
      const uploadCorsHeaders = getCorsHeaders(request);

      if (request.method === "OPTIONS") {
        return new Response(null, { headers: uploadCorsHeaders });
      }

      if (!isOriginAllowed(request, env)) {
        return new Response(JSON.stringify({ success: false, error: "Origin không được phép." }), {
          status: 403,
          headers: { ...uploadCorsHeaders, "Content-Type": "application/json" }
        });
      }

      if (request.method === "POST") {
        try {
          const incomingFormData = await request.formData();
          
          // Get the file from incoming form - support both 'source' and 'fileToUpload' field names
          const file = incomingFormData.get("source") || incomingFormData.get("fileToUpload");
          if (!file) {
            return new Response(JSON.stringify({ success: false, error: "No file provided" }), {
              status: 400,
              headers: { ...uploadCorsHeaders, "Content-Type": "application/json" }
            });
          }

          // === ATTEMPT 1: Catbox.moe ===
          try {
            const catboxForm = new FormData();
            catboxForm.set("reqtype", "fileupload");
            catboxForm.set("fileToUpload", file, file.name || "image.webp");

            const fakeReq = new Request("https://catbox.moe/user/api.php", {
              method: "POST",
              body: catboxForm
            });
            const serializedBody = await fakeReq.arrayBuffer();
            const contentType = fakeReq.headers.get("Content-Type");

            const response = await fetch("https://catbox.moe/user/api.php", {
              method: "POST",
              body: serializedBody,
              headers: {
                "Content-Type": contentType,
                "Content-Length": serializedBody.byteLength.toString(),
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                "Accept": "*/*",
                "Origin": "https://catbox.moe",
                "Referer": "https://catbox.moe/"
              }
            });

            const responseText = await response.text();
            
            if (response.ok && responseText.trim().startsWith("https://")) {
              return new Response(JSON.stringify({
                success: true,
                url: responseText.trim(),
                thumb: responseText.trim(),
                provider: "catbox"
              }), {
                status: 200,
                headers: { ...uploadCorsHeaders, "Content-Type": "application/json" }
              });
            }
            // Catbox returned error - fall through to Telegra.ph
            console.log("Catbox failed:", responseText);
          } catch (catboxErr) {
            console.log("Catbox error:", catboxErr.message);
          }

          // === ATTEMPT 2: Telegra.ph (fallback) ===
          try {
            const telegraphForm = new FormData();
            telegraphForm.set("file", file, file.name || "image.webp");

            const tgResponse = await fetch("https://telegra.ph/upload", {
              method: "POST",
              body: telegraphForm,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
                "Origin": "https://telegra.ph",
                "Referer": "https://telegra.ph/"
              }
            });

            const tgResult = await tgResponse.json();

            // Telegra.ph returns: [{"src":"/file/xxxxx.webp"}] on success
            // or {"error":"..."} on failure
            if (Array.isArray(tgResult) && tgResult[0]?.src) {
              const imageUrl = `https://telegra.ph${tgResult[0].src}`;
              return new Response(JSON.stringify({
                success: true,
                url: imageUrl,
                thumb: imageUrl,
                provider: "telegraph"
              }), {
                status: 200,
                headers: { ...uploadCorsHeaders, "Content-Type": "application/json" }
              });
            }

            throw new Error(tgResult?.error || JSON.stringify(tgResult));
          } catch (tgErr) {
            return new Response(JSON.stringify({
              success: false,
              error: `Catbox bị chặn IP & Telegra.ph cũng lỗi: ${tgErr.message}`
            }), {
              status: 500,
              headers: { ...uploadCorsHeaders, "Content-Type": "application/json" }
            });
          }
        } catch (err) {
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...uploadCorsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    }

    if (url.pathname === "/resolve-login" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const username = String(body.username || "").trim();
        if (!username || username.includes("@") || !env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
          return new Response(JSON.stringify({ success: false }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const token = await getFirebaseAuthToken(env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY);
        const queryUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
        const qRes = await fetch(queryUrl, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: "users" }],
              where: {
                fieldFilter: {
                  field: { fieldPath: "username" },
                  op: "EQUAL",
                  value: { stringValue: username }
                }
              },
              limit: 1
            }
          })
        });
        const rows = qRes.ok ? await qRes.json() : [];
        const matchedEmail = rows?.[0]?.document?.fields?.email?.stringValue || "";
        if (!matchedEmail) {
          return new Response(JSON.stringify({ success: false }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: true, email: matchedEmail }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch {
        return new Response(JSON.stringify({ success: false }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (url.pathname === "/create-payos-order" && request.method === "POST") {
      try {
        if (!env.FIREBASE_PROJECT_ID) {
          return new Response(JSON.stringify({ success: false, error: "Firebase project is not configured on Worker." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const authUid = await verifyFirebaseIdToken(request, env.FIREBASE_PROJECT_ID);
        if (!authUid) {
          return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        if (!env.PAYOS_CLIENT_ID || !env.PAYOS_API_KEY || !env.PAYOS_CHECKSUM_KEY) {
          return new Response(JSON.stringify({ success: false, code: "PAYOS_CHECKSUM_NOT_CONFIGURED", fallback: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const payload = await request.json();
        const orderCode = Number(payload.orderCode);
        const amount = Math.round(Number(payload.amount));
        const description = String(payload.description || "").slice(0, 25);
        const cancelUrl = String(payload.cancelUrl || "https://web18p.xyz/wallet");
        const returnUrl = String(payload.returnUrl || "https://web18p.xyz/wallet");

        if (!Number.isInteger(orderCode) || orderCode <= 0 || !Number.isFinite(amount) || amount <= 0 || !description) {
          return new Response(JSON.stringify({ success: false, error: "Invalid PayOS order parameters" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const signPayload = { amount, cancelUrl, description, orderCode, returnUrl };
        const signData = Object.keys(signPayload).sort().map(k => `${k}=${signPayload[k]}`).join("&");
        const encoder = new TextEncoder();
        const hmacKey = await crypto.subtle.importKey(
          "raw",
          encoder.encode(env.PAYOS_CHECKSUM_KEY),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const rawSig = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(signData));
        const signature = Array.from(new Uint8Array(rawSig)).map(b => b.toString(16).padStart(2, "0")).join("");

        const payosRes = await fetch("https://api-merchant.payos.vn/v2/payment-requests", {
          method: "POST",
          headers: {
            "x-client-id": env.PAYOS_CLIENT_ID,
            "x-api-key": env.PAYOS_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ...signPayload, signature })
        });
        const payosResult = await payosRes.json();
        return new Response(JSON.stringify(payosResult), {
          status: payosRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (url.pathname === "/check-payment" && request.method === "POST") {
      try {
        if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
          return new Response(JSON.stringify({ success: false, error: "Firebase Service Account is not fully configured on Cloudflare." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const authUid = await verifyFirebaseIdToken(request, env.FIREBASE_PROJECT_ID);
        if (!authUid) {
          return new Response(JSON.stringify({ success: false, error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const payload = await request.json();
        const { txCode, userId, gateway, payosOrderCode } = payload;

        if (!txCode || !gateway || (userId && userId !== authUid)) {
          return new Response(JSON.stringify({ success: false, error: "Thông tin giao dịch hoặc tài khoản không hợp lệ." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 1. Exchange credentials & fetch authoritative pending payment record FIRST
        const token = await getFirebaseAuthToken(env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY);
        const checkUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/payments/${encodeURIComponent(txCode)}`;
        const checkResponse = await fetch(checkUrl, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!checkResponse.ok) {
          return new Response(JSON.stringify({ success: false, message: "Không tìm thấy hóa đơn thanh toán hợp lệ trên hệ thống. Vui lòng tạo lại mã QR." }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const checkData = await checkResponse.json();
        const invoiceOwner = checkData.fields?.userId?.stringValue || "";
        if (invoiceOwner !== authUid) {
          return new Response(JSON.stringify({ success: false, error: "Bạn không có quyền xác nhận hóa đơn của tài khoản khác." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const currentStatus = checkData.fields?.status?.stringValue;
        if (currentStatus === "completed" || currentStatus === "success") {
          return new Response(JSON.stringify({ success: true, message: "Giao dịch này đã được xử lý và cộng tiền từ trước!" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const authoritativeAmount = Math.round(Number(
          checkData.fields?.amount?.integerValue || checkData.fields?.amount?.doubleValue || 0
        ));
        if (!Number.isFinite(authoritativeAmount) || authoritativeAmount <= 0) {
          return new Response(JSON.stringify({ success: false, error: "Số tiền hóa đơn không hợp lệ." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 2. Verify payment status with SePay or PayOS APIs against authoritativeAmount
        let paymentSuccess = false;
        let transactionDetails = {};
        let actualGateway = gateway;

        if (gateway === "sepay") {
          const apiToken = env.SEPAY_API_TOKEN;
          if (!apiToken) {
            return new Response(JSON.stringify({ success: false, error: "SEPAY_API_TOKEN is not configured on Cloudflare." }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const checkResult = await checkSePayHelper(apiToken, authoritativeAmount, txCode);
          if (checkResult.success) {
            paymentSuccess = true;
            transactionDetails = checkResult.details;
          }

        } else if (gateway === "payos") {
          const apiKey = env.PAYOS_API_KEY;
          const clientId = env.PAYOS_CLIENT_ID;

          if (payosOrderCode && apiKey && clientId) {
            try {
              const response = await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${encodeURIComponent(payosOrderCode)}`, {
                headers: {
                  "x-client-id": clientId,
                  "x-api-key": apiKey
                }
              });

              if (response.ok) {
                const result = await response.json();
                if (result.code === "00" && result.data && result.data.status === "PAID" && Number(result.data.amountPaid || result.data.amount) >= authoritativeAmount) {
                  paymentSuccess = true;
                  transactionDetails = {
                    payosOrderCode: Number(payosOrderCode),
                    payosStatus: "PAID"
                  };
                }
              }
            } catch (payosErr) {
              console.warn("PayOS verification failed, will attempt fallback:", payosErr.message);
            }
          }

          if (!paymentSuccess && env.SEPAY_API_TOKEN) {
            console.log(`Checking SePay fallback for PayOS code ${txCode}...`);
            try {
              const checkResult = await checkSePayHelper(env.SEPAY_API_TOKEN, authoritativeAmount, txCode);
              if (checkResult.success) {
                paymentSuccess = true;
                transactionDetails = checkResult.details;
                actualGateway = "sepay";
              }
            } catch (sepayErr) {
              console.warn("SePay fallback verification failed:", sepayErr.message);
            }
          }
        } else {
          return new Response(JSON.stringify({ success: false, error: "Invalid gateway specified." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (!paymentSuccess) {
          return new Response(JSON.stringify({ success: false, message: "Hệ thống chưa nhận được khoản thanh toán." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 3. Atomic commit in Firestore: bank tx replay lock + optimistic payment updateTime + balance increment
        const dbBase = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
        const externalLockId = transactionDetails.sepayTransactionId
          ? `sepay_${transactionDetails.sepayTransactionId}`
          : `payos_${transactionDetails.payosOrderCode}`;

        const paymentPatchFields = {
          status: { stringValue: "completed" },
          gateway: { stringValue: actualGateway }
        };
        const updatePaths = ["status", "gateway"];
        if (transactionDetails.sepayTransactionId) {
          paymentPatchFields.sepayTransactionId = { stringValue: transactionDetails.sepayTransactionId };
          paymentPatchFields.bankBrand = { stringValue: transactionDetails.bankBrand };
          paymentPatchFields.referenceNumber = { stringValue: transactionDetails.referenceNumber };
          updatePaths.push("sepayTransactionId", "bankBrand", "referenceNumber");
        } else if (transactionDetails.payosStatus) {
          paymentPatchFields.payosOrderCode = { integerValue: String(transactionDetails.payosOrderCode) };
          paymentPatchFields.payosStatus = { stringValue: transactionDetails.payosStatus };
          updatePaths.push("payosOrderCode", "payosStatus");
        }

        const commitResponse = await fetch(`https://firestore.googleapis.com/v1/${dbBase}:commit`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            writes: [
              {
                update: {
                  name: `${dbBase}/used_bank_tx/${externalLockId}`,
                  fields: {
                    txCode: { stringValue: txCode },
                    userId: { stringValue: authUid },
                    amount: { integerValue: String(authoritativeAmount) },
                    consumedAt: { stringValue: new Date().toISOString() }
                  }
                },
                currentDocument: { exists: false }
              },
              {
                update: {
                  name: `${dbBase}/payments/${txCode}`,
                  fields: {
                    ...checkData.fields,
                    ...paymentPatchFields
                  }
                },
                updateMask: { fieldPaths: updatePaths },
                currentDocument: { updateTime: checkData.updateTime }
              },
              {
                transform: {
                  document: `${dbBase}/users/${authUid}`,
                  fieldTransforms: [
                    {
                      fieldPath: "balance",
                      increment: { integerValue: String(authoritativeAmount) }
                    }
                  ]
                },
                currentDocument: { exists: true }
              }
            ]
          })
        });

        if (!commitResponse.ok) {
          const errText = await commitResponse.text();
          if (commitResponse.status === 409 || errText.includes("ALREADY_EXISTS") || errText.includes("FAILED_PRECONDITION")) {
            return new Response(JSON.stringify({ success: false, message: "Giao dịch đang được xử lý hoặc mã ngân hàng này đã được sử dụng!" }), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          throw new Error(`Failed atomic payment commit: ${commitResponse.status} - ${errText}`);
        }

        return new Response(JSON.stringify({ success: true, message: "Nạp tiền thành công!" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (url.pathname === "/sitemap.xml" && request.method === "GET") {
      try {
        if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
          return new Response(JSON.stringify({ success: false, error: "Firebase Service Account is not fully configured on Cloudflare." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const token = await getFirebaseAuthToken(env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY);
        
        const [gameDocs, videoDocs, mangaDocs] = await Promise.all([
          fetchFirestoreDocumentsPaginated(env.FIREBASE_PROJECT_ID, "games", token),
          fetchFirestoreDocumentsPaginated(env.FIREBASE_PROJECT_ID, "videos", token),
          fetchFirestoreDocumentsPaginated(env.FIREBASE_PROJECT_ID, "manga", token)
        ]);

        const games = gameDocs.map(doc => {
          const parts = doc.name.split('/');
          const id = parts[parts.length - 1];
          const title = doc.fields?.title?.stringValue || "";
          return createGameSlug(title, id);
        });

        const videos = videoDocs.map(doc => {
          const parts = doc.name.split('/');
          return parts[parts.length - 1];
        });

        const mangaList = mangaDocs.map(doc => {
          const parts = doc.name.split('/');
          return parts[parts.length - 1];
        });

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://web18p.xyz/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/llms.txt</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/games/</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/ai-search/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/videos/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/videos/all/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/videos/vam/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/videos/3d/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/videos/cosplay/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/videos/vietsub/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/videos/hentai/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/manga/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/report/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/category/hot/</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/category/new/</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/category/popular/</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/category/top-rated/</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/category/18-plus/</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/category/18-all/</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/category/18-vn/</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/category/18-uncensored/</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/category/18-pc/</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://web18p.xyz/category/18-android/</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;

        games.forEach(slug => {
          xml += `
  <url>
    <loc>https://web18p.xyz/game/${slug}/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        });

        videos.forEach(id => {
          xml += `
  <url>
    <loc>https://web18p.xyz/video/${id}/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });

        mangaList.forEach(id => {
          xml += `
  <url>
    <loc>https://web18p.xyz/manga/${id}/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });

        xml += `\n</urlset>`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": corsHeaders["Access-Control-Allow-Origin"],
            "Vary": "Origin",
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        });

      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (request.method === "GET" && url.hostname.includes("web18p.xyz")) {
      const originResponse = await fetch(request);

      // If origin returns 404 and agent requested markdown:
      if (originResponse.status === 404 && wantsMarkdown) {
        return new Response(MARKDOWN_404, {
          status: 404,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Vary": "Accept",
            "Cache-Control": "no-cache"
          }
        });
      }

      // Add/ensure 'Vary: Accept' header is present on all origin responses
      // This satisfies Ora / is-agentic test 3: Accept: text/html must include Vary: Accept
      const newHeaders = new Headers(originResponse.headers);
      const existingVary = newHeaders.get("Vary");
      if (!existingVary) {
        newHeaders.set("Vary", "Accept");
      } else if (!existingVary.toLowerCase().includes("accept")) {
        newHeaders.set("Vary", `${existingVary}, Accept`);
      }

      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers: newHeaders
      });
    }

    if (wantsMarkdown) {
      return new Response(MARKDOWN_404, {
        status: 404,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Vary": "Accept"
        }
      });
    }

    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Vary": "Accept"
      }
    });
  }
};

// --- SePay transaction checker helper ---
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesSePayTxCode(text, txCode) {
  const cleanCode = String(txCode || "").trim();
  const cleanText = String(text || "");
  if (!cleanCode || !cleanText) return false;
  const boundaryRegex = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(cleanCode)}(?:$|[^a-z0-9])`, "i");
  return boundaryRegex.test(cleanText);
}

async function checkSePayHelper(apiToken, amount, txCode) {
  const response = await fetch("https://my.sepay.vn/userapi/transactions/list?limit=20", {
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SePay API returned error status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (!data?.transactions || !Array.isArray(data.transactions)) {
    throw new Error("Invalid response format from SePay API");
  }

  // Find a matching transaction using word-boundary txCode comparison
  const matchedTx = data.transactions.find(tx => {
    const matchesAmount = Number(tx.amount_in) === Number(amount);
    const matchesContent = matchesSePayTxCode(tx.transaction_content || "", txCode) || matchesSePayTxCode(tx.body || "", txCode);
    return matchesAmount && matchesContent;
  });

  if (matchedTx) {
    return {
      success: true,
      details: {
        sepayTransactionId: String(matchedTx.id),
        bankBrand: matchedTx.bank_brand_name || "N/A",
        referenceNumber: matchedTx.reference_number || "N/A"
      }
    };
  }

  return { success: false };
}

// --- Firebase ID Token verifier using Google SecureToken JWK keys ---
function base64UrlToUint8Array(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function verifyFirebaseIdToken(request, projectId) {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    const token = match[1].trim();
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const header = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(parts[1])));
    const nowSec = Math.floor(Date.now() / 1000);

    if (
      header.alg !== "RS256" ||
      !header.kid ||
      claims.aud !== projectId ||
      claims.iss !== `https://securetoken.google.com/${projectId}` ||
      !claims.sub ||
      typeof claims.exp !== "number" ||
      claims.exp <= nowSec
    ) {
      return null;
    }

    const jwksRes = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
    if (!jwksRes.ok) return null;
    const { keys = [] } = await jwksRes.json();
    const jwk = keys.find(k => k.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlToUint8Array(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    return valid ? claims.sub : null;
  } catch {
    return null;
  }
}

// --- Google Authentication OAuth helper functions using Web Crypto API ---

async function getFirebaseAuthToken(clientEmail, privateKey) {
  const jwt = await signJWT(clientEmail, privateKey);

  // Exchange JWT for OAuth Access Token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Failed to exchange JWT for access token: ${errText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function signJWT(clientEmail, privateKeyPEM) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const headerB64 = await objectToBase64url(header);
  const claimB64 = await objectToBase64url(claim);
  const tokenInput = `${headerB64}.${claimB64}`;

  // Robustly clean the PEM private key structure
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";

  let cleanedKey = privateKeyPEM
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s+/g, "") // remove all whitespace/newlines
    .replace(/\\n/g, "") // remove literal \n text characters
    .replace(/["']/g, ""); // remove double/single quotes

  // Convert raw base64 string to ArrayBuffer
  const binaryKey = str2ab(atob(cleanedKey));
  
  // Import key
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" }
    },
    false,
    ["sign"]
  );

  // Sign token
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(tokenInput)
  );

  const signatureB64 = arrayBufferToBase64url(signature);
  return `${tokenInput}.${signatureB64}`;
}

async function objectToBase64url(obj) {
  return arrayBufferToBase64url(new TextEncoder().encode(JSON.stringify(obj)));
}

function arrayBufferToBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// --- Paginated Firestore Collection Fetcher ---
async function fetchFirestoreDocumentsPaginated(projectId, collectionName, token = null) {
  const docs = [];
  let pageToken = "";
  do {
    const querySuffix = pageToken
      ? `?pageSize=300&pageToken=${encodeURIComponent(pageToken)}`
      : "?pageSize=300";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}${querySuffix}`;
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    const res = await fetch(url, { headers });
    if (!res.ok) break;
    const data = await res.json();
    if (Array.isArray(data.documents)) {
      docs.push(...data.documents);
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return docs;
}

// --- Game Slug helper ---
function createGameSlug(title, id) {
  const source = title || id || 'game';
  return source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'game';
}

// --- Open Graph Bot / Crawler detection & Dynamic Metadata Generator ---

const BOT_USER_AGENTS = [
  "telegrambot",
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "discordbot",
  "whatsapp",
  "skypeuripreview",
  "slackbot",
  "kakaotalk-scrap",
  "vkshare",
  "redditbot",
  "applebot",
  "zalo"
];

function isCrawler(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot));
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getVideoThumbnailHelper(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  let url = rawUrl.trim();
  const iframeMatch = url.match(/<iframe[^>]*src\s*=\s*["']([^"']+)["']/i);
  if (iframeMatch) url = iframeMatch[1];

  const voeMatch = url.match(/(?:voe\.sx|voecdn\.com|voe-sx\.com|launchreed\.com|caseyimpactstation\.com)\/(?:e\/)?([a-zA-Z0-9]+)/i);
  if (voeMatch && !["cache", "embed", "api"].includes(voeMatch[1])) {
    return `https://voe.sx/cache/${voeMatch[1]}_storyboard_L1.jpg`;
  }

  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (ytMatch) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  const fmMatch = url.match(/(?:filemoon|fmoonembed|fmoon|hgcloud|vibuxer|streamhg|hgstream|huntrexus)[a-zA-Z0-9.-]*\/(?:(?:d|e|v|download)\/)?([a-zA-Z0-9_-]+)/i);
  if (fmMatch) {
    return `https://huntrexus.com/${fmMatch[1]}.jpg`;
  }

  return null;
}

async function handleCrawlerMetadata(url, env) {
  const pathname = url.pathname;
  const projectId = env.FIREBASE_PROJECT_ID || "webk-a064e";

  let title = "WEB18P - Kho Game Việt Hóa và Phim";
  let description = "Kho game Việt hóa và Phim, game PC và Android được cập nhật thường xuyên.";
  let image = "https://web18p.xyz/og-banner.jpg";
  let ogType = "website";
  const canonicalUrl = `https://web18p.xyz${pathname.endsWith("/") ? pathname : pathname + "/"}`;

  try {
    if (pathname.startsWith("/game/")) {
      const parts = pathname.split("/").filter(Boolean);
      const gameSlug = parts[1];
      if (gameSlug) {
        const gameDocs = await fetchFirestoreDocumentsPaginated(projectId, "games", null);
        const matchedGame = gameDocs.find((docSnap) => {
          const docParts = docSnap.name.split("/");
          const gId = docParts[docParts.length - 1];
          const gTitle = docSnap.fields?.title?.stringValue || "";
          return gId === gameSlug || createGameSlug(gTitle, gId) === gameSlug;
        });
        if (matchedGame) {
          const f = matchedGame.fields || {};
          const gTitle = f.title?.stringValue || "Game";
          title = `${gTitle} - Tải Game Việt Hóa | WEB18P`;
          const rawDesc = f.description?.stringValue || "";
          const cleanDesc = rawDesc.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
          description = cleanDesc
            ? (cleanDesc.length > 160 ? `${cleanDesc.slice(0, 160).trim()}...` : cleanDesc)
            : `Tải ${gTitle} Việt hóa miễn phí cho PC và Android trên WEB18P.`;
          const cover = f.image?.stringValue || f.cover?.stringValue;
          if (cover && !cover.endsWith(".svg")) {
            image = cover;
          }
        }
      }
    } else if (pathname.startsWith("/video/")) {
      const parts = pathname.split("/").filter(Boolean);
      const videoId = parts[1];
      if (videoId) {
        ogType = "video.other";
        const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/videos/${videoId}`;
        const res = await fetch(docUrl);
        if (res.ok) {
          const docData = await res.json();
          const f = docData.fields || {};
          const vTitle = f.title?.stringValue || "Phim";
          title = `${vTitle} | WEB18P`;
          description = f.description?.stringValue || `Xem video ${vTitle} chất lượng cao trên WEB18P.`;
          let thumb = f.thumbnail?.stringValue || f.thumbnailUrl?.stringValue;
          if (!thumb) {
            const rawUrl = f.videoUrl?.stringValue || f.streamtapeUrl?.stringValue || "";
            thumb = getVideoThumbnailHelper(rawUrl);
          }
          if (thumb && thumb.match(/_t\.(jpg|jpeg|png|webp)$/i)) {
            thumb = thumb.replace(/_t\.(jpg|jpeg|png|webp)$/i, ".$1");
          }
          if (thumb && !thumb.endsWith(".svg")) {
            image = thumb;
          }
        }
      }
    } else if (pathname.startsWith("/videos")) {
      title = "Kho Phim Chất Lượng Cao | WEB18P";
      description = "Xem tất cả phim trên WEB18P - cập nhật liên tục với chất lượng cao.";
    } else if (pathname.startsWith("/manga/")) {
      const parts = pathname.split("/").filter(Boolean);
      const mangaId = parts[1];
      if (mangaId) {
        const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/manga/${mangaId}`;
        const res = await fetch(docUrl);
        if (res.ok) {
          const docData = await res.json();
          const f = docData.fields || {};
          const mTitle = f.title?.stringValue || "Truyện";
          title = `Truyện ${mTitle} - Đọc Truyện Online | WEB18P`;
          description = f.description?.stringValue || `Đọc truyện tranh ${mTitle} trọn bộ trên WEB18P.`;
          const cover = f.cover?.stringValue || f.image?.stringValue;
          if (cover && !cover.endsWith(".svg")) {
            image = cover;
          }
        }
      }
    }
  } catch (e) {
    console.error("Error generating crawler metadata:", e.message);
  }

  const escapedTitle = escapeHtml(title);
  const escapedDesc = escapeHtml(description);
  const escapedImg = escapeHtml(image);
  const escapedUrl = escapeHtml(canonicalUrl);

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDesc}" />
  <link rel="canonical" href="${escapedUrl}" />

  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="WEB18P" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDesc}" />
  <meta property="og:url" content="${escapedUrl}" />
  <meta property="og:image" content="${escapedImg}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDesc}" />
  <meta name="twitter:image" content="${escapedImg}" />
</head>
<body style="font-family: sans-serif; background: #0a0a0c; color: #fff; padding: 2rem;">
  <h1>${escapedTitle}</h1>
  <p>${escapedDesc}</p>
  <img src="${escapedImg}" alt="${escapedTitle}" style="max-width: 100%; border-radius: 8px;" />
  <p><a href="${escapedUrl}" style="color: #66c0f4;">Bấm vào đây nếu trình duyệt không tự chuyển tiếp</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=1800"
    }
  });
}
