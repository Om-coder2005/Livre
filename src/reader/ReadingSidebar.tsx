import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TocItem, findActiveTocItem } from './tocService';
import { BookBookmark } from '../persistence/types';
import { SearchMatch, SearchResult } from './searchService';
import {
  IconMenuContents,
  IconStar,
  IconSearch,
  IconClose,
  IconBookmark,
  IconTrash,
} from '../icons/Icons';

export type SidebarTab = 'contents' | 'bookmarks' | 'search';

interface ReadingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  // Outline
  tocItems: TocItem[];
  currentPage: number;
  onNavigateToPage: (pageNum: number) => void;
  // Bookmarks
  bookmarks: BookBookmark[];
  isCurrentPageBookmarked: boolean;
  onToggleBookmarkCurrentPage: () => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  // Search
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onPerformSearch: (q: string) => void;
  searchResult: SearchResult | null;
  isSearching: boolean;
  searchProgress: number; // 0 to 100
  activeMatchIndex: number;
  onSelectMatch: (match: SearchMatch) => void;
  onNextMatch: () => void;
  onPrevMatch: () => void;
}

export const ReadingSidebar: React.FC<ReadingSidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  tocItems,
  currentPage,
  onNavigateToPage,
  bookmarks,
  isCurrentPageBookmarked,
  onToggleBookmarkCurrentPage,
  onDeleteBookmark,
  searchQuery,
  onSearchQueryChange,
  onPerformSearch,
  searchResult,
  isSearching,
  searchProgress,
  activeMatchIndex,
  onSelectMatch,
  onNextMatch,
  onPrevMatch,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute active chapter item based on current page
  const activeTocId = useMemo(() => {
    return findActiveTocItem(tocItems, currentPage)?.id ?? null;
  }, [tocItems, currentPage]);

  // Focus search input when switching to search tab
  useEffect(() => {
    if (isOpen && activeTab === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <aside className="reading-sidebar" aria-label="Reading Tools">
      {/* Sidebar Fixed Header with Tabs */}
      <div className="sidebar-header">
        <div className="sidebar-tabs" role="tablist" aria-label="Sidebar navigation">
          <button
            role="tab"
            aria-selected={activeTab === 'contents'}
            aria-controls="sidebar-pane-contents"
            id="tab-contents"
            className={`tab-btn ${activeTab === 'contents' ? 'active' : ''}`}
            onClick={() => onTabChange('contents')}
          >
            <span className="tab-icon"><IconMenuContents size={14} /></span>
            <span className="tab-label">Contents</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'bookmarks'}
            aria-controls="sidebar-pane-bookmarks"
            id="tab-bookmarks"
            className={`tab-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => onTabChange('bookmarks')}
          >
            <span className="tab-icon"><IconStar filled size={14} /></span>
            <span className="tab-label">Bookmarks</span>
            {bookmarks.length > 0 && (
              <span className="tab-badge">{bookmarks.length}</span>
            )}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'search'}
            aria-controls="sidebar-pane-search"
            id="tab-search"
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => onTabChange('search')}
          >
            <span className="tab-icon"><IconSearch size={14} /></span>
            <span className="tab-label">Search</span>
          </button>
        </div>

        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close sidebar"
          title="Close sidebar (Esc)"
        >
          <IconClose size={14} />
        </button>
      </div>

      {/* Independently Scrollable Tab Panels */}
      <div className="sidebar-content">
        {/* Table of Contents Tab */}
        {activeTab === 'contents' && (
          <div
            id="sidebar-pane-contents"
            role="tabpanel"
            aria-labelledby="tab-contents"
            className="tab-pane contents-pane"
          >
            {tocItems.length === 0 ? (
              <div className="empty-notice">
                <p className="empty-title">No Outline Available</p>
                <p className="empty-desc">
                  This volume does not contain an embedded digital table of contents.
                </p>
              </div>
            ) : (
              <div className="toc-tree-container">
                <div className="toc-eyebrow-bar">
                  <span className="toc-eyebrow-label">TABLE OF CONTENTS</span>
                  <span className="toc-current-indicator">
                    {currentPage > 0 ? `Page ${currentPage}` : ''}
                  </span>
                </div>
                <ul className="toc-tree-root" role="tree" aria-label="Book outline">
                  {tocItems.map((item, idx) => (
                    <TocTreeNode
                      key={item.id}
                      item={item}
                      isLast={idx === tocItems.length - 1}
                      currentPage={currentPage}
                      activeId={activeTocId}
                      onNavigate={onNavigateToPage}
                      depth={0}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Bookmarks Tab */}
        {activeTab === 'bookmarks' && (
          <div
            id="sidebar-pane-bookmarks"
            role="tabpanel"
            aria-labelledby="tab-bookmarks"
            className="tab-pane bookmarks-pane"
          >
            <div className="bookmark-actions">
              <button
                className={`bookmark-toggle-btn ${isCurrentPageBookmarked ? 'bookmarked' : ''}`}
                onClick={onToggleBookmarkCurrentPage}
              >
                <span className="bm-btn-icon"><IconStar filled={isCurrentPageBookmarked} size={14} /></span>
                <span>
                  {isCurrentPageBookmarked
                    ? `Page ${currentPage} Bookmarked`
                    : `Bookmark Page ${currentPage}`}
                </span>
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <div className="empty-notice">
                <p className="empty-title">No Bookmarks Saved</p>
                <p className="empty-desc">
                  Click the button above or press <kbd>Ctrl+B</kbd> to save reading marks in this volume.
                </p>
              </div>
            ) : (
              <ul className="bookmark-list">
                {bookmarks.map((bm) => (
                  <li
                    key={bm.id}
                    className={`bookmark-item ${bm.pageNum === currentPage ? 'active' : ''}`}
                  >
                    <button
                      className="bookmark-jump-btn"
                      onClick={() => onNavigateToPage(bm.pageNum)}
                      title={`Jump to Page ${bm.pageNum}`}
                    >
                      <span className="bm-icon"><IconBookmark size={16} /></span>
                      <div className="bm-details">
                        <span className="bm-page">Page {bm.pageNum}</span>
                        {bm.label && <span className="bm-label">{bm.label}</span>}
                      </div>
                    </button>
                    <button
                      className="bm-delete-btn"
                      onClick={() => onDeleteBookmark(bm.id)}
                      title="Remove bookmark"
                      aria-label={`Remove bookmark on page ${bm.pageNum}`}
                    >
                      <IconTrash size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div
            id="sidebar-pane-search"
            role="tabpanel"
            aria-labelledby="tab-search"
            className="tab-pane search-pane"
          >
            <form
              className="search-form"
              onSubmit={(e) => {
                e.preventDefault();
                onPerformSearch(searchQuery);
              }}
            >
              <div className="search-input-wrap">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Search in book…"
                  className="search-input"
                  aria-label="Search term"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => onSearchQueryChange('')}
                    title="Clear search query"
                  >
                    <IconClose size={12} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="search-submit-btn"
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? '…' : 'Find'}
              </button>
            </form>

            {/* Scanning Progress */}
            {isSearching && (
              <div className="search-progress-bar">
                <div
                  className="search-progress-fill"
                  style={{ width: `${searchProgress}%` }}
                />
                <span className="search-progress-text">Scanning pages… {searchProgress}%</span>
              </div>
            )}

            {/* Search Results */}
            {searchResult && !isSearching && (
              <div className="search-results-container">
                {!searchResult.hasExtractableText ? (
                  <div className="empty-notice warning">
                    <p className="empty-title">No Searchable Text</p>
                    <p className="empty-desc">
                      This volume contains scanned or rasterized page images without extractable digital text.
                    </p>
                  </div>
                ) : searchResult.totalMatches === 0 ? (
                  <div className="empty-notice">
                    <p className="empty-title">No Matches</p>
                    <p className="empty-desc">No occurrences of "{searchQuery}" were found.</p>
                  </div>
                ) : (
                  <>
                    <div className="search-summary-bar">
                      <span className="match-count">
                        {searchResult.totalMatches} {searchResult.totalMatches === 1 ? 'match' : 'matches'}
                      </span>
                      <div className="search-nav-controls">
                        <button
                          type="button"
                          className="search-nav-btn"
                          onClick={onPrevMatch}
                          title="Previous match"
                          aria-label="Previous search match"
                        >
                          ‹
                        </button>
                        <span className="match-index-label">
                          {activeMatchIndex + 1} / {searchResult.totalMatches}
                        </span>
                        <button
                          type="button"
                          className="search-nav-btn"
                          onClick={onNextMatch}
                          title="Next match"
                          aria-label="Next search match"
                        >
                          ›
                        </button>
                      </div>
                    </div>

                    <ul className="search-results-list">
                      {searchResult.matches.map((m) => (
                        <li
                          key={m.id}
                          className={`search-result-item ${m.matchIndex === activeMatchIndex ? 'active' : ''}`}
                          onClick={() => onSelectMatch(m)}
                        >
                          <div className="result-page-badge">Page {m.pageNum}</div>
                          <div className="result-snippet">
                            {m.snippetBefore}
                            <mark className="search-highlight">{m.matchWord}</mark>
                            {m.snippetAfter}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

/* ------------------------------------------------------------------ */
/*  Threaded Hierarchical Table of Contents Tree Node Component        */
/* ------------------------------------------------------------------ */

interface TocTreeNodeProps {
  item: TocItem;
  isLast: boolean;
  currentPage: number;
  activeId: string | null;
  onNavigate: (pageNum: number) => void;
  depth: number;
}

const TocTreeNode: React.FC<TocTreeNodeProps> = ({
  item,
  isLast,
  currentPage,
  activeId,
  onNavigate,
  depth,
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isActive = item.id === activeId || (activeId === null && item.pageNum === currentPage);
  const rowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active item into visible viewport smoothly
  useEffect(() => {
    if (isActive && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]);

  const handleToggleChevron = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  const handleRowClick = () => {
    if (item.pageNum !== null) {
      onNavigate(item.pageNum);
    }
  };

  return (
    <li
      className={`toc-tree-item ${isLast ? 'is-last' : 'has-next'} depth-${depth}`}
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={isActive}
    >
      <div
        ref={rowRef}
        className={`toc-tree-row ${isActive ? 'active' : ''} ${item.pageNum === null ? 'no-page' : ''}`}
        onClick={handleRowClick}
        tabIndex={0}
        role="button"
        aria-label={`${item.title}${item.pageNum !== null ? `, page ${item.pageNum}` : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick();
          } else if (e.key === 'ArrowRight' && hasChildren && !expanded) {
            e.preventDefault();
            setExpanded(true);
          } else if (e.key === 'ArrowLeft' && hasChildren && expanded) {
            e.preventDefault();
            setExpanded(false);
          }
        }}
      >
        {/* Expand/Collapse Chevron Button or Leaf Dot */}
        {hasChildren ? (
          <button
            type="button"
            className={`toc-chevron-btn ${expanded ? 'expanded' : 'collapsed'}`}
            onClick={handleToggleChevron}
            aria-label={expanded ? `Collapse ${item.title}` : `Expand ${item.title}`}
            tabIndex={-1}
          >
            <svg
              viewBox="0 0 10 10"
              width="10"
              height="10"
              className="toc-chevron-svg"
              aria-hidden="true"
            >
              <path
                d="M3 2L7 5L3 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="toc-leaf-bullet" aria-hidden="true">
            <span className="toc-bullet-dot" />
          </span>
        )}

        {/* Chapter Title */}
        <span className="toc-item-title" title={item.title}>
          {item.title}
        </span>

        {/* Page Number */}
        {item.pageNum !== null && (
          <span className="toc-item-page" aria-label={`Page ${item.pageNum}`}>
            {item.pageNum}
          </span>
        )}
      </div>

      {/* Nested Branch of Descendants */}
      {hasChildren && expanded && (
        <ul className="toc-tree-branch" role="group">
          {item.children!.map((child, cIdx) => (
            <TocTreeNode
              key={child.id}
              item={child}
              isLast={cIdx === item.children!.length - 1}
              currentPage={currentPage}
              activeId={activeId}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
