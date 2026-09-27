// API/E2E temporary harness (desktop-beta-update-channel).
// Runs the compiled AppUpdater (new or base revision) inside the real Electron runtime
// with the real electron-updater against a local GitHub-shaped release feed.
// Only substitution: app.isPackaged -> true and app.getVersion() -> scenario version,
// via a module-load proxy of 'electron'. The feed is configured through a real
// app-update.yml (autoUpdater.updateConfigPath), as in a packaged build.
const path = require('path');
const fs = require('fs');
const http = require('http');
const Module = require('module');

// Resolve electron-updater (and the compiled code's bare imports) from autobyteus-web/node_modules.
process.env.NODE_PATH = process.env.ABX_NODE_MODULES;
Module._initPaths();

const cfg = JSON.parse(fs.readFileSync(process.env.ABX_SCENARIO, 'utf8'));
const realElectron = require('electron');
const realApp = realElectron.app;
const appProxy = new Proxy(realApp, {
  get(target, prop) {
    if (prop === 'isPackaged') return true;
    if (prop === 'getVersion') return () => cfg.appVersion;
    const value = Reflect.get(target, prop, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
const electronProxy = new Proxy(realElectron, {
  get(target, prop) {
    return prop === 'app' ? appProxy : Reflect.get(target, prop);
  },
});
const originalLoad = Module._load;
Module._load = function patchedLoad(request, ...rest) {
  if (request === 'electron') return electronProxy;
  return originalLoad.call(this, request, ...rest);
};

realApp.setPath('userData', cfg.userData);
const result = { scenario: cfg.name, appVersion: cfg.appVersion, code: cfg.codeLabel, steps: [], requests: [] };
let feedDown = false;
const OWNER = 'AutoByteus';
const REPO = 'autobyteus-workspace';

function atomFeed(host) {
  const entries = cfg.feed.releases
    .map(
      (release) => `  <entry>
    <id>tag:github.com,2008:Repository/1/${release.tag}</id>
    <updated>2026-09-27T00:00:00Z</updated>
    <link rel="alternate" type="text/html" href="http://${host}/${OWNER}/${REPO}/releases/tag/${release.tag}"/>
    <title>${release.tag}</title>
    <content type="html">notes for ${release.tag}</content>
  </entry>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <id>tag:github.com,2008:/${OWNER}/${REPO}/releases</id>\n  <title>Release notes</title>\n  <updated>2026-09-27T00:00:00Z</updated>\n${entries}\n</feed>\n`;
}

function startFeed() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://feed');
      if (feedDown) {
        result.requests.push({ method: req.method, path: url.pathname, status: 503 });
        res.writeHead(503, { 'content-type': 'text/plain' });
        res.end('Service Unavailable');
        return;
      }
      let status = 404;
      let body = 'Not Found';
      let type = 'text/plain';
      const host = req.headers.host;
      if (url.pathname === `/${OWNER}/${REPO}/releases.atom`) {
        status = 200;
        body = atomFeed(host);
        type = 'application/atom+xml';
      } else if (url.pathname === `/api/v3/repos/${OWNER}/${REPO}/releases/latest`) {
        // GitHub semantics: newest non-draft, non-prerelease release.
        const latest = cfg.feed.releases.find((release) => !release.prerelease);
        status = latest ? 200 : 404;
        body = latest ? JSON.stringify({ tag_name: latest.tag, prerelease: false }) : '{}';
        type = 'application/json';
      } else {
        const match = url.pathname.match(new RegExp(`^/${OWNER}/${REPO}/releases/download/([^/]+)/([^/]+)$`));
        const asset = match && cfg.feed.assets[match[1]] && cfg.feed.assets[match[1]][match[2]];
        if (asset) {
          status = 200;
          if (asset.file) {
            const data = fs.readFileSync(asset.file);
            result.requests.push({ method: req.method, path: url.pathname, status, bytes: data.length });
            res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': data.length });
            res.end(data);
            return;
          }
          body = asset.text;
          type = 'text/yaml';
        }
      }
      result.requests.push({ method: req.method, path: url.pathname, status });
      res.writeHead(status, { 'content-type': type });
      res.end(body);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(read, predicate, timeoutMs = 60000) {
  const start = Date.now();
  let value = read();
  while (!predicate(value)) {
    if (Date.now() - start > timeoutMs) return { timedOut: true, value };
    await sleep(100);
    value = await read();
  }
  return { timedOut: false, value };
}

function snapshot(state) {
  if (!state) return state;
  const { status, currentVersion, currentVersionIsPrerelease, updateChannel, updateStaged, availableVersion, message, errorKind } = state;
  return { status, currentVersion, currentVersionIsPrerelease, updateChannel, updateStaged, availableVersion, message, errorKind };
}

function channelFile() {
  const file = path.join(cfg.userData, 'app-update-channel.v1.json');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

async function run() {
  await realApp.whenReady();
  if (realApp.dock) realApp.dock.hide();
  const server = await startFeed();
  const port = server.address().port;
  const updateConfig = path.join(cfg.userData, '..', `${cfg.name}-app-update.yml`);
  fs.writeFileSync(
    updateConfig,
    `provider: github\nowner: ${OWNER}\nrepo: ${REPO}\nhost: 127.0.0.1:${port}\nprotocol: http\nupdaterCacheDirName: ${cfg.cacheDirName}\n`,
  );

  require(path.join(cfg.codeDir, 'electron/logger.js')).configureElectronLogger({ baseDataPath: cfg.logBase });
  const { autoUpdater } = require('electron-updater');
  autoUpdater.updateConfigPath = updateConfig;
  const { AppUpdater } = require(path.join(cfg.codeDir, 'electron/updater/appUpdater.js'));
  const updater = new AppUpdater(cfg.autoCheckDelayMs ?? 50);
  updater.initialize();
  const policy = () => ({ allowPrerelease: autoUpdater.allowPrerelease, allowDowngrade: autoUpdater.allowDowngrade });
  result.afterInitialize = { state: snapshot(updater.getState()), policy: policy(), channelFile: channelFile() };

  let win = null;
  const invoke = (expression) => win.webContents.executeJavaScript(expression);
  for (const step of cfg.steps) {
    const record = { op: step.op, arg: step.channel ?? step.url ?? null };
    try {
      if (step.op === 'check') {
        record.state = snapshot(await updater.checkForUpdates('manual'));
      } else if (step.op === 'startup') {
        updater.startAutoCheck();
        const waited = await waitFor(() => updater.getState(), (s) => !['idle', 'checking'].includes(s.status), 60000);
        record.timedOut = waited.timedOut;
        record.state = snapshot(waited.value);
      } else if (step.op === 'window') {
        win = new realElectron.BrowserWindow({
          show: false,
          webPreferences: { preload: path.join(cfg.codeDir, 'electron/preload.js'), contextIsolation: true, sandbox: false },
        });
        await win.loadURL(step.url || 'data:text/html,<html><body>harness</body></html>');
        await invoke(`window.__states = []; window.electronAPI.onAppUpdateState((s) => window.__states.push(s)); typeof window.electronAPI.setAppUpdateChannel`)
          .then((type) => (record.bridgeSetChannelType = type));
      } else if (step.op === 'ipc-set') {
        const response = await invoke(`window.electronAPI.setAppUpdateChannel(${JSON.stringify(step.channel)})`);
        record.response = { accepted: response.accepted, persisted: response.persisted, state: snapshot(response.state) };
      } else if (step.op === 'ipc-get') {
        record.state = snapshot(await invoke('window.electronAPI.getAppUpdateState()'));
      } else if (step.op === 'ipc-check') {
        record.state = snapshot(await invoke('window.electronAPI.checkForAppUpdates()'));
      } else if (step.op === 'ipc-download') {
        record.initial = snapshot(await invoke('window.electronAPI.downloadAppUpdate()'));
        const waited = await waitFor(() => updater.getState(), (s) => ['downloaded', 'error'].includes(s.status), 120000);
        record.timedOut = waited.timedOut;
        record.state = snapshot(waited.value);
      } else if (step.op === 'renderer-broadcasts') {
        const states = await invoke('window.__states');
        record.broadcasts = states.map((s) => `${s.status}|${s.updateChannel}|${s.availableVersion}`);
      } else if (step.op === 'eval') {
        record.value = await invoke(step.js);
      } else if (step.op === 'feed-down') {
        feedDown = true;
      } else if (step.op === 'wait') {
        await sleep(step.ms);
      }
      record.policy = policy();
      record.channelFile = channelFile();
    } catch (error) {
      record.error = String(error && error.stack ? error.stack : error);
    }
    result.steps.push(record);
  }
  result.final = { state: snapshot(updater.getState()), policy: policy(), channelFile: channelFile() };
  fs.writeFileSync(cfg.resultPath, JSON.stringify(result, null, 2));
  if (cfg.quitNormally) {
    // Only for the temp Electron.app copy: observe the product's install-on-quit behavior.
    setTimeout(() => realApp.quit(), 500);
    return;
  }
  // Never let a staged download install into anything on quit.
  autoUpdater.autoInstallOnAppQuit = false;
  server.close();
  realApp.exit(0);
}

run().catch((error) => {
  result.fatal = String(error && error.stack ? error.stack : error);
  fs.writeFileSync(cfg.resultPath, JSON.stringify(result, null, 2));
  realApp.exit(1);
});
