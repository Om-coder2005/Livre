import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LivreBook, BookProgress } from '../persistence/types';
import { IconEdit, IconTrash } from '../icons/Icons';

export interface BookCardProps {
  book: LivreBook;
  progress?: BookProgress;
  themeIndex: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit: (e: React.MouseEvent, book: LivreBook) => void;
  onDelete: (e: React.MouseEvent, book: LivreBook) => void;
}

interface ThemeConfig {
  id: string;
  name: string;
  accent: string;
  accentSoft: string;
  accentTint: string;
  shadowColor: string;
  topIcon: React.ReactNode;
}

const THEMES: ThemeConfig[] = [
  {
    id: 'teal',
    name: 'Sanctuary Teal',
    accent: '#167B6E',
    accentSoft: '#50B3A6',
    accentTint: '#E8F5F3',
    shadowColor: 'rgba(22, 123, 110, 0.22)',
    topIcon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'ochre',
    name: 'Antique Ochre',
    accent: '#B58E3A',
    accentSoft: '#E0BA68',
    accentTint: '#FAF3E5',
    shadowColor: 'rgba(181, 142, 58, 0.22)',
    topIcon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
      </svg>
    ),
  },
  {
    id: 'terracotta',
    name: 'Literary Coral',
    accent: '#B75C41',
    accentSoft: '#DF8B73',
    accentTint: '#FAECE8',
    shadowColor: 'rgba(183, 92, 65, 0.20)',
    topIcon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    ),
  },
  {
    id: 'lavender',
    name: 'Twilight Lavender',
    accent: '#736195',
    accentSoft: '#A897C6',
    accentTint: '#F2EEF8',
    shadowColor: 'rgba(115, 97, 149, 0.20)',
    topIcon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'cobalt',
    name: 'Marine Cobalt',
    accent: '#3E668E',
    accentSoft: '#7DA4CB',
    accentTint: '#EAF1F8',
    shadowColor: 'rgba(62, 102, 142, 0.20)',
    topIcon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    id: 'olive',
    name: 'Forest Sage',
    accent: '#616F4F',
    accentSoft: '#9FB08B',
    accentTint: '#EFF4EC',
    shadowColor: 'rgba(97, 111, 79, 0.20)',
    topIcon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

export const BookCard: React.FC<BookCardProps> = ({
  book,
  progress,
  themeIndex,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const theme = THEMES[themeIndex % THEMES.length];

  const lastPage = progress?.lastPage ?? 0;
  const percent =
    book.pageCount > 0 && lastPage > 0
      ? Math.min(100, Math.round((lastPage / book.pageCount) * 100))
      : 0;
  const isFinished = percent === 100;

  // Close popup menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [menuOpen]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  /* Render theme-specific geometric illustration */
  const renderGeometricArt = (variant: number) => {
    const primary = theme.accent;
    const secondary = theme.accentSoft;

    switch (variant % 6) {
      case 0:
        // Teal / Concentric Contoured Cylinders & Spheres
        return (
          <svg className="geometric-svg" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.95">
              {/* Back Cylinder with horizontal contours */}
              <rect x="75" y="15" width="46" height="65" rx="6" fill={secondary} opacity="0.5" />
              <line x1="75" y1="28" x2="121" y2="28" stroke="#FFF" strokeWidth="1.2" opacity="0.6" />
              <line x1="75" y1="42" x2="121" y2="42" stroke="#FFF" strokeWidth="1.2" opacity="0.6" />
              <line x1="75" y1="56" x2="121" y2="56" stroke="#FFF" strokeWidth="1.2" opacity="0.6" />
              {/* Main Concentric Spheres */}
              <circle cx="120" cy="98" r="38" fill={primary} opacity="0.85" />
              <circle cx="120" cy="98" r="28" stroke="#FFF" strokeWidth="1.4" opacity="0.4" fill="none" />
              <circle cx="120" cy="98" r="18" stroke="#FFF" strokeWidth="1.4" opacity="0.5" fill="none" />
              <circle cx="120" cy="98" r="8" stroke="#FFF" strokeWidth="1.4" opacity="0.6" fill="none" />
              {/* Overlapping Semicircle Foreground */}
              <path d="M42 140 A36 36 0 0 1 114 140 Z" fill={secondary} opacity="0.7" />
              <circle cx="68" cy="115" r="16" fill="#FFF" opacity="0.35" />
            </g>
          </svg>
        );

      case 1:
        // Ochre / Layered Woodcut Arch & Hatched Sphere
        return (
          <svg className="geometric-svg" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.95">
              {/* Upright Archway with vertical perspective lines */}
              <path d="M80 140 V50 A30 30 0 0 1 140 50 V140 Z" fill={secondary} opacity="0.6" />
              <path d="M92 140 V50 A18 18 0 0 1 128 50 V140" stroke="#FFF" strokeWidth="1.2" opacity="0.5" fill="none" />
              <path d="M104 140 V50 A6 6 0 0 1 116 50 V140" stroke="#FFF" strokeWidth="1.2" opacity="0.5" fill="none" />
              {/* Hatched Ball in corner */}
              <circle cx="68" cy="108" r="28" fill={primary} opacity="0.88" />
              <line x1="45" y1="96" x2="91" y2="120" stroke="#FFF" strokeWidth="1.2" opacity="0.5" />
              <line x1="42" y1="108" x2="94" y2="108" stroke="#FFF" strokeWidth="1.2" opacity="0.5" />
              <line x1="48" y1="120" x2="88" y2="96" stroke="#FFF" strokeWidth="1.2" opacity="0.5" />
            </g>
          </svg>
        );

      case 2:
        // Terracotta / Arched Bridge & Contoured Barrel
        return (
          <svg className="geometric-svg" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.95">
              {/* Large contoured arch bridge */}
              <path d="M60 140 C60 70 150 70 150 140 Z" fill={secondary} opacity="0.55" />
              <path d="M72 140 C72 82 138 82 138 140" stroke="#FFF" strokeWidth="1.3" opacity="0.5" fill="none" />
              <path d="M84 140 C84 94 126 94 126 140" stroke="#FFF" strokeWidth="1.3" opacity="0.5" fill="none" />
              {/* Dense textured foreground barrel */}
              <circle cx="56" cy="112" r="24" fill={primary} opacity="0.85" />
              <line x1="34" y1="102" x2="78" y2="102" stroke="#FFF" strokeWidth="1.2" opacity="0.45" />
              <line x1="32" y1="112" x2="80" y2="112" stroke="#FFF" strokeWidth="1.2" opacity="0.45" />
              <line x1="36" y1="122" x2="76" y2="122" stroke="#FFF" strokeWidth="1.2" opacity="0.45" />
            </g>
          </svg>
        );

      case 3:
        // Lavender / Stepped Cylindrical Contours & Ribbon
        return (
          <svg className="geometric-svg" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.95">
              <rect x="90" y="30" width="50" height="90" rx="25" fill={primary} opacity="0.75" />
              <circle cx="115" cy="55" r="16" stroke="#FFF" strokeWidth="1.3" opacity="0.45" fill="none" />
              <path d="M40 140 Q80 80 120 140 Z" fill={secondary} opacity="0.65" />
              <path d="M50 140 Q80 95 110 140" stroke="#FFF" strokeWidth="1.3" opacity="0.5" fill="none" />
            </g>
          </svg>
        );

      case 4:
        // Cobalt / Memphis Geometric Blocks & Arches
        return (
          <svg className="geometric-svg" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.95">
              <rect x="75" y="45" width="48" height="48" rx="4" fill={secondary} opacity="0.5" />
              <line x1="75" y1="61" x2="123" y2="61" stroke="#FFF" strokeWidth="1.2" opacity="0.5" />
              <line x1="75" y1="77" x2="123" y2="77" stroke="#FFF" strokeWidth="1.2" opacity="0.5" />
              <path d="M100 140 A40 40 0 0 1 160 140 Z" fill={primary} opacity="0.8" />
              <circle cx="65" cy="115" r="22" fill={secondary} opacity="0.7" />
              <circle cx="65" cy="115" r="12" fill="#FFF" opacity="0.4" />
            </g>
          </svg>
        );

      default:
        // Olive / Overlapping Woodcut Arch & Columns
        return (
          <svg className="geometric-svg" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.95">
              <path d="M70 140 V60 A32 32 0 0 1 134 60 V140 Z" fill={secondary} opacity="0.55" />
              <line x1="86" y1="60" x2="86" y2="140" stroke="#FFF" strokeWidth="1.2" opacity="0.4" />
              <line x1="102" y1="60" x2="102" y2="140" stroke="#FFF" strokeWidth="1.2" opacity="0.4" />
              <line x1="118" y1="60" x2="118" y2="140" stroke="#FFF" strokeWidth="1.2" opacity="0.4" />
              <circle cx="62" cy="110" r="26" fill={primary} opacity="0.8" />
            </g>
          </svg>
        );
    }
  };

  return (
    <div
      className={`dashboard-book-card ${isSelected ? 'selected' : ''} theme-${theme.id}`}
      style={{
        '--card-accent': theme.accent,
        '--card-accent-soft': theme.accentSoft,
        '--card-accent-tint': theme.accentTint,
        '--card-shadow-color': theme.shadowColor,
      } as React.CSSProperties}
      onClick={onSelect}
    >
      <Link
        to={`/reader/${book.id}`}
        className="card-main-link"
        title={`Open "${book.title}" in Livre`}
      >
        {/* Top Header Row: Category / Theme Icon & Discreet Menu */}
        <div className="card-top-row">
          <div className="card-category-indicator">
            {percent > 0 ? (
              <span className={`reading-badge-pill ${isFinished ? 'finished' : ''}`}>
                {isFinished ? 'Completed' : `${percent}%`}
              </span>
            ) : (
              <span className="reading-badge-pill unread">Unread</span>
            )}
          </div>

          <div className="card-top-right-group" onClick={(e) => e.stopPropagation()}>
            <div className="card-theme-icon-badge" title="Volume format">
              {theme.topIcon}
            </div>

            {/* Discreet 3-dot Action Menu Trigger */}
            <div className="discreet-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="discreet-menu-btn"
                onClick={toggleMenu}
                title="Book actions"
                aria-label={`Options for ${book.title}`}
                aria-expanded={menuOpen}
              >
                ⋮
              </button>

              {menuOpen && (
                <div className="discreet-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="menu-item-action"
                    onClick={(e) => {
                      setMenuOpen(false);
                      onEdit(e, book);
                    }}
                  >
                    <span className="item-icon"><IconEdit size={14} /></span> Edit Details
                  </button>
                  <button
                    type="button"
                    className="menu-item-action danger"
                    onClick={(e) => {
                      setMenuOpen(false);
                      onDelete(e, book);
                    }}
                  >
                    <span className="item-icon"><IconTrash size={14} /></span> Remove Book
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Editorial Content: Bold Title, Author, Page Metadata */}
        <div className="card-content-area">
          <h3 className="card-book-title" title={book.title}>
            {book.title}
          </h3>

          <div className="card-meta-line">
            {book.author ? (
              <span className="card-book-author" title={book.author}>
                {book.author}
              </span>
            ) : (
              <span className="card-book-author anonymous">Author Unknown</span>
            )}
          </div>

          <p className="card-meta-sub">
            {book.pageCount} pages · Bound volume
          </p>
        </div>

        {/* Bottom Section: Navigation Arrow & Progress Info on Left */}
        <div className="card-bottom-row">
          <div className="card-bottom-left">
            <div className="nav-arrow-circle" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>

            <div className="card-progress-info">
              {lastPage > 0 ? (
                <>
                  <span className="progress-page-read">Page {lastPage} of {book.pageCount}</span>
                  <div className="progress-bar-thin">
                    <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
                  </div>
                </>
              ) : (
                <span className="progress-unopened">Start reading</span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom-Right Corner: Layered Geometric Illustration + Real Cover Integration */}
        <div className="card-geometric-cluster" aria-hidden="true">
          {renderGeometricArt(themeIndex)}

          {/* If a real extracted PDF cover thumbnail exists, integrate it into the geometric pedestal */}
          {book.coverUrl ? (
            <div className="card-real-cover-pedestal">
              <div className="mini-book-casing">
                <img
                  src={book.coverUrl}
                  alt=""
                  className="mini-book-thumb"
                  loading="lazy"
                />
                <div className="mini-book-spine-crease" />
                <div className="mini-book-paper-edge" />
              </div>
            </div>
          ) : (
            <div className="card-fallback-book-motif">
              <div className="fallback-pages-fan" />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default BookCard;
