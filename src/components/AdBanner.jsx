import React, { useEffect } from 'react';

const EXOCLICK_PROVIDER_SRC = 'https://a.magsrv.com/ad-provider.js';
const EXOCLICK_SCRIPT_ID = 'exoclick-ad-provider';

function serveExoClickAd() {
  window.AdProvider = window.AdProvider || [];
  window.AdProvider.push({ serve: {} });
}

function ensureExoClickProvider() {
  const existingScript = document.getElementById(EXOCLICK_SCRIPT_ID);

  if (existingScript) {
    return;
  }

  const script = document.createElement('script');
  script.id = EXOCLICK_SCRIPT_ID;
  script.async = true;
  script.type = 'application/javascript';
  script.src = EXOCLICK_PROVIDER_SRC;
  script.addEventListener('load', () => {
    script.dataset.loaded = 'true';
  });
  script.addEventListener('error', () => {
    script.dataset.error = 'true';
  });

  document.head.appendChild(script);
}

function getExoClickZones(config) {
  if (Array.isArray(config?.zones)) {
    return config.zones.filter(Boolean);
  }

  return config?.zoneId ? [config.zoneId] : [];
}

function ExoClickAdBanner({ config }) {
  const zones = getExoClickZones(config);
  const zoneKey = zones.join(',');

  useEffect(() => {
    if (!zoneKey) return undefined;

    ensureExoClickProvider();
    serveExoClickAd();
    return undefined;
  }, [zoneKey]);

  if (!zones.length) return null;

  return (
    <div
      className="ad-banner-container"
      style={{
        width: config.containerWidth || '100%',
        maxWidth: config.containerMaxWidth || '100%',
        minHeight: '250px',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: config.gap || '1rem'
        }}
      >
        {zones.map((zoneId) => (
          <div
            key={zoneId}
            style={{
              width: config.width || '300px',
              height: config.height || '250px',
              maxWidth: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ins
              className={config.className || 'eas6a97888e2'}
              data-zoneid={zoneId}
              style={{
                display: 'block',
                width: config.width || '300px',
                height: config.height || '250px',
                maxWidth: '100%'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

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
        style={{ display: 'block', width: '100%', height: '100%', lineId: 0 }}
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
