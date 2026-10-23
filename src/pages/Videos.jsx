import { useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../App';
import { Film } from 'lucide-react';
import Pagination from '../components/Pagination';

const CATEGORY_LABELS = {
  all: 'Tất Cả Phim',
  vam: 'Phim VAM',
  '3d': 'Phim 3D'
};

import VideoCardItem from '../components/VideoCardItem';
import RandomVideosSlider from '../components/RandomVideosSlider';

function Videos() {
  const { category } = useParams();
  const { videos = [], loadingVideos } = useAppContext();

  const currentCategory = category || 'all';
  const pageTitle = CATEGORY_LABELS[currentCategory] || 'Tất Cả Phim';

  // Filter and sort videos by category and newest first
  const sortedVideos = useMemo(() => {
    const filtered = currentCategory === 'all'
      ? videos
      : videos.filter(v => v.category === currentCategory);

    return [...filtered].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [videos, currentCategory]);

  // Pagination
  const ITEMS_PER_PAGE = 9;
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(pageParam) ? 1 : pageParam;

  const totalPages = Math.ceil(sortedVideos.length / ITEMS_PER_PAGE);
  const safeCurrentPage = (totalPages > 0 && currentPage > totalPages) ? 1 : currentPage;
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVideos = sortedVideos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', page.toString());
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };



  return (
    <div className="container videos-page">
      {/* Random Videos Slider */}
      <RandomVideosSlider />

      {/* Header */}
      <div className="videos-header">
        <div className="videos-header-content">
          <Film size={28} className="videos-header-icon" />
          <div>
            <h1 className="videos-title">{pageTitle}</h1>
            <p className="videos-subtitle">
              {sortedVideos.length} video{sortedVideos.length !== 1 ? 's' : ''} có sẵn
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="videos-tabs">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Link
              key={key}
              to={`/videos/${key}`}
              className={`videos-tab ${currentCategory === key ? 'active' : ''}`}
            >
              {label.replace('Phim ', '').replace('Tất Cả ', 'Tất cả')}
            </Link>
          ))}
        </div>
      </div>

      {/* Videos Grid */}
      {sortedVideos.length === 0 ? (
        loadingVideos ? (
          <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loading-spinner" />
          </div>
        ) : (
          <div className="videos-empty">
            <Film size={64} />
            <h3>Chưa có phim nào</h3>
            <p>Danh mục này hiện chưa có video. Hãy quay lại sau!</p>
          </div>
        )
      ) : (
        <>
        <div className="videos-grid">
          {paginatedVideos.map(video => (
            <VideoCardItem key={video.id} video={video} />
          ))}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
        </>
      )}
    </div>
  );
}

export default Videos;
