const { app, BrowserWindow, protocol } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const WORKTREE = process.env.API_E2E_WORKTREE;
const WEB_ROOT = path.join(WORKTREE, 'autobyteus-web');
const FIXTURE_ROOT = process.env.API_E2E_FIXTURE_ROOT;
const PAGE_URL = process.env.API_E2E_PAGE_URL;
const OUTPUT = process.env.API_E2E_FETCH_RESULT_PATH;
const MODE = process.env.API_E2E_PRIVILEGE_MODE;
const { createLocalFileResponse } = require(path.join(WEB_ROOT, 'dist/electron/local-file-protocol/local-file-response.js'));
const { buildLocalFileUrl, LOCAL_FILE_SCHEME } = require(path.join(WEB_ROOT, 'dist/shared/localFileUrl.js'));

const privileges = { standard: true, stream: true };
if (MODE === 'fetch-only' || MODE === 'both') privileges.supportFetchAPI = true;
if (MODE === 'cors-only' || MODE === 'both') privileges.corsEnabled = true;

app.setName(`AutoByteusLocalPreviewFetchDifferential-${MODE}`);
app.setPath('userData', path.join(FIXTURE_ROOT, `electron-fetch-${MODE}-user-data`));
protocol.registerSchemesAsPrivileged([{ scheme: LOCAL_FILE_SCHEME, privileges }]);

const pdfUrl = buildLocalFileUrl(path.join(FIXTURE_ROOT, 'probe document.pdf'));
const excelUrl = buildLocalFileUrl(path.join(FIXTURE_ROOT, 'probe workbook.xlsx'));
const result = {
  runtime: null,
  mode: MODE,
  privileges,
  pageUrl: PAGE_URL,
  pdfUrl,
  excelUrl,
  handlerRequests: [],
  renderer: null,
  outcome: 'running',
};

app.whenReady().then(async () => {
  result.runtime = {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  };
  protocol.handle(LOCAL_FILE_SCHEME, async (request) => {
    const entry = { url: request.url, method: request.method };
    result.handlerRequests.push(entry);
    const response = await createLocalFileResponse(request);
    entry.status = response.status;
    return response;
  });
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  await win.loadURL(PAGE_URL);
  result.renderer = await win.webContents.executeJavaScript(`(async () => {
    const requestFetch = async (url) => {
      try {
        const response = await fetch(url);
        const bytes = await response.arrayBuffer();
        return { ok: response.ok, status: response.status, byteLength: bytes.byteLength };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    };
    const requestXhr = (url) => new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => resolve({ status: xhr.status, byteLength: xhr.response?.byteLength ?? 0 });
      xhr.onerror = () => resolve({ error: 'xhr-error', status: xhr.status });
      xhr.open('GET', url);
      xhr.send();
    });
    return {
      origin: location.origin,
      pdfFetch: await requestFetch(${JSON.stringify(pdfUrl)}),
      pdfXhr: await requestXhr(${JSON.stringify(pdfUrl)}),
      excelFetch: await requestFetch(${JSON.stringify(excelUrl)}),
    };
  })()`, true);
  result.outcome = result.renderer.pdfFetch?.status === 200
    && result.renderer.pdfXhr?.status === 200
    && result.renderer.excelFetch?.status === 200
    ? 'Pass'
    : 'Fail';
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log(`API_E2E_FETCH_DIFFERENTIAL ${JSON.stringify(result)}`);
  win.destroy();
  app.exit(0);
}).catch((error) => {
  result.outcome = 'ProbeError';
  result.error = { message: error.message, stack: error.stack };
  try { fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2)); } catch {}
  console.error(error);
  app.exit(2);
});
