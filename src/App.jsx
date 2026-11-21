/* eslint-disable react-refresh/only-export-components */
import React, { useState, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import NotificationBanner from './components/NotificationBanner';
import ChatBox from './components/ChatBox';
import AdBanner, { AdBlockWall } from './components/AdBanner';
import Home from './pages/Home';
import ExoClickPopunder from './components/ExoClickPopunder';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, onSnapshot, deleteDoc, runTransaction } from 'firebase/firestore';
import { findGameByRouteParam, getGamePath } from './utils/gameRoutes';
import { createOwnershipRecord, getGameOwnership, normalizeOwnedGames } from './utils/ownership';
import { deriveUsernameFromAuthUser } from './utils/userUtils';
import { getVideoCategoryPageTitle } from './constants/videoCategories';
import { getVideoThumbnail } from './utils/videoUtils';
import { ADS_CONFIG } from './config/ads';
import MobileBottomNav from './components/MobileBottomNav';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded routes & heavy components for high initial load performance
const Auth = lazy(() => import('./pages/Auth'));
const Wallet = lazy(() => import('./pages/Wallet'));
const GameDetail = lazy(() => import('./pages/GameDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const Category = lazy(() => import('./pages/Category'));
const Blog = lazy(() => import('./pages/Blog'));
const Report = lazy(() => import('./pages/Report'));
const GameSearch = lazy(() => import('./pages/GameSearch'));
const Videos = lazy(() => import('./pages/Videos'));
const VideoDetail = lazy(() => import('./pages/VideoDetail'));
const MangaList = lazy(() => import('./pages/MangaList'));
const MangaDetail = lazy(() => import('./pages/MangaDetail'));
const MangaReader = lazy(() => import('./pages/MangaReader'));
const UploaderDashboard = lazy(() => import('./pages/UploaderDashboard'));
const VideoAdBanner = lazy(() => import('./components/VideoAdBanner'));
const NotFound = lazy(() => import('./pages/NotFound'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);



const CATEGORY_TITLES = {
  hot: 'Game Hot',
  new: 'Game Mới Nhất',
  popular: 'Game Nhiều Người Chơi',
  'top-rated': 'Game Đánh Giá Cao',
  '18-plus': 'Game 18+',
  '18-all': 'Tất Cả Game 18+',
  '18-vn': 'Việt Hóa 18+',
  '18-uncensored': '18+ Không Che',
  '18-pc': 'Game 18+ Cho PC',
  '18-android': 'Game 18+ Cho Android'
};

function PageTitle({ games = [], videos = [], manga = [] }) {
  const location = useLocation();

  React.useEffect(() => {
    const { pathname, search } = location;
    const searchParams = new URLSearchParams(search);
    let pageTitle = 'WEB18P';
    let description = 'WEB18P - kho game Việt hóa, game PC và Android được cập nhật thường xuyên.';
    let canonicalPath = pathname;
    let ogImage = 'https://web18p.xyz/og-banner.jpg';

    if (pathname === '/') {
      pageTitle = 'Trang Chủ';
      canonicalPath = '/';
    } else if (pathname === '/games') {
      pageTitle = searchParams.get('search')
        ? `Tìm Kiếm: ${searchParams.get('search')}`
        : 'Tất Cả Trò Chơi';
      description = searchParams.get('search')
        ? `Kết quả tìm kiếm game "${searchParams.get('search')}" trên WEB18P.`
        : 'Danh sách tất cả trò chơi đang có trên WEB18P.';
    } else if (pathname.startsWith('/category/')) {
      const categoryType = pathname.split('/').filter(Boolean)[1];
      pageTitle = CATEGORY_TITLES[categoryType] || 'Kho Game';
      description = `${pageTitle} được cập nhật trên WEB18P.`;
    } else if (pathname.startsWith('/game/')) {
      const gameSlug = pathname.split('/').filter(Boolean)[1];
      const game = findGameByRouteParam(games, gameSlug);
      pageTitle = game?.title || 'Chi Tiết Game';
      description = game?.description || 'Thông tin chi tiết game trên WEB18P.';
      if (game?.image) ogImage = game.image;
      canonicalPath = game ? getGamePath(game) : pathname;
    } else if (pathname === '/blog') {
      pageTitle = 'Blog';
      description = 'Bài viết và cập nhật từ WEB18P.';
    } else if (pathname === '/report') {
      pageTitle = 'Báo Lỗi';
      description = 'Gửi báo lỗi và góp ý cho WEB18P.';
    } else if (pathname === '/about') {
      pageTitle = 'Về Chúng Tôi';
      description = 'Tìm hiểu về WEB18P - Nền tảng game Việt Hóa, phim bộ không gián đoạn và truyện tranh online hàng đầu.';
    } else if (pathname === '/contact') {
      pageTitle = 'Liên Hệ & Hỗ Trợ';
      description = 'Kênh liên hệ chính thức, giải đáp kỹ thuật và xử lý bản quyền DMCA tại WEB18P.';
    } else if (pathname === '/privacy') {
      pageTitle = 'Chính Sách Quyền Riêng Tư';
      description = 'Cam kết bảo mật dữ liệu cá nhân và an toàn thông tin người dùng tại WEB18P.';
    } else if (pathname === '/auth') {
      pageTitle = 'Đăng Nhập';
    } else if (pathname === '/wallet') {
      pageTitle = 'Ví Của Tôi';
    } else if (pathname === '/profile') {
      pageTitle = 'Hồ Sơ';
    } else if (pathname === '/admin') {
      pageTitle = 'Quản Trị';
    } else if (pathname === '/ai-search') {
      pageTitle = 'Tìm Kiếm Game Bằng AI';
      description = 'Tìm kiếm game từ cơ sở dữ liệu RAWG và tự động viết bài đánh giá bằng AI trên WEB18P.';
    } else if (pathname === '/uploader') {
      pageTitle = 'Studio Đăng Phim';
      description = 'Bảng điều khiển đăng và quản lý phim trên WEB18P.';
    } else if (pathname.startsWith('/video/')) {
      const vidId = pathname.split('/').filter(Boolean)[1];
      const currentVideo = (videos || []).find(v => v.id?.toString() === vidId?.toString());
      if (currentVideo) {
        pageTitle = currentVideo.title || 'Chi Tiết Phim';
        description = currentVideo.description || `Xem video ${currentVideo.title || ''} chất lượng cao trên WEB18P.`;
        const thumb = currentVideo.thumbnail || getVideoThumbnail(currentVideo.videoUrl || currentVideo.streamtapeUrl);
        if (thumb) ogImage = thumb;
      } else {
        pageTitle = 'Chi Tiết Phim';
      }
    } else if (pathname.startsWith('/videos')) {
      const videoCat = pathname.split('/').filter(Boolean)[1] || 'all';
      pageTitle = getVideoCategoryPageTitle(videoCat);
      description = `${pageTitle} trên WEB18P.`;
    } else if (pathname === '/manga') {
      pageTitle = 'Kho Truyện Tranh';
      description = 'Đọc truyện tranh online miễn phí trên WEB18P.';
    } else if (pathname.startsWith('/manga/') && pathname.includes('/chapter/')) {
      const parts = pathname.split('/').filter(Boolean);
      const mId = parts[1];
      const chParam = parts[3];
      const currentManga = (manga || []).find(m => m.id?.toString() === mId?.toString());
      const currentChapter = currentManga?.chapters?.find(
        c => c.id?.toString() === chParam?.toString() || `chap-${c.number}` === chParam || String(c.number) === chParam
      );
      if (currentManga) {
        pageTitle = `${currentManga.title}${currentChapter ? ` - ${currentChapter.title || `Chương ${currentChapter.number}`}` : ''}`;
        description = `Đọc ${currentManga.title} trực tuyến trên WEB18P.`;
        if (currentManga.cover) ogImage = currentManga.cover;
      } else {
        pageTitle = 'Đọc Truyện';
      }
    } else if (pathname.startsWith('/manga/')) {
      const mId = pathname.split('/').filter(Boolean)[1];
      const currentManga = (manga || []).find(m => m.id?.toString() === mId?.toString());
      if (currentManga) {
        pageTitle = currentManga.title || 'Chi Tiết Truyện';
        description = currentManga.description || 'Thông tin chi tiết truyện tranh trên WEB18P.';
        if (currentManga.cover) ogImage = currentManga.cover;
      } else {
        pageTitle = 'Chi Tiết Truyện';
      }
    } else if (pathname !== '/blog' && pathname !== '/report' && pathname !== '/about' && pathname !== '/contact' && pathname !== '/privacy' && pathname !== '/auth' && pathname !== '/wallet' && pathname !== '/profile' && pathname !== '/admin' && pathname !== '/ai-search' && !pathname.startsWith('/category/') && !pathname.startsWith('/game/') && pathname !== '/games' && pathname !== '/') {
      pageTitle = 'Không Tìm Thấy Trang (404)';
    }

    document.title = `${pageTitle} | WEB18P`;
    const normalizedPath = canonicalPath === '/' ? '/' : (canonicalPath.endsWith('/') ? canonicalPath : `${canonicalPath}/`);
    const canonicalUrl = `https://web18p.xyz${normalizedPath}`;
    const setMeta = (selector, attr, value) => {
      const element = document.querySelector(selector);
      if (element) element.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', `${pageTitle} | WEB18P`);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:image"]', 'content', ogImage);
    setMeta('meta[name="twitter:title"]', 'content', `${pageTitle} | WEB18P`);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:image"]', 'content', ogImage);
    setMeta('link[rel="canonical"]', 'href', canonicalUrl);
  }, [games, videos, manga, location]);

  return null;
}

function RouteAdBanner() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <AdBanner key={routeKey + '-1'} config={ADS_CONFIG.slot1} />
      </div>
      <div style={{ width: '728px', flexShrink: 0 }} className="ad-desktop-only">
        <AdBanner key={routeKey + '-2'} config={ADS_CONFIG.slot1_right} />
      </div>
    </div>
  );
}

function RouteAdBannerBottom() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}-bottom`;

  return <AdBanner key={routeKey} config={ADS_CONFIG.slot2} />;
}

function MangaLegacyRedirect() {
  const { mangaId, chapterId } = useParams();
  return <Navigate to={`/manga/${mangaId}/chapter/${chapterId}`} replace />;
}

function VideoLegacyRedirect() {
  const { videoId } = useParams();
  return <Navigate to={`/video/${videoId}`} replace />;
}

function AppContent({ user, authLoading }) {
  const location = useLocation();
  const isMangaReaderRoute = location.pathname.includes('/chapter/');
  const authFallback = (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AdBlockWall user={user} />
      <Navbar />
      <NotificationBanner />

      {!isMangaReaderRoute && (
        <div className="container" style={{ paddingBottom: 0, paddingTop: '1rem', maxWidth: '1720px' }}>
          <RouteAdBanner />
        </div>
      )}

      <div
        className={`app-layout ${isMangaReaderRoute ? 'app-layout-full' : ''}`}
        style={isMangaReaderRoute ? { padding: 0, margin: 0, width: '100%', maxWidth: '100%' } : { paddingTop: '1rem' }}
      >
        <main className={`main-content ${isMangaReaderRoute ? 'main-content-full' : ''}`}>
          <ErrorBoundary>
            <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loading-spinner" /></div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/category/:categoryType" element={<Category />} />
                <Route path="/games" element={<Category />} />
                <Route path="/game/:gameSlug" element={<GameDetail />} />
                <Route path="/auth" element={authLoading ? authFallback : (!user ? <Auth /> : <Navigate to="/" />)} />
                <Route path="/wallet" element={authLoading ? authFallback : (user ? <Wallet /> : <Navigate to="/auth" />)} />
                <Route path="/profile" element={authLoading ? authFallback : (user ? <Profile /> : <Navigate to="/auth" />)} />
                <Route path="/admin" element={authLoading ? authFallback : (user?.role === 'admin' ? <Admin /> : <Navigate to="/" />)} />
                <Route path="/uploader" element={authLoading ? authFallback : ((user?.role === 'uploader' || user?.role === 'admin') ? <UploaderDashboard /> : <Navigate to={user ? "/" : "/auth"} />)} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/report" element={<Report />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/ai-search" element={<GameSearch />} />
                <Route path="/videos/:category" element={<Videos />} />
                <Route path="/video/:videoId" element={<VideoDetail />} />
                <Route path="/watch/:videoId" element={<VideoLegacyRedirect />} />
                <Route path="/manga" element={<MangaList />} />
                <Route path="/manga/:mangaId" element={<MangaDetail />} />
                <Route path="/manga/:mangaId/chapter/:chapterId" element={<MangaReader />} />
                <Route path="/manga/:mangaId/:chapterId" element={<MangaLegacyRedirect />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>

          {!isMangaReaderRoute && (
            <div className="container" style={{ paddingTop: 0, marginTop: '2rem' }}>
              <RouteAdBannerBottom />
            </div>
          )}
        </main>

        {!isMangaReaderRoute && (
          <aside className="sidebar">
            <ChatBox />
            <div style={{ marginTop: '1.5rem' }}>
              <Suspense fallback={null}>
                <VideoAdBanner config={ADS_CONFIG.sidebar_video} />
              </Suspense>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <AdBanner config={ADS_CONFIG.sidebar} />
            </div>
          </aside>
        )}
      </div>
      <MobileBottomNav />
      <Footer />
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [ownedGames, setOwnedGames] = useState([]);

  // App state
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);

  // Video state
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  // Manga state
  const [manga, setManga] = useState([]);
  const [loadingManga, setLoadingManga] = useState(true);

  // Sync games from Firestore in Real-time
  React.useEffect(() => {
    const q = query(collection(db, 'games'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gamesList = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        gamesList.push({
          ...data,
          id: isNaN(docSnap.id) ? docSnap.id : Number(docSnap.id)
        });
      });
      setGames(gamesList);
      setLoadingGames(false);
    }, (error) => {
      console.warn("Firestore games sub error:", error.message);
      setLoadingGames(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync videos from Firestore in Real-time
  React.useEffect(() => {
    const q = query(collection(db, 'videos'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const videosList = [];
      querySnapshot.forEach((docSnap) => {
        videosList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setVideos(videosList);
      setLoadingVideos(false);
    }, (error) => {
      console.warn('Firestore videos sub error:', error.message);
      setLoadingVideos(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync manga from Firestore in Real-time
  React.useEffect(() => {
    const q = query(collection(db, 'manga'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const mangaList = [];
      querySnapshot.forEach((docSnap) => {
        mangaList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setManga(mangaList);
      setLoadingManga(false);
    }, (error) => {
      console.warn('Firestore manga sub error:', error.message);
      setLoadingManga(false);
    });
    return () => unsubscribe();
  }, []);

  // Firebase Auth sync
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let userData = {
          uid: firebaseUser.uid,
          username: deriveUsernameFromAuthUser(firebaseUser),
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || null,
          balance: 0,
          ownedGames: [],
          role: 'user', // Mặc định là user để bảo mật. Admin phải được set trong Database.
          adFreeUntil: 0,
          lastAdClaimed: 0
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
          photoURL: userData.photoURL,
          adFreeUntil: userData.adFreeUntil || 0,
          lastAdClaimed: userData.lastAdClaimed || 0
        });
        const normalizedOwnedGames = normalizeOwnedGames(userData.ownedGames || []);
        setBalance(userData.balance || 0);
        setOwnedGames(normalizedOwnedGames);

        if (JSON.stringify(normalizedOwnedGames) !== JSON.stringify(userData.ownedGames || [])) {
          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              ownedGames: normalizedOwnedGames
            }, { merge: true });
          } catch (fsError) {
            console.warn("Firestore ownership migration warn:", fsError.message);
          }
        }
        setAuthLoading(false);
      } else {
        setUser(null);
        setBalance(0);
        setOwnedGames([]);
        setAuthLoading(false);
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

  const buyGame = async (game) => {
    if (!user) return { ok: false, reason: 'not_logged_in' };

    const gameId = game.id.toString();
    const currentOwnership = getGameOwnership(ownedGames, gameId);
    if (currentOwnership.isActive) return { ok: true, reason: 'already_owned' };

    const fallbackPrice = Number(game.price) || 0;
    if (balance < fallbackPrice) return { ok: false, reason: 'insufficient_balance' };

    try {
      const userRef = doc(db, 'users', user.id);
      const gameRef = doc(db, 'games', gameId);
      const txResult = await runTransaction(db, async (transaction) => {
        const [userSnap, gameSnap] = await Promise.all([
          transaction.get(userRef),
          transaction.get(gameRef)
        ]);
        if (!userSnap.exists()) {
          throw new Error('USER_NOT_FOUND');
        }
        const serverUser = userSnap.data();
        const serverOwned = Array.isArray(serverUser.ownedGames) ? serverUser.ownedGames : [];
        const serverOwnership = getGameOwnership(serverOwned, gameId);
        if (serverOwnership.isActive) {
          return {
            alreadyOwned: true,
            nextBalance: Number(serverUser.balance) || 0,
            nextOwnedGames: normalizeOwnedGames(serverOwned)
          };
        }

        const authoritativePrice = gameSnap.exists() ? (Number(gameSnap.data().price) || 0) : fallbackPrice;
        const currentBalance = Number(serverUser.balance) || 0;
        if (currentBalance < authoritativePrice) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        const nextBalance = currentBalance - authoritativePrice;
        const ownershipRecord = createOwnershipRecord(gameId);
        // Append new purchase at the end so Firestore rules can verify the new item & price strictly
        const existingWithoutExpired = serverOwned.filter(o => {
          const oid = typeof o === 'object' && o !== null ? (o.id ?? o.gameId)?.toString() : o?.toString();
          return oid !== gameId;
        });
        const nextOwnedGames = [...existingWithoutExpired, ownershipRecord];

        transaction.update(userRef, {
          balance: nextBalance,
          ownedGames: nextOwnedGames
        });

        return {
          alreadyOwned: false,
          ownershipRecord,
          nextBalance,
          nextOwnedGames: normalizeOwnedGames(nextOwnedGames)
        };
      });

      setBalance(txResult.nextBalance);
      setOwnedGames(txResult.nextOwnedGames);
      if (txResult.alreadyOwned) {
        return { ok: true, reason: 'already_owned' };
      }
      return { ok: true, ownership: txResult.ownershipRecord };
    } catch (error) {
      if (error.message === 'INSUFFICIENT_BALANCE') {
        return { ok: false, reason: 'insufficient_balance' };
      }
      console.warn("Firestore error buying game:", error.message);
      return { ok: false, reason: 'save_failed' };
    }
  };

  const updateUserInfo = async (newData) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, newData);

      // Cập nhật state cục bộ
      if (newData.balance !== undefined) setBalance(newData.balance);
      if (newData.ownedGames !== undefined) setOwnedGames(normalizeOwnedGames(newData.ownedGames));

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

    await setDoc(doc(db, 'games', gameId), gameData);
    setGames(prev => {
      if (prev.some(g => g.id.toString() === gameId)) return prev;
      return [...prev, gameData];
    });
    return true;
  };

  const deleteGameFromStore = async (gameId) => {
    await deleteDoc(doc(db, 'games', gameId.toString()));
    setGames(prev => prev.filter(g => g.id.toString() !== gameId.toString()));
    return true;
  };

  const updateGameInStore = async (gameId, updatedData) => {
    const gameData = {
      ...updatedData,
      id: gameId,
      rating: Number(updatedData.rating) || 5.0,
      downloads: Number(updatedData.downloads) || 0,
      is18Plus: updatedData.is18Plus ?? (updatedData.is18Vn || updatedData.is18Uncensored || updatedData.is18Pc || updatedData.is18Android || false)
    };

    await updateDoc(doc(db, 'games', gameId.toString()), gameData);
    setGames(prev => prev.map(g => g.id.toString() === gameId.toString() ? gameData : g));
    return true;
  };

  // ---- Video CRUD ----
  const addVideoToStore = async (newVideo) => {
    const videoId = Date.now().toString();
    const videoData = {
      ...newVideo,
      id: videoId,
      uploaderId: newVideo.uploaderId || user?.id || null,
      uploaderName: newVideo.uploaderName || user?.username || (user?.role === 'admin' ? 'Admin' : 'Uploader'),
      createdAt: newVideo.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, 'videos', videoId), videoData);
    setVideos(prev => (prev.some(v => v.id?.toString() === videoId) ? prev : [...prev, videoData]));
    return true;
  };

  const deleteVideoFromStore = async (videoId) => {
    await deleteDoc(doc(db, 'videos', videoId.toString()));
    setVideos(prev => prev.filter(v => v.id.toString() !== videoId.toString()));
    return true;
  };

  const updateVideoInStore = async (videoId, updatedData) => {
    const videoData = { ...updatedData, id: videoId };
    await updateDoc(doc(db, 'videos', videoId.toString()), videoData);
    setVideos(prev => prev.map(v => v.id.toString() === videoId.toString() ? videoData : v));
    return true;
  };

  // ---- Manga CRUD ----
  const addMangaToStore = async (newManga) => {
    const mangaId = Date.now().toString();
    const mangaData = {
      ...newManga,
      id: mangaId,
      uploaderId: newManga.uploaderId || user?.id || null,
      uploaderName: newManga.uploaderName || user?.username || (user?.role === 'admin' ? 'Admin' : 'Uploader'),
      createdAt: newManga.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, 'manga', mangaId), mangaData);
    setManga(prev => (prev.some(m => m.id?.toString() === mangaId) ? prev : [...prev, mangaData]));
    return true;
  };

  const deleteMangaFromStore = async (mangaId, mangaObj = null) => {
    const targetManga = mangaObj || manga.find(m => m.id?.toString() === mangaId?.toString());
    await deleteDoc(doc(db, 'manga', mangaId.toString()));
    setManga(prev => prev.filter(m => m.id.toString() !== mangaId.toString()));
    if (targetManga) {
      import('./utils/mangaUtils').then(({ deleteMangaFromTelegram }) => {
        deleteMangaFromTelegram(targetManga).catch(error => {
          console.warn('Lỗi khi xóa ảnh trên Telegram:', error);
        });
      }).catch(err => {
        console.warn('Cannot load mangaUtils:', err);
      });
    }
    return true;
  };

  const updateMangaInStore = async (mangaId, updatedData) => {
    const mangaData = { ...updatedData, id: mangaId };
    await updateDoc(doc(db, 'manga', mangaId.toString()), mangaData);
    setManga(prev => prev.map(m => m.id.toString() === mangaId.toString() ? mangaData : m));
    return true;
  };

  return (
    <AppContext.Provider value={{
      user, authLoading, balance, ownedGames, logout, buyGame, updateUserInfo,
      games, loadingGames, addGameToStore, deleteGameFromStore, updateGameInStore,
      videos, loadingVideos, addVideoToStore, deleteVideoFromStore, updateVideoInStore,
      manga, loadingManga, addMangaToStore, deleteMangaFromStore, updateMangaInStore
    }}>
      <Router>
        <ExoClickPopunder />
        <PageTitle games={games} videos={videos} manga={manga} />
        <AppContent user={user} authLoading={authLoading} />
      </Router>
    </AppContext.Provider>
  );
}

export default App;
