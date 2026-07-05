import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { Play, Eye, Calendar, Tag, Film, ArrowLeft, ChevronRight } from 'lucide-react';

/**
 * Extract Streamtape video ID from URL.
 * e.g. https://streamtape.com/v/drV0m0gADjCkqVB/remote_control.mp4 → drV0m0gADjCkqVB
 * e.g. https://streamtape.com/e/drV0m0gADjCkqVB → drV0m0gADjCkqVB
 */
function getStreamtapeVideoId(url) {
  if (!url) return null;
  const match = url.match(/streamtape\.com\/[ve]\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Get Streamtape thumbnail from video URL.
 * Uses the direct /tn/ URL pattern — no CORS proxy needed.
 */
export function getStreamtapeThumbnail(url) {
  const videoId = getStreamtapeVideoId(url);
  if (!videoId) return null;
  return `https://streamtape.com/tn/${videoId}`;
}

/**
 * Convert a Streamtape /v/ link to an embeddable /e/ link.
 */
function toEmbedUrl(url) {
  if (!url) return '';
  return url.replace('streamtape.com/v/', 'streamtape.com/e/');
}

function VideoDetail() {
  const { videoId } = useParams();
  const { videos = [] } = useAppContext();
  const navigate = useNavigate();

  const video = videos.find(v => v.id.toString() === videoId);

  if (!video) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <Film size={64} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
        <h2 style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Không tìm thấy video</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Video này không tồn tại hoặc đã bị xóa.</p>
        <Link to="/videos/all" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Quay lại danh sách phim
        </Link>
      </div>
    );
  }

  const embedUrl = toEmbedUrl(video.streamtapeUrl);
  const thumbnail = video.thumbnail || getStreamtapeThumbnail(video.streamtapeUrl);

  return (
    <div className="container video-detail-page">
      {/* Breadcrumb */}
      <div className="video-detail-breadcrumb">
        <Link to="/videos/all">Phim</Link>
        <ChevronRight size={14} />
        <Link to={`/videos/${video.category || 'all'}`}>
          {video.category === 'vam' ? 'VAM' : video.category === '3d' ? '3D' : 'Tất cả'}
        </Link>
        <ChevronRight size={14} />
        <span>{video.title}</span>
      </div>

      {/* Video Player */}
      <div className="video-detail-player-wrapper">
        <div className="video-detail-player">
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            allowFullScreen
            frameBorder="0"
            scrolling="no"
            allow="autoplay; encrypted-media"
            style={{ border: 'none' }}
          />
        </div>
      </div>

      {/* Video Info */}
      <div className="video-detail-info">
        <div className="video-detail-info-header">
          <h1 className="video-detail-title">{video.title}</h1>
          <span className="video-detail-badge">
            {video.category === 'vam' ? 'VAM' : '3D'}
          </span>
        </div>

        <div className="video-detail-meta">
          {video.views > 0 && (
            <span className="video-detail-meta-item">
              <Eye size={15} /> {video.views.toLocaleString()} lượt xem
            </span>
          )}
          {video.createdAt && (
            <span className="video-detail-meta-item">
              <Calendar size={15} />
              {new Date(video.createdAt).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>

        {video.tags && video.tags.length > 0 && (
          <div className="video-detail-tags">
            {video.tags.map((tag, idx) => (
              <span key={idx} className="video-card-tag">
                <Tag size={11} /> {tag}
              </span>
            ))}
          </div>
        )}

        {video.description && (
          <div className="video-detail-description">
            <p>{video.description}</p>
          </div>
        )}
      </div>

      {/* Back button */}
      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>
    </div>
  );
}

export default VideoDetail;
