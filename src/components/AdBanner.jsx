import React from 'react';

function AdBanner({ config }) {
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
