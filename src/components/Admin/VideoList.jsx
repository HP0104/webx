import React, { useState, useMemo } from 'react';
import { Film, Trash2, Edit, ExternalLink, Search, Play, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter } from 'lucide-react';
import { getVideoThumbnail } from '../../pages/VideoDetail';
import { toEmbedUrl } from '../../utils/videoUtils';

const VIDEOS_PER_PAGE = 15;

function VideoList({ videos = [], onEditClick, onDeleteClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredVideos = useMemo(() => {
    let list = (videos || []).filter(v => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchesTitle = (v.title || '').toLowerCase().includes(q);
        const matchesUploader = (v.uploaderName || '').toLowerCase().includes(q);
        const matchesTags = Array.isArray(v.tags) 
          ? v.tags.some(t => t.toLowerCase().includes(q))
          : (v.tags || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesUploader && !matchesTags) return false;
      }

      // Category
      if (categoryFilter !== 'all') {
        const cat = (v.category || 'vam').toLowerCase();
        if (cat !== categoryFilter.toLowerCase()) return false;
      }

      return true;
    });

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'oldest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      }
      if (sortBy === 'views') {
        return (Number(b.views) || 0) - (Number(a.views) || 0);
      }
      if (sortBy === 'name') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return list;
  }, [videos, searchTerm, categoryFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / VIDEOS_PER_PAGE));
  const paginatedVideos = useMemo(() => {
    const start = (currentPage - 1) * VIDEOS_PER_PAGE;
    return filteredVideos.slice(start, start + VIDEOS_PER_PAGE);
  }, [filteredVideos, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      const el = document.getElementById('admin-video-list');
      if (el) window.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
    }
  };

  const handleDelete = (videoId, title) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phim "${title}"?`)) {
      onDeleteClick(videoId);
    }
  };

  if (!videos || videos.length === 0) {
    return (
      <div className="card" id="admin-video-list" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <Film size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
        <h3 style={{ color: 'var(--color-text-light)', margin: 0, fontSize: '1.1rem' }}>Kho Phim Trống</h3>
        <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>Chưa có phim nào trên hệ thống. Hãy thêm phim mới từ form phía trên.</p>
      </div>
    );
  }

  return (
    <div className="card" id="admin-video-list" style={{ padding: '1.4rem' }}>
      {/* Header & Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <h2 style={{ color: 'var(--color-text-light)', fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
            <Film size={22} color="var(--color-accent)" /> Kho Phim ({videos.length})
          </h2>
          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '20px', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', fontWeight: 700 }}>
            {filteredVideos.length} kết quả
          </span>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', flex: '1 1 400px', justifyContent: 'flex-end' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Tìm theo tên, uploader, tag..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '32px', paddingRight: '12px', padding: '0.5rem 0.8rem', fontSize: '0.84rem', margin: 0, width: '100%' }}
            />
          </div>

          {/* Category filter */}
          <select 
            className="input-field" 
            value={categoryFilter} 
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            style={{ padding: '0.5rem 0.8rem', fontSize: '0.84rem', minWidth: '120px', margin: 0 }}
          >
            <option value="all">Tất cả thể loại</option>
            <option value="vam">VAM</option>
            <option value="3d">3D Anime</option>
            <option value="cosplay">Cosplay</option>
            <option value="vietsub">Vietsub</option>
          </select>

          {/* Sort */}
          <select 
            className="input-field" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '0.5rem 0.8rem', fontSize: '0.84rem', minWidth: '130px', margin: 0 }}
          >
            <option value="newest">⏱️ Mới nhất</option>
            <option value="views">🔥 Xem nhiều nhất</option>
            <option value="name">🔤 Tên A-Z</option>
            <option value="oldest">⏳ Cũ nhất</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 600, minWidth: '280px' }}>Thông tin Phim</th>
              <th style={{ padding: '0.85rem 0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Người đăng</th>
              <th style={{ padding: '0.85rem 0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Thể loại</th>
              <th style={{ padding: '0.85rem 0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Lượt xem</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedVideos.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  Không tìm thấy phim nào khớp với điều kiện lọc.
                </td>
              </tr>
            ) : paginatedVideos.map(video => {
              const thumb = video.thumbnail || getVideoThumbnail(video.videoUrl || video.streamtapeUrl);

              return (
                <tr key={video.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background-color 0.15s' }}>
                  {/* Thumbnail & Title */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ width: '76px', height: '44px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)', backgroundColor: '#000', position: 'relative' }}>
                        {thumb ? (
                          <img 
                            src={thumb.replace(/_t\.(jpg|jpeg|png|webp)$/i, '.$1')} 
                            alt={video.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} 
                          />
                        ) : null}
                        <div 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                            display: thumb ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-muted)'
                          }}
                        >
                          <Film size={18} opacity={0.4} />
                        </div>
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
                          {video.title}
                        </div>
                        {video.tags && (
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {Array.isArray(video.tags) ? video.tags.slice(0, 3).join(', ') : video.tags}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Uploader */}
                  <td style={{ padding: '0.75rem 0.8rem', whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontSize: '0.78rem',
                      color: video.uploaderName ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      fontWeight: 600
                    }}>
                      {video.uploaderName || 'Admin'}
                    </span>
                  </td>

                  {/* Category */}
                  <td style={{ padding: '0.75rem 0.8rem', whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: video.category === 'vam' ? 'rgba(255, 77, 106, 0.15)' : 'rgba(102, 192, 244, 0.15)',
                      color: video.category === 'vam' ? '#ff4d6a' : '#66c0f4',
                      textTransform: 'uppercase'
                    }}>
                      {video.category || 'VAM'}
                    </span>
                  </td>

                  {/* Views */}
                  <td style={{ padding: '0.75rem 0.8rem', color: 'var(--color-text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {video.views > 0 ? `${video.views.toLocaleString('vi-VN')} lượt xem` : '0 lượt xem'}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button 
                        type="button"
                        onClick={() => onEditClick(video)} 
                        className="btn btn-outline" 
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderColor: 'rgba(102, 192, 244, 0.3)', color: 'var(--color-accent)' }}
                        title="Chỉnh sửa phim này"
                      >
                        <Edit size={13} /> Sửa
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(video.id, video.title)} 
                        className="btn btn-outline" 
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Xóa phim khỏi hệ thống"
                      >
                        <Trash2 size={13} /> Xóa
                      </button>
                      {(video.videoUrl || video.streamtapeUrl) && (
                        <a 
                          href={video.videoUrl || video.streamtapeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-outline" 
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          title="Mở link nguồn video"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
            title="Trang đầu"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
            title="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .map((pageNum, idx, arr) => {
              const showEllipsisBefore = idx > 0 && pageNum - arr[idx - 1] > 1;
              return (
                <React.Fragment key={pageNum}>
                  {showEllipsisBefore && <span style={{ color: 'var(--color-text-muted)', padding: '0 0.25rem' }}>...</span>}
                  <button
                    type="button"
                    className={`btn ${currentPage === pageNum ? 'btn-success' : 'btn-outline'}`}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      padding: '0.35rem 0.7rem',
                      fontSize: '0.82rem',
                      fontWeight: currentPage === pageNum ? 700 : 500,
                      backgroundColor: currentPage === pageNum ? 'var(--color-accent)' : 'transparent',
                      color: currentPage === pageNum ? '#000' : 'var(--color-text-light)',
                      borderColor: currentPage === pageNum ? 'var(--color-accent)' : 'var(--color-border)'
                    }}
                  >
                    {pageNum}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
            title="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
            title="Trang cuối"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoList;
