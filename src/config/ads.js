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
  // Vị trí 1: Ở giữa phần Lưu ý (Notification Banner) và Game mới cập nhật
  slot1: {
    provider: 'exoclick',
    zones: ['5954560', '5954558', '5954556', '5954554', '5954552', '5954550', '5954540', '5954538'],
    className: 'eas6a97888e2',
    width: '728px',
    height: '90px',
    gap: '0.75rem',
    altText: 'Quảng cáo ExoClick vị trí 1',
  },

  // Vị trí 2: Ở giữa Game mới cập nhật và Game hot nhất
  slot2: {
    provider: 'exoclick',
    zones: ['5954532', '5954408', '5954406', '5954404', '5954402', '5954350', '5954348', '5954338'],
    className: 'eas6a97888e2',
    width: '728px',
    height: '90px',
    gap: '0.75rem',
    containerWidth: '100%',
    containerMaxWidth: '100%',
    margin: '2rem auto 3rem',
    altText: 'Quảng cáo ExoClick vị trí 2',
  },

  // Vị trí 3: Ở cuối trang (trên cùng phần footer/dưới cùng Home)
  slot3: {
    imageUrl: '', // Link ảnh banner (ví dụ: 'https://example.com/banner3.png')
    targetUrl: '', // Link liên kết khi người dùng click vào banner
    altText: 'Quảng cáo vị trí 3',
  }
};
