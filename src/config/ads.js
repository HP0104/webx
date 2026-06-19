/**
 * CẤU HÌNH QUẢNG CÁO WEB18P
 * 
 * Để hiển thị quảng cáo, hãy nhập link hình ảnh (imageUrl) và link liên kết (targetUrl) cho từng vị trí.
 * Nếu bỏ trống imageUrl (hoặc để chuỗi rỗng ''), khung quảng cáo tương ứng sẽ hoàn toàn ẩn đi và không ảnh hưởng đến giao diện trang web.
 */

export const ADS_CONFIG = {
  // Vị trí 1: Ở giữa phần Lưu ý (Notification Banner) và Game mới cập nhật
  slot1: {
    provider: 'exoclick',
    zones: ['5954540', '5954538', '5954532', '5954408', '5954406'],
    className: 'eas6a97888e2',
    width: '728px',
    height: '90px',
    gap: '0.75rem',
    altText: 'Quảng cáo ExoClick vị trí 1',
  },

  // Vị trí 2: Ở giữa Game mới cập nhật và Game hot nhất
  slot2: {
    provider: 'exoclick',
    zones: ['5954404', '5954402', '5954350', '5954348', '5954338'],
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
