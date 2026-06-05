import React from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Gamepad2, Star, Download, Calendar, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../App';

function Category() {
  const { categoryType } = useParams();
  const { games } = useAppContext();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search');

  // Map categoryType to display title and filter/sort logic
  let title = 'Kho Game';
  let filteredGames = [...games];

  // Helper to parse DD/MM/YYYY or YYYY-MM-DD to a Comparable Date Object
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    return new Date(dateStr);
  };

  if (searchQuery) {
    title = `KẾT QUẢ TÌM KIẾM CHO "${searchQuery}"`;
    const lowerQuery = searchQuery.toLowerCase();
    filteredGames = games.filter(g => 
      g.title?.toLowerCase().includes(lowerQuery) || 
      g.developer?.toLowerCase().includes(lowerQuery) ||
      (Array.isArray(g.tags) ? g.tags : []).some(t => t.toLowerCase().includes(lowerQuery)) ||
      g.description?.toLowerCase().includes(lowerQuery)
    );
  } else {
    switch (categoryType) {
      case 'hot':
      case '18-plus':
        title = categoryType === 'hot' ? 'GAME HOT' : 'GAME 18+';
        filteredGames = categoryType === 'hot'
          ? filteredGames.sort((a, b) => (b.views || 0) - (a.views || 0))
          : filteredGames.filter(g => g.is18Plus || g.is18Vn || g.is18Uncensored || g.is18Pc || g.is18Android || g.tags?.some(t => ['Mature', '18+'].includes(t)));
        break;
      case 'new':
        title = 'GAME MỚI NHẤT';
        filteredGames = filteredGames.filter(g => g.isNew);
        filteredGames.sort((a, b) => parseDate(b.releaseDate) - parseDate(a.releaseDate));
        break;
      case 'popular':
        title = 'GAME NHIỀU NGƯỜI CHƠI';
        filteredGames = filteredGames.filter(g => g.isPopular);
        filteredGames.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        break;
      case 'top-rated':
        title = 'GAME ĐÁNH GIÁ CAO';
        filteredGames = filteredGames.filter(g => g.isTopRated);
        filteredGames.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case '18-all':
        title = 'TẤT CẢ GAME 18+';
        filteredGames = filteredGames.filter(g => g.is18Plus || g.is18Vn || g.is18Uncensored || g.is18Pc || g.is18Android || g.tags?.some(t => ['Mature', '18+'].includes(t)));
        break;
      case '18-vn':
        title = 'VIỆT HÓA 18+';
        filteredGames = filteredGames.filter(g => g.is18Vn);
        break;
      case '18-uncensored':
        title = '18+ KHÔNG CHE';
        filteredGames = filteredGames.filter(g => g.is18Uncensored);
        break;
      case '18-pc':
        title = 'GAME 18+ CHO PC';
        filteredGames = filteredGames.filter(g => g.is18Pc);
        break;
      case '18-android':
        title = 'GAME 18+ CHO ANDROID';
        filteredGames = filteredGames.filter(g => g.is18Android);
        break;
      case 'games':
      default:
        title = 'TẤT CẢ TRÒ CHƠI';
        break;
    }
  }

  return (
    <div className="container">
      {/* Category Header */}
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', hover: 'color: white' }}>
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </Link>
          <h2 className="section-title" style={{ margin: 0 }}>{title}</h2>
        </div>
        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.3rem 0.8rem', borderRadius: '20px', border: '1px solid var(--color-border)' }}>
          {filteredGames.length} Trò chơi
        </span>
      </div>

      {filteredGames.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '16px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <Gamepad2 size={64} style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', opacity: 0.3 }} />
          <h3 style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Chưa có game nào trong mục này</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', maxWidth: '400px' }}>Chúng tôi đang cập nhật thêm nhiều trò chơi mới hấp dẫn thuộc thể loại này. Hãy quay lại sau nhé!</p>
          <Link to="/" className="btn btn-primary">
            Quay về Trang chủ
          </Link>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
          gap: '2.5rem 1.5rem',
          marginBottom: '4rem'
        }}>
          {filteredGames.map(game => (
            <Link 
              to={`/game/${game.id}`} 
              key={game.id} 
              className="game-card fade-in"
            >
              <div className="game-card-inner">
                <div className="game-image-wrapper">
                  <img 
                    src={game.image} 
                    alt={game.title} 
                    className="game-image"
                  />
                  <div className="game-badge">
                    <Gamepad2 size={14} />
                    <span>{game.developer || 'PC'}</span>
                  </div>
                  {game.is18Plus && (
                    <div className="game-badge" style={{ left: 'auto', right: '10px', background: 'rgba(255, 77, 79, 0.85)', color: 'white' }}>
                      <span>18+</span>
                    </div>
                  )}
                  <div className="game-overlay">
                    <div className="game-overlay-content">
                      <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Xem chi tiết</button>
                    </div>
                  </div>
                </div>

                <div className="game-info">
                  <h3 className="game-title">{game.title}</h3>
                  
                  {/* Category-specific metadata badges */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {categoryType === 'new' && game.releaseDate && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Calendar size={12} />
                        {game.releaseDate}
                      </span>
                    )}
                    {categoryType === 'popular' && game.downloads !== undefined && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                        <Download size={12} />
                        {game.downloads.toLocaleString('vi-VN')} lượt tải
                      </span>
                    )}
                    {game.tags?.slice(0, 2).map((tag, idx) => (
                      <span key={idx} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="game-meta">
                    <span className="game-price">
                      {game.price === 0 ? 'MIỄN PHÍ' : `${game.price.toLocaleString('vi-VN')} đ`}
                    </span>
                    <div className="game-stats">
                      <Star size={14} fill="currentColor" />
                      <span>{game.rating ? game.rating.toFixed(1) : '4.9'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Category;
