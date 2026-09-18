import React from 'react';
import { Users, Gamepad2, Film, BookOpen, PlusCircle, ArrowRight, Shield, AlertTriangle, Wallet } from 'lucide-react';

function AdminStats({ usersCount, revenue, gamesCount, videosCount = 0, mangaCount = 0, onNavigateTab }) {
  const stats = [
    { id: 'users', title: 'Tổng Tài khoản', value: usersCount, icon: Users, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', desc: 'Thành viên & ví tiền' },
    { id: 'games', title: 'Kho Game', value: gamesCount, icon: Gamepad2, color: '#f8b319', bg: 'rgba(248, 179, 25, 0.12)', desc: 'Game PC & Android' },
    { id: 'videos', title: 'Kho Phim', value: videosCount, icon: Film, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', desc: 'VAM, 3D & Cosplay' },
    { id: 'manga', title: 'Kho Truyện', value: mangaCount, icon: BookOpen, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', desc: 'Bộ truyện & chapters' }
  ];

  const quickActions = [
    { tab: 'videos', title: 'Đăng Phim Mới', icon: Film, color: '#ec4899', desc: 'Nhúng link StreamHG, VOE, YouTube...' },
    { tab: 'games', title: 'Thêm Game Mới', icon: Gamepad2, color: '#f8b319', desc: 'Dịch dữ liệu Steam bằng Gemini AI' },
    { tab: 'users', title: 'Quản Lý Người Dùng', icon: Users, color: '#3b82f6', desc: 'Nạp/trừ tiền ví, phân quyền uploader' },
    { tab: 'manga', title: 'Thêm Bộ Truyện', icon: BookOpen, color: '#a855f7', desc: 'Trích xuất EPUB/ZIP hoặc ảnh' },
    { tab: 'reports', title: 'Xem Báo Lỗi', icon: AlertTriangle, color: '#ff4d4f', desc: 'Xử lý phản hồi từ người chơi' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Main Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.id} 
              className="card" 
              onClick={() => onNavigateTab && onNavigateTab(stat.id)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1.2rem', 
                padding: '1.4rem',
                border: `1px solid ${stat.bg}`,
                cursor: onNavigateTab ? 'pointer' : 'default',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${stat.bg}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                backgroundColor: stat.bg,
                color: stat.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={26} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                  {stat.title}
                </div>
                <div style={{ fontSize: '1.6rem', color: 'var(--color-text-light)', fontWeight: 800, lineHeight: 1.2 }}>
                  {stat.value.toLocaleString('vi-VN')}
                </div>
                <div style={{ fontSize: '0.72rem', color: stat.color, marginTop: '0.25rem', fontWeight: 600 }}>
                  {stat.desc} →
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Quick Navigation Shortcuts */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ color: 'var(--color-text-light)', margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={18} color="var(--color-accent)" />
          Lối tắt Thao tác Nhanh
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <div
                key={act.tab}
                onClick={() => onNavigateTab && onNavigateTab(act.tab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = act.color;
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: `${act.color}15`, color: act.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-light)', fontWeight: 700, fontSize: '0.88rem' }}>
                      {act.title}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.74rem', marginTop: '0.15rem' }}>
                      {act.desc}
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AdminStats;
