// E2E-10 temporary probe (autobyteus-507): AC-006 against real Chromium: a tab whose renderer crashed (the requirements'
// example of a capture that still fails) -> screenshot must fail with browser_screenshot_failed + reason, bounded, no artifact. Runs the
// product's BrowserTabManager + WorkspaceShellWindow, transpiled from <sourceDir>, in the pinned Electron,
// without the isolated-instance flag --disable-backgrounding-occluded-windows. Same harness pattern as
// autobyteus-web/electron/browser/__tests__/browser-screenshot-capture.electron.spec.ts.
// Usage (from autobyteus-web): node <ticket>/evidence/api-e2e/E2E-10-crash_probe.mjs <electron sourceDir> <label>
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
  const shotDir = path.join(dir, 'screenshots');
  const files = () => (fs.existsSync(shotDir) ? fs.readdirSync(shotDir).length : 0);
  for (const variant of ['detached-crashed', 'detached-crashed-emulated']) {
    const t = (await manager.openSession({ url: base + '/' + variant })).tab_id;
    if (variant.endsWith('emulated')) await manager.setDeviceEmulation({ tab_id: t, mode: 'mobile', width: 412, height: 915, device_scale_factor: 2 });
    const wc = manager.getSessionView(t).webContents;
    const gone = new Promise((r) => wc.once('render-process-gone', (_e, d) => r(d.reason)));
    wc.forcefullyCrashRenderer();
    const reason = await Promise.race([gone, wait(5000).then(() => 'no render-process-gone')]);
    const before = files();
    const result = await shot(manager, t);
    cases.push({ id: variant, renderProcessGone: reason, filesBefore: before, filesAfter: files(), ...result });
  }
  process.stdout.write('\nRESULT ' + JSON.stringify({ electron: process.versions.electron, at: new Date().toISOString(), cases }) + '\n');
  app.exit(0);
});
`
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ae507-crash-'))
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
