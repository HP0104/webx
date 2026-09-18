import React, { useState, useMemo, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { 
  Film, 
  Upload, 
  Eye, 
  Trash2, 
  Edit, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive, 
  Layers, 
  HelpCircle,
  FolderCheck,
  Key,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useAppContext } from '../App';
import VideoForm from '../components/Admin/VideoForm';
import { getVideoThumbnail } from '../utils/videoUtils';
import { 
  uploadVideoToStreamHG,
  TARGET_FOLDER_NAME,
  getStreamHGKey,
  saveStreamHGKey,
  checkStreamHGAuth,
  SYSTEM_STREAMHG_API_KEY
} from '../services/streamhgService';

const INITIAL_VIDEO_STATE = {
  title: '',
  videoUrl: '',
  thumbnail: '',
  category: 'vam',
  description: '',
  tags: '',
  views: 0
};

function UploaderDashboard() {
  const { user, videos = [], addVideoToStore, deleteVideoFromStore, updateVideoInStore } = useAppContext();

  // Guard: only uploader or admin allowed
  if (!user || (user.role !== 'uploader' && user.role !== 'admin')) {
    return <Navigate to={user ? '/' : '/auth'} replace />;
  }

  const [videoData, setVideoData] = useState(INITIAL_VIDEO_STATE);
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showAllVideosForAdmin, setShowAllVideosForAdmin] = useState(false);

  // StreamHG Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  // StreamHG API Key Configuration & Testing
  const [apiKeyInput, setApiKeyInput] = useState(() => getStreamHGKey());
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(false);
  const [keyCheckResult, setKeyCheckResult] = useState(null);
  const [keySavedBanner, setKeySavedBanner] = useState(false);

  const handleTestKey = async () => {
    setIsCheckingKey(true);
    setKeyCheckResult(null);
    try {
      const res = await checkStreamHGAuth(apiKeyInput);
      if (res.ok) {
        setKeyCheckResult({
          type: 'success',
          text: `Kết nối thành công! Tài khoản: ${res.data?.email || res.data?.login || 'Hợp lệ (Đã kích hoạt Webmaster)'}`
        });
      } else {
        setKeyCheckResult({
          type: 'error',
          text: res.msg || 'Không thể xác thực API Key với StreamHG.'
        });
      }
    } catch (err) {
      setKeyCheckResult({ type: 'error', text: 'Lỗi kiểm tra: ' + err.message });
    } finally {
      setIsCheckingKey(false);
    }
  };

  const handleSaveKey = () => {
    saveStreamHGKey(apiKeyInput);
    setKeySavedBanner(true);
    setTimeout(() => setKeySavedBanner(false), 3500);
  };

  const handleResetDefaultKey = () => {
    saveStreamHGKey(null);
    setApiKeyInput(SYSTEM_STREAMHG_API_KEY);
    setKeyCheckResult(null);
    setKeySavedBanner(true);
    setTimeout(() => setKeySavedBanner(false), 3500);
  };

  // Filter videos belonging to this uploader (or all if admin toggles it)
  const myVideos = useMemo(() => {
    return videos.filter(v => {
      if (user.role === 'admin' && showAllVideosForAdmin) return true;
      // Match by uploaderId, or fallback to uploaderName if uploaderId was missing
      return v.uploaderId === user.id || (!v.uploaderId && v.uploaderName === user.username);
    });
  }, [videos, user.id, user.username, user.role, showAllVideosForAdmin]);

  // Filtered & sorted videos
  const displayVideos = useMemo(() => {
    let result = myVideos.filter(v => {
      const matchSearch = (v.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'all' || v.category === categoryFilter;
      return matchSearch && matchCat;
    });

    if (sortBy === 'newest') {
      result = [...result].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } else if (sortBy === 'oldest') {
      result = [...result].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    } else if (sortBy === 'views') {
      result = [...result].sort((a, b) => (b.views || 0) - (a.views || 0));
    }

    return result;
  }, [myVideos, searchTerm, categoryFilter, sortBy]);

  // Statistics
  const totalViews = useMemo(() => {
    return myVideos.reduce((sum, v) => sum + (Number(v.views) || 0), 0);
  }, [myVideos]);

  // Handle Save (Add or Update)
  const handleSaveVideo = async (data) => {
    try {
      if (editingVideoId) {
        // Verify ownership (or admin)
        const target = videos.find(v => v.id.toString() === editingVideoId.toString());
        if (user.role !== 'admin' && target?.uploaderId && target.uploaderId !== user.id) {
          alert('Bạn chỉ có quyền sửa video của chính mình!');
          return;
        }

        await updateVideoInStore(editingVideoId, {
          ...data,
          uploaderId: target?.uploaderId || user.id,
          uploaderName: target?.uploaderName || user.username
        });
        alert('Cập nhật phim thành công!');
        setEditingVideoId(null);
      } else {
        await addVideoToStore({
          ...data,
          uploaderId: user.id,
          uploaderName: user.username || 'Uploader'
        });
        alert('Đăng phim mới thành công!');
      }

      setVideoData(INITIAL_VIDEO_STATE);
      setUploadStatus({ type: '', text: '' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      alert('Lỗi lưu video: ' + error.message);
    }
  };

  // Handle Edit Click
  const handleEditClick = (video) => {
    // Only own videos or admin
    if (user.role !== 'admin' && video.uploaderId && video.uploaderId !== user.id) {
      alert('Bạn chỉ có thể sửa video do chính mình đăng!');
      return;
    }

    setEditingVideoId(video.id);
    setVideoData({
      title: video.title || '',
      videoUrl: video.videoUrl || video.streamtapeUrl || '',
      thumbnail: video.thumbnail || '',
      category: video.category || 'vam',
      description: video.description || '',
      tags: Array.isArray(video.tags) ? video.tags.join(', ') : (video.tags || ''),
      views: video.views || 0,
      uploaderId: video.uploaderId || user.id,
      uploaderName: video.uploaderName || user.username
    });

    const formEl = document.getElementById('admin-video-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle Cancel Edit
  const handleCancelEdit = () => {
    setEditingVideoId(null);
    setVideoData(INITIAL_VIDEO_STATE);
  };

  // Handle Delete
  const handleDeleteClick = async (video) => {
    // Check permission: uploader can delete their own videos; admin can delete any
    if (user.role !== 'admin' && video.uploaderId && video.uploaderId !== user.id) {
      alert('Bạn chỉ có thể xóa video do chính mình đăng!');
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa phim "${video.title}"?`)) {
      try {
        await deleteVideoFromStore(video.id);
        if (editingVideoId === video.id) {
          handleCancelEdit();
        }
        alert('Đã xóa phim thành công!');
      } catch (error) {
        alert('Lỗi xóa video: ' + error.message);
      }
    }
  };

  // StreamHG Direct Upload into web18p.xyz folder
  const handleUploadToStreamHG = async () => {
    if (!selectedFile) {
      alert('Vui lòng chọn file video trước!');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus({ 
      type: 'info', 
      text: `Đang kết nối máy chủ StreamHG và tải lên thư mục "${TARGET_FOLDER_NAME}"...` 
    });

    try {
      const result = await uploadVideoToStreamHG(selectedFile, (progress) => {
        setUploadProgress(progress);
      }, TARGET_FOLDER_NAME);

      setUploadStatus({ 
        type: 'success', 
        text: `Tải lên thư mục "${TARGET_FOLDER_NAME}" thành công! Mã file: ${result.filecode}. Đã tự động điền link vào form bên dưới.` 
      });

      // Auto fill video form
      setVideoData(prev => ({
        ...prev,
        title: prev.title || selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        videoUrl: result.embedUrl,
        thumbnail: prev.thumbnail || result.thumbnailUrl
      }));

    } catch (error) {
      setUploadStatus({ 
        type: 'error', 
        text: `Lỗi tải lên StreamHG: ${error.message}. Bạn có thể dán link trực tiếp vào form bên dưới.` 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 210, 211, 0.1) 0%, rgba(20, 20, 24, 0.8) 100%)',
        border: '1px solid rgba(0, 210, 211, 0.3)',
        borderRadius: '12px',
        padding: '1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        backdropFilter: 'blur(10px)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span style={{
              backgroundColor: user.role === 'admin' ? '#ff4d4f' : '#00d2d3',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.75rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {user.role === 'admin' ? '⭐ Admin' : '🎬 Uploader'}
            </span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              ID: <code style={{ color: '#00d2d3' }}>{user.id?.substring(0, 8)}...</code>
            </span>
          </div>
          <h1 style={{ color: '#fff', margin: 0, fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Film size={28} color="#00d2d3" /> Kênh Đăng Video
          </h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.4rem 0 0 0', fontSize: '0.92rem' }}>
            Chào mừng <strong style={{ color: '#fff' }}>{user.username}</strong>. Bạn có quyền đăng video và quản lý, chỉnh sửa, xóa video của chính mình.
          </p>
        </div>

        {/* Quick Action for Admin */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {user.role === 'admin' && (
            <button
              onClick={() => setShowAllVideosForAdmin(!showAllVideosForAdmin)}
              className="btn btn-outline"
              style={{
                borderColor: showAllVideosForAdmin ? '#ff4d4f' : 'var(--color-border)',
                color: showAllVideosForAdmin ? '#ff4d4f' : 'var(--color-text-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem'
              }}
            >
              <Layers size={16} />
              {showAllVideosForAdmin ? 'Đang xem: Tất cả video' : 'Chỉ xem video của tôi'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.25rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '10px',
            backgroundColor: 'rgba(0, 210, 211, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00d2d3'
          }}>
            <Film size={26} />
          </div>
          <div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Phim đã đăng</div>
            <div style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 700 }}>
              {myVideos.length} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>video</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.25rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '10px',
            backgroundColor: 'rgba(102, 192, 244, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-accent)'
          }}>
            <Eye size={26} />
          </div>
          <div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Tổng lượt xem</div>
            <div style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 700 }}>
              {totalViews.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.25rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '10px',
            backgroundColor: 'rgba(82, 196, 26, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-success)'
          }}>
            <HardDrive size={26} />
          </div>
          <div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Nền tảng lưu trữ</div>
            <div style={{ color: '#52c41a', fontSize: '1.15rem', fontWeight: 700 }}>
              StreamHG
            </div>
            <div style={{ color: '#00d2d3', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <FolderCheck size={14} /> Thư mục: {TARGET_FOLDER_NAME}
            </div>
          </div>
        </div>
      </div>

      {/* StreamHG Upload Card (Direct File Upload & Tips) */}
      <div className="card" style={{ border: '1px solid rgba(255, 255, 255, 0.08)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
          <h2 style={{ color: 'var(--color-text-light)', fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={20} color="#00d2d3" /> Tải Video Lên StreamHG Hoặc Dán Link
          </h2>

          <button
            type="button"
            onClick={() => setShowKeyConfig(!showKeyConfig)}
            className="btn btn-outline"
            style={{
              fontSize: '0.75rem',
              padding: '0.35rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderColor: showKeyConfig ? '#00d2d3' : 'rgba(255, 255, 255, 0.15)',
              color: showKeyConfig ? '#00d2d3' : 'var(--color-text-muted)',
              borderRadius: '6px'
            }}
          >
            <Key size={14} /> {showKeyConfig ? 'Đóng cấu hình API' : 'Cấu hình API Key'}
          </button>
        </div>

        {/* API Key Configuration Dropdown / Panel */}
        {showKeyConfig && (
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(0, 210, 211, 0.25)',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
          }}>
            <div style={{ fontWeight: 600, color: '#00d2d3', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Key size={16} /> Quản Lý & Kiểm Tra API Key StreamHG
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              Nếu gặp lỗi <code style={{ color: '#ff4d4f' }}>Wrong auth</code>: Thường do tài khoản Webmaster trên StreamHG vẫn đang ở trạng thái <strong>Pending</strong> chưa được kích hoạt API, hoặc bạn vừa tạo mới API Key trên <a href="https://streamhg.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00d2d3', textDecoration: 'underline' }}>streamhg.com</a>. Bạn có thể dán key mới vào đây để kiểm tra và lưu ngay lập tức mà không cần build lại web.
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value.trim())}
                placeholder="Nhập StreamHG API Key (vd: 32607...)"
                className="form-control"
                style={{ flex: 1, minWidth: '240px', fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
              />
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isCheckingKey}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <RefreshCw size={14} className={isCheckingKey ? 'spin' : ''} />
                {isCheckingKey ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
              </button>
              <button
                type="button"
                onClick={handleSaveKey}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', backgroundColor: '#00d2d3', color: '#000', fontWeight: 700 }}
              >
                Lưu Key
              </button>
              <button
                type="button"
                onClick={handleResetDefaultKey}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.6rem', color: 'var(--color-text-muted)' }}
                title="Khôi phục key mặc định hệ thống"
              >
                Mặc định
              </button>
            </div>

            {keySavedBanner && (
              <div style={{ color: '#52c41a', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle2 size={14} /> Đã lưu API Key thành công vào bộ nhớ trình duyệt!
              </div>
            )}

            {keyCheckResult && (
              <div style={{
                marginTop: '0.3rem',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                backgroundColor: keyCheckResult.type === 'success' ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)',
                border: `1px solid ${keyCheckResult.type === 'success' ? 'rgba(82, 196, 26, 0.3)' : 'rgba(255, 77, 79, 0.3)'}`,
                color: keyCheckResult.type === 'success' ? '#52c41a' : '#ff7875',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.4rem'
              }}>
                {keyCheckResult.type === 'success' ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />}
                <div>{keyCheckResult.text}</div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
          {/* File Upload Box */}
          <div style={{
            border: '2px dashed rgba(0, 210, 211, 0.3)',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 210, 211, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}>
            <Upload size={32} color="#00d2d3" opacity={0.8} />
            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
              Tải file video trực tiếp vào thư mục {TARGET_FOLDER_NAME}
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', maxWidth: '380px' }}>
              Chọn file video từ máy tính (.mp4, .mkv, .avi, .webm) để tải trực tiếp lên máy chủ StreamHG vào thư mục <strong style={{ color: '#00d2d3' }}>{TARGET_FOLDER_NAME}</strong>.
            </div>

            <input
              type="file"
              accept="video/*,.mp4,.mkv,.avi,.webm"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                  setUploadStatus({ type: '', text: '' });
                }
              }}
              style={{ display: 'none' }}
              id="streamhg-file-picker"
            />

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
              <label
                htmlFor="streamhg-file-picker"
                className="btn btn-outline"
                style={{ cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {selectedFile ? `File: ${selectedFile.name}` : 'Chọn File Video'}
              </label>

              {selectedFile && (
                <button
                  type="button"
                  onClick={handleUploadToStreamHG}
                  disabled={isUploading}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#00d2d3',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: isUploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isUploading ? `Đang tải ${uploadProgress}%...` : `Tải lên StreamHG (${TARGET_FOLDER_NAME})`}
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div style={{ width: '100%', maxWidth: '360px', marginTop: '0.5rem' }}>
                <div style={{
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    backgroundColor: '#00d2d3',
                    transition: 'width 0.2s ease'
                  }} />
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.3rem', textAlign: 'right' }}>
                  {uploadProgress}%
                </div>
              </div>
            )}

            {/* Upload Message */}
            {uploadStatus.text && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'flex-start',
                textAlign: 'left',
                gap: '0.4rem',
                color: uploadStatus.type === 'success' ? '#52c41a' : uploadStatus.type === 'error' ? '#ff4d4f' : '#66c0f4'
              }}>
                {uploadStatus.type === 'success' ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />}
                <div>{uploadStatus.text}</div>
              </div>
            )}
          </div>

          {/* Guidelines Box */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '1.25rem',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ fontWeight: 600, color: '#00d2d3', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <HelpCircle size={16} /> Hướng dẫn đăng phim & lưu ý:
            </div>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
              <li>
                <strong style={{ color: '#ff7875' }}>Lỗi "Wrong auth"?</strong> Nguyên nhân do tài khoản Webmaster trên StreamHG vẫn đang ở trạng thái <em>Pending duyệt</em> (StreamHG khóa API upload cho tới khi được duyệt) hoặc API Key bị đổi.
              </li>
              <li>
                <strong style={{ color: '#52c41a' }}>Cách khắc phục ngay lập tức:</strong> Bạn chỉ cần mở <a href="https://streamhg.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00d2d3', textDecoration: 'underline' }}>streamhg.com</a>, tải video trực tiếp lên web StreamHG vào thư mục <code style={{ color: '#00d2d3' }}>{TARGET_FOLDER_NAME}</code>, rồi copy link video (ví dụ: <code style={{ color: '#66c0f4' }}>https://streamhg.com/e/...</code>) dán vào form bên dưới là xong!
              </li>
              <li>
                Hệ thống tự động nhận diện ID video StreamHG và tự động lấy ảnh bìa từ <strong style={{ color: '#fff' }}>huntrexus.com/ID.jpg</strong>.
              </li>
              <li>
                Hỗ trợ cả dán link các máy chủ khác: <strong style={{ color: '#fff' }}>Filemoon, VOE, YouTube, Doodstream</strong>.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Video Form Section */}
      <VideoForm
        videoData={videoData}
        setVideoData={setVideoData}
        editingVideoId={editingVideoId}
        onSaveVideo={handleSaveVideo}
        onCancelEdit={handleCancelEdit}
      />

      {/* Uploader's Video List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ color: 'var(--color-text-light)', fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Film size={20} color="#00d2d3" /> 
            {user.role === 'admin' && showAllVideosForAdmin ? 'Tất Cả Video Hệ Thống' : 'Danh Sách Video Của Bạn'} ({displayVideos.length})
          </h2>

          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            {/* Category Filter */}
            <select
              className="input-field"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem', minWidth: '120px', flex: '0 1 120px' }}
            >
              <option value="all">Tất cả thể loại</option>
              <option value="vam">VAM</option>
              <option value="3d">3D</option>
            </select>

            {/* Sort */}
            <select
              className="input-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem', minWidth: '140px', flex: '0 1 140px' }}
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="views">Nhiều lượt xem nhất</option>
            </select>

            {/* Search */}
            <div style={{ position: 'relative', flex: '2 1 200px', minWidth: '180px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Tìm phim của bạn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px', paddingRight: '12px', padding: '0.5rem 0.8rem 0.5rem 2rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Video Table */}
        <div style={{ overflowX: 'auto', maxHeight: '680px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.8rem 1rem', fontWeight: 600, minWidth: '260px', position: 'sticky', top: 0, backgroundColor: '#1a1a2e', zIndex: 1 }}>Phim</th>
                {user.role === 'admin' && showAllVideosForAdmin && (
                  <th style={{ padding: '0.8rem 1rem', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: '#1a1a2e', zIndex: 1 }}>Người đăng</th>
                )}
                <th style={{ padding: '0.8rem 1rem', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: '#1a1a2e', zIndex: 1 }}>Thể loại</th>
                <th style={{ padding: '0.8rem 1rem', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: '#1a1a2e', zIndex: 1 }}>Lượt xem</th>
                <th style={{ padding: '0.8rem 1rem', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: '#1a1a2e', zIndex: 1 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {displayVideos.length === 0 ? (
                <tr>
                  <td colSpan={user.role === 'admin' && showAllVideosForAdmin ? 5 : 4} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                    <Film size={32} opacity={0.3} style={{ marginBottom: '0.5rem' }} />
                    <div>{searchTerm ? 'Không tìm thấy video nào khớp với từ khóa.' : 'Bạn chưa đăng video nào. Hãy dùng form ở trên để đăng video đầu tiên!'}</div>
                  </td>
                </tr>
              ) : displayVideos.map(video => {
                const thumb = video.thumbnail || getVideoThumbnail(video.videoUrl || video.streamtapeUrl);
                const isOwnVideo = video.uploaderId === user.id || user.role === 'admin';

                return (
                  <tr key={video.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ width: '80px', height: '45px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)', backgroundColor: '#000', position: 'relative' }}>
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={video.title}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: thumb ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#141418',
                            color: 'var(--color-text-muted)'
                          }}>
                            <Film size={16} opacity={0.5} />
                          </div>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <Link
                            to={`/video/${video.id}`}
                            target="_blank"
                            style={{
                              color: 'var(--color-text-light)',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: '1.4'
                            }}
                            title={video.title}
                          >
                            {video.title}
                          </Link>
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                            {video.createdAt ? new Date(video.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {user.role === 'admin' && showAllVideosForAdmin && (
                      <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        <span style={{ color: video.uploaderId === user.id ? '#00d2d3' : 'var(--color-text-light)' }}>
                          {video.uploaderName || 'Admin'}
                          {video.uploaderId === user.id && ' (Bạn)'}
                        </span>
                      </td>
                    )}

                    <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: video.category === 'vam' ? 'rgba(255, 77, 106, 0.15)' : 'rgba(102, 192, 244, 0.15)',
                        color: video.category === 'vam' ? '#ff4d6a' : '#66c0f4',
                        textTransform: 'uppercase'
                      }}>
                        {video.category === 'vam' ? 'VAM' : '3D'}
                      </span>
                    </td>

                    <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {video.views > 0 ? `${video.views.toLocaleString()} views` : '0 views'}
                    </td>

                    <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {isOwnVideo && (
                          <button
                            onClick={() => handleEditClick(video)}
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Sửa video này"
                          >
                            <Edit size={13} /> Sửa
                          </button>
                        )}

                        {isOwnVideo && (
                          <button
                            onClick={() => handleDeleteClick(video)}
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Xóa video do chính bạn đăng"
                          >
                            <Trash2 size={13} /> Xóa
                          </button>
                        )}

                        <Link
                          to={`/video/${video.id}`}
                          target="_blank"
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: 'var(--color-accent)', borderColor: 'rgba(102, 192, 244, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          title="Xem trên web"
                        >
                          <Eye size={13} /> Xem
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UploaderDashboard;
