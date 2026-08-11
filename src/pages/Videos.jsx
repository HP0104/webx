import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { Play, Eye, Calendar, Tag, Film } from 'lucide-react';
import { getVideoThumbnail } from './VideoDetail';
import { toEmbedUrl } from '../utils/videoUtils';

const CATEGORY_LABELS = {
  all: 'Tất Cả Phim',
  vam: 'Phim VAM',
  '3d': 'Phim 3D'
};

import VideoCardItem from '../components/VideoCardItem';
import RandomVideosSlider from '../components/RandomVideosSlider';

function Videos() {
  const { category } = useParams();
  const { videos = [] } = useAppContext();



  const currentCategory = category || 'all';
  const pageTitle = CATEGORY_LABELS[currentCategory] || 'Tất Cả Phim';

  // Filter videos by category
  const filteredVideos = currentCategory === 'all'
    ? videos
    : videos.filter(v => v.category === currentCategory);

  // Sort by newest first
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  // Pagination
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentCategory]);

  const totalPages = Math.ceil(sortedVideos.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVideos = sortedVideos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
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
        <div className="videos-empty">
          <Film size={64} />
          <h3>Chưa có phim nào</h3>
          <p>Danh mục này hiện chưa có video. Hãy quay lại sau!</p>
        </div>
      ) : (
        <>
        <div className="videos-grid">
          {paginatedVideos.map(video => (
            <VideoCardItem key={video.id} video={video} />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}

export default Videos;
