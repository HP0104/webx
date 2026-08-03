import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Eye, Calendar, Tag, Film } from 'lucide-react';
import { getVideoThumbnail } from '../pages/VideoDetail';

export default function VideoCardItem({ video }) {
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
}
