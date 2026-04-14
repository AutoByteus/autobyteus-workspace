const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { app, BrowserWindow, session: electronSession } = require('electron');

const appRoot = process.env.VALIDATION_APP_ROOT;
const fixtureDir = process.env.VALIDATION_FIXTURE_DIR;
const userDataDir = process.env.VALIDATION_USER_DATA_DIR;
const outputPath = process.env.VALIDATION_OUTPUT_PATH;
const phase = process.env.VALIDATION_PHASE;

if (!appRoot || !fixtureDir || !userDataDir || !outputPath || !phase) {
  console.error('Missing validation harness environment.');
  process.exit(2);
}

const { BrowserSessionProfile } = require(path.join(
  appRoot,
  'dist/electron/browser/browser-session-profile.js',
));
const { BrowserViewFactory } = require(path.join(
  appRoot,
  'dist/electron/browser/browser-view-factory.js',
));
const { BrowserTabManager } = require(path.join(
  appRoot,
  'dist/electron/browser/browser-tab-manager.js',
));
const { BrowserShellController } = require(path.join(
  appRoot,
  'dist/electron/browser/browser-shell-controller.js',
));

app.setPath('userData', userDataDir);

class HiddenShell {
  constructor() {
    this.browserWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    this.shellId = this.browserWindow.webContents.id;
    this.attachedView = null;
    this.browserBounds = { x: 0, y: 0, width: 1024, height: 768 };
  }

  send() {}

  attachBrowserView(view) {
    if (this.attachedView && !this.browserWindow.isDestroyed()) {
      try {
        this.browserWindow.contentView.removeChildView(this.attachedView);
      } catch {
        // No-op for cleanup race in validation harness.
      }
    }

    this.attachedView = view;
    if (view && !this.browserWindow.isDestroyed()) {
      this.browserWindow.contentView.addChildView(view);
      view.setBounds(this.browserBounds);
    }
  }

  updateBrowserHostBounds(bounds) {
    if (bounds) {
      this.browserBounds = bounds;
    }
    if (this.attachedView) {
      this.attachedView.setBounds(this.browserBounds);
    }
  }

  close() {
    if (!this.browserWindow.isDestroyed()) {
      this.browserWindow.close();
    }
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (predicate, label, timeoutMs = 5000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await wait(50);
  }
  throw new Error(`Timed out waiting for ${label}.`);
};

const readJsonResult = async (manager, tabId, javascript) => {
  const result = await manager.executeJavascript({
    tab_id: tabId,
    javascript,
  });
  return JSON.parse(result.result_json);
};

const fixtureUrl = (fixtureName) => pathToFileURL(path.join(fixtureDir, fixtureName)).toString();

const writeResult = (payload) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));
};

const buildHarness = () => {
  const sessionProfile = new BrowserSessionProfile();
  const manager = new BrowserTabManager({
    viewFactory: new BrowserViewFactory(sessionProfile),
    screenshotWriter: {
      write: async () => '/tmp/autobyteus-browser-validation-unused.png',
    },
  });
  const controller = new BrowserShellController(manager);
  const shell = new HiddenShell();
  controller.registerShell(shell);
  controller.updateHostBounds(shell.shellId, { x: 0, y: 0, width: 1024, height: 768 });
  const popupEvents = [];
  manager.onPopupOpened((event) => popupEvents.push(event));
  return { sessionProfile, manager, controller, shell, popupEvents };
};

const cleanupHarness = async ({ manager, controller, shell }) => {
  try {
    controller.dispose();
  } catch {
    // no-op
  }
  try {
    await manager.closeAllSessions();
  } catch {
    // no-op
  }
  try {
    shell.close();
  } catch {
    // no-op
  }
};

const runSeedAndAllowPath = async (harness) => {
  const { sessionProfile, manager, controller, shell, popupEvents } = harness;
  const authUrl = fixtureUrl('auth.html');
  const popupOpenerUrl = fixtureUrl('popup-opener.html');
  const popupChildUrl = fixtureUrl('popup-child.html');

  const opened = await controller.openSession(shell.shellId, {
    url: authUrl,
    waitUntil: 'load',
  });
  const openerId = opened.activeTabId;

  const storageBefore = await readJsonResult(manager, openerId, 'window.readAuthStorage()');
  const storageAfter = await readJsonResult(manager, openerId, 'window.setAuthStorage()');

  const browserSession = sessionProfile.getSession();
  await browserSession.cookies.set({
    url: 'https://validation.test',
    name: 'auth_token',
    value: 'persisted',
    expirationDate: Math.floor(Date.now() / 1000) + 3600,
  });

  const second = await controller.openSession(shell.shellId, {
    url: authUrl,
    waitUntil: 'load',
  });
  const secondId = second.activeTabId;
  const secondStorage = await readJsonResult(manager, secondId, 'window.readAuthStorage()');

  controller.focusSession(shell.shellId, openerId);
  await controller.navigateSession(shell.shellId, {
    tabId: openerId,
    url: popupOpenerUrl,
    waitUntil: 'load',
  });
  const popupOpened = await readJsonResult(
    manager,
    openerId,
    `window.openPopupChild(${JSON.stringify(popupChildUrl)})`,
  );

  await waitFor(() => popupEvents.length === 1, 'popup-opened event');
  const popupId = popupEvents[0].tab_id;
  await waitFor(
    () => controller.getSnapshot(shell.shellId).activeTabId === popupId,
    'popup focus inside the Browser shell',
  );

  const popupStorage = await readJsonResult(manager, popupId, 'window.readAuthStorage()');
  const openerRecord = manager.sessions.get(openerId);
  const popupRecord = manager.sessions.get(popupId);
  const cookies = await browserSession.cookies.get({ url: 'https://validation.test' });
  browserSession.flushStorageData();
  await browserSession.cookies.flushStore();

  return {
    phase,
    openerId,
    secondId,
    popupId,
    storageBefore,
    storageAfter,
    secondStorage,
    popupStorage,
    popupOpened,
    popupEvents,
    sessionCount: manager.listSessions().sessions.length,
    sameSessionObject: openerRecord.view.webContents.session === popupRecord.view.webContents.session,
    partitionMatchesDedicatedBrowserSession:
      openerRecord.view.webContents.session ===
      electronSession.fromPartition('persist:autobyteus-browser'),
    activeTabId: controller.getSnapshot(shell.shellId).activeTabId,
    attachedViewMatchesPopup: shell.attachedView === popupRecord.view,
    persistedCookieValue: cookies[0]?.value ?? null,
  };
};

const runRestartCheck = async (harness) => {
  const { sessionProfile, manager, controller, shell } = harness;
  const authUrl = fixtureUrl('auth.html');

  const opened = await controller.openSession(shell.shellId, {
    url: authUrl,
    waitUntil: 'load',
  });
  const openerId = opened.activeTabId;
  const storageAfterRestart = await readJsonResult(manager, openerId, 'window.readAuthStorage()');

  const second = await controller.openSession(shell.shellId, {
    url: authUrl,
    waitUntil: 'load',
  });
  const secondId = second.activeTabId;
  const secondTabStorageAfterRestart = await readJsonResult(
    manager,
    secondId,
    'window.readAuthStorage()',
  );

  const browserSession = sessionProfile.getSession();
  const cookies = await browserSession.cookies.get({ url: 'https://validation.test' });

  return {
    phase,
    openerId,
    secondId,
    storageAfterRestart,
    secondTabStorageAfterRestart,
    persistedCookieValue: cookies[0]?.value ?? null,
    persistedCookieCount: cookies.length,
    sessionCount: manager.listSessions().sessions.length,
    partitionMatchesDedicatedBrowserSession:
      manager.sessions.get(openerId).view.webContents.session ===
      electronSession.fromPartition('persist:autobyteus-browser'),
  };
};

const runMismatchProbe = async (harness) => {
  const { manager, controller, shell, popupEvents } = harness;
  const popupOpenerUrl = fixtureUrl('popup-opener.html');
  const popupChildUrl = fixtureUrl('popup-child.html');

  const opened = await controller.openSession(shell.shellId, {
    url: popupOpenerUrl,
    waitUntil: 'load',
  });
  const openerId = opened.activeTabId;
  const openerRecord = manager.sessions.get(openerId);

  const foreignSession = electronSession.fromPartition('persist:validation-foreign-popup');
  const foreignWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      session: foreignSession,
    },
  });
  const foreignWebContents = foreignWindow.webContents;
  await foreignWindow.loadURL(popupChildUrl);

  let thrown = null;
  try {
    manager.createPopupChildWindow(openerRecord, popupChildUrl, {
      webContents: foreignWebContents,
    });
  } catch (error) {
    thrown = error;
  }

  await waitFor(
    () => foreignWindow.isDestroyed() || foreignWebContents.isDestroyed(),
    'foreign popup cleanup',
  );
  await wait(200);

  return {
    phase,
    openerId,
    errorName: thrown?.name ?? null,
    errorCode: thrown?.code ?? null,
    errorMessage: thrown?.message ?? null,
    popupEventsLength: popupEvents.length,
    sessionCount: manager.listSessions().sessions.length,
    activeTabId: controller.getSnapshot(shell.shellId).activeTabId,
    attachedViewStillMatchesOpener: shell.attachedView === openerRecord.view,
    aliveWindowCount: BrowserWindow.getAllWindows().filter((window) => !window.isDestroyed()).length,
    foreignWindowDestroyed: foreignWindow.isDestroyed(),
    foreignWebContentsDestroyed: foreignWebContents.isDestroyed(),
  };
};

(async () => {
  await app.whenReady();
  const harness = buildHarness();

  try {
    let result;
    if (phase === 'seed_and_allow_path') {
      result = await runSeedAndAllowPath(harness);
    } else if (phase === 'restart_check') {
      result = await runRestartCheck(harness);
    } else if (phase === 'mismatch_probe') {
      result = await runMismatchProbe(harness);
    } else {
      throw new Error(`Unsupported validation phase '${phase}'.`);
    }

    writeResult(result);
  } catch (error) {
    const failure = {
      phase,
      errorName: error instanceof Error ? error.name : 'Error',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
    writeResult(failure);
    process.exitCode = 1;
  } finally {
    await cleanupHarness(harness);
    setTimeout(() => app.quit(), 50);
  }
})();
