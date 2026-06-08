import React, { useState, useEffect } from 'react';
import { Plus, Upload, X } from 'lucide-react';
import { searchSteamThenTranslateGameInfo } from '../../utils/steamInfoHelper';

function GameForm({
  newGame,
  setNewGame,
  editingGameId,
  geminiApiKey,
  setGeminiApiKey,
  onSaveGame,
  onCancelEdit
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUpdateVersion, setCurrentUpdateVersion] = useState('');
  const [currentUpdateLog, setCurrentUpdateLog] = useState('');
  const [manualScreenshotUrl, setManualScreenshotUrl] = useState('');

  // Clear fields when editingGameId changes (like starting/canceling edit)
  useEffect(() => {
    setCurrentUpdateVersion('');
    setCurrentUpdateLog('');
  }, [editingGameId]);

  const handleSearchAI = async () => {
    const gameName = searchQuery.trim();
    if (!gameName) return alert('Vui lòng nhập Tên Game để tìm kiếm!');
    if (!geminiApiKey.trim()) return alert('Vui lòng nhập Gemini API Key để tìm kiếm!');
    
    setIsSearching(true);
    try {
      const webData = await searchSteamThenTranslateGameInfo(geminiApiKey.trim(), gameName);

      if (!webData.description && !webData.image && webData.tags.length <= 1) {
        throw new Error('Steam chưa trả đủ dữ liệu rõ ràng. Bạn thử dán link Steam hoặc appId của game.');
      }

      setNewGame(prev => ({
        ...prev,
        title: webData.title || gameName,
        price: webData.price || 0,
        image: webData.image || '',
        tags: Array.isArray(webData.tags) ? webData.tags.join(', ') : '',
        description: webData.description || '',
        developer: webData.developer || '',
        releaseDate: webData.releaseDate || '',
        systemRequirements: webData.systemRequirements || '',
        screenshots: Array.isArray(webData.screenshots) ? webData.screenshots : [],
        rating: webData.rating || 5.0,
        downloads: webData.downloads || Math.floor(Math.random() * 500) + 15,
        isNew: true,
        isPopular: true,
        isTopRated: true,
        is18Vn: webData.is18Plus,
        is18Uncensored: webData.is18Plus,
        is18Pc: true,
        is18Android: webData.is18Plus
      }));
      alert('Thành công! Đã lấy dữ liệu Steam và dịch bằng Gemini.');
    } catch (error) {
      alert('Lỗi Gemini: ' + error.message);
    } finally {
      setIsSearching(false);
    }
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const is18Plus = newGame.is18Vn || newGame.is18Uncensored || newGame.is18Pc || newGame.is18Android;
    
    // Process game update logs
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
      // Prepend to show newest first
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

    onSaveGame(gameData);

    // Reset local log states
    setCurrentUpdateVersion('');
    setCurrentUpdateLog('');
  };

  return (
    <div className="card" id="admin-game-form">
      <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
        {editingGameId ? 'Chỉnh sửa Game' : 'Thêm Game Mới'}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
        <label style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Lấy dữ liệu Steam và dịch bằng Gemini</label>
        <input
          type="text"
          className="input-field"
          placeholder="Nhập Gemini API Key..."
          value={geminiApiKey}
          onChange={e => setGeminiApiKey(e.target.value)}
          autoComplete="off"
          style={{ fontSize: '0.85rem', WebkitTextSecurity: 'disc' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Nhập tên game trên Steam, link Steam hoặc appId..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            style={{ flex: 1 }} 
          />
          <button 
            type="button" 
            onClick={handleSearchAI} 
            className="btn" 
            style={{ background: 'var(--color-accent)', color: 'white', padding: '0 1.5rem' }} 
            disabled={isSearching}
          >
            {isSearching ? 'Đang tìm...' : 'Gemini'}
          </button>
        </div>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
          Ưu tiên tuyệt đối nguồn Steam: ảnh, screenshot, mô tả và cấu hình lấy từ Steam; Gemini chỉ dịch/tóm tắt sang tiếng Việt.
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

          {/* Lịch sử cập nhật hiện tại */}
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
          {editingGameId && <button type="button" className="btn btn-outline" onClick={onCancelEdit}>Hủy</button>}
        </div>
      </form>
    </div>
  );
}

export default GameForm;
