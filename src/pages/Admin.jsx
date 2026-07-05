import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

import AdminStats from '../components/Admin/AdminStats';
import UserManager from '../components/Admin/UserManager';
import GameForm from '../components/Admin/GameForm';
import GameList from '../components/Admin/GameList';
import RawgAiSearch from '../components/Admin/RawgAiSearch';

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
  const { games, addGameToStore, deleteGameFromStore, updateGameInStore, revenue } = useAppContext();
  const [users, setUsers] = useState([]);
  const [editingGameId, setEditingGameId] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '');
  
  const [newGame, setNewGame] = useState(INITIAL_FORM_STATE);

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

  return (
    <div className="admin-page" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ color: 'var(--color-text-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
        Bảng điều khiển Quản trị
      </h1>

      {/* Admin stats */}
      <AdminStats usersCount={users.length} revenue={revenue} gamesCount={games.length} />

      <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* User manager */}
        <UserManager users={users} games={games} />

        {/* Game Form */}
        <GameForm
          newGame={newGame}
          setNewGame={setNewGame}
          editingGameId={editingGameId}
          geminiApiKey={geminiApiKey}
          setGeminiApiKey={setGeminiApiKey}
          onSaveGame={handleSaveGame}
          onCancelEdit={handleCancelEdit}
        />
      </div>

      {/* Game List */}
      <GameList
        games={games}
        onEditClick={handleEditClick}
        onDeleteClick={deleteGameFromStore}
      />

      {/* RAWG AI Search */}
      <RawgAiSearch
        geminiApiKey={geminiApiKey}
        onApplyToForm={handleApplyRawgToForm}
      />
    </div>
  );
}

export default Admin;
