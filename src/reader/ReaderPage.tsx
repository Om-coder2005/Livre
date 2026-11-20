import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
  getBook,
  setProgress,
  getProgress,
  initDB,
  getBookmarks,
  addBookmark,
  deleteBookmark,
  deleteBookmarkByPage,
} from '../persistence/indexedDB';
import { LivreBook, BookBookmark } from '../persistence/types';
import { MengToBookRenderer } from './MengToBookRenderer';
import { ReadingSidebar, SidebarTab } from './ReadingSidebar';
import { extractTableOfContents, TocItem, findActiveTocItem } from './tocService';
import { DocumentSearchService, SearchResult, SearchMatch } from './searchService';
import {
  IconMenuContents,
  IconStar,
  IconSparkles,
  IconDocument,
  IconScroll,
  IconOpenBook,
  IconMagnifier,
  IconSearch,
  IconFullscreen,
  IconMinimize,
  IconSettings,
  IconBotanicalLeaf,
} from '../icons/Icons';
import 'pdfjs-dist/web/pdf_viewer.css';
import '../styles/reader.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/* ------------------------------------------------------------------ */
/*  Simple LRU page cache for Flat Viewer mode                        */
/* ------------------------------------------------------------------ */
class PageCache {
  private maxPages: number;
  private map = new Map<number, HTMLCanvasElement>();

  constructor(maxPages: number) {
    this.maxPages = maxPages;
  }

  get(pageNum: number): HTMLCanvasElement | undefined {
    const canvas = this.map.get(pageNum);
    if (canvas) {
      this.map.delete(pageNum);
      this.map.set(pageNum, canvas);
    }
    return canvas;
  }

  set(pageNum: number, canvas: HTMLCanvasElement) {
    if (this.map.has(pageNum)) this.map.delete(pageNum);
    this.map.set(pageNum, canvas);
    if (this.map.size > this.maxPages) {
      const oldestKey = this.map.keys().next().value!;
      const oldCanvas = this.map.get(oldestKey);
      if (oldCanvas) {
        oldCanvas.width = 0;
        oldCanvas.height = 0;
      }
      this.map.delete(oldestKey);
    }
  }

  clear() {
    this.map.forEach((c) => {
      c.width = 0;
      c.height = 0;
    });
    this.map.clear();
  }
}

/* ------------------------------------------------------------------ */
/*  ReaderPage Component                                               */
/* ------------------------------------------------------------------ */
const ReaderPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  // Document & Book State
  const [book, setBook] = useState<LivreBook | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scrubberValue, setScrubberValue] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [loupeOn, setLoupeOn] = useState(true);
  const [viewMode, setViewMode] = useState<'book' | 'flat'>('book');
  // Paper Treatment Mode: 'faithful' (Mode A - default) vs 'printed' (Mode B)
  const [paperMode, setPaperMode] = useState<'faithful' | 'printed'>(() => {
    try {
      const saved = localStorage.getItem('livre_paper_mode');
      if (saved === 'printed' || saved === 'faithful') return saved;
    } catch {}
    return 'faithful';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Sidebar & Reading Tools State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('contents');
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookBookmark[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Popover State (Reading Appearance & Bookplate Info)
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<PageCache>(new PageCache(5));
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const textLayerRef = useRef<pdfjsLib.TextLayer | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const searchServiceRef = useRef<DocumentSearchService | null>(null);
  const progressDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrubberDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPageRef = useRef<number>(1);

  useEffect(() => {
    pdfDocRef.current = pdfDoc;
  }, [pdfDoc]);

  /* ---- Load Book & Initialize Services ---- */
  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;

    const load = async () => {
      try {
        await initDB();
        const b = await getBook(bookId);
        if (!b) throw new Error('Book not found in library.');
        if (!b.fileBlob || b.fileBlob.size === 0) {
          throw new Error("This book's PDF data is missing or corrupted. Please delete it from the library and re-upload.");
        }
        if (cancelled) return;
        setBook(b);

        const arrayBuffer = await b.fileBlob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          isEvalSupported: false,
        });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          pdf.destroy();
          return;
        }

        setPdfDoc(pdf);
        setPageCount(pdf.numPages);
        searchServiceRef.current = new DocumentSearchService(pdf);

        // Load TOC outline
        extractTableOfContents(pdf).then((items) => {
          if (!cancelled) setTocItems(items);
        });

        // Load Bookmarks
        getBookmarks(bookId).then((bms) => {
          if (!cancelled) setBookmarks(bms);
        });

        // Restore reading progress
        const saved = await getProgress(bookId);
        const startPage = saved?.lastPage ?? 1;
        setCurrentPage(startPage);
        setPageInput(String(startPage));
        setScrubberValue(startPage);
        lastSavedPageRef.current = startPage;
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          console.error(e);
          setError(e.message || 'Failed to load PDF document.');
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      if (progressDebounceTimerRef.current) {
        clearTimeout(progressDebounceTimerRef.current);
      }
      if (scrubberDebounceTimerRef.current) {
        clearTimeout(scrubberDebounceTimerRef.current);
      }
      if (bookId && lastSavedPageRef.current) {
        setProgress(bookId, { lastPage: lastSavedPageRef.current, timestamp: Date.now() });
      }

      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      textLayerRef.current?.cancel();
      textLayerRef.current = null;
      cacheRef.current.clear();
      searchServiceRef.current?.clear();
      pdfDocRef.current?.destroy();
    };
  }, [bookId]);

  /* ---- Sync Scrubber & Debounced Reading Progress ---- */
  useEffect(() => {
    if (!bookId || !currentPage || !pdfDoc) return;

    lastSavedPageRef.current = currentPage;
    setPageInput(String(currentPage));
    setScrubberValue(currentPage);

    if (progressDebounceTimerRef.current) {
      clearTimeout(progressDebounceTimerRef.current);
    }

    progressDebounceTimerRef.current = setTimeout(() => {
      setProgress(bookId, { lastPage: currentPage, timestamp: Date.now() });
    }, 400);
  }, [bookId, currentPage, pdfDoc]);

  /* ---- Flat View Page Render ---- */
  const renderFlatPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !containerRef.current || viewMode !== 'flat') return;

      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      textLayerRef.current?.cancel();
      textLayerRef.current = null;

      const container = containerRef.current;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });

        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = `page-wrapper ${paperMode === 'printed' ? 'paper-printed' : 'paper-faithful'}`;
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
        wrapper.style.backgroundColor = paperMode === 'printed' ? '#F5EEDF' : '#FFFFFF';
        wrapper.style.setProperty('--scale-factor', `${viewport.scale}`);
        container.appendChild(wrapper);

        let canvas: HTMLCanvasElement;
        const cached = cacheRef.current.get(pageNum);

        if (cached && cached.width === Math.floor(viewport.width) && cached.height === Math.floor(viewport.height)) {
          canvas = cached;
        } else {
          canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          const renderTask = page.render({ canvasContext: context, viewport });
          renderTaskRef.current = renderTask;

          try {
            await renderTask.promise;
          } catch (err: any) {
            if (err?.name === 'RenderingCancelledException') return;
            throw err;
          }

          cacheRef.current.set(pageNum, canvas);
        }

        canvas.className = `page-canvas ${paperMode === 'printed' ? 'canvas-printed' : 'canvas-faithful'}`;
        canvas.style.display = 'block';
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        if (paperMode === 'printed') {
          canvas.style.mixBlendMode = 'multiply';
        } else {
          canvas.style.mixBlendMode = 'normal';
        }
        wrapper.appendChild(canvas);

        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        textLayerDiv.style.setProperty('--scale-factor', `${viewport.scale}`);
        wrapper.appendChild(textLayerDiv);

        const textContent = await page.getTextContent();
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
        });
        textLayerRef.current = textLayer;

        try {
          await textLayer.render();
        } catch (err: any) {
          if (err?.name === 'RenderingCancelledException') return;
          console.warn('Text layer render error:', err);
        }
      } catch (e: any) {
        if (e?.name === 'RenderingCancelledException') return;
        console.error('Flat page render error:', e);
      }
    },
    [pdfDoc, zoom, viewMode, paperMode]
  );

  const handlePaperModeChange = (mode: 'faithful' | 'printed') => {
    setPaperMode(mode);
    try {
      localStorage.setItem('livre_paper_mode', mode);
    } catch {}
    if (viewMode === 'flat') {
      cacheRef.current.clear();
      renderFlatPage(currentPage);
    }
  };

  useEffect(() => {
    if (viewMode === 'flat' && pdfDoc) {
      renderFlatPage(currentPage);
    }
  }, [currentPage, zoom, pdfDoc, renderFlatPage, viewMode, paperMode]);

  /* ---- Navigation Handlers ---- */
  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(pageCount, p + 1));

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const goToPage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const num = parseInt(pageInput, 10);
    if (!isNaN(num) && num >= 1 && num <= pageCount) {
      setCurrentPage(num);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Smooth throttled scrubber: immediate visual thumb update, 120ms throttled page nav
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1 || val > pageCount) return;

    setScrubberValue(val);

    if (scrubberDebounceTimerRef.current) {
      clearTimeout(scrubberDebounceTimerRef.current);
    }

    scrubberDebounceTimerRef.current = setTimeout(() => {
      setCurrentPage(val);
    }, 120);
  };

  const zoomIn = () => setZoom((z) => Math.min(z * 1.25, 2.5));
  const zoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.6));
  const zoomReset = () => setZoom(1.0);

  const toggleLoupe = () => setLoupeOn((prev) => !prev);
  const toggleViewMode = () => setViewMode((prev) => (prev === 'book' ? 'flat' : 'book'));

  /* ---- Bookmarks Management ---- */
  const isCurrentPageBookmarked = bookmarks.some((b) => b.pageNum === currentPage);

  const handleToggleBookmarkCurrentPage = async () => {
    if (!bookId) return;

    if (isCurrentPageBookmarked) {
      await deleteBookmarkByPage(bookId, currentPage);
    } else {
      const newBm: BookBookmark = {
        id: crypto.randomUUID(),
        bookId,
        pageNum: currentPage,
        createdAt: Date.now(),
      };
      await addBookmark(newBm);
    }

    const updated = await getBookmarks(bookId);
    setBookmarks(updated);
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!bookId) return;
    await deleteBookmark(bookmarkId);
    const updated = await getBookmarks(bookId);
    setBookmarks(updated);
  };

  /* ---- Search Management ---- */
  const handlePerformSearch = async (query: string) => {
    if (!searchServiceRef.current || !query.trim()) return;

    setIsSearching(true);
    setSearchProgress(0);

    try {
      const result = await searchServiceRef.current.search(query, (scanned, total) => {
        setSearchProgress(Math.round((scanned / total) * 100));
      });
      setSearchResult(result);
      setActiveMatchIndex(0);

      if (result.matches.length > 0) {
        setCurrentPage(result.matches[0].pageNum);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectMatch = (match: SearchMatch) => {
    setActiveMatchIndex(match.matchIndex);
    setCurrentPage(match.pageNum);
  };

  const handleNextMatch = () => {
    if (!searchResult || searchResult.matches.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % searchResult.matches.length;
    setActiveMatchIndex(nextIdx);
    setCurrentPage(searchResult.matches[nextIdx].pageNum);
  };

  const handlePrevMatch = () => {
    if (!searchResult || searchResult.matches.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + searchResult.matches.length) % searchResult.matches.length;
    setActiveMatchIndex(prevIdx);
    setCurrentPage(searchResult.matches[prevIdx].pageNum);
  };

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Compute active chapter item based on current page
  const activeChapter = useMemo(() => {
    return findActiveTocItem(tocItems, currentPage);
  }, [tocItems, currentPage]);

  const toggleSidebarWithTab = (tab: SidebarTab) => {
    if (sidebarOpen && sidebarTab === tab) {
      setSidebarOpen(false);
    } else {
      setSidebarTab(tab);
      setSidebarOpen(true);
    }
  };

  const openSidebarWithTab = (tab: SidebarTab) => {
    setSidebarTab(tab);
    setSidebarOpen(true);
  };

  /* ---- Keyboard Shortcuts ---- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key === 'Escape') {
        if (appearanceOpen || settingsOpen) {
          e.preventDefault();
          setAppearanceOpen(false);
          setSettingsOpen(false);
          return;
        }
        if (sidebarOpen) {
          e.preventDefault();
          setSidebarOpen(false);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        openSidebarWithTab('search');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleBookmarkCurrentPage();
        return;
      }

      if (isInput) return;

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (loading) {
    return (
      <div className="reader-loading">
        <div className="loading-spinner" />
        <p>Opening book in Livre…</p>
      </div>
    );
  }

  if (error || !pdfDoc) {
    return (
      <div className="reader-error">
        <p>Error: {error}</p>
        <button onClick={() => navigate('/library')}>← Back to Library</button>
      </div>
    );
  }

  const readPercent = pageCount > 0 ? Math.min(100, Math.round((scrubberValue / pageCount) * 100)) : 0;

  return (
    <div className="reader-page">
      {/* Slim Parchment Navigation Bar */}
      <header className="reader-toolbar" role="toolbar" aria-label="Reading toolbar">
        <div className="toolbar-left">
          <button
            className="toolbar-btn back-library-btn"
            onClick={() => navigate('/library')}
            title="Return to Library (Esc)"
            aria-label="Return to Library"
          >
            <span className="btn-arrow" aria-hidden="true">←</span>
            <span className="btn-label">Library</span>
          </button>

          <div className="bookplate-title-wrap">
            <span className="toolbar-book-title" title={book?.title ?? 'Untitled'}>
              {book?.title ?? 'Untitled'}
            </span>
            {book?.author && (
              <span className="toolbar-book-author" title={book.author}>
                {book.author}
              </span>
            )}
          </div>
        </div>

        {/* Reading Utilities Group */}
        <div className="toolbar-center reading-utilities-group" role="group" aria-label="Reading utilities">
          <button
            className={`toolbar-btn utility-btn ${sidebarOpen && sidebarTab === 'contents' ? 'active' : ''}`}
            onClick={() => toggleSidebarWithTab('contents')}
            title="Table of Contents"
            aria-label="Table of Contents"
            aria-expanded={sidebarOpen && sidebarTab === 'contents'}
          >
            <span className="btn-icon" aria-hidden="true"><IconMenuContents size={16} /></span>
            <span className="btn-label">Contents</span>
          </button>

          <button
            className={`toolbar-btn utility-btn ${sidebarOpen && sidebarTab === 'bookmarks' ? 'active' : ''} ${isCurrentPageBookmarked ? 'page-bookmarked' : ''}`}
            onClick={() => toggleSidebarWithTab('bookmarks')}
            title={isCurrentPageBookmarked ? 'Bookmarks (Current page is saved)' : 'Bookmarks'}
            aria-label="Bookmarks"
            aria-expanded={sidebarOpen && sidebarTab === 'bookmarks'}
          >
            <span className="btn-icon" aria-hidden="true">
              <IconStar filled={isCurrentPageBookmarked} size={16} />
            </span>
            <span className="btn-label">Bookmarks</span>
            {bookmarks.length > 0 && (
              <span className="toolbar-badge" aria-label={`${bookmarks.length} bookmarks`}>
                {bookmarks.length}
              </span>
            )}
          </button>

          <button
            className={`toolbar-btn utility-btn ${sidebarOpen && sidebarTab === 'search' ? 'active' : ''}`}
            onClick={() => toggleSidebarWithTab('search')}
            title="Search in document (Ctrl+F)"
            aria-label="Search in document"
            aria-expanded={sidebarOpen && sidebarTab === 'search'}
          >
            <span className="btn-icon" aria-hidden="true"><IconSearch size={16} /></span>
            <span className="btn-label">Search</span>
          </button>

          <button
            className={`toolbar-btn utility-btn loupe-toggle-btn ${loupeOn ? 'active' : ''}`}
            onClick={toggleLoupe}
            title={loupeOn ? 'Hide Brass Loupe' : 'Show Antique Brass Loupe'}
            aria-label="Toggle Antique Brass Loupe"
            aria-pressed={loupeOn}
          >
            <span className="btn-icon" aria-hidden="true"><IconMagnifier size={16} /></span>
            <span className="btn-label">Loupe</span>
          </button>
        </div>

        {/* Reading Controls & Additional Actions */}
        <div className="toolbar-right" role="group" aria-label="Reading controls and actions">
          <div className="toolbar-zoom-group" role="group" aria-label="Zoom controls">
            <button className="zoom-btn" onClick={zoomOut} title="Zoom out" aria-label="Zoom out">−</button>
            <button className="zoom-label" onClick={zoomReset} title="Reset zoom (100%)" aria-label="Reset zoom">
              {(zoom * 100).toFixed(0)}%
            </button>
            <button className="zoom-btn" onClick={zoomIn} title="Zoom in" aria-label="Zoom in">+</button>
          </div>

          <div className="popover-anchor">
            <button
              className={`toolbar-btn appearance-trigger ${appearanceOpen ? 'active' : ''}`}
              onClick={() => {
                setAppearanceOpen(!appearanceOpen);
                setSettingsOpen(false);
              }}
              title="Reading Appearance"
              aria-expanded={appearanceOpen}
            >
              <span className="btn-icon"><IconSparkles size={16} /></span>
              <span className="btn-label">Appearance</span>
            </button>

            {/* Reading Appearance Popover */}
            {appearanceOpen && (
              <div className="parchment-popover appearance-popover" onClick={(e) => e.stopPropagation()}>
                <div className="popover-header">
                  <span className="popover-eyebrow">READING ROOM</span>
                  <h4 className="popover-title">Reading Appearance</h4>
                </div>

                <div className="popover-section">
                  <span className="section-label">Paper & Ink Treatment</span>
                  <div className="mode-options-grid">
                    <button
                      type="button"
                      className={`mode-option-btn ${paperMode === 'faithful' ? 'selected' : ''}`}
                      onClick={() => handlePaperModeChange('faithful')}
                      title="Preserve original PDF colors and white background"
                    >
                      <span className="option-icon"><IconDocument size={20} /></span>
                      <div className="option-text">
                        <strong>Faithful PDF</strong>
                        <small>Original white canvas & vibrant colors</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`mode-option-btn ${paperMode === 'printed' ? 'selected' : ''}`}
                      onClick={() => handlePaperModeChange('printed')}
                      title="Natural ink printed directly onto textured warm ivory book paper"
                    >
                      <span className="option-icon"><IconScroll size={20} /></span>
                      <div className="option-text">
                        <strong>Printed on Paper</strong>
                        <small>Natural ink on warm textured ivory</small>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="popover-section">
                  <span className="section-label">Reading Mode</span>
                  <div className="mode-options-grid">
                    <button
                      type="button"
                      className={`mode-option-btn ${viewMode === 'book' ? 'selected' : ''}`}
                      onClick={() => {
                        setViewMode('book');
                        setAppearanceOpen(false);
                      }}
                    >
                      <span className="option-icon"><IconOpenBook size={20} /></span>
                      <div className="option-text">
                        <strong>3D Physical Book</strong>
                        <small>Interactive 18-strip page turns</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`mode-option-btn ${viewMode === 'flat' ? 'selected' : ''}`}
                      onClick={() => {
                        setViewMode('flat');
                        setAppearanceOpen(false);
                      }}
                    >
                      <span className="option-icon"><IconDocument size={20} /></span>
                      <div className="option-text">
                        <strong>Flat Continuous</strong>
                        <small>Single scrollable manuscript</small>
                      </div>
                    </button>
                  </div>
                </div>

                {viewMode === 'book' && (
                  <div className="popover-section">
                    <span className="section-label">Brass Reading Accessory</span>
                    <button
                      type="button"
                      className={`accessory-toggle-btn ${loupeOn ? 'enabled' : ''}`}
                      onClick={toggleLoupe}
                    >
                      <span className="accessory-icon"><IconMagnifier size={18} /></span>
                      <span className="accessory-name">Antique Brass Loupe</span>
                      <span className="toggle-pill">{loupeOn ? 'On' : 'Off'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="popover-anchor">
            <button
              className={`toolbar-btn settings-trigger ${settingsOpen ? 'active' : ''}`}
              onClick={() => {
                setSettingsOpen(!settingsOpen);
                setAppearanceOpen(false);
              }}
              title="Volume Details & Shortcuts"
              aria-expanded={settingsOpen}
            >
              <span className="btn-icon"><IconSettings size={16} /></span>
              <span className="btn-label">Info</span>
            </button>

            {/* Settings & Info Popover */}
            {settingsOpen && (
              <div className="parchment-popover settings-popover" onClick={(e) => e.stopPropagation()}>
                <div className="popover-header">
                  <span className="popover-eyebrow">EX LIBRIS</span>
                  <h4 className="popover-title">Volume & Shortcuts</h4>
                </div>

                <div className="popover-body">
                  <div className="info-meta-row">
                    <span className="meta-key">Volume:</span>
                    <span className="meta-val">{book?.title ?? 'Untitled'}</span>
                  </div>
                  {book?.author && (
                    <div className="info-meta-row">
                      <span className="meta-key">Author:</span>
                      <span className="meta-val">{book.author}</span>
                    </div>
                  )}
                  <div className="info-meta-row">
                    <span className="meta-key">Pages:</span>
                    <span className="meta-val">{pageCount} total</span>
                  </div>
                  <div className="info-meta-row">
                    <span className="meta-key">Storage:</span>
                    <span className="meta-val">Local Private IndexedDB</span>
                  </div>

                  <div className="shortcuts-divider" />
                  <span className="section-label">Reading Shortcuts</span>
                  <div className="shortcuts-list">
                    <div className="shortcut-item">
                      <kbd>←</kbd> / <kbd>→</kbd> <span>Turn Page</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Ctrl+B</kbd> <span>Bookmark Page</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Ctrl+F</kbd> <span>Search Text</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Esc</kbd> <span>Close Menus</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            className={`toolbar-btn fullscreen-btn ${isFullscreen ? 'active' : ''}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen (F11)'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            <span className="btn-icon" aria-hidden="true">
              {isFullscreen ? <IconMinimize size={16} /> : <IconFullscreen size={16} />}
            </span>
          </button>
        </div>
      </header>

      {/* Main Reading Stage & Collapsible Sidebar */}
      <div className="reader-body">
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <ReadingSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          tocItems={tocItems}
          currentPage={currentPage}
          onNavigateToPage={(p) => {
            setCurrentPage(p);
            if (window.innerWidth < 768) setSidebarOpen(false);
          }}
          bookmarks={bookmarks}
          isCurrentPageBookmarked={isCurrentPageBookmarked}
          onToggleBookmarkCurrentPage={handleToggleBookmarkCurrentPage}
          onDeleteBookmark={handleDeleteBookmark}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onPerformSearch={handlePerformSearch}
          searchResult={searchResult}
          isSearching={isSearching}
          searchProgress={searchProgress}
          activeMatchIndex={activeMatchIndex}
          onSelectMatch={handleSelectMatch}
          onNextMatch={handleNextMatch}
          onPrevMatch={handlePrevMatch}
        />

        <main className="reader-stage-container">
          {viewMode === 'book' ? (
            <MengToBookRenderer
              pdfDoc={pdfDoc}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              zoom={zoom}
              loupeEnabled={loupeOn}
              paperMode={paperMode}
            />
          ) : (
            <div className={`reader-viewport ${paperMode === 'printed' ? 'paper-mode-printed' : 'paper-mode-faithful'}`}>
              <div ref={containerRef} className="page-container" />
            </div>
          )}
        </main>
      </div>

      {/* Bottom Reading Progress Area (Refined Bohemian Navigation) */}
      <footer className="reader-bottom-bar" aria-label="Reading progress and page navigation">
        <div className="bottom-bar-left">
          <span className="volume-status-label" title={book?.title ?? 'Livre'}>
            <strong className="volume-book-name">{book?.title ?? 'Livre'}</strong>
            {activeChapter && (
              <span className="volume-chapter-name"> · {activeChapter.title}</span>
            )}
          </span>
        </div>

        <div className="bottom-nav-group">
          <button
            className="bottom-nav-btn"
            onClick={goPrev}
            disabled={currentPage <= 1}
            title="Previous page (Left arrow)"
          >
            ‹ Prev
          </button>

          <form onSubmit={goToPage} className="page-jump-form">
            <span className="page-label">Page</span>
            <input
              type="text"
              value={pageInput}
              onChange={handlePageInputChange}
              className="page-input-compact"
              aria-label="Current page number"
            />
            <span className="page-total-label">of {pageCount}</span>
          </form>

          <button
            className="bottom-nav-btn"
            onClick={goNext}
            disabled={currentPage >= pageCount}
            title="Next page (Right arrow)"
          >
            Next ›
          </button>
        </div>

        <div className="bottom-bar-right">
          <div className="scrubber-container">
            <input
              type="range"
              min={1}
              max={pageCount}
              value={scrubberValue}
              onChange={handleScrubberChange}
              className="reader-scrubber"
              aria-label="Reading progress slider"
            />
            <span className="scrubber-percentage">{readPercent}%</span>
            <span className="bottom-botanical-ornament" title="Livre Reading Room" aria-hidden="true"><IconBotanicalLeaf size={14} /></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ReaderPage;
