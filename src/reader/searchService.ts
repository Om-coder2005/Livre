import * as pdfjsLib from 'pdfjs-dist';

export interface SearchMatch {
  id: string;
  matchIndex: number; // Global match index (0-based)
  pageNum: number;
  snippetBefore: string;
  matchWord: string;
  snippetAfter: string;
}

export interface SearchResult {
  matches: SearchMatch[];
  totalMatches: number;
  hasExtractableText: boolean;
}

export class DocumentSearchService {
  private pdfDoc: pdfjsLib.PDFDocumentProxy;
  private pageTextCache = new Map<number, string>();
  private textExtractionChecked = false;
  private documentHasText = true;
  private currentSearchId = 0;

  constructor(pdfDoc: pdfjsLib.PDFDocumentProxy) {
    this.pdfDoc = pdfDoc;
  }

  public async getPageText(pageNum: number): Promise<string> {
    if (this.pageTextCache.has(pageNum)) {
      return this.pageTextCache.get(pageNum)!;
    }

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      this.pageTextCache.set(pageNum, text);
      return text;
    } catch (e) {
      console.warn(`Failed to extract text from page ${pageNum}:`, e);
      this.pageTextCache.set(pageNum, '');
      return '';
    }
  }

  public cancelSearch(): void {
    this.currentSearchId++;
  }

  public async search(
    query: string,
    onProgress?: (scannedPages: number, totalPages: number) => void
  ): Promise<SearchResult> {
    const searchId = ++this.currentSearchId;
    const trimmed = query.trim();
    if (!trimmed) {
      return { matches: [], totalMatches: 0, hasExtractableText: true };
    }

    const totalPages = this.pdfDoc.numPages;
    const matches: SearchMatch[] = [];
    const lowerQuery = trimmed.toLowerCase();
    let totalCharsExtracted = 0;
    let globalMatchIndex = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      // Abort if another search started
      if (searchId !== this.currentSearchId) {
        return { matches: [], totalMatches: 0, hasExtractableText: true };
      }

      const pageText = await this.getPageText(pageNum);
      totalCharsExtracted += pageText.trim().length;

      if (pageText) {
        const lowerText = pageText.toLowerCase();
        let startIndex = 0;

        while ((startIndex = lowerText.indexOf(lowerQuery, startIndex)) !== -1) {
          const endIndex = startIndex + trimmed.length;

          // Extract surrounding context snippet
          const snippetStart = Math.max(0, startIndex - 38);
          const snippetEnd = Math.min(pageText.length, endIndex + 38);

          const rawBefore = pageText.substring(snippetStart, startIndex);
          const rawMatch = pageText.substring(startIndex, endIndex);
          const rawAfter = pageText.substring(endIndex, snippetEnd);

          const snippetBefore = (snippetStart > 0 ? '…' : '') + rawBefore;
          const snippetAfter = rawAfter + (snippetEnd < pageText.length ? '…' : '');

          matches.push({
            id: `${pageNum}-${startIndex}`,
            matchIndex: globalMatchIndex++,
            pageNum,
            snippetBefore,
            matchWord: rawMatch,
            snippetAfter,
          });

          startIndex = endIndex;
        }
      }

      if (onProgress && searchId === this.currentSearchId) {
        onProgress(pageNum, totalPages);
      }
    }

    this.textExtractionChecked = true;
    this.documentHasText = totalCharsExtracted > 0;

    return {
      matches,
      totalMatches: matches.length,
      hasExtractableText: this.documentHasText,
    };
  }

  public clear(): void {
    this.cancelSearch();
    this.pageTextCache.clear();
  }
}
