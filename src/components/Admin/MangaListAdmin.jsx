import React, { useState } from 'react';
import { Trash2, Edit3, Eye, Layers, BookOpen, Search } from 'lucide-react';
import { MANGA_STATUS } from '../../utils/mangaUtils';

function MangaListAdmin({ mangaList = [], onEditClick, onDeleteClick }) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? mangaList.filter(m => m.title?.toLowerCase().includes(search.toLowerCase()))
    : mangaList;

  const sorted = [...filtered].sort((a, b) => {
    const da = a.updatedAt || a.createdAt || '';
    const db = b.updatedAt || b.createdAt || '';
    return db.localeCompare(da);
  });

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <h2 style={{ color: 'var(--color-text-light)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <BookOpen size={20} />
          Danh Sách Truyện ({mangaList.length})
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-secondary)', borderRadius: '6px', padding: '0.3rem 0.8rem', border: '1px solid var(--color-border)' }}>
          <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm truyện..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-light)', outline: 'none', fontSize: '0.85rem', width: '150px' }}
          />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
          {search ? 'Không tìm thấy truyện nào.' : 'Chưa có truyện nào. Thêm truyện mới ở form bên trên.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {sorted.map(manga => (
            <div
              key={manga.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.8rem',
                borderRadius: '8px',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                transition: 'border-color 0.2s ease'
              }}
            >
              {/* Cover */}
              <div style={{ width: '50px', height: '70px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)' }}>
                <img
                  src={manga.cover || ''}
                  alt={manga.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text-light)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {manga.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Layers size={12} /> {manga.chapters?.length || 0} ch.
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Eye size={12} /> {(manga.views || 0).toLocaleString()}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    backgroundColor: manga.status === 'completed' ? 'rgba(82, 196, 26, 0.15)' : manga.status === 'hiatus' ? 'rgba(255, 77, 79, 0.15)' : 'rgba(102, 192, 244, 0.15)',
                    color: manga.status === 'completed' ? '#52c41a' : manga.status === 'hiatus' ? '#ff4d4f' : '#66c0f4'
                  }}>
                    {MANGA_STATUS[manga.status] || 'Đang ra'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button
                  onClick={() => onEditClick(manga)}
                  style={{ background: 'rgba(102, 192, 244, 0.1)', border: '1px solid rgba(102, 192, 244, 0.2)', color: 'var(--color-accent)', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}
                  title="Chỉnh sửa"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Xóa truyện "${manga.title}"?`)) {
                      onDeleteClick(manga.id);
                    }
                  }}
                  style={{ background: 'rgba(255, 77, 79, 0.1)', border: '1px solid rgba(255, 77, 79, 0.2)', color: '#ff4d4f', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}
                  title="Xóa"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MangaListAdmin;
