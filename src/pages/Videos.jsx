import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { Play, Eye, Calendar, Tag, X, Film, ChevronRight } from 'lucide-react';

const CATEGORY_LABELS = {
  all: 'Tất Cả Phim',
  vam: 'Phim VAM',
  '3d': 'Phim 3D'
};

/**
 * Convert a Streamtape /v/ link to an embeddable /e/ link.
 * If already an /e/ link, return as-is.
 */
function toEmbedUrl(url) {
  if (!url) return '';
  return url.replace('streamtape.com/v/', 'streamtape.com/e/');
}

function Videos() {
  const { category } = useParams();
  const { videos = [], user } = useAppContext();
  const [selectedVideo, setSelectedVideo] = useState(null);

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

  const openPlayer = (video) => {
    setSelectedVideo(video);
    document.body.style.overflow = 'hidden';
  };

  const closePlayer = () => {
    setSelectedVideo(null);
    document.body.style.overflow = '';
  };

  return (
    <div className="container videos-page">
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
        <div className="videos-grid">
          {sortedVideos.map(video => (
            <div
              key={video.id}
              className="video-card"
              onClick={() => openPlayer(video)}
            >
              {/* Thumbnail */}
              <div className="video-card-thumbnail">
                <img
                  src={video.thumbnail || 'https://placehold.co/640x360/1a1a2e/66c0f4?text=No+Thumbnail'}
                  alt={video.title}
                  loading="lazy"
                />
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
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="video-modal-overlay" onClick={closePlayer}>
          <div className="video-modal" onClick={e => e.stopPropagation()}>
            <div className="video-modal-header">
              <h2 className="video-modal-title">{selectedVideo.title}</h2>
              <button className="video-modal-close" onClick={closePlayer}>
                <X size={22} />
              </button>
            </div>
            <div className="video-modal-player">
              <iframe
                src={toEmbedUrl(selectedVideo.streamtapeUrl)}
                width="100%"
                height="100%"
                allowFullScreen
                frameBorder="0"
                scrolling="no"
                allow="autoplay; encrypted-media"
                style={{ border: 'none' }}
              />
            </div>
            {selectedVideo.description && (
              <div className="video-modal-desc">
                <p>{selectedVideo.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Videos;
