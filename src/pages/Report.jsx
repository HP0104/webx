import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../App';
import { MessageSquare, Send, User, ShieldAlert, Bug, Image as ImageIcon, X } from 'lucide-react';

function Report() {
  const { user } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // Lưu ảnh Base64
  const [selectedUserId, setSelectedUserId] = useState(null);
  const scrollRef = useRef();

  // Xử lý đọc file ảnh thành Base64
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert("Kích thước ảnh quá lớn! Vui lòng chọn ảnh dưới 500KB để gửi hỗ trợ nhanh chóng.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Sub to all reports messages
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(list);
    }, (err) => {
      console.warn("Firestore reports error:", err);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedUserId]);

  if (!user) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
        <Bug size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }} />
        <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1rem' }}>BÁO LỖI & HỖ TRỢ</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Vui lòng đăng nhập tài khoản để gửi yêu cầu báo lỗi hoặc chat trực tiếp với Admin.</p>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  // For Admin: Triage list of users who sent reports
  const uniqueReporters = [];
  messages.forEach(msg => {
    if (msg.senderRole !== 'admin' && !uniqueReporters.some(r => r.id === msg.channelId)) {
      uniqueReporters.push({
        id: msg.channelId,
        username: msg.senderName
      });
    }
  });

  // Filter messages for current active channel
  const activeChannelId = isAdmin ? selectedUserId : user.id;
  const activeMessages = messages.filter(msg => msg.channelId === activeChannelId);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !activeChannelId) return;

    try {
      await addDoc(collection(db, 'reports'), {
        text: newMessage.trim(),
        image: selectedImage || null,
        createdAt: serverTimestamp(),
        senderId: user.id || user.uid,
        senderName: user.username,
        senderRole: user.role || 'user',
        channelId: activeChannelId
      });
      setNewMessage('');
      setSelectedImage(null);
    } catch (err) {
      console.error(err);
      alert("Lỗi gửi tin nhắn: " + err.message);
    }
  };

  const selectedReporter = uniqueReporters.find(r => r.id === selectedUserId);

  return (
    <div className="report-page" style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '1.5rem' }}>
      <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Bug size={24} color="var(--color-accent)" />
        <h1 style={{ color: 'var(--color-text-light)', fontSize: '1.6rem', margin: 0 }}>HỆ THỐNG BÁO LỖI & HỖ TRỢ TRỰC TUYẾN</h1>
      </div>

      <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: isAdmin ? '300px 1fr' : '1fr', flex: 1, backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', height: '100%' }}>
        
        {/* Admin Left Panel: Reporters List */}
        {isAdmin && (
          <div style={{ borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.01)', overflowY: 'auto' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>
              DANH SÁCH YÊU CẦU ({uniqueReporters.length})
            </div>
            {uniqueReporters.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Chưa có yêu cầu báo lỗi nào
              </div>
            ) : (
              uniqueReporters.map(rep => {
                const isSelected = selectedUserId === rep.id;
                const userMsgs = messages.filter(m => m.channelId === rep.id);
                const lastMsg = userMsgs[userMsgs.length - 1];
                return (
                  <div 
                    key={rep.id} 
                    onClick={() => setSelectedUserId(rep.id)}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--color-accent)' : '4px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-light)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      {rep.username}
                    </div>
                    {lastMsg && (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lastMsg.senderRole === 'admin' ? 'Admin: ' : ''}{lastMsg.text}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Chat Area */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '450px' }}>
          {isAdmin && !selectedUserId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', gap: '1rem' }}>
              <MessageSquare size={48} />
              <span>Vui lòng chọn một tài khoản cần hỗ trợ ở cột bên trái để bắt đầu chat.</span>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></div>
                  <span style={{ color: 'var(--color-text-light)', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    {isAdmin ? `Đang chat với: ${selectedReporter?.username || 'Người dùng'}` : 'Phòng chat hỗ trợ kỹ thuật'}
                  </span>
                </div>
                {!isAdmin && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Kênh hỗ trợ riêng tư với Admin
                  </span>
                )}
              </div>

              {/* Messages Grid */}
              <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {!isAdmin && activeMessages.length === 0 && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px dashed rgba(59, 130, 246, 0.2)', borderRadius: '8px', color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    📌 <strong>Gửi tin nhắn báo lỗi:</strong> Hãy mô tả lỗi bạn gặp phải (lỗi game, lỗi nạp tiền, v.v.). Tin nhắn sẽ được chuyển trực tiếp và riêng tư đến Quản trị viên để được hỗ trợ nhanh nhất.
                  </div>
                )}

                {activeMessages.map(msg => {
                  const isOwn = msg.senderId === (user.id || user.uid);
                  return (
                    <div 
                      key={msg.id} 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwn ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        alignSelf: isOwn ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <span style={{ color: msg.senderRole === 'admin' ? '#ff4d4f' : 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: 600 }}>
                        {msg.senderName} {msg.senderRole === 'admin' && '🛡️'}
                      </span>
                      <div 
                        style={{
                          padding: '0.6rem 1rem',
                          borderRadius: '8px',
                          backgroundColor: isOwn ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                          color: 'var(--color-text-light)',
                          fontSize: '0.9rem',
                          lineHeight: 1.4,
                          whiteSpace: 'pre-wrap',
                          border: isOwn ? 'none' : '1px solid var(--color-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        {msg.image && (
                          <img 
                            src={msg.image} 
                            alt="Screenshot báo lỗi" 
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '280px', 
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'block',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              transition: 'opacity 0.2s'
                            }} 
                            onClick={() => window.open(msg.image, '_blank')}
                            onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
                            onMouseLeave={e => e.currentTarget.style.opacity = 1}
                            title="Bấm để xem ảnh phóng to trong tab mới"
                          />
                        )}
                        {msg.text && <div>{msg.text}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input form */}
              <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {/* Preview ảnh đính kèm trước khi gửi */}
                {selectedImage && (
                  <div style={{ alignSelf: 'flex-start', position: 'relative', display: 'inline-block', padding: '0.3rem', border: '1px dashed var(--color-accent)', borderRadius: '6px', backgroundColor: 'rgba(26, 159, 255, 0.05)' }}>
                    <img 
                      src={selectedImage} 
                      alt="preview đính kèm" 
                      style={{ height: '70px', borderRadius: '4px', display: 'block', objectFit: 'contain' }} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setSelectedImage(null)} 
                      style={{ 
                        position: 'absolute', 
                        top: '-6px', 
                        right: '-6px', 
                        background: '#ff4d4f', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '50%', 
                        width: '18px', 
                        height: '18px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justify: 'center', 
                        cursor: 'pointer', 
                        fontSize: '9px',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                      }}
                      title="Xóa ảnh"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form className="report-input-form" onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  {/* Nút đính kèm ảnh bằng Icon */}
                  <label 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justify: 'center', 
                      width: '45px',
                      height: '42px',
                      backgroundColor: 'var(--color-bg-secondary)', 
                      border: '1px solid var(--color-border)', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      color: 'var(--color-text-muted)', 
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    title="Đính kèm ảnh/chụp màn hình lỗi"
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                  >
                    <ImageIcon size={20} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      style={{ display: 'none' }} 
                    />
                  </label>

                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder={selectedImage ? "Nhập thêm nội dung hoặc bấm Gửi luôn..." : "Nhập nội dung báo lỗi hoặc đính kèm ảnh..."} 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)}
                    style={{ flex: 1, margin: 0 }}
                    required={!selectedImage} // Nếu có ảnh thì không bắt buộc nhập text
                  />
                  <button type="submit" className="btn" style={{ background: 'var(--color-accent)', color: 'white', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <Send size={16} />
                    <span>Gửi</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default Report;
