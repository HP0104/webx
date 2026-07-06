import { useEffect, useRef, useState, useCallback } from 'react';

const EXOCLICK_PROVIDER_SRC = 'https://a.magsrv.com/ad-provider.js';
const EXOCLICK_SCRIPT_ID = 'exoclick-ad-provider';
const EXOCLICK_FILL_CHECK_DELAY = 4500;
const ADBLOCK_DETECT_DELAY = 3000;

// ─── Ad Blocker Detection ───────────────────────────────────────────
// Uses multiple signals to reliably detect ad blockers
function detectAdBlocker() {
  return new Promise((resolve) => {
    // Signal 1: Try to fetch the ExoClick script
    const testScript = document.createElement('script');
    testScript.src = EXOCLICK_PROVIDER_SRC;
    testScript.async = true;
    testScript.style.display = 'none';

    let resolved = false;
    const done = (blocked) => {
      if (resolved) return;
      resolved = true;
      testScript.remove();
      resolve(blocked);
    };

    testScript.onerror = () => done(true);
    testScript.onload = () => {
      // Script loaded, but check if AdProvider actually works
      setTimeout(() => {
        if (typeof window.AdProvider === 'undefined') {
          done(true);
        } else {
          done(false);
        }
      }, 500);
    };

    document.head.appendChild(testScript);

    // Signal 2: Timeout fallback — if script doesn't respond in time, assume blocked
    setTimeout(() => done(true), ADBLOCK_DETECT_DELAY);
  });
}

// Cache the detection result for the session
let _adBlockDetected = null;
async function isAdBlockActive() {
  if (_adBlockDetected !== null) return _adBlockDetected;
  _adBlockDetected = await detectAdBlocker();
  return _adBlockDetected;
}

// Reset cache (e.g. after user says they disabled it)
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

// ─── Anti-Adblock Banner (Lớp 2) ───────────────────────────────────
// Shows a polite message asking users to disable their ad blocker

function AntiAdblockBanner({ onRetry, config }) {
  return (
    <div
      style={{
        width: '100%',
        padding: '1.2rem 1.5rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(255, 183, 77, 0.08), rgba(255, 152, 0, 0.04))',
        border: '1px solid rgba(255, 183, 77, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        margin: config?.margin || '0 auto 2.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '200px' }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🛡️</span>
        <div>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '0.85rem',
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.4
          }}>
            Phát hiện trình chặn quảng cáo
          </p>
          <p style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.75rem',
            margin: '0.2rem 0 0',
            lineHeight: 1.4
          }}>
            Quảng cáo giúp chúng tôi duy trì web miễn phí. Vui lòng tắt ad blocker nhé!
          </p>
        </div>
      </div>
      <button
        onClick={() => {
          resetAdBlockCache();
          onRetry();
        }}
        style={{
          background: 'rgba(255, 183, 77, 0.15)',
          color: '#ffb74d',
          border: '1px solid rgba(255, 183, 77, 0.3)',
          padding: '0.45rem 1rem',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.78rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 183, 77, 0.25)';
          e.currentTarget.style.borderColor = 'rgba(255, 183, 77, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 183, 77, 0.15)';
          e.currentTarget.style.borderColor = 'rgba(255, 183, 77, 0.3)';
        }}
      >
        Đã tắt? Tải lại ↻
      </button>
    </div>
  );
}

// ─── Native Ad Fallback (Lớp 3) ────────────────────────────────────
// Self-hosted ad banner that ad blockers cannot block

function NativeAdFallback({ config }) {
  const fallback = config?.fallback;
  if (!fallback || !fallback.imageUrl) return null;

  return (
    <div
      style={{
        width: '100%',
        margin: config.margin || '0 auto 2.5rem',
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
      {/* Nhãn "Tài trợ" */}
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

      <a
        href={fallback.targetUrl || '#'}
        target={fallback.targetUrl ? "_blank" : "_self"}
        rel="noopener noreferrer"
        style={{ display: 'block', width: '100%', height: '100%', lineHeight: 0 }}
      >
        <img
          src={fallback.imageUrl}
          alt={fallback.altText || 'Tài trợ'}
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

// ─── ExoClick Ad Banner (Lớp 1) ────────────────────────────────────
// Main ExoClick ad component with 3-layer fallback system

function ExoClickAdBanner({ config }) {
  const containerRef = useRef(null);
  const retryRef = useRef(false);
  const [adState, setAdState] = useState('loading'); // 'loading' | 'showing' | 'blocked' | 'no-fill'
  const zones = getExoClickZones(config);
  const zoneKey = zones.join(',');

  const attemptLoadAds = useCallback(async () => {
    setAdState('loading');
    retryRef.current = false;

    // First, check if ad blocker is active
    const blocked = await isAdBlockActive();
    if (blocked) {
      setAdState('blocked');
      return;
    }

    // Ad blocker not detected, try to load ExoClick ads
    try {
      await ensureExoClickProvider();
      
      // Reset slots
      const container = containerRef.current;
      if (container) {
        [...container.querySelectorAll('ins')].forEach((slot) => {
          const hasRenderedAd = slot.querySelector('iframe, img, a, div');
          if (!hasRenderedAd) {
            slot.removeAttribute('data-processed');
            slot.innerHTML = '';
          }
        });
      }

      serveExoClickAd();

      // Check if ads actually filled after delay
      setTimeout(() => {
        if (!containerRef.current) return;

        const emptySlots = [...containerRef.current.querySelectorAll('ins')].filter((slot) => {
          const hasRenderedAd = slot.querySelector('iframe, img, a, div');
          return !hasRenderedAd;
        });

        const processedEmpty = emptySlots.filter((slot) => slot.dataset.processed === 'true');

        if (!processedEmpty.length) {
          setAdState('showing');
          return;
        }

        // Retry once
        if (!retryRef.current) {
          retryRef.current = true;
          ensureExoClickProvider({ forceReload: typeof window.AdProvider === 'undefined' })
            .then(() => {
              emptySlots.forEach((slot) => {
                slot.removeAttribute('data-processed');
                slot.innerHTML = '';
              });
              serveExoClickAd();

              setTimeout(() => {
                if (!containerRef.current) return;
                const stillEmpty = [...containerRef.current.querySelectorAll('ins')].filter((slot) => {
                  return !slot.querySelector('iframe, img, a, div');
                });
                setAdState(stillEmpty.length ? 'no-fill' : 'showing');
              }, EXOCLICK_FILL_CHECK_DELAY);
            })
            .catch(() => setAdState('no-fill'));
        } else {
          setAdState('no-fill');
        }
      }, EXOCLICK_FILL_CHECK_DELAY);

    } catch {
      setAdState('blocked');
    }
  }, []);

  useEffect(() => {
    if (!zoneKey) return;
    attemptLoadAds();
  }, [zoneKey, config.className, attemptLoadAds]);

  if (!zones.length) return null;

  // ─── Lớp 2: Ad blocker detected → show anti-adblock message ───
  if (adState === 'blocked') {
    const hasFallback = config?.fallback?.imageUrl;
    return (
      <div>
        <AntiAdblockBanner onRetry={attemptLoadAds} config={config} />
        {/* Lớp 3: Also show native fallback ad below the message */}
        {hasFallback && <NativeAdFallback config={config} />}
      </div>
    );
  }

  // ─── Lớp 3: ExoClick loaded but no fill → show native fallback ───
  if (adState === 'no-fill' && config?.fallback?.imageUrl) {
    return <NativeAdFallback config={config} />;
  }

  // ─── Lớp 1: ExoClick ads (normal display) ───
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
