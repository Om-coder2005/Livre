import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const TEMP_USER_DATA = 'C:/Users/Om/AppData/Local/Temp/chrome_scroll_cdp';
const ARTIFACT_DIR = 'C:/Users/Om/.gemini/antigravity/brain/41089330-89ba-4ead-b520-eb4a0f72d109';
const PORT = 9223;

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
    return new Promise(resolve => { this.ws.onopen = resolve; });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}

async function run() {
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
    } catch (e) {}
  }

  const client = new CDPClient(targetWsUrl);
  await client.ready();
  await client.send('Page.enable');

  const targets = [
    { name: 'mobile_390x844_scrolled', w: 390, h: 844 },
    { name: 'mobile_360x800_scrolled', w: 360, h: 800 }
  ];

  for (const t of targets) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: t.w,
      height: t.h,
      deviceScaleFactor: 2,
      mobile: true
    });
    await client.send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1000);

    // Scroll to desk panel
    await client.send('Runtime.evaluate', {
      expression: `
        document.querySelector('.desk-panel')?.scrollIntoView({ behavior: 'instant', block: 'center' });
      `
    });
    await sleep(400);

    const shot = await client.send('Page.captureScreenshot', { format: 'png' });
    const filepath = path.join(ARTIFACT_DIR, `${t.name}.png`);
    fs.writeFileSync(filepath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved scrolled screenshot: ${filepath}`);
  }

  client.close();
  browserProc.kill();
}

run().catch(console.error);
