/**
 * CẤU HÌNH QUẢNG CÁO WEB18P
 * 
 * Để hiển thị quảng cáo, hãy nhập link hình ảnh (imageUrl) và link liên kết (targetUrl) cho từng vị trí.
 * Nếu bỏ trống imageUrl (hoặc để chuỗi rỗng ''), khung quảng cáo tương ứng sẽ hoàn toàn ẩn đi và không ảnh hưởng đến giao diện trang web.
 */

export const ADS_CONFIG = {
  // Vị trí 1: Ở giữa phần Lưu ý (Notification Banner) và Game mới cập nhật
  slot1: {
    imageUrl: '', // Link ảnh banner (ví dụ: 'https://example.com/banner1.png')
    targetUrl: '', // Link liên kết khi người dùng click vào banner
    altText: 'Quảng cáo vị trí 1',
  },

  // Vị trí 2: Ở giữa Game mới cập nhật và Game hot nhất
  slot2: {
    imageUrl: '', // Link ảnh banner (ví dụ: 'https://example.com/banner2.png')
    targetUrl: '', // Link liên kết khi người dùng click vào banner
    altText: 'Quảng cáo vị trí 2',
  },

  // Vị trí 3: Ở cuối trang (trên cùng phần footer/dưới cùng Home)
  slot3: {
    imageUrl: '', // Link ảnh banner (ví dụ: 'https://example.com/banner3.png')
    targetUrl: '', // Link liên kết khi người dùng click vào banner
    altText: 'Quảng cáo vị trí 3',
  }
};
