// autobyteus-507 in real Electron: the screenshot tool's capture path (BrowserTabManager, BrowserTabPageOperations
// and WorkspaceShellWindow, transpiled from source) runs in the Electron binary this package pins. Chromium
// copies only a frame a tab has drawn, and a tab not shown on screen stops drawing, so the first capture after
// its page loaded or navigated is rejected (`UnknownVizError`, or `Current display surface not available for
// capture` for a tab never drawn). The cases are the agents' sequences with the tab not shown:
//   AC-002 open_tab -> screenshot; AC-001 navigate_to -> screenshot; AC-005 navigate_to -> full-page screenshot
//   (bounds restored); AC-003 the founder's open_tab -> set_device_emulation mobile 412x915 -> screenshot
//   (innerWidth/innerHeight unchanged); AC-004 a tab shown in a shell window that is then minimized, navigate_to
//   -> screenshot (the window does not hold the view while minimized), and after restore.
// Each capture must return a non-empty PNG artifact within the 2 s retry bound (QR-001, with slack for the
// artifact write). A capture still pending is never destroyed (destroying it can crash Electron, FU-002); the
// harness only waits for it to answer, up to a guard, and reports it.
// Needs a display and shows one window (minimized during AC-004). On Linux it is skipped without
// DISPLAY/WAYLAND_DISPLAY. Command: pnpm -C autobyteus-web test:electron browser/__tests__/browser-screenshot-capture.electron.spec.ts --run
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const requireFromHere = createRequire(__filename)
const electronDir = path.resolve(__dirname, '../..')
// The import closure of BrowserTabManager and WorkspaceShellWindow, relative to autobyteus-web/electron.
const SOURCES = [
  'appDataPaths.ts',
  'logger.ts',
  'browser/browser-device-emulation.ts',
  'browser/browser-dom-snapshot-script.ts',
  'browser/browser-file-document-request.ts',
  'browser/browser-page-cleaner.ts',
  'browser/browser-screenshot-artifact-writer.ts',
  'browser/browser-session-profile.ts',
  'browser/browser-tab-manager.ts',
  'browser/browser-tab-navigation.ts',
  'browser/browser-tab-observers.ts',
  'browser/browser-tab-page-operations.ts',
  'browser/browser-tab-types.ts',
  'browser/browser-view-factory.ts',
  'shell/workspace-shell-window.ts',
]
const noDisplay = process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY
// Total time a successful capture may take: the 2 s retry bound plus the PNG write.
const CAPTURE_BOUND_MS = 2_500

// Runs inside Electron.
const MAIN = String.raw`
const { app, nativeImage } = require('electron');
const http = require('http'); const fs = require('fs'); const path = require('path');
const dir = process.argv[process.argv.length - 1];
app.setPath('userData', path.join(dir, 'user-data'));
const { configureElectronLogger } = require('./lib/logger.js');
configureElectronLogger({ baseDataPath: path.join(dir, 'app-data') });
const { BrowserTabManager } = require('./lib/browser/browser-tab-manager.js');
const { BrowserViewFactory } = require('./lib/browser/browser-view-factory.js');
const { BrowserSessionProfile } = require('./lib/browser/browser-session-profile.js');
const { BrowserScreenshotArtifactWriter } = require('./lib/browser/browser-screenshot-artifact-writer.js');
const { WorkspaceShellWindow } = require('./lib/shell/workspace-shell-window.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html');
  res.end('<!doctype html><body style="margin:0"><h1>' + req.url + '</h1>' + '<p>row</p>'.repeat(200) + '</body>');
});
const cases = [];
// Never destroys a pending capture: waits up to the guard, then reports it as still pending.
const screenshot = async (manager, tabId, fullPage) => {
  const startedAt = Date.now();
  const outcome = await Promise.race([
    manager.captureScreenshot({ tab_id: tabId, full_page: fullPage }).then(
      (result) => ({ result }),
      (error) => ({ error: { code: error.code ?? null, message: error.message } })),
    wait(8000).then(() => ({ error: { code: null, message: 'no answer within 8 s (harness guard)' } })),
  ]);
  const ms = Date.now() - startedAt;
  if (outcome.error) return { ok: false, ms, error: outcome.error };
  const image = nativeImage.createFromPath(outcome.result.artifact_path);
  return { ok: !image.isEmpty(), ms, size: image.getSize(), tabId: outcome.result.tab_id };
};
const record = (id, entry) => { cases.push({ id, ...entry }); };

server.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + server.address().port;
  await app.whenReady();
  const manager = new BrowserTabManager({
    viewFactory: new BrowserViewFactory(new BrowserSessionProfile()),
    screenshotWriter: new BrowserScreenshotArtifactWriter(path.join(dir, 'screenshots')),
  });

  // AC-002: a fresh tab, never shown, screenshot right after it loaded.
  const tab = (await manager.openSession({ url: base + '/fresh' })).tab_id;
  record('AC-002', await screenshot(manager, tab, false));
  // AC-001: the same tab navigates, screenshot right after.
  await manager.navigateSession({ tab_id: tab, url: base + '/next' });
  record('AC-001', await screenshot(manager, tab, false));
  // AC-005: full page right after a navigation; the tab's bounds are restored afterwards.
  await manager.navigateSession({ tab_id: tab, url: base + '/long' });
  const boundsBefore = manager.getSessionView(tab).getBounds();
  const fullPage = await screenshot(manager, tab, true);
  record('AC-005', { ...fullPage, boundsBefore, boundsAfter: manager.getSessionView(tab).getBounds() });

  // AC-003: the founder's sequence: open, mobile emulation 412x915 at 2x, screenshot.
  const mobile = (await manager.openSession({ url: base + '/mobile' })).tab_id;
  await manager.setDeviceEmulation({ tab_id: mobile, mode: 'mobile', width: 412, height: 915, device_scale_factor: 2 });
  const viewport = async () => JSON.parse((await manager.executeJavascript({ tab_id: mobile, javascript: '[innerWidth, innerHeight]' })).result_json);
  const viewportBefore = await viewport();
  const emulated = await screenshot(manager, mobile, false);
  record('AC-003', { ...emulated, viewportBefore, viewportAfter: await viewport() });

  // AC-004: a tab shown in a shell window; the window is minimized, the tab navigates, screenshot.
  const preload = path.join(dir, 'preload.js'); fs.writeFileSync(preload, '');
  const shell = new WorkspaceShellWindow({ entryId: 'spec', startUrl: 'about:blank', preloadPath: preload, iconPath: '' });
  const shown = (await manager.openSession({ url: base + '/shown' })).tab_id;
  const view = manager.getSessionView(shown);
  shell.updateBrowserHostBounds({ x: 0, y: 0, width: 1280, height: 900 });
  shell.attachBrowserView(view);
  const attached = () => shell.browserWindow.contentView.children.includes(view);
  await wait(500);
  const attachedWhileShown = attached();
  shell.browserWindow.minimize();
  await wait(1500);
  await manager.navigateSession({ tab_id: shown, url: base + '/shown-2' });
  const attachedWhileMinimized = attached();
  record('AC-004', { ...(await screenshot(manager, shown, false)), attachedWhileShown, attachedWhileMinimized });
  shell.browserWindow.restore();
  await wait(1000);
  record('AC-004-restored', { ...(await screenshot(manager, shown, false)), attachedAfterRestore: attached() });

  process.stdout.write('\nRESULT ' + JSON.stringify({ electron: process.versions.electron, cases }) + '\n');
  app.exit(0);
});
`

type CaseResult = {
  id: string
  ok: boolean
  ms: number
  error?: { code: string | null; message: string }
  size?: { width: number; height: number }
  boundsBefore?: unknown
  boundsAfter?: unknown
  viewportBefore?: number[]
  viewportAfter?: number[]
  attachedWhileShown?: boolean
  attachedWhileMinimized?: boolean
  attachedAfterRestore?: boolean
}
type Result = { electron: string; cases: CaseResult[] }

describe.skipIf(noDisplay)('Screenshot of tabs not shown on screen, in real Electron (autobyteus-507)', () => {
  let dir = ''
  let result: Result
  const byId = (id: string): CaseResult => {
    const found = result.cases.find((entry) => entry.id === id)
    if (!found) throw new Error(`No result for ${id}`)
    return found
  }
  const expectCaptured = (id: string): CaseResult => {
    const entry = byId(id)
    expect({ id, ok: entry.ok, error: entry.error }).toEqual({ id, ok: true, error: undefined })
    expect(entry.size!.width).toBeGreaterThan(0)
    expect(entry.size!.height).toBeGreaterThan(0)
    expect(entry.ms).toBeLessThanOrEqual(CAPTURE_BOUND_MS)
    return entry
  }

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'screenshot-electron-'))
    for (const file of SOURCES) {
      const { outputText } = ts.transpileModule(fs.readFileSync(path.join(electronDir, file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      })
      const target = path.join(dir, 'lib', file.replace(/\.ts$/, '.js'))
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, outputText)
    }
    fs.writeFileSync(path.join(dir, 'main.js'), MAIN)
    const electronBinary = requireFromHere('electron') as unknown as string
    const env = { ...process.env }
    delete env.ELECTRON_RUN_AS_NODE
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(electronBinary, [path.join(dir, 'main.js'), dir], { env, stdio: ['ignore', 'pipe', 'pipe'] })
      let stdout = ''
      let stderr = ''
      const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`Electron timed out: ${stderr}`)) }, 90_000)
      child.stdout.on('data', (chunk) => { stdout += chunk })
      child.stderr.on('data', (chunk) => { stderr += chunk })
      child.on('error', reject)
      child.on('exit', (code) => {
        clearTimeout(timer)
        if (code === 0) resolve(stdout)
        else reject(new Error(`Electron exited ${code}: ${stderr}`))
      })
    })
    const line = output.split('\n').find((entry) => entry.startsWith('RESULT '))
    if (!line) throw new Error(`No result from Electron: ${output}`)
    result = JSON.parse(line.slice('RESULT '.length)) as Result
    process.stdout.write(`${line}\n`)
  }, 120_000)

  afterAll(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true })
  })

  it('runs in the Electron version the package pins', () => {
    expect(result.electron).toBe((requireFromHere('electron/package.json') as { version: string }).version)
  })

  it('AC-002: captures a fresh tab that was never shown, right after it loaded', () => {
    expectCaptured('AC-002')
  })

  it('AC-001: captures a tab not shown right after it navigated', () => {
    expectCaptured('AC-001')
  })

  it('AC-005: captures the full page of a tab not shown right after navigation and restores its bounds', () => {
    const entry = expectCaptured('AC-005')
    expect(entry.boundsAfter).toEqual(entry.boundsBefore)
  })

  it("AC-003: captures the founder's emulated mobile tab and keeps its emulated viewport", () => {
    const entry = expectCaptured('AC-003')
    expect(entry.viewportAfter).toEqual(entry.viewportBefore)
  })

  it('AC-004: captures a tab of a minimized window; the window does not hold the view while minimized', () => {
    const entry = expectCaptured('AC-004')
    expect(entry.attachedWhileShown).toBe(true)
    expect(entry.attachedWhileMinimized).toBe(false)
  })

  it('AC-004: shows the view again after restore and captures it', () => {
    const entry = expectCaptured('AC-004-restored')
    expect(entry.attachedAfterRestore).toBe(true)
  })
})
