import React, { useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { LivreBook } from '../persistence/types';
import { IconHourglass, IconUploadTray, IconDocument, IconWarning, IconCheck } from '../icons/Icons';
import { initPdfWorker } from '../pdf/pdfWorkerInit';
import { validatePdfFile, sanitizeMetadataString } from '../upload/pdfSecurity';

initPdfWorker();

type UploadFormProps = {
  onUpload: (book: LivreBook) => Promise<void>;
};

const UploadForm: React.FC<UploadFormProps> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    const validation = await validatePdfFile(file);
    if (!validation.valid) {
      setStatus(validation.error || 'Please select a valid PDF file.');
      setIsError(true);
      return;
    }

    setUploading(true);
    setIsError(false);
    setStatus('Analyzing and importing document…');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileBlob = file;

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
          throw new Error('This file appears to be damaged or is not a valid PDF document.');
        }
        throw docErr;
      }

      const pageCount = pdf.numPages;
      if (pageCount === 0) {
        pdf.destroy();
        throw new Error('This document contains no readable pages.');
      }

      let title = file.name.replace(/\.pdf$/i, '');
      let author: string | undefined = undefined;

      try {
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
        // Fallback to filename title if metadata is unreadable
      }

      let coverUrl: string | undefined = undefined;
      try {
        const page1 = await pdf.getPage(1);
        const unscaledViewport = page1.getViewport({ scale: 1.0 });
        const targetWidth = 200;
        const scale = targetWidth / unscaledViewport.width;
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
        console.warn('Could not generate cover thumbnail:', coverErr);
      }

      pdf.destroy();

      const book: LivreBook = {
        id: crypto.randomUUID(),
        title,
        author,
        pageCount,
        fileBlob,
        coverUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await onUpload(book);
      setStatus(`"${title}" added to library (${pageCount} pages).`);
      setIsError(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('PDF Import error:', err);
      setIsError(true);
      setStatus(err.message || 'Failed to process and import PDF document.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFile(files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  return (
    <div
      className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label className="upload-label">
        <div className="upload-content">
          <span className="upload-icon">
            {uploading ? <IconHourglass size={28} /> : isDragging ? <IconUploadTray size={28} /> : <IconDocument size={28} />}
          </span>
          <div className="upload-text-group">
            <span className="upload-primary-text">
              {uploading ? 'Processing document…' : isDragging ? 'Drop your PDF here' : 'Add book to your library'}
            </span>
            <span className="upload-subtext">
              {uploading
                ? 'Extracting covers, chapters, and pages'
                : 'Drag and drop a PDF file here, or click to browse'}
            </span>
          </div>
          <span className="upload-browse-btn">
            {uploading ? 'Reading…' : '+ Choose PDF'}
          </span>
        </div>
        <input
          type="file"
          accept="application/pdf,.pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={uploading}
          className="upload-input"
        />
      </label>

      {status && (
        <div className={`upload-status-banner ${isError ? 'error' : 'success'}`}>
          <span className="status-indicator">{isError ? <IconWarning size={16} /> : <IconCheck size={16} />}</span>
          <span>{status}</span>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
