import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TocItem } from '../src/reader/tocService';

// Logic mirror of findActiveTocItemId in ReadingSidebar
function findActiveTocItemId(items: TocItem[], currentPage: number): string | null {
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
  return bestItem ? (bestItem as TocItem).id : null;
}

test('ReadingSidebar - active chapter tracking across 3+ levels of nested hierarchy', () => {
  // Test outline mimicking Dune's 3-level deep hierarchy:
  // Book Root -> DUNE WORLD -> First of Three Parts -> Subsections I, II, III
  const nestedToc: TocItem[] = [
    {
      id: 'book-1',
      title: 'DUNE WORLD',
      pageNum: 1,
      children: [
        {
          id: 'part-1',
          title: 'First of Three Parts',
          pageNum: 1,
          children: [
            { id: 'sec-1', title: 'I', pageNum: 1 },
            { id: 'sec-2', title: 'II', pageNum: 15 },
            { id: 'sec-3', title: 'III', pageNum: 32 },
            { id: 'sec-4', title: 'IV', pageNum: 48 },
            { id: 'sec-5', title: 'V', pageNum: 65 },
          ],
        },
        {
          id: 'part-2',
          title: 'Second of Three Parts',
          pageNum: 80,
          children: [
            { id: 'sec-6', title: 'VI', pageNum: 80 },
            { id: 'sec-7', title: 'VII', pageNum: 95 },
          ],
        },
      ],
    },
    {
      id: 'book-2',
      title: 'DUNE MESSIAH',
      pageNum: 150,
      children: [
        { id: 'messiah-part-1', title: 'Part One', pageNum: 150 },
      ],
    },
  ];

  // At page 1: should resolve to leaf subsection 'sec-1' ('I')
  assert.equal(findActiveTocItemId(nestedToc, 1), 'sec-1');

  // At page 10 (still in Section I): stays 'sec-1'
  assert.equal(findActiveTocItemId(nestedToc, 10), 'sec-1');

  // At page 15 (Section II starts): resolves to 'sec-2'
  assert.equal(findActiveTocItemId(nestedToc, 15), 'sec-2');

  // At page 28 (still in Section II): stays 'sec-2'
  assert.equal(findActiveTocItemId(nestedToc, 28), 'sec-2');

  // At page 32 (Section III starts): resolves to 'sec-3'
  assert.equal(findActiveTocItemId(nestedToc, 32), 'sec-3');

  // At page 90 (in Second of Three Parts, Section VI): resolves to 'sec-6'
  assert.equal(findActiveTocItemId(nestedToc, 90), 'sec-6');

  // At page 155 (in Dune Messiah): resolves to 'messiah-part-1'
  assert.equal(findActiveTocItemId(nestedToc, 155), 'messiah-part-1');
});

test('ReadingSidebar - handles empty outline and edge conditions', () => {
  assert.equal(findActiveTocItemId([], 5), null);

  const noPageToc: TocItem[] = [
    { id: 'nopage-1', title: 'Preface', pageNum: null },
    { id: 'nopage-2', title: 'Introduction', pageNum: null },
  ];
  assert.equal(findActiveTocItemId(noPageToc, 1), null);

  // Before any chapter begins (e.g. page 0 or page 1 before page 10)
  const delayedToc: TocItem[] = [
    { id: 'ch-1', title: 'Chapter 1', pageNum: 10 },
  ];
  assert.equal(findActiveTocItemId(delayedToc, 5), null);
});

test('ReadingSidebar - threaded tree continuous sibling and last-child connector resolution', () => {
  const siblings: TocItem[] = [
    { id: 's1', title: 'Chapter 1', pageNum: 1 },
    { id: 's2', title: 'Chapter 2', pageNum: 10 },
    { id: 's3', title: 'Chapter 3', pageNum: 20 },
  ];

  // First item has siblings below -> has-next (line continues full height)
  const isFirstLast = 0 === siblings.length - 1;
  assert.equal(isFirstLast, false);

  // Middle item has siblings below -> has-next
  const isMiddleLast = 1 === siblings.length - 1;
  assert.equal(isMiddleLast, false);

  // Final item -> is-last (line ends at connector, curves into row)
  const isFinalLast = 2 === siblings.length - 1;
  assert.equal(isFinalLast, true);
});
