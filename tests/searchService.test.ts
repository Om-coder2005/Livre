import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentSearchService } from '../src/reader/searchService';

function createMockTextPdf(pages: string[]): any {
  return {
    numPages: pages.length,
    getPage: async (pageNum: number) => ({
      getTextContent: async () => ({
        items: pages[pageNum - 1].split(' ').map((str) => ({ str })),
      }),
    }),
  };
}

test('DocumentSearchService - finds case-insensitive matches across pages', async () => {
  const pages = [
    'The quick brown fox jumps over the lazy dog.',
    'A quick movement startled the bird on the branch.',
    'Nothing to see here.',
  ];

  const pdf = createMockTextPdf(pages);
  const searcher = new DocumentSearchService(pdf);

  const result = await searcher.search('quick');

  assert.equal(result.totalMatches, 2);
  assert.equal(result.hasExtractableText, true);

  assert.equal(result.matches[0].pageNum, 1);
  assert.equal(result.matches[0].matchWord, 'quick');
  assert.ok(result.matches[0].snippetAfter.includes('brown'));

  assert.equal(result.matches[1].pageNum, 2);
  assert.equal(result.matches[1].matchWord, 'quick');
});

test('DocumentSearchService - detects scanned/image-only PDF with no text', async () => {
  const pages = ['', '', '']; // 3 pages with zero text items

  const pdf = createMockTextPdf(pages);
  const searcher = new DocumentSearchService(pdf);

  const result = await searcher.search('anything');

  assert.equal(result.totalMatches, 0);
  assert.equal(result.hasExtractableText, false); // Accurately flags scanned/image-only document
});

test('DocumentSearchService - empty query returns zero matches', async () => {
  const pdf = createMockTextPdf(['Some text here']);
  const searcher = new DocumentSearchService(pdf);

  const result = await searcher.search('   ');
  assert.equal(result.totalMatches, 0);
});

test('DocumentSearchService - search cancellation aborts previous search', async () => {
  const pdf = createMockTextPdf(['Page 1 content', 'Page 2 content']);
  const searcher = new DocumentSearchService(pdf);

  const searchPromise1 = searcher.search('content');
  searcher.cancelSearch(); // Abort search 1
  const result1 = await searchPromise1;

  assert.equal(result1.totalMatches, 0); // Aborted
});
