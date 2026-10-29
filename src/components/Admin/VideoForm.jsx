import { useState, useMemo } from 'react';
import { 
  Film, 
  Eye, 
  X, 
  Image as ImageIcon, 
  Check, 
  Play, 
  RefreshCw, 
  Layers, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ClipboardList, 
  Sparkles 
} from 'lucide-react';
import { 
  toEmbedUrl, 
  getVideoThumbnail, 
  extractVideoInfoFromPaste, 
  parseVideoUrl, 
  getVideoProviderName 
} from '../../utils/videoUtils';

const POPULAR_TAGS = ['18+', 'Không Che', 'Vietsub', 'Full HD', 'VAM', 'Cosplay', '3D Anime', '60FPS', 'AI Remaster'];
const CATEGORIES = [
  { id: 'vam', label: 'VAM' },
  { id: '3d', label: '3D Anime' },
  { id: 'cosplay', label: 'Cosplay 18+' },
  { id: 'vietsub', label: 'JAV Vietsub' },
  { id: 'hentai', label: 'Hentai 2D' },
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
  const [previewEpUrl, setPreviewEpUrl] = useState('');
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  // Batch paste modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');

  const isSeries = Boolean(videoData.isSeries);
  const episodesList = Array.isArray(videoData.episodes) ? videoData.episodes : [];

  // Detected provider info for single video
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
    const { videoUrl: extractedUrl, thumbnail, title } = extractVideoInfoFromPaste(rawVal);
    const isScriptEmbed = rawVal && rawVal.trim().toLowerCase().startsWith('<script');
    
    let cleanUrl = rawVal;
    if (extractedUrl && rawVal.trim().toLowerCase().startsWith('<iframe')) {
      cleanUrl = extractedUrl;
    } else if (isScriptEmbed) {
      cleanUrl = rawVal;
    } else {
      cleanUrl = extractedUrl || rawVal;
    }

    if (preventDefaultEvent && cleanUrl !== videoData.videoUrl) {
      preventDefaultEvent.preventDefault();
    }

    setVideoData(prev => ({
      ...prev,
      videoUrl: cleanUrl,
      thumbnail: thumbnail || prev.thumbnail,
      title: title || prev.title
    }));

    setThumbError(false);
    return cleanUrl;
  };

  const handleTitlePaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    const isComboFormat = pasted.includes(' | ') && pasted.includes('http');
    const isIframe = pasted.trim().toLowerCase().startsWith('<iframe');
    const isUrl = pasted.trim().toLowerCase().startsWith('http');

    if (isComboFormat || isIframe || isUrl) {
      e.preventDefault();
      handleUrlInput(pasted);
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    handleUrlInput(pasted, e);
  };

  const handleFetchThumbnail = async (optionalUrl, silent = false) => {
    let url = (typeof optionalUrl === 'string' ? optionalUrl : videoData.videoUrl).trim();
    if (!url && isSeries && episodesList.length > 0) {
      url = episodesList[0].videoUrl;
    }
    if (!url) {
      if (!silent) alert('Vui lòng nhập link video trước!');
      return;
    }

    const { thumbnail: extractedThumb } = extractVideoInfoFromPaste(url);
    if (extractedThumb) {
      setVideoData(prev => ({ ...prev, thumbnail: extractedThumb }));
      setThumbError(false);
    }

    const parsed = parseVideoUrl(url);
    if (parsed.provider === 'unknown' && !silent) {
      alert('Chưa hỗ trợ tự động lấy ảnh bìa từ link này. Bạn vui lòng nhập link ảnh thủ công.');
      return;
    }

    const thumbUrl = getVideoThumbnail(url);
    if (!thumbUrl) {
      if (!silent) alert('Server này (' + getVideoProviderName(url) + ') không hỗ trợ tự động lấy ảnh bìa. Vui lòng dán link ảnh bìa thủ công.');
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
        if (!silent) alert('Không tìm thấy ảnh bìa tự động trên server. Bạn vui lòng nhập link ảnh thủ công.');
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

  // ==============================================================
  // Series / Episode Management Handlers
  // ==============================================================
  const handleAddEpisode = () => {
    const nextEpNum = episodesList.length + 1;
    const newEp = {
      id: `ep_${Date.now()}_${nextEpNum}`,
      episodeNumber: nextEpNum,
      title: `Tập ${nextEpNum}`,
      videoUrl: ''
    };
    setVideoData(prev => ({
      ...prev,
      episodes: [...(prev.episodes || []), newEp]
    }));
  };

  const handleUpdateEpisode = (index, field, value) => {
    setVideoData(prev => {
      const updated = [...(prev.episodes || [])];
      let cleanVal = value;
      if (field === 'videoUrl') {
        const { videoUrl: extracted } = extractVideoInfoFromPaste(value);
        cleanVal = extracted || value;
      }
      updated[index] = { ...updated[index], [field]: cleanVal };
      return { ...prev, episodes: updated };
    });
  };

  const handleDeleteEpisode = (index) => {
    if (!window.confirm(`Bạn có chắc muốn xóa Tập ${index + 1}?`)) return;
    setVideoData(prev => {
      const updated = (prev.episodes || []).filter((_, i) => i !== index);
      // Re-index episode numbers
      const reindexed = updated.map((ep, idx) => ({
        ...ep,
        episodeNumber: idx + 1,
        title: ep.title && ep.title.startsWith('Tập ') && !ep.title.includes(':')
          ? `Tập ${idx + 1}`
          : ep.title
      }));
      return { ...prev, episodes: reindexed };
    });
  };

  const handleMoveEpisode = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= episodesList.length) return;
    setVideoData(prev => {
      const updated = [...(prev.episodes || [])];
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      // Re-index
      const reindexed = updated.map((ep, idx) => ({
        ...ep,
        episodeNumber: idx + 1
      }));
      return { ...prev, episodes: reindexed };
    });
  };

  const handleBatchPasteSubmit = () => {
    if (!batchText.trim()) return;
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    const newEps = [];
    const baseCount = episodesList.length;

    lines.forEach((line, idx) => {
      const epNum = baseCount + idx + 1;
      let epTitle = `Tập ${epNum}`;
      let epUrl = line;

      if (line.includes('|')) {
        const parts = line.split('|');
        epTitle = parts[0].trim();
        epUrl = parts.slice(1).join('|').trim();
      } else {
        const m = line.match(/^(?:Tập|Tap|Ep|Episode|Chương|Part)\s*(\d+)[\s:.-]*(.*)$/i);
        if (m) {
          epTitle = `Tập ${m[1]}${m[2] ? ': ' + m[2].trim() : ''}`;
        }
      }

      const { videoUrl: extractedUrl } = extractVideoInfoFromPaste(epUrl);
      newEps.push({
        id: `ep_${Date.now()}_${epNum}`,
        episodeNumber: epNum,
        title: epTitle,
        videoUrl: extractedUrl || epUrl
      });
    });

    if (newEps.length > 0) {
      setVideoData(prev => ({
        ...prev,
        episodes: [...(prev.episodes || []), ...newEps]
      }));
      setBatchText('');
      setShowBatchModal(false);
    }
  };

  // ==============================================================
  // Form Submission
  // ==============================================================
  const handleSubmit = (e) => {
    e.preventDefault();

    const effectiveTitle = (videoData.title || '').trim();
    if (!effectiveTitle) return alert('Vui lòng nhập tên phim!');

    let finalVideoUrl;
    let finalEpisodes = [];

    if (isSeries) {
      if (episodesList.length === 0) {
        return alert('Vui lòng thêm ít nhất 1 tập cho phim bộ!');
      }
      for (let i = 0; i < episodesList.length; i++) {
        const ep = episodesList[i];
        if (!ep.videoUrl || !ep.videoUrl.trim()) {
          return alert(`Tập ${i + 1} (${ep.title}) đang trống link video! Vui lòng kiểm tra lại.`);
        }
      }
      finalEpisodes = episodesList.map((ep, idx) => ({
        ...ep,
        episodeNumber: idx + 1,
        title: ep.title?.trim() || `Tập ${idx + 1}`,
        videoUrl: ep.videoUrl.trim()
      }));
      // Fallback videoUrl for legacy cards/components
      finalVideoUrl = finalEpisodes[0].videoUrl;
    } else {
      const { videoUrl: extractedUrl } = extractVideoInfoFromPaste(videoData.videoUrl);
      const isScriptEmbed = videoData.videoUrl && videoData.videoUrl.trim().toLowerCase().startsWith('<script');
      finalVideoUrl = videoData.videoUrl ? videoData.videoUrl.trim() : '';
      if (extractedUrl && finalVideoUrl.toLowerCase().startsWith('<iframe')) {
        finalVideoUrl = extractedUrl;
      } else if (!isScriptEmbed) {
        finalVideoUrl = (extractedUrl || finalVideoUrl).trim();
      }
      if (!finalVideoUrl) return alert('Vui lòng nhập link video!');
    }

    const data = {
      ...videoData,
      isSeries,
      episodes: finalEpisodes,
      totalEpisodes: isSeries ? finalEpisodes.length : 1,
      videoUrl: finalVideoUrl,
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

  const embedUrl = toEmbedUrl(previewEpUrl || videoData.videoUrl);
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
        
        {/* Toggle: Phim Lẻ vs Phim Bộ */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          padding: '0.85rem 1rem', 
          borderRadius: '8px', 
          backgroundColor: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-light)' }}>
            Hình thức phim:
          </span>
          <div style={{ display: 'inline-flex', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', padding: '3px' }}>
            <button
              type="button"
              onClick={() => setVideoData(prev => ({ ...prev, isSeries: false }))}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.84rem',
                backgroundColor: !isSeries ? 'var(--color-accent)' : 'transparent',
                color: !isSeries ? '#000' : 'var(--color-text-muted)',
                transition: 'all 0.2s ease'
              }}
            >
              🎬 Phim Lẻ (1 Tập)
            </button>
            <button
              type="button"
              onClick={() => {
                setVideoData(prev => {
                  let eps = Array.isArray(prev.episodes) && prev.episodes.length > 0 ? prev.episodes : [];
                  if (eps.length === 0 && prev.videoUrl?.trim()) {
                    eps = [{ id: `ep_${Date.now()}_1`, episodeNumber: 1, title: 'Tập 1', videoUrl: prev.videoUrl.trim() }];
                  }
                  return { ...prev, isSeries: true, episodes: eps };
                });
              }}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.84rem',
                backgroundColor: isSeries ? '#a855f7' : 'transparent',
                color: isSeries ? '#fff' : 'var(--color-text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Layers size={14} />
              📺 Phim Bộ (Nhiều Tập)
            </button>
          </div>
          {isSeries && (
            <span style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: 600 }}>
              Đã có {episodesList.length} tập
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
            Tên Phim <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder={isSeries ? "Nhập tên bộ phim (VD: Tiên Nghịch, Đấu La Đại Lục...)" : "Nhập tên phim đầy đủ..."}
            value={videoData.title || ''}
            onChange={e => setVideoData({ ...videoData, title: e.target.value })}
            onPaste={handleTitlePaste}
            style={{ margin: 0, width: '100%' }}
            required
          />
        </div>

        {/* ============================================================== */}
        {/* NẾU LÀ PHIM BỘ: HIỂN THỊ KHU VỰC QUẢN LÝ TẬP PHIM */}
        {/* ============================================================== */}
        {isSeries ? (
          <div style={{
            borderRadius: '10px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            backgroundColor: 'rgba(168, 85, 247, 0.03)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={18} />
                  Danh Sách Tập Phim ({episodesList.length} tập)
                </h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                  Hệ thống tự động kích hoạt chế độ xem liên tục không ngắt quãng (Double-Buffering)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', borderColor: '#a855f7', color: '#c084fc', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <ClipboardList size={14} />
                  Dán hàng loạt
                </button>

                <button
                  type="button"
                  onClick={handleAddEpisode}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', backgroundColor: '#a855f7', borderColor: '#a855f7', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={14} />
                  Thêm tập mới
                </button>
              </div>
            </div>

            {/* Batch Paste Modal Card */}
            {showBatchModal && (
              <div style={{
                marginBottom: '1rem',
                padding: '1rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid #a855f7'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c084fc' }}>
                    Dán nhanh danh sách tập (mỗi dòng 1 link hoặc định dạng "Tên tập | Link"):
                  </label>
                  <button type="button" onClick={() => setShowBatchModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
                <textarea
                  className="input-field"
                  rows={5}
                  placeholder={`Ví dụ:\nhttps://streamhg.com/e/link_tap_1\nhttps://streamhg.com/e/link_tap_2\nHoặc:\nTập 1: Khởi đầu | https://streamhg.com/e/link_tap_1\nTập 2: Đột phá | https://streamhg.com/e/link_tap_2`}
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.82rem', width: '100%', marginBottom: '0.6rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setShowBatchModal(false)} className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
                    Hủy
                  </button>
                  <button type="button" onClick={handleBatchPasteSubmit} className="btn btn-success" style={{ fontSize: '0.78rem', padding: '0.35rem 0.9rem', backgroundColor: '#a855f7', color: '#fff' }}>
                    Phân tích & Thêm {batchText.split('\n').filter(l => l.trim()).length} tập
                  </button>
                </div>
              </div>
            )}

            {/* Episode List Items */}
            {episodesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Chưa có tập phim nào. Bấm <strong>"+ Thêm tập mới"</strong> hoặc <strong>"Dán hàng loạt"</strong> để thêm danh sách tập.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {episodesList.map((ep, idx) => {
                  const epProvider = ep.videoUrl ? parseVideoUrl(ep.videoUrl) : null;
                  return (
                    <div 
                      key={ep.id || idx}
                      style={{
                        display: 'flex',
                        gap: '0.6rem',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '6px',
                        padding: '0.55rem 0.75rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <span style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '6px', 
                        backgroundColor: 'rgba(168, 85, 247, 0.15)', 
                        color: '#c084fc', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 700, 
                        fontSize: '0.82rem',
                        flexShrink: 0
                      }}>
                        #{idx + 1}
                      </span>

                      {/* Episode Title */}
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Tên tập (VD: Tập 1)"
                        value={ep.title || ''}
                        onChange={e => handleUpdateEpisode(idx, 'title', e.target.value)}
                        style={{ width: '130px', margin: 0, padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                      />

                      {/* Episode Video URL */}
                      <div style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Dán link StreamHG, VOE, Filemoon, iframe..."
                          value={ep.videoUrl || ''}
                          onChange={e => handleUpdateEpisode(idx, 'videoUrl', e.target.value)}
                          style={{ flex: 1, margin: 0, padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                        />
                        {epProvider && epProvider.provider !== 'unknown' && (
                          <span style={{ fontSize: '0.7rem', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.2rem 0.4rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                            {epProvider.provider.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewEpUrl(ep.videoUrl);
                            setShowPreview(true);
                          }}
                          disabled={!ep.videoUrl}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', opacity: ep.videoUrl ? 1 : 0.4 }}
                          title="Xem thử tập này"
                        >
                          <Play size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveEpisode(idx, -1)}
                          disabled={idx === 0}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', opacity: idx === 0 ? 0.3 : 1 }}
                          title="Đẩy lên trên"
                        >
                          <ArrowUp size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveEpisode(idx, 1)}
                          disabled={idx === episodesList.length - 1}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', opacity: idx === episodesList.length - 1 ? 0.3 : 1 }}
                          title="Đẩy xuống dưới"
                        >
                          <ArrowDown size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEpisode(idx)}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.3)' }}
                          title="Xóa tập này"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* NẾU LÀ PHIM LẺ: HIỂN THỊ Ô DÁN LINK ĐƠN */
          /* ============================================================== */
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
                value={videoData.videoUrl || ''}
                onChange={e => handleUrlInput(e.target.value)}
                onPaste={handlePaste}
                onBlur={(e) => handleFetchThumbnail(e.target.value, true)}
                style={{ flex: '1 1 280px', minWidth: '220px', margin: 0 }}
                required={!isSeries}
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
                onClick={() => {
                  setPreviewEpUrl('');
                  setShowPreview(!showPreview);
                }}
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
          </div>
        )}

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
                Xem trước phát Video {previewEpUrl ? '(Tập đã chọn)' : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowPreview(false);
                  setPreviewEpUrl('');
                }}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Ảnh Bìa Phim (Thumbnail Poster)
            </label>
            {isSeries && episodesList.length > 0 && (
              <button
                type="button"
                onClick={() => handleFetchThumbnail(episodesList[0]?.videoUrl, false)}
                style={{ background: 'none', border: 'none', color: '#c084fc', fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}
              >
                <Sparkles size={13} /> Lấy ảnh bìa từ Tập 1
              </button>
            )}
          </div>
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
              backgroundColor: isSeries ? '#a855f7' : 'var(--color-success)',
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
            {isSeries ? <Layers size={18} /> : <Film size={18} />}
            {editingVideoId 
              ? (isSeries ? 'Cập nhật Phim Bộ' : 'Cập nhật Thông tin Phim')
              : (isSeries ? `Thêm Phim Bộ Mới (${episodesList.length} Tập)` : 'Thêm Phim Mới')}
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
