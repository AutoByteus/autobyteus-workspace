const { app, BrowserWindow, net, protocol, session } = require('electron');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WORKTREE = process.env.API_E2E_WORKTREE;
const WEB_ROOT = path.join(WORKTREE, 'autobyteus-web');
const FIXTURE_ROOT = process.env.API_E2E_FIXTURE_ROOT;
const RESULT_PATH = process.env.API_E2E_RESULT_PATH;
const PAGE_URL = process.env.API_E2E_PAGE_URL;
const REPORTED_VIDEO = '/Users/normy/autobyteus_org/autobyteus-tutorial-videos/multi-nodes-part-2_youtube_smaller.mp4';
const LARGE_VIDEO = '/Users/normy/autobyteus_org/autobyteus-tutorial-videos/autobyteus_software_engineering_team_combined_no_audio.mp4';

app.setName('AutoByteusLocalPreviewApiE2E');
app.setPath('userData', path.join(FIXTURE_ROOT, 'electron-user-data'));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-media-suspend');

const lifecycleModule = require(path.join(WEB_ROOT, 'dist/electron/local-file-protocol/local-file-protocol.js'));
lifecycleModule.registerLocalFileProtocolScheme();

const report = {
  schemaVersion: 2,
  startedAt: new Date().toISOString(),
  runtime: {},
  scenarios: [],
  protocolRequests: [],
  protocolHandlerRequests: [],
  protocolCompletions: [],
  rendererConsoleErrors: [],
  cleanup: {},
  result: 'running',
};

const emit = (kind, data) => {
  const record = { at: new Date().toISOString(), kind, ...data };
  console.log(`API_E2E ${JSON.stringify(record)}`);
};

const recordScenario = (id, result, evidence) => {
  const record = { id, result, evidence };
  report.scenarios.push(record);
  emit('scenario', record);
};

const fail = (message, detail) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const assert = (condition, message, detail) => {
  if (!condition) fail(message, detail);
};

const {
  buildLocalFileUrl,
  parseLocalFileUrl,
} = require(path.join(WEB_ROOT, 'dist/shared/localFileUrl.js'));

const headerValue = (headers, name) => {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === wanted) return Array.isArray(value) ? value.join(', ') : String(value);
  }
  return null;
};

const requestProtocol = async (label, url, init = {}) => {
  try {
    const response = await net.fetch(url, init);
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      label,
      threw: false,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      byteLength: bytes.length,
      bytesHex: bytes.length <= 64 ? bytes.toString('hex') : `${bytes.subarray(0, 32).toString('hex')}...`,
      bytes,
    };
  } catch (error) {
    return {
      label,
      threw: true,
      error: error instanceof Error ? error.message : String(error),
      status: null,
      headers: {},
      byteLength: 0,
      bytes: Buffer.alloc(0),
    };
  }
};

const publicRequest = (item) => ({
  label: item.label,
  threw: item.threw,
  error: item.error,
  status: item.status,
  headers: item.headers,
  byteLength: item.byteLength,
  bytesHex: item.bytesHex,
});

const countOpenFileDescriptors = (filePath) => {
  let output = '';
  try {
    output = execFileSync('/usr/sbin/lsof', ['-n', '-P', '-p', String(process.pid)], { encoding: 'utf8' });
  } catch (error) {
    output = error.stdout || '';
  }
  return output.split(/\r?\n/).filter((line) => line.includes(filePath)).length;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runProtocolMatrix() {
  const bytesFile = path.join(FIXTURE_ROOT, 'Case Sensitive Ü%#', '视频 100%#1\\name.bin');
  const bytesUrl = buildLocalFileUrl(bytesFile);
  const scenarios = [];
  scenarios.push(await requestProtocol('full-get', bytesUrl));
  scenarios.push(await requestProtocol('closed-range', bytesUrl, { headers: { Range: 'bytes=2-5' } }));
  scenarios.push(await requestProtocol('open-range', bytesUrl, { headers: { Range: 'bytes=6-' } }));
  scenarios.push(await requestProtocol('suffix-range', bytesUrl, { headers: { Range: 'bytes=-3' } }));
  scenarios.push(await requestProtocol('clamped-range', bytesUrl, { headers: { Range: 'bytes=8-99' } }));
  scenarios.push(await requestProtocol('head-full', bytesUrl, { method: 'HEAD' }));
  scenarios.push(await requestProtocol('head-range', bytesUrl, { method: 'HEAD', headers: { Range: 'bytes=1-3' } }));
  for (const [label, range] of [
    ['malformed-unit', 'items=0-1'],
    ['empty-range', 'bytes='],
    ['multipart-range', 'bytes=1-2,4-5'],
    ['unsatisfiable-range', 'bytes=10-'],
    ['reverse-range', 'bytes=7-2'],
  ]) {
    scenarios.push(await requestProtocol(label, bytesUrl, { headers: { Range: range } }));
  }
  scenarios.push(await requestProtocol('unsupported-method', bytesUrl, { method: 'POST' }));
  scenarios.push(await requestProtocol('wrong-authority', 'local-file://wrong/absolute/video.mp4'));
  scenarios.push(await requestProtocol('legacy-empty-authority', `local-file://${bytesFile.split('/').map(encodeURIComponent).join('/')}`));
  scenarios.push(await requestProtocol('query-adornment', `${bytesUrl}?download=1`));
  scenarios.push(await requestProtocol('fragment-adornment', `${bytesUrl}#fragment`));
  scenarios.push(await requestProtocol('relative-path', 'local-file://relative/video.mp4'));
  scenarios.push(await requestProtocol('missing-path', buildLocalFileUrl(path.join(FIXTURE_ROOT, 'missing.bin'))));
  scenarios.push(await requestProtocol('directory-path', buildLocalFileUrl(path.join(FIXTURE_ROOT, 'a-directory'))));
  scenarios.push(await requestProtocol('unreadable-path', buildLocalFileUrl(path.join(FIXTURE_ROOT, 'unreadable.bin'))));
  scenarios.push(await requestProtocol('malformed-encoding', 'local-file:///%E0%A4%A'));

  const byLabel = Object.fromEntries(scenarios.map((item) => [item.label, item]));
  assert(bytesUrl.startsWith('local-file://local/'), 'Builder did not emit fixed authority', { bytesFile, bytesUrl });
  assert(parseLocalFileUrl(bytesUrl, process.platform) === bytesFile, 'Current URL did not round trip exact path', { bytesFile, bytesUrl });
  assert(bytesUrl.includes('%25') && bytesUrl.includes('%23') && bytesUrl.includes('%5C'), 'Significant path characters were not encoded exactly', { bytesFile, bytesUrl });
  assert(byLabel['full-get'].status === 200, 'Full GET did not return 200', publicRequest(byLabel['full-get']));
  assert(byLabel['full-get'].bytes.toString() === '0123456789', 'Full GET bytes changed', publicRequest(byLabel['full-get']));
  assert(byLabel['full-get'].headers['content-length'] === '10', 'Full GET length mismatch', publicRequest(byLabel['full-get']));
  assert(byLabel['full-get'].headers['accept-ranges'] === 'bytes', 'Full GET missing Accept-Ranges', publicRequest(byLabel['full-get']));
  assert(byLabel['full-get'].headers['cache-control'] === 'no-store', 'Full GET missing no-store', publicRequest(byLabel['full-get']));
  const rangeExpectations = {
    'closed-range': ['bytes 2-5/10', '2345'],
    'open-range': ['bytes 6-9/10', '6789'],
    'suffix-range': ['bytes 7-9/10', '789'],
    'clamped-range': ['bytes 8-9/10', '89'],
  };
  for (const [label, [contentRange, contents]] of Object.entries(rangeExpectations)) {
    const item = byLabel[label];
    assert(item.status === 206, `${label} did not return 206`, publicRequest(item));
    assert(item.headers['content-range'] === contentRange, `${label} content-range mismatch`, publicRequest(item));
    assert(item.headers['content-length'] === String(Buffer.byteLength(contents)), `${label} length mismatch`, publicRequest(item));
    assert(item.bytes.toString() === contents, `${label} bytes mismatch`, publicRequest(item));
  }
  assert(byLabel['head-full'].status === 200 && byLabel['head-full'].byteLength === 0, 'HEAD full returned bytes or wrong status', publicRequest(byLabel['head-full']));
  assert(byLabel['head-range'].status === 206 && byLabel['head-range'].byteLength === 0, 'HEAD range returned bytes or wrong status', publicRequest(byLabel['head-range']));
  assert(byLabel['head-range'].headers['content-range'] === 'bytes 1-3/10', 'HEAD range header mismatch', publicRequest(byLabel['head-range']));
  for (const label of ['malformed-unit', 'empty-range', 'multipart-range', 'unsatisfiable-range', 'reverse-range']) {
    const item = byLabel[label];
    assert(item.status === 416 && item.byteLength === 0, `${label} was not a no-byte 416`, publicRequest(item));
    assert(item.headers['content-range'] === 'bytes */10', `${label} missing 416 content-range`, publicRequest(item));
  }
  assert(byLabel['unsupported-method'].status === 405 && byLabel['unsupported-method'].byteLength === 0, 'POST was not a no-byte 405', publicRequest(byLabel['unsupported-method']));
  assert(byLabel['unsupported-method'].headers.allow === 'GET, HEAD', 'POST Allow header mismatch', publicRequest(byLabel['unsupported-method']));
  for (const label of ['wrong-authority', 'legacy-empty-authority', 'query-adornment', 'fragment-adornment', 'relative-path', 'missing-path', 'directory-path', 'unreadable-path']) {
    const item = byLabel[label];
    assert(item.status === 404 && item.byteLength === 0, `${label} was not a no-byte 404`, publicRequest(item));
  }
  const malformed = byLabel['malformed-encoding'];
  assert((malformed.status === 404 || malformed.threw) && malformed.byteLength === 0, 'Malformed URL returned source bytes', publicRequest(malformed));
  recordScenario('E2E-PROTO-001', 'Pass', { requests: scenarios.map(publicRequest) });
  recordScenario('E2E-SEC-001', 'Pass', {
    noByteFailures: ['malformed-unit', 'empty-range', 'multipart-range', 'unsatisfiable-range', 'reverse-range', 'unsupported-method', 'wrong-authority', 'legacy-empty-authority', 'query-adornment', 'fragment-adornment', 'relative-path', 'missing-path', 'directory-path', 'unreadable-path', 'malformed-encoding'].map((label) => publicRequest(byLabel[label])),
  });
}

async function execute(win, source) {
  return win.webContents.executeJavaScript(source, true);
}

async function waitForHook(win) {
  return execute(win, `(async () => {
    const started = Date.now();
    while (!window.__apiE2ELocalPreview) {
      if (Date.now() - started > 30000) throw new Error('probe page hook timeout');
      await new Promise(r => setTimeout(r, 50));
    }
    return true;
  })()`);
}

async function setVideoUrl(win, url) {
  return execute(win, `window.__apiE2ELocalPreview.setVideoUrl(${JSON.stringify(url)}); true`);
}

async function setFile(win, file) {
  return execute(win, `window.__apiE2ELocalPreview.setFile(${JSON.stringify(file)}); true`);
}

async function waitForAlert(win, timeout = 20000) {
  return execute(win, `(async () => {
    const started = Date.now();
    while (true) {
      const alert = document.querySelector('#video-subject [role="alert"]');
      if (alert) return {
        text: alert.textContent.replace(/\\s+/g, ' ').trim(),
        buttonText: alert.querySelector('button')?.textContent?.trim() || null,
        videoPresent: Boolean(document.querySelector('#video-subject video')),
      };
      if (Date.now() - started > ${timeout}) throw new Error('video alert timeout');
      await new Promise(r => setTimeout(r, 50));
    }
  })()`);
}

async function waitForVideoMetadata(win, timeout = 30000) {
  return execute(win, `(async () => {
    const started = Date.now();
    while (true) {
      const video = document.querySelector('#video-subject video');
      if (video && video.readyState >= 1 && Number.isFinite(video.duration)) {
        return {
          readyState: video.readyState,
          networkState: video.networkState,
          duration: video.duration,
          currentTime: video.currentTime,
          attempt: video.dataset.mediaAttempt,
          authoredAttribute: video.getAttribute('src'),
          propertySrc: video.src,
          currentSrc: video.currentSrc,
          src: video.currentSrc || video.src,
          error: video.error ? { code: video.error.code, message: video.error.message } : null,
        };
      }
      if (video?.error) throw new Error('video metadata failed code=' + video.error.code + ' message=' + video.error.message);
      if (Date.now() - started > ${timeout}) throw new Error('video metadata timeout');
      await new Promise(r => setTimeout(r, 50));
    }
  })()`);
}

async function runAuthoredNormalizationMatrix(win) {
  const significantUrl = buildLocalFileUrl(path.join(FIXTURE_ROOT, 'Case Sensitive Ü%#', '视频 100%#1\\name.bin'));
  const authored = [
    ['canonical-significant', significantUrl],
    ['raw-port', significantUrl.replace('://local/', '://local:99/')],
    ['raw-credentials', significantUrl.replace('://local/', '://user:pass@local/')],
    ['query', `${significantUrl}?download=1`],
    ['fragment', `${significantUrl}#fragment`],
    ['wrong-authority', significantUrl.replace('://local/', '://wrong/')],
    ['legacy-empty-authority', `local-file://${path.join(FIXTURE_ROOT, 'Case Sensitive Ü%#', '视频 100%#1\\name.bin').split('/').map(encodeURIComponent).join('/')}`],
  ];
  const results = [];
  for (const [label, rawUrl] of authored) {
    const handlerStart = report.protocolHandlerRequests.length;
    const renderer = await execute(win, `(async () => {
      const root = document.querySelector('#normalization-subject');
      const img = document.createElement('img');
      img.setAttribute('src', ${JSON.stringify(rawUrl)});
      root.replaceChildren(img);
      const state = {
        authored: img.getAttribute('src'),
        propertyBefore: img.src,
        currentSrcBefore: img.currentSrc,
      };
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 5000);
        const done = () => { clearTimeout(timer); resolve(); };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
      state.propertyAfter = img.src;
      state.currentSrcAfter = img.currentSrc;
      return state;
    })()`);
    await sleep(50);
    results.push({ label, rawUrl, renderer, handlerRequests: report.protocolHandlerRequests.slice(handlerStart) });
  }
  const byLabel = Object.fromEntries(results.map(item => [item.label, item]));
  for (const label of ['canonical-significant', 'raw-port', 'raw-credentials']) {
    const item = byLabel[label];
    assert(item.handlerRequests.length > 0, `${label} did not reach the normalized handler`, item);
    assert(item.handlerRequests[0].url === significantUrl, `${label} normalized handler URL mismatch`, item);
  }
  assert(byLabel['canonical-significant'].renderer.propertyAfter === significantUrl, 'Canonical significant URL changed in renderer', byLabel['canonical-significant']);
  assert(byLabel['raw-port'].renderer.propertyAfter === significantUrl, 'Electron did not erase raw port as expected', byLabel['raw-port']);
  assert(byLabel['raw-credentials'].renderer.propertyAfter === significantUrl, 'Electron did not erase raw credentials as expected', byLabel['raw-credentials']);
  for (const label of ['query', 'fragment', 'wrong-authority', 'legacy-empty-authority']) {
    const item = byLabel[label];
    assert(item.handlerRequests.length > 0 && item.handlerRequests.every(request => request.status === 404), `${label} was not rejected at normalized handler`, item);
  }
  return { significantUrl, results };
}

async function runVideoAndViewerJourneys() {
  const win = new BrowserWindow({
    show: false,
    width: 1000,
    height: 800,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) report.rendererConsoleErrors.push({ level, message });
  });
  await win.loadURL(PAGE_URL);
  await waitForHook(win);
  const normalizationMatrix = await runAuthoredNormalizationMatrix(win);

  const missingUrl = buildLocalFileUrl(path.join(FIXTURE_ROOT, 'missing video.mp4'));
  await execute(win, `(() => {
    window.__apiE2EAttempts = [];
    window.__apiE2EObserver = new MutationObserver(() => {
      document.querySelectorAll('#video-subject video[data-media-attempt]').forEach((node) => {
        if (!window.__apiE2EAttempts.includes(node.dataset.mediaAttempt)) window.__apiE2EAttempts.push(node.dataset.mediaAttempt);
      });
    });
    window.__apiE2EObserver.observe(document.querySelector('#video-subject'), { childList: true, subtree: true });
    return true;
  })()`);
  await setVideoUrl(win, missingUrl);
  const missingAlert = await waitForAlert(win);
  assert(missingAlert.videoPresent === false, 'Failed video element was not removed', missingAlert);
  assert(/could not be played/i.test(missingAlert.text), 'Missing resource alert copy mismatch', missingAlert);
  assert(missingAlert.buttonText === 'Retry', 'Retry control missing', missingAlert);
  await execute(win, `document.querySelector('#video-subject [role="alert"] button').click(); true`);
  await execute(win, `(async () => {
    const started = Date.now();
    while (window.__apiE2EAttempts.length < 2) {
      if (Date.now() - started > 10000) throw new Error('retry fresh element timeout');
      await new Promise(r => setTimeout(r, 25));
    }
    return true;
  })()`);
  const retryAlert = await waitForAlert(win);
  const attemptsAfterRetry = await execute(win, `window.__apiE2EAttempts.slice()`);
  assert(attemptsAfterRetry.length >= 2 && new Set(attemptsAfterRetry).size >= 2, 'Retry did not mount a fresh media attempt', { attemptsAfterRetry, retryAlert });

  const unsupportedUrl = buildLocalFileUrl(path.join(FIXTURE_ROOT, 'unsupported video.mp4'));
  await setVideoUrl(win, unsupportedUrl);
  const decodeAlert = await waitForAlert(win);
  assert(/could not be played/i.test(decodeAlert.text) && decodeAlert.videoPresent === false, 'Decode failure did not produce generic alert', decodeAlert);

  const reportedUrl = buildLocalFileUrl(REPORTED_VIDEO);
  const requestIndexBeforeReported = report.protocolRequests.length;
  await setVideoUrl(win, reportedUrl);
  const metadata = await waitForVideoMetadata(win, 45000);
  assert(Math.abs(metadata.duration - 330.533333) < 0.1, 'Reported duration mismatch', metadata);
  assert(metadata.authoredAttribute === reportedUrl && metadata.propertySrc === reportedUrl && metadata.currentSrc === reportedUrl,
    'Reported video URL changed between authored/property/currentSrc observations', { reportedUrl, metadata });
  assert(Number(metadata.attempt) > Math.max(...attemptsAfterRetry.map(Number)),
    'URL recovery did not create a fresh media attempt', { metadata, attemptsAfterRetry });
  const playPause = await execute(win, `(async () => {
    const video = document.querySelector('#video-subject video');
    video.muted = true;
    const start = video.currentTime;
    await video.play();
    await new Promise(r => setTimeout(r, 1200));
    const advanced = video.currentTime;
    video.pause();
    const pausedAt = video.currentTime;
    await new Promise(r => setTimeout(r, 500));
    return { start, advanced, pausedAt, afterPause: video.currentTime, paused: video.paused, error: video.error ? video.error.code : null };
  })()`);
  assert(playPause.advanced - playPause.start > 0.25, 'Current time did not advance while playing', playPause);
  assert(playPause.paused && Math.abs(playPause.afterPause - playPause.pausedAt) < 0.15, 'Video did not stay paused', playPause);
  const seek = await execute(win, `(async () => {
    const video = document.querySelector('#video-subject video');
    const target = 120;
    const seeked = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('seek timeout')), 30000);
      video.addEventListener('seeked', () => { clearTimeout(timer); resolve(); }, { once: true });
      video.addEventListener('error', () => { clearTimeout(timer); reject(new Error('seek media error ' + video.error?.code)); }, { once: true });
    });
    video.currentTime = target;
    await seeked;
    const atSeek = video.currentTime;
    await video.play();
    await new Promise(r => setTimeout(r, 900));
    const continued = video.currentTime;
    video.pause();
    return { target, atSeek, continued, error: video.error ? video.error.code : null };
  })()`);
  assert(Math.abs(seek.atSeek - 120) < 1, 'Reported video did not seek to 120s', seek);
  assert(seek.continued - seek.atSeek > 0.2, 'Playback did not continue after seek', seek);
  const reportedRequests = report.protocolRequests.slice(requestIndexBeforeReported);
  recordScenario('E2E-VID-001', 'Pass', { metadata, playPause, seek, requests: reportedRequests, normalizationMatrix });

  const specialVideoPath = path.join(FIXTURE_ROOT, 'Case Sensitive Ü%#', 'Video 100%#1\\name.mp4');
  const specialVideoUrl = buildLocalFileUrl(specialVideoPath);
  const specialRequestStart = report.protocolHandlerRequests.length;
  await setVideoUrl(win, specialVideoUrl);
  const specialMetadata = await waitForVideoMetadata(win, 45000);
  assert(Math.abs(specialMetadata.duration - 330.533333) < 0.1, 'Significant-path video duration mismatch', specialMetadata);
  assert(specialMetadata.authoredAttribute === specialVideoUrl && specialMetadata.propertySrc === specialVideoUrl && specialMetadata.currentSrc === specialVideoUrl,
    'Significant-path media URL changed across renderer observations', { specialVideoUrl, specialMetadata });
  const specialHandlerRequests = report.protocolHandlerRequests.slice(specialRequestStart);
  assert(specialHandlerRequests.length > 0 && specialHandlerRequests.every(item => item.url === specialVideoUrl),
    'Significant-path handler URL changed', { specialVideoUrl, specialHandlerRequests });

  const largeUrl = buildLocalFileUrl(LARGE_VIDEO);
  const cancellationController = new AbortController();
  const cancellationResponse = await net.fetch(largeUrl, {
    headers: { Range: 'bytes=0-' },
    signal: cancellationController.signal,
  });
  const cancellationReader = cancellationResponse.body.getReader();
  const cancellationFirstChunk = await cancellationReader.read();
  const cancellationFdsDuring = countOpenFileDescriptors(LARGE_VIDEO);
  cancellationController.abort('API/E2E explicit initial-body cancellation');
  try { await cancellationReader.cancel('API/E2E explicit initial-body cancellation'); } catch {}
  let cancellationFdsAfter = countOpenFileDescriptors(LARGE_VIDEO);
  const cancellationWaitStarted = Date.now();
  while (cancellationFdsAfter > 0 && Date.now() - cancellationWaitStarted < 5000) {
    await sleep(100);
    cancellationFdsAfter = countOpenFileDescriptors(LARGE_VIDEO);
  }
  const cancellationReleaseMs = Date.now() - cancellationWaitStarted;
  assert(cancellationResponse.status === 206 && cancellationFirstChunk.value?.byteLength > 0 && cancellationFirstChunk.value.byteLength <= 64 * 1024,
    'Explicit streaming cancellation did not begin with one bounded range chunk', { status: cancellationResponse.status, firstChunkLength: cancellationFirstChunk.value?.byteLength });
  assert(cancellationFdsDuring >= 1 && cancellationFdsAfter === 0, 'Explicit abort did not show bounded open-then-closed handle ownership', { cancellationFdsDuring, cancellationFdsAfter, cancellationReleaseMs });

  const requestIndexBeforeLarge = report.protocolRequests.length;
  await setVideoUrl(win, largeUrl);
  const largeMetadata = await waitForVideoMetadata(win, 60000);
  const fdsDuringLarge = countOpenFileDescriptors(LARGE_VIDEO);
  const largeSeek = await execute(win, `(async () => {
    const video = document.querySelector('#video-subject video');
    const target = 1800;
    const seeked = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('large seek timeout')), 60000);
      video.addEventListener('seeked', () => { clearTimeout(timer); resolve(); }, { once: true });
      video.addEventListener('error', () => { clearTimeout(timer); reject(new Error('large seek media error ' + video.error?.code)); }, { once: true });
    });
    video.currentTime = target;
    await seeked;
    const atSeek = video.currentTime;
    await video.play();
    await new Promise(r => setTimeout(r, 900));
    const continued = video.currentTime;
    video.pause();
    return { target, atSeek, continued, error: video.error ? video.error.code : null };
  })()`);
  await sleep(300);
  const largeRequests = report.protocolRequests.slice(requestIndexBeforeLarge);
  const ranges = largeRequests.map((item) => item.range).filter(Boolean);
  const laterRanges = ranges.filter((range) => {
    const match = /^bytes=(\d+)-/i.exec(range);
    return match && Number(match[1]) > 0;
  });
  assert(Math.abs(largeSeek.atSeek - 1800) < 1, 'Large video did not seek to 1800s', { largeMetadata, largeSeek, ranges });
  assert(largeSeek.continued - largeSeek.atSeek > 0.2, 'Large video did not continue after seek', { largeSeek, ranges });
  assert(laterRanges.length > 0, 'Chromium did not issue an observable later byte range', { ranges, largeRequests });
  await execute(win, `(() => {
    const video = document.querySelector('#video-subject video');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    window.__apiE2ELocalPreview.setVideoUrl(null);
    return true;
  })()`);
  await execute(win, `(async () => {
    const started = Date.now();
    while (document.querySelector('#video-subject video')) {
      if (Date.now() - started > 5000) throw new Error('large video element release timeout');
      await new Promise(r => setTimeout(r, 25));
    }
    return true;
  })()`);
  let fdsAfterRelease = countOpenFileDescriptors(LARGE_VIDEO);
  const mediaReleaseStarted = Date.now();
  while (fdsAfterRelease > 0 && Date.now() - mediaReleaseStarted < 5000) {
    await sleep(100);
    fdsAfterRelease = countOpenFileDescriptors(LARGE_VIDEO);
  }
  const mediaReleaseMs = Date.now() - mediaReleaseStarted;
  assert(fdsAfterRelease === 0, 'Large video file handle remained open after explicit media-element release', { fdsDuringLarge, fdsAfterRelease, mediaReleaseMs, ranges });
  recordScenario('E2E-VID-002', 'Pass', { largeMetadata, largeSeek, ranges, laterRanges, fdsDuringLarge, fdsAfterRelease, mediaReleaseMs, explicitCancellation: { status: cancellationResponse.status, firstChunkLength: cancellationFirstChunk.value?.byteLength, fdsDuring: cancellationFdsDuring, fdsAfter: cancellationFdsAfter, releaseMs: cancellationReleaseMs }, requests: largeRequests });

  const protocolStartBeforeAttachments = report.protocolHandlerRequests.length;
  const imagePath = path.join(FIXTURE_ROOT, 'probe image.png');
  const attachmentLifecycle = await execute(win, `window.__apiE2ELocalPreview.runAttachmentLifecycle(${JSON.stringify({
    canonicalImage: '${CANONICAL_IMAGE}',
    legacyPosix: '${LEGACY_POSIX}',
    legacyWindows: 'local-file://C:/Media/My%20Video%25%231.mp4',
    embeddedImagePath: '${EMBEDDED_IMAGE}',
    invalidLocators: [
      '${RAW_CREDENTIALS}', '${RAW_PORT}', '${RAW_QUERY}', '${RAW_FRAGMENT}',
      'local-file://wrong/path/image.png', 'local-file://opaque/image.png', 'local-file:not-absolute', 'local-file:///%E0%A4%A'
    ],
  }).replaceAll('${CANONICAL_IMAGE}', buildLocalFileUrl(imagePath)).replaceAll('${LEGACY_POSIX}', `local-file://${imagePath.split('/').map(encodeURIComponent).join('/')}`).replaceAll('${EMBEDDED_IMAGE}', imagePath).replaceAll('${RAW_CREDENTIALS}', buildLocalFileUrl(imagePath).replace('://local/', '://user:pass@local/')).replaceAll('${RAW_PORT}', buildLocalFileUrl(imagePath).replace('://local/', '://local:99/')).replaceAll('${RAW_QUERY}', `${buildLocalFileUrl(imagePath)}?download=1`).replaceAll('${RAW_FRAGMENT}', `${buildLocalFileUrl(imagePath)}#fragment`)});`);
  assert(attachmentLifecycle.canonicalHydration.locator === buildLocalFileUrl(imagePath), 'Canonical attachment was not idempotent', attachmentLifecycle);
  assert(attachmentLifecycle.legacyPosix.locator === buildLocalFileUrl(imagePath), 'Legacy POSIX locator did not migrate exactly', attachmentLifecycle);
  assert(attachmentLifecycle.legacyWindows.locator === 'local-file://local/C:/Media/My%20Video%25%231.mp4', 'Legacy Windows locator did not migrate', attachmentLifecycle);
  assert(attachmentLifecycle.invalid.every(item => item.kind === 'unsupported_local_file' && !item.isOpenable && item.previewUrl === null), 'Raw invalid locators were not quarantined', attachmentLifecycle.invalid);
  assert(attachmentLifecycle.plan.executable.contextFilePaths.join(',') === '/tmp/current.md'
    && attachmentLifecycle.plan.executable.imageUrls.join(',') === buildLocalFileUrl(imagePath), 'Executable plan included unsupported metadata or lost valid items', attachmentLifecycle.plan);
  assert(attachmentLifecycle.emptyEcho.length === 1 && attachmentLifecycle.emptyEcho[0].kind === 'unsupported_local_file', 'Empty member echo did not retain unsupported metadata', attachmentLifecycle.emptyEcho);
  assert(attachmentLifecycle.mixedEcho.some(item => item.kind === 'unsupported_local_file')
    && attachmentLifecycle.mixedEcho.some(item => item.locator === buildLocalFileUrl(imagePath)), 'Mixed member echo did not retain unsupported and refresh valid items', attachmentLifecycle.mixedEcho);
  assert(attachmentLifecycle.historicalReload[0].kind === 'unsupported_local_file', 'Historical unsupported projection was not readable', attachmentLifecycle.historicalReload);
  assert(!attachmentLifecycle.freshReload.some(item => item.kind === 'unsupported_local_file'), 'New unsupported metadata persisted into fresh reload', attachmentLifecycle.freshReload);
  assert(attachmentLifecycle.nonLocal.kind === 'external_url' && attachmentLifecycle.nonLocal.locator === 'https://cdn.example/current.png', 'Non-local locator changed', attachmentLifecycle.nonLocal);
  assert(attachmentLifecycle.embeddedImage.previewUrl === buildLocalFileUrl(imagePath), 'Embedded absolute image did not use canonical URL', attachmentLifecycle.embeddedImage);
  const messageDom = await execute(win, `(async () => {
    const started = Date.now();
    while (true) {
      const subject = document.querySelector('#message-subject');
      const thumbnail = subject.querySelector('img.message-attachment-thumbnail');
      const unsupported = Array.from(subject.querySelectorAll('span.message-attachment-chip')).find(node => node.textContent.includes('opaque image.png'));
      if (thumbnail?.complete && thumbnail.naturalWidth > 0 && unsupported) {
        return {
          buttonCount: subject.querySelectorAll('button').length,
          thumbnailSrc: thumbnail.currentSrc || thumbnail.src,
          unsupportedText: unsupported.textContent.trim(),
          unsupportedTag: unsupported.tagName,
          unsupportedInButton: Boolean(unsupported.closest('button')),
        };
      }
      if (Date.now() - started > 20000) throw new Error('context attachment message DOM timeout');
      await new Promise(r => setTimeout(r, 50));
    }
  })()`);
  assert(messageDom.thumbnailSrc === buildLocalFileUrl(imagePath) && messageDom.unsupportedTag === 'SPAN' && !messageDom.unsupportedInButton,
    'Valid/unsupported attachment presentation mismatch', messageDom);
  const removedAttachments = await execute(win, `window.__apiE2ELocalPreview.removeMessageAttachment('local-file://opaque/image.png')`);
  const removedDom = await execute(win, `({
    unsupportedVisible: document.querySelector('#message-subject').textContent.includes('opaque image.png'),
    attachmentCount: document.querySelectorAll('#message-subject li').length,
  })`);
  assert(!removedDom.unsupportedVisible && !removedAttachments.some(item => item.kind === 'unsupported_local_file'), 'Unsupported attachment removal identity failed', { removedAttachments, removedDom });
  const attachmentProtocolRequests = report.protocolHandlerRequests.slice(protocolStartBeforeAttachments);
  assert(!attachmentProtocolRequests.some(item => item.url.includes('opaque')), 'Unsupported attachment reached protocol', attachmentProtocolRequests);

  recordScenario('E2E-UI-001', 'Pass', { missingAlert, retryAlert, attemptsAfterRetry, decodeAlert, recoveredMetadata: metadata, attachmentLifecycle, messageDom, removedDom });
  const securityScenario = report.scenarios.find(item => item.id === 'E2E-SEC-001');
  securityScenario.evidence.normalizationMatrix = normalizationMatrix;
  securityScenario.evidence.attachmentLifecycle = attachmentLifecycle;
  securityScenario.evidence.unsupportedProtocolRequests = attachmentProtocolRequests.filter(item => item.url.includes('opaque'));

  const sharedResults = { attachmentLifecycle, messageDom, removedAttachments, removedDom, attachmentProtocolRequests };
  await setFile(win, { path: imagePath, type: 'Image', content: null, url: buildLocalFileUrl(imagePath) });
  sharedResults.image = await execute(win, `(async () => {
    const started = Date.now();
    while (true) {
      const image = document.querySelector('#file-subject img.image-content');
      if (image?.complete && image.naturalWidth > 0) return { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, src: image.currentSrc || image.src };
      if (Date.now() - started > 20000) throw new Error('image preview timeout');
      await new Promise(r => setTimeout(r, 50));
    }
  })()`);

  const audioPath = path.join(FIXTURE_ROOT, 'probe audio.wav');
  await setFile(win, { path: audioPath, type: 'Audio', content: null, url: buildLocalFileUrl(audioPath) });
  sharedResults.audio = await execute(win, `(async () => {
    const started = Date.now();
    let audio;
    while (true) {
      audio = document.querySelector('#file-subject audio');
      if (audio && audio.readyState >= 1 && Number.isFinite(audio.duration)) break;
      if (audio?.error) throw new Error('audio media error ' + audio.error.code);
      if (Date.now() - started > 20000) throw new Error('audio metadata timeout');
      await new Promise(r => setTimeout(r, 50));
    }
    const duration = audio.duration;
    audio.muted = true;
    const start = audio.currentTime;
    await audio.play();
    await new Promise(r => setTimeout(r, 600));
    const advanced = audio.currentTime;
    audio.pause();
    return { duration, start, advanced, paused: audio.paused, error: audio.error ? audio.error.code : null };
  })()`);
  assert(sharedResults.audio.duration > 2.5 && sharedResults.audio.advanced - sharedResults.audio.start > 0.15, 'Local audio preview did not load/play', sharedResults.audio);

  const pdfPath = path.join(FIXTURE_ROOT, 'probe document.pdf');
  await setFile(win, { path: pdfPath, type: 'PDF', content: null, url: buildLocalFileUrl(pdfPath) });
  sharedResults.pdf = await execute(win, `(async () => {
    const started = Date.now();
    while (true) {
      const canvas = document.querySelector('#file-subject .pdf-content canvas');
      const alert = document.querySelector('#file-subject [role="alert"]');
      if (canvas && canvas.width > 0) return { result: 'Pass', canvasWidth: canvas.width, canvasHeight: canvas.height, alert: null };
      if (alert) return { result: 'Fail', alert: alert.textContent.replace(/\\s+/g, ' ').trim() };
      if (Date.now() - started > 30000) throw new Error('pdf preview timeout');
      await new Promise(r => setTimeout(r, 100));
    }
  })()`);

  const excelPath = path.join(FIXTURE_ROOT, 'probe workbook.xlsx');
  await setFile(win, { path: excelPath, type: 'Excel', content: null, url: buildLocalFileUrl(excelPath) });
  sharedResults.excel = await execute(win, `(async () => {
    const started = Date.now();
    while (true) {
      const table = document.querySelector('#file-subject .sheet-table table');
      const error = document.querySelector('#file-subject .error-state .error-text');
      if (table) return { result: 'Pass', text: table.textContent.replace(/\\s+/g, ' ').trim() };
      if (error) return { result: 'Fail', error: error.textContent.trim() };
      if (Date.now() - started > 30000) throw new Error('excel preview timeout');
      await new Promise(r => setTimeout(r, 100));
    }
  })()`);
  if (sharedResults.excel.result === 'Pass') {
    assert(/alpha/.test(sharedResults.excel.text) && /beta/.test(sharedResults.excel.text), 'Excel preview content mismatch', sharedResults.excel);
  }

  const protocolCountBeforeText = report.protocolHandlerRequests.length;
  const textPath = path.join(FIXTURE_ROOT, 'probe notes.md');
  const textContent = fs.readFileSync(textPath, 'utf8');
  await setFile(win, { path: textPath, type: 'Text', content: textContent, url: null });
  sharedResults.text = await execute(win, `(async () => {
    const started = Date.now();
    while (true) {
      const subject = document.querySelector('#file-subject');
      if (subject && subject.textContent.includes('Probe text OK')) return { text: subject.textContent.replace(/\\s+/g, ' ').trim() };
      if (Date.now() - started > 20000) throw new Error('text preview timeout');
      await new Promise(r => setTimeout(r, 50));
    }
  })()`);
  sharedResults.textProtocolRequestCount = report.protocolHandlerRequests.length - protocolCountBeforeText;
  assert(sharedResults.textProtocolRequestCount === 0, 'Text preview unexpectedly used the local-file protocol', sharedResults.text);
  const sharedViewerPass = sharedResults.pdf.result === 'Pass' && sharedResults.excel.result === 'Pass';
  recordScenario('E2E-REG-001', sharedViewerPass ? 'Pass' : 'Fail', sharedResults);
  assert(sharedViewerPass, 'Representative shared viewer regression failed', sharedResults);

  win.destroy();
  return { missingAlert, retryAlert, decodeAlert, metadata, playPause, seek, specialMetadata, largeMetadata, largeSeek, normalizationMatrix, attachmentLifecycle, sharedResults };
}

async function main() {
  report.runtime = {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    locale: app.getLocale(),
    pageUrl: PAGE_URL,
    userData: app.getPath('userData'),
    home: process.env.HOME,
  };
  assert(process.versions.electron === '42.4.1', 'Wrong Electron runtime', report.runtime);
  const originalProtocolHandle = protocol.handle.bind(protocol);
  protocol.handle = (scheme, handler) => originalProtocolHandle(scheme, async (request) => {
    const parsed = new URL(request.url);
    const record = {
      url: request.url,
      method: request.method,
      range: request.headers.get('range'),
      parsed: {
        href: parsed.href,
        hostname: parsed.hostname,
        pathname: parsed.pathname,
        port: parsed.port,
        username: parsed.username,
        password: parsed.password,
        search: parsed.search,
        hash: parsed.hash,
      },
      at: new Date().toISOString(),
    };
    report.protocolHandlerRequests.push(record);
    const response = await handler(request);
    record.status = response.status;
    record.responseHeaders = Object.fromEntries(response.headers.entries());
    return response;
  });
  lifecycleModule.installLocalFileProtocol();

  const webRequest = session.defaultSession.webRequest;
  const filter = { urls: ['local-file://*/*'] };
  webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const entry = {
      id: details.id,
      url: details.url,
      method: details.method,
      range: headerValue(details.requestHeaders, 'range'),
      resourceType: details.resourceType,
      webContentsId: details.webContentsId,
      timestamp: Date.now(),
    };
    report.protocolRequests.push(entry);
    emit('protocol-request', entry);
    callback({ requestHeaders: details.requestHeaders });
  });
  webRequest.onCompleted(filter, (details) => {
    const entry = { id: details.id, url: details.url, method: details.method, statusCode: details.statusCode, fromCache: details.fromCache, timestamp: Date.now() };
    report.protocolCompletions.push({ ...entry, outcome: 'completed' });
    emit('protocol-completed', entry);
  });
  webRequest.onErrorOccurred(filter, (details) => {
    const entry = { id: details.id, url: details.url, method: details.method, error: details.error, timestamp: Date.now() };
    report.protocolCompletions.push({ ...entry, outcome: 'error' });
    emit('protocol-error', entry);
  });

  emit('runtime', report.runtime);
  await runProtocolMatrix();
  await runVideoAndViewerJourneys();

  await sleep(500);
  report.cleanup.reportedVideoFds = countOpenFileDescriptors(REPORTED_VIDEO);
  report.cleanup.largeVideoFds = countOpenFileDescriptors(LARGE_VIDEO);
  assert(report.cleanup.reportedVideoFds === 0 && report.cleanup.largeVideoFds === 0, 'Video file descriptors remained open at probe end', report.cleanup);
  report.result = 'Pass';
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(RESULT_PATH, JSON.stringify(report, null, 2));
  emit('result', { result: report.result, cleanup: report.cleanup, scenarioCount: report.scenarios.length });
  app.exit(0);
}

app.whenReady().then(main).catch((error) => {
  report.result = 'Fail';
  report.finishedAt = new Date().toISOString();
  report.failure = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null,
    detail: error && error.detail ? error.detail : null,
  };
  try { fs.writeFileSync(RESULT_PATH, JSON.stringify(report, null, 2)); } catch {}
  emit('result', { result: report.result, failure: report.failure });
  app.exit(1);
});
