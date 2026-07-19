const { app, BrowserWindow, protocol } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const mode = process.env.PROBE_MODE;
const webRoot = process.env.PROBE_WEB_ROOT;
const probeRoot = process.env.PROBE_ROOT;
const exactPath = process.env.PROBE_EXACT_VIDEO;
const specialPath = process.env.PROBE_SPECIAL_VIDEO;
const largePath = process.env.PROBE_LARGE_VIDEO;
const outputPath = process.env.PROBE_OUTPUT;
const scheme = 'local-file';
const privileges = mode === 'standard_stream' || mode === 'fixed_authority_standard_stream'
  ? { standard: true, stream: true }
  : { stream: true };

app.setName(`AutoByteusLocalUrlPrivilegeProbe-${mode}`);
app.setPath('userData', path.join(probeRoot, `user-data-${mode}`));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
protocol.registerSchemesAsPrivileged([{ scheme, privileges }]);

const { createLocalFileResponse } = require(path.join(webRoot, 'dist/electron/local-file-protocol/local-file-response.js'));

const buildLocalFileUrl = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const encoded = segments.map((segment, index) => (
    index === 0 && /^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)
  )).join('/');
  return mode === 'fixed_authority_standard_stream'
    ? `local-file://local${encoded.startsWith('/') ? encoded : `/${encoded}`}`
    : `local-file://${encoded}`;
};

const result = {
  schemaVersion: 1,
  mode,
  privileges,
  runtime: null,
  sources: [
    { id: 'exact', path: exactPath, rawUrl: buildLocalFileUrl(exactPath), seekTime: 120 },
    { id: 'url-significant', path: specialPath, rawUrl: buildLocalFileUrl(specialPath), seekTime: 120 },
    ...(mode === 'stream_only' || mode === 'fixed_authority_standard_stream'
      ? [{ id: 'large', path: largePath, rawUrl: buildLocalFileUrl(largePath), seekTime: 1800 }]
      : []),
  ],
  handlerRequests: [],
  rendererResults: [],
};

let server;
const finish = (code, error) => {
  if (error) result.error = { message: error.message, stack: error.stack };
  result.finishedAt = new Date().toISOString();
  try { fs.writeFileSync(outputPath, JSON.stringify(result, null, 2)); } catch {}
  try { server?.close(); } catch {}
  app.exit(code);
};

app.whenReady().then(async () => {
  result.runtime = {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  };

  protocol.handle(scheme, async (request) => {
    const record = {
      source: null,
      url: request.url,
      method: request.method,
      range: request.headers.get('range'),
      parsed: {
        href: new URL(request.url).href,
        hostname: new URL(request.url).hostname,
        pathname: new URL(request.url).pathname,
      },
      response: null,
    };
    for (const source of result.sources) {
      const encodedTail = source.rawUrl.split('/').at(-1);
      if (encodedTail && request.url.includes(encodedTail)) record.source = source.id;
    }
    let responseRequest = request;
    if (mode === 'fixed_authority_standard_stream') {
      const incoming = new URL(request.url);
      record.translatedRequestUrl = `local-file://${incoming.pathname}`;
      responseRequest = new Request(record.translatedRequestUrl, {
        method: request.method,
        headers: request.headers,
      });
    }
    const response = await createLocalFileResponse(responseRequest);
    record.response = {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    };
    result.handlerRequests.push(record);
    return response;
  });

  server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end('<!doctype html><html><body><main id="root"></main></body></html>');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const pageUrl = `http://127.0.0.1:${address.port}/probe`;
  result.runtime.pageUrl = pageUrl;

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });
  win.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) result.rendererConsole = [...(result.rendererConsole || []), { level, message }];
  });
  await win.loadURL(pageUrl);

  for (const source of result.sources) {
    const rendererResult = await win.webContents.executeJavaScript(`(async () => {
      const rawUrl = ${JSON.stringify(source.rawUrl)};
      const seekTime = ${JSON.stringify(source.seekTime)};
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'auto';
      video.controls = true;
      video.setAttribute('src', rawUrl);
      document.body.replaceChildren(video);
      const state = {
        rawUrl,
        attributeSrc: video.getAttribute('src'),
        propertySrcBeforeLoad: video.src,
        events: [],
      };
      const capture = (name) => state.events.push({
        name,
        readyState: video.readyState,
        networkState: video.networkState,
        duration: Number.isFinite(video.duration) ? video.duration : String(video.duration),
        currentTime: video.currentTime,
        currentSrc: video.currentSrc,
        error: video.error ? { code: video.error.code, message: video.error.message } : null,
      });
      for (const name of ['loadstart','durationchange','loadedmetadata','canplay','play','playing','pause','seeking','seeked','error','abort','stalled']) {
        video.addEventListener(name, () => capture(name));
      }
      const waitFor = (eventName, timeoutMs) => new Promise((resolve) => {
        if (eventName === 'loadedmetadata' && video.readyState >= 1 && Number.isFinite(video.duration)) return resolve({ kind: eventName });
        const onSuccess = () => done({ kind: eventName });
        const onError = () => done({ kind: 'error' });
        const timer = setTimeout(() => done({ kind: 'timeout' }), timeoutMs);
        const done = (value) => {
          clearTimeout(timer);
          video.removeEventListener(eventName, onSuccess);
          video.removeEventListener('error', onError);
          resolve(value);
        };
        video.addEventListener(eventName, onSuccess, { once: true });
        video.addEventListener('error', onError, { once: true });
      });
      video.load();
      const metadata = await waitFor('loadedmetadata', 30000);
      state.propertySrcAfterLoad = video.src;
      state.currentSrcAfterLoad = video.currentSrc;
      state.metadata = metadata;
      state.duration = Number.isFinite(video.duration) ? video.duration : String(video.duration);
      state.error = video.error ? { code: video.error.code, message: video.error.message } : null;
      if (metadata.kind !== 'loadedmetadata') return state;

      try {
        await video.play();
        await new Promise(r => setTimeout(r, 650));
        video.pause();
        state.playbackTime = video.currentTime;
      } catch (error) {
        state.playError = String(error && error.message || error);
      }

      const seekWait = waitFor('seeked', 30000);
      video.currentTime = seekTime;
      state.seek = await seekWait;
      state.seekedTime = video.currentTime;
      state.seekError = video.error ? { code: video.error.code, message: video.error.message } : null;
      if (state.seek.kind === 'seeked') {
        try {
          await video.play();
          await new Promise(r => setTimeout(r, 450));
          video.pause();
          state.afterSeekPlaybackTime = video.currentTime;
        } catch (error) {
          state.afterSeekPlayError = String(error && error.message || error);
        }
      }
      return state;
    })()`, true);
    rendererResult.id = source.id;
    result.rendererResults.push(rendererResult);
  }

  result.result = result.rendererResults.every((entry) => (
    entry.metadata?.kind === 'loadedmetadata'
    && entry.seek?.kind === 'seeked'
    && entry.afterSeekPlaybackTime > entry.seekedTime
  )) ? 'Pass' : 'Fail';
  win.destroy();
  finish(0);
}).catch((error) => finish(2, error));
