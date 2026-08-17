/**
 * CẤU HÌNH HỆ THỐNG THANH TOÁN VIETQR WEB18P
 * Bạn hãy thay đổi các thông số dưới đây để kết nối với tài khoản ngân hàng thật của bạn.
 * KHUYÊN DÙNG: Sử dụng tài khoản doanh nghiệp hoặc không dùng tên thật để đảm bảo ẩn danh (OPSEC).
 */

export const PAYMENT_CONFIG = {
  // CỔNG SEPAY (Khuyên dùng chính vì hỗ trợ kiểm tra giao dịch ở Frontend siêu dễ và mượt)
  sepay: {
    // API Token lấy từ trang Dashboard SePay.vn (Bắt đầu bằng spsk_...)
    apiToken: '', // Token removed from client-side for security. It should only be configured in the Cloudflare Worker.

    // Thông tin tài khoản ngân hàng của bạn để hiển thị mã QR nhận tiền
    bankId: import.meta.env.VITE_BANK_ID || 'MB',          // Mã Ngân hàng nhận tiền (Ví dụ: MB = MBBank)
    accountNumber: import.meta.env.VITE_ACCOUNT_NUMBER || 'NHAP_SO_TAI_KHOAN_DOANH_NGHIEP', // Điền số tài khoản vào biến môi trường
    accountName: import.meta.env.VITE_ACCOUNT_NAME || 'TEN DOANH NGHIEP HOAC AN DANH' // Tên chủ tài khoản
  },

  // CỔNG PAYOS (Hỗ trợ cấu hình dự phòng)
  payos: {
    apiKey: import.meta.env.VITE_PAYOS_API_KEY || '',
    clientId: import.meta.env.VITE_PAYOS_CLIENT_ID || '',
    checksumKey: import.meta.env.VITE_PAYOS_CHECKSUM_KEY || '',

    // Cấu hình ngân hàng nhận tiền cho cổng PayOS (có thể cùng số tài khoản hoặc khác SePay)
    bankId: import.meta.env.VITE_BANK_ID || 'MB',
    accountNumber: import.meta.env.VITE_ACCOUNT_NUMBER || 'NHAP_SO_TAI_KHOAN_DOANH_NGHIEP', 
    accountName: import.meta.env.VITE_ACCOUNT_NAME || 'TEN DOANH NGHIEP HOAC AN DANH'
  }
};
