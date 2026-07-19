const { app, BrowserWindow, net, session } = require('electron');
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
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  runtime: {},
  scenarios: [],
  protocolRequests: [],
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

const buildLocalFileUrl = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const encoded = segments.map((segment, index) => (
    index === 0 && /^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)
  )).join('/');
  return `local-file://${encoded}`;
};

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
  const bytesFile = path.join(FIXTURE_ROOT, '视频 100%#1.bin');
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
  scenarios.push(await requestProtocol('relative-path', 'local-file://relative/video.mp4'));
  scenarios.push(await requestProtocol('missing-path', buildLocalFileUrl(path.join(FIXTURE_ROOT, 'missing.bin'))));
  scenarios.push(await requestProtocol('directory-path', buildLocalFileUrl(path.join(FIXTURE_ROOT, 'a-directory'))));
  scenarios.push(await requestProtocol('unreadable-path', buildLocalFileUrl(path.join(FIXTURE_ROOT, 'unreadable.bin'))));
  scenarios.push(await requestProtocol('malformed-encoding', 'local-file:///%E0%A4%A'));

  const byLabel = Object.fromEntries(scenarios.map((item) => [item.label, item]));
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
  for (const label of ['relative-path', 'missing-path', 'directory-path', 'unreadable-path']) {
    const item = byLabel[label];
    assert(item.status === 404 && item.byteLength === 0, `${label} was not a no-byte 404`, publicRequest(item));
  }
  const malformed = byLabel['malformed-encoding'];
  assert((malformed.status === 404 || malformed.threw) && malformed.byteLength === 0, 'Malformed URL returned source bytes', publicRequest(malformed));
  recordScenario('E2E-PROTO-001', 'Pass', { requests: scenarios.map(publicRequest) });
  recordScenario('E2E-SEC-001', 'Pass', {
    noByteFailures: ['malformed-unit', 'empty-range', 'multipart-range', 'unsatisfiable-range', 'reverse-range', 'unsupported-method', 'relative-path', 'missing-path', 'directory-path', 'unreadable-path', 'malformed-encoding'].map((label) => publicRequest(byLabel[label])),
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
  const retryAlert = await waitForAlert(win);
  const attemptsAfterRetry = await execute(win, `window.__apiE2EAttempts.slice()`);
  assert(attemptsAfterRetry.includes('1'), 'Retry did not mount attempt 1', { attemptsAfterRetry, retryAlert });

  const unsupportedUrl = buildLocalFileUrl(path.join(FIXTURE_ROOT, 'unsupported video.mp4'));
  await setVideoUrl(win, unsupportedUrl);
  const decodeAlert = await waitForAlert(win);
  assert(/could not be played/i.test(decodeAlert.text) && decodeAlert.videoPresent === false, 'Decode failure did not produce generic alert', decodeAlert);

  const reportedUrl = buildLocalFileUrl(REPORTED_VIDEO);
  const requestIndexBeforeReported = report.protocolRequests.length;
  await setVideoUrl(win, reportedUrl);
  const metadata = await waitForVideoMetadata(win, 45000);
  assert(Math.abs(metadata.duration - 330.533333) < 0.1, 'Reported duration mismatch', metadata);
  assert(metadata.attempt === '3', 'URL changes and Retry did not create expected fresh attempt identity', { metadata, attemptsAfterRetry });
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
  recordScenario('E2E-VID-001', 'Pass', { metadata, playPause, seek, requests: reportedRequests });

  const largeUrl = buildLocalFileUrl(LARGE_VIDEO);
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
  await setVideoUrl(win, null);
  await sleep(1000);
  const fdsAfterRelease = countOpenFileDescriptors(LARGE_VIDEO);
  assert(fdsAfterRelease === 0, 'Large video file handle remained open after element release', { fdsDuringLarge, fdsAfterRelease, ranges });
  recordScenario('E2E-VID-002', 'Pass', { largeMetadata, largeSeek, ranges, laterRanges, fdsDuringLarge, fdsAfterRelease, requests: largeRequests });

  const sharedResults = {};
  const imagePath = path.join(FIXTURE_ROOT, 'probe image.png');
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
      if (canvas && canvas.width > 0) return { canvasWidth: canvas.width, canvasHeight: canvas.height, alert: null };
      if (alert) throw new Error('pdf preview alert: ' + alert.textContent.replace(/\\s+/g, ' ').trim());
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
      if (table) return { text: table.textContent.replace(/\\s+/g, ' ').trim() };
      if (error) throw new Error('excel preview error: ' + error.textContent.trim());
      if (Date.now() - started > 30000) throw new Error('excel preview timeout');
      await new Promise(r => setTimeout(r, 100));
    }
  })()`);
  assert(/alpha/.test(sharedResults.excel.text) && /beta/.test(sharedResults.excel.text), 'Excel preview content mismatch', sharedResults.excel);

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
  recordScenario('E2E-REG-001', 'Pass', sharedResults);
  recordScenario('E2E-UI-001', 'Pass', { missingAlert, retryAlert, attemptsAfterRetry, decodeAlert, recoveredMetadata: metadata });

  win.destroy();
  return { missingAlert, retryAlert, decodeAlert, metadata, playPause, seek, largeMetadata, largeSeek, sharedResults };
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
