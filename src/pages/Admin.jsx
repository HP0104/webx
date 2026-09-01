import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Users, Gamepad2, Film, AlertTriangle, BarChart3, BookOpen } from 'lucide-react';

import AdminStats from '../components/Admin/AdminStats';
import UserManager from '../components/Admin/UserManager';
import GameForm from '../components/Admin/GameForm';
import GameList from '../components/Admin/GameList';
import VideoForm from '../components/Admin/VideoForm';
import VideoList from '../components/Admin/VideoList';
import ErrorReportManager from '../components/Admin/ErrorReportManager';
import MangaForm from '../components/Admin/MangaForm';
import MangaListAdmin from '../components/Admin/MangaListAdmin';

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
  const { games, addGameToStore, deleteGameFromStore, updateGameInStore, revenue, videos, addVideoToStore, deleteVideoFromStore, updateVideoInStore, manga = [], addMangaToStore, deleteMangaFromStore, updateMangaInStore } = useAppContext();
  const [users, setUsers] = useState([]);
  const [editingGameId, setEditingGameId] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '');
  const [activeTab, setActiveTab] = useState('dashboard');
  
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

  // Manga management state
  const INITIAL_MANGA_STATE = {
    title: '',
    cover: '',
    author: '',
    status: 'ongoing',
    genres: [],
    description: '',
    chapters: [],
    views: 0
  };
  const [mangaData, setMangaData] = useState(INITIAL_MANGA_STATE);
  const [editingMangaId, setEditingMangaId] = useState(null);

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

  // Manga handlers
  const handleSaveManga = (data) => {
    if (editingMangaId) {
      updateMangaInStore(editingMangaId, data);
      alert('Cập nhật truyện thành công!');
      setEditingMangaId(null);
    } else {
      addMangaToStore(data);
      alert('Thêm truyện thành công!');
    }
    setMangaData(INITIAL_MANGA_STATE);
  };

  const handleEditManga = (mangaItem) => {
    setActiveTab('manga');
    setEditingMangaId(mangaItem.id);
    setMangaData({
      title: mangaItem.title || '',
      cover: mangaItem.cover || '',
      author: mangaItem.author || '',
      status: mangaItem.status || 'ongoing',
      genres: Array.isArray(mangaItem.genres) ? mangaItem.genres : [],
      description: mangaItem.description || '',
      chapters: mangaItem.chapters || [],
      views: mangaItem.views || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelMangaEdit = () => {
    setEditingMangaId(null);
    setMangaData(INITIAL_MANGA_STATE);
  };

  return (
    <div className="admin-page container" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ color: 'var(--color-text-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
        Bảng điều khiển Quản trị
      </h1>

      <div className="admin-dashboard">
        {/* Admin Sidebar Navigation */}
        <aside className="admin-sidebar">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: BarChart3, color: '#10b981' },
            { id: 'users', label: 'Quản lý Người dùng', icon: Users, count: users.length, color: '#3b82f6' },
            { id: 'games', label: 'Quản lý Game', icon: Gamepad2, count: games.length, color: '#f8b319' },
            { id: 'videos', label: 'Quản lý Phim', icon: Film, count: videos?.length || 0, color: '#ec4899' },
            { id: 'manga', label: 'Quản lý Truyện', icon: BookOpen, count: manga?.length || 0, color: '#a855f7' },
            { id: 'reports', label: 'Báo lỗi', icon: AlertTriangle, color: '#ff4d4f' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                style={{ '--active-color': tab.color }}
              >
                <Icon size={20} style={{ color: isActive ? tab.color : 'inherit' }} />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span style={{
                      padding: '0.15rem 0.5rem',
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
              </button>
            );
          })}
        </aside>

        {/* Admin Content Area */}
        <main className="admin-content-area">
          {/* Tab Content */}
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {activeTab === 'dashboard' && (
              <AdminStats usersCount={users.length} gamesCount={games.length} videosCount={videos?.length || 0} mangaCount={manga?.length || 0} />
            )}

            {activeTab === 'users' && (
              <UserManager users={users} games={games} />
            )}

            {activeTab === 'games' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <GameForm
                  newGame={newGame}
                  setNewGame={setNewGame}
                  editingGameId={editingGameId}
                  geminiApiKey={geminiApiKey}
                  setGeminiApiKey={setGeminiApiKey}
                  onSaveGame={handleSaveGame}
                  onCancelEdit={handleCancelEdit}
                />
                <GameList
                  games={games}
                  onEditClick={handleEditClick}
                  onDeleteClick={deleteGameFromStore}
                />
              </div>
            )}

            {activeTab === 'videos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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

            {activeTab === 'reports' && (
              <ErrorReportManager />
            )}

            {activeTab === 'manga' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <MangaForm
                  mangaData={mangaData}
                  setMangaData={setMangaData}
                  editingMangaId={editingMangaId}
                  onSaveManga={handleSaveManga}
                  onCancelEdit={handleCancelMangaEdit}
                />
                <MangaListAdmin
                  mangaList={manga || []}
                  onEditClick={handleEditManga}
                  onDeleteClick={deleteMangaFromStore}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Admin;
