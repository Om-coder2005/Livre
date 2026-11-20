import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

/**
 * Flaticon-style Bookshelf / Stacked Books Icon
 */
export const IconBooks: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-books ${className}`}
    aria-hidden="true"
    {...props}
  >
    {/* Standing book 1 */}
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H7v17.5H4z" fill="currentColor" fillOpacity="0.12" />
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H7" />
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H7v17.5H4z" />
    {/* Standing book 2 */}
    <path d="M7 19.5v-15A2.5 2.5 0 0 1 9.5 2H11v17.5H7z" />
    <line x1="7" y1="7" x2="11" y2="7" />
    {/* Leaning book 3 */}
    <path d="M14.5 3.2 19 19.5l-3.3.9L11.2 4.1a2.5 2.5 0 0 1 3.3-.9z" fill="currentColor" fillOpacity="0.12" />
    {/* Shelf line */}
    <line x1="2" y1="21.5" x2="22" y2="21.5" strokeWidth="2" />
  </svg>
);

/**
 * Flaticon-style Hourglass / Loading Icon
 */
export const IconHourglass: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-hourglass ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M5 2h14v3l-5 5 5 5v3H5v-3l5-5-5-5V2z" fill="currentColor" fillOpacity="0.1" />
    <path d="M5 2h14" />
    <path d="M5 22h14" />
    <path d="M10 16l2-2 2 2v3H10v-3z" fill="currentColor" />
    <circle cx="12" cy="11" r="1" fill="currentColor" />
  </svg>
);

/**
 * Flaticon-style Inbox / Upload Tray Icon
 */
export const IconUploadTray: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-upload-tray ${className}`}
    aria-hidden="true"
    {...props}
  >
    {/* Downward arrow into tray */}
    <line x1="12" y1="3" x2="12" y2="14" />
    <polyline points="7 9 12 14 17 9" />
    {/* Tray box with cut-out front */}
    <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    <polyline points="4 15 9 15 10 18 14 18 15 15 20 15" />
  </svg>
);

/**
 * Flaticon-style Document / PDF File Icon with folded corner
 */
export const IconDocument: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-document ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fillOpacity="0.08" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

/**
 * Flaticon-style Antique Parchment Scroll Icon
 */
export const IconScroll: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-scroll ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M8 2h11a2 2 0 0 1 2 2v11a4 4 0 0 1-4 4H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h3z" fill="currentColor" fillOpacity="0.1" />
    <path d="M19 19a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h1" />
    <path d="M8 2a3 3 0 0 0-3 3v13a3 3 0 0 0 3 3" />
    <line x1="9" y1="7" x2="16" y2="7" />
    <line x1="9" y1="11" x2="15" y2="11" />
    <line x1="9" y1="15" x2="13" y2="15" />
  </svg>
);

/**
 * Flaticon-style Open Book Icon
 */
export const IconOpenBook: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-open-book ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" fill="currentColor" fillOpacity="0.1" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill="currentColor" fillOpacity="0.1" />
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

/**
 * Flaticon-style Magnifying Glass / Search Loupe Icon
 */
export const IconMagnifier: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-magnifier ${className}`}
    aria-hidden="true"
    {...props}
  >
    <circle cx="10.5" cy="10.5" r="7.5" fill="currentColor" fillOpacity="0.08" />
    <line x1="21" y1="21" x2="15.8" y2="15.8" strokeWidth="2.2" />
  </svg>
);

export const IconSearch = IconMagnifier;

/**
 * Flaticon-style Settings Gear Icon
 */
export const IconSettings: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-settings ${className}`}
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.12" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/**
 * Flaticon-style Bookmark Ribbon Icon
 */
export const IconBookmark: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    fillOpacity="0.16"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-bookmark ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

/**
 * Flaticon-style 5-Point Star Icon (Supports filled & outline)
 */
export interface IconStarProps extends IconProps {
  filled?: boolean;
}

export const IconStar: React.FC<IconStarProps> = ({ filled = false, size = 18, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-star ${filled ? 'filled' : 'outline'} ${className}`}
    aria-hidden="true"
    {...props}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/**
 * Flaticon-style Sparkles / Appearance Magic Icon
 */
export const IconSparkles: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    fillOpacity="0.2"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-sparkles ${className}`}
    aria-hidden="true"
    {...props}
  >
    {/* Large primary star */}
    <path d="M12 2L14.2 8.3L20.5 10.5L14.2 12.7L12 19L9.8 12.7L3.5 10.5L9.8 8.3L12 2Z" />
    {/* Small accent star */}
    <path d="M19 16L20 18.5L22.5 19.5L20 20.5L19 23L18 20.5L15.5 19.5L18 18.5L19 16Z" fill="currentColor" />
  </svg>
);

/**
 * Flaticon-style Table of Contents / Editorial Menu Icon
 */
export const IconMenuContents: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-menu-contents ${className}`}
    aria-hidden="true"
    {...props}
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1.5" fill="currentColor" />
    <circle cx="4" cy="12" r="1.5" fill="currentColor" />
    <circle cx="4" cy="18" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * Flaticon-style Warning Triangle Icon
 */
export const IconWarning: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    fillOpacity="0.12"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-warning ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <circle cx="12" cy="17" r="0.75" fill="currentColor" />
  </svg>
);

/**
 * Flaticon-style Checkmark Circle Icon
 */
export const IconCheck: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    fillOpacity="0.12"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-check ${className}`}
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11.5 14.5 16 9.5" strokeWidth="2" />
  </svg>
);

/**
 * Flaticon-style Edit Pencil Icon
 */
export const IconEdit: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-edit ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="currentColor" fillOpacity="0.12" />
  </svg>
);

/**
 * Flaticon-style Close / Dismiss Cross Icon
 */
export const IconClose: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-close ${className}`}
    aria-hidden="true"
    {...props}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/**
 * Flaticon-style Trash Can Icon
 */
export const IconTrash: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-trash ${className}`}
    aria-hidden="true"
    {...props}
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

/**
 * Flaticon-style Botanical / Leaf Fleur-de-lis Ornament
 */
export const IconBotanicalLeaf: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-botanical ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M12 2C6.5 2 2 6.5 2 12c0 5 3.5 9 8 9.8V16c-1.5-.5-2.5-1.8-2.5-3.5 0-2 1.5-3.5 3.5-3.5 1 0 2 .5 2.5 1.2.5-.7 1.5-1.2 2.5-1.2 2 0 3.5 1.5 3.5 3.5 0 1.7-1 3-2.5 3.5v5.8c4.5-.8 8-4.8 8-9.8 0-5.5-4.5-10-10-10z"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <path d="M12 6v16" />
  </svg>
);


/**
 * Fullscreen Expand & Minimize Icons
 */
export const IconFullscreen: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-fullscreen ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

export const IconMinimize: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flaticon-icon icon-minimize ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M10 10V4m0 6H4m6 0L3 3m10 7h6m-6 0V4m0 6l7-7" />
  </svg>
);
