import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookPreviewGraphic } from './BookPreviewGraphic';
import { PDFDropZone } from './PDFDropZone';
import { BookProcessingPage } from './BookProcessingPage';
import { AboutModal } from './AboutModal';
import { IconBooks } from '../icons/Icons';

export const UploadLandingPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // If a file is currently selected, display the full-screen processing experience (Screen 2)
  if (selectedFile) {
    return (
      <BookProcessingPage
        file={selectedFile}
        onCancel={() => setSelectedFile(null)}
      />
    );
  }

  return (
    <div className="upload-landing-page">
      {/* Decorative Background Circles from Figma Frame 01 */}
      <div className="landing-decor-circle decor-sand-left" aria-hidden="true" />
      <div className="landing-decor-circle decor-sage-right" aria-hidden="true" />
      <div className="landing-decor-ring decor-terracotta-top" aria-hidden="true" />

      {/* Top Editorial Navigation */}
      <header className="landing-nav">
        <div className="landing-nav-left">
          <Link to="/" className="landing-wordmark">
            Livre
          </Link>
          <span className="nav-separator" aria-hidden="true">·</span>
          <span className="nav-tagline">A QUIETER WAY TO READ</span>
        </div>

        <nav className="landing-nav-right">
          <Link
            to="/library"
            className="nav-link nav-library-link"
            title="Your Library"
            aria-label="Your Library"
          >
            <span className="nav-library-text">YOUR LIBRARY</span>
            <span className="nav-library-icon" aria-hidden="true">
              <IconBooks size={18} />
            </span>
          </Link>
          <button
            type="button"
            className="nav-link nav-btn-link"
            onClick={() => setIsAboutOpen(true)}
          >
            ABOUT
          </button>
          <Link
            to="/library"
            className="profile-pill"
            title="Your Library"
            aria-label="Your Library"
          >
            <span className="profile-initials">LV</span>
          </Link>
        </nav>
      </header>

      {/* Main Two-Column Asymmetrical Composition */}
      <main className="landing-main-grid">
        {/* Left Column — Editorial Introduction */}
        <section className="landing-intro-column">
          <div className="intro-eyebrow">THE READING ROOM / NO. 001</div>

          <h1 className="intro-headline">
            <span className="headline-green">A whole library</span>
            <span className="headline-terracotta">in a single page.</span>
          </h1>

          <div className="intro-terracotta-rule" aria-hidden="true" />

          <h2 className="intro-subheading">Bring your PDFs to life.</h2>

          <p className="intro-description">
            Drop in a document. We’ll give it the space, rhythm, and feel of a book — so you can settle in and read.
          </p>

          <ol className="intro-benefits-list">
            <li>
              <span className="benefit-num">01</span>
              <span className="benefit-dash">—</span>
              <span className="benefit-text">Your pages, beautifully typeset</span>
            </li>
            <li>
              <span className="benefit-num">02</span>
              <span className="benefit-dash">—</span>
              <span className="benefit-text">A focused, distraction-free reader</span>
            </li>
            <li>
              <span className="benefit-num">03</span>
              <span className="benefit-dash">—</span>
              <span className="benefit-text">Every manuscript, in one place</span>
            </li>
          </ol>
        </section>

        {/* Right Column — Bookbinding Desk Panel */}
        <section className="landing-desk-column">
          <div className="desk-panel">
            {/* Panel Top Meta */}
            <div className="desk-panel-header">
              <span className="desk-panel-title">A NEW CHAPTER BEGINS</span>
              <span className="desk-panel-index">01 — 03</span>
            </div>

            {/* Open Book Preview & Caption */}
            <div className="desk-book-preview-wrap">
              <BookPreviewGraphic />
              <div className="desk-book-caption">YOUR MANUSCRIPT, REBOUND.</div>
            </div>

            {/* PDF Drop Zone */}
            <PDFDropZone
              onFileAccepted={(file) => setSelectedFile(file)}
            />

            {/* Panel Local Processing Note */}
            <p className="desk-security-note">
              Your documents stay yours. Files are processed locally in your browser.
            </p>
          </div>
        </section>
      </main>

      {/* Bottom Footer */}
      <footer className="landing-footer">
        <div className="footer-divider" />
        <div className="footer-content">
          <span className="footer-left-caps">A LITTLE MORE ROOM FOR READING.</span>
          <span className="footer-right-copy">LIVRE © 2026</span>
        </div>
      </footer>

      {/* About Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
};

export default UploadLandingPage;
