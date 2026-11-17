// E2E-06 temporary probe (autobyteus-507): a tab attached to a shell window that is visible and not minimized,
// while the screen is locked / the window is occluded (a real user state: away, display locked). Runs the
// product's BrowserTabManager + WorkspaceShellWindow, transpiled from <sourceDir>, in the pinned Electron,
// without the isolated-instance flag --disable-backgrounding-occluded-windows. Same harness pattern as
// autobyteus-web/electron/browser/__tests__/browser-screenshot-capture.electron.spec.ts.
// Usage (from autobyteus-web): node <ticket>/evidence/api-e2e/E2E-06-occluded_probe.mjs <electron sourceDir> <label>
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const ts = require('typescript')
const electronBinary = require('electron')
const [sourceDir, label] = process.argv.slice(2)
const SOURCES = ['appDataPaths.ts', 'logger.ts', 'browser/browser-device-emulation.ts', 'browser/browser-dom-snapshot-script.ts',
  'browser/browser-file-document-request.ts', 'browser/browser-page-cleaner.ts', 'browser/browser-screenshot-artifact-writer.ts',
  'browser/browser-session-profile.ts', 'browser/browser-tab-manager.ts', 'browser/browser-tab-navigation.ts',
  'browser/browser-tab-observers.ts', 'browser/browser-tab-page-operations.ts', 'browser/browser-tab-types.ts',
  'browser/browser-view-factory.ts', 'shell/workspace-shell-window.ts']
const MAIN = String.raw`
const { app, nativeImage } = require('electron');
const http = require('http'); const fs = require('fs'); const path = require('path');
const dir = process.argv[process.argv.length - 1];
app.setPath('userData', path.join(dir, 'user-data'));
require('./lib/logger.js').configureElectronLogger({ baseDataPath: path.join(dir, 'app-data') });
const { BrowserTabManager } = require('./lib/browser/browser-tab-manager.js');
const { BrowserViewFactory } = require('./lib/browser/browser-view-factory.js');
const { BrowserSessionProfile } = require('./lib/browser/browser-session-profile.js');
const { BrowserScreenshotArtifactWriter } = require('./lib/browser/browser-screenshot-artifact-writer.js');
const { WorkspaceShellWindow } = require('./lib/shell/workspace-shell-window.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const server = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><body><h1>' + req.url + '</h1>' + '<p>row</p>'.repeat(100) + '</body>'); });
const cases = [];
const shot = async (manager, tabId) => {
  const startedAt = Date.now();
  const outcome = await Promise.race([
    manager.captureScreenshot({ tab_id: tabId, full_page: false }).then((result) => ({ result }), (error) => ({ error: { code: error.code ?? null, message: error.message } })),
    wait(8000).then(() => ({ error: { code: null, message: 'no answer within 8 s (harness guard)' } })),
  ]);
  const ms = Date.now() - startedAt;
  if (outcome.error) return { ok: false, ms, error: outcome.error };
  const image = nativeImage.createFromPath(outcome.result.artifact_path);
  return { ok: !image.isEmpty(), ms, size: image.getSize() };
};
server.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + server.address().port;
  await app.whenReady();
  const manager = new BrowserTabManager({ viewFactory: new BrowserViewFactory(new BrowserSessionProfile()), screenshotWriter: new BrowserScreenshotArtifactWriter(path.join(dir, 'screenshots')) });
  const preload = path.join(dir, 'preload.js'); fs.writeFileSync(preload, '');
  const shell = new WorkspaceShellWindow({ entryId: 'probe', startUrl: 'about:blank', preloadPath: preload, iconPath: '' });
  const tab = (await manager.openSession({ url: base + '/start' })).tab_id;
  const view = manager.getSessionView(tab);
  shell.updateBrowserHostBounds({ x: 0, y: 0, width: 1280, height: 900 });
  shell.attachBrowserView(view);
  await wait(1500);
  const state = async () => ({
    windowVisible: shell.browserWindow.isVisible(), minimized: shell.browserWindow.isMinimized(),
    attached: shell.browserWindow.contentView.children.includes(view),
    pageVisibility: JSON.parse((await manager.executeJavascript({ tab_id: tab, javascript: 'document.visibilityState' })).result_json),
  });
  cases.push({ id: 'idle-attached', ...(await state()), ...(await shot(manager, tab)) });
  for (let i = 1; i <= 3; i += 1) {
    await manager.navigateSession({ tab_id: tab, url: base + '/nav-' + i });
    const before = await state();
    cases.push({ id: 'after-navigate-' + i, ...before, ...(await shot(manager, tab)) });
  }
  const mobile = await manager.setDeviceEmulation({ tab_id: tab, mode: 'mobile', width: 412, height: 915, device_scale_factor: 2 });
  await manager.navigateSession({ tab_id: tab, url: base + '/founder' });
  cases.push({ id: 'founder-emulated', ...(await state()), ...(await shot(manager, tab)) });
  process.stdout.write('\nRESULT ' + JSON.stringify({ electron: process.versions.electron, at: new Date().toISOString(), cases }) + '\n');
  app.exit(0);
});
`
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ae507-occluded-'))
for (const file of SOURCES) {
  const { outputText } = ts.transpileModule(fs.readFileSync(path.join(sourceDir, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } })
  const target = path.join(dir, 'lib', file.replace(/\.ts$/, '.js'))
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, outputText)
}
fs.writeFileSync(path.join(dir, 'main.js'), MAIN)
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const run = spawnSync(electronBinary, [path.join(dir, 'main.js'), dir], { env, encoding: 'utf8', timeout: 120000 })
const line = (run.stdout || '').split('\n').find((entry) => entry.startsWith('RESULT '))
console.log(`label=${label} exit=${run.status} sourceDir=${sourceDir}`)
if (line) {
  const result = JSON.parse(line.slice(7))
  console.log(`electron=${result.electron} at=${result.at}`)
  for (const c of result.cases) console.log(JSON.stringify(c))
} else {
  console.log('NO RESULT', run.stdout, run.stderr)
}
fs.rmSync(dir, { recursive: true, force: true })
