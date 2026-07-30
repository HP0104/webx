import React, { useState } from 'react';
import { Search, Edit, Trash2 } from 'lucide-react';

function GameList({ games, onEditClick, onDeleteClick }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGames = games.filter(g => 
    (g.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (g.developer || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (gameId, title) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa game "${title}"?`)) {
      onDeleteClick(gameId);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ color: 'var(--color-text-light)', fontSize: '1.2rem', margin: 0 }}>Kho Game ({games.length})</h2>
        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Tìm kiếm game, dev..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px', paddingRight: '12px', padding: '0.6rem 1rem 0.6rem 2rem', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              <th style={{ padding: '0.8rem 1rem', fontWeight: 600, minWidth: '280px' }}>Game</th>
              <th style={{ padding: '0.8rem 1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Nhà phát triển</th>
              <th style={{ padding: '0.8rem 1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Giá</th>
              <th style={{ padding: '0.8rem 1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredGames.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  Không tìm thấy game nào.
                </td>
              </tr>
            ) : filteredGames.map(game => (
              <tr key={game.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '64px', height: '36px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={game.thumbnail || game.image} alt={game.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ 
                      color: 'var(--color-text-light)', 
                      fontWeight: 600,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.4'
                    }}>{game.title}</span>
                  </div>
                </td>
                <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text-muted)' }}>{game.developer || '-'}</td>
                <td style={{ padding: '0.8rem 1rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                  {game.price === 0 ? 'Miễn phí' : `${game.price.toLocaleString('vi-VN')}đ`}
                </td>
                <td style={{ padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => onEditClick(game)} className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Edit size={14} /> Sửa
                    </button>
                    <button onClick={() => handleDelete(game.id, game.title)} className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.2)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GameList;
