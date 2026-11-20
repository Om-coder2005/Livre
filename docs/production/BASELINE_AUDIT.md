# LIVRE — COMPREHENSIVE PRODUCTION BASELINE AUDIT
**Phase A Deliverable**  
**Date:** November 20, 2026  
**Auditor Roles:** Senior SRE, Application Security Engineer, Performance Engineer, QA Automation Engineer  
**Repository:** [https://github.com/Om-coder2005/Livre.git](https://github.com/Om-coder2005/Livre.git)  

---

## 1. Architecture Overview

Livre is a high-fidelity client-side PDF-to-book reading application built on React, TypeScript, and Vite. The core philosophy is to transform standard rectangular PDF documents into a tactile, distraction-free reading experience resembling content printed directly on warm ivory book paper.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Livre Application Shell                         │
│                    (React 18 + React Router v6)                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│ Landing Page │             │ Library Page │             │ Reader View  │
│  & DropZone  │             │  & Shelf UI  │             │ & Controls   │
└──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                            │                            │
       ▼                            │                            ▼
┌──────────────┐                    │                     ┌──────────────┐
│  Processing  │                    │                     │  Meng To 3D  │
│  & Thumbnail │                    │                     │ Strip Iframe │
└──────┬───────┘                    │                     └──────┬───────┘
       │                            │                            │
       └────────────────────┬───────┴────────────────────────────┘
                            ▼
           ┌──────────────────────────────────┐
           │      IndexedDB Layer (idb)       │
           │  • books store (Blobs, metadata) │
           │  • progress store (lastPage)     │
           │  • bookmarks store (indices)     │
           └──────────────────────────────────┘
```

### Architectural Tiers
1. **Application Host Shell:** Single Page Application (SPA) driven by React 18, React Router v6, with an editorial design system based on CSS custom properties (`tokens.css`, `typography.css`, `motion.css`, `responsive.css`).
2. **Persistence Tier:** Client-side local persistence using IndexedDB (`livre-db` v2) through `idb`, storing full PDF blobs, reading progress, and nested bookmarks without server round-trips.
3. **Document Ingestion Tier:** Client-side PDF parsing via `pdfjs-dist` (v4.2.67), extracting document outlines (TOC), full-text layers, and generating page 1 cover thumbnails.
4. **Compositing & Spread Rendering:** `SpreadRendererService` creates 1760×1240 high-resolution double-page spreads (or single pages on mobile), applying document-aware multiply blending and laid-paper micro-texture in "Printed" mode, or clean white canvas in "Faithful" mode.
5. **Physical Book Renderer:** Meng To 18-strip cylindrical curl mathematical engine hosted in an isolated `iframe` (`public/landing-pages/livre-book-renderer.html`) communicating bi-directionally with React via postMessage.

---

## 2. Complete Project Inventory

### 2.1 Entry Points & Routing
- **`index.html`:** Root HTML document; loads typography (`Instrument Serif`, `Newsreader`), establishes viewport parameters, and mounts React root (`#root`).
- **`src/main.tsx`:** Application bootstrapping; mounts `<App />` within `<BrowserRouter>` with React 18 Concurrent Root and React v7 future flags.
- **`src/app/App.tsx`:** Route routing table wrapped in `<ErrorBoundary>`:
  - `/` & `/upload`: `UploadLandingPage`
  - `/library`: `LibraryPage`
  - `/reader/:bookId`: `ReaderPage`
  - `*`: Wildcard redirect to `/`

### 2.2 React Components
- **Shell & Navigation:**
  - `src/components/ErrorBoundary.tsx`: Error boundary trapping unhandled rendering exceptions with editorial recovery UI.
  - `src/icons/Icons.tsx`: 21 custom Flaticon-style SVG icons (`IconBooks`, `IconFullscreen`, `IconMinimize`, `IconHourglass`, `IconUploadTray`, `IconDocument`, `IconScroll`, `IconOpenBook`, `IconMagnifier`, `IconSearch`, `IconSettings`, `IconBookmark`, `IconStar`, `IconSparkles`, `IconMenuContents`, `IconWarning`, `IconCheck`, `IconEdit`, `IconClose`, `IconTrash`, `IconBotanicalLeaf`).
- **Upload Flow:**
  - `src/upload/UploadLandingPage.tsx`: Asymmetrical two-column editorial landing page with hero copy and interactive desk panel.
  - `src/upload/PDFDropZone.tsx`: Drag-and-drop file upload target with file validation and browse fallback.
  - `src/upload/BookProcessingPage.tsx`: Multi-stage manuscript preparation view with animated progress and cover generation.
  - `src/upload/ProcessingBookAnimation.tsx`: Book curl and turning page CSS animation during ingestion.
  - `src/upload/BookPreviewGraphic.tsx`: Visual preview of an open volume inside the upload desk.
  - `src/upload/AboutModal.tsx`: Editorial modal detailing the Livre reading philosophy.
- **Library Shelf:**
  - `src/library/LibraryPage.tsx`: Personal digital library shelf listing all saved volumes with progress badges and search.
  - `src/library/BookCard.tsx`: Tactile book cover card with progress bar, page counts, metadata editing, and deletion.
  - `src/library/UploadForm.tsx`: Secondary inline dropzone inside the library shelf.
- **Reader Environment:**
  - `src/reader/ReaderPage.tsx`: Core reading room orchestrating top toolbar, bottom running chapter scrubber, fullscreen, zoom, and paper modes.
  - `src/reader/ReadingSidebar.tsx`: Threaded table of contents tree, bookmark list, and contextual search results.
  - `src/reader/MengToBookRenderer.tsx`: Host container embedding the 3D strip renderer iframe.

### 2.3 Services & Logic Modules
- **`src/persistence/indexedDB.ts`:** Database CRUD operations, transactional book deletion with bookmark cascades, and corrupted record purges.
- **`src/reader/spreadRenderer.ts`:** Offscreen canvas spread generation, paper texture synthesis, text-layer generation, and LRU cache eviction.
- **`src/reader/tocService.ts`:** Recursive outline parsing and active chapter resolution (`findActiveTocItem`).
- **`src/reader/searchService.ts`:** Case-insensitive full-text search with context snippet extraction and cancellation.

### 2.4 Worker Scripts & Assets
- **PDF Worker:** `pdfjs-dist/build/pdf.worker.min.mjs` loaded dynamically via `new URL(..., import.meta.url)`.
- **Fonts (`public/landing-pages/meng-to-sketchbook/`):**
  - `instrument-serif-normal.woff2`, `instrument-serif-italic.woff2`
  - `newsreader.woff2`
- **Botanical Decorative Elements:**
  - `bg-wash.jpg`, `bloom.png`, `botany-left.png`, `botany-right.png`, `divider.png`.

---

## 3. Dependency Health & Vulnerability Analysis

### 3.1 Direct & Dev Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "pdfjs-dist": "^4.2.67",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.2",
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.2.11",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.12",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/react-router-dom": "^5.3.3"
  }
}
```

### 3.2 Audit Findings (`npm audit`)
- **Vulnerabilities Reported:** 4 (3 moderate, 1 high)
  1. `esbuild <= 0.24.2` (via `vite`): Request reflection vulnerability on local dev server (GHSA-67mh-4wv8-2f99).
  2. `react-router 6.0.0 - 7.17.0`: Open redirect via backslash bypass (GHSA-wrjc-x8rr-h8h6) and SSR hydration error deserialization (GHSA-337j-9hxr-rhxg).
- **Outdated / Unused Packages:**
  - `@types/react-router-dom` is at `^5.3.3`, while `react-router-dom` is at `^6.22.0`. React Router v6 provides its own types; this legacy type package is redundant and potentially conflicting.
  - `jest` and `@types/jest` are installed in `devDependencies`, but test scripts run `npx tsx --test`. Jest is completely unused.

---

## 4. Test Coverage & Build Baseline

### 4.1 Automated Test Execution
- **Command:** `npm test` (`npx tsx --test tests/*.test.ts`)
- **Suite Result:** **27 tests executed, 27 passed, 0 failed**
- **Test File Inventory:**
  - `tests/persistenceLogic.test.ts` (4 tests)
  - `tests/readerLayoutAndLoupe.test.ts` (2 tests)
  - `tests/readingSidebar.test.ts` (3 tests)
  - `tests/searchService.test.ts` (4 tests)
  - `tests/spreadRenderer.test.ts` (7 tests)
  - `tests/tocService.test.ts` (2 tests)
  - `tests/uploadValidation.test.ts` (5 tests)

### 4.2 Build & Bundle Metrics
- **Compilation:** `npx tsc --noEmit` exits with **0 errors**.
- **Production Build:** `npm run build` succeeds in **2.17s**.
- **Bundle Chunk Sizes:**
  - `dist/index.html`: `0.88 kB`
  - `dist/assets/index-*.css`: `181.35 kB` (gzip: `37.21 kB`)
  - `dist/assets/index-*.js`: `625.21 kB` (gzip: `186.91 kB`) — *Exceeds 500 kB budget*
  - `dist/assets/pdf.worker.min-*.mjs`: `1,375.84 kB`

---

## 5. Identified Technical Risks & Vulnerabilities

| Risk Area | Severity | Description |
| :--- | :--- | :--- |
| **Upload Validation Asymmetry** | **High** | In `UploadForm.tsx`, the MIME check uses `&&` instead of `||` (`file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')`), and lacks a maximum file size cap (unlike `PDFDropZone.tsx` which enforces 50 MB). |
| **PDF Loading Task Lifecycle** | **High** | In `ReaderPage.tsx`, if the user rapidly navigates away while `pdfjsLib.getDocument()` is resolving, the in-flight `loadingTask` is not destroyed, leading to unhandled promise rejections and leaked worker threads. |
| **Bookmark Deletion Inefficiency** | **Medium** | `deleteBookmarkByPage` in `indexedDB.ts` queries all bookmarks and deletes one-by-one instead of using the composite index `by-bookId-page`. |
| **Missing Content Security Policy** | **Medium** | `index.html` has no CSP meta tag, leaving the client vulnerable to injected scripts or rogue workers. |
| **Monolithic JavaScript Bundle** | **Medium** | All application routes (`/`, `/library`, `/reader`) are bundled in one `625 kB` chunk. |
| **WorkerSrc Redundancy** | **Low** | `pdfjsLib.GlobalWorkerOptions.workerSrc` is configured redundantly across 4 separate component files rather than a centralized initialization module. |
| **Unused Dev Dependencies** | **Low** | `jest`, `@types/jest`, and `@types/react-router-dom@^5.3.3` clutter `devDependencies`. |
