import { useState } from 'react';
import { User, Wallet, Gamepad2, Download, Save, Mail, Lock, ShieldCheck, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { updatePassword, updateEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { getGamePath } from '../utils/gameRoutes';
import { formatOwnershipDate, getGameOwnership } from '../utils/ownership';

function Profile() {
  const { user, balance, ownedGames, games, updateUserInfo } = useAppContext();
  const [isEditing, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    photoURL: user?.photoURL || '',
    newPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const myGames = games
    .map(game => ({
      game,
      ownership: getGameOwnership(ownedGames, game.id)
    }))
    .filter(item => item.ownership.record);
  const activeGamesCount = myGames.filter(item => item.ownership.isActive).length;

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Kích thước file ảnh đại diện không được vượt quá 2MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          photoURL: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Update Username and Avatar in Firestore
      if (formData.username !== user.username || formData.photoURL !== user.photoURL) {
        await updateUserInfo({ 
          username: formData.username,
          photoURL: formData.photoURL
        });
      }

      // 2. Update Email if changed (Firebase Auth)
      if (formData.email !== user.email) {
        await updateEmail(auth.currentUser, formData.email);
        await updateUserInfo({ email: formData.email });
      }

      // 3. Update Password if provided
      if (formData.newPassword) {
        await updatePassword(auth.currentUser, formData.newPassword);
      }

      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      setIsMenuOpen(false);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Lỗi: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in profile-page" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="section-header">
        <h2 className="section-title">Hồ sơ Tài khoản</h2>
        <div className="section-line"></div>
      </div>

      {message.text && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '8px', 
          backgroundColor: message.type === 'success' ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)',
          color: message.type === 'success' ? '#52c41a' : '#ff4d4f',
          border: `1px solid ${message.type === 'success' ? '#52c41a' : '#ff4d4f'}`
        }}>
          {message.text}
        </div>
      )}

      <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--color-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {user?.photoURL ? <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : <User size={32} color="white" />}
              </div>
              <div>
                <h2 style={{ color: 'var(--color-text-light)' }}>{user?.username}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-success)', fontSize: '0.85rem' }}>
                  <ShieldCheck size={14} />
                  <span>{user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</span>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <Wallet size={16} /> Số dư ví
              </div>
              <div style={{ fontSize: '1.6rem', color: 'var(--color-accent)', fontWeight: 'bold' }}>
                {balance.toLocaleString('vi-VN')} đ
              </div>
              <Link to="/wallet" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                Nạp thêm tiền
              </Link>
            </div>

            {!isEditing ? (
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setIsMenuOpen(true)}>
                Chỉnh sửa thông tin
              </button>
            ) : (
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setIsMenuOpen(false)}>
                Hủy chỉnh sửa
              </button>
            )}
          </div>
        </div>

        <div className="card">
          {!isEditing ? (
            <>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-light)', marginBottom: '2rem' }}>
                <Gamepad2 /> Thư viện Game ({activeGamesCount})
              </h2>

              {myGames.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-muted)' }}>
                  <Gamepad2 size={48} style={{ opacity: 0.2, margin: '0 auto 1.5rem' }} />
                  <p>Bạn chưa sở hữu tựa game nào.</p>
                  <Link to="/" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                    Khám phá cửa hàng
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {myGames.map(({ game, ownership }) => {
                    const expiresAtText = formatOwnershipDate(ownership.record?.expiresAt);
                    const isActive = ownership.isActive;

                    return (
                    <div key={game.id} className="profile-library-item" style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                      <img src={game.image} alt={game.title} style={{ width: '140px', height: '90px', objectFit: 'cover' }} />
                      <div className="profile-library-body" style={{ padding: '1rem', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ color: 'var(--color-text-light)', fontSize: '1rem', marginBottom: '0.3rem' }}>{game.title}</h3>
                          <span style={{ color: isActive ? 'var(--color-success)' : '#ff7875', fontSize: '0.75rem', fontWeight: '600' }}>
                            {isActive ? 'SẴN SÀNG' : 'HẾT HẠN'}
                          </span>
                          {expiresAtText && (
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                              {isActive ? 'Hạn sở hữu đến' : 'Đã hết hạn'}: {expiresAtText}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.45rem' }}>
                          {isActive ? (
                            <>
                              <a href={game.downloadUrl || '#'} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                <Download size={16} /> Tải game
                              </a>
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textAlign: 'right' }}>
                                Mật khẩu giải nén: <strong style={{ color: 'var(--color-text-light)' }}>web18p.xyz</strong>
                              </span>
                            </>
                          ) : (
                            <Link to={getGamePath(game)} className="btn btn-success" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                              <ShoppingCart size={16} /> Mua lại
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleUpdateProfile}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-light)', marginBottom: '2rem' }}>
                Thay đổi thông tin
              </h2>

              {/* Avatar file upload with preview */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <label className="form-label">Ảnh đại diện mới (Tải lên từ máy)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--color-bg-secondary)', overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {formData.photoURL ? (
                      <img src={formData.photoURL} alt="Avatar preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={24} style={{ color: 'var(--color-text-muted)' }} />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarChange} 
                    style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }} 
                  />
                </div>
              </div>

              <div className="profile-form-grid">
                <div className="form-group">
                  <label className="form-label">Tên hiển thị</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input 
                      type="text" 
                      className="input-field" 
                      style={{ paddingLeft: '3rem' }}
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input 
                      type="email" 
                      className="input-field" 
                      style={{ paddingLeft: '3rem' }}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu mới (Để trống nếu không đổi)</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input 
                    type="password" 
                    className="input-field" 
                    style={{ paddingLeft: '3rem' }}
                    placeholder="Nhập mật khẩu mới..."
                    value={formData.newPassword}
                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Đang lưu...' : <><Save size={18} /> Lưu thay đổi</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
