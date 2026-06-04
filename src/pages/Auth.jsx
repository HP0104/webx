import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, Mail } from 'lucide-react';
import { authService } from '../services/authService';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isReset) {
        await authService.resetPassword(username);
        alert('Email đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư của bạn.');
        setIsReset(false);
        setIsLogin(true);
      } else if (isLogin) {
        await authService.loginWithEmailOrUsername(username, password);
      } else {
        await authService.registerWithEmail(username, password);
        alert('Đăng ký thành công! Một email xác nhận đã được gửi tới ' + username + '. Vui lòng kiểm tra hộp thư của bạn.');
        setIsLogin(true);
      }
    } catch (err) {
      console.error(err);
      let msg = 'Có lỗi xảy ra!';
      if (err.code === 'auth/email-already-in-use') msg = 'Email này đã được sử dụng!';
      if (err.code === 'auth/weak-password') msg = 'Mật khẩu quá yếu (tối thiểu 6 ký tự)!';
      if (err.code === 'auth/invalid-email') msg = 'Email không hợp lệ!';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Email hoặc mật khẩu không đúng!';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await authService.loginWithGoogle();
    } catch (error) {
      console.error(error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setError('Lỗi đăng nhập Google: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <LogIn size={48} color="var(--color-accent)" style={{ margin: '0 auto' }} />
          <h2 style={{ color: 'var(--color-text-light)', textAlign: 'center', marginBottom: '2rem' }}>
          {isReset ? 'Đặt lại mật khẩu' : (isLogin ? 'Đăng Nhập' : 'Đăng Ký')}
        </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Tên đăng nhập hoặc Email</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Username hoặc example@gmail.com"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          
          {!isReset && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="input-field" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {isLogin && !isReset && (
            <div style={{ textAlign: 'right' }}>
              <span 
                onClick={() => setIsReset(true)} 
                style={{ color: 'var(--color-accent)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Quên mật khẩu?
              </span>
            </div>
          )}

          {error && <div style={{ color: '#ff4d4f', fontSize: '0.85rem', textAlign: 'center', backgroundColor: 'rgba(255, 77, 79, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: '1rem', padding: '0.75rem' }}>
            {isReset ? 'Gửi Email đặt lại' : (isLogin ? 'Đăng Nhập' : 'Đăng Ký')}
          </button>
          
          {isReset && (
            <button type="button" onClick={() => setIsReset(false)} className="btn btn-outline" style={{ justifyContent: 'center', padding: '0.75rem' }}>
              Quay lại
            </button>
          )}
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>HOẶC</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          className="btn btn-outline" 
          style={{ width: '100%', justifyContent: 'center', gap: '0.7rem', padding: '0.75rem', borderColor: '#4285F4', color: '#4285F4' }}
        >
          <Mail size={20} /> Tiếp tục với Google
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-muted)' }}>
          {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <span 
            style={{ color: 'var(--color-accent)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Tạo ngay' : 'Đăng nhập'}
          </span>
        </div>
      </div>

      <div style={{ marginTop: '2rem', backgroundColor: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: '4px', borderLeft: '4px solid var(--color-accent)' }}>
        <h4 style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>🔐 Hệ thống Tài khoản Thực:</h4>
        <ul style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.8', listStyle: 'none', padding: 0 }}>
          <li>✅ Hỗ trợ đăng nhập bằng <strong>Gmail</strong> (nhanh & bảo mật).</li>
          <li>📧 Đăng ký bằng Email riêng cần <strong>xác nhận hộp thư</strong> để kích hoạt đầy đủ tính năng.</li>
          <li>🛡️ Toàn bộ dữ liệu được bảo vệ bởi Firebase Security.</li>
        </ul>
      </div>
    </div>
  );
}

export default Auth;
