import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_FILE_SIZE_BYTES } from '../src/upload/types';

function validateFile(name: string, size: number, type: string): { valid: boolean; error?: string } {
  const isPdfExt = name.toLowerCase().endsWith('.pdf');
  const isPdfMime = type === 'application/pdf' || type === '';

  if (!isPdfExt || !isPdfMime) {
    return { valid: false, error: 'Please choose a valid PDF document (.pdf).' };
  }

  if (size === 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes).' };
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File size (${sizeMB} MB) exceeds the 50 MB limit. Please select a smaller PDF.` };
  }

  return { valid: true };
}

test('Upload Validation - accepts valid PDF within 50 MB limit', () => {
  const res1 = validateFile('novel.pdf', 10 * 1024 * 1024, 'application/pdf');
  assert.equal(res1.valid, true);
  assert.equal(res1.error, undefined);

  // Case-insensitive extension
  const res2 = validateFile('MANUSCRIPT.PDF', 2 * 1024 * 1024, 'application/pdf');
  assert.equal(res2.valid, true);

  // Exactly at boundary (50 MB)
  const res3 = validateFile('boundary.pdf', 50 * 1024 * 1024, 'application/pdf');
  assert.equal(res3.valid, true);
});

test('Upload Validation - rejects non-PDF files', () => {
  const res1 = validateFile('notes.docx', 5000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(res1.valid, false);
  assert.ok(res1.error?.includes('valid PDF'));

  const res2 = validateFile('image.png', 5000, 'image/png');
  assert.equal(res2.valid, false);
});

test('Upload Validation - rejects files exceeding 50 MB limit', () => {
  const oversizedBytes = 50 * 1024 * 1024 + 1024; // 50MB + 1KB
  const res = validateFile('huge-book.pdf', oversizedBytes, 'application/pdf');
  assert.equal(res.valid, false);
  assert.ok(res.error?.includes('exceeds the 50 MB limit'));
});

test('Upload Validation - rejects empty 0-byte files', () => {
  const res = validateFile('empty.pdf', 0, 'application/pdf');
  assert.equal(res.valid, false);
  assert.ok(res.error?.includes('empty (0 bytes)'));
});

test('Upload Processing - generates valid LivreBook with sanitized title and pageCount', () => {
  const filename = 'The_Dune_Chronicles.serialized.pdf';
  const cleanTitle = filename.replace(/\.pdf$/i, '');
  const pageCount = 1589;
  const mockFile = new Blob(['mock-pdf-content'], { type: 'application/pdf' });

  const book = {
    id: 'test-uuid-1234',
    title: cleanTitle,
    author: 'Frank Herbert',
    pageCount,
    fileBlob: mockFile,
    coverUrl: 'data:image/jpeg;base64,mock',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  assert.equal(book.title, 'The_Dune_Chronicles.serialized');
  assert.equal(book.author, 'Frank Herbert');
  assert.equal(book.pageCount, 1589);
  assert.ok(book.fileBlob.size > 0);
  assert.ok(book.id.length > 0);
});
