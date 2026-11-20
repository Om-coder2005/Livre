import { openDB, IDBPDatabase } from 'idb';
import { LivreBook, BookProgress, BookBookmark } from './types';

const DB_NAME = 'livre-db';
const DB_VERSION = 2;
const BOOK_STORE = 'books';
const PROGRESS_STORE = 'progress';
const BOOKMARK_STORE = 'bookmarks';

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

export async function initDB(): Promise<IDBPDatabase<any>> {
  if (dbPromise) return dbPromise;
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        const store = db.createObjectStore(BOOK_STORE, { keyPath: 'id' });
        store.createIndex('by-title', 'title');
      }
      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        db.createObjectStore(PROGRESS_STORE, { keyPath: 'bookId' });
      }
      if (!db.objectStoreNames.contains(BOOKMARK_STORE)) {
        const bmStore = db.createObjectStore(BOOKMARK_STORE, { keyPath: 'id' });
        bmStore.createIndex('by-bookId', 'bookId');
        bmStore.createIndex('by-bookId-page', ['bookId', 'pageNum']);
      }
    },
  });
  return dbPromise;
}

async function getDB(): Promise<IDBPDatabase<any>> {
  if (!dbPromise) await initDB();
  return dbPromise!;
}

/* ---------------- Book Operations ---------------- */

export async function getAllBooks(): Promise<LivreBook[]> {
  try {
    const db = await getDB();
    return await db.getAll(BOOK_STORE);
  } catch (err) {
    console.error('Failed to get books from IndexedDB:', err);
    return [];
  }
}

export async function addBook(book: LivreBook): Promise<void> {
  try {
    const db = await getDB();
    await db.put(BOOK_STORE, book);
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('Browser storage quota exceeded. Please remove existing books to import new ones.');
    }
    throw new Error('Failed to save book to storage: ' + (err?.message || 'Database error'));
  }
}

export async function updateBook(book: LivreBook): Promise<void> {
  try {
    const db = await getDB();
    await db.put(BOOK_STORE, { ...book, updatedAt: Date.now() });
  } catch (err: any) {
    console.error(`Failed to update book ${book.id}:`, err);
    throw new Error('Failed to update book details.');
  }
}

export async function getBook(id: string): Promise<LivreBook | undefined> {
  try {
    const db = await getDB();
    return await db.get(BOOK_STORE, id);
  } catch (err) {
    console.error(`Failed to get book ${id}:`, err);
    return undefined;
  }
}

export async function deleteBook(id: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction([BOOK_STORE, PROGRESS_STORE, BOOKMARK_STORE], 'readwrite');
    await tx.objectStore(BOOK_STORE).delete(id);
    await tx.objectStore(PROGRESS_STORE).delete(id);

    // Clean up all bookmarks for this book
    const bmStore = tx.objectStore(BOOKMARK_STORE);
    const index = bmStore.index('by-bookId');
    const bookmarks = await index.getAll(id);
    for (const bm of bookmarks) {
      await bmStore.delete(bm.id);
    }
    await tx.done;
  } catch (err) {
    console.error(`Failed to delete book ${id}:`, err);
    throw new Error('Failed to completely delete book records.');
  }
}

export async function purgeCorruptedBooks(): Promise<number> {
  try {
    const db = await getDB();
    const all: LivreBook[] = await db.getAll(BOOK_STORE);
    let removed = 0;
    for (const book of all) {
      if (!book.fileBlob || book.fileBlob.size === 0) {
        await db.delete(BOOK_STORE, book.id);
        await db.delete(PROGRESS_STORE, book.id).catch(() => {});
        removed++;
      }
    }
    return removed;
  } catch {
    return 0;
  }
}

/* ---------------- Progress Handling ---------------- */

export async function setProgress(
  bookId: string,
  progress: { lastPage: number; timestamp: number }
): Promise<void> {
  try {
    const db = await getDB();
    const record: BookProgress = {
      bookId,
      lastPage: progress.lastPage,
      timestamp: progress.timestamp,
    };
    await db.put(PROGRESS_STORE, record);
  } catch (err) {
    console.warn(`Failed to persist progress for book ${bookId}:`, err);
  }
}

export async function getProgress(
  bookId: string
): Promise<BookProgress | undefined> {
  try {
    const db = await getDB();
    return await db.get(PROGRESS_STORE, bookId);
  } catch (err) {
    console.warn(`Failed to get progress for book ${bookId}:`, err);
    return undefined;
  }
}

export async function getAllProgressMap(): Promise<Record<string, BookProgress>> {
  try {
    const db = await getDB();
    const all: BookProgress[] = await db.getAll(PROGRESS_STORE);
    const map: Record<string, BookProgress> = {};
    for (const p of all) {
      map[p.bookId] = p;
    }
    return map;
  } catch {
    return {};
  }
}

/* ---------------- Bookmark Operations ---------------- */

export async function getBookmarks(bookId: string): Promise<BookBookmark[]> {
  try {
    const db = await getDB();
    const tx = db.transaction(BOOKMARK_STORE, 'readonly');
    const index = tx.store.index('by-bookId');
    const results = await index.getAll(bookId);
    return results.sort((a, b) => a.pageNum - b.pageNum);
  } catch (err) {
    console.error(`Failed to get bookmarks for ${bookId}:`, err);
    return [];
  }
}

export async function addBookmark(bookmark: BookBookmark): Promise<void> {
  try {
    const db = await getDB();
    await db.put(BOOKMARK_STORE, bookmark);
  } catch (err) {
    console.error('Failed to add bookmark:', err);
    throw err;
  }
}

export async function deleteBookmark(bookmarkId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(BOOKMARK_STORE, bookmarkId);
  } catch (err) {
    console.error(`Failed to delete bookmark ${bookmarkId}:`, err);
  }
}

export async function deleteBookmarkByPage(bookId: string, pageNum: number): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(BOOKMARK_STORE, 'readwrite');
    const index = tx.store.index('by-bookId-page');
    const matchingBookmarks = await index.getAll(IDBKeyRange.only([bookId, pageNum]));
    for (const bm of matchingBookmarks) {
      await tx.store.delete(bm.id);
    }
    await tx.done;
  } catch (err) {
    console.error(`Failed to remove bookmark on page ${pageNum}:`, err);
  }
}
