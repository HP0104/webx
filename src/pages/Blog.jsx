import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../App';
import { Edit, Image, MessageSquare, User, Calendar, Upload } from 'lucide-react';

const DEFAULT_BLOG_IMAGE = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800';

function Blog() {
  // ==========================================
  // CỜ BẬT/TẮT TÍNH NĂNG BLOG TẠM THỜI
  // ==========================================
  const isUnderDevelopment = true; // Sửa thành false để kích hoạt lại Blog bất cứ lúc nào!
  // ==========================================

  const { user } = useAppContext();
  const [blogs, setBlogs] = useState([]);
  const [comments, setComments] = useState([]);
  const [newCommentTexts, setNewCommentTexts] = useState({}); // { [blogId]: '' }
  const [expandedComments, setExpandedComments] = useState({}); // { [blogId]: false }
  
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync blogs in real-time
  useEffect(() => {
    if (isUnderDevelopment) return; // Không tải dữ liệu thừa khi đang khóa tạm thời
    const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBlogs(list);
    }, (err) => {
      console.warn("Firestore blogs query error:", err);
    });
    return () => unsubscribe();
  }, [isUnderDevelopment]);

  // Sync comments in real-time
  useEffect(() => {
    if (isUnderDevelopment) return; // Không tải dữ liệu thừa khi đang khóa tạm thời
    const qComments = query(collection(db, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(qComments, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(list);
    }, (err) => {
      console.warn("Firestore comments query error:", err);
    });
    return () => unsubscribeComments();
  }, [isUnderDevelopment]);

  // Handle local image file upload and convert to base64
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Kích thước file ảnh không được vượt quá 2MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result); // Base64 string stored!
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Vui lòng đăng nhập trước khi đăng bài!");
    if (!title.trim() || !content.trim()) return alert("Vui lòng điền đủ Tiêu đề và Nội dung!");

    setLoading(true);
    try {
      await addDoc(collection(db, 'blogs'), {
        title: title.trim(),
        content: content.trim(),
        image: imageUrl.trim() || DEFAULT_BLOG_IMAGE,
        createdAt: serverTimestamp(),
        authorId: user.id || user.uid,
        authorName: user.username,
        authorAvatar: user.photoURL || null
      });

      setTitle('');
      setContent('');
      setImageUrl('');
      setShowForm(false);
      alert("Đăng bài thành công!");
    } catch (err) {
      alert("Lỗi khi đăng bài: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e, blogId) => {
    e.preventDefault();
    if (!user) return alert("Vui lòng đăng nhập để bình luận!");
    const commentText = newCommentTexts[blogId];
    if (!commentText || !commentText.trim()) return;

    try {
      await addDoc(collection(db, 'comments'), {
        blogId,
        text: commentText.trim(),
        createdAt: serverTimestamp(),
        authorId: user.id || user.uid,
        authorName: user.username,
        authorAvatar: user.photoURL || null
      });
      setNewCommentTexts(prev => ({ ...prev, [blogId]: '' }));
    } catch (err) {
      alert("Lỗi bình luận: " + err.message);
    }
  };

  const toggleComments = (blogId) => {
    setExpandedComments(prev => ({
      ...prev,
      [blogId]: !prev[blogId]
    }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Vừa xong';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ==========================================
  // GIAO DIỆN KHÓA TẠM THỜI (KHI ĐANG PHÁT TRIỂN)
  // ==========================================
  if (isUnderDevelopment) {
    return (
      <div style={{ 
        maxWidth: '650px', 
        margin: '4rem auto', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        borderRadius: '24px',
        backgroundColor: 'rgba(20, 20, 24, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)',
        position: 'relative',
        overflow: 'hidden'
      }} className="fade-in">
        {/* Decorative Blur Background Glow */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(102, 192, 244, 0.18) 0%, transparent 70%)',
          filter: 'blur(30px)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        {/* Pulsating Glassmorphic Icon */}
        <div style={{
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(102, 192, 244, 0.2) 0%, rgba(102, 192, 244, 0.03) 100%)',
          border: '1px solid rgba(102, 192, 244, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem',
          boxShadow: '0 0 40px rgba(102, 192, 244, 0.25)',
          animation: 'pulseGlow 2.5s infinite ease-in-out',
          zIndex: 1
        }}>
          <MessageSquare size={44} color="var(--color-accent)" style={{ opacity: 0.9 }} />
        </div>

        {/* Main Announcement Headers */}
        <h1 style={{ 
          color: 'var(--color-text-light)', 
          fontSize: '2.2rem', 
          fontWeight: '700', 
          marginBottom: '1rem',
          letterSpacing: '1px',
          zIndex: 1
        }}>
          TÍNH NĂNG ĐANG PHÁT TRIỂN
        </h1>
        
        {/* Supportive Description Text */}
        <p style={{ 
          color: 'var(--color-text-muted)', 
          fontSize: '1.05rem', 
          lineHeight: '1.8', 
          marginBottom: '2.5rem',
          maxWidth: '480px',
          zIndex: 1
        }}>
          Tính năng <strong style={{ color: 'var(--color-text-light)' }}>Cộng đồng Blog</strong> của WEB18P đang được nâng cấp bảo mật và tối ưu hóa hệ thống. Chúng tôi sẽ sớm ra mắt với diện mạo hoàn toàn mới!
        </p>

        {/* Call to Action Button */}
        <Link 
          to="/"
          className="btn btn-primary" 
          style={{ 
            padding: '0.8rem 2.5rem', 
            borderRadius: '30px', 
            fontSize: '0.95rem',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(102, 192, 244, 0.3)',
            transition: 'all 0.3s ease',
            zIndex: 1
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Quay về Trang chủ
        </Link>
        
        {/* Dynamic Keyframes Injection */}
        <style>{`
          @keyframes pulseGlow {
            0% { transform: scale(1); box-shadow: 0 0 40px rgba(102, 192, 244, 0.25); }
            50% { transform: scale(1.06); box-shadow: 0 0 60px rgba(102, 192, 244, 0.45); }
            100% { transform: scale(1); box-shadow: 0 0 40px rgba(102, 192, 244, 0.25); }
          }
        `}</style>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN BLOG GỐC (Sẽ hiện khi isUnderDevelopment = false)
  // ==========================================
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
        <h1 style={{ color: 'var(--color-text-light)', margin: 0 }}>CỘNG ĐỒNG BLOG</h1>
        {user ? (
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="btn"
            style={{ background: 'var(--color-accent)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Edit size={18} />
            {showForm ? 'Đóng Form' : 'Viết Bài'}
          </button>
        ) : (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Đăng nhập để viết bài</div>
        )}
      </div>

      {showForm && user && (
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ color: 'var(--color-text-light)', fontSize: '1.2rem', margin: 0 }}>Tạo bài viết mới</h2>
          
          <input 
            type="text" 
            placeholder="Tiêu đề bài viết..." 
            className="input-field" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
          
          {/* Direct File Image Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', border: '1px dashed var(--color-border)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
            <label style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Upload size={16} />
              Tải file ảnh từ máy tính (Khuyên dùng)
            </label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageFileChange} 
              style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }} 
            />
          </div>

          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>HOẶC</div>

          <input 
            type="text" 
            placeholder="Link ảnh bài viết (Unsplash, Imgur...)" 
            className="input-field" 
            value={imageUrl.startsWith('data:image') ? '' : imageUrl} 
            onChange={e => setImageUrl(e.target.value)} 
          />

          {/* Image Preview Block */}
          {imageUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Xem trước ảnh bìa:</span>
              <div style={{ width: '120px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          )}

          <textarea 
            placeholder="Nội dung bài viết..." 
            className="input-field" 
            rows="6" 
            value={content} 
            onChange={e => setContent(e.target.value)} 
            required 
          />

          <button 
            type="submit" 
            className="btn btn-success" 
            style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
            disabled={loading}
          >
            {loading ? 'Đang gửi...' : 'Đăng bài viết'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {blogs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <MessageSquare size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--color-text-light)', margin: '0 0 0.5rem 0' }}>Chưa có bài viết nào</h3>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>Hãy là người đầu tiên chia sẻ suy nghĩ của bạn về game!</p>
          </div>
        ) : (
          blogs.map(blog => {
            const blogComments = comments.filter(c => c.blogId === blog.id);
            const isCommentsExpanded = !!expandedComments[blog.id];
            
            return (
              <div key={blog.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                {blog.image && (
                  <div style={{ width: '100%', height: '350px', overflow: 'hidden' }}>
                    <img 
                      src={blog.image} 
                      alt={blog.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                )}
                
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h2 style={{ color: 'var(--color-text-light)', fontSize: '1.5rem', margin: 0, lineHeight: 1.3 }}>{blog.title}</h2>
                  
                  {/* Author Block */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                      {blog.authorAvatar ? (
                        <img src={blog.authorAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={20} style={{ color: 'var(--color-text-muted)' }} />
                      )}
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-light)', fontWeight: 'bold', fontSize: '0.95rem' }}>{blog.authorName}</div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                        <Calendar size={12} />
                        {formatDate(blog.createdAt)}
                      </div>
                    </div>
                  </div>

                  <p style={{ color: 'var(--color-text-light)', fontSize: '1rem', lineHeight: 1.6, margin: '0.5rem 0', whiteSpace: 'pre-wrap' }}>
                    {blog.content}
                  </p>

                  {/* Comments Toggle Action */}
                  <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => toggleComments(blog.id)} 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: isCommentsExpanded ? 'var(--color-accent)' : 'var(--color-text-muted)', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.4rem', 
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        transition: 'color 0.2s ease'
                      }}
                    >
                      <MessageSquare size={18} />
                      <span>Bình luận ({blogComments.length})</span>
                    </button>
                  </div>

                  {/* Comments Thread Drawer */}
                  {isCommentsExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                      
                      {/* Form write comment */}
                      {user ? (
                        <form onSubmit={(e) => handleAddComment(e, blog.id)} style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            placeholder="Viết bình luận..." 
                            className="input-field" 
                            value={newCommentTexts[blog.id] || ''} 
                            onChange={e => setNewCommentTexts(prev => ({ ...prev, [blog.id]: e.target.value }))}
                            style={{ flex: 1, margin: 0, fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                            required
                          />
                          <button type="submit" className="btn" style={{ background: 'var(--color-accent)', color: 'white', padding: '0 1.2rem', fontSize: '0.85rem' }}>Gửi</button>
                        </form>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>Vui lòng đăng nhập để bình luận bài viết.</div>
                      )}

                      {/* Comments Thread list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {blogComments.length === 0 ? (
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                            Chưa có bình luận nào. Hãy là người đầu tiên thảo luận!
                          </div>
                        ) : (
                          blogComments.map(comment => (
                            <div key={comment.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.6rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.01)' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0 }}>
                                {comment.authorAvatar ? (
                                  <img src={comment.authorAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <User size={14} style={{ color: 'var(--color-text-muted)' }} />
                                )}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <span style={{ color: 'var(--color-text-light)', fontWeight: 'bold', fontSize: '0.8rem' }}>{comment.authorName}</span>
                                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                                    {formatDate(comment.createdAt)}
                                  </span>
                                </div>
                                <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', margin: '0.2rem 0 0 0', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                                  {comment.text}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Blog;
