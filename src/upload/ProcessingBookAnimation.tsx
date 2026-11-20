import React from 'react';

interface ProcessingBookAnimationProps {
  className?: string;
}

export const ProcessingBookAnimation: React.FC<ProcessingBookAnimationProps> = ({ className = '' }) => {
  return (
    <div className={`processing-book-stage ${className}`} aria-label="Book preparation illustration">
      <div className="processing-book-frame">
        {/* Left Stationary Page (Deep Muted Green) */}
        <div className="proc-page proc-page-left">
          <div className="proc-page-header">
            <span className="proc-book-tag">L I V R E</span>
          </div>
          <div className="proc-page-content">
            <p className="proc-book-quote">Every book begins somewhere.</p>
            <div className="proc-accent-line" />
          </div>
          <div className="proc-page-footer">
            <span className="proc-page-num">01</span>
          </div>
        </div>

        {/* Central Spine */}
        <div className="proc-book-spine" />

        {/* Gently Turning Middle Leaf for Tactile Page Turn Motion */}
        <div className="proc-leaf-wrapper">
          <div className="proc-leaf">
            <div className="proc-leaf-face proc-leaf-front">
              <span className="proc-leaf-indicator">· · ·</span>
            </div>
            <div className="proc-leaf-face proc-leaf-back">
              <span className="proc-leaf-indicator">· · ·</span>
            </div>
          </div>
        </div>

        {/* Right Stationary Page (Warm Ivory with Typesetting Lines) */}
        <div className="proc-page proc-page-right">
          <div className="proc-page-header">
            <span className="proc-page-label">YOUR NEXT READ</span>
          </div>
          <div className="proc-typesetting-block">
            <div className="proc-line line-1" />
            <div className="proc-line line-2" />
            <div className="proc-line line-3" />
            <div className="proc-line line-4" />
            <div className="proc-line line-5" />
          </div>
          <div className="proc-page-footer right-align">
            <span className="proc-page-num">02</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingBookAnimation;
