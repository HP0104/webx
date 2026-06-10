import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, QrCode, CheckCircle2, RefreshCw, AlertTriangle, Landmark, Info } from 'lucide-react';
import { useAppContext } from '../App';
import { PAYMENT_CONFIG } from '../config/payment';

// Multi-proxy fallback for CORS-restricted APIs
const fetchWithCorsProxy = async (url, options = {}) => {
  const { headers = {}, ...restOptions } = options;

  // 1. Thử gọi trực tiếp trước
  try {
    const directResponse = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
    if (directResponse.ok) return directResponse;
  } catch {
    // Direct fetch failed, try proxies
  }

  // 2. Dùng các CORS proxy hỗ trợ truyền headers
  const proxies = [
    { getUrl: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`, forwardHeaders: true },
    { getUrl: (u) => `https://proxy.corsfix.com/?${u}`, forwardHeaders: true },
    { getUrl: (u) => `https://api.cors.lol/?url=${encodeURIComponent(u)}`, forwardHeaders: true },
    { getUrl: (u) => `https://thingproxy.freeboard.io/fetch/${u}`, forwardHeaders: true },
    { getUrl: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, forwardHeaders: false },
    { getUrl: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`, forwardHeaders: false }
  ];

  const hasCustomHeaders = Object.keys(headers).some(h => h !== 'Content-Type');

  for (const proxy of proxies) {
    if (hasCustomHeaders && !proxy.forwardHeaders) continue;
    try {
      const fetchOptions = {
        ...restOptions,
        signal: AbortSignal.timeout(10000),
        headers: proxy.forwardHeaders ? headers : {}
      };
      const response = await fetch(proxy.getUrl(url), fetchOptions);
      if (response.ok) return response;
    } catch {
      continue;
    }
  }
  throw new Error('Không thể kết nối đến cổng thanh toán. Vui lòng thử lại sau hoặc liên hệ Admin.');
};

// Tạo HMAC-SHA256 cho PayOS signature
const generatePayOSSignature = async (data, checksumKey) => {
  const sortedKeys = Object.keys(data).sort();
  const signData = sortedKeys.map(key => `${key}=${data[key]}`).join('&');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(checksumKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signData));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
};

function Wallet() {
  const { balance, updateUserInfo, user } = useAppContext();
  const [amount, setAmount] = useState('50000');
  const [selectedGateway, setSelectedGateway] = useState('sepay');
  const [showQR, setShowQR] = useState(false);
  const [txCode, setTxCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [payosCheckoutUrl, setPayosCheckoutUrl] = useState('');
  const [payosOrderCode, setPayosOrderCode] = useState(null); // Lưu orderCode PayOS để kiểm tra sau

  // Kiểm tra token hợp lệ
  const isSePayTokenValid = (() => {
    const token = PAYMENT_CONFIG.sepay.apiToken;
    return token && token.length > 10 && !token.includes('nhap_api_token');
  })();

  const isPayOSConfigured = (() => {
    const { apiKey, clientId, checksumKey } = PAYMENT_CONFIG.payos;
    return apiKey && clientId && checksumKey && !apiKey.includes('nhap_');
  })();

  // 1. Tạo mã QR động dựa trên cổng thanh toán
  const handleGenerateQR = async () => {
    if (!user) return alert('Vui lòng đăng nhập để thực hiện nạp tiền!');

    const code = `WEBX${Math.floor(100000 + Math.random() * 900000)}`;
    setTxCode(code);
    setPayosOrderCode(null);
    setPayosCheckoutUrl('');

    // Tạo document nạp tiền ở trạng thái 'pending' trên Firestore trước
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await setDoc(doc(db, 'payments', code), {
        userId: user.id || user.uid || '',
        userEmail: user.email || 'N/A',
        amount: Number(amount),
        txCode: code,
        gateway: selectedGateway,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Không thể khởi tạo giao dịch trên Firestore:', err.message);
    }

    if (selectedGateway === 'sepay') {
      const { bankId, accountNumber } = PAYMENT_CONFIG.sepay;
      const bankName = bankId === 'MB' ? 'MBBank' : bankId;
      const generatedQrUrl = `https://qr.sepay.vn/img?bank=${bankName}&acc=${accountNumber}&template=compact&amount=${amount}&des=${code}`;
      setQrUrl(generatedQrUrl);
      setShowQR(true);
    } else {
      // PayOS: Tạo đơn hàng qua PayOS API để có orderCode kiểm tra sau
      if (isPayOSConfigured) {
        try {
          const { apiKey, clientId, checksumKey } = PAYMENT_CONFIG.payos;
          const orderCode = Math.floor(100000 + Math.random() * 900000);

          const orderData = {
            orderCode,
            amount: Number(amount),
            description: code,
            cancelUrl: window.location.href,
            returnUrl: window.location.href
          };

          const signature = await generatePayOSSignature(orderData, checksumKey);

          const response = await fetchWithCorsProxy('https://api-merchant.payos.vn/v2/payment-requests', {
            method: 'POST',
            headers: {
              'x-client-id': clientId,
              'x-api-key': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...orderData, signature })
          });

          const result = await response.json();

          if (result.code === '00' && result.data) {
            // Chuyển đổi mã QR raw dạng text của PayOS thành ảnh QR qua qrserver.com
            const qrCodeUrl = result.data.qrCode 
              ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(result.data.qrCode)}`
              : `https://qr.sepay.vn/img?bank=${PAYMENT_CONFIG.payos.bankId === 'MB' ? 'MBBank' : PAYMENT_CONFIG.payos.bankId}&acc=${PAYMENT_CONFIG.payos.accountNumber}&template=compact&amount=${amount}&des=${code}`;
            
            setQrUrl(qrCodeUrl);
            setPayosCheckoutUrl(result.data.checkoutUrl || '');
            setPayosOrderCode(orderCode);
            setShowQR(true);
            return;
          }
        } catch (err) {
          console.warn('PayOS order creation failed, fallback to VietQR:', err.message);
        }
      }

      // Fallback: dùng SePay QR cho tài khoản PayOS nếu PayOS API fail
      const { bankId, accountNumber } = PAYMENT_CONFIG.payos;
      const bankName = bankId === 'MB' ? 'MBBank' : bankId;
      const generatedQrUrl = `https://qr.sepay.vn/img?bank=${bankName}&acc=${accountNumber}&template=compact&amount=${amount}&des=${code}`;
      setQrUrl(generatedQrUrl);
      setShowQR(true);
    }
  };

  // 2. Kiểm tra giao dịch — CHỈ khi bấm nút "Tôi đã chuyển khoản"
  const handleManualCheckPayment = async () => {
    if (!txCode || !amount || !user) return;
    setIsProcessing(true);

    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const paymentRef = doc(db, 'payments', txCode);
      const paymentSnap = await getDoc(paymentRef);
      
      if (paymentSnap.exists()) {
        const paymentData = paymentSnap.data();
        if (paymentData.status === 'completed' || paymentData.status === 'success') {
          // Lấy lại thông tin user để cập nhật state số dư mới
          const userSnap = await getDoc(doc(db, 'users', user.id));
          if (userSnap.exists()) {
            await updateUserInfo({ balance: userSnap.data().balance });
          }
          setShowQR(false);
          alert(`Nạp tiền thành công! Đã cộng ${Number(amount).toLocaleString('vi-VN')} VNĐ vào ví của bạn.`);
          return;
        }
      }
      
      alert(`Hệ thống chưa nhận được khoản thanh toán cho mã "${txCode}".\n\nVui lòng đợi 10-30 giây để ngân hàng xử lý và gửi thông báo, sau đó bấm lại nút kiểm tra!`);
    } catch (err) {
      console.warn('Lỗi kiểm tra giao dịch:', err.message);
      alert('Lỗi kiểm tra giao dịch: ' + err.message);
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

      await setDoc(doc(db, 'payments', mockTxId), {
        userId: user.id || user.uid || '',
        userEmail: user.email || 'N/A',
        amount: Number(amount),
        txCode: txCode,
        isSimulation: true,
        gateway: selectedGateway,
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

  const isGatewayConfigured = selectedGateway === 'sepay' ? isSePayTokenValid : isPayOSConfigured;

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
            
            {/* Vùng hiển thị mã QR */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img 
                src={qrUrl} 
                alt="VietQR Code" 
                style={{ width: '220px', height: '220px', objectFit: 'contain' }}
              />
            </div>

            {selectedGateway === 'payos' && payosCheckoutUrl && (
              <a 
                href={payosCheckoutUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-outline"
                style={{ 
                  width: '100%', 
                  justifyContent: 'center', 
                  fontSize: '0.9rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem',
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent)',
                  boxShadow: '0 0 10px rgba(102, 192, 244, 0.1)'
                }}
              >
                🚀 Mở trang thanh toán PayOS
              </a>
            )}
            
            {/* Box thông tin chuyển khoản bắt buộc */}
            <div style={{ backgroundColor: 'var(--color-bg-main)', width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.3rem 0' }}>
                Nội dung chuyển khoản (Bắt buộc giữ nguyên):
              </p>
              <h4 style={{ color: 'var(--color-accent)', letterSpacing: '2px', fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
                {txCode}
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.5' }}>
                🏦 Cổng thanh toán: <strong style={{ color: 'var(--color-accent)' }}>{selectedGateway === 'sepay' ? 'SePay' : 'PayOS'}</strong>
              </p>
            </div>

            {/* Nút Tôi đã chuyển khoản */}
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

            {/* HƯỚNG DẪN THANH TOÁN CHI TIẾT */}
            <div style={{ 
              width: '100%', 
              backgroundColor: 'rgba(82, 196, 26, 0.03)', 
              border: '1px dashed rgba(82, 196, 26, 0.2)', 
              borderRadius: '8px', 
              padding: '1rem', 
              textAlign: 'left',
              boxShadow: 'inset 0 0 15px rgba(82, 196, 26, 0.02)'
            }}>
              <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Info size={14} /> Hướng dẫn thanh toán:
              </p>
              <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.5' }}>
                <li>Mở ứng dụng <strong>Ngân hàng</strong> hoặc <strong>Ví điện tử</strong> trên điện thoại.</li>
                <li>Chọn <strong>Quét mã QR</strong> và quét mã ở trên (số tiền và nội dung sẽ được tự động điền).</li>
                <li>Kiểm tra nội dung chuyển khoản phải là <strong style={{ color: 'var(--color-accent)' }}>{txCode}</strong> — <span style={{ color: '#ff4d4f' }}>không được tự ý sửa đổi!</span></li>
                <li>Xác nhận chuyển khoản trên app Ngân hàng và <strong>đợi giao dịch thành công</strong>.</li>
                <li>Quay lại đây và bấm nút <strong style={{ color: 'var(--color-success)' }}>"Tôi đã chuyển khoản"</strong> để hệ thống kiểm tra và tự động cộng tiền.</li>
              </ol>
              <p style={{ margin: '0.6rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: '1.4' }}>
                ⏱️ Sau khi chuyển khoản, vui lòng đợi <strong>10-30 giây</strong> để ngân hàng xử lý trước khi bấm kiểm tra. Mỗi lần bấm nút sẽ gọi kiểm tra 1 lần trực tiếp qua cổng <strong>{selectedGateway === 'sepay' ? 'SePay' : 'PayOS'}</strong>.
              </p>
            </div>

            {/* Trạng thái tích hợp của Developer */}
            {!isGatewayConfigured && user?.role === 'admin' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', backgroundColor: 'rgba(255, 152, 0, 0.05)', border: '1px dashed #ff9800', padding: '0.7rem', borderRadius: '6px', textAlign: 'left', width: '100%' }}>
                <AlertTriangle size={16} color="#ff9800" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ color: '#ff9800', fontSize: '0.75rem', lineHeight: '1.4' }}>
                  <strong>Lưu ý lập trình viên:</strong> Cổng {selectedGateway === 'sepay' ? 'SePay' : 'PayOS'} chưa cấu hình đầy đủ. Vui lòng kiểm tra file <code>payment.js</code>. Hãy dùng nút giả lập dưới đây để test.
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
            `}
            </style>
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
