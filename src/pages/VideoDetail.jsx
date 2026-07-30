import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { Play, Eye, Calendar, Tag, Film, ArrowLeft, ChevronRight } from 'lucide-react';
import { toEmbedUrl, getVideoThumbnail as getVideoThumbnailFromUtils } from '../utils/videoUtils';
import ErrorReportButton from '../components/ErrorReportButton';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Get thumbnail from video URL (exported for backwards compatibility with Videos.jsx).
 */
export function getVideoThumbnail(url) {
  return getVideoThumbnailFromUtils(url);
}

function VideoDetail() {
  const { videoId } = useParams();
  const { videos = [] } = useAppContext();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);

  const video = videos.find(v => v.id.toString() === videoId);

  useEffect(() => {
    if (video?.id) {
      const videoRef = doc(db, 'videos', video.id.toString());
      updateDoc(videoRef, {
        views: increment(1)
      }).catch(err => {
        console.warn("Failed to increment video views:", err.message);
      });
    }
  }, [video?.id]);

  // Vô hiệu hóa popup quảng cáo (popunder) khi đang ở trang xem video
  useEffect(() => {
    window.disablePopunder = true;
    return () => {
      window.disablePopunder = false;
    };
  }, []);

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

  // Support both new field name (videoUrl) and legacy (streamtapeUrl)
  const rawUrl = video.videoUrl || video.streamtapeUrl;
  const embedUrl = toEmbedUrl(rawUrl);
  let thumbnail = video.thumbnail || getVideoThumbnail(rawUrl);
  if (thumbnail && thumbnail.match(/_t\.(jpg|jpeg|png|webp)$/i)) {
    thumbnail = thumbnail.replace(/_t\.(jpg|jpeg|png|webp)$/i, '.$1');
  }

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
          {!isPlaying && thumbnail ? (
            <div 
              className="video-player-overlay" 
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: `url(${thumbnail})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: '#000',
                position: 'relative',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setIsPlaying(true)}
            >
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                  transition: 'transform 0.2s ease'
                }}>
                  <Play size={30} color="white" style={{ marginLeft: '4px' }} />
                </div>
              </div>
            </div>
          ) : rawUrl && (rawUrl.trim().toLowerCase().startsWith('<iframe') || rawUrl.trim().toLowerCase().startsWith('<script')) ? (
            <div dangerouslySetInnerHTML={{ __html: rawUrl }} style={{ width: '100%', height: '100%' }} className="raw-embed-container" />
          ) : (
            <iframe
              src={embedUrl ? (embedUrl.includes('?') ? `${embedUrl}&autoplay=1` : `${embedUrl}?autoplay=1`) : ''}
              width="100%"
              height="100%"
              allowFullScreen
              frameBorder="0"
              scrolling="no"
              allow="autoplay; encrypted-media"
              style={{ border: 'none' }}
            />
          )}
        </div>
      </div>

      {/* VPN Notice */}
      <div className="video-detail-vpn-notice">
        <span className="vpn-notice-status">⚡ có thể hoạt động</span>
        <span className="vpn-notice-text">
          — nếu video lỗi hay quá nhiều quảng cáo thì có thể bật VPN (1.1.1.1 , Kiwi ,...) lên
        </span>
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

        {/* Error Report Button */}
        <div style={{ marginTop: '1rem' }}>
          <ErrorReportButton type="video" itemId={video.id} itemTitle={video.title} />
        </div>
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
