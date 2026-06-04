/* eslint-disable react-refresh/only-export-components */
import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import NotificationBanner from './components/NotificationBanner';
import ChatBox from './components/ChatBox';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Wallet from './pages/Wallet';
import GameDetail from './pages/GameDetail';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Category from './pages/Category';
import Blog from './pages/Blog';
import Report from './pages/Report';
import { INITIAL_GAMES } from './data/games';
import { MOCK_USERS } from './data/users';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, onSnapshot, deleteDoc } from 'firebase/firestore';

const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

function App() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [ownedGames, setOwnedGames] = useState([]);
  
  // App state
  const [games, setGames] = useState(INITIAL_GAMES);
  const [users, setUsers] = useState(MOCK_USERS);
  const [revenue, setRevenue] = useState(0);

  // Sync games from Firestore in Real-time & Clean up test games
  React.useEffect(() => {
    // Tự động dọn dẹp game test khỏi Firestore nếu còn tồn tại
    const removeTestGames = async () => {
      try {
        await deleteDoc(doc(db, 'games', '2'));
        await deleteDoc(doc(db, 'games', '3'));
      } catch (err) {
        console.warn("Firestore cleanup warn:", err.message);
      }
    };
    removeTestGames();

    const q = query(collection(db, 'games'));
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      if (querySnapshot.empty) {
        // Seed database with INITIAL_GAMES
        for (const game of INITIAL_GAMES) {
          const gameId = game.id.toString();
          await setDoc(doc(db, 'games', gameId), {
            ...game,
            id: gameId,
            rating: game.rating || 4.9,
            downloads: game.downloads || Math.floor(Math.random() * 500) + 15,
            is18Plus: game.is18Plus ?? (game.tags?.includes('Mature') || game.tags?.includes('18+') || game.title.includes('Wild Sluts')),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            views: game.views || 0,
            updateHistory: game.updateHistory || [
              { version: '1.0', date: game.releaseDate || '15/05/2026', content: 'Ra mắt phiên bản đầu tiên của trò chơi.' }
            ]
          });
        }
      } else {
        const gamesList = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          gamesList.push({
            ...data,
            id: isNaN(doc.id) ? doc.id : Number(doc.id) // keep original ID type (number or string)
          });
        });
        setGames(gamesList);
      }
    }, (error) => {
      console.warn("Firestore games sub error:", error.message);
    });
    return () => unsubscribe();
  }, []);

  // Firebase Auth sync
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let userData = {
          uid: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          balance: 0,
          ownedGames: [],
          role: firebaseUser.email === 'admin@gmail.com' ? 'admin' : 'user'
        };

        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            userData = { ...userData, ...userSnap.data() };
          } else {
            await setDoc(userRef, userData);
          }
        } catch (fsError) {
          console.warn("Firestore error:", fsError.message);
        }

        setUser({ 
          id: userData.uid, 
          username: userData.username, 
          email: userData.email,
          role: userData.role,
          photoURL: userData.photoURL 
        });
        setBalance(userData.balance || 0);
        setOwnedGames(userData.ownedGames || []);
      } else {
        setUser(null);
        setBalance(0);
        setOwnedGames([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setBalance(0);
    setOwnedGames([]);
  };

  const buyGame = (game) => {
    if (balance >= game.price) {
      setBalance(prev => prev - game.price);
      setOwnedGames(prev => [...prev, game.id]);
      return true;
    }
    return false;
  };

  const updateUserInfo = async (newData) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, newData);
      
      // Cập nhật state cục bộ
      if (newData.balance !== undefined) setBalance(newData.balance);
      if (newData.ownedGames !== undefined) setOwnedGames(newData.ownedGames);
      
      setUser(prev => ({ ...prev, ...newData }));
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      return false;
    }
  };

  const addGameToStore = async (newGame) => {
    const gameId = Date.now().toString();
    const gameData = {
      ...newGame,
      id: gameId,
      rating: Number(newGame.rating) || 5.0,
      downloads: Number(newGame.downloads) || 0,
      is18Plus: newGame.is18Plus ?? (newGame.is18Vn || newGame.is18Uncensored || newGame.is18Pc || newGame.is18Android || false)
    };

    // Cập nhật State cục bộ lập tức để giao diện hiển thị ngay
    setGames(prev => {
      if (prev.some(g => g.id.toString() === gameId)) return prev;
      return [...prev, gameData];
    });

    try {
      await setDoc(doc(db, 'games', gameId), gameData);
      return true;
    } catch (error) {
      console.warn("Firestore error adding game (using local state fallback):", error);
      return true;
    }
  };

  const deleteGameFromStore = async (gameId) => {
    // Xóa trong State cục bộ lập tức
    setGames(prev => prev.filter(g => g.id.toString() !== gameId.toString()));

    try {
      await deleteDoc(doc(db, 'games', gameId.toString()));
      return true;
    } catch (error) {
      console.warn("Firestore error deleting game (using local state fallback):", error);
      return true;
    }
  };

  const updateGameInStore = async (gameId, updatedData) => {
    const gameData = {
      ...updatedData,
      id: gameId,
      rating: Number(updatedData.rating) || 5.0,
      downloads: Number(updatedData.downloads) || 0,
      is18Plus: updatedData.is18Plus ?? (updatedData.is18Vn || updatedData.is18Uncensored || updatedData.is18Pc || updatedData.is18Android || false)
    };

    // Cập nhật State cục bộ lập tức
    setGames(prev => prev.map(g => g.id.toString() === gameId.toString() ? gameData : g));

    try {
      await updateDoc(doc(db, 'games', gameId.toString()), gameData);
      return true;
    } catch (error) {
      console.warn("Firestore error updating game (using local state fallback):", error);
      return true;
    }
  };

  return (
    <AppContext.Provider value={{ 
      user, balance, ownedGames, logout, buyGame, updateUserInfo,
      games, users, revenue, addGameToStore, deleteGameFromStore, updateGameInStore
    }}>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <NotificationBanner />
          
          <div className="app-layout">
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/category/:categoryType" element={<Category />} />
                <Route path="/games" element={<Category />} />
                <Route path="/game/:id" element={<GameDetail />} />
                <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
                <Route path="/wallet" element={user ? <Wallet /> : <Navigate to="/auth" />} />
                <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
                <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/report" element={<Report />} />
              </Routes>
            </main>

            <aside className="sidebar">
              <ChatBox />
            </aside>
          </div>
        </div>
      </Router>
    </AppContext.Provider>
  );
}

export default App;
