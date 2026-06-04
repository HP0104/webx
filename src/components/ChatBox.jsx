import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Image as ImageIcon, X, Plus } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useAppContext } from '../App';

const STICKERS = [
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f923/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f621/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif'
];

function ChatBox() {
  const { user, balance } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [dynamicStickers, setDynamicStickers] = useState([]);
  const [customStickerUrl, setCustomStickerUrl] = useState('');
  const [error, setError] = useState(null);
  const scrollRef = useRef();

  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse();
      setMessages(msgs);
    }, (err) => {
      console.error("Firestore error:", err);
      setError("Không thể kết nối đến máy chủ chat.");
    });

    return () => unsubscribe();
  }, []);

  // Sync custom stickers in real-time
  useEffect(() => {
    const qStickers = query(collection(db, 'stickers'), orderBy('createdAt', 'asc'));
    const unsubscribeStickers = onSnapshot(qStickers, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        url: doc.data().url,
        userId: doc.data().userId || doc.data().addedBy || ''
      }));
      setDynamicStickers(list);
    }, (err) => {
      console.warn("Firestore stickers query warning:", err.message);
    });
    return () => unsubscribeStickers();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !user) return;

    // Kiểm tra link gofile và mediafire
    const blockedDomains = ['gofile', 'mediafire'];
    const lowerMessage = newMessage.toLowerCase();
    const isBlockedLink = blockedDomains.some(domain => lowerMessage.includes(domain));

    if (isBlockedLink) {
      setError('❌ Không được phép gửi link Gofile hoặc Mediafire vào chat! Vui lòng dùng các dịch vụ khác.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setError(null);
      await addDoc(collection(db, 'chats'), {
        text: newMessage,
        type: 'text',
        createdAt: serverTimestamp(),
        userId: user.id || user.uid,
        username: user.username,
        photoURL: user.photoURL || null,
        role: user.role || 'user'
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Lỗi khi gửi tin nhắn: " + error.message);
    }
  };

  const handleSendSticker = async (stickerUrl) => {
    if (!user) return;

    try {
      setError(null);
      await addDoc(collection(db, 'chats'), {
        text: stickerUrl,
        type: 'sticker',
        createdAt: serverTimestamp(),
        userId: user.id || user.uid,
        username: user.username,
        photoURL: user.photoURL || null,
        role: user.role || 'user'
      });
      setShowStickers(false);
    } catch (error) {
      console.error("Error sending sticker:", error);
      setError("Lỗi khi gửi sticker.");
    }
  };

  const handleUploadCustomSticker = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    if (file.size > 1 * 1024 * 1024) {
      alert("Kích thước file ảnh sticker không được vượt quá 1MB!");
      return;
    }

    const myCustomStickers = dynamicStickers.filter(s => s.userId === (user.id || user.uid));
    const count = myCustomStickers.length;

    // Check if they need to pay (charged from the 6th custom sticker onwards)
    const isCharged = count >= 5;

    if (isCharged) {
      const currentBalance = Number(balance) || 0;
      if (currentBalance < 1000) {
        alert(`Số dư tài khoản của bạn (${currentBalance.toLocaleString('vi-VN')}đ) không đủ để mua lượt thêm sticker! Bạn đã dùng hết 5 lượt miễn phí. Phí thêm sticker tiếp theo là 1.000đ/sticker.`);
        return;
      }
      const confirmBuy = window.confirm(`Bạn đã thêm 5 sticker miễn phí. Để thêm sticker mới này, bạn có đồng ý thanh toán 1.000đ từ số dư ví không?`);
      if (!confirmBuy) return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        setError(null);

        // Deduct 1,000đ if charged
        if (isCharged) {
          const userRef = doc(db, 'users', user.id || user.uid);
          await updateDoc(userRef, {
            balance: (Number(balance) || 0) - 1000
          });
        }

        // Add to stickers collection
        await addDoc(collection(db, 'stickers'), {
          url: reader.result,
          createdAt: serverTimestamp(),
          addedBy: user.username,
          userId: user.id || user.uid
        });

        if (isCharged) {
          alert("Đã thanh toán 1.000đ và thêm sticker thành công!");
        } else {
          alert(`Đã thêm sticker miễn phí thành công! (Bạn đã dùng ${count + 1}/5 lượt miễn phí).`);
        }
      } catch (err) {
        console.error("Error adding custom sticker:", err);
        alert("Lỗi thêm sticker: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const allStickers = [...STICKERS, ...dynamicStickers.map(s => s.url)];

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3 className="chat-title">Cộng đồng</h3>
        <div className="online-count">
          <span className="online-dot"></span>
          <span>Trực tuyến</span>
        </div>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {error && (
          <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#ff4d4f', textAlign: 'center', backgroundColor: 'rgba(255, 77, 79, 0.1)', borderRadius: '4px' }}>
            {error}
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${msg.userId === (user?.id || user?.uid) ? 'own' : ''}`}>
            <div className="chat-msg-info">
              <span className={`chat-username ${msg.role === 'admin' ? 'admin' : ''}`}>
                {msg.username}
              </span>
            </div>
            <div className="chat-msg-text" style={msg.type === 'sticker' ? { background: 'transparent', padding: 0 } : {}}>
              {msg.type === 'sticker' ? (
                <img src={msg.text} alt="sticker" className="chat-sticker-msg" />
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
      </div>

      <form className="chat-input-area" onSubmit={handleSendMessage}>
        {user ? (
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', position: 'relative' }}>
            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                placeholder="Nhập tin nhắn..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onFocus={() => setShowStickers(false)}
              />
              <button 
                type="button" 
                className="sticker-btn"
                style={{ position: 'absolute', right: '10px' }}
                onClick={() => setShowStickers(!showStickers)}
              >
                {showStickers ? <X size={20} /> : <Smile size={20} />}
              </button>
            </div>
            
            {showStickers && (
              <div className="sticker-picker-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '0.8rem', width: '260px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Chọn Sticker</span>
                  <button type="button" onClick={() => setShowStickers(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
                
                <div className="sticker-grid" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {allStickers.map((url, idx) => (
                    <div key={idx} className="sticker-item" onClick={() => handleSendSticker(url)}>
                      <img src={url} alt="sticker" className="sticker-img" />
                    </div>
                  ))}
                </div>

                {/* Sticker Uploader & Purchase Status Panel */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, paddingBottom: '0.2rem' }}>
                    <span>Đã thêm: {dynamicStickers.filter(s => s.userId === (user?.id || user?.uid)).length}/5</span>
                  </div>

                  <label 
                    className="btn" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.3rem', 
                      fontSize: '0.75rem', 
                      padding: '0.35rem 0.5rem', 
                      background: 'var(--color-accent)', 
                      color: 'white',
                      cursor: 'pointer',
                      margin: 0,
                      borderRadius: '4px'
                    }}
                  >
                    <Plus size={14} />
                    Thêm sticker từ máy
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUploadCustomSticker} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>
              </div>
            )}

            <button type="submit" className="chat-send-btn">
              <Send size={18} />
            </button>
          </div>
        ) : (
          <div className="chat-login-prompt">
            Vui lòng đăng nhập để chat
          </div>
        )}
      </form>
    </div>
  );
}

export default ChatBox;
