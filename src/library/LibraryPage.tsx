import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
  initDB,
  getAllBooks,
  addBook,
  updateBook,
  deleteBook,
  purgeCorruptedBooks,
  getAllProgressMap,
} from '../persistence/indexedDB';
import { LivreBook, BookProgress } from '../persistence/types';
import UploadForm from './UploadForm';
import { BookCard } from './BookCard';
import { IconBooks, IconClose } from '../icons/Icons';
import { initPdfWorker } from '../pdf/pdfWorkerInit';

initPdfWorker();

const LibraryPage: React.FC = () => {
  const [books, setBooks] = useState<LivreBook[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, BookProgress>>({});
  const [dbReady, setDbReady] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [bookToDelete, setBookToDelete] = useState<LivreBook | null>(null);
  const [editingBook, setEditingBook] = useState<LivreBook | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const failedCoversRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    initDB().then(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    purgeCorruptedBooks().then((removed) => {
      if (removed > 0) {
        console.log(`Purged ${removed} corrupted book(s) from library.`);
      }
      loadBooksAndProgress();
    });
  }, [dbReady]);

  const loadBooksAndProgress = async () => {
    const all = await getAllBooks();
    const progress = await getAllProgressMap();
    setBooks(all);
    setProgressMap(progress);
  };

  // Lazily generate covers for books that don't have one yet
  useEffect(() => {
    if (books.length === 0) return;
    const booksNeedingCover = books.filter((b) => !b.coverUrl && !failedCoversRef.current.has(b.id));
    if (booksNeedingCover.length === 0) return;

    let isMounted = true;
    (async () => {
      for (const b of booksNeedingCover) {
        if (!isMounted) break;
        try {
          const buffer = await b.fileBlob.arrayBuffer();
          const copy = new Uint8Array(buffer).slice();
          const loadingTask = pdfjsLib.getDocument({ data: copy });
          const pdf = await loadingTask.promise;
          const page1 = await pdf.getPage(1);
          const unscaled = page1.getViewport({ scale: 1.0 });
          const scale = 240 / unscaled.width;
          const viewport = page1.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page1.render({ canvasContext: ctx, viewport }).promise;
            const coverUrl = canvas.toDataURL('image/jpeg', 0.85);
            b.coverUrl = coverUrl;
            await updateBook(b);
            if (isMounted) {
              setBooks((prev) =>
                prev.map((item) => (item.id === b.id ? { ...item, coverUrl } : item))
              );
            }
          }
          pdf.destroy();
        } catch (err) {
          failedCoversRef.current.add(b.id);
          console.warn(`Could not generate thumbnail for "${b.title}":`, err);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [books]);

  const handleUpload = async (book: LivreBook) => {
    await addBook(book);
    await loadBooksAndProgress();
  };

  const requestDelete = (e: React.MouseEvent, book: LivreBook) => {
    e.preventDefault();
    e.stopPropagation();
    setBookToDelete(book);
  };

  const confirmDelete = async () => {
    if (!bookToDelete) return;
    try {
      await deleteBook(bookToDelete.id);
      setBookToDelete(null);
      await loadBooksAndProgress();
    } catch (err) {
      console.error('Failed to delete book:', err);
    }
  };

  const cancelDelete = () => {
    setBookToDelete(null);
  };

  const startEdit = (e: React.MouseEvent, book: LivreBook) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingBook(book);
    setEditTitle(book.title);
    setEditAuthor(book.author || '');
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) return;

    const updated: LivreBook = {
      ...editingBook,
      title: trimmedTitle,
      author: editAuthor.trim() || undefined,
      updatedAt: Date.now(),
    };

    try {
      await updateBook(updated);
      setEditingBook(null);
      await loadBooksAndProgress();
    } catch (err) {
      console.error('Failed to update book metadata:', err);
    }
  };

  const cancelEdit = () => {
    setEditingBook(null);
  };

  // Filter books by title or author
  const filteredBooks = books.filter((b) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const matchTitle = b.title.toLowerCase().includes(q);
    const matchAuthor = b.author?.toLowerCase().includes(q) ?? false;
    return matchTitle || matchAuthor;
  });

  return (
    <div className="library-page">
      <div className="library-top-bar">
        <Link to="/" className="library-back-link" title="Return to upload landing page">
          ← The Reading Room
        </Link>
        <span className="library-volume-count">
          {books.length} {books.length === 1 ? 'Volume' : 'Volumes'} in Bookshelf
        </span>
      </div>

      <header className="library-header">
        <h1 className="library-title">Your Library</h1>
        <p className="library-subtitle">Personal Bound Volumes & Manuscripts</p>
      </header>

      <UploadForm onUpload={handleUpload} />

      {/* Filter Bar when 3+ books exist */}
      {books.length > 2 && (
        <div className="library-filter-wrap">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search your library by title or author…"
            className="library-filter-input"
            aria-label="Filter books"
          />
          {filterQuery && (
            <button
              className="library-filter-clear"
              onClick={() => setFilterQuery('')}
              title="Clear search"
            >
              <IconClose size={12} />
            </button>
          )}
        </div>
      )}

      <section className="bookshelf">
        {books.length === 0 ? (
          <div className="empty-shelf">
            <span className="empty-shelf-icon"><IconBooks size={42} /></span>
            <p className="empty-shelf-title">Your bookshelf is quiet.</p>
            <p className="empty-shelf-sub">
              Upload a PDF above to experience it as a tactile, bound physical volume.
            </p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="empty-shelf">
            <p>No volumes match "{filterQuery}".</p>
          </div>
        ) : (
          <div className="book-grid dashboard-book-grid">
            {filteredBooks.map((book, idx) => {
              const activeSelectedId = selectedBookId || (filteredBooks.length > 0 ? filteredBooks[0].id : null);
              return (
                <BookCard
                  key={book.id}
                  book={book}
                  progress={progressMap[book.id]}
                  themeIndex={idx}
                  isSelected={book.id === activeSelectedId}
                  onSelect={() => setSelectedBookId(book.id)}
                  onEdit={startEdit}
                  onDelete={requestDelete}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Edit Book Details Modal */}
      {editingBook && (
        <div className="modal-backdrop" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit Volume Details</h3>
            <form onSubmit={saveEdit} className="edit-form">
              <div className="form-group">
                <label className="form-label" htmlFor="edit-title">Title</label>
                <input
                  id="edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="modal-input"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-author">Author</label>
                <input
                  id="edit-author"
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  placeholder="Author or creator name"
                  className="modal-input"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="modal-btn cancel" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn confirm-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Safe Deletion */}
      {bookToDelete && (
        <div className="modal-backdrop" onClick={cancelDelete}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Remove Volume</h3>
            <p className="modal-desc">
              Are you sure you want to remove <strong>"{bookToDelete.title}"</strong> from your library?
              All saved reading progress and bookmarks will be deleted.
            </p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="modal-btn confirm" onClick={confirmDelete}>
                Remove Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
