/**
 * CẤU HÌNH HỆ THỐNG THANH TOÁN VIETQR WEB18P
 * Bạn hãy thay đổi các thông số dưới đây để kết nối với tài khoản ngân hàng thật của bạn.
 */

export const PAYMENT_CONFIG = {
  // CỔNG SEPAY (Khuyên dùng chính vì hỗ trợ kiểm tra giao dịch ở Frontend siêu dễ và mượt)
  sepay: {
    // API Token lấy từ trang Dashboard SePay.vn (Bắt đầu bằng spsk_...)
    apiToken: '',

    // Thông tin tài khoản ngân hàng của bạn để hiển thị mã QR nhận tiền
    bankId: 'MB',          // Mã Ngân hàng nhận tiền (Ví dụ: MB = MBBank, ICB = VietinBank, VCB = Vietcombank, ACB = ACB, TCB = Techcombank)
    accountNumber: '0392731908', // Nhập số tài khoản ngân hàng của bạn
    accountName: 'NGUYEN HONG PHUC' // Nhập tên chủ tài khoản viết hoa không dấu
  },

  // CỔNG PAYOS (Hỗ trợ cấu hình dự phòng)
  payos: {
    apiKey: '', // Đã điền sẵn API Key của bạn
    clientId: '',
    checksumKey: '',

    // Cấu hình ngân hàng nhận tiền cho cổng PayOS (có thể cùng số tài khoản hoặc khác SePay)
    bankId: 'MB',
    accountNumber: '0392731908', // Nhập số tài khoản ngân hàng nhận tiền cho PayOS
    accountName: 'NGUYEN HONG PHUC' // Nhập tên chủ tài khoản viết hoa không dấu
  }
};
