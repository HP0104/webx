import React, { useEffect } from 'react';

function DMCABadge() {
  useEffect(() => {
    // Tải script của DMCA để kích hoạt huy hiệu
    if (!document.getElementById('dmca-badge-script')) {
      const script = document.createElement('script');
      script.id = 'dmca-badge-script';
      script.src = 'https://images.dmca.com/Badges/DMCABadgeHelper.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div 
      className="dmca-badge-container"
      style={{
        position: 'fixed',
        bottom: '80px', // Đặt cao hơn một chút để không đè lên menu điện thoại
        left: '20px',
        zIndex: 9999,
        backgroundColor: 'rgba(20, 20, 24, 0.8)',
        padding: '6px',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 192, 244, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.5)';
      }}
    >
      <a 
        href="https://www.dmca.com/Protection/Status.aspx" 
        title="DMCA.com Protection Status" 
        className="dmca-badge"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img 
          src="https://images.dmca.com/Badges/dmca-badge-w100-5x1-11.png"  
          alt="DMCA.com Protection Status" 
          style={{ display: 'block', width: '100px', height: 'auto' }}
        />
      </a>
    </div>
  );
}

export default DMCABadge;
