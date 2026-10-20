import React, { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Check,
} from 'lucide-react'

export interface PaginationProps {
  currentPage: number
  totalItems: number
  pageSize: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  itemLabel?: string
  className?: string
  showFirstLast?: boolean
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemLabel = 'records',
  className = '',
  showFirstLast = true,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Calculate pages and safe bounds
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

  // Auto-clamp page if currentPage exceeds totalPages
  useEffect(() => {
    if (totalItems > 0 && currentPage > totalPages) {
      onPageChange(totalPages)
    }
  }, [currentPage, totalPages, totalItems, onPageChange])

  // Click outside and escape listeners to close rows-per-page dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDropdownOpen])

  // Range calculation (1-based)
  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const endIndex = Math.min(safeCurrentPage * pageSize, totalItems)

  // Generate page numbers with smart ellipsis matching Yaazhi
  const getPageNumbers = (): (number | 'ellipsis-left' | 'ellipsis-right')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | 'ellipsis-left' | 'ellipsis-right')[] = []
    const showLeftEllipsis = safeCurrentPage > 3
    const showRightEllipsis = safeCurrentPage < totalPages - 2

    // Always include page 1
    pages.push(1)

    if (showLeftEllipsis) {
      pages.push('ellipsis-left')
    }

    // Determine window around current page
    let start = Math.max(2, safeCurrentPage - 1)
    let end = Math.min(totalPages - 1, safeCurrentPage + 1)

    if (safeCurrentPage <= 3) {
      end = 4
    } else if (safeCurrentPage >= totalPages - 2) {
      start = totalPages - 3
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (showRightEllipsis) {
      pages.push('ellipsis-right')
    }

    // Always include last page
    pages.push(totalPages)

    return pages
  }

  const handleSelectPageSize = (size: number) => {
    setIsDropdownOpen(false)
    onPageSizeChange(size)
    const newTotalPages = Math.max(1, Math.ceil(totalItems / size))
    if (safeCurrentPage > newTotalPages) {
      onPageChange(newTotalPages)
    }
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 border-t border-slate-200 bg-white select-none ${className}`}
    >
      {/* Left side: Range information and Rows per page */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="tabular-nums text-[12px] text-slate-600">
          Showing{' '}
          <strong className="font-semibold text-slate-900">
            {totalItems === 0 ? '0' : `${startIndex}–${endIndex}`}
          </strong>{' '}
          of{' '}
          <strong className="font-semibold text-slate-900">{totalItems}</strong>{' '}
          {itemLabel}
        </span>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <span className="text-[11.5px] text-slate-500 font-medium whitespace-nowrap">
            Rows per page:
          </span>

          {/* Upward-Opening Dropup Selector */}
          <div className="relative inline-block" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="listbox"
              aria-label={`Rows per page: ${pageSize}`}
              className={`h-7 px-2 min-w-[58px] inline-flex items-center justify-between gap-1.5 text-[12px] font-semibold rounded-lg bg-white border transition-all cursor-pointer shadow-2xs ${
                isDropdownOpen
                  ? 'border-blue-600 ring-2 ring-blue-500/10 text-blue-700'
                  : 'border-slate-300 hover:border-slate-400 text-slate-800'
              }`}
            >
              <span>{pageSize}</span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                  isDropdownOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>

            {/* Dropup Menu: Opens Upward */}
            {isDropdownOpen && (
              <div
                role="listbox"
                className="absolute left-0 bottom-[calc(100%+4px)] w-[104px] bg-white border border-slate-200 rounded-lg shadow-lg p-1 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Page Size
                </div>
                {pageSizeOptions.map((opt) => {
                  const isSelected = opt === pageSize
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectPageSize(opt)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[11.5px] rounded-md transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <span>{opt} rows</span>
                      {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Compact Pagination Navigation */}
      <div className="flex items-center gap-1">
        {/* First Page button */}
        {showFirstLast && (
          <button
            type="button"
            disabled={safeCurrentPage <= 1 || totalItems === 0}
            onClick={() => onPageChange(1)}
            title="First page"
            aria-label="First page"
            className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Previous Page button */}
        <button
          type="button"
          disabled={safeCurrentPage <= 1 || totalItems === 0}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          title="Previous page"
          aria-label="Previous page"
          className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Numeric Page Buttons */}
        <div className="flex items-center gap-1 mx-0.5">
          {getPageNumbers().map((pageItem, idx) => {
            if (typeof pageItem === 'string') {
              return (
                <span
                  key={`${pageItem}-${idx}`}
                  className="px-1 text-slate-400 text-[12px] font-mono select-none"
                >
                  …
                </span>
              )
            }

            const isCurrent = safeCurrentPage === pageItem
            return (
              <button
                key={pageItem}
                type="button"
                onClick={() => onPageChange(pageItem)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${pageItem}`}
                className={`min-w-[28px] h-7 px-1.5 rounded-lg text-[12px] font-mono font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-600 text-white border border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                }`}
              >
                {pageItem}
              </button>
            )
          })}
        </div>

        {/* Next Page button */}
        <button
          type="button"
          disabled={safeCurrentPage >= totalPages || totalItems === 0}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          title="Next page"
          aria-label="Next page"
          className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page button */}
        {showFirstLast && (
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages || totalItems === 0}
            onClick={() => onPageChange(totalPages)}
            title="Last page"
            aria-label="Last page"
            className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
