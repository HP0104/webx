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
  // Vị trí 1: Ở giữa phần Lưu ý (Notification Banner) và Game mới cập nhật (2 ID)
  slot1: {
    provider: 'exoclick',
    zones: ['5983698', '5983696'],
    className: 'eas6a97888e2',
    width: '728px',
    height: '90px',
    gap: '0.75rem',
    altText: 'Quảng cáo ExoClick vị trí 1',
  },

  // Vị trí 2: Ở giữa Game mới cập nhật và Game hot nhất / Cuối trang (2 ID)
  slot2: {
    provider: 'exoclick',
    zones: ['5983694', '5983692'],
    className: 'eas6a97888e2',
    width: '728px',
    height: '90px',
    gap: '0.75rem',
    containerWidth: '100%',
    containerMaxWidth: '100%',
    margin: '2rem auto 3rem',
    altText: 'Quảng cáo ExoClick vị trí 2',
  },

  // Vị trí Sidebar: Ở dưới ChatBox cộng đồng (10 ID hiện ra hết, không thanh trượt)
  sidebar: {
    provider: 'exoclick',
    zones: [
      '5983690',
      '5983688',
      '5983686',
      '5983684',
      '5983682',
      '5983680',
      '5983678',
      '5983676',
      '5983674',
      '5983672'
    ],
    className: 'eas6a97888e2',
    width: '728px',
    height: '90px',
    gap: '1rem',
    layout: 'column',
    showAll: true,
    altText: 'Quảng cáo ExoClick bên dưới ChatBox',
  },

  // Vị trí 3: Ở cuối trang (dự phòng cho banner ảnh tĩnh nếu dùng)
  slot3: {
    imageUrl: '', // Link ảnh banner (ví dụ: 'https://example.com/banner3.png')
    targetUrl: '', // Link liên kết khi người dùng click vào banner
    altText: 'Quảng cáo vị trí 3',
  }
};

