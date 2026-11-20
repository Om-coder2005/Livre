import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractTableOfContents } from '../src/reader/tocService';

test('extractTableOfContents - handles documents with no outline', async () => {
  const mockPdf: any = {
    getOutline: async () => null,
  };

  const toc = await extractTableOfContents(mockPdf);
  assert.deepEqual(toc, []);
});

test('extractTableOfContents - resolves nested outline items to page numbers', async () => {
  const pageRefs = [{ num: 10, gen: 0 }, { num: 25, gen: 0 }];

  const mockPdf: any = {
    getOutline: async () => [
      {
        title: 'Chapter 1: The Beginning',
        dest: [pageRefs[0], { name: 'XYZ' }],
        items: [
          {
            title: 'Section 1.1: Early Days',
            dest: [pageRefs[1], { name: 'XYZ' }],
            items: [],
          },
        ],
      },
      {
        title: 'Chapter 2: The Journey',
        dest: 'named_dest_ch2',
        items: [],
      },
    ],
    getDestination: async (name: string) => {
      if (name === 'named_dest_ch2') {
        return [{ num: 50, gen: 0 }, { name: 'Fit' }];
      }
      return null;
    },
    getPageIndex: async (ref: any) => {
      if (ref.num === 10) return 0; // Page 1
      if (ref.num === 25) return 2; // Page 3
      if (ref.num === 50) return 9; // Page 10
      return 0;
    },
  };

  const toc = await extractTableOfContents(mockPdf);

  assert.equal(toc.length, 2);
  assert.equal(toc[0].title, 'Chapter 1: The Beginning');
  assert.equal(toc[0].pageNum, 1);

  assert.ok(toc[0].children);
  assert.equal(toc[0].children.length, 1);
  assert.equal(toc[0].children[0].title, 'Section 1.1: Early Days');
  assert.equal(toc[0].children[0].pageNum, 3);

  assert.equal(toc[1].title, 'Chapter 2: The Journey');
  assert.equal(toc[1].pageNum, 10);
});
