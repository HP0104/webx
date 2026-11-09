import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const PREVIEW_PORT = 4173;
const CDP_PORT = 9222;
const BASE_URL = `http://localhost:${PREVIEW_PORT}`;
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.errors = [];
    this.consoleErrors = [];
    this.failedRequests = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.callbacks.has(msg.id)) {
            const cb = this.callbacks.get(msg.id);
            this.callbacks.delete(msg.id);
            if (msg.error) cb.reject(new Error(msg.error.message));
            else cb.resolve(msg.result);
          } else if (msg.method) {
            this.handleEvent(msg.method, msg.params);
          }
        } catch (e) {
          console.error("WS Parse Error:", e);
        }
      };
    });
  }

  handleEvent(method, params) {
    if (method === 'Runtime.exceptionThrown') {
      const desc = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || 'Unknown JS Exception';
      this.errors.push(desc);
    } else if (method === 'Runtime.consoleAPICalled' && params.type === 'error') {
      const text = params.args?.map(a => a.value || a.description || '').join(' ') || '';
      // Ignore normal third-party ad blocking or analytics warnings
      if (!text.includes('ad-provider') && !text.includes('magsrv') && !text.includes('favicon')) {
        this.consoleErrors.push(text);
      }
    } else if (method === 'Network.responseReceived') {
      const res = params.response;
      if (res.status >= 400 && res.url.startsWith(BASE_URL)) {
        this.failedRequests.push(`${res.status} ${res.url}`);
      }
    }
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  clearLogs() {
    this.errors = [];
    this.consoleErrors = [];
    this.failedRequests = [];
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runTestSuite() {
  console.log("=================================================");
  console.log("🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN TÍNH NĂNG WEB18P");
  console.log("=================================================\n");

  // 1. Khởi chạy Vite preview
  console.log(`[1/4] Khởi chạy máy chủ thử nghiệm trên cổng ${PREVIEW_PORT}...`);
  const previewProcess = spawn('npx.cmd', ['vite', 'preview', '--port', String(PREVIEW_PORT)], {
    shell: true,
    stdio: 'ignore'
  });

  // Đợi server sẵn sàng
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {}
    await sleep(400);
  }

  if (!serverReady) {
    console.error("❌ Không thể kết nối tới Vite preview server!");
    previewProcess.kill();
    process.exit(1);
  }
  console.log("✅ Máy chủ thử nghiệm đã sẵn sàng.\n");

  // 2. Khởi chạy Microsoft Edge Headless với cổng CDP
  console.log(`[2/4] Khởi chạy trình duyệt Edge Headless trên cổng CDP ${CDP_PORT}...`);
  const edgeProcess = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1440,900',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + process.env.TEMP + '\\edge_test_profile_' + Date.now(),
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl = '';
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const pageTarget = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
        if (pageTarget) {
          wsUrl = pageTarget.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}
    await sleep(400);
  }

  if (!wsUrl) {
    console.error("❌ Không lấy được WebSocket URL từ Edge CDP!");
    edgeProcess.kill();
    previewProcess.kill();
    process.exit(1);
  }
  console.log("✅ Trình duyệt Edge đã kết nối thành công qua CDP.\n");

  // 3. Kết nối WebSocket CDP
  const cdp = new SimpleCDP(wsUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  console.log("[3/4] Bắt đầu duyệt kiểm thử từng tính năng & luồng người dùng...\n");

  const results = [];

  const testCases = [
    {
      name: "Trang Chủ (Home)",
      path: "/",
      check: async () => {
        const title = await cdp.evaluate('document.title');
        const heroExists = await cdp.evaluate('Boolean(document.querySelector(".navbar, .nav-container"))');
        const cardsCount = await cdp.evaluate('document.querySelectorAll(".game-card, .video-card-item, a[href*=\'/game/\']").length');
        return {
          pass: title.includes("WEB18P") && heroExists,
          details: `Title: "${title}", tìm thấy ${cardsCount} thẻ nội dung`
        };
      }
    },
    {
      name: "Tìm Kiếm Tức Thì (Live Navbar Search)",
      path: "/",
      check: async () => {
        // Gõ vào ô tìm kiếm qua setter native của React
        await cdp.evaluate(`
          (() => {
            const input = document.querySelector('input[placeholder*="Tìm"]');
            if (input) {
              input.focus();
              const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (nativeSetter) {
                nativeSetter.call(input, "sex");
              } else {
                input.value = "sex";
              }
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          })()
        `);
        await sleep(1000);
        const suggestionVisible = await cdp.evaluate('Boolean(document.querySelector(".nav-search-suggestions"))');
        return {
          pass: suggestionVisible,
          details: suggestionVisible ? "Khung gợi ý tìm kiếm mở mượt mà" : "Không thấy gợi ý tìm kiếm"
        };
      }
    },
    {
      name: "Kho Game Việt Hóa (/games)",
      path: "/games",
      check: async () => {
        const title = await cdp.evaluate('document.title');
        const gameItems = await cdp.evaluate('document.querySelectorAll(".game-card, .card").length');
        return {
          pass: title.includes("Trò Chơi") || title.includes("Kho Game") || title.includes("WEB18P"),
          details: `Title: "${title}", ${gameItems} cards`
        };
      }
    },
    {
      name: "Chi Tiết Game & Nút Mua/Tải (/game/...)",
      path: "/game/freshman-project-sex",
      check: async () => {
        const title = await cdp.evaluate('document.title');
        const buyButton = await cdp.evaluate('Boolean(document.querySelector(".detail-buy-panel button, .detail-buy-panel a"))');
        const notFound = await cdp.evaluate('document.body.innerText.includes("Không tìm thấy game!")');
        return {
          pass: buyButton && !notFound,
          details: buyButton ? "Panel mua/tải game hiển thị đầy đủ" : "Thiếu panel mua/tải"
        };
      }
    },
    {
      name: "Kho Phim & Video (/videos/all)",
      path: "/videos/all",
      check: async () => {
        const title = await cdp.evaluate('document.title');
        const videoCards = await cdp.evaluate('document.querySelectorAll(".video-card-item, a[href*=\'/video/\']").length');
        return {
          pass: title.includes("Phim") || title.includes("WEB18P"),
          details: `Tìm thấy ${videoCards} video trong danh mục`
        };
      }
    },
    {
      name: "Trang Xem Phim (/video/1783264708316)",
      path: "/video/1783264708316",
      check: async () => {
        const title = await cdp.evaluate('document.title');
        const playerExists = await cdp.evaluate('Boolean(document.querySelector(".video-detail-player, iframe, video, .video-player-overlay"))');
        const notFoundGlitch = await cdp.evaluate('document.body.innerText.includes("Không tìm thấy video")');
        const serverButtons = await cdp.evaluate('document.querySelectorAll(".video-server-btn").length');
        return {
          pass: playerExists && !notFoundGlitch,
          details: `Khung phát video sẵn sàng, ${serverButtons} nút máy chủ phát`
        };
      }
    },
    {
      name: "Kho Truyện Tranh (/manga)",
      path: "/manga",
      check: async () => {
        const title = await cdp.evaluate('document.title');
        const mangaCards = await cdp.evaluate('document.querySelectorAll("a[href*=\'/manga/\']").length');
        return {
          pass: title.includes("Truyện") || title.includes("WEB18P"),
          details: `Title: "${title}", tìm thấy ${mangaCards} link truyện`
        };
      }
    },
    {
      name: "Chi Tiết Truyện (/manga/1788253638453)",
      path: "/manga/1788253638453",
      check: async () => {
        const chapterList = await cdp.evaluate('Boolean(document.querySelector("a[href*=\'/chapter/\']"))');
        return {
          pass: chapterList,
          details: chapterList ? "Danh sách chương truyện tải đầy đủ" : "Chưa tìm thấy danh sách chương"
        };
      }
    },
    {
      name: "Đọc Truyện Tranh (/manga/.../chapter/...)",
      path: "/manga/1791559799510/chapter/chap-1",
      check: async () => {
        const readerExists = await cdp.evaluate('Boolean(document.querySelector(".manga-reader, .manga-reader-images"))');
        const notFoundGlitch = await cdp.evaluate('document.body.innerText.includes("Không tìm thấy chương")');
        return {
          pass: readerExists && !notFoundGlitch,
          details: readerExists ? "Trình đọc truyện dọc mượt mà" : "Lỗi không tìm thấy chương"
        };
      }
    },
    {
      name: "Trang Đăng Nhập / Đăng Ký (/auth)",
      path: "/auth",
      check: async () => {
        const formExists = await cdp.evaluate('Boolean(document.querySelector("form input[type=\'password\'], form input[type=\'text\']"))');
        return {
          pass: formExists,
          details: formExists ? "Form xác thực sẵn sàng" : "Thiếu form đăng nhập"
        };
      }
    },
    {
      name: "Trang Ví & Nạp Tiền (/wallet)",
      path: "/wallet",
      check: async () => {
        // Chưa đăng nhập -> redirect sang /auth
        const currentUrl = await cdp.evaluate('window.location.pathname');
        return {
          pass: currentUrl === '/auth' || currentUrl === '/wallet',
          details: `Điều hướng an toàn: ${currentUrl}`
        };
      }
    },
    {
      name: "Tìm Kiếm Game Bằng AI (/ai-search)",
      path: "/ai-search",
      check: async () => {
        const title = await cdp.evaluate('document.title');
        const inputExists = await cdp.evaluate('Boolean(document.querySelector("input"))');
        return {
          pass: inputExists,
          details: `Giao diện tìm kiếm AI: ${inputExists ? 'OK' : 'FAIL'}`
        };
      }
    },
    {
      name: "Trang Về Chúng Tôi (/about)",
      path: "/about",
      check: async () => {
        const textLen = await cdp.evaluate('document.body.innerText.length');
        return {
          pass: textLen > 300,
          details: `Độ dài nội dung: ${textLen} ký tự`
        };
      }
    },
    {
      name: "Trang Liên Hệ (/contact)",
      path: "/contact",
      check: async () => {
        const hasEmail = await cdp.evaluate('document.body.innerText.includes("contact@web18p.xyz")');
        return {
          pass: hasEmail,
          details: hasEmail ? "Có email liên hệ chính thức" : "Thiếu email"
        };
      }
    },
    {
      name: "Trang Chính Sách Riêng Tư (/privacy)",
      path: "/privacy",
      check: async () => {
        const hasPrivacy = await cdp.evaluate('document.body.innerText.includes("Chính Sách") || document.body.innerText.includes("Quyền Riêng Tư")');
        return {
          pass: hasPrivacy,
          details: hasPrivacy ? "Chính sách quyền riêng tư hiển thị chuẩn" : "Thiếu nội dung"
        };
      }
    },
    {
      name: "Trang 404 Not Found (/some-invalid-path-404)",
      path: "/some-invalid-path-404",
      check: async () => {
        const is404 = await cdp.evaluate('document.body.innerText.includes("404") || document.body.innerText.includes("Không tìm thấy")');
        return {
          pass: is404,
          details: is404 ? "Trang 404 thân thiện người dùng & Agent" : "Không hiển thị 404"
        };
      }
    }
  ];

  for (const tc of testCases) {
    cdp.clearLogs();
    const url = `${BASE_URL}${tc.path}`;
    await cdp.send('Page.navigate', { url });

    // Đợi page nạp và render React
    await sleep(2000);

    let checkResult = { pass: false, details: "" };
    try {
      checkResult = await tc.check();
    } catch (e) {
      checkResult = { pass: false, details: `Lỗi kiểm tra: ${e.message}` };
    }

    const hasErrors = cdp.errors.length > 0;
    const finalPass = checkResult.pass && !hasErrors;

    results.push({
      name: tc.name,
      path: tc.path,
      pass: finalPass,
      details: checkResult.details,
      jsErrors: [...cdp.errors],
      consoleErrors: [...cdp.consoleErrors]
    });

    const statusSymbol = finalPass ? "✅ PASS" : "❌ FAIL";
    console.log(`${statusSymbol} | ${tc.name.padEnd(35)} | ${checkResult.details}`);
    if (cdp.errors.length > 0) {
      console.log(`     ⚠️ JS Crash: ${cdp.errors.join(' | ')}`);
    }
  }

  // 4. Tổng kết
  console.log("\n=================================================");
  console.log("[4/4] BÁO CÁO KẾT QUẢ KIỂM THỬ TOÀN DIỆN:");
  console.log("=================================================");
  const passedCount = results.filter(r => r.pass).length;
  const failedCount = results.filter(r => !r.pass).length;
  console.log(`Tổng số ca kiểm thử: ${results.length}`);
  console.log(`Thành công: ${passedCount}/${results.length}`);
  console.log(`Thất bại: ${failedCount}/${results.length}`);

  if (failedCount === 0) {
    console.log("\n🎉 TẤT CẢ TÍNH NĂNG HOẠT ĐỘNG HOÀN HẢO! KHÔNG CÓ RUNTIME CRASH NÀO!");
  } else {
    console.log("\n⚠️ CÁC ĐIỂM CẦN XỬ LÝ:");
    results.filter(r => !r.pass).forEach(r => {
      console.log(`- ${r.name} (${r.path}): ${r.details}`);
      if (r.jsErrors.length) console.log(`  JS Exception: ${r.jsErrors.join('; ')}`);
    });
  }

  // Dọn dẹp process
  cdp.close();
  try { edgeProcess.kill(); } catch {}
  try { previewProcess.kill(); } catch {}
  process.exit(failedCount === 0 ? 0 : 1);
}

runTestSuite().catch(err => {
  console.error("Test runner encountered fatal error:", err);
  process.exit(1);
});
