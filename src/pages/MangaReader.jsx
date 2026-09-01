import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { ChevronLeft, ChevronRight, ChevronUp, Layers, ArrowLeft, Maximize, Minimize } from 'lucide-react';

function MangaReader() {
  const { mangaId, chapterId } = useParams();
  const { manga = [] } = useAppContext();
  const navigate = useNavigate();

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const readerRef = useRef(null);
  const hideNavTimer = useRef(null);

  const mangaItem = manga.find(m => m.id?.toString() === mangaId);
  const chapters = mangaItem?.chapters || [];
  const sortedChapters = [...chapters].sort((a, b) => (a.number || 0) - (b.number || 0));
  const currentChapter = chapters.find(c => c.id === chapterId);
  const currentIndex = sortedChapters.findIndex(c => c.id === chapterId);
  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;

  // Show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-hide nav bar
  const resetNavTimer = useCallback(() => {
    setShowNav(true);
    if (hideNavTimer.current) clearTimeout(hideNavTimer.current);
    hideNavTimer.current = setTimeout(() => setShowNav(false), 3000);
  }, []);

  useEffect(() => {
    resetNavTimer();
    const handleMouseMove = () => resetNavTimer();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleMouseMove);
      if (hideNavTimer.current) clearTimeout(hideNavTimer.current);
    };
  }, [resetNavTimer]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && prevChapter) {
        navigate(`/manga/${mangaId}/chapter/${prevChapter.id}`);
      } else if (e.key === 'ArrowRight' && nextChapter) {
        navigate(`/manga/${mangaId}/chapter/${nextChapter.id}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevChapter, nextChapter, mangaId, navigate]);

  // Scroll to top on chapter change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [chapterId]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (!mangaItem || !currentChapter) {
    return (
      <div className="container manga-page">
        <div className="manga-empty">
          <Layers size={64} />
          <h3>Không tìm thấy chương</h3>
          <p>Chương này không tồn tại hoặc đã bị xóa.</p>
          <Link to={mangaItem ? `/manga/${mangaId}` : '/manga'} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            <ArrowLeft size={16} /> Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const images = currentChapter.images || [];

  return (
    <div className={`manga-reader ${isFullscreen ? 'fullscreen' : ''}`} ref={readerRef}>
      {/* Top Navigation */}
      <div className={`manga-reader-nav ${showNav ? 'visible' : 'hidden'}`}>
        <div className="manga-reader-nav-inner">
          {/* Left: Back + Title */}
          <div className="manga-reader-nav-left">
            <Link to={`/manga/${mangaId}`} className="manga-reader-back">
              <ArrowLeft size={18} />
            </Link>
            <div className="manga-reader-title-block">
              <span className="manga-reader-manga-title">{mangaItem.title}</span>
              <span className="manga-reader-chapter-title">
                Ch. {currentChapter.number} {currentChapter.title ? `- ${currentChapter.title}` : ''}
              </span>
            </div>
          </div>

          {/* Center: Chapter Nav */}
          <div className="manga-reader-nav-center">
            <button
              className="manga-reader-nav-btn"
              disabled={!prevChapter}
              onClick={() => prevChapter && navigate(`/manga/${mangaId}/chapter/${prevChapter.id}`)}
              title="Chương trước (←)"
            >
              <ChevronLeft size={20} />
            </button>

            <select
              className="manga-reader-chapter-select"
              value={chapterId}
              onChange={e => navigate(`/manga/${mangaId}/chapter/${e.target.value}`)}
            >
              {sortedChapters.map(ch => (
                <option key={ch.id} value={ch.id}>
                  Ch. {ch.number}{ch.title ? ` - ${ch.title}` : ''}
                </option>
              ))}
            </select>

            <button
              className="manga-reader-nav-btn"
              disabled={!nextChapter}
              onClick={() => nextChapter && navigate(`/manga/${mangaId}/chapter/${nextChapter.id}`)}
              title="Chương sau (→)"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Right: Actions */}
          <div className="manga-reader-nav-right">
            <button className="manga-reader-nav-btn" onClick={toggleFullscreen} title="Toàn màn hình">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Image List (Vertical Scroll) */}
      <div className="manga-reader-images">
        {images.length === 0 ? (
          <div className="manga-reader-no-images">
            <p>Chương này chưa có ảnh nào.</p>
          </div>
        ) : (
          images.map((imgUrl, index) => (
            <LazyImage
              key={`${chapterId}-${index}`}
              src={imgUrl}
              alt={`Trang ${index + 1}`}
              index={index}
              total={images.length}
            />
          ))
        )}
      </div>

      {/* Bottom Chapter Navigation */}
      <div className="manga-reader-bottom-nav">
        {prevChapter ? (
          <Link
            to={`/manga/${mangaId}/chapter/${prevChapter.id}`}
            className="manga-reader-bottom-btn prev"
          >
            <ChevronLeft size={18} />
            <span>Ch. {prevChapter.number}</span>
          </Link>
        ) : (
          <div />
        )}

        <Link to={`/manga/${mangaId}`} className="manga-reader-bottom-btn home">
          <Layers size={16} />
          <span>Danh sách chương</span>
        </Link>

        {nextChapter ? (
          <Link
            to={`/manga/${mangaId}/chapter/${nextChapter.id}`}
            className="manga-reader-bottom-btn next"
          >
            <span>Ch. {nextChapter.number}</span>
            <ChevronRight size={18} />
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* Scroll to Top */}
      {showScrollTop && (
        <button className="manga-reader-scroll-top" onClick={scrollToTop}>
          <ChevronUp size={24} />
        </button>
      )}
    </div>
  );
}

/**
 * Lazy loading image component with IntersectionObserver
 */
function LazyImage({ src, alt, index, total }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px' } // Start loading 600px before visible
    );

    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="manga-reader-page" ref={imgRef}>
      {inView ? (
        <>
          {!loaded && (
            <div className="manga-reader-page-loading">
              <div className="manga-reader-spinner" />
              <span>Trang {index + 1}/{total}</span>
            </div>
          )}
          <img
            src={src}
            alt={alt}
            className={`manga-reader-page-img ${loaded ? 'loaded' : 'loading'}`}
            onLoad={() => setLoaded(true)}
            onError={e => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `<div class="manga-reader-page-error">Lỗi tải trang ${index + 1}</div>`;
            }}
          />
        </>
      ) : (
        <div className="manga-reader-page-placeholder">
          <span>Trang {index + 1}</span>
        </div>
      )}
    </div>
  );
}

export default MangaReader;
