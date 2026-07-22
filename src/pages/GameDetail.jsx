import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Download, ArrowLeft, Monitor, History, Calendar } from 'lucide-react';
import { useAppContext } from '../App';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { findGameByRouteParam, getGamePath } from '../utils/gameRoutes';
import { formatOwnershipDate, getGameOwnership } from '../utils/ownership';
import ErrorReportButton from '../components/ErrorReportButton';

function GameDetail() {
  const { gameSlug } = useParams();
  const navigate = useNavigate();
  const { user, buyGame, ownedGames, games } = useAppContext();
  
  const game = findGameByRouteParam(games, gameSlug);

  useEffect(() => {
    if (!game || gameSlug === getGamePath(game).split('/').pop()) return;
    navigate(getGamePath(game), { replace: true });
  }, [game, gameSlug, navigate]);

  // Tự động tăng lượt xem (views) khi người dùng truy cập trang chi tiết game này
  useEffect(() => {
    if (!game?.id) return;
    const incrementViews = async () => {
      try {
        const gameRef = doc(db, 'games', game.id.toString());
        await updateDoc(gameRef, {
          views: increment(1)
        });
      } catch (err) {
        console.warn("Failed to increment views:", err.message);
      }
    };
    incrementViews();
  }, [game?.id]);

  if (!game) {
    return <div style={{ color: 'white', textAlign: 'center', marginTop: '4rem' }}>Không tìm thấy game!</div>;
  }

  const ownership = getGameOwnership(ownedGames, game.id);
  const isOwned = ownership.isActive;
  const expiresAtText = formatOwnershipDate(ownership.record?.expiresAt);

  const handleBuy = async () => {
    if (!user) return alert('Vui lòng đăng nhập để mua game!');
    const result = await buyGame(game);

    if (result?.ok && result?.reason === 'already_owned') {
      alert('Bạn vẫn còn quyền sở hữu game này.');
    } else if (result?.ok) {
      alert(`Mua game thành công! Bạn có thể tải game trong 2 tháng${result.ownership?.expiresAt ? `, đến ngày ${formatOwnershipDate(result.ownership.expiresAt)}` : ''}.`);
    } else if (result?.reason === 'save_failed') {
      alert('Mua game thất bại do không lưu được vào tài khoản. Vui lòng thử lại.');
    } else {
      alert('Số dư không đủ, vui lòng nạp thêm tiền!');
    }
  };

  return (
    <div className="game-detail-page" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      <button onClick={() => navigate(-1)} className="btn" style={{ background: 'transparent', color: 'var(--color-text-muted)', marginBottom: '1.5rem', padding: '0' }}>
        <ArrowLeft size={20} /> Quay lại
      </button>
      
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <img className="detail-hero-image" src={game.image} alt={game.title} style={{ width: '100%', height: '400px', objectFit: 'cover' }} />
        
        <div className="detail-body-grid" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div>
            <h1 style={{ color: 'var(--color-text-light)', fontSize: '2.5rem', marginBottom: '1rem' }}>{game.title}</h1>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {game.tags && (Array.isArray(game.tags) ? game.tags : game.tags.split(',')).map(tag => (
                <span key={tag} style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', color: 'var(--color-text-muted)' }}>
                  {tag.trim()}
                </span>
              ))}
            </div>

            <p style={{ color: 'var(--color-text-main)', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
              {game.description}
            </p>

            <div className="detail-info-list" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              <span>Nhà phát triển:</span>
              <span style={{ color: 'var(--color-accent)' }}>{game.developer}</span>
              
              <span>Lượt xem:</span>
              <span style={{ color: '#ff6262', fontWeight: 'bold' }}>🔥 {(game.views || 0).toLocaleString('vi-VN')} lượt xem</span>

              <span>Ngày phát hành:</span>
              <span>{game.releaseDate}</span>

              {game.updatedAt && (
                <>
                  <span>Cập nhật mới nhất:</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>
                    {new Date(game.updatedAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </>
              )}
            </div>

            {/* Ảnh Minh Họa Section */}
            <div style={{ marginTop: '3rem' }}>
              <h3 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600', borderLeft: '4px solid var(--color-accent)', paddingLeft: '1rem' }}>
                Ảnh Minh Họa
              </h3>
              <div className="detail-screenshot-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {game.screenshots && (Array.isArray(game.screenshots) ? game.screenshots : game.screenshots.split(',')).map((src, i) => (
                  <div key={i} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)', transition: 'transform 0.3s ease' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <img src={src.trim()} alt={`screenshot-${i}`} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(src.trim(), '_blank')} />
                  </div>
                ))}
                {!game.screenshots && (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Chưa có ảnh minh họa cho trò chơi này.</div>
                )}
              </div>
            </div>

            {/* Cấu hình hệ thống */}
            <div style={{ marginTop: '3rem', backgroundColor: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
              <h3 style={{ color: 'var(--color-text-light)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Monitor size={20} color="var(--color-accent)" /> Cấu hình Yêu cầu Hệ thống
              </h3>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {game.systemRequirements ? (
                  game.systemRequirements.split('\n').map((line, i) => (
                    <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.3rem 0' }}>{line}</div>
                  ))
                ) : (
                  'Chưa có thông tin cấu hình cho trò chơi này.'
                )}
              </div>
            </div>

            {/* Lịch sử Cập nhật (Timeline) Section */}
            <div style={{ 
              marginTop: '3rem', 
              backgroundColor: 'var(--color-bg-secondary)', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid var(--color-border)', 
              position: 'relative' 
            }}>
              <h3 style={{ 
                color: 'var(--color-text-light)', 
                marginBottom: '1.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                borderBottom: '1px solid rgba(255,255,255,0.05)', 
                paddingBottom: '0.8rem' 
              }}>
                <History size={20} color="var(--color-accent)" /> Lịch sử Cập nhật Trò chơi
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingLeft: '1.5rem' }}>
                {/* Timeline vertical track line */}
                <div style={{ 
                  position: 'absolute', 
                  left: '6px', 
                  top: '8px', 
                  bottom: '8px', 
                  width: '2px', 
                  background: 'linear-gradient(to bottom, var(--color-accent) 0%, rgba(102, 192, 244, 0.05) 100%)' 
                }} />

                {((game.updateHistory && Array.isArray(game.updateHistory)) ? game.updateHistory : [
                  { version: 'v1.0', date: game.releaseDate || '15/05/2026', content: 'Phiên bản đầu tiên được phát hành chính thức!' }
                ]).map((log, i) => (
                  <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Bullet circle dot */}
                    <div style={{
                      position: 'absolute',
                      left: '-23px',
                      top: '4px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: i === 0 ? 'var(--color-accent)' : '#434b57',
                      border: i === 0 ? '2px solid rgba(102, 192, 244, 0.4)' : '2px solid rgba(255,255,255,0.05)',
                      boxShadow: i === 0 ? '0 0 10px var(--color-accent)' : 'none'
                    }} />

                    {/* Version & Date row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: 'white',
                        background: 'linear-gradient(135deg, rgba(102,192,244,0.3) 0%, rgba(102,192,244,0.05) 100%)',
                        border: '1px solid rgba(102, 192, 244, 0.3)',
                        padding: '0.15rem 0.6rem',
                        borderRadius: '12px'
                      }}>
                        {log.version}
                      </span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={12} /> {log.date}
                      </span>
                    </div>

                    {/* Log description */}
                    <div style={{ 
                      color: 'var(--color-text-main)', 
                      fontSize: '0.9rem', 
                      lineHeight: '1.6', 
                      whiteSpace: 'pre-wrap', 
                      backgroundColor: 'rgba(255,255,255,0.01)', 
                      padding: '0.8rem', 
                      borderRadius: '6px', 
                      border: '1px solid rgba(255,255,255,0.02)' 
                    }}>
                      {log.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="detail-buy-panel" style={{ position: 'sticky', top: '100px', backgroundColor: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: '12px', height: 'fit-content', border: '1px solid var(--color-border)' }}>
            <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>Mua {game.title}</h2>
            <div style={{ fontSize: '1.8rem', color: 'var(--color-success)', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {game.price === 0 ? 'Miễn phí' : `${game.price.toLocaleString('vi-VN')} VNĐ`}
            </div>
            
            {isOwned ? (
              <>
                <a href={game.downloadUrl || '#'} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'flex', width: '100%', justifyContent: 'center', padding: '1rem', borderRadius: '8px' }}>
                  <Download size={20} /> Tải xuống ngay
                </a>
                {expiresAtText && (
                  <div style={{ marginTop: '0.75rem', color: 'var(--color-success)', fontSize: '0.85rem', textAlign: 'center', lineHeight: 1.5, fontWeight: 600 }}>
                    Hạn sở hữu đến: {expiresAtText}
                  </div>
                )}
                <div style={{ marginTop: '0.85rem', color: 'var(--color-text-light)', fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.5 }}>
                  Mật khẩu giải nén là: <strong>web18p.xyz</strong>
                </div>
              </>
            ) : (
              <>
                {ownership.isExpired && expiresAtText && (
                  <div style={{ marginBottom: '1rem', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 77, 79, 0.35)', color: '#ff7875', backgroundColor: 'rgba(255, 77, 79, 0.08)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    Quyền sở hữu đã hết hạn ngày {expiresAtText}. Vui lòng mua lại để tải game.
                  </div>
                )}
                <button onClick={handleBuy} className="btn btn-success" style={{ width: '100%', justifyContent: 'center', padding: '1rem', borderRadius: '8px' }}>
                  <ShoppingCart size={20} /> {ownership.isExpired ? 'Mua lại ngay' : 'Mua ngay'}
                </button>
              </>
            )}

            <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              Thanh toán bảo mật qua Ví điện tử
            </div>

            {/* Error Report Button */}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
              <ErrorReportButton type="game" itemId={game.id} itemTitle={game.title} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameDetail;
