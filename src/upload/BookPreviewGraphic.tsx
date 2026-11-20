import React from 'react';

interface BookPreviewGraphicProps {
  className?: string;
}

export const BookPreviewGraphic: React.FC<BookPreviewGraphicProps> = ({ className = '' }) => {
  return (
    <div className={`figma-book-preview ${className}`} aria-hidden="true">
      <div className="figma-book-spread">
        {/* Left Page (Muted Forest Green) */}
        <div className="figma-page figma-page-left">
          <div className="figma-page-header">
            <span className="figma-book-logo-tag">L I V R E</span>
          </div>
          <div className="figma-page-body-left">
            <p className="figma-book-quote">Every book begins somewhere.</p>
            <div className="figma-accent-rule" />
          </div>
          <div className="figma-page-footer">
            <span className="figma-page-num">01</span>
          </div>
        </div>

        {/* Central Spine Gutter & Crease */}
        <div className="figma-book-spine" />

        {/* Right Page (Warm Ivory) */}
        <div className="figma-page figma-page-right">
          <div className="figma-page-header">
            <span className="figma-page-label">YOUR NEXT READ</span>
          </div>
          <div className="figma-typesetting-lines">
            <div className="typeset-line line-1" />
            <div className="typeset-line line-2" />
            <div className="typeset-line line-3" />
            <div className="typeset-line line-4" />
            <div className="typeset-line line-5" />
          </div>
          <div className="figma-page-footer right-align">
            <span className="figma-page-num">02</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookPreviewGraphic;
