import React, { useState } from 'react';
import { Film, Trash2, Edit, ExternalLink, Search } from 'lucide-react';

function VideoList({ videos, onEditClick, onDeleteClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  let filteredVideos = (videos || []).filter(v => 
    (v.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (sortBy === 'newest') {
    filteredVideos = [...filteredVideos].reverse();
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ color: 'var(--color-text-light)', fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Film size={20} /> Kho Phim ({videos.length})
        </h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select 
            className="input-field" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', minWidth: '150px' }}
          >
            <option value="newest">Mới cập nhật</option>
            <option value="oldest">Cũ nhất</option>
          </select>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Tìm kiếm phim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px', paddingRight: '12px', padding: '0.6rem 1rem 0.6rem 2rem', fontSize: '0.9rem' }}
            />
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '680px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              <th style={{ padding: '0.8rem 1rem', fontWeight: 600, minWidth: '280px', position: 'sticky', top: 0, backgroundColor: '#1a1a2e', zIndex: 1, borderBottom: '1px solid var(--color-border)' }}>Phim</th>
              <th style={{ padding: '0.8rem 1rem', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: '#1a1a2e', zIndex: 1, borderBottom: '1px solid var(--color-border)' }}>Thể loại</th>
              <th style={{ padding: '0.8rem 1rem', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: '#1a1a2e', zIndex: 1, borderBottom: '1px solid var(--color-border)' }}>Lượt xem</th>
              <th style={{ padding: '0.8rem 1rem', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: '#1a1a2e', zIndex: 1, borderBottom: '1px solid var(--color-border)' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredVideos.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  Không tìm thấy phim nào.
                </td>
              </tr>
            ) : filteredVideos.map(video => (
              <tr key={video.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '80px', height: '45px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)', backgroundColor: '#1a1a2e' }}>
                      <img src={video.thumbnail || 'https://placehold.co/160x90/1a1a2e/66c0f4?text=Video'} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    }}>
                      {video.title}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '0.8rem 1rem' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: video.category === 'vam' ? 'rgba(255, 77, 106, 0.15)' : 'rgba(102, 192, 244, 0.15)',
                    color: video.category === 'vam' ? '#ff4d6a' : '#66c0f4',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {video.category === 'vam' ? 'VAM' : '3D'}
                  </span>
                </td>
                <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text-muted)' }}>
                  {video.views > 0 ? `${video.views.toLocaleString()} views` : '-'}
                </td>
                <td style={{ padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => onEditClick(video)} className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Edit size={14} /> Sửa
                    </button>
                    <button onClick={() => handleDelete(video.id, video.title)} className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.2)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Trash2 size={14} /> Xóa
                    </button>
                    {(video.videoUrl || video.streamtapeUrl) && (
                      <a href={video.videoUrl || video.streamtapeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: 'var(--color-accent)', borderColor: 'rgba(102, 192, 244, 0.2)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <ExternalLink size={14} /> Link
                      </a>
                    )}
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

export default VideoList;
