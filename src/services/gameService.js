import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const gameService = {
  // Lấy danh sách game real-time (nếu chuyển sang Firestore sau này)
  subscribeToGames(callback) {
    const q = query(collection(db, 'games'));
    return onSnapshot(q, (snapshot) => {
      const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(games);
    });
  },

  // Các hàm hiện tại đang dùng local state trong App.jsx, 
  // nhưng ta có thể bọc lại ở đây để sau này dễ chuyển sang Firebase
  formatGameData(rawGame) {
    return {
      ...rawGame,
      price: Number(rawGame.price),
      tags: typeof rawGame.tags === 'string' ? rawGame.tags.split(',').map(t => t.trim()).filter(Boolean) : rawGame.tags,
      screenshots: typeof rawGame.screenshots === 'string' ? rawGame.screenshots.split(',').map(s => s.trim()).filter(Boolean) : rawGame.screenshots
    };
  }
};
