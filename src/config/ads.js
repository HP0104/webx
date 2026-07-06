/**
 * CẤU HÌNH QUẢNG CÁO WEB18P
 * 
 * Hệ thống 3 lớp chống Ad Blocker:
 * 
 * Lớp 1: ExoClick hiển thị bình thường (cho user không dùng ad blocker)
 * Lớp 2: Phát hiện ad blocker → hiện banner nhờ user tắt
 * Lớp 3: User không tắt → hiển thị quảng cáo tự host (fallback)
 * 
 * Cấu hình fallback:
 * - fallback.imageUrl: Link ảnh banner tự host (trên domain của bạn hoặc link trực tiếp)
 * - fallback.targetUrl: Link liên kết khi click (link affiliate, trang tài trợ, v.v.)
 * - fallback.altText: Mô tả ảnh
 * 
 * Nếu bỏ trống fallback.imageUrl, khi bị ad blocker sẽ chỉ hiện banner nhờ tắt (Lớp 2).
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
    // Fallback khi bị ad blocker (Lớp 3) — thay bằng link thật của bạn
    fallback: {
      imageUrl: '', // Ví dụ: 'https://web18p.xyz/banners/sponsor1.png'
      targetUrl: '', // Ví dụ: 'https://t.me/web18p' hoặc link affiliate
      altText: 'Tài trợ vị trí 1',
    },
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
    // Fallback khi bị ad blocker (Lớp 3) — thay bằng link thật của bạn
    fallback: {
      imageUrl: '', // Ví dụ: 'https://web18p.xyz/banners/sponsor2.png'
      targetUrl: '', // Ví dụ: link affiliate
      altText: 'Tài trợ vị trí 2',
    },
  },

  // Vị trí 3: Ở cuối trang (trên cùng phần footer/dưới cùng Home)
  slot3: {
    imageUrl: '', // Link ảnh banner (ví dụ: 'https://example.com/banner3.png')
    targetUrl: '', // Link liên kết khi người dùng click vào banner
    altText: 'Quảng cáo vị trí 3',
  }
};
