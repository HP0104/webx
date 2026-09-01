import React from 'react';
import { Users, Banknote, Gamepad2, Film, BookOpen } from 'lucide-react';

function AdminStats({ usersCount, revenue, gamesCount, videosCount = 0, mangaCount = 0 }) {
  const stats = [
    { title: 'Tổng Tài khoản', value: usersCount, icon: Users, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { title: 'Số lượng Game', value: gamesCount, icon: Gamepad2, color: '#f8b319', bg: 'rgba(248, 179, 25, 0.1)' },
    { title: 'Số lượng Phim', value: videosCount, icon: Film, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
    { title: 'Số lượng Truyện', value: mangaCount, icon: BookOpen, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div key={idx} className="card" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1.5rem',
            border: `1px solid ${stat.bg}`
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: stat.bg,
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Icon size={28} />
            </div>
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                {stat.title}
              </div>
              <div style={{ fontSize: '1.4rem', color: 'var(--color-text-light)', fontWeight: 'bold' }}>
                {stat.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AdminStats;
