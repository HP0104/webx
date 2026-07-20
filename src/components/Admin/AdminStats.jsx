import React from 'react';

function AdminStats({ usersCount, revenue, gamesCount, videosCount = 0 }) {
  return (
    <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
      <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Tổng Tài khoản</div>
        <div style={{ fontSize: '1.5rem', color: 'var(--color-text-light)', fontWeight: 'bold' }}>{usersCount}</div>
      </div>
      <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Doanh thu</div>
        <div style={{ fontSize: '1.5rem', color: '#f8b319', fontWeight: 'bold' }}>{revenue.toLocaleString('vi-VN')} VNĐ</div>
      </div>
      <div className="card" style={{ borderLeft: '4px solid #f8b319' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Số lượng Game</div>
        <div style={{ fontSize: '1.5rem', color: 'var(--color-text-light)', fontWeight: 'bold' }}>{gamesCount}</div>
      </div>
      <div className="card" style={{ borderLeft: '4px solid #ec4899' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Số lượng Phim</div>
        <div style={{ fontSize: '1.5rem', color: 'var(--color-text-light)', fontWeight: 'bold' }}>{videosCount}</div>
      </div>
    </div>
  );
}

export default AdminStats;
