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
        marginTop: '2rem',
        marginBottom: '2rem', // Khoảng cách với đáy trang
        alignSelf: 'center', // Căn giữa
        backgroundColor: 'rgba(20, 20, 24, 0.8)',
        padding: '6px',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        width: 'fit-content',
        position: 'static'
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
        href="https://www.dmca.com/Protection/Status.aspx?ID=b48d280e-0da6-4675-9697-1269c31b3715" 
        title="DMCA.com Protection Status" 
        className="dmca-badge"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img 
          src="https://images.dmca.com/Badges/dmca_protected_sml_120m.png?ID=b48d280e-0da6-4675-9697-1269c31b3715"  
          alt="DMCA.com Protection Status" 
          style={{ display: 'block', width: '120px', height: 'auto' }}
        />
      </a>
    </div>
  );
}

export default DMCABadge;
