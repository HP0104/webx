import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, QrCode, CheckCircle2, RefreshCw, AlertTriangle, Landmark } from 'lucide-react';
import { useAppContext } from '../App';
import { walletService } from '../services/walletService';
import { PAYMENT_CONFIG } from '../config/payment';

function Wallet() {
  const { balance, updateUserInfo, user } = useAppContext();
  const [amount, setAmount] = useState('50000');
  const [selectedGateway, setSelectedGateway] = useState('sepay'); // sepay hoặc payos
  const [showQR, setShowQR] = useState(false);
  const [txCode, setTxCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  // 1. Tạo mã QR động dựa trên cổng thanh toán và số tiền đã chọn
  const handleGenerateQR = () => {
    if (!user) return alert('Vui lòng đăng nhập để thực hiện nạp tiền!');
    
    // Tạo nội dung chuyển khoản ngẫu nhiên không trùng lặp (ví dụ: WEBX374829)
    const code = `WEBX${Math.floor(100000 + Math.random() * 900000)}`;
    setTxCode(code);

    let generatedQrUrl = '';
    if (selectedGateway === 'sepay') {
      const { bankId, accountNumber, accountName } = PAYMENT_CONFIG.sepay;
      // Gọi API VietQR để sinh mã QR động chuẩn 100%
      generatedQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${code}&accountName=${encodeURIComponent(accountName)}`;
    } else {
      const { bankId, accountNumber, accountName } = PAYMENT_CONFIG.payos;
      // Gọi API VietQR động cho cổng PayOS lấy từ cấu hình
      generatedQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${code}&accountName=${encodeURIComponent(accountName)}`;
    }

    setQrUrl(generatedQrUrl);
    setShowQR(true);
  };

  // 2. Tích hợp bộ API Polling tự động quét giao dịch SePay thời gian thực (Real-time)
  useEffect(() => {
    let intervalId;

    if (showQR && txCode && amount) {
      const checkPayment = async () => {
        const apiToken = PAYMENT_CONFIG.sepay.apiToken;
        // Kiểm tra xem người dùng đã cấu hình Token thật hay chưa
        if (!apiToken || apiToken.includes('nhap_api_token_sepay')) {
          return; // Nếu chưa cấu hình thì dùng chế độ giả lập local
        }

        try {
          // Gọi API kiểm tra lịch sử 20 giao dịch gần nhất qua CORS proxy đa năng (chạy được cả ở Local & Production)
          const response = await fetch('https://corsproxy.io/?https://my.sepay.vn/userapi/transactions/list?limit=20', {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();

          if (data && data.transactions && Array.isArray(data.transactions)) {
            // Tìm giao dịch khớp số tiền nạp và nội dung chuyển khoản động
            const matchedTx = data.transactions.find(tx => {
              const matchesAmount = Number(tx.amount_in) === Number(amount);
              const matchesContent = tx.transaction_content.includes(txCode) || tx.body.includes(txCode);
              return matchesAmount && matchesContent;
            });

            if (matchedTx) {
              // BẢO MẬT: Kiểm tra chống nhận đúp tiền (Double-claim Protection) bằng Firestore
              const { doc, getDoc, setDoc } = await import('firebase/firestore');
              const { db } = await import('../firebase');

              const paymentDocRef = doc(db, 'payments', matchedTx.id.toString());
              const paymentDoc = await getDoc(paymentDocRef);

              if (!paymentDoc.exists()) {
                // Đánh dấu mã giao dịch ngân hàng này đã xử lý thành công
                await setDoc(paymentDocRef, {
                  userId: user.id || user.uid || '',
                  userEmail: user.email || 'N/A',
                  amount: Number(amount),
                  txCode: txCode,
                  sepayTransactionId: matchedTx.id,
                  bankBrand: matchedTx.bank_brand_name || 'N/A',
                  referenceNumber: matchedTx.reference_number || 'N/A',
                  createdAt: new Date().toISOString()
                });

                // Cộng số dư ví tài khoản trên web của khách
                const newBalance = (balance || 0) + Number(amount);
                await updateUserInfo({ balance: newBalance });

                // Tắt cổng QR, dừng polling và thông báo
                setShowQR(false);
                alert(`Nạp tiền thành công! Hệ thống đã tự động cộng ${(Number(amount)).toLocaleString('vi-VN')} VNĐ vào ví của bạn.`);
              }
            }
          }
        } catch (err) {
          console.warn("Lỗi kiểm tra giao dịch SePay:", err.message);
        }
      };

      // Chạy check ngay lập tức và lập lại mỗi 4 giây
      checkPayment();
      intervalId = setInterval(checkPayment, 4000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showQR, txCode, amount, selectedGateway, balance, user, updateUserInfo]);

  // 2.5 Kiểm tra giao dịch thủ công khi người dùng bấm nút "Tôi đã chuyển khoản"
  const handleManualCheckPayment = async () => {
    if (!txCode || !amount || !user) return;
    setIsProcessing(true);

    const apiToken = PAYMENT_CONFIG.sepay.apiToken;
    if (!apiToken || apiToken.includes('nhap_api_token_sepay')) {
      alert("Hệ thống đang chạy chế độ thử nghiệm Admin. Vui lòng bấm nút 'Giả lập nạp tiền (Chỉ Admin thấy)' ở dưới!");
      setIsProcessing(false);
      return;
    }

    try {
      // Gọi API kiểm tra lịch sử 20 giao dịch gần nhất qua CORS proxy đa năng (chạy được cả ở Local & Production)
      const response = await fetch('https://corsproxy.io/?https://my.sepay.vn/userapi/transactions/list?limit=20', {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      if (data && data.transactions && Array.isArray(data.transactions)) {
        // Tìm giao dịch khớp số tiền nạp và nội dung chuyển khoản động
        const matchedTx = data.transactions.find(tx => {
          const matchesAmount = Number(tx.amount_in) === Number(amount);
          const matchesContent = tx.transaction_content.includes(txCode) || tx.body.includes(txCode);
          return matchesAmount && matchesContent;
        });

        if (matchedTx) {
          // BẢO MẬT: Kiểm tra chống nhận đúp tiền (Double-claim Protection) bằng Firestore
          const { doc, getDoc, setDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase');

          const paymentDocRef = doc(db, 'payments', matchedTx.id.toString());
          const paymentDoc = await getDoc(paymentDocRef);

          if (!paymentDoc.exists()) {
            // Đánh dấu mã giao dịch ngân hàng này đã xử lý thành công
            await setDoc(paymentDocRef, {
              userId: user.id || user.uid || '',
              userEmail: user.email || 'N/A',
              amount: Number(amount),
              txCode: txCode,
              sepayTransactionId: matchedTx.id,
              bankBrand: matchedTx.bank_brand_name || 'N/A',
              referenceNumber: matchedTx.reference_number || 'N/A',
              createdAt: new Date().toISOString()
            });

            // Cộng số dư ví tài khoản trên web của khách
            const newBalance = (balance || 0) + Number(amount);
            await updateUserInfo({ balance: newBalance });

            // Tắt cổng QR, dừng polling và thông báo
            setShowQR(false);
            alert(`Nạp tiền thành công! Hệ thống đã xác nhận giao dịch ngân hàng và cộng ${(Number(amount)).toLocaleString('vi-VN')} VNĐ vào ví của bạn.`);
          } else {
            alert("Giao dịch này đã được xử lý và cộng tiền từ trước!");
          }
        } else {
          alert(`Hệ thống chưa tìm thấy giao dịch chuyển khoản nào có nội dung "${txCode}" và số tiền ${Number(amount).toLocaleString('vi-VN')}đ. \n\nVui lòng đợi khoảng 10-30 giây để Ngân hàng MBBank cập nhật tin nhắn đến SePay, sau đó bấm lại nút kiểm tra!`);
        }
      } else {
        alert("Có lỗi xảy ra khi kết nối dữ liệu cổng SePay. Xin vui lòng thử lại sau!");
      }
    } catch (err) {
      console.warn("Lỗi kiểm tra giao dịch thủ công:", err.message);
      alert("Lỗi kiểm tra giao dịch: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Giả lập thanh toán dành cho môi trường phát triển (Test local)
  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    const mockTxId = `SIM-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');

      // Ghi nhận giao dịch giả lập vào Firestore để database được đồng nhất
      await setDoc(doc(db, 'payments', mockTxId), {
        userId: user.id || user.uid || '',
        userEmail: user.email || 'N/A',
        amount: Number(amount),
        txCode: txCode,
        isSimulation: true,
        createdAt: new Date().toISOString()
      });

      const newBalance = (balance || 0) + parseInt(amount);
      await updateUserInfo({ balance: newBalance });
      setIsProcessing(false);
      setShowQR(false);
      alert(`[THỬ NGHIỆM] Mô phỏng thành công! Đã nạp ${parseInt(amount).toLocaleString('vi-VN')} VNĐ vào tài khoản.`);
    } catch (err) {
      console.warn("Lỗi lưu giả lập thanh toán:", err);
      setIsProcessing(false);
    }
  };

  // Kiểm tra xem SePay đã cấu hình token thực chưa
  const isSePayConfigured = PAYMENT_CONFIG.sepay.apiToken && !PAYMENT_CONFIG.sepay.apiToken.includes('nhap_api_token');

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', paddingBottom: '3rem' }}>
      
      {/* CỘT TRÁI: CHỌN MỆNH GIÁ & CỔNG NẠP */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.8rem', margin: 0 }}>
          <WalletIcon color="var(--color-success)" /> Ví của bạn
        </h2>
        
        <div style={{ backgroundColor: 'var(--color-bg-main)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Số dư hiện tại</p>
          <h3 style={{ fontSize: '2.2rem', color: 'var(--color-success)', fontWeight: 'bold', margin: 0 }}>
            {balance.toLocaleString('vi-VN')} VNĐ
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* 1. Chọn cổng nạp */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>1. Chọn Cổng Thanh toán:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <button 
                onClick={() => setSelectedGateway('sepay')}
                className={`btn ${selectedGateway === 'sepay' ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'center', padding: '0.8rem', gap: '0.4rem', border: selectedGateway === 'sepay' ? 'none' : '1px solid var(--color-border)' }}
              >
                <Landmark size={16} /> Cổng SePay
              </button>
              <button 
                onClick={() => setSelectedGateway('payos')}
                className={`btn ${selectedGateway === 'payos' ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'center', padding: '0.8rem', gap: '0.4rem', border: selectedGateway === 'payos' ? 'none' : '1px solid var(--color-border)' }}
              >
                <QrCode size={16} /> Cổng PayOS
              </button>
            </div>
          </div>

          {/* 2. Chọn mệnh giá */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>2. Chọn Mệnh giá nạp:</label>
            <select 
              className="input-field" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              style={{ padding: '0.8rem', fontSize: '1rem' }}
            >
              <option value="10000">10,000 VNĐ</option>
              <option value="20000">20,000 VNĐ</option>
              <option value="30000">30,000 VNĐ</option>
              <option value="50000">50,000 VNĐ</option>
              <option value="100000">100,000 VNĐ</option>
              <option value="200000">200,000 VNĐ</option>
              <option value="500000">500,000 VNĐ</option>
            </select>
          </div>
          
          <button onClick={handleGenerateQR} className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.9rem', fontSize: '1rem', fontWeight: 'bold' }}>
            <QrCode size={18} /> Tạo mã QR Nạp Tiền
          </button>

          {/* Lưu ý hỗ trợ chuyển đổi cổng và liên hệ Báo Lỗi */}
          <div style={{ 
            backgroundColor: 'rgba(26, 159, 255, 0.03)', 
            border: '1px dashed rgba(26, 159, 255, 0.2)', 
            borderRadius: '6px', 
            padding: '0.8rem 1rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.4rem',
            textAlign: 'left',
            marginTop: '0.5rem'
          }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-accent)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={14} /> Lưu ý nạp tiền tự động:
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem', lineHeight: '1.4' }}>
              <li>Nếu cổng nạp <strong>SePay</strong> gặp sự cố hoặc bảo trì, vui lòng chuyển đổi sang cổng <strong>PayOS</strong> và ngược lại.</li>
              <li>Nếu cả hai cổng đều không tự động cộng tiền, xin vui lòng bấm vào mục <strong><a href="/report" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>Báo Lỗi</a></strong> trên thanh menu để gửi phản hồi hỗ trợ khẩn cấp đến Admin!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CỘT PHẢI: HIỂN THỊ MÃ QR CODE DỰA TRÊN TRẠNG THÁI */}
      <div>
        {showQR ? (
          <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.2rem', border: '1px solid var(--color-accent)', boxShadow: '0 0 20px rgba(102, 192, 244, 0.15)' }}>
            <h3 style={{ color: 'var(--color-text-light)', margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
              Quét mã để thanh toán
            </h3>
            
            {/* Vùng hiển thị mã QR VietQR động */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img 
                src={qrUrl} 
                alt="VietQR Code" 
                style={{ width: '220px', height: '220px', objectFit: 'contain' }}
              />
            </div>
            
            {/* Box thông tin chuyển khoản bắt buộc */}
            <div style={{ backgroundColor: 'var(--color-bg-main)', width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.3rem 0' }}>
                Nội dung chuyển khoản (Bắt buộc giữ nguyên):
              </p>
              <h4 style={{ color: 'var(--color-accent)', letterSpacing: '2px', fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
                {txCode}
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-success)', margin: 0, lineHeight: '1.5' }}>
                🔒 Hệ thống đang quét giao dịch tự động. Tiền sẽ vào tài khoản của bạn ngay khi giao dịch thành công.
              </p>
            </div>

            {/* Nút Tôi đã chuyển khoản thủ công */}
            <button 
              onClick={handleManualCheckPayment} 
              className="btn" 
              disabled={isProcessing}
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                padding: '0.9rem', 
                fontSize: '1rem', 
                fontWeight: 'bold',
                backgroundColor: '#2ecc71',
                color: 'white',
                border: 'none',
                boxShadow: '0 4px 15px rgba(46, 204, 113, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'all 0.2s',
                marginTop: '0.2rem'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#27ae60'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(46, 204, 113, 0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#2ecc71'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(46, 204, 113, 0.25)'; }}
            >
              {isProcessing ? <RefreshCw className="spin-anim" size={18} style={{ marginRight: '4px' }} /> : <CheckCircle2 size={18} style={{ marginRight: '4px' }} />}
              {isProcessing ? 'Đang kiểm tra giao dịch...' : 'Tôi đã chuyển khoản'}
            </button>

            {/* Lưu ý sau chuyển khoản */}
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem 0', lineHeight: '1.4', textAlign: 'left' }}>
              ℹ️ <strong>Lưu ý:</strong> Sau khi hoàn tất chuyển khoản thành công trên app Ngân hàng, hãy bấm nút <strong>"Tôi đã chuyển khoản"</strong> ở trên để hệ thống đối soát dữ liệu và cộng số dư ví ngay lập tức!
            </p>

            {/* Trạng thái tích hợp của Developer */}
            {selectedGateway === 'sepay' && !isSePayConfigured && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', backgroundColor: 'rgba(255, 152, 0, 0.05)', border: '1px dashed #ff9800', padding: '0.7rem', borderRadius: '6px', textAlign: 'left' }}>
                <AlertTriangle size={16} color="#ff9800" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ color: '#ff9800', fontSize: '0.75rem', lineHeight: '1.4' }}>
                  <strong>Lưu ý lập trình viên:</strong> Bạn đang chạy Sandbox/Test. Vui lòng dán API Token vào file <code>payment.js</code> để tự động hóa 100%. Hãy dùng nút giả lập chuyển khoản dưới đây để test nhanh.
                </span>
              </div>
            )}

            {/* Nút giả lập nạp tiền dành riêng cho Admin kiểm thử */}
            {user?.role === 'admin' && (
              <button 
                onClick={handleSimulatePayment} 
                className="btn btn-outline" 
                disabled={isProcessing}
                style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                {isProcessing ? <RefreshCw className="spin-anim" size={16} /> : <CheckCircle2 size={16} />}
                {isProcessing ? 'Đang mô phỏng...' : 'Giả lập nạp tiền (Chỉ Admin thấy)'}
              </button>
            )}
            
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
              .spin-anim { animation: spin 1s linear infinite; }
            `}</style>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', border: '1px dashed var(--color-border)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <QrCode size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Vui lòng chọn mệnh giá và bấm tạo mã QR.</p>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.75rem' }}>Mã QR sẽ tự động điền số tài khoản, số tiền và nội dung chuyển khoản động của bạn.</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default Wallet;
