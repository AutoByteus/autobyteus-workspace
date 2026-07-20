const { app, BrowserWindow, protocol } = require('electron');
const fs = require('fs');
const path = require('path');

const WORKTREE = process.env.API_E2E_WORKTREE;
const WEB_ROOT = path.join(WORKTREE, 'autobyteus-web');
const FIXTURE_ROOT = process.env.API_E2E_FIXTURE_ROOT;
const RESULT_PATH = process.env.API_E2E_FAILURE_RESULT_PATH;
const PAGE_URL = process.env.API_E2E_PAGE_URL;
const VIDEO_PATH = '/Users/normy/autobyteus_org/autobyteus-tutorial-videos/multi-nodes-part-2_youtube_smaller.mp4';

app.setName('AutoByteusLocalPreviewFailureOriginProbe');
app.setPath('userData', path.join(FIXTURE_ROOT, 'electron-failure-origin-user-data'));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const lifecycle = require(path.join(WEB_ROOT, 'dist/electron/local-file-protocol/local-file-protocol.js'));
lifecycle.registerLocalFileProtocolScheme();

const buildLocalFileUrl = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/');
  const encoded = normalized.split('/').map((segment, index) => (
    index === 0 && /^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)
  )).join('/');
  return `local-file://${encoded}`;
};

const result = {
  runtime: null,
  productionUrl: buildLocalFileUrl(VIDEO_PATH),
  nodeParsedProductionUrl: null,
  handlerRequests: [],
  domOutcome: null,
  reproduction: null,
};
result.nodeParsedProductionUrl = {
  href: new URL(result.productionUrl).href,
  hostname: new URL(result.productionUrl).hostname,
  pathname: new URL(result.productionUrl).pathname,
};

app.whenReady().then(async () => {
  result.runtime = { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node, platform: process.platform, arch: process.arch };
  const originalHandle = protocol.handle.bind(protocol);
  protocol.handle = (scheme, handler) => originalHandle(scheme, async (request) => {
    result.handlerRequests.push({
      url: request.url,
      method: request.method,
      range: request.headers.get('range'),
      parsed: {
        hostname: new URL(request.url).hostname,
        pathname: new URL(request.url).pathname,
      },
    });
    return handler(request);
  });
  lifecycle.installLocalFileProtocol();

  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, backgroundThrottling: false } });
  await win.loadURL(PAGE_URL);
  result.domOutcome = await win.webContents.executeJavaScript(`(async () => {
    const started = Date.now();
    while (!window.__apiE2ELocalPreview) {
      if (Date.now() - started > 30000) throw new Error('hook timeout');
      await new Promise(r => setTimeout(r, 50));
    }
    window.__apiE2ELocalPreview.setVideoUrl(${JSON.stringify(buildLocalFileUrl(VIDEO_PATH))});
    while (true) {
      const video = document.querySelector('#video-subject video');
      const alert = document.querySelector('#video-subject [role="alert"]');
      if (video && video.readyState >= 1 && Number.isFinite(video.duration)) {
        return { kind: 'metadata', duration: video.duration, currentTime: video.currentTime, readyState: video.readyState, src: video.currentSrc || video.src };
      }
      if (alert) {
        return { kind: 'alert', text: alert.textContent.replace(/\\s+/g, ' ').trim(), videoPresent: Boolean(video), buttonText: alert.querySelector('button')?.textContent?.trim() || null };
      }
      if (Date.now() - started > 30000) return { kind: 'timeout', videoPresent: Boolean(video), readyState: video?.readyState ?? null, networkState: video?.networkState ?? null, errorCode: video?.error?.code ?? null };
      await new Promise(r => setTimeout(r, 50));
    }
  })()`, true);
  result.reproduction = {
    ticketScenarioResult: result.domOutcome.kind === 'metadata' ? 'Pass' : 'Fail',
    expected: 'finite metadata around 330.533333s',
    observed: result.domOutcome,
    canonicalizationMismatch: result.handlerRequests.some((entry) => entry.parsed.hostname.length > 1),
  };
  fs.writeFileSync(RESULT_PATH, JSON.stringify(result, null, 2));
  console.log(`API_E2E_FAILURE_ORIGIN ${JSON.stringify(result)}`);
  win.destroy();
  app.exit(0);
}).catch((error) => {
  result.probeError = { message: error.message, stack: error.stack };
  try { fs.writeFileSync(RESULT_PATH, JSON.stringify(result, null, 2)); } catch {}
  console.error(error);
  app.exit(2);
});
