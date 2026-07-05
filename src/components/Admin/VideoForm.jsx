import React, { useState } from 'react';
import { Film, Eye, X, ExternalLink, Image } from 'lucide-react';

/**
 * Convert a Streamtape /v/ link to an embeddable /e/ link.
 */
function toEmbedUrl(url) {
  if (!url) return '';
  return url.replace('streamtape.com/v/', 'streamtape.com/e/');
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

  const handleFetchThumbnail = async (optionalUrl, silent = false) => {
    const url = (typeof optionalUrl === 'string' ? optionalUrl : videoData.streamtapeUrl).trim();
    if (!url) {
      if (!silent) alert('Vui lòng nhập link Streamtape trước!');
      return;
    }

    setIsFetchingThumbnail(true);
    
    // Normalize URL to /v/ format to make sure we hit the main page with og:image metadata
    const videoPageUrl = url.replace('streamtape.com/e/', 'streamtape.com/v/');
    
    // List of CORS Proxies to try sequentially
    const proxies = [
      {
        url: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        parse: (res) => res.text()
      },
      {
        url: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        parse: (res) => res.text()
      },
      {
        url: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
        parse: async (res) => {
          const json = await res.json();
          return json.contents || '';
        }
      }
    ];

    let html = '';
    let success = false;
    
    for (const proxy of proxies) {
      try {
        const proxyUrl = proxy.url(videoPageUrl);
        const response = await fetch(proxyUrl);
        if (response.ok) {
          html = await proxy.parse(response);
          if (html && html.trim().length > 0) {
            success = true;
            break;
          }
        }
      } catch (err) {
        console.warn('CORS Proxy failed:', err);
      }
    }

    if (!success) {
      setIsFetchingThumbnail(false);
      if (!silent) alert('Lỗi lấy ảnh bìa: Không thể kết nối với các máy chủ proxy CORS. Bạn vui lòng nhập link ảnh thủ công.');
      return;
    }

    try {
      // 1. Match og:image tag with quote-agnostic and order-agnostic regex
      const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || 
                           html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

      if (ogImageMatch && ogImageMatch[1]) {
        let thumbUrl = ogImageMatch[1];
        if (thumbUrl.startsWith('//')) {
          thumbUrl = 'https:' + thumbUrl;
        }
        setVideoData(prev => ({ ...prev, thumbnail: thumbUrl }));
        if (!silent) alert('Tự động lấy ảnh bìa thành công!');
        return;
      }

      // 2. Fallback to matching any thumb.tapecontent.net URL in the body html
      const tapecontentMatch = html.match(/(?:https?:)?\/\/thumb\.tapecontent\.net\/[a-zA-Z0-9_\-\.\/]+/i);
      if (tapecontentMatch && tapecontentMatch[0]) {
        let thumbUrl = tapecontentMatch[0];
        if (thumbUrl.startsWith('//')) {
          thumbUrl = 'https:' + thumbUrl;
        }
        setVideoData(prev => ({ ...prev, thumbnail: thumbUrl }));
        if (!silent) alert('Tự động lấy ảnh bìa thành công!');
        return;
      }

      // 3. Fallback to poster="..." tag in video element
      const posterMatch = html.match(/poster=["']([^"']+)["']/i) || 
                          html.match(/poster\s*:\s*['"]([^'"]+)['"]/i);
      if (posterMatch && posterMatch[1]) {
        let thumbUrl = posterMatch[1];
        if (thumbUrl.startsWith('//')) {
          thumbUrl = 'https:' + thumbUrl;
        }
        setVideoData(prev => ({ ...prev, thumbnail: thumbUrl }));
        if (!silent) alert('Tự động lấy ảnh bìa từ video poster thành công!');
      } else {
        if (!silent) alert('Không tìm thấy ảnh bìa trên trang Streamtape. Bạn vui lòng nhập thủ công.');
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
    if (!videoData.streamtapeUrl.trim()) return alert('Vui lòng nhập link Streamtape!');

    const data = {
      ...videoData,
      streamtapeUrl: toEmbedUrl(videoData.streamtapeUrl.trim()),
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

  const embedUrl = toEmbedUrl(videoData.streamtapeUrl);

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

        {/* Streamtape URL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Link Streamtape (ví dụ: https://streamtape.com/v/xxxx/name.mp4)"
              value={videoData.streamtapeUrl}
              onChange={e => setVideoData({ ...videoData, streamtapeUrl: e.target.value })}
              onBlur={(e) => handleFetchThumbnail(e.target.value, true)}
              style={{ flex: 1, margin: 0 }}
              required
            />
            <button
              type="button"
              onClick={() => handleFetchThumbnail(videoData.streamtapeUrl, false)}
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
              disabled={isFetchingThumbnail || !videoData.streamtapeUrl.trim()}
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
              disabled={!videoData.streamtapeUrl.trim()}
            >
              <Eye size={16} />
              {showPreview ? 'Ẩn' : 'Xem trước'}
            </button>
          </div>

          {videoData.streamtapeUrl.trim() && (
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
