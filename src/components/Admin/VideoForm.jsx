import React, { useState } from 'react';
import { Film, Eye, X, ExternalLink, Image } from 'lucide-react';

/**
 * Extract VOE.sx video ID from various URL formats.
 * e.g. https://voe.sx/0fzybafk1vih → 0fzybafk1vih
 * e.g. https://voe.sx/e/0fzybafk1vih → 0fzybafk1vih
 */
function getVoeVideoId(url) {
  if (!url) return null;
  // Match voe.sx/e/ID or voe.sx/ID (but not voe.sx/cache/ or other paths)
  const match = url.match(/voe\.sx\/(?:e\/)?([a-zA-Z0-9]+)/);
  if (match && !['cache', 'embed', 'api'].includes(match[1])) {
    return match[1];
  }
  return null;
}

/**
 * Convert a VOE.sx URL to an embeddable /e/ link.
 */
function toEmbedUrl(url) {
  if (!url) return '';
  const videoId = getVoeVideoId(url);
  if (videoId) return `https://voe.sx/e/${videoId}`;
  return url; // fallback: return as-is
}

/**
 * Get VOE.sx thumbnail from video URL.
 * Pattern: https://voe.sx/cache/{VIDEO_ID}_storyboard_L1.jpg
 */
function getVoeThumbnail(videoId) {
  if (!videoId) return null;
  return `https://voe.sx/cache/${videoId}_storyboard_L1.jpg`;
}

function VideoForm({
  videoData,
  setVideoData,
  editingVideoId,
  onSaveVideo,
  onCancelEdit
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);

  /**
   * Smart paste handler: if user pastes VOE's "HTML + Thumbnail" export code,
   * auto-extract the video URL and thumbnail URL.
   * e.g. <a href="https://voe.sx/0fzybafk1vih"><img src="https://voe.sx/cache/0fzybafk1vih_storyboard_L1.jpg" alt="Preview remote_control.mp4"/></a>
   */
  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    
    // Check if pasted content is VOE HTML+Thumbnail embed code
    const hrefMatch = pasted.match(/href=["']([^"']*voe\.sx[^"']*)["']/i);
    const imgMatch = pasted.match(/src=["']([^"']*voe\.sx\/cache\/[^"']*)["']/i);
    
    if (hrefMatch && imgMatch) {
      e.preventDefault();
      const videoUrl = hrefMatch[1];
      const thumbUrl = imgMatch[1];
      setVideoData(prev => ({
        ...prev,
        videoUrl: videoUrl,
        thumbnail: thumbUrl
      }));
      return;
    }
    
    // If it's just a normal VOE URL, let it through normally
  };

  const handleFetchThumbnail = async (optionalUrl, silent = false) => {
    const url = (typeof optionalUrl === 'string' ? optionalUrl : videoData.videoUrl).trim();
    if (!url) {
      if (!silent) alert('Vui lòng nhập link VOE.sx trước!');
      return;
    }

    const videoId = getVoeVideoId(url);
    
    if (!videoId) {
      if (!silent) alert('Đường dẫn VOE.sx không hợp lệ! Không tìm thấy Video ID.');
      return;
    }

    setIsFetchingThumbnail(true);
    
    const thumbUrl = getVoeThumbnail(videoId);

    try {
      // Verify the thumbnail exists by loading it as an image
      const isValid = await new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = thumbUrl;
      });

      if (isValid) {
        setVideoData(prev => ({ ...prev, thumbnail: thumbUrl }));
        if (!silent) alert('Tự động lấy ảnh bìa thành công!');
      } else {
        if (!silent) alert('Không tìm thấy ảnh bìa trên VOE.sx. Bạn vui lòng nhập link ảnh thủ công.');
      }
    } catch (err) {
      console.error(err);
      if (!silent) alert('Lỗi lấy ảnh bìa: ' + err.message);
    } finally {
      setIsFetchingThumbnail(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!videoData.title.trim()) return alert('Vui lòng nhập tên phim!');
    if (!videoData.videoUrl.trim()) return alert('Vui lòng nhập link video!');

    const data = {
      ...videoData,
      videoUrl: videoData.videoUrl.trim(),
      tags: typeof videoData.tags === 'string'
        ? videoData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : videoData.tags || [],
      views: Number(videoData.views) || 0,
      updatedAt: new Date().toISOString()
    };

    if (!editingVideoId) {
      data.createdAt = new Date().toISOString();
    }

    onSaveVideo(data);
  };

  const embedUrl = toEmbedUrl(videoData.videoUrl);

  return (
    <div className="card" id="admin-video-form">
      <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Film size={20} />
        {editingVideoId ? 'Chỉnh sửa Phim' : 'Thêm Phim Mới'}
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Title */}
        <input
          type="text"
          className="input-field"
          placeholder="Tên phim"
          value={videoData.title}
          onChange={e => setVideoData({ ...videoData, title: e.target.value })}
          required
        />

        {/* Video URL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Link VOE.sx (hoặc paste code HTML+Thumbnail từ VOE)"
              value={videoData.videoUrl}
              onChange={e => setVideoData({ ...videoData, videoUrl: e.target.value })}
              onPaste={handlePaste}
              onBlur={(e) => handleFetchThumbnail(e.target.value, true)}
              style={{ flex: 1, margin: 0 }}
              required
            />
            <button
              type="button"
              onClick={() => handleFetchThumbnail(videoData.videoUrl, false)}
              className="btn"
              style={{
                background: 'var(--color-success)',
                color: 'white',
                border: 'none',
                padding: '0 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap'
              }}
              disabled={isFetchingThumbnail || !videoData.videoUrl.trim()}
            >
              <Image size={16} />
              {isFetchingThumbnail ? 'Đang lấy...' : 'Lấy ảnh bìa'}
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="btn"
              style={{
                background: showPreview ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                color: showPreview ? 'white' : 'var(--color-text-light)',
                border: '1px solid var(--color-border)',
                padding: '0 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap'
              }}
              disabled={!videoData.videoUrl.trim()}
            >
              <Eye size={16} />
              {showPreview ? 'Ẩn' : 'Xem trước'}
            </button>
          </div>

          {videoData.videoUrl.trim() && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ExternalLink size={12} />
              Embed URL: {embedUrl}
            </span>
          )}
        </div>

        {/* Preview */}
        {showPreview && embedUrl && (
          <div style={{
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--color-accent)',
            backgroundColor: '#000'
          }}>
            <div style={{ padding: '0.4rem 0.8rem', backgroundColor: 'rgba(102, 192, 244, 0.1)', fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 600 }}>
              Xem trước Video
            </div>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={embedUrl}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
                scrolling="no"
                allow="autoplay; encrypted-media"
              />
            </div>
          </div>
        )}

        {/* Thumbnail */}
        <input
          type="text"
          className="input-field"
          placeholder="Link ảnh bìa (thumbnail URL)"
          value={videoData.thumbnail}
          onChange={e => setVideoData({ ...videoData, thumbnail: e.target.value })}
        />

        {/* Thumbnail Preview */}
        {videoData.thumbnail && (
          <div style={{ position: 'relative', maxWidth: '200px' }}>
            <img
              src={videoData.thumbnail}
              alt="Thumbnail preview"
              style={{
                width: '100%',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                objectFit: 'cover',
                aspectRatio: '16/9'
              }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Category + Tags */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Thể loại</label>
            <select
              className="input-field"
              value={videoData.category}
              onChange={e => setVideoData({ ...videoData, category: e.target.value })}
              style={{ margin: 0, cursor: 'pointer' }}
            >
              <option value="vam">VAM</option>
              <option value="3d">3D</option>
            </select>
          </div>
          <input
            type="text"
            className="input-field"
            placeholder="Tags (cách nhau bằng dấu phẩy)"
            value={typeof videoData.tags === 'string' ? videoData.tags : (videoData.tags || []).join(', ')}
            onChange={e => setVideoData({ ...videoData, tags: e.target.value })}
          />
        </div>

        {/* Description */}
        <textarea
          className="input-field"
          placeholder="Mô tả phim"
          rows="3"
          value={videoData.description}
          onChange={e => setVideoData({ ...videoData, description: e.target.value })}
        />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            className="btn btn-success"
            style={{ flex: 1, backgroundColor: 'var(--color-success)', color: 'white' }}
          >
            {editingVideoId ? 'Cập nhật Phim' : 'Thêm Phim'}
          </button>
          {editingVideoId && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCancelEdit}
            >
              Hủy
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default VideoForm;
