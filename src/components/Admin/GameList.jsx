import React from 'react';

function GameList({ games, onEditClick, onDeleteClick }) {
  const handleDelete = (gameId, title) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa game "${title}"?`)) {
      onDeleteClick(gameId);
    }
  };

  return (
    <div className="card">
      <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>Kho Game</h2>
      <div className="admin-game-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {games.map(game => (
          <div key={game.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', backgroundColor: 'var(--color-bg-main)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <img src={game.image} alt={game.title} style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', fontWeight: 'bold' }}>{game.title}</div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => onEditClick(game)} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.2rem' }}>Sửa</button>
                <button onClick={() => handleDelete(game.id, game.title)} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.2rem', color: '#ff4d4f' }}>Xóa</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GameList;
