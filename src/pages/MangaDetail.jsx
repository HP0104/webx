import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { BookOpen, User, Eye, Clock, Layers, ChevronRight, ArrowLeft, PlayCircle } from 'lucide-react';
import { MANGA_STATUS } from '../utils/mangaUtils';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

function MangaDetail() {
  const { mangaId } = useParams();
  const { manga = [] } = useAppContext();
  const navigate = useNavigate();

  const mangaItem = manga.find(m => m.id?.toString() === mangaId);

  // Increment view count
  useEffect(() => {
    if (!mangaItem) return;
    const viewedKey = `manga_viewed_${mangaId}`;
    if (sessionStorage.getItem(viewedKey)) return;

    sessionStorage.setItem(viewedKey, '1');
    try {
      const mangaRef = doc(db, 'manga', mangaId);
      updateDoc(mangaRef, { views: (mangaItem.views || 0) + 1 }).catch(() => {});
    } catch (e) {
      console.warn('View count error:', e);
    }
  }, [mangaId, mangaItem]);

  if (!mangaItem) {
    return (
      <div className="container manga-page">
        <div className="manga-empty">
          <BookOpen size={64} />
          <h3>Không tìm thấy truyện</h3>
          <p>Truyện này không tồn tại hoặc đã bị xóa.</p>
          <Link to="/manga" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            <ArrowLeft size={16} /> Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const chapters = mangaItem.chapters || [];
  const sortedChapters = [...chapters].sort((a, b) => (a.number || 0) - (b.number || 0));
  const firstChapter = sortedChapters[0];
  const latestChapter = sortedChapters[sortedChapters.length - 1];

  return (
    <div className="container manga-page">
      {/* Back Button */}
      <Link to="/manga" className="manga-back-link">
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>

      {/* Manga Detail Header */}
      <div className="manga-detail-header">
        {/* Cover */}
        <div className="manga-detail-cover">
          <img
            src={mangaItem.cover || ''}
            alt={mangaItem.title}
            onError={e => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzFhMWExZiIvPjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjE2Ij5ObyBDb3ZlcjwvdGV4dD48L3N2Zz4=';
            }}
          />
        </div>

        {/* Info */}
        <div className="manga-detail-info">
          <h1 className="manga-detail-title">{mangaItem.title}</h1>

          <div className="manga-detail-meta">
            {mangaItem.author && (
              <div className="manga-detail-meta-item">
                <User size={15} />
                <span>Tác giả: <strong>{mangaItem.author}</strong></span>
              </div>
            )}
            <div className="manga-detail-meta-item">
              <Layers size={15} />
              <span>{chapters.length} chương</span>
            </div>
            <div className="manga-detail-meta-item">
              <Eye size={15} />
              <span>{(mangaItem.views || 0).toLocaleString()} lượt xem</span>
            </div>
            <div className="manga-detail-meta-item">
              <Clock size={15} />
              <span className={`manga-status-badge ${mangaItem.status || 'ongoing'}`}>
                {MANGA_STATUS[mangaItem.status] || 'Đang ra'}
              </span>
            </div>
          </div>

          {/* Genres */}
          {Array.isArray(mangaItem.genres) && mangaItem.genres.length > 0 && (
            <div className="manga-detail-genres">
              {mangaItem.genres.map(g => (
                <span key={g} className="manga-genre-tag">{g}</span>
              ))}
            </div>
          )}

          {/* Description */}
          {mangaItem.description && (
            <div className="manga-detail-desc">
              <p>{mangaItem.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="manga-detail-actions">
            {firstChapter && (
              <button
                className="btn manga-btn-read"
                onClick={() => navigate(`/manga/${mangaItem.id}/chapter/${firstChapter.id}`)}
              >
                <PlayCircle size={18} /> Đọc từ đầu
              </button>
            )}
            {latestChapter && latestChapter !== firstChapter && (
              <button
                className="btn manga-btn-latest"
                onClick={() => navigate(`/manga/${mangaItem.id}/chapter/${latestChapter.id}`)}
              >
                <BookOpen size={18} /> Chương mới nhất
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chapter List */}
      <div className="manga-chapter-section">
        <h2 className="manga-chapter-section-title">
          <Layers size={20} />
          Danh sách chương ({sortedChapters.length})
        </h2>

        {sortedChapters.length === 0 ? (
          <div className="manga-chapter-empty">
            <p>Chưa có chương nào được đăng.</p>
          </div>
        ) : (
          <div className="manga-chapter-list">
            {sortedChapters.map((chapter) => (
              <Link
                key={chapter.id}
                to={`/manga/${mangaItem.id}/chapter/${chapter.id}`}
                className="manga-chapter-item"
              >
                <div className="manga-chapter-item-left">
                  <span className="manga-chapter-number">Ch. {chapter.number}</span>
                  <span className="manga-chapter-name">{chapter.title || `Chapter ${chapter.number}`}</span>
                </div>
                <div className="manga-chapter-item-right">
                  {chapter.images && (
                    <span className="manga-chapter-pages">{chapter.images.length} trang</span>
                  )}
                  {chapter.createdAt && (
                    <span className="manga-chapter-date">
                      {new Date(chapter.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                  <ChevronRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MangaDetail;
