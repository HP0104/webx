import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { Play, Eye, Calendar, Tag, Film } from 'lucide-react';
import { getVideoThumbnail } from './VideoDetail';
import { toEmbedUrl } from '../utils/videoUtils';

const CATEGORY_LABELS = {
  all: 'Tất Cả Phim',
  vam: 'Phim VAM',
  '3d': 'Phim 3D'
};

// Video Card Component for reuse
const VideoCardItem = ({ video }) => {
  const rawUrl = video.videoUrl || video.streamtapeUrl;
  let thumbnail = video.thumbnail || getVideoThumbnail(rawUrl);
  if (thumbnail && thumbnail.match(/_t\.(jpg|jpeg|png|webp)$/i)) {
    thumbnail = thumbnail.replace(/_t\.(jpg|jpeg|png|webp)$/i, '.$1');
  }
  thumbnail = thumbnail || 'https://placehold.co/640x360/1a1a2e/66c0f4?text=No+Thumbnail';

  return (
    <Link
      to={`/video/${video.id}`}
      className="video-card"
      style={{ textDecoration: 'none' }}
    >
      <div className="video-card-thumbnail">
        {video.thumbnail || getVideoThumbnail(rawUrl) ? (
          <img
            src={thumbnail}
            alt={video.title}
            loading="lazy"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div 
          style={{ 
            width: '100%', 
            height: '100%', 
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            display: (video.thumbnail || getVideoThumbnail(rawUrl)) ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)'
          }}
        >
          <Film size={48} opacity={0.5} />
        </div>
        <div className="video-card-overlay">
          <div className="video-card-play-btn">
            <Play size={32} fill="white" />
          </div>
        </div>
        <span className="video-card-badge">
          {video.category === 'vam' ? 'VAM' : '3D'}
        </span>
      </div>

      {/* Info */}
      <div className="video-card-info">
        <h3 className="video-card-title">{video.title}</h3>
        {video.description && (
          <p className="video-card-desc">{video.description}</p>
        )}
        <div className="video-card-meta">
          {video.views > 0 && (
            <span className="video-card-meta-item">
              <Eye size={13} /> {video.views.toLocaleString()}
            </span>
          )}
          {video.createdAt && (
            <span className="video-card-meta-item">
              <Calendar size={13} />
              {new Date(video.createdAt).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>
        {video.tags && video.tags.length > 0 && (
          <div className="video-card-tags">
            {video.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="video-card-tag">
                <Tag size={10} /> {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </Link>
  );
};

function Videos() {
  const { category } = useParams();
  const { videos = [] } = useAppContext();

  // Random Videos Logic
  const [randomVideos, setRandomVideos] = useState([]);
  useEffect(() => {
    if (videos.length > 0) {
      const shuffled = [...videos].sort(() => 0.5 - Math.random());
      setRandomVideos(shuffled.slice(0, 6));
    }
  }, [videos]);

  const currentCategory = category || 'all';
  const pageTitle = CATEGORY_LABELS[currentCategory] || 'Tất Cả Phim';

  // Filter videos by category
  const filteredVideos = currentCategory === 'all'
    ? videos
    : videos.filter(v => v.category === currentCategory);

  // Sort by newest first
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  // Pagination
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentCategory]);

  const totalPages = Math.ceil(sortedVideos.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVideos = sortedVideos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container videos-page">
      {/* Random Videos Slider */}
      {randomVideos.length > 0 && currentCategory === 'all' && (
        <div className="random-videos-section" style={{ marginBottom: '3rem' }}>
          <div className="videos-header-content" style={{ marginBottom: '1.5rem' }}>
            <Film size={28} className="videos-header-icon" />
            <div>
              <h2 className="videos-title" style={{ fontSize: '1.5rem' }}>Phim Ngẫu Nhiên</h2>
            </div>
          </div>
          <div className="random-videos-slider" style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '1.5rem',
            paddingBottom: '1rem',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none',  // IE and Edge
          }}>
            <style>
              {`
                .random-videos-slider::-webkit-scrollbar {
                  display: none;
                }
                .random-videos-slider .video-card {
                  min-width: calc(33.333% - 1rem); /* Show 3 cards */
                  flex: 0 0 auto;
                  scroll-snap-align: start;
                }
                @media (max-width: 1024px) {
                  .random-videos-slider .video-card {
                    min-width: calc(50% - 0.75rem); /* Show 2 cards on tablet */
                  }
                }
                @media (max-width: 640px) {
                  .random-videos-slider .video-card {
                    min-width: 85%; /* Show 1.5 cards on mobile */
                  }
                }
              `}
            </style>
            {randomVideos.map(video => (
              <VideoCardItem key={video.id} video={video} />
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="videos-header">
        <div className="videos-header-content">
          <Film size={28} className="videos-header-icon" />
          <div>
            <h1 className="videos-title">{pageTitle}</h1>
            <p className="videos-subtitle">
              {sortedVideos.length} video{sortedVideos.length !== 1 ? 's' : ''} có sẵn
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="videos-tabs">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Link
              key={key}
              to={`/videos/${key}`}
              className={`videos-tab ${currentCategory === key ? 'active' : ''}`}
            >
              {label.replace('Phim ', '').replace('Tất Cả ', 'Tất cả')}
            </Link>
          ))}
        </div>
      </div>

      {/* Videos Grid */}
      {sortedVideos.length === 0 ? (
        <div className="videos-empty">
          <Film size={64} />
          <h3>Chưa có phim nào</h3>
          <p>Danh mục này hiện chưa có video. Hãy quay lại sau!</p>
        </div>
      ) : (
        <>
        <div className="videos-grid">
          {paginatedVideos.map(video => (
            <VideoCardItem key={video.id} video={video} />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}

export default Videos;
