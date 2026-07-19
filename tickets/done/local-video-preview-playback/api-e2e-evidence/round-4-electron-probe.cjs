const { app, BrowserWindow, net, protocol, session } = require('electron');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const WORKTREE = process.env.API_E2E_WORKTREE;
const WEB_ROOT = path.join(WORKTREE, 'autobyteus-web');
const FIXTURE_ROOT = process.env.API_E2E_FIXTURE_ROOT;
const RESULT_PATH = process.env.API_E2E_RESULT_PATH;
const PAGE_URL = process.env.API_E2E_PAGE_URL;
const FILE_PAGE_URL = process.env.API_E2E_FILE_PAGE_URL;
const REPORTED_VIDEO = '/Users/normy/autobyteus_org/autobyteus-tutorial-videos/multi-nodes-part-2_youtube_smaller.mp4';
const LARGE_VIDEO = '/Users/normy/autobyteus_org/autobyteus-tutorial-videos/autobyteus_software_engineering_team_combined_no_audio.mp4';

app.setName('AutoByteusLocalPreviewApiE2E');
app.setPath('userData', path.join(FIXTURE_ROOT, 'electron-user-data'));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-media-suspend');

const lifecycleModule = require(path.join(WEB_ROOT, 'dist/electron/local-file-protocol/local-file-protocol.js'));
const { WorkspaceShellWindowRegistry } = require(path.join(WEB_ROOT, 'dist/electron/shell/workspace-shell-window-registry.js'));
lifecycleModule.registerLocalFileProtocolScheme();

const report = {
  schemaVersion: 3,
  startedAt: new Date().toISOString(),
  runtime: {},
  scenarios: [],
  protocolRequests: [],
  protocolHandlerRequests: [],
  protocolCompletions: [],
  gateDecisions: [],
  identityChecks: [],
  rendererConsoleErrors: [],
  cleanup: {},
  result: 'running',
};

let probeWindow = null;
let shellRegistry = null;

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

const requestProtocol = async (win, label, url, init = {}) => {
  try {
    const renderer = await execute(win, `(async () => {
      try {
        const response = await fetch(${JSON.stringify(url)}, ${JSON.stringify(init)});
        const bytes = Array.from(new Uint8Array(await response.arrayBuffer()));
        return {
          threw: false,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          bytes,
        };
      } catch (error) {
        return { threw: true, error: error instanceof Error ? error.message : String(error), status: null, headers: {}, bytes: [] };
      }
    })()`);
    const bytes = Buffer.from(renderer.bytes);
    return {
      label,
      threw: renderer.threw,
      error: renderer.error,
      status: renderer.status,
      headers: renderer.headers,
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

const listen = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});

const closeServer = (server) => new Promise((resolve) => server.close(resolve));

async function runProtocolMatrix(win) {
  const gateStart = report.gateDecisions.length;
  const bytesFile = path.join(FIXTURE_ROOT, 'Case Sensitive Ü%#', '视频 100%#1\\name.bin');
  const bytesUrl = buildLocalFileUrl(bytesFile);
  const scenarios = [];
  scenarios.push(await requestProtocol(win, 'full-get', bytesUrl));
  scenarios.push(await requestProtocol(win, 'closed-range', bytesUrl, { headers: { Range: 'bytes=2-5' } }));
  scenarios.push(await requestProtocol(win, 'open-range', bytesUrl, { headers: { Range: 'bytes=6-' } }));
  scenarios.push(await requestProtocol(win, 'suffix-range', bytesUrl, { headers: { Range: 'bytes=-3' } }));
  scenarios.push(await requestProtocol(win, 'clamped-range', bytesUrl, { headers: { Range: 'bytes=8-99' } }));
  scenarios.push(await requestProtocol(win, 'head-full', bytesUrl, { method: 'HEAD' }));
  scenarios.push(await requestProtocol(win, 'head-range', bytesUrl, { method: 'HEAD', headers: { Range: 'bytes=1-3' } }));
  for (const [label, range] of [
    ['malformed-unit', 'items=0-1'],
    ['empty-range', 'bytes='],
    ['multipart-range', 'bytes=1-2,4-5'],
    ['unsatisfiable-range', 'bytes=10-'],
    ['reverse-range', 'bytes=7-2'],
  ]) {
    scenarios.push(await requestProtocol(win, label, bytesUrl, { headers: { Range: range } }));
  }
  scenarios.push(await requestProtocol(win, 'unsupported-method', bytesUrl, { method: 'POST' }));
  scenarios.push(await requestProtocol(win, 'wrong-authority', 'local-file://wrong/absolute/video.mp4'));
  scenarios.push(await requestProtocol(win, 'legacy-empty-authority', `local-file://${bytesFile.split('/').map(encodeURIComponent).join('/')}`));
  scenarios.push(await requestProtocol(win, 'query-adornment', `${bytesUrl}?download=1`));
  scenarios.push(await requestProtocol(win, 'relative-path', 'local-file://relative/video.mp4'));
  scenarios.push(await requestProtocol(win, 'missing-path', buildLocalFileUrl(path.join(FIXTURE_ROOT, 'missing.bin'))));
  scenarios.push(await requestProtocol(win, 'directory-path', buildLocalFileUrl(path.join(FIXTURE_ROOT, 'a-directory'))));
  scenarios.push(await requestProtocol(win, 'unreadable-path', buildLocalFileUrl(path.join(FIXTURE_ROOT, 'unreadable.bin'))));
  scenarios.push(await requestProtocol(win, 'malformed-encoding', 'local-file:///%E0%A4%A'));

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
  for (const label of ['wrong-authority', 'legacy-empty-authority', 'query-adornment', 'relative-path', 'missing-path', 'directory-path', 'unreadable-path']) {
    const item = byLabel[label];
    assert(item.status === 404 && item.byteLength === 0, `${label} was not a no-byte 404`, publicRequest(item));
  }
  const malformed = byLabel['malformed-encoding'];
  assert((malformed.status === 404 || malformed.threw) && malformed.byteLength === 0, 'Malformed URL returned source bytes', publicRequest(malformed));
  const mainFrameAllows = report.gateDecisions.slice(gateStart).filter((item) => item.decision === 'allow' && item.webContentsId === win.webContents.id);
  assert(mainFrameAllows.length >= scenarios.filter((item) => !item.threw).length, 'Authorized protocol matrix did not originate through allowed registered main-frame requests', { mainFrameAllows, scenarios: scenarios.map(publicRequest) });
  const evidence = { requests: scenarios.map(publicRequest), registeredWebContentsId: win.webContents.id, mainFrameAllows };
  recordScenario('E2E-PROTO-001', 'Pass', evidence);
  return {
    noByteFailures: ['malformed-unit', 'empty-range', 'multipart-range', 'unsatisfiable-range', 'reverse-range', 'unsupported-method', 'wrong-authority', 'legacy-empty-authority', 'query-adornment', 'relative-path', 'missing-path', 'directory-path', 'unreadable-path', 'malformed-encoding'].map((label) => publicRequest(byLabel[label])),
  };
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

async function runDocumentViewers(win, originLabel) {
  const origin = await execute(win, `({ origin: location.origin, href: location.href })`);
  const handlerStart = report.protocolHandlerRequests.length;
  const gateStart = report.gateDecisions.length;
  const pdfPath = path.join(FIXTURE_ROOT, 'probe document.pdf');
  await setFile(win, { path: pdfPath, type: 'PDF', content: null, url: buildLocalFileUrl(pdfPath) });
  const pdf = await execute(win, `(async () => {
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
  const excel = await execute(win, `(async () => {
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
  const handlerRequests = report.protocolHandlerRequests.slice(handlerStart);
  const gateDecisions = report.gateDecisions.slice(gateStart);
  assert(pdf.result === 'Pass', `${originLabel} PDF.js viewer failed`, { origin, pdf, handlerRequests, gateDecisions });
  assert(excel.result === 'Pass' && /alpha/.test(excel.text) && /beta/.test(excel.text), `${originLabel} Excel viewer failed`, { origin, excel, handlerRequests, gateDecisions });
  const pdfUrl = buildLocalFileUrl(pdfPath);
  const excelUrl = buildLocalFileUrl(excelPath);
  assert(handlerRequests.some((item) => item.url === pdfUrl && item.status === 200), `${originLabel} PDF did not reach handler 200`, handlerRequests);
  assert(handlerRequests.some((item) => item.url === excelUrl && item.status === 200), `${originLabel} Excel did not reach handler 200`, handlerRequests);
  const documentGateDecisions = gateDecisions.filter((item) => item.url === pdfUrl || item.url === excelUrl);
  assert(documentGateDecisions.length >= 2
    && documentGateDecisions.every((item) => item.decision === 'allow' && item.webContentsId === win.webContents.id && item.isCurrentMainFrame), `${originLabel} document requests did not use the authorized registered main frame`, gateDecisions);
  return { originLabel, origin, pdf, excel, handlerRequests, gateDecisions };
}

async function runAttachmentLifecycleAndDom(win) {
  const protocolStart = report.protocolHandlerRequests.length;
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
      if (thumbnail?.complete && thumbnail.naturalWidth > 0 && unsupported) return {
        buttonCount: subject.querySelectorAll('button').length,
        thumbnailSrc: thumbnail.currentSrc || thumbnail.src,
        unsupportedText: unsupported.textContent.trim(),
        unsupportedTag: unsupported.tagName,
        unsupportedInButton: Boolean(unsupported.closest('button')),
      };
      if (Date.now() - started > 20000) throw new Error('context attachment message DOM timeout');
      await new Promise(r => setTimeout(r, 50));
    }
  })()`);
  assert(messageDom.thumbnailSrc === buildLocalFileUrl(imagePath) && messageDom.unsupportedTag === 'SPAN' && !messageDom.unsupportedInButton,
    'Valid/unsupported attachment presentation mismatch', messageDom);
  const attachmentProtocolRequests = report.protocolHandlerRequests.slice(protocolStart);
  assert(!attachmentProtocolRequests.some(item => item.url.includes('opaque')), 'Unsupported attachment reached protocol', attachmentProtocolRequests);
  return { imagePath, attachmentLifecycle, messageDom, attachmentProtocolRequests };
}

async function runRegressionFirst(win) {
  const imagePath = path.join(FIXTURE_ROOT, 'probe image.png');
  await setFile(win, { path: imagePath, type: 'Image', content: null, url: buildLocalFileUrl(imagePath) });
  const image = await execute(win, `(async () => {
    const started = Date.now();
    while (true) {
      const node = document.querySelector('#file-subject img.image-content');
      if (node?.complete && node.naturalWidth > 0) return { naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight, src: node.currentSrc || node.src };
      if (Date.now() - started > 20000) throw new Error('image preview timeout');
      await new Promise(r => setTimeout(r, 50));
    }
  })()`);
  assert(image.naturalWidth === 8 && image.naturalHeight === 6, 'Representative image dimensions changed', image);

  const audioPath = path.join(FIXTURE_ROOT, 'probe audio.wav');
  await setFile(win, { path: audioPath, type: 'Audio', content: null, url: buildLocalFileUrl(audioPath) });
  const audio = await execute(win, `(async () => {
    const started = Date.now(); let node;
    while (true) {
      node = document.querySelector('#file-subject audio');
      if (node && node.readyState >= 1 && Number.isFinite(node.duration)) break;
      if (node?.error) throw new Error('audio media error ' + node.error.code);
      if (Date.now() - started > 20000) throw new Error('audio metadata timeout');
      await new Promise(r => setTimeout(r, 50));
    }
    const duration = node.duration; node.muted = true; const start = node.currentTime; await node.play();
    await new Promise(r => setTimeout(r, 600)); const advanced = node.currentTime; node.pause();
    return { duration, start, advanced, paused: node.paused, error: node.error ? node.error.code : null };
  })()`);
  assert(audio.duration > 2.5 && audio.advanced - audio.start > 0.15, 'Local audio preview did not load/play', audio);

  const httpDocuments = await runDocumentViewers(win, 'http-main-frame');
  const protocolCountBeforeText = report.protocolHandlerRequests.length;
  const textPath = path.join(FIXTURE_ROOT, 'probe notes.md');
  await setFile(win, { path: textPath, type: 'Text', content: fs.readFileSync(textPath, 'utf8'), url: null });
  const text = await execute(win, `(async () => {
    const started = Date.now();
    while (true) {
      const subject = document.querySelector('#file-subject');
      if (subject && subject.textContent.includes('Probe text OK')) return { text: subject.textContent.replace(/\\s+/g, ' ').trim() };
      if (Date.now() - started > 20000) throw new Error('text preview timeout');
      await new Promise(r => setTimeout(r, 50));
    }
  })()`);
  const textProtocolRequestCount = report.protocolHandlerRequests.length - protocolCountBeforeText;
  assert(textProtocolRequestCount === 0, 'Text preview unexpectedly used local-file', text);
  const attachment = await runAttachmentLifecycleAndDom(win);

  await win.loadURL(FILE_PAGE_URL);
  await waitForHook(win);
  const fileDocuments = await runDocumentViewers(win, 'file-main-frame');
  await win.loadURL(PAGE_URL);
  await waitForHook(win);

  const evidence = { image, audio, text, textProtocolRequestCount, ...attachment, httpDocuments, fileDocuments };
  recordScenario('E2E-REG-001', 'Pass', evidence);
  return evidence;
}

async function runRequesterSecurity(win) {
  const readableUrl = buildLocalFileUrl(path.join(FIXTURE_ROOT, 'probe image.png'));
  const childServer = http.createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(`<!doctype html><script>
      fetch(${JSON.stringify(readableUrl)}).then(async r => parent.postMessage({ kind: 'foreign-http', status: r.status, bytes: (await r.arrayBuffer()).byteLength }, '*'))
      .catch(error => parent.postMessage({ kind: 'foreign-http', error: String(error), bytes: 0 }, '*'));
    <\/script>`);
  });
  const childPort = await listen(childServer);
  const childOrigin = `http://127.0.0.1:${childPort}`;
  const handlerStart = report.protocolHandlerRequests.length;
  const gateStart = report.gateDecisions.length;
  const foreignHttp = await execute(win, `new Promise(resolve => {
    const finish = value => { clearTimeout(timer); removeEventListener('message', onMessage); resolve(value); };
    const timer = setTimeout(() => finish({ kind: 'foreign-http', error: 'timeout', bytes: -1 }), 10000);
    const onMessage = event => {
      if (event.data?.kind !== 'foreign-http') return;
      finish({ frameOrigin: event.origin, ...event.data });
    };
    addEventListener('message', onMessage);
    const frame = document.createElement('iframe'); frame.src = ${JSON.stringify(childOrigin)}; document.body.append(frame);
  })`);

  const htmlPreview = await execute(win, `new Promise(resolve => {
    const finish = value => { clearTimeout(timer); removeEventListener('message', onMessage); resolve(value); };
    const timer = setTimeout(() => finish({ kind: 'html-preview', error: 'timeout', bytes: -1 }), 10000);
    const onMessage = event => {
      if (event.data?.kind !== 'html-preview') return;
      finish({ frameOrigin: event.origin, ...event.data });
    };
    addEventListener('message', onMessage);
    const content = '<script>fetch(' + ${JSON.stringify(JSON.stringify(readableUrl))} + ').then(async r => parent.postMessage({ kind: "html-preview", status: r.status, bytes: (await r.arrayBuffer()).byteLength }, "*")).catch(error => parent.postMessage({ kind: "html-preview", error: String(error), bytes: 0 }, "*"));<\\/script>';
    window.__apiE2ELocalPreview.setFile({ path: '/tmp/security-preview.html', type: 'Text', content, url: null });
  })`);

  const unregistered = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  await unregistered.loadURL(childOrigin);
  const unregisteredTop = await unregistered.webContents.executeJavaScript(`fetch(${JSON.stringify(readableUrl)}).then(async r => ({ status: r.status, bytes: (await r.arrayBuffer()).byteLength })).catch(error => ({ error: String(error), bytes: 0 }))`, true);
  unregistered.destroy();

  const mainHandlerStart = report.protocolHandlerRequests.length;
  const mainGateStart = report.gateDecisions.length;
  let mainProcess;
  try {
    const response = await net.fetch(readableUrl);
    const bytes = Buffer.from(await response.arrayBuffer());
    mainProcess = { threw: false, status: response.status, byteLength: bytes.length };
  } catch (error) {
    mainProcess = { threw: true, error: error instanceof Error ? error.message : String(error), status: null, byteLength: 0 };
  }
  await sleep(100);
  const childHandlerRequests = report.protocolHandlerRequests.slice(handlerStart, mainHandlerStart);
  const childGateDecisions = report.gateDecisions.slice(gateStart, mainGateStart);
  const mainHandlerRequests = report.protocolHandlerRequests.slice(mainHandlerStart);
  const mainGateDecisions = report.gateDecisions.slice(mainGateStart);
  await closeServer(childServer);

  assert(foreignHttp.bytes === 0 && foreignHttp.error, 'Foreign HTTP child received local-file bytes', foreignHttp);
  assert(htmlPreview.bytes === 0 && htmlPreview.error, 'Actual HtmlPreviewer Blob child received local-file bytes', htmlPreview);
  assert(unregisteredTop.bytes === 0 && unregisteredTop.error, 'Unregistered top frame received local-file bytes', unregisteredTop);
  assert(childHandlerRequests.length === 0, 'Unauthorized child/unregistered request reached protocol.handle', childHandlerRequests);
  assert(childGateDecisions.filter((item) => item.url === readableUrl).length >= 3
    && childGateDecisions.filter((item) => item.url === readableUrl).every((item) => item.decision === 'cancel'), 'Unauthorized frame requests were not all canceled', childGateDecisions);
  assert(mainProcess.threw && mainProcess.byteLength === 0 && mainHandlerRequests.length === 0, 'Identity-less main-process net.fetch was not denied before handler', { mainProcess, mainHandlerRequests, mainGateDecisions });
  assert(mainGateDecisions.some((item) => item.url === readableUrl && item.decision === 'cancel' && item.frameId === null), 'Identity-less main-process cancel identity was not observed', mainGateDecisions);
  return { readableUrl, foreignHttp, htmlPreview, unregisteredTop, childHandlerRequests, childGateDecisions, mainProcess, mainHandlerRequests, mainGateDecisions };
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

async function runVideoAndViewerJourneys(win) {
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
  const cancellationGateStart = report.gateDecisions.length;
  const cancellationHandlerStart = report.protocolHandlerRequests.length;
  const cancellationPromise = execute(win, `(async () => {
    const controller = new AbortController();
    window.__apiE2ECancellation = { ready: false };
    try {
      const response = await fetch(${JSON.stringify(largeUrl)}, {
        headers: { Range: 'bytes=0-' },
        signal: controller.signal,
      });
      const reader = response.body.getReader();
      const first = await reader.read();
      window.__apiE2ECancellation = {
        ready: true,
        status: response.status,
        firstChunkLength: first.value?.byteLength || 0,
      };
      await new Promise(resolve => { window.__apiE2EReleaseCancellation = resolve; });
      controller.abort('API/E2E authorized renderer cancellation');
      try { await reader.cancel('API/E2E authorized renderer cancellation'); } catch {}
      return { ...window.__apiE2ECancellation, aborted: controller.signal.aborted };
    } catch (error) {
      return { ...window.__apiE2ECancellation, error: error instanceof Error ? error.message : String(error), aborted: controller.signal.aborted };
    }
  })()`);
  const cancellationReady = await execute(win, `(async () => {
    const started = Date.now();
    while (!window.__apiE2ECancellation?.ready) {
      if (Date.now() - started > 20000) throw new Error('authorized renderer cancellation readiness timeout');
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    return window.__apiE2ECancellation;
  })()`);
  const cancellationFdsDuring = countOpenFileDescriptors(LARGE_VIDEO);
  await execute(win, `window.__apiE2EReleaseCancellation(); true`);
  const cancellationResult = await cancellationPromise;
  let cancellationFdsAfter = countOpenFileDescriptors(LARGE_VIDEO);
  const cancellationWaitStarted = Date.now();
  while (cancellationFdsAfter > 0 && Date.now() - cancellationWaitStarted < 5000) {
    await sleep(100);
    cancellationFdsAfter = countOpenFileDescriptors(LARGE_VIDEO);
  }
  const cancellationReleaseMs = Date.now() - cancellationWaitStarted;
  const cancellationGateDecisions = report.gateDecisions.slice(cancellationGateStart);
  const cancellationHandlerRequests = report.protocolHandlerRequests.slice(cancellationHandlerStart);
  assert(cancellationReady.status === 206 && cancellationReady.firstChunkLength > 0 && cancellationReady.firstChunkLength <= 64 * 1024 && cancellationResult.aborted,
    'Authorized renderer cancellation did not begin with one bounded range chunk and abort', { cancellationReady, cancellationResult });
  assert(cancellationFdsDuring >= 1 && cancellationFdsAfter === 0, 'Explicit abort did not show bounded open-then-closed handle ownership', { cancellationFdsDuring, cancellationFdsAfter, cancellationReleaseMs });
  assert(cancellationGateDecisions.some(item => item.url === largeUrl && item.decision === 'allow' && item.isCurrentMainFrame)
    && cancellationHandlerRequests.some(item => item.url === largeUrl && item.status === 206),
  'Authorized renderer cancellation did not pass through the registered-main-frame gate and handler', { cancellationGateDecisions, cancellationHandlerRequests });

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
  recordScenario('E2E-VID-002', 'Pass', { largeMetadata, largeSeek, ranges, laterRanges, fdsDuringLarge, fdsAfterRelease, mediaReleaseMs, explicitCancellation: { ...cancellationReady, ...cancellationResult, fdsDuring: cancellationFdsDuring, fdsAfter: cancellationFdsAfter, releaseMs: cancellationReleaseMs, gateDecisions: cancellationGateDecisions, handlerRequests: cancellationHandlerRequests }, requests: largeRequests });

  const { attachmentLifecycle, messageDom, attachmentProtocolRequests } = await runAttachmentLifecycleAndDom(win);
  const removedAttachments = await execute(win, `window.__apiE2ELocalPreview.removeMessageAttachment('local-file://opaque/image.png')`);
  const removedDom = await execute(win, `({
    unsupportedVisible: document.querySelector('#message-subject').textContent.includes('opaque image.png'),
    attachmentCount: document.querySelectorAll('#message-subject li').length,
  })`);
  assert(!removedDom.unsupportedVisible && !removedAttachments.some(item => item.kind === 'unsupported_local_file'), 'Unsupported attachment removal identity failed', { removedAttachments, removedDom });
  recordScenario('E2E-UI-001', 'Pass', { missingAlert, retryAlert, attemptsAfterRetry, decodeAlert, recoveredMetadata: metadata, attachmentLifecycle, messageDom, removedDom });
  const securityScenario = report.scenarios.find(item => item.id === 'E2E-SEC-001');
  securityScenario.evidence.normalizationMatrix = normalizationMatrix;
  securityScenario.evidence.attachmentLifecycle = attachmentLifecycle;
  securityScenario.evidence.unsupportedProtocolRequests = attachmentProtocolRequests.filter(item => item.url.includes('opaque'));

  return { missingAlert, retryAlert, decodeAlert, metadata, playPause, seek, specialMetadata, largeMetadata, largeSeek, normalizationMatrix, attachmentLifecycle, messageDom, removedAttachments, removedDom };
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
    filePageUrl: FILE_PAGE_URL,
    userData: app.getPath('userData'),
    home: process.env.HOME,
  };
  assert(process.versions.electron === '42.4.1', 'Wrong Electron runtime', report.runtime);

  shellRegistry = new WorkspaceShellWindowRegistry();
  const webRequest = session.defaultSession.webRequest;
  const originalOnBeforeRequest = webRequest.onBeforeRequest.bind(webRequest);
  webRequest.onBeforeRequest = (filter, listener) => originalOnBeforeRequest(filter, (details, callback) => {
    let frameId = null;
    let frameUrl = null;
    let parentFrameId = null;
    let parentFrameUrl = null;
    let frameDestroyed = null;
    try {
      frameId = details.frame?.frameId ?? null;
      frameDestroyed = details.frame?.isDestroyed() ?? null;
      frameUrl = details.frame && !frameDestroyed ? details.frame.url : null;
      const parent = details.frame && !frameDestroyed ? details.frame.parent : null;
      parentFrameId = parent?.frameId ?? null;
      parentFrameUrl = parent && !parent.isDestroyed() ? parent.url : null;
    } catch {}
    const gateRecord = {
      id: details.id,
      url: details.url,
      method: details.method,
      resourceType: details.resourceType,
      webContentsId: details.webContentsId ?? null,
      frameId,
      frameUrl,
      parentFrameId,
      parentFrameUrl,
      frameDestroyed,
      isCurrentMainFrame: Boolean(probeWindow && !probeWindow.isDestroyed() && details.frame === probeWindow.webContents.mainFrame),
      at: new Date().toISOString(),
    };
    listener(details, (response) => {
      gateRecord.decision = response?.cancel ? 'cancel' : 'allow';
      report.gateDecisions.push(gateRecord);
      emit('gate-decision', gateRecord);
      callback(response);
    });
  });

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
  lifecycleModule.installLocalFileProtocol({
    isOwnedMainFrame: (webContentsId, frame) => {
      let result = false;
      let error = null;
      try {
        result = shellRegistry.isOwnedMainFrame(webContentsId, frame);
      } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught);
        throw caught;
      } finally {
        const evidence = {
          webContentsId,
          frameId: frame?.frameId ?? null,
          frameUrl: (() => { try { return frame && !frame.isDestroyed() ? frame.url : null; } catch { return null; } })(),
          result,
          error,
          registeredNodeId: shellRegistry.getNodeIdForShell(webContentsId),
          sameAsCurrentMainFrame: Boolean(probeWindow && !probeWindow.isDestroyed() && frame === probeWindow.webContents.mainFrame),
          at: new Date().toISOString(),
        };
        report.identityChecks.push(evidence);
        emit('identity-check', evidence);
      }
      return result;
    },
  });
  webRequest.onBeforeRequest = originalOnBeforeRequest;

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

  probeWindow = new BrowserWindow({
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
  const registeredShell = {
    shellId: probeWindow.webContents.id,
    nodeId: 'api-e2e-registered-workspace-shell',
    browserWindow: probeWindow,
    isDestroyed: () => probeWindow.isDestroyed(),
  };
  shellRegistry.register(registeredShell);
  report.runtime.registeredWebContentsId = probeWindow.webContents.id;
  report.runtime.registeredNodeId = registeredShell.nodeId;
  probeWindow.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) report.rendererConsoleErrors.push({ level, message });
  });
  await probeWindow.loadURL(PAGE_URL);
  await waitForHook(probeWindow);

  emit('runtime', report.runtime);
  const regressionEvidence = await runRegressionFirst(probeWindow);
  const requesterSecurity = await runRequesterSecurity(probeWindow);
  const protocolSecurity = await runProtocolMatrix(probeWindow);
  recordScenario('E2E-SEC-001', 'Pass', { requesterSecurity, ...protocolSecurity });
  await runVideoAndViewerJourneys(probeWindow);

  await sleep(500);
  report.cleanup.reportedVideoFds = countOpenFileDescriptors(REPORTED_VIDEO);
  report.cleanup.largeVideoFds = countOpenFileDescriptors(LARGE_VIDEO);
  assert(report.cleanup.reportedVideoFds === 0 && report.cleanup.largeVideoFds === 0, 'Video file descriptors remained open at probe end', report.cleanup);
  report.cleanup.registeredShellBeforeUnregister = shellRegistry.getNodeIdForShell(probeWindow.webContents.id);
  shellRegistry.unregister(probeWindow.webContents.id);
  report.cleanup.registeredShellAfterUnregister = shellRegistry.getNodeIdForShell(probeWindow.webContents.id);
  probeWindow.destroy();
  report.cleanup.windowDestroyed = probeWindow.isDestroyed();
  report.cleanup.regressionCompletedFirst = report.scenarios[0]?.id === 'E2E-REG-001' && Boolean(regressionEvidence.httpDocuments && regressionEvidence.fileDocuments);
  assert(report.cleanup.registeredShellAfterUnregister === null && report.cleanup.windowDestroyed && report.cleanup.regressionCompletedFirst,
    'Probe shell cleanup or required first-scenario ordering failed', report.cleanup);
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
  try {
    if (probeWindow && !probeWindow.isDestroyed()) {
      shellRegistry?.unregister(probeWindow.webContents.id);
      probeWindow.destroy();
    }
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.destroy();
    }
  } catch {}
  try { fs.writeFileSync(RESULT_PATH, JSON.stringify(report, null, 2)); } catch {}
  emit('result', { result: report.result, failure: report.failure });
  app.exit(1);
});
