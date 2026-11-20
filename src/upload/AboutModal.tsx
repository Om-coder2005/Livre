import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="about-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="about-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="about-header">
          <span className="about-eyebrow">A QUIETER WAY TO READ</span>
          <h2 className="about-title">About Livre</h2>
        </div>

        <div className="about-body">
          <p className="about-p">
            <strong>Livre</strong> is a personal digital reading room crafted for focus, tactile pleasure, and
            typographic calm. We transform digital PDF documents into authentic, bound physical volumes.
          </p>
          <div className="about-divider" />
          <ul className="about-features">
            <li>
              <strong>Tactile 18-Strip Curvature:</strong> Preserves the physical feeling of paper turning under your fingertips.
            </li>
            <li>
              <strong>100% Client-Side & Private:</strong> Your files never leave your computer. Parsing, typesetting, and rendering occur entirely in your local browser sandbox.
            </li>
            <li>
              <strong>Editorial Typography:</strong> Typeset in classical Newsreader and Instrument Serif, giving every manuscript the rhythm and breathing space it deserves.
            </li>
          </ul>
        </div>

        <div className="about-footer">
          <button type="button" className="about-close-btn" onClick={onClose}>
            Back to Reading Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
