/**
 * CẤU HÌNH HỆ THỐNG THANH TOÁN VIETQR WEB18P
 * Bạn hãy thay đổi các thông số dưới đây để kết nối với tài khoản ngân hàng thật của bạn.
 * KHUYÊN DÙNG: Sử dụng tài khoản doanh nghiệp hoặc không dùng tên thật để đảm bảo ẩn danh (OPSEC).
 */

export const PAYMENT_CONFIG = {
  // CỔNG SEPAY (Thông tin hiển thị VietQR công khai; API Token giữ kín tại Cloudflare Worker Secrets)
  sepay: {
    apiToken: '',
    bankId: import.meta.env.VITE_BANK_ID || 'MB',
    accountNumber: import.meta.env.VITE_ACCOUNT_NUMBER || '',
    accountName: import.meta.env.VITE_ACCOUNT_NAME || ''
  },

  // CỔNG PAYOS (API Key / Checksum Key chỉ cấu hình trên Cloudflare Worker Secrets)
  payos: {
    bankId: import.meta.env.VITE_BANK_ID || 'MB',
    accountNumber: import.meta.env.VITE_ACCOUNT_NUMBER || '',
    accountName: import.meta.env.VITE_ACCOUNT_NAME || ''
  }
};
