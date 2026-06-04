export const walletService = {
  // Tạo link mã QR theo chuẩn VietQR (MB Bank làm ví dụ)
  generateVietQR(amount, description) {
    const BANK_ID = 'MB'; // Ngân hàng Quân Đội
    const ACCOUNT_NO = '1234567890'; // Số tài khoản admin (giả định)
    const TEMPLATE = 'compact'; // Giao diện QR
    const ACCOUNT_NAME = 'WEBX ADMIN'; // Tên chủ tài khoản
    
    // URL chuẩn VietQR để các app ngân hàng có thể quét và tự điền thông tin
    return `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
  },

  // Giả lập kiểm tra thanh toán
  simulateCheckPayment(callback) {
    // Trong thực tế sẽ gọi API ngân hàng hoặc Webhook
    setTimeout(() => {
      callback(true);
    }, 3000);
  }
};
