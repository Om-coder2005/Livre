import { spawn } from 'child_process';
import fs from 'fs';

const CHROME_PATH = fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const PORT = 9224;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const proc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=C:/Users/Om/AppData/Local/Temp/chrome_idb_check',
    '--disable-gpu',
    '--no-first-run',
    'about:blank'
  ]);

  let targetWsUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(250);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const targets = await res.json();
      if (targets && targets[0]) {
        targetWsUrl = targets[0].webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  const ws = new WebSocket(targetWsUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const handler = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === curId) {
        ws.removeEventListener('message', handler);
        if (d.error) reject(d.error);
        else resolve(d.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:5173/library' });
  await sleep(1500);

  const evalRes = await send('Runtime.evaluate', {
    expression: `
      new Promise((resolve) => {
        const req = indexedDB.open('livre_db', 1);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('books')) {
            resolve({ books: [], error: 'no books store' });
            return;
          }
          const tx = db.transaction('books', 'readonly');
          const store = tx.objectStore('books');
          const getReq = store.getAll();
          getReq.onsuccess = () => {
            const list = (getReq.result || []).map(b => ({
              id: b.id,
              title: b.title,
              author: b.author,
              pageCount: b.pageCount,
              hasBlob: !!(b.fileBlob && b.fileBlob.size > 0),
              blobSize: b.fileBlob ? b.fileBlob.size : 0
            }));
            resolve({ books: list });
          };
          getReq.onerror = () => resolve({ error: 'getReq error' });
        };
        req.onerror = () => resolve({ error: 'db open error' });
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('IndexedDB books in Temp dir:', JSON.stringify(evalRes.result.value, null, 2));

  ws.close();
  proc.kill();
}

run().catch(console.error);
