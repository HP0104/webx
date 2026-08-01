import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { Play, Eye, Calendar, Tag, Film, ArrowLeft, ChevronRight } from 'lucide-react';
import { toEmbedUrl, getVideoThumbnail as getVideoThumbnailFromUtils } from '../utils/videoUtils';
import ErrorReportButton from '../components/ErrorReportButton';
import { doc, updateDoc, increment, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Get thumbnail from video URL (exported for backwards compatibility with Videos.jsx).
 */
export function getVideoThumbnail(url) {
  return getVideoThumbnailFromUtils(url);
}

function VideoDetail() {
  const { videoId } = useParams();
  const { videos = [], user } = useAppContext();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const video = videos.find(v => v.id.toString() === videoId);

  // Lắng nghe bình luận realtime
  useEffect(() => {
    if (!video?.id) return;
    const qComments = query(collection(db, 'video_comments'), where('videoId', '==', video.id.toString()));
    const unsubscribe = onSnapshot(qComments, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Sắp xếp cũ -> mới
      setComments(list);
    }, (err) => {
      console.warn("Lỗi tải bình luận video:", err);
    });
    return () => unsubscribe();
  }, [video?.id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Vui lòng đăng nhập để bình luận!");
      return;
    }
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    const commentText = newComment.trim();

    try {
      // 1. Thêm bình luận
      await addDoc(collection(db, 'video_comments'), {
        videoId: video.id.toString(),
        userId: user.id || user.uid,
        authorName: user.username || user.email,
        authorAvatar: user.photoURL || null,
        text: commentText,
        createdAt: new Date().toISOString()
      });

      // 2. Bot kiểm tra từ khóa "lỗi"
      if (commentText.toLowerCase().includes('lỗi')) {
        await addDoc(collection(db, 'error_reports'), {
          type: 'video',
          itemId: video.id.toString(),
          itemTitle: video.title,
          message: `[AUTO-BOT] Người dùng báo lỗi qua bình luận: "${commentText}"`,
          senderName: user.username || user.email,
          senderId: user.id || user.uid,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }

      setNewComment('');
    } catch (err) {
      console.error("Lỗi gửi bình luận:", err);
      alert("Gửi bình luận thất bại!");
    } finally {
      setSubmittingComment(false);
    }
  };


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

        {/* BÌNH LUẬN VIDEO */}
        <div className="video-comments-section" style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Bình luận ({comments.length})
          </h3>
          
          {/* Form write comment */}
          <div style={{ marginBottom: '2rem' }}>
            {!user ? (
              <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Vui lòng đăng nhập để tham gia bình luận.</p>
                <Link to="/auth" className="btn btn-primary btn-sm">Đăng nhập ngay</Link>
              </div>
            ) : (
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '45px', height: '45px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-light)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                      {(user.username || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Nhập bình luận của bạn (nếu báo lỗi phim, hãy gõ từ 'lỗi' để bot ghi nhận nhé)..."
                    style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', minHeight: '80px', resize: 'vertical' }}
                    disabled={submittingComment}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={!newComment.trim() || submittingComment}>
                      {submittingComment ? 'Đang gửi...' : 'Gửi bình luận'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Comment list */}
          <div className="video-comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {comments.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontStyle: 'italic' }}>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    {comment.authorAvatar ? (
                      <img src={comment.authorAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-light)', fontWeight: 'bold' }}>
                        {(comment.authorName || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: 'var(--color-text-light)', fontWeight: 'bold', fontSize: '0.95rem' }}>{comment.authorName}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
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
