import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Users, Gamepad2, Film } from 'lucide-react';

import AdminStats from '../components/Admin/AdminStats';
import UserManager from '../components/Admin/UserManager';
import GameForm from '../components/Admin/GameForm';
import GameList from '../components/Admin/GameList';
import RawgAiSearch from '../components/Admin/RawgAiSearch';
import VideoForm from '../components/Admin/VideoForm';
import VideoList from '../components/Admin/VideoList';

const GEMINI_API_KEY_STORAGE_KEY = 'web18p_gemini_api_key';

const INITIAL_FORM_STATE = {
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
};

function Admin() {
  const { games, addGameToStore, deleteGameFromStore, updateGameInStore, revenue, videos, addVideoToStore, deleteVideoFromStore, updateVideoInStore } = useAppContext();
  const [users, setUsers] = useState([]);
  const [editingGameId, setEditingGameId] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '');
  const [activeTab, setActiveTab] = useState('users');
  
  const [newGame, setNewGame] = useState(INITIAL_FORM_STATE);

  // Video management state
  const INITIAL_VIDEO_STATE = {
    title: '',
    videoUrl: '',
    thumbnail: '',
    category: 'vam',
    description: '',
    tags: '',
    views: 0
  };
  const [videoData, setVideoData] = useState(INITIAL_VIDEO_STATE);
  const [editingVideoId, setEditingVideoId] = useState(null);

  useEffect(() => {
    if (geminiApiKey.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, geminiApiKey.trim());
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    }
  }, [geminiApiKey]);

  // Realtime subscription to Firestore users list
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

  const handleEditClick = (game) => {
    setActiveTab('games');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingGameId(null);
    setNewGame(INITIAL_FORM_STATE);
  };

  const handleSaveGame = (gameData) => {
    if (editingGameId) {
      updateGameInStore(editingGameId, gameData);
      alert('Cập nhật thành công!');
      setEditingGameId(null);
    } else {
      addGameToStore(gameData);
      alert('Thêm game thành công!');
    }
    setNewGame(INITIAL_FORM_STATE);
  };

  const handleApplyRawgToForm = (game, aiData) => {
    setActiveTab('games');
    const sysReq = aiData?.system_requirements
      ? `Tối thiểu: ${aiData.system_requirements.minimum || 'N/A'}\nĐề nghị: ${aiData.system_requirements.recommended || 'N/A'}`
      : '';
    const genres = game.genres?.map(g => g.name).join(', ') || '';
    setNewGame(prev => ({
      ...prev,
      title: game.name || prev.title,
      image: game.background_image || prev.image,
      tags: genres || prev.tags,
      description: aiData?.summary || prev.description,
      developer: game.developers?.map(d => d.name).join(', ') || prev.developer,
      releaseDate: game.released || prev.releaseDate,
      systemRequirements: sysReq || prev.systemRequirements,
      screenshots: game.short_screenshots?.map(s => s.image).filter(Boolean) || prev.screenshots,
      rating: game.rating || prev.rating,
      downloads: Math.floor(Math.random() * 500) + 15,
      isNew: true,
      isPopular: true,
      isTopRated: (game.rating || 0) >= 4.0,
    }));
    
    // Scroll smoothly to game form
    const formElement = document.getElementById('admin-game-form');
    if (formElement) {
      window.scrollTo({ top: formElement.offsetTop - 80, behavior: 'smooth' });
    }
    alert('Đã điền dữ liệu RAWG + AI vào form!');
  };

  // Video handlers
  const handleSaveVideo = (data) => {
    if (editingVideoId) {
      updateVideoInStore(editingVideoId, data);
      alert('Cập nhật phim thành công!');
      setEditingVideoId(null);
    } else {
      addVideoToStore(data);
      alert('Thêm phim thành công!');
    }
    setVideoData(INITIAL_VIDEO_STATE);
  };

  const handleEditVideo = (video) => {
    setActiveTab('videos');
    setEditingVideoId(video.id);
    setVideoData({
      title: video.title || '',
      videoUrl: video.videoUrl || video.streamtapeUrl || '',
      thumbnail: video.thumbnail || '',
      category: video.category || 'vam',
      description: video.description || '',
      tags: Array.isArray(video.tags) ? video.tags.join(', ') : (video.tags || ''),
      views: video.views || 0
    });
    const formEl = document.getElementById('admin-video-form');
    if (formEl) window.scrollTo({ top: formEl.offsetTop - 80, behavior: 'smooth' });
  };

  const handleCancelVideoEdit = () => {
    setEditingVideoId(null);
    setVideoData(INITIAL_VIDEO_STATE);
  };

  return (
    <div className="admin-page" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ color: 'var(--color-text-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
        Bảng điều khiển Quản trị
      </h1>

      {/* Admin stats */}
      <AdminStats usersCount={users.length} revenue={revenue} gamesCount={games.length} videosCount={videos?.length || 0} />

      {/* Admin Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.8rem',
        backgroundColor: 'var(--color-bg-secondary)',
        padding: '0.6rem',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        overflowX: 'auto',
        position: 'sticky',
        top: '70px',
        zIndex: 50,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        {[
          { id: 'users', label: 'Quản lý Người dùng', icon: Users, count: users.length, color: '#3b82f6' },
          { id: 'games', label: 'Quản lý Game', subLabel: '(Thêm & Sửa game)', icon: Gamepad2, count: games.length, color: '#f8b319' },
          { id: 'videos', label: 'Quản lý Phim', subLabel: '(Thêm & Sửa phim)', icon: Film, count: videos?.length || 0, color: '#ec4899' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '0.8rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? 'var(--color-bg-main)' : 'transparent',
                color: isActive ? 'var(--color-text-light)' : 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                borderBottom: isActive ? `3px solid ${tab.color}` : '3px solid transparent'
              }}
            >
              <Icon size={22} style={{ color: isActive ? tab.color : 'inherit' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span style={{
                      padding: '0.1rem 0.5rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: isActive ? `${tab.color}25` : 'rgba(255,255,255,0.06)',
                      color: isActive ? tab.color : 'var(--color-text-muted)'
                    }}>
                      {tab.count}
                    </span>
                  )}
                </div>
                {tab.subLabel && (
                  <span style={{ fontSize: '0.75rem', color: isActive ? tab.color : 'var(--color-text-muted)', opacity: 0.85 }}>
                    {tab.subLabel}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab 1: User Management */}
      {activeTab === 'users' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <UserManager users={users} games={games} />
        </div>
      )}

      {/* Tab 2: Game Management (Add Game, AI Search & Game List) */}
      {activeTab === 'games' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '2rem' }}>
            <GameForm
              newGame={newGame}
              setNewGame={setNewGame}
              editingGameId={editingGameId}
              geminiApiKey={geminiApiKey}
              setGeminiApiKey={setGeminiApiKey}
              onSaveGame={handleSaveGame}
              onCancelEdit={handleCancelEdit}
            />
            <RawgAiSearch
              geminiApiKey={geminiApiKey}
              onApplyToForm={handleApplyRawgToForm}
            />
          </div>
          <GameList
            games={games}
            onEditClick={handleEditClick}
            onDeleteClick={deleteGameFromStore}
          />
        </div>
      )}

      {/* Tab 3: Video Management (Add Video & Video List) */}
      {activeTab === 'videos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
          <VideoForm
            videoData={videoData}
            setVideoData={setVideoData}
            editingVideoId={editingVideoId}
            onSaveVideo={handleSaveVideo}
            onCancelEdit={handleCancelVideoEdit}
          />
          <VideoList
            videos={videos || []}
            onEditClick={handleEditVideo}
            onDeleteClick={deleteVideoFromStore}
          />
        </div>
      )}
    </div>
  );
}

export default Admin;
