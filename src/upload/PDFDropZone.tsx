import React, { useRef, useState } from 'react';
import { MAX_FILE_SIZE_BYTES } from './types';
import { validatePdfFile } from './pdfSecurity';
import { IconWarning, IconClose } from '../icons/Icons';

interface PDFDropZoneProps {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
  errorMessage?: string;
  onClearError?: () => void;
}

export const PDFDropZone: React.FC<PDFDropZoneProps> = ({
  onFileAccepted,
  disabled = false,
  errorMessage,
  onClearError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = errorMessage || localError;

  const validateAndAccept = async (file: File) => {
    if (disabled) return;
    setLocalError(null);
    if (onClearError) onClearError();

    const result = await validatePdfFile(file);
    if (!result.valid) {
      setLocalError(result.error || 'Please choose a valid PDF document.');
      return;
    }

    onFileAccepted(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndAccept(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndAccept(files[0]);
    }
  };

  const triggerBrowse = () => {
    if (disabled) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerBrowse();
    }
  };

  return (
    <div className="figma-dropzone-wrapper">
      <div
        className={`figma-dropzone ${isDragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''} ${
          displayError ? 'has-error' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerBrowse}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload PDF file"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          disabled={disabled}
          className="figma-file-input"
          tabIndex={-1}
        />

        {/* Circular Upload Icon Badge */}
        <div className="figma-upload-badge" aria-hidden="true">
          <svg
            className="figma-upload-icon-svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M12 12v9" />
            <path d="m8 16 4-4 4 4" />
          </svg>
        </div>

        {/* Headings and Descriptions */}
        <h3 className="figma-dropzone-heading">Place your PDF here</h3>
        <p className="figma-dropzone-sub">Drag & drop your manuscript, or browse files</p>

        {/* Primary Action Button */}
        <button
          type="button"
          className="figma-choose-btn"
          onClick={(e) => {
            e.stopPropagation();
            triggerBrowse();
          }}
          disabled={disabled}
        >
          CHOOSE A PDF
        </button>

        {/* Helper Note */}
        <span className="figma-dropzone-helper">PDF only · Up to 50 MB</span>
      </div>

      {/* Inline Error Alert */}
      {displayError && (
        <div className="figma-error-alert" role="alert">
          <span className="error-icon"><IconWarning size={16} /></span>
          <span className="error-text">{displayError}</span>
          {onClearError && (
            <button
              type="button"
              className="error-dismiss-btn"
              onClick={onClearError}
              aria-label="Dismiss error"
            >
              <IconClose size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PDFDropZone;
