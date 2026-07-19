const { app, BrowserWindow, protocol, session } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const outputPath = process.env.SOLUTION_DESIGN_FETCH_ORIGIN_RESULT;
const mode = process.env.SOLUTION_DESIGN_FETCH_ORIGIN_MODE || 'observe';
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-fetch-origin-'));

const result = {
  runtime: null,
  privileges: {
    standard: true,
    stream: true,
    supportFetchAPI: true,
    corsEnabled: true,
  },
  mode,
  requests: [],
  webRequests: [],
  renderer: {},
  outcome: 'running',
};

const listen = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});

const close = (server) => new Promise((resolve) => server.close(resolve));

const writeResult = () => {
  if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`SOLUTION_DESIGN_FETCH_ORIGIN ${JSON.stringify(result)}`);
};

protocol.registerSchemesAsPrivileged([{
  scheme: 'local-file',
  privileges: result.privileges,
}]);

app.setName('AutoByteusLocalFileFetchOriginProbe');
app.setPath('userData', path.join(fixtureRoot, 'user-data'));

app.whenReady().then(async () => {
  let win = null;
  result.runtime = {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  };

  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['local-file://*/*'] },
    (details, callback) => {
      const authorizedMainFrame = Boolean(
        win
        && details.webContentsId === win.webContents.id
        && details.frame === win.webContents.mainFrame,
      );
      const cancel = mode === 'main-frame-gate' && !authorizedMainFrame;
      result.webRequests.push({
        url: details.url,
        method: details.method,
        webContentsId: details.webContentsId,
        frameId: details.frame?.frameId ?? null,
        frameUrl: details.frame?.url ?? null,
        parentFrameId: details.frame?.parent?.frameId ?? null,
        parentFrameUrl: details.frame?.parent?.url ?? null,
        resourceType: details.resourceType,
        referrer: details.referrer,
        authorizedMainFrame,
        decision: cancel ? 'cancel' : 'allow',
      });
      callback({ cancel });
    },
  );

  protocol.handle('local-file', (request) => {
    result.requests.push({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
    });
    return new Response('probe-bytes', {
      status: 200,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  });

  let childPort;
  const childServer = http.createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(`<!doctype html><script>
      fetch('local-file://local/child-http.bin')
        .then(r => r.arrayBuffer())
        .then(b => parent.postMessage({ kind: 'child-http', bytes: b.byteLength }, '*'))
        .catch(e => parent.postMessage({ kind: 'child-http', error: String(e) }, '*'));
    </script>`);
  });
  childPort = await listen(childServer);

  const shellServer = http.createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<!doctype html><title>shell</title><main>shell</main>');
  });
  const shellPort = await listen(shellServer);
  const shellOrigin = `http://127.0.0.1:${shellPort}`;
  const childOrigin = `http://127.0.0.1:${childPort}`;

  win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  await win.loadURL(shellOrigin);
  result.renderer.httpTop = await win.webContents.executeJavaScript(`(async () => {
    const viaFetch = await fetch('local-file://local/top-http-fetch.bin')
      .then(async r => ({ status: r.status, bytes: (await r.arrayBuffer()).byteLength }))
      .catch(e => ({ error: String(e) }));
    const viaXhr = await new Promise(resolve => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => resolve({ status: xhr.status, bytes: xhr.response.byteLength });
      xhr.onerror = () => resolve({ error: 'xhr-error', status: xhr.status });
      xhr.open('GET', 'local-file://local/top-http-xhr.bin');
      xhr.send();
    });
    return { origin: location.origin, viaFetch, viaXhr };
  })()`, true);

  result.renderer.httpChild = await win.webContents.executeJavaScript(`new Promise(resolve => {
    const timer = setTimeout(() => resolve({ error: 'timeout' }), 4000);
    addEventListener('message', event => {
      if (event.data?.kind !== 'child-http') return;
      clearTimeout(timer);
      resolve({ frameOrigin: event.origin, ...event.data });
    }, { once: true });
    const frame = document.createElement('iframe');
    frame.src = ${JSON.stringify(childOrigin)};
    document.body.append(frame);
  })`, true);

  result.renderer.blobChild = await win.webContents.executeJavaScript(`new Promise(resolve => {
    const timer = setTimeout(() => resolve({ error: 'timeout' }), 4000);
    addEventListener('message', event => {
      if (event.data?.kind !== 'blob-child') return;
      clearTimeout(timer);
      resolve({ frameOrigin: event.origin, ...event.data });
    }, { once: true });
    const source = \`<script>
      fetch('local-file://local/blob-child.bin')
        .then(r => r.arrayBuffer())
        .then(b => parent.postMessage({ kind: 'blob-child', bytes: b.byteLength }, '*'))
        .catch(e => parent.postMessage({ kind: 'blob-child', error: String(e) }, '*'));
    <\\/script>\`;
    const frame = document.createElement('iframe');
    frame.sandbox = 'allow-scripts allow-same-origin';
    frame.src = URL.createObjectURL(new Blob([source], { type: 'text/html' }));
    document.body.append(frame);
  })`, true);

  const filePage = path.join(fixtureRoot, 'shell.html');
  fs.writeFileSync(filePage, '<!doctype html><title>file shell</title>');
  await win.loadFile(filePage);
  result.renderer.fileTop = await win.webContents.executeJavaScript(`(async () => {
    const viaFetch = await fetch('local-file://local/top-file-fetch.bin')
      .then(async r => ({ status: r.status, bytes: (await r.arrayBuffer()).byteLength }))
      .catch(e => ({ error: String(e) }));
    const viaXhr = await new Promise(resolve => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => resolve({ status: xhr.status, bytes: xhr.response.byteLength });
      xhr.onerror = () => resolve({ error: 'xhr-error', status: xhr.status });
      xhr.open('GET', 'local-file://local/top-file-xhr.bin');
      xhr.send();
    });
    return { origin: location.origin, href: location.href, viaFetch, viaXhr };
  })()`, true);

  result.expected = {
    topHttpOrigin: shellOrigin,
    childHttpOrigin: childOrigin,
    fileOrigin: 'file://',
  };
  result.outcome = 'Complete';
  writeResult();
  win.destroy();
  await close(shellServer);
  await close(childServer);
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  app.exit(0);
}).catch((error) => {
  result.outcome = 'ProbeError';
  result.error = { message: error.message, stack: error.stack };
  try { writeResult(); } catch {}
  try { fs.rmSync(fixtureRoot, { recursive: true, force: true }); } catch {}
  app.exit(2);
});
