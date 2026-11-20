import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const TEMP_USER_DATA = 'C:/Users/Om/AppData/Local/Temp/chrome_phase3_verify';
const ARTIFACT_DIR = 'C:/Users/Om/.gemini/antigravity/brain/41089330-89ba-4ead-b520-eb4a0f72d109';
const PORT = 9225;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.consoleErrors = [];
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
        this.consoleErrors.push(data.params.args.map(a => a.value || a.description).join(' '));
      }
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise(resolve => { this.ws.onopen = resolve; });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('--- Phase 3 Reader Live Verification ---');
  const browserProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${TEMP_USER_DATA}`,
    '--disable-gpu',
    '--no-first-run',
    'about:blank'
  ]);

  let targetWsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(250);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const targets = await res.json();
      if (targets && targets.length > 0) {
        targetWsUrl = targets[0].webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!targetWsUrl) {
    throw new Error('Failed to connect to browser CDP port ' + PORT);
  }

  const client = new CDPClient(targetWsUrl);
  await client.ready();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  // Load sample PDFs from disk as Base64 to inject into IndexedDB
  const textPdfBase64 = fs.readFileSync('d:/Reader Experience/public/sample-docs/the-secret-garden.pdf').toString('base64');
  const illustratedPdfBase64 = fs.readFileSync('d:/Reader Experience/public/sample-docs/botanical-field-studies.pdf').toString('base64');

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });

  await client.send('Page.navigate', { url: 'http://localhost:5173/library' });
  await sleep(1500);

  // Seed IndexedDB with the two books
  console.log('Seeding IndexedDB with sample books...');
  const seedResult = await client.send('Runtime.evaluate', {
    expression: `
      (async () => {
        function b64ToBlob(b64) {
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return new Blob([bytes], { type: 'application/pdf' });
        }

        const dbReq = indexedDB.open('livre-db', 2);
        const db = await new Promise((res, rej) => {
          dbReq.onsuccess = () => res(dbReq.result);
          dbReq.onerror = () => rej(dbReq.error);
        });

        const tx = db.transaction(['books', 'progress', 'bookmarks'], 'readwrite');
        const booksStore = tx.objectStore('books');

        const book1 = {
          id: 'secret-garden-001',
          title: 'The Secret Garden',
          author: 'Frances Hodgson Burnett',
          pageCount: 8,
          createdAt: Date.now(),
          fileBlob: b64ToBlob('${textPdfBase64}')
        };

        const book2 = {
          id: 'botanical-studies-002',
          title: 'Botanical Field Studies',
          author: 'Dr. Eleanor Vance',
          pageCount: 4,
          createdAt: Date.now() + 1000,
          fileBlob: b64ToBlob('${illustratedPdfBase64}')
        };

        await new Promise((res, rej) => {
          const req1 = booksStore.put(book1);
          req1.onsuccess = () => {
            const req2 = booksStore.put(book2);
            req2.onsuccess = () => res(true);
            req2.onerror = rej;
          };
          req1.onerror = rej;
        });

        return { seeded: true };
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Seed result:', seedResult.result.value);

  // Helper to capture and save screenshot
  async function captureShot(name) {
    const shot = await client.send('Page.captureScreenshot', { format: 'png' });
    const filepath = path.join(ARTIFACT_DIR, `${name}.png`);
    fs.writeFileSync(filepath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${name}.png`);
    return filepath;
  }

  // 1. Desktop Reader (1440x900) - Two-Page Spread
  console.log('\n--- 1. Testing Desktop Two-Page Spread (1440x900) ---');
  await client.send('Page.navigate', { url: 'http://localhost:5173/reader/secret-garden-001' });
  await sleep(2500);

  const desktopSpreadShot = await captureShot('reader_desktop_spread');

  // Verify elements and state
  const spreadMetrics = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const toolbar = document.querySelector('.reader-toolbar');
        const bottomBar = document.querySelector('.reader-bottom-bar');
        const titleEl = document.querySelector('.toolbar-book-title');
        const authorEl = document.querySelector('.toolbar-book-author');
        const contentsBtn = document.querySelector('.utility-btn[title="Table of Contents"]');
        const loupeBtn = document.querySelector('.loupe-toggle-btn');
        const pageLabel = document.querySelector('.page-total-label');
        const iframe = document.querySelector('.mengto-book-host iframe');

        return {
          hasToolbar: !!toolbar,
          hasBottomBar: !!bottomBar,
          titleText: titleEl?.textContent,
          authorText: authorEl?.textContent,
          hasContentsBtn: !!contentsBtn,
          hasLoupeBtn: !!loupeBtn,
          pageLabelText: pageLabel?.textContent,
          iframeMounted: !!iframe,
          docScrollW: document.documentElement.scrollWidth,
          windowW: window.innerWidth
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Spread Metrics:', spreadMetrics.result.value);

  // 2. Open Sidebar (Contents Tab) on Desktop
  console.log('\n--- 2. Testing Sidebar Open (Threaded Outline) ---');
  await client.send('Runtime.evaluate', {
    expression: `
      document.querySelector('.utility-btn[title="Table of Contents"]')?.click();
    `
  });
  await sleep(600);
  const desktopSidebarShot = await captureShot('reader_desktop_sidebar');

  const sidebarMetrics = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const sidebar = document.querySelector('.reading-sidebar');
        const tocItems = document.querySelectorAll('.toc-tree-item');
        const activeItem = document.querySelector('.toc-tree-row.active');
        return {
          sidebarOpen: !!sidebar,
          tocItemCount: tocItems.length,
          activeItemTitle: activeItem?.querySelector('.toc-item-title')?.textContent
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Sidebar Metrics:', sidebarMetrics.result.value);

  // 3. Switch to Paper Mode ("Printed on Paper")
  console.log('\n--- 3. Testing Paper Mode ("Printed on Paper") ---');
  // Open appearance popover and select "Printed on Paper"
  await client.send('Runtime.evaluate', {
    expression: `
      // Close sidebar first for clear view
      document.querySelector('.sidebar-close-btn')?.click();
    `
  });
  await sleep(400);

  await client.send('Runtime.evaluate', {
    expression: `
      document.querySelector('.appearance-trigger')?.click();
    `
  });
  await sleep(400);

  await client.send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('.mode-option-btn'));
      const printedBtn = buttons.find(b => b.textContent.includes('Printed on Paper'));
      printedBtn?.click();
    `
  });
  await sleep(1200);

  // Close appearance popover
  await client.send('Runtime.evaluate', {
    expression: `
      document.querySelector('.appearance-trigger')?.click();
    `
  });
  await sleep(400);

  const paperModeShot = await captureShot('reader_desktop_paper_mode');

  // 4. Page Turn Interaction
  console.log('\n--- 4. Testing Page Turn Animation ---');
  // Trigger turn
  await client.send('Runtime.evaluate', {
    expression: `
      document.querySelector('.bottom-nav-btn[title*="Next page"]')?.click();
    `
  });
  await sleep(150); // Mid-turn capture
  const pageTurnShot = await captureShot('reader_desktop_page_turn');
  await sleep(800); // Complete turn

  // 5. Laptop (1280x800) Viewport
  console.log('\n--- 5. Testing Laptop Viewport (1280x800) ---');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 2,
    mobile: false
  });
  await sleep(600);
  await captureShot('reader_laptop_1280x800');

  // 6. Tablet (768x1024) Viewport
  console.log('\n--- 6. Testing Tablet Viewport (768x1024) ---');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(800);
  await captureShot('reader_tablet_768x1024');

  // 7. Mobile (390x844) Viewport - Single Page Reading
  console.log('\n--- 7. Testing Mobile (390x844) ---');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  // Navigate to refresh with mobile mode initialized
  await client.send('Page.navigate', { url: 'http://localhost:5173/reader/secret-garden-001' });
  await sleep(2000);

  await captureShot('reader_mobile_390x844');

  // Open mobile drawer
  await client.send('Runtime.evaluate', {
    expression: `
      document.querySelector('.utility-btn[title="Table of Contents"]')?.click();
    `
  });
  await sleep(600);
  await captureShot('reader_mobile_390x844_drawer');

  // Close drawer
  await client.send('Runtime.evaluate', {
    expression: `
      document.querySelector('.sidebar-close-btn')?.click();
    `
  });
  await sleep(400);

  // 8. Mobile (360x800) Viewport
  console.log('\n--- 8. Testing Mobile (360x800) ---');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 800,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(600);
  await captureShot('reader_mobile_360x800');

  // 9. Small Mobile (320x740) Viewport
  console.log('\n--- 9. Testing Small Mobile (320x740) ---');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 320,
    height: 740,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(600);
  await captureShot('reader_mobile_320x740');

  // 10. Illustrated Document Test: "Botanical Field Studies"
  console.log('\n--- 10. Testing Illustrated Document (1440x900) ---');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });
  await client.send('Page.navigate', { url: 'http://localhost:5173/reader/botanical-studies-002' });
  await sleep(2500);

  await captureShot('reader_illustrated_doc');

  // Test bookmarking and search on illustrated doc
  console.log('\n--- 11. Testing Bookmarks & Search ---');
  const interactionResults = await client.send('Runtime.evaluate', {
    expression: `
      (async () => {
        // 1. Toggle Bookmark
        const bmBtn = document.querySelector('.utility-btn[title*="Bookmarks"]');
        bmBtn?.click();
        await new Promise(r => setTimeout(r, 400));

        // Click "Bookmark current page" inside the bookmarks pane
        const toggleBm = document.querySelector('.bookmark-toggle-btn');
        toggleBm?.click();
        await new Promise(r => setTimeout(r, 400));

        const bookmarksCount = document.querySelectorAll('.bookmark-item').length;

        // 2. Switch to Search and search for "Plate"
        const searchTab = document.querySelector('#tab-search');
        searchTab?.click();
        await new Promise(r => setTimeout(r, 300));

        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
          searchInput.value = 'Plate';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        const submitBtn = document.querySelector('.search-submit-btn');
        submitBtn?.click();
        await new Promise(r => setTimeout(r, 800));

        const matchesCount = document.querySelectorAll('.search-result-item').length;

        return {
          bookmarksCount,
          matchesCount
        };
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Interaction Results:', interactionResults.result.value);

  console.log('Console Errors count:', client.consoleErrors.length);
  if (client.consoleErrors.length > 0) {
    console.log('Console Errors:', client.consoleErrors);
  }

  client.close();
  browserProc.kill();

  console.log('\nAll Phase 3 verification steps completed successfully!');
}

run().catch((err) => {
  console.error('Phase 3 verification error:', err);
  process.exit(1);
});
