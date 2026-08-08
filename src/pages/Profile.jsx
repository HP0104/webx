import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Wallet, Gamepad2, Download, Save, Mail, Lock, ShieldCheck, ShoppingCart, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { updatePassword, updateEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { getGamePath } from '../utils/gameRoutes';
import { formatOwnershipDate, getGameOwnership } from '../utils/ownership';
import fluidPlayer from 'fluid-player';
import 'fluid-player/src/css/fluidplayer.css';

function Profile() {
  const { user, balance, ownedGames, games, updateUserInfo, logout, claimAdFreeTime } = useAppContext();
  const [isEditing, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    photoURL: user?.photoURL || '',
    newPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [showAdModal, setShowAdModal] = useState(false);
  const videoPlayerRef = useRef(null);
  const fluidPlayerInstance = useRef(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (user?.adFreeUntil && Date.now() < user.adFreeUntil) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, user.adFreeUntil - Date.now());
        setTimeRemaining(remaining);
        if (remaining === 0) clearInterval(interval);
      }, 1000);
      // init call
      const initRemaining = Math.max(0, user.adFreeUntil - Date.now());
      setTimeRemaining(initRemaining);
      return () => clearInterval(interval);
    } else {
      setTimeRemaining(0);
    }
  }, [user?.adFreeUntil]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (showAdModal && videoPlayerRef.current) {
      fluidPlayerInstance.current = fluidPlayer(videoPlayerRef.current, {
        layoutControls: {
          controlsBarText: 'Quảng cáo sẽ giúp duy trì server, cảm ơn bạn!',
          allowTheatre: false,
          playPauseAnimation: false,
          playButtonShowing: true,
          fillToContainer: true,
          autoPlay: true,
          mute: false
        },
        vastOptions: {
          allowVPAID: true,
          adList: [
            {
              roll: 'preRoll',
              vastTag: 'https://s.magsrv.com/v1/vast.php?idz=5997948'
            }
          ]
        }
      });
      
      const player = fluidPlayerInstance.current;

      player.on('ended', async () => {
        // Cộng phút ngẫu nhiên 3 - 7
        const randomMinutes = Math.floor(Math.random() * (7 - 3 + 1)) + 3;
        const success = await claimAdFreeTime(randomMinutes);
        if (success) {
          setMessage({ type: 'success', text: `Chúc mừng! Bạn đã nhận được ${randomMinutes} phút không có quảng cáo (Popup)!` });
        } else {
          setMessage({ type: 'error', text: 'Nhận thưởng thất bại. Vui lòng đợi 3 phút nếu bạn vừa nhận xong.' });
        }
        setShowAdModal(false);
      });
    }
    
    return () => {
      if (fluidPlayerInstance.current) {
        fluidPlayerInstance.current.destroy();
        fluidPlayerInstance.current = null;
      }
    };
  }, [showAdModal]);
  
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setIsMenuOpen(true)}>
                  Chỉnh sửa thông tin
                </button>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', backgroundColor: 'rgba(255, 83, 83, 0.1)', color: '#ff5353', border: '1px solid #ff5353' }}>
                    <ShieldCheck size={18} style={{ marginRight: '0.4rem' }} /> Quản lý Admin
                  </Link>
                )}
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', backgroundColor: 'rgba(255, 83, 83, 0.1)', color: '#ff5353', border: '1px solid #ff5353' }} onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                    logout();
                  }
                }}>
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setIsMenuOpen(false)}>
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          <div className="card" style={{ marginTop: '1.5rem', background: 'linear-gradient(135deg, rgba(235, 172, 38, 0.1), rgba(255, 255, 255, 0.05))', border: '1px solid rgba(235, 172, 38, 0.2)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-light)', marginBottom: '1rem', fontSize: '1.2rem' }}>
              🌟 Trải nghiệm Không Quảng Cáo
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Xem một video quảng cáo ngắn để nhận ngẫu nhiên <strong style={{color: '#ebac26'}}>3 đến 7 phút</strong> loại bỏ hoàn toàn các quảng cáo nhảy tab (Popup) khó chịu. Số phút có thể cộng dồn!
            </p>
            
            {timeRemaining > 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <div style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Bạn đang trong thời gian ưu tiên</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>
                  {formatTime(timeRemaining)}
                </div>
                <button 
                  className="btn btn-outline" 
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
                  onClick={() => setShowAdModal(true)}
                >
                  <Play size={16} /> Xem tiếp để cộng dồn
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', backgroundColor: '#ebac26', color: '#000', border: 'none', fontWeight: 'bold' }}
                onClick={() => setShowAdModal(true)}
              >
                <Play size={18} fill="#000" /> Xem Video Nhận Thưởng
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
                              <a 
                                href={game.downloadUrl || '#'} 
                                target={game.downloadUrl ? "_blank" : "_self"} 
                                rel="noreferrer" 
                                className="btn btn-primary" 
                                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                onClick={(e) => {
                                  if (!game.downloadUrl) e.preventDefault();
                                }}
                              >
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

      {showAdModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.95)',
          zIndex: 9999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '900px', 
            position: 'relative',
            backgroundColor: '#000',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            <button 
              onClick={() => {
                if(window.confirm('Bạn sẽ không nhận được phần thưởng nếu đóng quảng cáo giữa chừng! Bạn chắc chứ?')) {
                  setShowAdModal(false);
                }
              }} 
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                zIndex: 10,
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)'
              }}
            >
              Đóng
            </button>
            {/* Thẻ video rỗng không có src để khi VAST kết thúc, nó trigger luôn ended */}
            <video ref={videoPlayerRef} style={{ width: '100%', height: '100%', aspectRatio: '16/9' }}></video>
          </div>
          <div style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
            Vui lòng xem hết (các) video quảng cáo để nhận thưởng... <br/>
            <span style={{fontSize: '0.8rem', opacity: 0.7}}>Quảng cáo có thể phát tự động 2-3 lần liên tục.</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Profile;
