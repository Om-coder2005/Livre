import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpreadRendererService } from '../src/reader/spreadRenderer';

// Mock minimal PDFDocumentProxy
function createMockPdf(numPages: number): any {
  return {
    numPages,
    getPage: async (pageNum: number) => ({
      getViewport: () => ({ width: 600, height: 800 }),
      render: () => ({ promise: Promise.resolve() }),
      getTextContent: async () => ({ items: [] }),
    }),
  };
}

test('SpreadRendererService - desktop two-page spread calculations', () => {
  const pdf = createMockPdf(10);
  const service = new SpreadRendererService(pdf, false, 6);

  // Total spreads for 10 pages should be 5
  assert.equal(service.getTotalSpreads(), 5);

  // Spread 0: pages 1 & 2
  const s0 = service.getPageNumbersForSpread(0);
  assert.equal(s0.left, 1);
  assert.equal(s0.right, 2);

  // Spread 1: pages 3 & 4
  const s1 = service.getPageNumbersForSpread(1);
  assert.equal(s1.left, 3);
  assert.equal(s1.right, 4);

  // Spread 4: pages 9 & 10
  const s4 = service.getPageNumbersForSpread(4);
  assert.equal(s4.left, 9);
  assert.equal(s4.right, 10);

  // Page index to spread resolution
  assert.equal(service.getSpreadIndexForPage(1), 0);
  assert.equal(service.getSpreadIndexForPage(2), 0);
  assert.equal(service.getSpreadIndexForPage(3), 1);
  assert.equal(service.getSpreadIndexForPage(4), 1);
  assert.equal(service.getSpreadIndexForPage(10), 4);
});

test('SpreadRendererService - odd total pages (e.g. 5 pages)', () => {
  const pdf = createMockPdf(5);
  const service = new SpreadRendererService(pdf, false, 6);

  // Total spreads for 5 pages should be 3
  assert.equal(service.getTotalSpreads(), 3);

  // Last spread (index 2) should have left=5 and right=null (blank paper)
  const lastSpread = service.getPageNumbersForSpread(2);
  assert.equal(lastSpread.left, 5);
  assert.equal(lastSpread.right, null);
});

test('SpreadRendererService - single-page document (1 page)', () => {
  const pdf = createMockPdf(1);
  const service = new SpreadRendererService(pdf, false, 6);

  assert.equal(service.getTotalSpreads(), 1);
  const s0 = service.getPageNumbersForSpread(0);
  assert.equal(s0.left, 1);
  assert.equal(s0.right, null);
  assert.equal(service.getSpreadIndexForPage(1), 0);
});

test('SpreadRendererService - mobile single-page layout', () => {
  const pdf = createMockPdf(7);
  const service = new SpreadRendererService(pdf, true, 6);

  // Total spreads equals total pages on mobile
  assert.equal(service.getTotalSpreads(), 7);

  for (let i = 0; i < 7; i++) {
    const sp = service.getPageNumbersForSpread(i);
    assert.equal(sp.left, i + 1);
    assert.equal(sp.right, null);
    assert.equal(service.getSpreadIndexForPage(i + 1), i);
  }
});

test('SpreadRendererService - boundary clamping for out-of-range page numbers', () => {
  const pdf = createMockPdf(6);
  const desktop = new SpreadRendererService(pdf, false, 6);

  // Negative or 0 should clamp to 0 (first spread)
  assert.equal(desktop.getSpreadIndexForPage(0), 0);
  assert.equal(desktop.getSpreadIndexForPage(-5), 0);

  // Beyond total pages should clamp to max spread index (2 for 6 pages)
  assert.equal(desktop.getSpreadIndexForPage(7), 2);
  assert.equal(desktop.getSpreadIndexForPage(999), 2);

  const mobile = new SpreadRendererService(pdf, true, 6);
  assert.equal(mobile.getSpreadIndexForPage(0), 0);
  assert.equal(mobile.getSpreadIndexForPage(-10), 0);
  assert.equal(mobile.getSpreadIndexForPage(100), 5); // 0-indexed max is 5
});

test('SpreadRendererService - dynamic mobile mode switching and cleanup', () => {
  const pdf = createMockPdf(10);
  const service = new SpreadRendererService(pdf, false, 6);

  assert.equal(service.getTotalSpreads(), 5);

  // Switch to mobile mode
  const changed = service.setMobileMode(true);
  assert.equal(changed, true);
  assert.equal(service.getTotalSpreads(), 10);

  // Switching to same mode returns false (no unnecessary rerender)
  assert.equal(service.setMobileMode(true), false);

  // Clear & destroy cleans up cleanly without throwing
  service.clear();
  service.destroy();
});

test('SpreadRendererService - paper appearance modes (Faithful PDF vs Printed on Paper)', () => {
  const pdf = createMockPdf(8);
  const service = new SpreadRendererService(pdf, false, 6);

  // Default mode must be 'faithful' (Mode A)
  assert.equal(service.getPaperMode(), 'faithful');

  // Switching to 'printed' returns true (mode changed, triggers rerender)
  const switched = service.setPaperMode('printed');
  assert.equal(switched, true);
  assert.equal(service.getPaperMode(), 'printed');

  // Setting the same mode again returns false (deduplicated, no unnecessary cache eviction)
  assert.equal(service.setPaperMode('printed'), false);

  // Switching back to 'faithful' returns true
  assert.equal(service.setPaperMode('faithful'), true);
  assert.equal(service.getPaperMode(), 'faithful');

  service.destroy();
});
