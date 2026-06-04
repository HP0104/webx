import React, { useState, useEffect } from 'react';
import { Users, Gamepad2, Plus, Search, Sparkles, User as UserIcon, Upload, Trash2, X } from 'lucide-react';
import { useAppContext } from '../App';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';

function Admin() {
  const { games, addGameToStore, deleteGameFromStore, updateGameInStore, revenue } = useAppContext();
  const [users, setUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingGameId, setEditingGameId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [currentUpdateVersion, setCurrentUpdateVersion] = useState('');
  const [currentUpdateLog, setCurrentUpdateLog] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  
  const [newGame, setNewGame] = useState({
    title: '',
    price: 0,
    image: '',
    tags: '',
    description: '',
    developer: '',
    releaseDate: '',
    systemRequirements: '',
    screenshots: [], // managed as array
    downloadUrl: '',
    rating: 5.0,
    downloads: 0,
    isNew: false,
    isPopular: false,
    isTopRated: false,
    is18Vn: false,
    is18Uncensored: false,
    is18Pc: false,
    is18Android: false,
    updateHistory: [],
    updatedAt: null,
    views: 0
  });

  const [manualScreenshotUrl, setManualScreenshotUrl] = useState('');

  // Theo dõi danh sách người dùng từ Firestore theo thời gian thực
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersList = [];
      querySnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersList);
    });
    return () => unsubscribe();
  }, []);

  const handleAddBalance = async (userId, currentBalance) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: (currentBalance || 0) + 500000
      });
    } catch (error) {
      alert('Lỗi nạp tiền: ' + error.message);
    }
  };

  const handleUpdateBalance = async (userId, currentBalance, type) => {
    if (!balanceAmount || isNaN(balanceAmount) || Number(balanceAmount) <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ!');
      return;
    }
    
    try {
      const amount = Number(balanceAmount);
      const newBalance = type === 'add' ? (currentBalance || 0) + amount : (currentBalance || 0) - amount;
      
      if (newBalance < 0) {
        alert('Số dư không được phép âm!');
        return;
      }
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: newBalance
      });
      
      setEditingUserId(null);
      setBalanceAmount('');
      alert('Cập nhật tiền thành công!');
    } catch (error) {
      alert('Lỗi cập nhật tiền: ' + error.message);
    }
  };

  const handleSearchAI = async () => {
    if (!searchQuery) return alert('Vui lòng nhập Tên Game để tìm kiếm!');
    if (!apiKey) return alert('Vui lòng nhập Google AI Studio API Key để dùng tính năng này!');
    
    setIsSearching(true);
    const prompt = `Give me information about the video game "${searchQuery}". 
Return ONLY a valid JSON object with these keys: price (VND), image, tags (array), description (Vietnamese), developer, releaseDate, systemRequirements (Vietnamese), screenshots (array), rating (float 1.0 to 5.0), downloads (number), is18Plus (boolean).`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      const parts = data.candidates[0].content.parts;
      const textPart = parts.find(p => p.text);
      const rawText = textPart.text;
      const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiData = JSON.parse(cleanJsonStr);

      const is18 = aiData.is18Plus || searchQuery.toLowerCase().includes('slut') || searchQuery.toLowerCase().includes('18+');

      setNewGame({
        ...newGame,
        title: searchQuery,
        price: aiData.price || 0,
        image: aiData.image || '',
        tags: aiData.tags ? (Array.isArray(aiData.tags) ? aiData.tags.join(', ') : aiData.tags) : '',
        description: aiData.description || '',
        developer: aiData.developer || '',
        releaseDate: aiData.releaseDate || '',
        systemRequirements: aiData.systemRequirements || '',
        screenshots: Array.isArray(aiData.screenshots) ? aiData.screenshots : [],
        rating: aiData.rating || 5.0,
        downloads: aiData.downloads || Math.floor(Math.random() * 500) + 15,
        isNew: true,
        isPopular: true,
        isTopRated: true,
        is18Vn: is18,
        is18Uncensored: is18,
        is18Pc: true,
        is18Android: is18
      });
      alert('Thành công! AI đã tìm thấy thông tin game.');
    } catch (error) {
      alert('Lỗi AI: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEditClick = (game) => {
    setEditingGameId(game.id);
    setNewGame({
      title: game.title,
      price: game.price,
      image: game.image,
      tags: Array.isArray(game.tags) ? game.tags.join(', ') : game.tags,
      description: game.description,
      developer: game.developer,
      releaseDate: game.releaseDate || '',
      systemRequirements: game.systemRequirements || '',
      screenshots: Array.isArray(game.screenshots) ? game.screenshots : [],
      downloadUrl: game.downloadUrl || '',
      rating: game.rating || 5.0,
      downloads: game.downloads || 0,
      isNew: game.isNew || false,
      isPopular: game.isPopular || false,
      isTopRated: game.isTopRated || false,
      is18Vn: game.is18Vn || false,
      is18Uncensored: game.is18Uncensored || false,
      is18Pc: game.is18Pc || false,
      is18Android: game.is18Android || false,
      updateHistory: game.updateHistory || [],
      updatedAt: game.updatedAt || null,
      views: game.views || 0
    });
    setCurrentUpdateVersion('');
    setCurrentUpdateLog('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScreenshotFilesUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        alert("Kích thước file ảnh không được vượt quá 2MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewGame(prev => ({
          ...prev,
          screenshots: [...prev.screenshots, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddManualScreenshot = (e) => {
    e.preventDefault();
    if (!manualScreenshotUrl.trim()) return;
    setNewGame(prev => ({
      ...prev,
      screenshots: [...prev.screenshots, manualScreenshotUrl.trim()]
    }));
    setManualScreenshotUrl('');
  };

  const handleRemoveScreenshot = (idxToRemove) => {
    setNewGame(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, idx) => idx !== idxToRemove)
    }));
  };

  const handleAddGame = (e) => {
    e.preventDefault();
    const is18Plus = newGame.is18Vn || newGame.is18Uncensored || newGame.is18Pc || newGame.is18Android;
    
    // Xử lý tạo/nối thêm Nhật ký cập nhật
    let updatedHistory = [...(newGame.updateHistory || [])];
    let gameUpdatedAt = newGame.updatedAt || new Date().toISOString();

    if (currentUpdateVersion.trim() && currentUpdateLog.trim()) {
      const newLogEntry = {
        version: currentUpdateVersion.trim(),
        date: new Date().toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        content: currentUpdateLog.trim()
      };
      // Thêm lên đầu mảng để bản mới nhất đứng trước
      updatedHistory = [newLogEntry, ...updatedHistory];
      gameUpdatedAt = new Date().toISOString();
    }

    const gameData = {
      ...newGame,
      price: Number(newGame.price),
      rating: Number(newGame.rating) || 5.0,
      downloads: Number(newGame.downloads) || 0,
      is18Plus,
      tags: typeof newGame.tags === 'string' ? newGame.tags.split(',').map(t => t.trim()).filter(Boolean) : newGame.tags,
      screenshots: Array.isArray(newGame.screenshots) ? newGame.screenshots : [],
      updateHistory: updatedHistory,
      updatedAt: gameUpdatedAt,
      views: newGame.views || 0
    };

    if (editingGameId) {
      updateGameInStore(editingGameId, gameData);
      alert('Cập nhật thành công!');
      setEditingGameId(null);
    } else {
      addGameToStore(gameData);
      alert('Thêm game thành công!');
    }
    setNewGame({
      title: '',
      price: 0,
      image: '',
      tags: '',
      description: '',
      developer: '',
      releaseDate: '',
      systemRequirements: '',
      screenshots: [],
      downloadUrl: '',
      rating: 5.0,
      downloads: 0,
      isNew: false,
      isPopular: false,
      isTopRated: false,
      is18Vn: false,
      is18Uncensored: false,
      is18Pc: false,
      is18Android: false,
      updateHistory: [],
      updatedAt: null,
      views: 0
    });
    setCurrentUpdateVersion('');
    setCurrentUpdateLog('');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ color: 'var(--color-text-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
        Bảng điều khiển Quản trị
      </h1>

      {/* Thống kê */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Tổng Tài khoản</div>
          <div style={{ fontSize: '1.5rem', color: 'var(--color-text-light)', fontWeight: 'bold' }}>{users.length}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Doanh thu</div>
          <div style={{ fontSize: '1.5rem', color: '#f8b319', fontWeight: 'bold' }}>{revenue.toLocaleString('vi-VN')} VNĐ</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f8b319' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Số lượng Game</div>
          <div style={{ fontSize: '1.5rem', color: 'var(--color-text-light)', fontWeight: 'bold' }}>{games.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Danh sách User */}
        <div className="card">
          <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>Quản lý Người dùng</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--color-bg-main)', borderRadius: '4px', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ color: 'var(--color-text-light)', fontWeight: 'bold' }}>{u.username} {u.role === 'admin' && '⭐'}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{u.email}</div>
                  <div style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>{(u.balance || 0).toLocaleString('vi-VN')} VNĐ</div>
                </div>
                {u.role !== 'admin' && (
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    {editingUserId === u.id ? (
                      <>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="Số tiền"
                          value={balanceAmount}
                          onChange={e => setBalanceAmount(e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', width: '70px', margin: 0 }}
                        />
                        <button
                          onClick={() => handleUpdateBalance(u.id, u.balance, 'add')}
                          className="btn btn-success"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--color-success)', color: 'white' }}
                        >
                          Cộng
                        </button>
                        <button
                          onClick={() => handleUpdateBalance(u.id, u.balance, 'subtract')}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#ff4d4f' }}
                        >
                          Trừ
                        </button>
                        <button
                          onClick={() => {
                            setEditingUserId(null);
                            setBalanceAmount('');
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingUserId(u.id);
                            setBalanceAmount('');
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                        >
                          ±
                        </button>
                        <button
                          onClick={() => handleAddBalance(u.id, u.balance)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                        >
                          +500k
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Thêm/Sửa Game */}
        <div className="card">
          <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
            {editingGameId ? 'Chỉnh sửa Game' : 'Thêm Game Mới'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <label style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Cấu hình AI Search (Gemini)</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Nhập Google AI Studio API Key..." 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              style={{ fontSize: '0.85rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" className="input-field" placeholder="Nhập tên game..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1 }} />
              <button type="button" onClick={handleSearchAI} className="btn" style={{ background: 'var(--color-accent)', color: 'white', padding: '0 1.5rem' }} disabled={isSearching}>
                {isSearching ? 'Đang tìm...' : 'AI'}
              </button>
            </div>
          </div>

          <form onSubmit={handleAddGame} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" className="input-field" placeholder="Tên Game" value={newGame.title} onChange={e => setNewGame({...newGame, title: e.target.value})} required />
            <input type="text" className="input-field" placeholder="Link Ảnh Bìa" value={newGame.image} onChange={e => setNewGame({...newGame, image: e.target.value})} required />
            
            {/* Screenshots Gallery Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
              <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', fontWeight: 600 }}>Ảnh minh họa (Screenshots)</span>
              
              {/* Screenshots Preview Grid */}
              {newGame.screenshots && newGame.screenshots.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.6rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {newGame.screenshots.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                      <img src={url} alt={`Screenshot ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveScreenshot(idx)} 
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 77, 79, 0.9)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          padding: 0
                        }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>Chưa có ảnh minh họa nào.</div>
              )}

              {/* Upload screenshot from PC */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.6rem' }}>
                <label style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Upload size={14} />
                  Tải file ảnh minh họa từ máy tính (Nhiều ảnh cùng lúc)
                </label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={handleScreenshotFilesUpload} 
                  style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }} 
                />
              </div>

              {/* Enter screenshot URL manually */}
              <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.6rem' }}>
                <input 
                  type="text" 
                  placeholder="Hoặc dán Link ảnh online..." 
                  className="input-field" 
                  value={manualScreenshotUrl} 
                  onChange={e => setManualScreenshotUrl(e.target.value)} 
                  style={{ flex: 1, margin: 0, fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} 
                />
                <button 
                  type="button" 
                  onClick={handleAddManualScreenshot} 
                  className="btn" 
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-light)' }}
                >
                  Thêm
                </button>
              </div>

            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="number" className="input-field" placeholder="Giá (VND)" value={newGame.price} onChange={e => setNewGame({...newGame, price: e.target.value})} required />
              <input type="text" className="input-field" placeholder="Ngày phát hành (ví dụ: 15/05/2026 hoặc 2026-05-15)" value={newGame.releaseDate} onChange={e => setNewGame({...newGame, releaseDate: e.target.value})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="number" className="input-field" placeholder="Đánh giá (ví dụ: 4.9)" min="0" max="5" step="0.1" value={newGame.rating} onChange={e => setNewGame({...newGame, rating: e.target.value})} />
              <input type="number" className="input-field" placeholder="Lượt tải/chơi" value={newGame.downloads} onChange={e => setNewGame({...newGame, downloads: e.target.value})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="text" className="input-field" placeholder="Nhà phát triển" value={newGame.developer} onChange={e => setNewGame({...newGame, developer: e.target.value})} required />
              <input type="text" className="input-field" placeholder="Thể loại (cách nhau bằng dấu phẩy)" value={newGame.tags} onChange={e => setNewGame({...newGame, tags: e.target.value})} required />
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ color: 'var(--color-text-light)', fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', margin: 0 }}>Hiển thị trong các mục:</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ color: 'var(--color-accent)', fontSize: '0.85rem', fontWeight: 700 }}>DANH MỤC GAME HOT</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.isNew} onChange={e => setNewGame({...newGame, isNew: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
                    Game Mới Nhất
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.isPopular} onChange={e => setNewGame({...newGame, isPopular: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
                    Game Nhiều Người Chơi
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.isTopRated} onChange={e => setNewGame({...newGame, isTopRated: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
                    Game Đánh Giá Cao
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                <span style={{ color: '#ff4d4f', fontSize: '0.85rem', fontWeight: 700 }}>DANH MỤC GAME 18+</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.is18Vn} onChange={e => setNewGame({...newGame, is18Vn: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ff4d4f' }} />
                    Việt hoá 18
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.is18Uncensored} onChange={e => setNewGame({...newGame, is18Uncensored: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ff4d4f' }} />
                    Không che
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.is18Pc} onChange={e => setNewGame({...newGame, is18Pc: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ff4d4f' }} />
                    PC 18+
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.is18Android} onChange={e => setNewGame({...newGame, is18Android: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ff4d4f' }} />
                    Android 18+
                  </label>
                </div>
              </div>
            </div>

            <textarea className="input-field" placeholder="Mô tả" rows="3" value={newGame.description} onChange={e => setNewGame({...newGame, description: e.target.value})} required />
            <textarea className="input-field" placeholder="Cấu hình hệ thống" rows="2" value={newGame.systemRequirements} onChange={e => setNewGame({...newGame, systemRequirements: e.target.value})} />
            <input type="text" className="input-field" placeholder="Link Tải Game" value={newGame.downloadUrl} onChange={e => setNewGame({...newGame, downloadUrl: e.target.value})} required />
            
            {/* Nhật ký cập nhật Game mới (Tùy chọn) */}
            <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <span style={{ color: 'var(--color-accent)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Plus size={16} /> Nhập Nhật ký Cập nhật Mới (Không bắt buộc)
              </span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.8rem' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Phiên bản (Ví dụ: v1.1)" 
                  value={currentUpdateVersion} 
                  onChange={e => setCurrentUpdateVersion(e.target.value)} 
                  style={{ margin: 0, fontSize: '0.85rem' }}
                />
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', alignSelf: 'center' }}>
                  * Để trống nếu không đổi phiên bản.
                </span>
              </div>
              
              <textarea 
                className="input-field" 
                placeholder="Nội dung cập nhật (Ví dụ: - Sửa lỗi crash game trên Windows 11\n- Cập nhật bản dịch Việt Hóa mới nhất)" 
                rows="3" 
                value={currentUpdateLog} 
                onChange={e => setCurrentUpdateLog(e.target.value)}
                style={{ margin: 0, fontSize: '0.85rem' }}
              />

              {/* Danh sách lịch sử cập nhật hiện tại (Nếu đang chỉnh sửa) */}
              {editingGameId && newGame.updateHistory && newGame.updateHistory.length > 0 && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Lịch sử cập nhật hiện tại:</span>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {newGame.updateHistory.map((hist, idx) => (
                      <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', padding: '0.2rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                        <span><strong>{hist.version}</strong> ({hist.date})</span>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>{hist.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-success" style={{ flex: 1, backgroundColor: 'var(--color-success)', color: 'white' }}>{editingGameId ? 'Cập nhật' : 'Thêm Game'}</button>
              {editingGameId && <button type="button" className="btn btn-outline" onClick={() => {
                setEditingGameId(null);
                setNewGame({ title: '', price: 0, image: '', tags: '', description: '', developer: '', releaseDate: '', systemRequirements: '', screenshots: [], downloadUrl: '', rating: 5.0, downloads: 0, isNew: false, isPopular: false, isTopRated: false, is18Vn: false, is18Uncensored: false, is18Pc: false, is18Android: false, updateHistory: [], updatedAt: null, views: 0 });
                setCurrentUpdateVersion('');
                setCurrentUpdateLog('');
              }}>Hủy</button>}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>Kho Game</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {games.map(game => (
            <div key={game.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', backgroundColor: 'var(--color-bg-main)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <img src={game.image} alt={game.title} style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', fontWeight: 'bold' }}>{game.title}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => handleEditClick(game)} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.2rem' }}>Sửa</button>
                  <button onClick={() => deleteGameFromStore(game.id)} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.2rem', color: '#ff4d4f' }}>Xóa</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Admin;
