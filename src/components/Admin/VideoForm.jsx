import React, { useState, useMemo } from 'react';
import { Film, Eye, X, ExternalLink, Image as ImageIcon, Sparkles, Check, Play, AlertCircle, RefreshCw } from 'lucide-react';
import { toEmbedUrl, getVideoThumbnail, extractVideoInfoFromPaste, parseVideoUrl, getVideoProviderName } from '../../utils/videoUtils';

const POPULAR_TAGS = ['18+', 'Không Che', 'Vietsub', 'Full HD', 'VAM', 'Cosplay', '3D Anime', '60FPS', 'AI Remaster'];
const CATEGORIES = [
  { id: 'vam', label: 'VAM' },
  { id: '3d', label: '3D Anime' },
  { id: 'cosplay', label: 'Cosplay 18+' },
  { id: 'vietsub', label: 'JAV Vietsub' },
  { id: 'other', label: 'Khác' }
];

function VideoForm({
  videoData,
  setVideoData,
  editingVideoId,
  onSaveVideo,
  onCancelEdit
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  // Detected provider info
  const providerInfo = useMemo(() => {
    if (!videoData.videoUrl?.trim()) return null;
    const isEmbed = videoData.videoUrl.trim().toLowerCase().startsWith('<iframe') || videoData.videoUrl.trim().toLowerCase().startsWith('<script');
    if (isEmbed) {
      return { name: 'Mã Iframe Nhúng', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', isEmbed: true };
    }
    const parsed = parseVideoUrl(videoData.videoUrl);
    switch (parsed.provider) {
      case 'filemoon':
        return { name: 'StreamHG / Filemoon', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'voe':
        return { name: 'VOE Player', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'doodstream':
        return { name: 'Doodstream', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'youtube':
        return { name: 'YouTube', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
      default:
        return { name: getVideoProviderName(videoData.videoUrl) || 'Trực tiếp', color: '#00d2d3', bg: 'rgba(0, 210, 211, 0.15)' };
    }
  }, [videoData.videoUrl]);

  const handleUrlInput = (rawVal, preventDefaultEvent = null) => {
    const { videoUrl: extractedUrl, thumbnail } = extractVideoInfoFromPaste(rawVal);
    
    const isRawEmbed = rawVal && (rawVal.trim().toLowerCase().startsWith('<iframe') || rawVal.trim().toLowerCase().startsWith('<script'));
    const cleanUrl = isRawEmbed ? rawVal : (extractedUrl || rawVal);

    if (preventDefaultEvent && cleanUrl !== videoData.videoUrl) {
      preventDefaultEvent.preventDefault();
    }

    setVideoData(prev => ({
      ...prev,
      videoUrl: cleanUrl,
      thumbnail: thumbnail || prev.thumbnail
    }));

    setThumbError(false);
    return cleanUrl;
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    handleUrlInput(pasted, e);
  };

  const handleFetchThumbnail = async (optionalUrl, silent = false) => {
    let url = (typeof optionalUrl === 'string' ? optionalUrl : videoData.videoUrl).trim();
    if (!url) {
      if (!silent) alert('Vui lòng nhập link video trước!');
      return;
    }

    const { thumbnail: extractedThumb } = extractVideoInfoFromPaste(url);
    if (extractedThumb) {
      setVideoData(prev => ({ ...prev, videoUrl: url, thumbnail: extractedThumb }));
      setThumbError(false);
    }

    const parsed = parseVideoUrl(url);
    if (parsed.provider === 'unknown' && !silent) {
      alert('Chưa hỗ trợ tự động lấy ảnh bìa từ link này. Bạn vui lòng nhập link ảnh thủ công.');
      return;
    }

    const thumbUrl = getVideoThumbnail(url);
    if (!thumbUrl) {
      if (!silent) alert('Sever này (' + getVideoProviderName(url) + ') không hỗ trợ tự động lấy ảnh bìa. Vui lòng dán link ảnh bìa thủ công.');
      return;
    }

    setIsFetchingThumbnail(true);

    try {
      const isValid = await new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = thumbUrl;
      });

      if (isValid) {
        setVideoData(prev => ({ ...prev, thumbnail: thumbUrl }));
        setThumbError(false);
        if (!silent) alert('Tự động lấy ảnh bìa thành công!');
      } else {
        if (!silent) alert('Không tìm thấy ảnh bìa tự động trên sever. Bạn vui lòng nhập link ảnh thủ công.');
      }
    } catch (err) {
      console.error(err);
      if (!silent) alert('Lỗi lấy ảnh bìa: ' + err.message);
    } finally {
      setIsFetchingThumbnail(false);
    }
  };

  const handleToggleTag = (tag) => {
    const currentTags = typeof videoData.tags === 'string' 
      ? videoData.tags.split(',').map(t => t.trim()).filter(Boolean)
      : (videoData.tags || []);

    if (currentTags.includes(tag)) {
      const newTags = currentTags.filter(t => t !== tag);
      setVideoData(prev => ({ ...prev, tags: newTags.join(', ') }));
    } else {
      const newTags = [...currentTags, tag];
      setVideoData(prev => ({ ...prev, tags: newTags.join(', ') }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const { videoUrl: extractedUrl, thumbnail: extractedThumb } = extractVideoInfoFromPaste(videoData.videoUrl);
    const isRawEmbed = videoData.videoUrl && (videoData.videoUrl.trim().toLowerCase().startsWith('<iframe') || videoData.videoUrl.trim().toLowerCase().startsWith('<script'));
    const finalVideoUrl = isRawEmbed ? videoData.videoUrl.trim() : (extractedUrl || videoData.videoUrl).trim();

    if (!videoData.title.trim()) return alert('Vui lòng nhập tên phim!');
    if (!finalVideoUrl) return alert('Vui lòng nhập link video!');

    const data = {
      ...videoData,
      videoUrl: finalVideoUrl,
      thumbnail: extractedThumb || videoData.thumbnail,
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
  const activeTagsList = useMemo(() => {
    return typeof videoData.tags === 'string'
      ? videoData.tags.split(',').map(t => t.trim()).filter(Boolean)
      : (videoData.tags || []);
  }, [videoData.tags]);

  return (
    <div className="card" id="admin-video-form" style={{ padding: '1.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <h2 style={{ color: 'var(--color-text-light)', margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
          <Film size={22} color="var(--color-accent)" />
          {editingVideoId ? 'Chỉnh sửa Phim' : 'Thêm Phim Mới'}
        </h2>
        {editingVideoId && (
          <span style={{ fontSize: '0.78rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
            Đang ở chế độ chỉnh sửa
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* Title */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
            Tên Phim <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Nhập tên phim đầy đủ..."
            value={videoData.title}
            onChange={e => setVideoData({ ...videoData, title: e.target.value })}
            style={{ margin: 0, width: '100%' }}
            required
          />
        </div>

        {/* Video URL Row */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Link Video hoặc Mã nhúng <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {providerInfo && (
              <span 
                className="video-provider-badge" 
                style={{ backgroundColor: providerInfo.bg, color: providerInfo.color }}
              >
                {providerInfo.name}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Dán link StreamHG, Filemoon, VOE, Doodstream, YouTube... hoặc mã iframe"
              value={videoData.videoUrl}
              onChange={e => handleUrlInput(e.target.value)}
              onPaste={handlePaste}
              onBlur={(e) => handleFetchThumbnail(e.target.value, true)}
              style={{ flex: '1 1 280px', minWidth: '220px', margin: 0 }}
              required
            />
            
            <button
              type="button"
              onClick={() => handleFetchThumbnail(videoData.videoUrl, false)}
              className="btn btn-success"
              style={{
                backgroundColor: 'var(--color-success)',
                color: '#fff',
                padding: '0.55rem 1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              disabled={isFetchingThumbnail || !videoData.videoUrl?.trim()}
              title="Tự động trích xuất ảnh bìa từ link video"
            >
              {isFetchingThumbnail ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <ImageIcon size={16} />}
              <span>{isFetchingThumbnail ? 'Đang lấy...' : 'Lấy ảnh bìa'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="btn btn-outline"
              style={{
                borderColor: showPreview ? 'var(--color-accent)' : 'var(--color-border)',
                color: showPreview ? 'var(--color-accent)' : 'var(--color-text-light)',
                backgroundColor: showPreview ? 'rgba(102, 192, 244, 0.1)' : 'transparent',
                padding: '0.55rem 1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              disabled={!videoData.videoUrl?.trim()}
            >
              <Eye size={16} />
              <span>{showPreview ? 'Ẩn Player' : 'Xem trước'}</span>
            </button>
          </div>

          {videoData.videoUrl?.trim() && (
            <div style={{ marginTop: '0.4rem', color: 'var(--color-text-muted)', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <ExternalLink size={12} flexShrink={0} />
              <span>Embed URL: {embedUrl || videoData.videoUrl}</span>
            </div>
          )}
        </div>

        {/* Video Player Preview Box */}
        {showPreview && embedUrl && (
          <div style={{
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid var(--color-accent)',
            backgroundColor: '#000',
            animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{ padding: '0.5rem 0.9rem', backgroundColor: 'rgba(102, 192, 244, 0.12)', fontSize: '0.82rem', color: 'var(--color-accent)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Play size={14} />
                Xem trước phát Video
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={embedUrl}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
                scrolling="no"
                allow="autoplay; encrypted-media"
                title="Preview"
              />
            </div>
          </div>
        )}

        {/* Thumbnail Input & Live Preview */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
            Link Ảnh bìa (Thumbnail URL)
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Dán link ảnh bìa trực tiếp (https://...)"
            value={videoData.thumbnail || ''}
            onChange={e => {
              let val = e.target.value;
              if (val.match(/_t\.(jpg|jpeg|png|webp)$/i)) {
                val = val.replace(/_t\.(jpg|jpeg|png|webp)$/i, '.$1');
              }
              setVideoData({ ...videoData, thumbnail: val });
              setThumbError(false);
            }}
            style={{ margin: 0, width: '100%' }}
          />

          {/* Thumbnail Preview Card */}
          {videoData.thumbnail && !thumbError && (
            <div className="thumbnail-preview-box" style={{ marginTop: '0.65rem' }}>
              <div style={{ width: '120px', height: '68px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000', border: '1px solid var(--color-border)', flexShrink: 0 }}>
                <img
                  src={videoData.thumbnail}
                  alt="Ảnh bìa"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setThumbError(true)}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: '0.8rem' }}>
                <div style={{ color: 'var(--color-text-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Check size={14} color="#10b981" />
                  Ảnh bìa hợp lệ
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {videoData.thumbnail}
                </div>
                <button
                  type="button"
                  onClick={() => setVideoData(prev => ({ ...prev, thumbnail: '' }))}
                  style={{ background: 'none', border: 'none', color: '#ff4d4f', fontSize: '0.74rem', padding: 0, marginTop: '0.3rem', cursor: 'pointer' }}
                >
                  Xóa ảnh bìa
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Category & Tags Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
              Thể loại Phim
            </label>
            <select
              className="input-field"
              value={videoData.category || 'vam'}
              onChange={e => setVideoData({ ...videoData, category: e.target.value })}
              style={{ margin: 0, cursor: 'pointer', width: '100%' }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
              Thẻ Tags (cách nhau bởi dấu phẩy)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: 18+, Không Che, Vietsub..."
              value={typeof videoData.tags === 'string' ? videoData.tags : (videoData.tags || []).join(', ')}
              onChange={e => setVideoData({ ...videoData, tags: e.target.value })}
              style={{ margin: 0, width: '100%' }}
            />
          </div>
        </div>

        {/* Quick Tag Suggestion Chips */}
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>Gợi ý tag nhanh:</span>
          <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
            {POPULAR_TAGS.map((tag) => {
              const isSelected = activeTagsList.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className="quick-tag-chip"
                  style={{
                    backgroundColor: isSelected ? 'rgba(102, 192, 244, 0.2)' : 'rgba(255,255,255,0.05)',
                    borderColor: isSelected ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-text-light)'
                  }}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
            Mô tả Phim
          </label>
          <textarea
            className="input-field"
            placeholder="Nhập tóm tắt nội dung, diễn viên hoặc thông tin phim..."
            rows="3"
            value={videoData.description || ''}
            onChange={e => setVideoData({ ...videoData, description: e.target.value })}
            style={{ margin: 0, width: '100%' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn btn-success"
            style={{
              flex: '1 1 200px',
              backgroundColor: 'var(--color-success)',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <Film size={18} />
            {editingVideoId ? 'Cập nhật Thông tin Phim' : 'Thêm Phim Mới'}
          </button>

          {editingVideoId && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCancelEdit}
              style={{
                flex: '0 0 auto',
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem'
              }}
            >
              Hủy bỏ
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default VideoForm;
