import React from 'react';
import { Film, Trash2, Edit3, ExternalLink } from 'lucide-react';

function VideoList({ videos, onEditClick, onDeleteClick }) {
  const handleDelete = (videoId, title) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phim "${title}"?`)) {
      onDeleteClick(videoId);
    }
  };

  if (!videos || videos.length === 0) {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Film size={20} /> Kho Phim
        </h2>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Chưa có phim nào. Hãy thêm phim mới từ form phía trên.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Film size={20} /> Kho Phim ({videos.length})
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {videos.map(video => (
          <div
            key={video.id}
            style={{
              display: 'flex',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: 'var(--color-bg-main)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              transition: 'border-color 0.2s ease'
            }}
          >
            {/* Thumbnail */}
            <div style={{
              width: '100px',
              height: '60px',
              borderRadius: '6px',
              overflow: 'hidden',
              flexShrink: 0,
              border: '1px solid var(--color-border)',
              backgroundColor: '#1a1a2e'
            }}>
              <img
                src={video.thumbnail || 'https://placehold.co/160x90/1a1a2e/66c0f4?text=Video'}
                alt={video.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: 'var(--color-text-light)',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginBottom: '0.2rem'
              }}>
                {video.title}
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '3px',
                  backgroundColor: video.category === 'vam' ? 'rgba(255, 77, 106, 0.15)' : 'rgba(102, 192, 244, 0.15)',
                  color: video.category === 'vam' ? '#ff4d6a' : '#66c0f4',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {video.category === 'vam' ? 'VAM' : '3D'}
                </span>
                {video.views > 0 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {video.views.toLocaleString()} views
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => onEditClick(video)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Edit3 size={12} /> Sửa
                </button>
                <button
                  onClick={() => handleDelete(video.id, video.title)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#ff4d4f', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Trash2 size={12} /> Xóa
                </button>
                {video.streamtapeUrl && (
                  <a
                    href={video.streamtapeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-accent)' }}
                  >
                    <ExternalLink size={12} /> Link
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VideoList;
