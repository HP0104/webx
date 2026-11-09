import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Eye, Calendar, Tag, Film, Layers, Flame, Sparkles } from 'lucide-react';
import { getVideoThumbnail, toEmbedUrl } from '../utils/videoUtils';

export default function VideoCardItem({ video }) {
  const [mountedTime] = useState(() => Date.now());
  const rawUrl = video.videoUrl || video.streamtapeUrl;
  let thumbnail = video.thumbnail || getVideoThumbnail(rawUrl);
  if (thumbnail && thumbnail.match(/_t\.(jpg|jpeg|png|webp)$/i)) {
    thumbnail = thumbnail.replace(/_t\.(jpg|jpeg|png|webp)$/i, '.$1');
  }
  thumbnail = thumbnail || 'https://placehold.co/640x360/1a1a2e/66c0f4?text=No+Thumbnail';

  // Tính toán nhãn Mới / Tập Mới trong vòng 48h (hoặc 24h)
  const TWO_DAYS_MS = 48 * 60 * 60 * 1000;
  const createdTime = video.createdAt ? new Date(video.createdAt).getTime() : 0;
  const updatedTime = video.updatedAt ? new Date(video.updatedAt).getTime() : createdTime;

  const isRecentlyUpdated = updatedTime > 0 && (mountedTime - updatedTime) <= TWO_DAYS_MS;
  const isRecentlyCreated = createdTime > 0 && (mountedTime - createdTime) <= TWO_DAYS_MS;

  let newBadge = null;
  if (video.isSeries) {
    if (isRecentlyUpdated) {
      const epCount = Array.isArray(video.episodes) ? video.episodes.length : 0;
      // Nếu có từ 2 tập trở lên hoặc được cập nhật sau khi tạo
      if (epCount > 1 || (updatedTime - createdTime > 120000)) {
        newBadge = {
          text: epCount > 0 ? `TẬP ${epCount} MỚI` : 'TẬP MỚI',
          isUpdate: true
        };
      } else {
        newBadge = {
          text: 'BỘ MỚI',
          isUpdate: false
        };
      }
    }
  } else {
    if (isRecentlyCreated || isRecentlyUpdated) {
      newBadge = {
        text: 'MỚI',
        isUpdate: false
      };
    }
  }

  const handleMouseEnter = () => {
    if (!rawUrl) return;
    try {
      let hostOrigin = '';
      if (rawUrl.trim().toLowerCase().startsWith('<iframe')) {
        const match = rawUrl.match(/src\s*=\s*["']([^"']+)["']/i);
        if (match) hostOrigin = new URL(match[1]).origin;
      } else {
        const embed = toEmbedUrl(rawUrl);
        if (embed) hostOrigin = new URL(embed.startsWith('http') ? embed : `https://${embed}`).origin;
      }
      if (hostOrigin && hostOrigin.startsWith('http')) {
        if (!window.__prefetchedVideoOrigins) window.__prefetchedVideoOrigins = new Set();
        if (!window.__prefetchedVideoOrigins.has(hostOrigin)) {
          window.__prefetchedVideoOrigins.add(hostOrigin);
          const link = document.createElement('link');
          link.rel = 'dns-prefetch';
          link.href = hostOrigin;
          document.head.appendChild(link);
        }
      }
    } catch {}
  };

  return (
    <Link
      to={`/video/${video.id}`}
      className="video-card"
      style={{ textDecoration: 'none' }}
      onMouseEnter={handleMouseEnter}
    >
      <div className="video-card-thumbnail">
        {video.thumbnail || getVideoThumbnail(rawUrl) ? (
          <img
            src={thumbnail}
            alt={video.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={e => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div 
          className="video-card-fallback-poster"
          style={{ 
            width: '100%', 
            height: '100%', 
            background: video.category === 'vam' 
              ? 'linear-gradient(135deg, #2c0b38 0%, #181233 50%, #0d1117 100%)' 
              : 'linear-gradient(135deg, #091f3d 0%, #101c38 50%, #0d1117 100%)',
            display: (video.thumbnail || getVideoThumbnail(rawUrl)) ? 'none' : 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Ambient Glow */}
          <div style={{
            position: 'absolute',
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            background: video.category === 'vam' ? 'rgba(236, 72, 153, 0.18)' : 'rgba(56, 189, 248, 0.18)',
            filter: 'blur(28px)',
            pointerEvents: 'none'
          }} />
          
          <Film size={34} opacity={0.4} color={video.category === 'vam' ? '#f472b6' : '#38bdf8'} style={{ marginBottom: '0.45rem', zIndex: 1 }} />
          
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 2px 8px rgba(0,0,0,0.85)',
            zIndex: 1
          }}>
            {video.title}
          </div>
        </div>
        <div className="video-card-overlay">
          <div className="video-card-play-btn">
            <Play size={32} fill="white" />
          </div>
        </div>
        <span className="video-card-badge">
          {video.category === 'vam' ? 'VAM' : '3D'}
        </span>
        {newBadge && (
          <span 
            className="video-card-update-badge"
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: newBadge.isUpdate
                ? 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              color: '#ffffff',
              padding: '2.5px 7.5px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3.5px',
              boxShadow: newBadge.isUpdate
                ? '0 0 14px rgba(239, 68, 68, 0.75), 0 2px 6px rgba(0,0,0,0.85)'
                : '0 0 14px rgba(16, 185, 129, 0.65), 0 2px 6px rgba(0,0,0,0.85)',
              zIndex: 3,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              animation: newBadge.isUpdate ? 'pulseFireBadge 2.2s infinite' : 'none'
            }}
          >
            {newBadge.isUpdate ? <Flame size={12} fill="#ffedd5" color="#ffedd5" /> : <Sparkles size={11} />}
            {newBadge.text}
          </span>
        )}
        {video.isSeries && (
          <span 
            className="video-card-series-badge" 
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              background: newBadge?.isUpdate 
                ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' 
                : 'linear-gradient(135deg, #9333ea 0%, #c084fc 100%)',
              color: '#fff',
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
              zIndex: 2,
              letterSpacing: '0.2px'
            }}
          >
            <Layers size={11} /> {video.episodes?.length ? `${video.episodes.length} Tập` : 'Phim Bộ'}
          </span>
        )}
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
        {(() => {
          const tagsArray = Array.isArray(video.tags) 
            ? video.tags 
            : (typeof video.tags === 'string' ? video.tags.split(',').map(t => t.trim()) : []);
          return tagsArray.length > 0 ? (
            <div className="video-card-tags">
              {tagsArray.slice(0, 3).map((tag, idx) => (
                <span key={idx} className="video-card-tag">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          ) : null;
        })()}
      </div>
    </Link>
  );
}
