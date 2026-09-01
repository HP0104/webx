import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { BookOpen, Search, Filter, Eye, Layers, Clock, ArrowUpDown, ChevronRight } from 'lucide-react';
import { MANGA_GENRES, MANGA_STATUS } from '../utils/mangaUtils';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 12;

function MangaList() {
  const { manga = [], loadingManga } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(pageParam) ? 1 : pageParam;

  // Filter & sort
  const filteredManga = useMemo(() => {
    let result = [...manga];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.title?.toLowerCase().includes(q) ||
        m.author?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      );
    }

    // Genre filter
    if (selectedGenre !== 'all') {
      result = result.filter(m =>
        Array.isArray(m.genres) && m.genres.includes(selectedGenre)
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      result = result.filter(m => m.status === selectedStatus);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => {
          const da = a.updatedAt || a.createdAt || '';
          const db = b.updatedAt || b.createdAt || '';
          return db.localeCompare(da);
        });
        break;
      case 'views':
        result.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'az':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'chapters':
        result.sort((a, b) => (b.chapters?.length || 0) - (a.chapters?.length || 0));
        break;
      default:
        break;
    }

    return result;
  }, [manga, searchQuery, selectedGenre, selectedStatus, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredManga.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedManga = filteredManga.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    setSearchParams({ page: page.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Get active genres from manga data for filter
  const activeGenres = useMemo(() => {
    const genreSet = new Set();
    manga.forEach(m => {
      if (Array.isArray(m.genres)) m.genres.forEach(g => genreSet.add(g));
    });
    return MANGA_GENRES.filter(g => genreSet.has(g));
  }, [manga]);

  if (loadingManga) {
    return (
      <div className="container manga-page">
        <div className="manga-loading">
          <BookOpen size={48} />
          <p>Đang tải danh sách truyện...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container manga-page">
      {/* Header */}
      <div className="manga-page-header">
        <div className="manga-header-content">
          <BookOpen size={28} className="manga-header-icon" />
          <div>
            <h1 className="manga-page-title">Kho Truyện Tranh</h1>
            <p className="manga-page-subtitle">
              {manga.length} bộ truyện có sẵn
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="manga-filters">
        {/* Search Bar */}
        <div className="manga-search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm truyện theo tên, tác giả..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setSearchParams({ page: '1' });
            }}
          />
        </div>

        {/* Filter Controls */}
        <div className="manga-filter-row">
          {/* Sort */}
          <div className="manga-filter-select">
            <ArrowUpDown size={14} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Mới nhất</option>
              <option value="views">Xem nhiều</option>
              <option value="az">A → Z</option>
              <option value="chapters">Nhiều chapter</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="manga-filter-select">
            <Filter size={14} />
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(MANGA_STATUS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Genre Pills */}
        {activeGenres.length > 0 && (
          <div className="manga-genre-pills">
            <button
              className={`manga-genre-pill ${selectedGenre === 'all' ? 'active' : ''}`}
              onClick={() => { setSelectedGenre('all'); setSearchParams({ page: '1' }); }}
            >
              Tất cả
            </button>
            {activeGenres.map(genre => (
              <button
                key={genre}
                className={`manga-genre-pill ${selectedGenre === genre ? 'active' : ''}`}
                onClick={() => { setSelectedGenre(genre); setSearchParams({ page: '1' }); }}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manga Grid */}
      {filteredManga.length === 0 ? (
        <div className="manga-empty">
          <BookOpen size={64} />
          <h3>Không tìm thấy truyện nào</h3>
          <p>{searchQuery ? 'Thử tìm kiếm với từ khóa khác.' : 'Chưa có truyện nào được đăng. Hãy quay lại sau!'}</p>
        </div>
      ) : (
        <>
          <div className="manga-grid">
            {paginatedManga.map(m => (
              <MangaCard key={m.id} manga={m} />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

function MangaCard({ manga }) {
  const chapterCount = manga.chapters?.length || 0;
  const latestChapter = manga.chapters?.[chapterCount - 1];

  return (
    <Link to={`/manga/${manga.id}`} className="manga-card" id={`manga-card-${manga.id}`}>
      <div className="manga-card-cover">
        <img
          src={manga.cover || '/placeholder-manga.jpg'}
          alt={manga.title}
          loading="lazy"
          onError={e => {
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFhMWExZiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjE0Ij5ObyBDb3ZlcjwvdGV4dD48L3N2Zz4=';
          }}
        />
        {/* Status Badge */}
        <div className={`manga-card-status ${manga.status || 'ongoing'}`}>
          {MANGA_STATUS[manga.status] || 'Đang ra'}
        </div>
        {/* Overlay on hover */}
        <div className="manga-card-overlay">
          <span className="manga-card-read-btn">
            Đọc ngay <ChevronRight size={16} />
          </span>
        </div>
      </div>

      <div className="manga-card-info">
        <h3 className="manga-card-title">{manga.title}</h3>
        <div className="manga-card-meta">
          <span><Layers size={13} /> {chapterCount} chương</span>
          <span><Eye size={13} /> {(manga.views || 0).toLocaleString()}</span>
        </div>
        {latestChapter && (
          <div className="manga-card-latest">
            <Clock size={12} />
            <span>Ch. {latestChapter.number || chapterCount}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default MangaList;
