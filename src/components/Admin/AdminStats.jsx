import React from 'react';

function AdminStats({ usersCount, revenue, gamesCount }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
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
    </div>
  );
}

export default AdminStats;
