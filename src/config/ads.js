/**
 * CẤU HÌNH QUẢNG CÁO WEB18P
 * 
 * Hệ thống 3 lớp chống Ad Blocker:
 * 
 * Lớp 1: ExoClick hiển thị bình thường (cho user không dùng ad blocker)
 * Lớp 2: Phát hiện ad blocker → hiện banner nhỏ trong slot nhờ user tắt
 * Lớp 3: Overlay toàn trang chặn truy cập cho đến khi user tắt ad blocker
 *         (AdBlockWall component trong App.jsx)
 */

export const ADS_CONFIG = {
  // Vị trí 1: Đầu trang (Multi format)
  slot1: {
    provider: 'exoclick',
    zoneId: '5983796',
    className: 'eas6a97888e38',
    width: '100%',
    height: 'auto',
    minHeight: '90px',
    altText: 'Quảng cáo ExoClick đầu trang',
  },

  // Vị trí 2: Cuối trang (Multi format)
  slot2: {
    provider: 'exoclick',
    zoneId: '5983812',
    className: 'eas6a97888e38',
    width: '100%',
    height: 'auto',
    minHeight: '90px',
    margin: '2rem auto 3rem',
    altText: 'Quảng cáo ExoClick cuối trang',
  },

  // Vị trí Sidebar: Dưới chatbox (Kích thước 300x250)
  sidebar: {
    provider: 'exoclick',
    zoneId: '5983814',
    className: 'eas6a97888e38',
    width: '100%',
    height: 'auto',
    minHeight: '250px',
    altText: 'Quảng cáo ExoClick sidebar',
  },

  // Vị trí 3: Ở cuối trang (dự phòng cho banner ảnh tĩnh nếu dùng)
  slot3: {
    imageUrl: '', // Link ảnh banner (ví dụ: 'https://example.com/banner3.png')
    targetUrl: '', // Link liên kết khi người dùng click vào banner
    altText: 'Quảng cáo dự phòng',
  }
};

