const { app, BrowserWindow, protocol } = require('electron');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const outputPath = process.argv[2];
if (!outputPath) {
  throw new Error('Expected an output JSON path.');
}

const userDataPath = path.join(os.tmpdir(), `autobyteus-authored-url-probe-${process.pid}`);
app.setPath('userData', userDataPath);

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: { standard: true, stream: true },
  },
]);

const requests = [];
const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const cases = [
  { id: 'canonical', authored: 'local-file://local/Users/Normy/Video%20100%25%231.mp4' },
  { id: 'port', authored: 'local-file://local:99/Users/Normy/Video.mp4' },
  { id: 'fragment', authored: 'local-file://local/Users/Normy/Video.mp4#part' },
  { id: 'query', authored: 'local-file://local/Users/Normy/Video.mp4?token=1' },
  { id: 'credentials', authored: 'local-file://user:pass@local/Users/Normy/Credentials.mp4' },
  { id: 'username', authored: 'local-file://user@local/Users/Normy/Username.mp4' },
  { id: 'uppercase-authority', authored: 'local-file://LOCAL/Users/Normy/Uppercase.mp4' },
  { id: 'wrong-authority', authored: 'local-file://wrong/Users/Normy/Video.mp4' },
  { id: 'legacy-posix', authored: 'local-file:///Users/Normy/Video.mp4' },
  { id: 'legacy-windows-drive', authored: 'local-file://C:/Media/Video.mp4' },
];

async function main() {
  await app.whenReady();

  await protocol.handle('local-file', async (request) => {
    const parsed = new URL(request.url);
    requests.push({
      url: request.url,
      protocol: parsed.protocol,
      username: parsed.username,
      password: parsed.password,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
    });
    return new Response(pngBytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(pngBytes.length),
        'Cache-Control': 'no-store',
      },
    });
  });

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });
  await window.loadURL('data:text/html,<html><body></body></html>');

  const results = [];
  for (const scenario of cases) {
    const requestStart = requests.length;
    const renderer = await window.webContents.executeJavaScript(`
      (async () => {
        const authored = ${JSON.stringify(scenario.authored)};
        const img = document.createElement('img');
        img.setAttribute('src', authored);
        const beforeAppend = {
          attribute: img.getAttribute('src'),
          property: img.src,
          currentSrc: img.currentSrc,
        };
        const event = new Promise((resolve) => {
          img.addEventListener('load', () => resolve('load'), { once: true });
          img.addEventListener('error', () => resolve('error'), { once: true });
          setTimeout(() => resolve('timeout'), 1500);
        });
        document.body.appendChild(img);
        const outcome = await event;
        const afterLoad = {
          attribute: img.getAttribute('src'),
          property: img.src,
          currentSrc: img.currentSrc,
        };
        img.remove();
        return { authored, beforeAppend, outcome, afterLoad };
      })()
    `, true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    results.push({
      id: scenario.id,
      ...renderer,
      handlerRequests: requests.slice(requestStart),
    });
  }

  const output = {
    runtime: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch,
    },
    privileges: { standard: true, stream: true },
    results,
  };
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  window.destroy();
}

main()
  .then(async () => {
    await fs.rm(userDataPath, { recursive: true, force: true });
    app.quit();
  })
  .catch(async (error) => {
    await fs.writeFile(outputPath, `${JSON.stringify({ error: String(error), stack: error?.stack }, null, 2)}\n`);
    await fs.rm(userDataPath, { recursive: true, force: true });
    app.exit(1);
  });
