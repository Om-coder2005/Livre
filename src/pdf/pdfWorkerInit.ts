import * as pdfjsLib from 'pdfjs-dist';

let initialized = false;

/**
 * Idempotently initializes the PDF.js web worker.
 */
export function initPdfWorker(): void {
  if (initialized) return;

  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    initialized = true;
  }
}
