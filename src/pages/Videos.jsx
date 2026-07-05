import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { Play, Eye, Calendar, Tag, Film } from 'lucide-react';
import { getStreamtapeThumbnail } from './VideoDetail';

const CATEGORY_LABELS = {
  all: 'Tất Cả Phim',
  vam: 'Phim VAM',
  '3d': 'Phim 3D'
};

function Videos() {
  const { category } = useParams();
  const { videos = [] } = useAppContext();

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
          {sortedVideos.map(video => {
            const thumbnail = video.thumbnail || getStreamtapeThumbnail(video.streamtapeUrl) || 'https://placehold.co/640x360/1a1a2e/66c0f4?text=No+Thumbnail';
            return (
              <Link
                key={video.id}
                to={`/video/${video.id}`}
                className="video-card"
                style={{ textDecoration: 'none' }}
              >
                {/* Thumbnail */}
                <div className="video-card-thumbnail">
                  <img
                    src={thumbnail}
                    alt={video.title}
                    loading="lazy"
                    onError={e => { e.target.src = 'https://placehold.co/640x360/1a1a2e/66c0f4?text=No+Thumbnail'; }}
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
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Videos;
