import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  // Don't render pagination if all items fit on one page
  if (totalItems <= itemsPerPage) {
    return null;
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pageNumbers = [];

  // Previous button
  const hasPrevious = currentPage > 1;

  // Next button
  const hasNext = currentPage < totalPages;

  // Generate page numbers
  for (let i = 1; i <= totalPages; i++) {
    // Only show a few page numbers around the current page
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      pageNumbers.push(
        <button
          key={i}
          className={`page-button ${i === currentPage ? "active" : ""}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    } else if (
      (i === currentPage - 3 && currentPage > 3) ||
      (i === currentPage + 3 && currentPage < totalPages - 2)
    ) {
      // Add ellipsis
      pageNumbers.push(
        <span key={`ellipsis-${i}`} style={{ padding: "6px" }}>
          ...
        </span>
      );
    }
  }

  return (
    <div className="pagination">
      {hasPrevious && (
        <button
          className="page-button"
          onClick={() => onPageChange(currentPage - 1)}
        >
          ← Previous
        </button>
      )}
      {pageNumbers}
      {hasNext && (
        <button
          className="page-button"
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next →
        </button>
      )}
    </div>
  );
};

export default Pagination;