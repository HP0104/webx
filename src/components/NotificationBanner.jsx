import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

function NotificationBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [notification, setNotification] = useState(
    '📌 LƯU Ý: Tất cả game được admin dịch. Nếu trùng với web khác thì admin chân thành xin lỗi. (Có thể vào phần báo lỗi và báo để admin gỡ)'
  );

  if (!isVisible) return null;

  return (
    <div style={{
      width: '100%',
      padding: '1rem',
      backgroundColor: 'rgba(30, 90, 160, 0.15)',
      borderBottom: '2px solid rgba(24, 144, 255, 0.4)',
      borderTop: '2px solid rgba(24, 144, 255, 0.4)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem',
      justifyContent: 'space-between',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', flex: 1, minWidth: '200px' }}>
        <AlertCircle 
          size={20} 
          style={{ 
            color: 'rgba(24, 144, 255, 0.8)', 
            marginTop: '0.2rem',
            flexShrink: 0
          }} 
        />
        <p style={{
          color: 'var(--color-text-light)',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          margin: 0,
          wordBreak: 'break-word'
        }}>
          {notification}
        </p>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          padding: '0.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.color = 'var(--color-text-light)'}
        onMouseLeave={(e) => e.target.style.color = 'var(--color-text-muted)'}
      >
        <X size={18} />
      </button>
    </div>
  );
}

export default NotificationBanner;
