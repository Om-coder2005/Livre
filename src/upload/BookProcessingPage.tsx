import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { addBook } from '../persistence/indexedDB';
import { LivreBook } from '../persistence/types';
import { ProcessingBookAnimation } from './ProcessingBookAnimation';
import { ProcessingStatus } from './types';
import { initPdfWorker } from '../pdf/pdfWorkerInit';
import { validatePdfFile, sanitizeMetadataString } from './pdfSecurity';

initPdfWorker();

interface BookProcessingPageProps {
  file: File;
  onCancel: () => void;
  onSuccess?: (book: LivreBook) => void;
}

export const BookProcessingPage: React.FC<BookProcessingPageProps> = ({
  file,
  onCancel,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'validating',
    message: 'Validating your manuscript…',
    progressPercent: 20,
  });
  const hasStartedRef = useRef(false);
  const isCancelledRef = useRef(false);

  const handleCancel = () => {
    isCancelledRef.current = true;
    onCancel();
  };

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const processBook = async () => {
      try {
        // Stage 0: Header & Size Security Validation
        const validation = await validatePdfFile(file);
        if (!validation.valid) {
          throw new Error(validation.error || 'The uploaded file is not a valid PDF document.');
        }

        // Stage 1 & 2: Load PDF directly from memory buffer
        setStatus({
          stage: 'opening',
          message: 'Opening your pages…',
          progressPercent: 40,
        });

        const arrayBuffer = await file.arrayBuffer();
        if (isCancelledRef.current) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          isEvalSupported: false,
        });

        let pdf: pdfjsLib.PDFDocumentProxy;

        try {
          pdf = await loadingTask.promise;
        } catch (docErr: any) {
          if (docErr?.name === 'PasswordException') {
            throw new Error('This PDF is password-protected. Livre currently supports unlocked documents.');
          }
          if (docErr?.name === 'InvalidPDFException') {
            throw new Error('This document appears to be damaged or is not a valid PDF.');
          }
          throw docErr;
        }

        if (isCancelledRef.current) {
          pdf.destroy();
          return;
        }

        const pageCount = pdf.numPages;
        if (pageCount === 0) {
          pdf.destroy();
          throw new Error('This document contains no readable pages.');
        }

        // Stage 3: Extract metadata & render cover thumbnail
        setStatus({
          stage: 'extracting',
          message: 'Gathering book details & cover…',
          progressPercent: 70,
        });

        let title = file.name.replace(/\.pdf$/i, '');
        let author: string | undefined = undefined;

        try {
          // Fast metadata lookup with 600ms timeout guard
          const metaPromise = pdf.getMetadata();
          const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 600));
          const meta: any = await Promise.race([metaPromise, timeoutPromise]);
          if (meta?.info) {
            const info = meta.info as Record<string, any>;
            const cleanTitle = sanitizeMetadataString(info?.Title, 250);
            if (cleanTitle) {
              title = cleanTitle;
            }
            author = sanitizeMetadataString(info?.Author, 150);
          }
        } catch {
          // Fallback to sanitized filename
        }

        // Generate fast Page 1 Cover Thumbnail
        let coverUrl: string | undefined = undefined;
        try {
          const page1 = await pdf.getPage(1);
          const unscaled = page1.getViewport({ scale: 1.0 });
          const targetWidth = 200;
          const scale = targetWidth / unscaled.width;
          const viewport = page1.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page1.render({ canvasContext: ctx, viewport }).promise;
            coverUrl = canvas.toDataURL('image/jpeg', 0.82);
          }
          canvas.width = 0;
          canvas.height = 0;
        } catch (coverErr) {
          console.warn('Cover thumbnail generation skipped:', coverErr);
        }

        pdf.destroy();
        if (isCancelledRef.current) return;

        // Stage 4: Persist in IndexedDB
        setStatus({
          stage: 'binding',
          message: 'Binding volume into your library…',
          progressPercent: 92,
        });

        const newBookId =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);

        const newBook: LivreBook = {
          id: newBookId,
          title,
          author,
          pageCount,
          fileBlob: file,
          coverUrl,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await addBook(newBook);
        if (isCancelledRef.current) return;

        // Stage 5: Complete & navigate swiftly to the 3D book reader
        setStatus({
          stage: 'complete',
          message: 'Your reading room is ready.',
          progressPercent: 100,
        });

        if (onSuccess) {
          onSuccess(newBook);
        }

        setTimeout(() => {
          if (!isCancelledRef.current) {
            navigate(`/reader/${newBook.id}`);
          }
        }, 120);
      } catch (err: any) {
        if (isCancelledRef.current) return;
        console.error('Book processing error:', err);
        setStatus({
          stage: 'error',
          message: 'Failed to process document',
          progressPercent: 0,
          error: err.message || 'An unexpected error occurred while preparing your document.',
        });
      }
    };

    processBook();
  }, [file, navigate, onSuccess]);

  return (
    <div className="processing-page">
      {/* Decorative Circles from Figma Frame 02 */}
      <div className="decor-circle decor-sand-tl" aria-hidden="true" />
      <div className="decor-circle decor-sage-br" aria-hidden="true" />
      <div className="decor-terracotta-ring" aria-hidden="true">
        <div className="decor-terracotta-dot" />
      </div>
      <div className="decor-green-ring" aria-hidden="true" />

      {/* Top Header */}
      <header className="processing-header">
        <button
          type="button"
          className="processing-wordmark-btn"
          onClick={handleCancel}
          title="Return to upload"
        >
          Livre
        </button>
      </header>

      {/* Center Editorial Processing Content */}
      <main className="processing-main-container">
        <span className="processing-eyebrow">GIVE US A MOMENT</span>

        <h1 className="processing-headline">
          <span className="headline-green">Turning pages</span>
          <span className="headline-terracotta">into a place to read.</span>
        </h1>

        {/* Book Preparation Illustration */}
        <ProcessingBookAnimation />

        {/* Dynamic Status / Error Presentation */}
        {status.stage === 'error' ? (
          <div className="processing-error-card" role="alert">
            <h3 className="error-card-title">Unable to Open Manuscript</h3>
            <p className="error-card-desc">{status.error}</p>
            <div className="error-card-actions">
              <button type="button" className="error-return-btn" onClick={handleCancel}>
                ← Choose Another PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="processing-info-group">
            <h2 className="processing-subheading">Preparing your book</h2>
            <p className="processing-desc">
              We’re arranging the pages and setting up your reading space.
            </p>

            {/* Horizontal Progress Track */}
            <div className="processing-progress-track" role="progressbar" aria-valuenow={status.progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="processing-progress-fill"
                style={{ width: `${status.progressPercent}%` }}
              />
            </div>

            {/* Live Step Label */}
            <span className="processing-stage-text">{status.message}</span>

            {/* Helper Notice */}
            <span className="processing-keep-open">PLEASE KEEP THIS PAGE OPEN</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default BookProcessingPage;
