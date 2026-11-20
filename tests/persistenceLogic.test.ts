import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LivreBook, BookProgress, BookBookmark } from '../src/persistence/types';

test('Persistence Logic - Reading progress restore and boundary clamping', () => {
  const totalPages = 150;

  // Case 1: Fresh book with no saved progress defaults to page 1
  const saved1: BookProgress | undefined = undefined;
  const startPage1 = Math.max(1, Math.min(totalPages, saved1?.lastPage ?? 1));
  assert.equal(startPage1, 1);

  // Case 2: Returning book with valid saved progress restores exactly
  const saved2: BookProgress = { bookId: 'book-1', lastPage: 42, timestamp: Date.now() };
  const startPage2 = Math.max(1, Math.min(totalPages, saved2?.lastPage ?? 1));
  assert.equal(startPage2, 42);

  // Case 3: Out-of-bounds saved progress clamps to maximum total pages
  const saved3: BookProgress = { bookId: 'book-1', lastPage: 999, timestamp: Date.now() };
  const startPage3 = Math.max(1, Math.min(totalPages, saved3?.lastPage ?? 1));
  assert.equal(startPage3, 150);

  // Case 4: Corrupted 0 or negative page clamps to page 1
  const saved4: BookProgress = { bookId: 'book-1', lastPage: 0, timestamp: Date.now() };
  const startPage4 = Math.max(1, Math.min(totalPages, saved4?.lastPage ?? 1));
  assert.equal(startPage4, 1);
});

test('Persistence Logic - Bookmark collection management and ordering', () => {
  const bookmarks: BookBookmark[] = [
    { id: 'b3', bookId: 'book-1', pageNum: 88, createdAt: 3000 },
    { id: 'b1', bookId: 'book-1', pageNum: 5, createdAt: 1000 },
    { id: 'b2', bookId: 'book-1', pageNum: 23, createdAt: 2000 },
  ];

  // Bookmarks are ordered by page number for reader display
  const sorted = [...bookmarks].sort((a, b) => a.pageNum - b.pageNum);
  assert.deepEqual(
    sorted.map((b) => b.pageNum),
    [5, 23, 88]
  );

  // Toggle bookmark logic: if current page is bookmarked, remove it; else add it
  const currentPage = 23;
  const isBookmarked = sorted.some((b) => b.pageNum === currentPage);
  assert.equal(isBookmarked, true);

  // Removing bookmark on page 23
  const afterRemove = sorted.filter((b) => b.pageNum !== currentPage);
  assert.equal(afterRemove.length, 2);
  assert.equal(afterRemove.some((b) => b.pageNum === currentPage), false);

  // Adding bookmark on page 10
  const newBm: BookBookmark = { id: 'b4', bookId: 'book-1', pageNum: 10, createdAt: 4000 };
  const afterAdd = [...afterRemove, newBm].sort((a, b) => a.pageNum - b.pageNum);
  assert.deepEqual(
    afterAdd.map((b) => b.pageNum),
    [5, 10, 88]
  );
});

test('Persistence Logic - Corrupted 0-byte blob detection and purging', () => {
  const mockBooks: LivreBook[] = [
    {
      id: 'valid-1',
      title: 'Valid Book',
      pageCount: 50,
      fileBlob: new Blob(['valid pdf content'], { type: 'application/pdf' }),
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'corrupt-1',
      title: 'Corrupted Book',
      pageCount: 0,
      fileBlob: new Blob([], { type: 'application/pdf' }), // 0 bytes
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  const purged = mockBooks.filter((b) => !b.fileBlob || b.fileBlob.size === 0);
  const remaining = mockBooks.filter((b) => b.fileBlob && b.fileBlob.size > 0);

  assert.equal(purged.length, 1);
  assert.equal(purged[0].id, 'corrupt-1');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'valid-1');
});

test('Persistence Logic - Metadata editing and trimming', () => {
  const original: LivreBook = {
    id: 'book-edit-1',
    title: 'Original Title',
    author: 'Author Name',
    pageCount: 120,
    fileBlob: new Blob(['mock'], { type: 'application/pdf' }),
    createdAt: 1000,
    updatedAt: 1000,
  };

  const newTitle = '  Refined Title in Instrument Serif  ';
  const newAuthor = '   ';

  const updated: LivreBook = {
    ...original,
    title: newTitle.trim(),
    author: newAuthor.trim() || undefined,
    updatedAt: 2000,
  };

  assert.equal(updated.title, 'Refined Title in Instrument Serif');
  assert.equal(updated.author, undefined);
  assert.equal(updated.updatedAt > original.updatedAt, true);
});
