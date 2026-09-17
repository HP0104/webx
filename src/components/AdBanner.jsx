import { useEffect, useRef, useState, useCallback } from 'react';

const EXOCLICK_PROVIDER_SRC = 'https://a.magsrv.com/ad-provider.js';
const EXOCLICK_SCRIPT_ID = 'exoclick-ad-provider';
const EXOCLICK_FILL_CHECK_DELAY = 2000;
const ADBLOCK_DETECT_DELAY = 3000;

// ─── Ad Blocker Detection ───────────────────────────────────────────

function checkScriptLoad(src, validationFn = null) {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.style.display = 'none';

    let resolved = false;
    const done = (blocked) => {
      if (resolved) return;
      resolved = true;
      script.remove();
      resolve(blocked);
    };

    script.onerror = () => done(true);
    script.onload = () => {
      if (validationFn) {
        // If validation fails, it means the script loaded but didn't execute properly
        // (likely a spoofed empty 200 OK response from the adblocker)
        done(!validationFn());
      } else {
        done(false);
      }
    };

    document.head.appendChild(script);
    setTimeout(() => done(true), ADBLOCK_DETECT_DELAY);
  });
}

async function detectAdBlocker() {
  // Helper: check if an element is hidden/collapsed by adblocker
  function isElementBlocked(el) {
    if (!document.body.contains(el)) return true;
    const style = window.getComputedStyle(el);
    return (
      el.offsetParent === null ||
      el.offsetHeight === 0 ||
      el.offsetWidth === 0 ||
      el.clientHeight === 0 ||
      el.clientWidth === 0 ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0' ||
      el.getBoundingClientRect().height === 0
    );
  }

  // ── Check 1: Classic DOM bait (catches uBlock, ABP) ──
  const checkClassicDOM = () => new Promise((resolve) => {
    const bait = document.createElement('div');
    bait.className = 'ad-banner adsbox doubleclick ad ads ad-placement ad-placeholder sponsor ad-container ad-wrapper pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links';
    bait.id = 'adsense';
    Object.assign(bait.style, {
      position: 'absolute', top: '-9999px', left: '-9999px',
      width: '10px', height: '10px', display: 'block',
    });
    document.body.appendChild(bait);

    setTimeout(() => {
      const blocked = isElementBlocked(bait);
      bait.remove();
      resolve(blocked);
    }, 300);
  });

  // ── Check 2: Google AdSense <ins> element (catches Cốc Cốc) ──
  // Cốc Cốc's adblocker specifically targets AdSense ins elements and collapses them
  const checkAdSenseIns = () => new Promise((resolve) => {
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.setAttribute('data-ad-client', 'ca-pub-1234567890123456');
    ins.setAttribute('data-ad-slot', '1234567890');
    Object.assign(ins.style, {
      display: 'block', width: '300px', height: '250px',
      position: 'absolute', top: '-9999px', left: '-9999px',
      overflow: 'hidden',
    });
    document.body.appendChild(ins);

    setTimeout(() => {
      const blocked = isElementBlocked(ins);
      ins.remove();
      resolve(blocked);
    }, 500);
  });

  // ── Check 3: ExoClick ad slot (catches Cốc Cốc targeting ExoClick) ──
  const checkExoClickSlot = () => new Promise((resolve) => {
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute', top: '-9999px', left: '-9999px',
      width: '728px', height: '90px', overflow: 'hidden',
    });
    const ins = document.createElement('ins');
    ins.className = 'eas6a97888e38';
    ins.setAttribute('data-zoneid', '5983796');
    Object.assign(ins.style, { display: 'block', width: '728px', height: '90px' });
    container.appendChild(ins);
    document.body.appendChild(container);

    setTimeout(() => {
      const blocked = isElementBlocked(ins) || isElementBlocked(container);
      container.remove();
      resolve(blocked);
    }, 500);
  });

  // ── Check 4: Google Ad iframe (Cốc Cốc blocks googlesyndication at frame level) ──
  const checkGoogleAdFrame = () => new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    iframe.setAttribute('name', 'google_ads_iframe');
    Object.assign(iframe.style, {
      width: '1px', height: '1px', position: 'absolute',
      top: '-9999px', left: '-9999px', visibility: 'hidden',
    });

    let settled = false;
    const done = (blocked) => {
      if (settled) return;
      settled = true;
      iframe.remove();
      resolve(blocked);
    };

    iframe.onerror = () => done(true);
    iframe.onload = () => {
      // Even if onload fires, check if the iframe was actually blocked/empty
      setTimeout(() => {
        try {
          // If blocked, accessing contentWindow or its content will fail or be empty
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!doc || !doc.body || doc.body.innerHTML.length < 10) {
            done(true);
          } else {
            done(false);
          }
        } catch {
          // Cross-origin = loaded successfully (not blocked)
          done(false);
        }
      }, 200);
    };

    document.body.appendChild(iframe);
    setTimeout(() => done(true), ADBLOCK_DETECT_DELAY);
  });

  // ── Check 5: Ad pixel image (tracking pixel from known ad domains) ──
  const checkAdPixel = () => new Promise((resolve) => {
    const img = document.createElement('img');
    img.style.position = 'absolute';
    img.style.top = '-9999px';
    img.style.left = '-9999px';
    img.style.width = '1px';
    img.style.height = '1px';

    let settled = false;
    const done = (blocked) => {
      if (settled) return;
      settled = true;
      img.remove();
      resolve(blocked);
    };

    // Use a doubleclick pixel URL — most adblockers block *.doubleclick.net
    img.src = 'https://ad.doubleclick.net/favicon.ico?t=' + Date.now();
    img.onerror = () => done(true);
    img.onload = () => done(false);
    document.body.appendChild(img);

    setTimeout(() => done(true), ADBLOCK_DETECT_DELAY);
  });

  // ── Check 6: Fetch with redirect-based detection ──
  // Cốc Cốc may allow no-cors fetches to succeed (opaque responses),
  // so we use 'cors' mode which will fail if blocked or if CORS is denied
  const checkFetch = async () => {
    try {
      // This specific URL is on nearly every filter list
      const resp = await fetch(
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
        { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }
      );
      // Even if fetch succeeds with opaque response, check if the response type indicates blocking
      // Some blockers return a successful response but with type 'opaque' and zero-length body
      // Additional heuristic: try a second ad domain
      await fetch(
        'https://ad.doubleclick.net/favicon.ico',
        { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }
      );
      return false;
    } catch {
      return true;
    }
  };

  // ── Check 7: Popup blocker hook detection ──
  const checkPopupHook = () => {
    try {
      return window.open.toString().indexOf('[native code]') === -1;
    } catch {
      return false;
    }
  };

  // ── Check 8: First-party bait script ──
  const checkBaitScript = () =>
    checkScriptLoad('/ads.js', () => window.__adblockerBait === true);

  // ── Check 9: Dynamic script load from ad domains ──
  const checkAdScriptLoad = () =>
    checkScriptLoad(EXOCLICK_PROVIDER_SRC);

  // ── Run all checks in parallel, return true if ANY detects blocking ──
  // Group into "fast" (DOM-based, ~300-500ms) and "slow" (network-based, ~1-3s)
  // If fast checks detect, return immediately without waiting for slow ones
  const fastChecks = Promise.all([
    checkClassicDOM(),
    checkAdSenseIns(),
    checkExoClickSlot(),
  ]);

  const fastResult = await fastChecks;
  if (fastResult.some(Boolean)) return true;

  // If fast checks all passed, run slower network/pixel checks
  if (checkPopupHook()) return true;

  const slowChecks = await Promise.all([
    checkGoogleAdFrame(),
    checkAdPixel(),
    checkFetch(),
    checkBaitScript(),
    checkAdScriptLoad(),
  ]);
  return slowChecks.some(Boolean);
}

let _adBlockDetected = null;
async function isAdBlockActive() {
  if (_adBlockDetected !== null) return _adBlockDetected;
  _adBlockDetected = await detectAdBlocker();
  return _adBlockDetected;
}

function resetAdBlockCache() {
  _adBlockDetected = null;
}

// ─── ExoClick Helpers ───────────────────────────────────────────────

function serveExoClickAd() {
  window.AdProvider = window.AdProvider || [];
  window.AdProvider.push({ serve: {} });
}

function ensureExoClickProvider({ forceReload = false } = {}) {
  // Nếu đang có một Promise tải/tải lại script đang thực hiện, luôn chia sẻ Promise đó
  // để tránh việc các banner gỡ script của nhau khi gọi đồng thời
  if (window.__exoClickProviderPromise) {
    return window.__exoClickProviderPromise;
  }

  const existingScript = document.getElementById(EXOCLICK_SCRIPT_ID);

  if (existingScript?.dataset.loaded === 'true' && typeof window.AdProvider !== 'undefined' && !forceReload) {
    return Promise.resolve(existingScript);
  }

  if (existingScript) {
    existingScript.remove();
  }

  const script = document.createElement('script');
  script.id = EXOCLICK_SCRIPT_ID;
  script.async = true;
  script.type = 'application/javascript';
  script.src = EXOCLICK_PROVIDER_SRC;

  window.__exoClickProviderPromise = new Promise((resolve, reject) => {
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      window.__exoClickProviderPromise = null;
      resolve(script);
    });
    script.addEventListener('error', () => {
      script.dataset.error = 'true';
      window.__exoClickProviderPromise = null;
      reject(new Error('ExoClick provider failed to load'));
    });
  });

  document.head.appendChild(script);
  return window.__exoClickProviderPromise;
}

function getExoClickZones(config) {
  if (Array.isArray(config?.zones)) {
    return config.zones.filter(Boolean);
  }
  return config?.zoneId ? [config.zoneId] : [];
}

// ─── AdBlock Wall (Lớp 3 — Overlay toàn trang) ─────────────────────
// Chặn truy cập web cho đến khi user tắt ad blocker.
// Đặt component này ở App.jsx, bên ngoài mọi nội dung.

export function AdBlockWall() {
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const wallRef = useRef(null);

  const checkAdBlock = useCallback(async () => {
    setChecking(true);
    resetAdBlockCache();
    const result = await isAdBlockActive();
    setBlocked(result);
    setChecking(false);
  }, []);

  useEffect(() => {
    checkAdBlock();
  }, [checkAdBlock]);

  useEffect(() => {
    if (blocked && !checking) {
      // Block body scrolling
      document.body.style.setProperty('overflow', 'hidden', 'important');
      
      // Prevent Element Zapper / DevTools bypass
      const interval = setInterval(() => {
        if (wallRef.current && !document.body.contains(wallRef.current)) {
          window.location.reload();
        } else if (wallRef.current) {
          const style = window.getComputedStyle(wallRef.current);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            window.location.reload();
          }
        }
      }, 1000);

      return () => {
        clearInterval(interval);
        document.body.style.removeProperty('overflow');
      };
    }
  }, [blocked, checking]);

  // Không bị chặn hoặc đang kiểm tra lần đầu → không hiện gì
  if (!blocked || checking) return null;

  return (
    <div 
      ref={wallRef}
      style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2147483647,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem', // Giảm padding ngoài cho mobile
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
        borderRadius: '20px',
        padding: '2rem 1.5rem', // Tối ưu padding trong cho mobile
        maxWidth: '480px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxSizing: 'border-box',
        textAlign: 'center',
        border: '1px solid rgba(255, 183, 77, 0.2)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 183, 77, 0.05)',
        animation: 'adwall-fadein 0.4s ease-out',
      }}>
        {/* Icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255, 183, 77, 0.15), rgba(255, 152, 0, 0.08))',
          border: '2px solid rgba(255, 183, 77, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2rem',
        }}>
          🛡️
        </div>

        {/* Tiêu đề */}
        <h2 style={{
          color: '#fff',
          fontSize: '1.3rem',
          fontWeight: 700,
          margin: '0 0 0.75rem',
          lineHeight: 1.3,
        }}>
          Vui lòng tắt trình chặn quảng cáo
        </h2>

        {/* Nội dung */}
        <p style={{
          color: 'rgba(255, 255, 255, 0.65)',
          fontSize: '0.9rem',
          lineHeight: 1.6,
          margin: '0 0 0.5rem',
        }}>
          Chúng tôi hiểu rằng quảng cáo đôi khi gây phiền. Tuy nhiên, <strong style={{ color: 'rgba(255, 255, 255, 0.85)' }}>doanh thu từ quảng cáo là nguồn duy nhất</strong> giúp chúng tôi duy trì máy chủ và cập nhật nội dung mới.
        </p>

        <p style={{
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '0.82rem',
          lineHeight: 1.5,
          margin: '0 0 2rem',
        }}>
          Hãy tắt Ad Blocker (uBlock Origin, AdBlock Plus, v.v.) rồi nhấn nút bên dưới để tiếp tục truy cập. Cảm ơn bạn đã ủng hộ! 💚
        </p>

        {/* Hướng dẫn nhanh */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          padding: '1rem 1.2rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          textAlign: 'left',
        }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.45)',
            fontSize: '0.72rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 0.6rem',
          }}>
            Cách tắt nhanh
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              '1. Nhấn vào icon Ad Blocker trên thanh trình duyệt',
              '2. Chọn "Tạm dừng" hoặc "Tắt cho trang này"',
              '3. Quay lại đây và nhấn nút "Tôi đã tắt"',
            ].map((step, i) => (
              <span key={i} style={{
                color: 'rgba(255, 255, 255, 0.55)',
                fontSize: '0.78rem',
                lineHeight: 1.5,
              }}>
                {step}
              </span>
            ))}
          </div>
        </div>

        {/* Nút kiểm tra lại */}
        <button
          onClick={() => {
            window.location.reload();
          }}
          style={{
            width: '100%',
            padding: '0.85rem 1.5rem',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #ffb74d, #ff9800)',
            color: '#1a1a2e',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            transform: 'scale(1)',
            letterSpacing: '0.3px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ✅ Tôi đã tắt Ad Blocker (Tải lại trang)
        </button>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes adwall-fadein {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── ExoClick Ad Banner (Lớp 1) ────────────────────────────────────

function ExoClickAdBanner({ config }) {
  const containerRef = useRef(null);
  const [adState, setAdState] = useState('loading');
  const zones = getExoClickZones(config);
  const zoneKey = zones.join(',');

  useEffect(() => {
    if (!zoneKey) return undefined;

    let cancelled = false;

    ensureExoClickProvider({ forceReload: typeof window.AdProvider !== 'undefined' })
      .then(() => {
        if (cancelled) return;
        serveExoClickAd();
        
        // Chỉ kiểm tra fill 1 lần sau vài giây, không retry vô hạn nữa
        setTimeout(() => {
          if (cancelled) return;
          const container = containerRef.current;
          if (!container) return;
          const emptySlots = [...container.querySelectorAll('ins')].filter((slot) => {
            return slot.innerHTML.trim() === '' && slot.children.length === 0;
          });
          
          if (emptySlots.length === 0) {
            setAdState('showing');
          } else {
            setAdState('no-fill');
          }
        }, EXOCLICK_FILL_CHECK_DELAY);
      })
      .catch((error) => {
        console.warn('ExoClick provider failed:', error.message);
        setAdState('blocked');
      });

    return () => {
      cancelled = true;
    };
  }, [zoneKey]);

  if (!zones.length) return null;

  // Khi bị chặn, AdBlockWall đã xử lý overlay → ẩn slot này
  if (adState === 'blocked') return null;

  return (
    <div
      ref={containerRef}
      data-ad-status={adState}
      style={{
        width: config.width || '100%',
        maxWidth: '100%',
        minHeight: config.minHeight || '90px',
        margin: config.margin || '0 auto 2.5rem',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: '12px',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <span style={{
          position: 'absolute',
          top: '0px',
          right: '0px',
          background: 'rgba(0, 0, 0, 0.4)',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '0.6rem',
          padding: '2px 4px',
          borderRadius: '0 0 0 4px',
          pointerEvents: 'none',
          zIndex: 10,
          lineHeight: 1
        }}>
          Tài trợ
        </span>
        {zones.map((zoneId) => (
          <ins
            key={zoneId}
            className={config.className || 'eas6a97888e38'}
            data-zoneid={zoneId}
            style={{
              display: 'block',
              width: '100%',
              minHeight: config.minHeight || '90px'
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main AdBanner Component ────────────────────────────────────────

function AdBanner({ config }) {
  if (config?.provider === 'exoclick') {
    return <ExoClickAdBanner config={config} />;
  }

  // Nếu không có cấu hình hoặc không có link ảnh, không hiển thị gì cả
  if (!config || !config.imageUrl) return null;

  return (
    <div 
      className="ad-banner-container" 
      style={{
        width: '100%',
        marginBottom: '2.5rem',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--color-border)',
        background: 'rgba(255, 255, 255, 0.02)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(102, 192, 244, 0.2)';
        e.currentTarget.style.borderColor = 'rgba(102, 192, 244, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.25)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      {/* Nhãn "Quảng cáo" nhỏ nằm ở góc trên bên phải */}
      <span style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'rgba(0, 0, 0, 0.6)',
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '0.65rem',
        padding: '2px 6px',
        borderRadius: '4px',
        pointerEvents: 'none',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontWeight: 'bold',
        letterSpacing: '0.5px'
      }}>
        Tài trợ
      </span>

      <a 
        href={config.targetUrl || '#'} 
        target={config.targetUrl ? "_blank" : "_self"} 
        rel="noopener noreferrer"
        style={{ display: 'block', width: '100%', height: '100%', lineHeight: 0 }}
        onClick={(e) => {
          if (!config.targetUrl || config.targetUrl === '#') {
            e.preventDefault();
          }
        }}
      >
        <img 
          src={config.imageUrl} 
          alt={config.altText || 'Quảng cáo'} 
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '160px',
            display: 'block',
            objectFit: 'cover',
            borderRadius: '11px',
            minHeight: '60px'
          }}
        />
      </a>
    </div>
  );
}

export default AdBanner;
