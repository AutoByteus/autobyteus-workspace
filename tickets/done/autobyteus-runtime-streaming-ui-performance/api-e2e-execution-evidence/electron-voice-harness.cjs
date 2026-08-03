const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const evidenceDir = __dirname;
const summaryPath = path.join(evidenceDir, 'electron-voice-summary.json');
const screenshotPath = path.join(evidenceDir, 'electron-voice-success.png');
const preloadPath = path.join(evidenceDir, 'electron-voice-preload.cjs');
const pageUrl = process.env.PROBE_PAGE_URL || 'http://127.0.0.1:3000/settings';
fs.writeFileSync(path.join(evidenceDir, 'electron-voice-started.log'), `top ${new Date().toISOString()} pid=${process.pid}\n`);
const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-api-e2e-voice-'));
app.setPath('userData', userDataPath);

app.commandLine.appendSwitch('use-fake-device-for-media-stream');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

const state = {
  startedAt: new Date().toISOString(),
  topology: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    pageUrl,
    preload: preloadPath,
    media: 'Electron/Chromium fake audio input device',
    userDataPath,
  },
  ipc: { transcriptions: [], trackStops: 0 },
  console: [],
  pageErrors: [],
  success: null,
  denied: null,
  errors: [],
  cleanup: {},
};

let extension = {
  id: 'voice-input',
  name: 'Voice Input',
  description: 'Controlled API/E2E Electron renderer fixture.',
  status: 'installed',
  enabled: true,
  settings: { languageMode: 'auto', audioInputDeviceId: null },
  message: 'Ready',
  installProgress: null,
  installedAt: '2026-08-01T00:00:00.000Z',
  runtimeVersion: 'probe-1',
  modelVersion: 'probe-1',
  backendKind: 'faster-whisper',
  lastError: null,
};

ipcMain.handle('probe:window-context', () => ({ windowId: 9001, nodeId: 'embedded-local' }));
ipcMain.handle('probe:extensions', () => [extension]);
ipcMain.handle('probe:update-settings', (_event, payload) => {
  extension = { ...extension, settings: { ...extension.settings, ...payload } };
  return [extension];
});
ipcMain.handle('probe:track-stopped', () => {
  state.ipc.trackStops += 1;
  return state.ipc.trackStops;
});
ipcMain.handle('probe:transcribe', (_event, request) => {
  const bytes = request?.audioData?.byteLength ?? null;
  state.ipc.transcriptions.push({ at: new Date().toISOString(), bytes });
  return {
    ok: true,
    text: 'isolated electron transcript',
    detectedLanguage: 'en',
    noSpeech: false,
    error: null,
  };
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(fn, label, timeoutMs = 15000) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    try {
      last = await fn();
      if (last) return last;
    } catch (error) {
      last = String(error?.message || error);
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}; last=${JSON.stringify(last)}`);
}

function attachDiagnostics(win, name) {
  win.webContents.on('console-message', (_event, ...args) => {
    const details = args.length === 1 && typeof args[0] === 'object'
      ? args[0]
      : { level: args[0], message: args[1], lineNumber: args[2], sourceId: args[3] };
    state.console.push({ window: name, level: details?.level, message: details?.message, line: details?.lineNumber, source: details?.sourceId });
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    state.pageErrors.push({ window: name, type: 'render-process-gone', details });
  });
  win.webContents.on('did-fail-load', (_event, code, description, validatedURL, isMainFrame) => {
    state.pageErrors.push({ window: name, type: 'did-fail-load', code, description, validatedURL, isMainFrame });
  });
}

async function createWindow(name, allowMicrophone) {
  fs.appendFileSync(path.join(evidenceDir, 'electron-voice-started.log'), `createWindow ${name} start\n`);
  const partition = `api-e2e-voice-${name}-${Date.now()}`;
  const ses = session.fromPartition(partition);
  const permissionDecisions = [];
  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin, details) => {
    // Keep media discoverable for the request-denial journey; the authoritative
    // request handler below still grants or denies the actual getUserMedia call.
    const allowed = permission === 'media';
    permissionDecisions.push({ type: 'check', permission, requestingOrigin, details, allowed });
    return allowed;
  });
  ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
    const allowed = permission === 'media' ? allowMicrophone : false;
    permissionDecisions.push({ type: 'request', permission, details, allowed });
    callback(allowed);
  });

  const win = new BrowserWindow({
    show: false,
    width: 1440,
    height: 1000,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      partition,
    },
  });
  fs.appendFileSync(path.join(evidenceDir, 'electron-voice-started.log'), `createWindow ${name} browser-created\n`);
  attachDiagnostics(win, name);
  const uniqueUrl = `${pageUrl}${pageUrl.includes('?') ? '&' : '?'}apiE2EVoice=${name}-${Date.now()}`;
  try {
    fs.appendFileSync(path.join(evidenceDir, 'electron-voice-started.log'), `createWindow ${name} load ${uniqueUrl}\n`);
    await win.loadURL(uniqueUrl);
  } catch (error) {
    // Destroying the prior disposable renderer can transiently cancel an in-flight dev-server
    // navigation. One fresh navigation is safe and keeps the denial window independent.
    await sleep(500);
    await win.loadURL(uniqueUrl);
  }
  fs.appendFileSync(path.join(evidenceDir, 'electron-voice-started.log'), `createWindow ${name} loaded\n`);
  try {
    await waitFor(
      () => win.webContents.executeJavaScript("Boolean(document.querySelector('[data-testid=settings-nav-extensions]'))"),
      `${name} settings navigation`,
    );
  } catch (error) {
    state.pageErrors.push({
      window: name,
      type: 'navigation-dom-timeout',
      snapshot: await win.webContents.executeJavaScript("({url: location.href, readyState: document.readyState, text: document.body?.innerText, html: document.documentElement?.outerHTML.slice(0, 5000)})"),
    });
    throw error;
  }
  await win.webContents.executeJavaScript(`document.querySelector('[data-testid=settings-nav-extensions]').click()`);
  await waitFor(
    () => win.webContents.executeJavaScript("document.body.innerText.includes('Test Voice Input')"),
    `${name} Voice Input extension card`,
  );
  return { win, permissionDecisions };
}

const instrumentationScript = `(() => {
  window.__voiceProbe = { getUserMediaCalls: 0, trackStops: 0 };
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (...args) => {
    window.__voiceProbe.getUserMediaCalls += 1;
    const stream = await original(...args);
    for (const track of stream.getTracks()) {
      const prior = track.stop.bind(track);
      track.stop = () => {
        window.__voiceProbe.trackStops += 1;
        window.electronAPI.probeTrackStopped();
        return prior();
      };
    }
    return stream;
  };
  return true;
})()`;

const findTestButtonScript = `(() => {
  const section = [...document.querySelectorAll('section')].find((entry) => entry.innerText.includes('Test Voice Input'));
  if (!section) return null;
  return [...section.querySelectorAll('button')].find((button) => /^(Start Test|Stop Test|Starting microphone\.\.\.)$/i.test(button.textContent.trim())) || null;
})()`;

async function clickTestAndCaptureNextRender(win) {
  return win.webContents.executeJavaScript(`(async () => {
    const button = ${findTestButtonScript};
    if (!button) throw new Error('Voice test button was not found');
    const before = { text: button.textContent.trim(), ariaBusy: button.getAttribute('aria-busy'), disabled: button.disabled };
    button.click();
    const immediate = { text: button.textContent.trim(), ariaBusy: button.getAttribute('aria-busy'), disabled: button.disabled };
    await Promise.resolve();
    const microtask = { text: button.textContent.trim(), ariaBusy: button.getAttribute('aria-busy'), disabled: button.disabled };
    await new Promise(requestAnimationFrame);
    const nextRender = { text: button.textContent.trim(), ariaBusy: button.getAttribute('aria-busy'), disabled: button.disabled };
    return { before, immediate, microtask, nextRender };
  })()`);
}

async function testSuccess() {
  fs.appendFileSync(path.join(evidenceDir, 'electron-voice-started.log'), 'testSuccess start\n');
  const { win, permissionDecisions } = await createWindow('success', true);
  await win.webContents.executeJavaScript(instrumentationScript);
  const startingTransition = await clickTestAndCaptureNextRender(win);

  // Exercise duplicate UI attempts while the first request is still pending. The real
  // next-render button is disabled and must not enter the capture path twice.
  await win.webContents.executeJavaScript(`(() => { const b = ${findTestButtonScript}; b.click(); b.click(); return true; })()`);

  await waitFor(
    () => win.webContents.executeJavaScript(`(() => { const b = ${findTestButtonScript}; return b?.textContent.trim() === 'Stop Test'; })()`),
    'successful recording state',
  );
  const recordingState = await win.webContents.executeJavaScript(`(() => {
    const b = ${findTestButtonScript};
    return {
      button: { text: b?.textContent.trim(), ariaBusy: b?.getAttribute('aria-busy'), disabled: b?.disabled },
      instrument: window.__voiceProbe,
      deviceLabels: [...document.querySelectorAll('section select option')].map((o) => o.textContent.trim()),
      cardText: [...document.querySelectorAll('section')].find((s) => s.innerText.includes('Test Voice Input'))?.innerText,
      workletResources: performance.getEntriesByType('resource').map((e) => e.name).filter((n) => n.includes('voice-input-recorder')),
    };
  })()`);

  await sleep(200);
  const duplicateGetUserMediaCalls = await win.webContents.executeJavaScript('window.__voiceProbe.getUserMediaCalls');

  await sleep(1000);
  await win.webContents.executeJavaScript(`(() => { const b = ${findTestButtonScript}; b.click(); return true; })()`);
  await waitFor(
    () => win.webContents.executeJavaScript("document.body.innerText.includes('isolated electron transcript')"),
    'transcript-ready result',
  );
  const finalState = await win.webContents.executeJavaScript(`(() => {
    const section = [...document.querySelectorAll('section')].find((s) => s.innerText.includes('Test Voice Input'));
    const b = ${findTestButtonScript};
    return {
      button: { text: b?.textContent.trim(), ariaBusy: b?.getAttribute('aria-busy'), disabled: b?.disabled },
      cardText: section?.innerText,
      instrument: window.__voiceProbe,
    };
  })()`);
  await win.webContents.capturePage().then((image) => fs.writeFileSync(screenshotPath, image.toPNG()));

  // Start a second recording, then unmount the card. The production onBeforeUnmount handler
  // must cancel only the settings-test source and stop its real MediaStream track.
  const stopsBeforeUnmount = state.ipc.trackStops;
  const unmountStartTransition = await clickTestAndCaptureNextRender(win);
  await waitFor(
    () => win.webContents.executeJavaScript(`(() => { const b = ${findTestButtonScript}; return b?.textContent.trim() === 'Stop Test'; })()`),
    'second recording before unmount',
  );
  await win.webContents.executeJavaScript("document.querySelector('[data-testid=settings-nav-display]').click()");
  await waitFor(() => state.ipc.trackStops > stopsBeforeUnmount, 'MediaStream track stop on settings-card unmount');
  const unmountState = {
    stopsBeforeUnmount,
    stopsAfterUnmount: state.ipc.trackStops,
    extensionsUnmounted: await win.webContents.executeJavaScript("!document.body.innerText.includes('Test Voice Input')"),
  };

  state.success = {
    permissionDecisions,
    startingTransition,
    recordingState,
    duplicateGetUserMediaCalls,
    finalState,
    unmountStartTransition,
    unmountState,
  };
}

async function testDenied() {
  fs.appendFileSync(path.join(evidenceDir, 'electron-voice-started.log'), 'testDenied start\n');
  await sleep(500);
  const { win, permissionDecisions } = await createWindow('denied', false);
  await win.webContents.executeJavaScript(instrumentationScript);
  await waitFor(
    () => win.webContents.executeJavaScript(`(() => { const b = ${findTestButtonScript}; return b && !b.disabled; })()`),
    'prompt-state voice test button',
  );
  const startingTransition = await clickTestAndCaptureNextRender(win);
  await waitFor(
    () => win.webContents.executeJavaScript(`(() => {
      const section = [...document.querySelectorAll('section')].find((s) => s.innerText.includes('Test Voice Input'));
      const b = ${findTestButtonScript};
      return Boolean(section && /denied|access|permission/i.test(section.innerText) && b?.textContent.trim() === 'Start Test' && b?.getAttribute('aria-busy') !== 'true');
    })()`),
    'permission-denied error and cleared pending state',
  );
  const finalState = await win.webContents.executeJavaScript(`(() => {
    const section = [...document.querySelectorAll('section')].find((s) => s.innerText.includes('Test Voice Input'));
    const b = ${findTestButtonScript};
    return {
      button: { text: b?.textContent.trim(), ariaBusy: b?.getAttribute('aria-busy'), disabled: b?.disabled },
      cardText: section?.innerText,
      instrument: window.__voiceProbe,
    };
  })()`);
  win.destroy();
  state.denied = { permissionDecisions, startingTransition, finalState };
}

fs.appendFileSync(path.join(evidenceDir, 'electron-voice-started.log'), `before-ready isReady=${app.isReady()}\n`);
app.on('will-finish-launching', () => fs.appendFileSync(path.join(evidenceDir, 'electron-voice-started.log'), 'will-finish-launching\n'));
app.on('ready', () => fs.appendFileSync(path.join(evidenceDir, 'electron-voice-started.log'), 'ready-event\n'));
app.whenReady().then(async () => {
  fs.appendFileSync(path.join(evidenceDir, 'electron-voice-started.log'), 'whenReady\n');
  try {
    await testSuccess();
    await testDenied();
  } catch (error) {
    state.errors.push({ message: error?.message || String(error), stack: error?.stack || null });
    process.exitCode = 1;
  } finally {
    for (const win of BrowserWindow.getAllWindows()) win.destroy();
    state.cleanup.windowsRemaining = BrowserWindow.getAllWindows().length;
    state.cleanup.userDataPath = userDataPath;
    state.cleanup.completedAt = new Date().toISOString();
    state.completedAt = new Date().toISOString();
    state.durationMs = new Date(state.completedAt).getTime() - new Date(state.startedAt).getTime();
    fs.writeFileSync(summaryPath, JSON.stringify(state, null, 2));
    app.quit();
  }
});

setTimeout(() => {
  state.errors.push({ message: 'Global 90-second harness timeout' });
  fs.writeFileSync(summaryPath, JSON.stringify(state, null, 2));
  app.exit(2);
}, 90000).unref();
