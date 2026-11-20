import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const TEMP_USER_DATA = 'C:/Users/Om/AppData/Local/Temp/chrome_verify_cdp';
const ARTIFACT_DIR = 'C:/Users/Om/.gemini/antigravity/brain/41089330-89ba-4ead-b520-eb4a0f72d109';
const PORT = 9222;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getJson(url) {
  const res = await fetch(url);
  return await res.json();
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
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
    return new Promise((resolve) => {
      this.ws.onopen = resolve;
    });
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
  console.log('Launching browser for CDP verification:', CHROME_PATH);
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
    await sleep(300);
    try {
      const targets = await getJson(`http://127.0.0.1:${PORT}/json`);
      if (targets && targets.length > 0) {
        targetWsUrl = targets[0].webSocketDebuggerUrl;
        break;
      }
    } catch (e) {
      // wait
    }
  }

  if (!targetWsUrl) {
    throw new Error('Failed to connect to browser CDP port ' + PORT);
  }

  console.log('Connected to CDP:', targetWsUrl);
  const client = new CDPClient(targetWsUrl);
  await client.ready();

  await client.send('Page.enable');
  await client.send('DOM.enable');

  const viewports = [
    { name: 'desktop_1440x900', w: 1440, h: 900, isMobile: false },
    { name: 'mobile_390x844', w: 390, h: 844, isMobile: true },
    { name: 'mobile_375x812', w: 375, h: 812, isMobile: true },
    { name: 'mobile_360x800', w: 360, h: 800, isMobile: true },
    { name: 'mobile_320x740', w: 320, h: 740, isMobile: true },
  ];

  const results = [];

  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.w}x${vp.h})`);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: vp.w,
      height: vp.h,
      deviceScaleFactor: 2,
      mobile: vp.isMobile
    });

    await client.send('Page.navigate', { url: 'http://localhost:5173/' });
    // wait for load and render
    await sleep(1200);

    // Evaluate metrics
    const evalRes = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientWidth = docEl.clientWidth;
          const hasHorizontalOverflow = scrollWidth > clientWidth;

          const wordmark = document.querySelector('.landing-wordmark')?.getBoundingClientRect();
          const navRight = document.querySelector('.landing-nav-right')?.getBoundingClientRect();
          const libraryLink = document.querySelector('.nav-library-link')?.getBoundingClientRect();
          const libraryText = document.querySelector('.nav-library-text')?.getBoundingClientRect();
          const libraryIcon = document.querySelector('.nav-library-icon')?.getBoundingClientRect();
          const aboutBtn = document.querySelector('.nav-btn-link')?.getBoundingClientRect();
          const profilePill = document.querySelector('.profile-pill')?.getBoundingClientRect();
          const deskPanel = document.querySelector('.desk-panel')?.getBoundingClientRect();
          const dropZone = document.querySelector('.pdf-drop-zone')?.getBoundingClientRect();

          let overlap = false;
          if (wordmark && navRight) {
            overlap = !(wordmark.right <= navRight.left || wordmark.bottom <= navRight.top || wordmark.top >= navRight.bottom);
          }

          return {
            windowInner: { w: window.innerWidth, h: window.innerHeight },
            scrollWidth,
            clientWidth,
            hasHorizontalOverflow,
            overlap,
            elements: {
              wordmark: wordmark ? { x: Math.round(wordmark.x), y: Math.round(wordmark.y), w: Math.round(wordmark.width), h: Math.round(wordmark.height) } : null,
              navRight: navRight ? { x: Math.round(navRight.x), y: Math.round(navRight.y), w: Math.round(navRight.width), h: Math.round(navRight.height) } : null,
              libraryLinkVisible: !!(libraryLink && libraryLink.width > 0 && libraryLink.height > 0),
              libraryTextVisible: !!(libraryText && libraryText.width > 0 && libraryText.height > 0),
              libraryIconVisible: !!(libraryIcon && libraryIcon.width > 0 && libraryIcon.height > 0),
              aboutBtnVisible: !!(aboutBtn && aboutBtn.width > 0 && aboutBtn.height > 0),
              profilePillVisible: !!(profilePill && profilePill.width > 0 && profilePill.height > 0),
              deskPanelTop: deskPanel ? Math.round(deskPanel.top) : null,
              dropZoneVisible: !!(dropZone && dropZone.width > 0 && dropZone.height > 0)
            }
          };
        })()
      `,
      returnByValue: true
    });

    const metrics = evalRes.result.value;
    console.log(`Viewport ${vp.name} result:`, JSON.stringify(metrics, null, 2));

    // Capture screenshot
    const screenshot = await client.send('Page.captureScreenshot', {
      format: 'png'
    });

    const filename = `${vp.name}.png`;
    const filepath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(filepath, Buffer.from(screenshot.data, 'base64'));
    console.log(`Saved screenshot to: ${filepath}`);

    results.push({
      viewport: vp,
      metrics,
      screenshot: filepath
    });
  }

  client.close();
  browserProc.kill();

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'verification_results.json'), JSON.stringify(results, null, 2));
  console.log('\nAll viewports successfully tested and recorded!');
}

run().catch((err) => {
  console.error('Error during CDP verification:', err);
  process.exit(1);
});
