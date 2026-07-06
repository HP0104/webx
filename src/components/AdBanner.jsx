import { useEffect, useRef, useState, useCallback } from 'react';

const EXOCLICK_PROVIDER_SRC = 'https://a.magsrv.com/ad-provider.js';
const EXOCLICK_SCRIPT_ID = 'exoclick-ad-provider';
const EXOCLICK_FILL_CHECK_DELAY = 4500;
const ADBLOCK_DETECT_DELAY = 3000;

// ─── Ad Blocker Detection ───────────────────────────────────────────

function checkScriptLoad(src) {
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
    script.onload = () => done(false);

    document.head.appendChild(script);
    setTimeout(() => done(true), ADBLOCK_DETECT_DELAY);
  });
}

async function detectAdBlocker() {
  const [exoBlocked, googleBlocked] = await Promise.all([
    checkScriptLoad(EXOCLICK_PROVIDER_SRC),
    checkScriptLoad('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')
  ]);
  return exoBlocked || googleBlocked;
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
  const existingScript = document.getElementById(EXOCLICK_SCRIPT_ID);

  if (existingScript?.dataset.loaded === 'true' && typeof window.AdProvider !== 'undefined' && !forceReload) {
    return Promise.resolve(existingScript);
  }

  if (existingScript && (forceReload || existingScript.dataset.loaded === 'true')) {
    existingScript.remove();
    window.__exoClickProviderPromise = null;
  } else if (existingScript && window.__exoClickProviderPromise) {
    return window.__exoClickProviderPromise;
  }

  const script = document.createElement('script');
  script.id = EXOCLICK_SCRIPT_ID;
  script.async = true;
  script.type = 'application/javascript';
  script.src = EXOCLICK_PROVIDER_SRC;

  window.__exoClickProviderPromise = new Promise((resolve, reject) => {
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
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
    return config.zones.filter(Boolean).slice(0, 10);
  }
  return config?.zoneId ? [config.zoneId] : [];
}

// ─── AdBlock Wall (Lớp 3 — Overlay toàn trang) ─────────────────────
// Chặn truy cập web cho đến khi user tắt ad blocker.
// Đặt component này ở App.jsx, bên ngoài mọi nội dung.

export function AdBlockWall() {
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);

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

  // Không bị chặn hoặc đang kiểm tra lần đầu → không hiện gì
  if (!blocked || checking) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        maxWidth: '480px',
        width: '100%',
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
  const retryRef = useRef(false);
  const [adState, setAdState] = useState('loading');
  const zones = getExoClickZones(config);
  const zoneKey = zones.join(',');

  useEffect(() => {
    if (!zoneKey) return undefined;

    let cancelled = false;
    let fillCheckTimer;

    const getEmptySlots = () => {
      const container = containerRef.current;
      if (!container) return [];
      return [...container.querySelectorAll('ins')].filter((slot) => {
        return slot.innerHTML.trim() === '' && slot.children.length === 0;
      });
    };

    const resetSlots = () => {
      getEmptySlots().forEach((slot) => {
        slot.removeAttribute('data-processed');
        slot.innerHTML = '';
      });
    };

    const checkAndRetryNoFill = async () => {
      if (cancelled) return;
      const emptySlots = getEmptySlots();

      if (emptySlots.length === 0) {
        setAdState('showing');
        return;
      }

      if (retryRef.current) {
        setAdState('no-fill');
        return;
      }

      retryRef.current = true;

      try {
        await ensureExoClickProvider({ forceReload: typeof window.AdProvider === 'undefined' });
        if (cancelled) return;
        resetSlots();
        serveExoClickAd();
        fillCheckTimer = window.setTimeout(checkAndRetryNoFill, EXOCLICK_FILL_CHECK_DELAY);
      } catch (error) {
        console.warn('ExoClick retry failed:', error.message);
        setAdState('no-fill');
      }
    };

    retryRef.current = false;

    ensureExoClickProvider()
      .then(() => {
        if (cancelled) return;
        serveExoClickAd();
        fillCheckTimer = window.setTimeout(checkAndRetryNoFill, EXOCLICK_FILL_CHECK_DELAY);
      })
      .catch((error) => {
        console.warn('ExoClick provider failed:', error.message);
        setAdState('blocked');
      });

    return () => {
      cancelled = true;
      if (fillCheckTimer) window.clearTimeout(fillCheckTimer);
    };
  }, [zoneKey, config.className]);

  if (!zones.length) return null;

  // Khi bị chặn, AdBlockWall đã xử lý overlay → ẩn slot này
  if (adState === 'blocked') return null;

  return (
    <div
      ref={containerRef}
      data-ad-status={adState}
      style={{
        width: config.containerWidth || '100%',
        maxWidth: config.containerMaxWidth || '100%',
        minWidth: 0,
        height: 'auto',
        maxHeight: config.height ? `calc(${config.height} + 2.5rem)` : '282px',
        margin: config.margin || '0 auto 2.5rem',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--color-border)',
        background: 'rgba(255, 255, 255, 0.02)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
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
        letterSpacing: '0.5px',
        zIndex: 1
      }}>
        Tài trợ
      </span>

      <div
        style={{
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: zones.length === 1 ? 'center' : 'flex-start',
          gap: config.gap || '1rem',
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: '0.5rem',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent'
        }}
      >
        {zones.map((zoneId) => (
          <div
            key={zoneId}
            style={{
              width: `min(100%, ${config.width || '300px'})`,
              maxWidth: '100%',
              minWidth: 0,
              height: config.height || '250px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden'
            }}
          >
            <ins
              className={config.className || 'eas6a97888e2'}
              data-zoneid={zoneId}
              style={{
                display: 'block',
                width: config.width || '300px',
                height: config.height || '250px',
                maxWidth: '100%',
                flex: '0 0 auto'
              }}
            />
          </div>
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
