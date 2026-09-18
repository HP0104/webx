import React, { useState, useMemo } from 'react';
import { Search, Edit, Trash2, ExternalLink, Gamepad2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGamePath } from '../../utils/gameRoutes';

const GAMES_PER_PAGE = 15;

function GameList({ games = [], onEditClick, onDeleteClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredGames = useMemo(() => {
    let list = games.filter(g => 
      (g.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (g.developer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(g.tags) ? g.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) : (g.tags || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (sortBy === 'newest') {
      list = [...list].reverse();
    } else if (sortBy === 'price_high') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'downloads') {
      list.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return list;
  }, [games, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE));
  const paginatedGames = useMemo(() => {
    const start = (currentPage - 1) * GAMES_PER_PAGE;
    return filteredGames.slice(start, start + GAMES_PER_PAGE);
  }, [filteredGames, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  };

  const handleDelete = (gameId, title) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa game "${title}"?`)) {
      onDeleteClick(gameId);
    }
  };

  return (
    <div className="card" style={{ padding: '1.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <h2 style={{ color: 'var(--color-text-light)', fontSize: '1.25rem', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gamepad2 size={22} color="var(--color-accent)" /> Kho Game ({games.length})
          </h2>
          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '20px', background: 'rgba(248, 179, 25, 0.15)', color: '#f8b319', fontWeight: 700 }}>
            {filteredGames.length} game
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 350px', justifyContent: 'flex-end' }}>
          <select 
            className="input-field" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '0.5rem 0.8rem', fontSize: '0.84rem', minWidth: '140px', margin: 0 }}
          >
            <option value="newest">⏱️ Mới cập nhật</option>
            <option value="oldest">⏳ Cũ nhất</option>
            <option value="downloads">🔥 Tải nhiều nhất</option>
            <option value="price_high">💰 Giá cao nhất</option>
            <option value="name">🔤 Tên A-Z</option>
          </select>

          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Tìm kiếm game, dev, tag..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '32px', paddingRight: '12px', padding: '0.5rem 0.8rem', fontSize: '0.84rem', margin: 0, width: '100%' }}
            />
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 600, minWidth: '280px' }}>Tên Game</th>
              <th style={{ padding: '0.85rem 0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Nhà phát triển</th>
              <th style={{ padding: '0.85rem 0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Giá bán</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedGames.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                  Không tìm thấy game nào.
                </td>
              </tr>
            ) : paginatedGames.map(game => (
              <tr key={game.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background-color 0.15s' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: '70px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)', backgroundColor: '#000' }}>
                      <img 
                        src={game.thumbnail || game.image} 
                        alt={game.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ 
                        color: 'var(--color-text-light)', 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        lineHeight: '1.35',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {game.title}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                        {game.is18Vn && (
                          <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700 }}>Việt Hóa</span>
                        )}
                        {game.is18Pc && (
                          <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 600 }}>PC</span>
                        )}
                        {game.is18Android && (
                          <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>Android</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 0.8rem', color: 'var(--color-text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                  {game.developer || '-'}
                </td>
                <td style={{ padding: '0.75rem 0.8rem', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                  {game.price === 0 ? <span style={{ color: '#10b981' }}>Miễn phí</span> : `${game.price.toLocaleString('vi-VN')} đ`}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button 
                      type="button"
                      onClick={() => onEditClick(game)} 
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderColor: 'rgba(102, 192, 244, 0.3)', color: 'var(--color-accent)' }}
                    >
                      <Edit size={13} /> Sửa
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDelete(game.id, game.title)} 
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Trash2 size={13} /> Xóa
                    </button>
                    <Link
                      to={getGamePath(game)}
                      target="_blank"
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center' }}
                      title="Xem trang chi tiết game"
                    >
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '0 0.5rem' }}>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default GameList;
