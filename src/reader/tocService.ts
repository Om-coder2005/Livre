import * as pdfjsLib from 'pdfjs-dist';

export interface TocItem {
  id: string;
  title: string;
  pageNum: number | null;
  children?: TocItem[];
}

export async function extractTableOfContents(
  pdfDoc: pdfjsLib.PDFDocumentProxy
): Promise<TocItem[]> {
  try {
    const rawOutline = await pdfDoc.getOutline();
    if (!rawOutline || rawOutline.length === 0) {
      return [];
    }
    return await resolveOutlineItems(pdfDoc, rawOutline);
  } catch (err) {
    console.warn('Failed to extract PDF outline:', err);
    return [];
  }
}

async function resolveOutlineItems(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  items: any[]
): Promise<TocItem[]> {
  const result: TocItem[] = [];

  for (const item of items) {
    let pageNum: number | null = null;

    try {
      let dest = item.dest;
      if (typeof dest === 'string') {
        dest = await pdfDoc.getDestination(dest);
      }

      if (Array.isArray(dest) && dest.length > 0) {
        const destRef = dest[0];
        if (typeof destRef === 'number') {
          pageNum = destRef + 1;
        } else if (destRef && typeof destRef === 'object') {
          const pageIndex = await pdfDoc.getPageIndex(destRef);
          pageNum = pageIndex + 1;
        }
      }
    } catch (e) {
      console.warn(`Could not resolve destination for outline item "${item.title}":`, e);
    }

    const resolvedItem: TocItem = {
      id: crypto.randomUUID(),
      title: (item.title || 'Untitled Section').trim(),
      pageNum,
    };

    if (item.items && item.items.length > 0) {
      resolvedItem.children = await resolveOutlineItems(pdfDoc, item.items);
    }

    result.push(resolvedItem);
  }

  return result;
}

export function findActiveTocItem(items: TocItem[], currentPage: number): TocItem | null {
  let bestItem: TocItem | null = null;
  let bestPage = -1;

  function traverse(list: TocItem[]) {
    for (const item of list) {
      if (item.pageNum !== null && item.pageNum <= currentPage) {
        if (item.pageNum > bestPage) {
          bestPage = item.pageNum;
          bestItem = item;
        } else if (item.pageNum === bestPage && (!item.children || item.children.length === 0)) {
          bestItem = item;
        }
      }
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  }

  traverse(items);
  return bestItem;
}
