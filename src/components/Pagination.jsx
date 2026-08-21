import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Generates a smart page range with ellipsis for large page counts.
 * Always shows first, last, and a window around the current page.
 */
function getPageRange(currentPage, totalPages) {
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set();

  // Always include first and last
  pages.add(1);
  pages.add(totalPages);

  // Calculate window around current page
  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  // Adjust to try to show 3 middle pages
  if (start === 2) end = Math.min(totalPages - 1, 4);
  if (end === totalPages - 1) start = Math.max(2, totalPages - 3);

  for (let i = start; i <= end; i++) {
    pages.add(i);
  }

  // Convert to sorted array and insert ellipsis markers
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('...');
    }
    result.push(sorted[i]);
  }

  return result;
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = getPageRange(currentPage, totalPages);

  return (
    <nav className="pagination-bar" aria-label="Phân trang">
      {/* First page */}
      <button
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        aria-label="Trang đầu"
        title="Trang đầu"
      >
        <ChevronsLeft size={16} />
      </button>

      {/* Previous */}
      <button
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Trang trước"
        title="Trang trước"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Page numbers */}
      <div className="pagination-pages">
        {pages.map((page, index) =>
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
              •••
            </span>
          ) : (
            <button
              key={page}
              className={`pagination-btn pagination-num ${currentPage === page ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
              aria-label={`Trang ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
      </div>

      {/* Next */}
      <button
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Trang sau"
        title="Trang sau"
      >
        <ChevronRight size={16} />
      </button>

      {/* Last page */}
      <button
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="Trang cuối"
        title="Trang cuối"
      >
        <ChevronsRight size={16} />
      </button>

      {/* Page info */}
      <div className="pagination-info">
        Trang <span className="pagination-info-current">{currentPage}</span> / {totalPages}
      </div>
    </nav>
  );
}

export default Pagination;
