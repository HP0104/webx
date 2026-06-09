import React, { useState } from 'react';
import { Gamepad2, TrendingUp, Clock, Star, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { getGamePath } from '../utils/gameRoutes';
import { ADS_CONFIG } from '../config/ads';
import AdBanner from '../components/AdBanner';

function Home() {
  const { games, loadingGames } = useAppContext();
  const [currentPage, setCurrentPage] = useState(1);
  const GAMES_PER_PAGE = 12;
  const [hotFilter, setHotFilter] = useState('day');

  // Sắp xếp Game mới cập nhật (updatedAt hoặc createdAt giảm dần)
  const sortedNewGames = [...games].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || a.releaseDate || 0);
    const dateB = new Date(b.updatedAt || b.createdAt || b.releaseDate || 0);
    return dateB - dateA;
  });

  const getDaysSinceCreation = (game) => {
    const createdDate = new Date(game.updatedAt || game.createdAt || game.releaseDate || 0);
    const now = new Date();
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Sắp xếp Game Hot nhất theo tốc độ tăng trưởng lượt xem (views velocity) hoặc tổng views
  const hotGames = (() => {
    let sorted = [...games];
    if (hotFilter === 'day') {
      sorted.sort((a, b) => {
        const scoreA = (a.views || 0) / (getDaysSinceCreation(a) + 1);
        const scoreB = (b.views || 0) / (getDaysSinceCreation(b) + 1);
        return scoreB - scoreA;
      });
    } else if (hotFilter === 'week') {
      sorted.sort((a, b) => {
        const scoreA = (a.views || 0) / (Math.floor(getDaysSinceCreation(a) / 7) + 1);
        const scoreB = (b.views || 0) / (Math.floor(getDaysSinceCreation(b) / 7) + 1);
        return scoreB - scoreA;
      });
    } else {
      sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
    }
    return sorted.slice(0, 6); // Lấy top 6 game hot nhất
  })();

  // Phân trang
  const totalPages = Math.ceil(sortedNewGames.length / GAMES_PER_PAGE);
  const paginatedNewGames = sortedNewGames.slice(
    (currentPage - 1) * GAMES_PER_PAGE,
    currentPage * GAMES_PER_PAGE
  );

  // Định dạng ngày hiển thị
  const formatCardDate = (dateVal) => {
    if (!dateVal) return 'Vừa xong';
    try {
      const date = new Date(dateVal);
      if (isNaN(date.getTime())) return dateVal;
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateVal;
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      {/* Quảng cáo vị trí 1: Giữa phần Lưu ý và Game mới */}
      <AdBanner config={ADS_CONFIG.slot1} />
      
      {/* ==========================================
          PHẦN 1: GAME MỚI CẬP NHẬT (Sắp xếp theo thời gian cập nhật + Phân trang)
          ========================================== */}
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem' }}>
        <Clock size={24} color="var(--color-accent)" />
        <h2 className="section-title" style={{ margin: 0 }}>GAME MỚI CẬP NHẬT</h2>
        <div className="section-line" style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
      </div>

      {loadingGames ? (
        <>
          <style>{`
            @keyframes skeleton-pulse {
              0% { opacity: 0.35; }
              50% { opacity: 0.7; }
              100% { opacity: 0.35; }
            }
            .skeleton-item {
              animation: skeleton-pulse 1.5s infinite ease-in-out;
            }
          `}</style>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
            gap: '2.5rem 1.5rem',
            marginBottom: '3rem'
          }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="card skeleton-item" style={{ height: '320px', padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <div style={{ width: '100%', height: '150px', background: 'rgba(255,255,255,0.03)' }} />
                <div style={{ padding: '1rem 0.5rem' }}>
                  <div style={{ width: '70%', height: '18px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '0.6rem' }} />
                  <div style={{ width: '40%', height: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '1rem' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                    <div style={{ width: '60px', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
                    <div style={{ width: '40px', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : paginatedNewGames.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', marginBottom: '4rem' }}>
          <Gamepad2 size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--color-text-light)', margin: 0 }}>Chưa có game nào</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Vui lòng đăng nhập quyền Admin để đăng tải game đầu tiên!</p>
        </div>
      ) : (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
            gap: '2.5rem 1.5rem',
            marginBottom: '3rem'
          }}>
            {paginatedNewGames.map(game => (
              <Link 
                to={getGamePath(game)} 
                key={game.id} 
                className="game-card fade-in"
                style={{ textDecoration: 'none' }}
              >
                <div className="game-card-inner" style={{ transition: 'all 0.3s ease' }}>
                  <div className="game-image-wrapper">
                    <img 
                      src={game.image} 
                      alt={game.title} 
                      className="game-image"
                    />
                    <div className="game-badge">
                      <Gamepad2 size={14} />
                      <span>{game.tags?.[0] || 'Game'}</span>
                    </div>
                    <div className="game-overlay">
                      <div className="game-overlay-content">
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="game-info" style={{ padding: '1rem 0.5rem' }}>
                    <h3 className="game-title" style={{ color: 'var(--color-text-light)', fontSize: '1.05rem', fontWeight: '600', margin: '0 0 0.5rem 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {game.title}
                    </h3>
                    
                    {/* Ngày cập nhật */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
                      <Clock size={12} color="var(--color-accent)" />
                      <span>Cập nhật: {formatCardDate(game.updatedAt || game.createdAt || game.releaseDate)}</span>
                    </div>

                    <div className="game-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="game-price" style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '1rem' }}>
                        {game.price === 0 ? 'MIỄN PHÍ' : `${game.price.toLocaleString('vi-VN')} đ`}
                      </span>
                      <div className="game-stats" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#f8b319' }}>
                        <Star size={14} fill="currentColor" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{game.rating ? game.rating.toFixed(1) : '5.0'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Điều hướng Phân trang (Pagination) */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '0.5rem', 
              marginBottom: '5rem',
              marginTop: '1rem'
            }}>
              <button 
                disabled={currentPage === 1} 
                onClick={() => {
                  setCurrentPage(prev => prev - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn btn-outline" 
                style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.3rem',
                  opacity: currentPage === 1 ? 0.4 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={16} /> Trước
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page} 
                  onClick={() => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                  className={`btn ${currentPage === page ? 'btn-primary' : 'btn-outline'}`} 
                  style={{ 
                    padding: '0.5rem', 
                    minWidth: '40px', 
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    boxShadow: currentPage === page ? '0 0 15px rgba(102, 192, 244, 0.4)' : 'none'
                  }}
                >
                  {page}
                </button>
              ))}

              <button 
                disabled={currentPage === totalPages} 
                onClick={() => {
                  setCurrentPage(prev => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn btn-outline" 
                style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.3rem',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Quảng cáo vị trí 2: Giữa Game mới và Game hot */}
      <AdBanner config={ADS_CONFIG.slot2} />

      {/* ==========================================
          PHẦN 2: GAME HOT NHẤT (Sắp xếp theo số lượng views truy cập chi tiết)
          ========================================== */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <TrendingUp size={24} color="#ff5353" />
          <h2 className="section-title" style={{ margin: 0 }}>GAME HOT NHẤT</h2>
        </div>
        
        {/* Hot tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <button 
            onClick={() => setHotFilter('day')} 
            className="btn" 
            style={{ 
              padding: '0.3rem 0.8rem', 
              fontSize: '0.78rem', 
              borderRadius: '6px',
              background: hotFilter === 'day' ? 'var(--color-accent)' : 'transparent',
              color: hotFilter === 'day' ? 'white' : 'var(--color-text-muted)',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              margin: 0
            }}
          >
            Hôm nay
          </button>
          <button 
            onClick={() => setHotFilter('week')} 
            className="btn" 
            style={{ 
              padding: '0.3rem 0.8rem', 
              fontSize: '0.78rem', 
              borderRadius: '6px',
              background: hotFilter === 'week' ? 'var(--color-accent)' : 'transparent',
              color: hotFilter === 'week' ? 'white' : 'var(--color-text-muted)',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              margin: 0
            }}
          >
            Tuần này
          </button>
          <button 
            onClick={() => setHotFilter('month')} 
            className="btn" 
            style={{ 
              padding: '0.3rem 0.8rem', 
              fontSize: '0.78rem', 
              borderRadius: '6px',
              background: hotFilter === 'month' ? 'var(--color-accent)' : 'transparent',
              color: hotFilter === 'month' ? 'white' : 'var(--color-text-muted)',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              margin: 0
            }}
          >
            Tháng này
          </button>
        </div>
      </div>

      {loadingGames ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
          gap: '2.5rem 1.5rem'
        }}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="card skeleton-item" style={{ height: '320px', padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <div style={{ width: '100%', height: '150px', background: 'rgba(255,255,255,0.03)' }} />
              <div style={{ padding: '1rem 0.5rem' }}>
                <div style={{ width: '70%', height: '18px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '0.6rem' }} />
                <div style={{ width: '40%', height: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '1rem' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                  <div style={{ width: '60px', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ width: '40px', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : hotGames.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <TrendingUp size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--color-text-light)', margin: 0 }}>Chưa có bảng xếp hạng</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Hãy bấm xem chi tiết các game để tạo bảng xếp hạng xu hướng!</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
          gap: '2.5rem 1.5rem'
        }}>
          {hotGames.map((game, index) => (
            <Link 
              to={getGamePath(game)} 
              key={game.id} 
              className="game-card fade-in"
              style={{ textDecoration: 'none' }}
            >
              <div className="game-card-inner" style={{ position: 'relative' }}>
                
                {/* Hot Rank Number Tag */}
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '-10px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: index === 0 ? 'linear-gradient(135deg, #ff9000, #ff0000)' : 'linear-gradient(135deg, #a1a8c1, #5d6778)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  zIndex: 10,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                  border: '2px solid var(--color-bg-secondary)'
                }}>
                  {index + 1}
                </div>

                <div className="game-image-wrapper">
                  <img 
                    src={game.image} 
                    alt={game.title} 
                    className="game-image"
                  />
                  <div className="game-badge" style={{ background: 'rgba(255, 83, 83, 0.85)' }}>
                    <Eye size={13} style={{ marginRight: '0.2rem' }} />
                    <span>Trending</span>
                  </div>
                  <div className="game-overlay">
                    <div className="game-overlay-content">
                      <button className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>

                <div className="game-info" style={{ padding: '1rem 0.5rem' }}>
                  <h3 className="game-title" style={{ color: 'var(--color-text-light)', fontSize: '1.05rem', fontWeight: '600', margin: '0 0 0.5rem 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {game.title}
                  </h3>

                  {/* Lượt xem thực tế */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#ff6262', fontWeight: '600', marginBottom: '0.6rem' }}>
                    <span>🔥 {(game.views || 0).toLocaleString('vi-VN')} lượt xem</span>
                  </div>

                  <div className="game-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="game-price" style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '1rem' }}>
                      {game.price === 0 ? 'MIỄN PHÍ' : `${game.price.toLocaleString('vi-VN')} đ`}
                    </span>
                    <div className="game-stats" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#f8b319' }}>
                      <Star size={14} fill="currentColor" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{game.rating ? game.rating.toFixed(1) : '5.0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quảng cáo vị trí 3: Cuối trang */}
      <AdBanner config={ADS_CONFIG.slot3} />

    </div>
  );
}

export default Home;
