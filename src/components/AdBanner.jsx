import { useEffect, useRef, useState, useCallback } from 'react';

const EXOCLICK_PROVIDER_SRC = 'https://a.magsrv.com/ad-provider.js';
const EXOCLICK_SCRIPT_ID = 'exoclick-ad-provider';
const EXOCLICK_FILL_CHECK_DELAY = 2000;
const ADBLOCK_DETECT_DELAY = 3000;

// ─── Ad Blocker Detection ───────────────────────────────────────────

function checkScriptLoad(src, validationFn = null, timeout = 4000) {
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

    // Ad blockers block requests immediately -> triggers script.onerror within < 50ms
    script.onerror = () => done(true);
    script.onload = () => {
      if (validationFn) {
        done(!validationFn());
      } else {
        done(false);
      }
    };

    document.head.appendChild(script);
    // Timeout does NOT mean blocked (could be slow network or CDN latency)
    // Only real ad blocker intervention actively triggers script.onerror
    setTimeout(() => done(false), timeout);
  });
}

async function detectAdBlocker() {
  // ── Check 1: DOM bait (original proven check — catches uBlock, ABP) ──
  const checkDOM = new Promise((resolve) => {
    const bait = document.createElement('div');
    bait.className = 'ad-banner adsbox doubleclick ad ads ad-placement ad-placeholder sponsor ad-container ad-wrapper pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links';
    bait.id = 'adsense';
    bait.style.position = 'absolute';
    bait.style.top = '-9999px';
    bait.style.left = '-9999px';
    bait.style.width = '10px';
    bait.style.height = '10px';
    bait.style.display = 'block';

    document.body.appendChild(bait);

    setTimeout(() => {
      let isBlocked = false;
      if (document.body.contains(bait)) {
        const style = window.getComputedStyle(bait);
        isBlocked =
          bait.offsetHeight === 0 ||
          bait.offsetWidth === 0 ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0';
        bait.remove();
      } else {
        isBlocked = true;
      }
      resolve(isBlocked);
    }, 300);
  });

  const domBlocked = await checkDOM;
  if (domBlocked) {
    console.warn('[AdBlock] Blocked by Check 1 (DOM bait)');
    return true;
  }

  // ── Check 2: AdSense element check (catches Cốc Cốc built-in ad blocker) ──
  // Cốc Cốc's built-in adblocker specifically targets .adsbygoogle elements
  const checkAdSenseElement = new Promise((resolve) => {
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.setAttribute('data-ad-client', 'ca-pub-1234567890123456');
    ins.setAttribute('data-ad-slot', '1234567890');
    ins.setAttribute('style',
      'display: block !important; width: 300px !important; height: 250px !important; ' +
      'position: absolute !important; top: -9999px !important; left: -9999px !important; ' +
      'visibility: visible !important; opacity: 1 !important; overflow: hidden !important;'
    );
    ins.textContent = '\u00A0';

    document.body.appendChild(ins);

    setTimeout(() => {
      let isBlocked = false;
      if (document.body.contains(ins)) {
        const style = window.getComputedStyle(ins);
        isBlocked =
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0' ||
          ins.offsetHeight === 0 ||
          ins.offsetWidth === 0;
        ins.remove();
      } else {
        isBlocked = true;
      }
      resolve(isBlocked);
    }, 300);
  });

  const adsenseBlocked = await checkAdSenseElement;
  if (adsenseBlocked) {
    console.warn('[AdBlock] Blocked by Check 2 (Cốc Cốc AdSense filter)');
    return true;
  }

  // ── Check 3: Fetch Check (catches network-level blockers like Brave Shields) ──
  // Chỉ test ExoClick URL vì site dùng ExoClick, KHÔNG dùng Google AdSense
  const fetchBlocked = await (async () => {
    try {
      await fetch('https://a.magsrv.com/ad-provider.js', { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
      return false;
    } catch {
      return true;
    }
  })();
  if (fetchBlocked) {
    console.warn('[AdBlock] Blocked by Check 3 (Network fetch - ExoClick blocked)');
    return true;
  }

  // ── Check 4: Popup Blocker Detection ── (DISABLED)
  // Popup blocker là tính năng mặc định của trình duyệt (Cốc Cốc, Chrome, v.v.)
  // KHÔNG phải ad blocker → KHÔNG trigger AdBlockWall
  // Chỉ log warning để debug, không return true
  if (window.__popupBlockedDetected === true && !window.__popupSuccessfullyOpened && !window.disablePopunder) {
    console.warn('[AdBlock] Popup blocked by browser (NOT ad blocker — skipping)');
  }

  // ── Check 5: Script load check (catches script-level blocking) ──
  // Yêu cầu CẢ HAI đều bị chặn mới trigger (tránh false positive do mạng chậm)
  const [exoBlocked, baitBlocked] = await Promise.all([
    checkScriptLoad(EXOCLICK_PROVIDER_SRC),
    checkScriptLoad('/ads.js', () => window.__adblockerBait === true)
  ]);
  if (exoBlocked && baitBlocked) {
    console.warn('[AdBlock] Blocked by Check 5 (Script load): exo=' + exoBlocked + ', bait=' + baitBlocked);
    return true;
  }

  return false;
}

// ─── Global Popup State ─────────────────────────────────────────────
// Chỉ khởi tạo state flags, KHÔNG override window.open
// Popup blocker của trình duyệt KHÔNG phải ad blocker → không cần monitor
if (typeof window !== 'undefined' && !window.__popupMonitorInstalled) {
  window.__popupMonitorInstalled = true;
  window.__popupBlockedDetected = false;
  window.__popupSuccessfullyOpened = false;

  // Listen for ExoClick creative display events (popup thành công)
  document.addEventListener('creativeDisplayed-6004200', () => {
    window.__popupSuccessfullyOpened = true;
    window.__popupBlockedDetected = false;
  }, true);
  document.addEventListener('creativeDisplayed-5983670', () => {
    window.__popupSuccessfullyOpened = true;
    window.__popupBlockedDetected = false;
  }, true);

  // Catch any CustomEvent starting with creativeDisplayed
  const origDispatch = document.dispatchEvent;
  document.dispatchEvent = function(evt) {
    if (evt && typeof evt.type === 'string' && evt.type.startsWith('creativeDisplayed')) {
      window.__popupSuccessfullyOpened = true;
      window.__popupBlockedDetected = false;
    }
    return origDispatch.apply(this, arguments);
  };
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

  // Popup bị chặn bởi trình duyệt KHÔNG phải ad blocker → không cần listener

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
          Vui lòng tắt trình chặn quảng cáo & popup
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
          Hãy tắt Ad Blocker và cho phép cửa sổ bật lên (popup) trên trình duyệt rồi nhấn nút bên dưới để tiếp tục truy cập. Cảm ơn bạn đã ủng hộ! 💚
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
            Cách tắt nhanh trên Cốc Cốc & Trình duyệt
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              '1. Nhấn vào biểu tượng Khiên (hoặc AdBlock) trên thanh địa chỉ',
              '2. Tắt cả "Chặn quảng cáo" và "Chặn cửa sổ bật lên" (Pop-up)',
              '3. Quay lại đây và nhấn nút "Tôi đã tắt" bên dưới',
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
            window.__popupBlockedDetected = false;
            window.__popupSuccessfullyOpened = false;
            try {
              sessionStorage.removeItem('ad_popup_shown');
              localStorage.removeItem('ad_popup_shown');
              document.cookie.split(";").forEach(c => {
                const name = c.split("=")[0].trim();
                if (name.startsWith("zone-cap-")) {
                  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/";
                  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;domain=" + window.location.hostname;
                }
              });
            } catch {}
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
          ✅ Tôi đã tắt Ad Blocker & Popup (Tải lại trang)
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
