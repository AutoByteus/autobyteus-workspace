// autobyteus-416 D6 in real Electron: the Browser session policy (BrowserSessionProfile, transpiled from
// source) runs in the Electron binary this package pins. A `file://` page and every document it creates
// make each request form the design traces; a local server records the Origin each request arrives with.
// Expected results are the measured ones (tickets/.../evidence/SR-003-d6-file-origin-forms.json and
// SR-003-d6-http-page-control.json): every request from a file:// document arrives as `Origin: null`, GET
// navigations arrive unchanged, and an http page's requests keep their own Origin (the premise of rule (c);
// an Electron upgrade that changes it fails here).
// Needs a display (macOS and Windows sessions have one; on Linux it is skipped without DISPLAY/WAYLAND_DISPLAY).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const requireFromHere = createRequire(__filename)
const browserDir = path.resolve(__dirname, '..')
const SOURCES = ['browser-file-document-request.ts', 'browser-session-profile.ts', 'browser-tab-types.ts']
const noDisplay = process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY

// Runs inside Electron. Mirrors probes/d6-file-origin-forms-probe.js and d6-http-page-control-probe.js,
// with the product's session policy instead of a copy of the rule.
const MAIN = String.raw`
const { app, BrowserWindow } = require('electron');
const http = require('http'); const fs = require('fs'); const path = require('path');
const dir = process.argv[process.argv.length - 1];
app.setPath('userData', path.join(dir, 'user-data'));
const { BrowserSessionProfile } = require('./lib/browser-session-profile.js');
const seen = []; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let controlPage = '';
const server = http.createServer((req, res) => { req.resume(); req.on('end', () => {
  seen.push({ method: req.method, url: req.url, origin: req.headers.origin ?? '(none)' });
  res.setHeader('content-type', 'text/html'); res.end(req.url === '/control-page' ? controlPage : '<p>ok</p>'); }); });
server.on('upgrade', (req, sock) => { seen.push({ method: 'WS', url: req.url, origin: req.headers.origin ?? '(none)' }); sock.destroy(); });
server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port; const base = 'http://127.0.0.1:' + port; const ws = 'ws://127.0.0.1:' + port;
  await app.whenReady();
  const ses = new BrowserSessionProfile().getSession();
  // A string literal for the page's inline script; "</" escaped so an inner script tag does not end it.
  const inline = (text) => JSON.stringify(text).replace(/<\//g, '<\\/');
  const trio = (w, tag) => w + ".fetch('" + base + "/" + tag + "-fetch',{method:'POST',body:'x'}).catch(()=>{});"
    + "var x=new " + w + ".XMLHttpRequest();x.open('POST','" + base + "/" + tag + "-xhr');x.send('x');"
    + "try{new " + w + ".WebSocket('" + ws + "/" + tag + "-ws')}catch(e){}";
  const page = path.join(dir, 'page.html');
  fs.writeFileSync(page, '<body><script>'
    + trio('window', 'top')
    + "const f=document.createElement('iframe'); document.body.append(f);" + trio('f.contentWindow', 'blank')
    + "const s=document.createElement('iframe'); s.srcdoc=" + inline('<script>' + trio('window', 'srcdoc') + '<\/script>') + "; document.body.append(s);"
    + "const b=document.createElement('iframe'); b.src=URL.createObjectURL(new Blob([" + inline('<script>' + trio('window', 'blobframe') + '<\/script>') + "],{type:'text/html'})); document.body.append(b);"
    + "const wk=new Worker(URL.createObjectURL(new Blob([" + inline("fetch('" + base + "/worker-fetch',{method:'POST',body:'x'}).catch(()=>{});try{new WebSocket('" + ws + "/worker-ws')}catch(e){}") + "],{type:'text/javascript'})));"
    + "const p=window.open('about:blank'); if(p){ " + trio('p', 'popup') + " }"
    + "const n=document.createElement('iframe'); n.src='" + base + "/subframe-nav-get'; document.body.append(n);"
    + "addEventListener('pagehide',()=>{navigator.sendBeacon('" + base + "/beacon-on-hide','x');fetch('" + base + "/keepalive-on-hide',{method:'POST',body:'x',keepalive:true});});"
    + '<\/script></body>');
  const formPage = path.join(dir, 'form.html');
  fs.writeFileSync(formPage, "<form id=f method=post action='" + base + "/form-post-nav'><input name=a value=1></form><script>document.getElementById('f').submit()<\/script>");
  controlPage = "<body><form id=f method=post action='/control-form-nav'><input name=a value=1></form><script>"
    + "fetch('/control-fetch',{method:'POST',body:'x'});var x=new XMLHttpRequest();x.open('POST','/control-xhr');x.send('x');"
    + "fetch('/control-get');try{new WebSocket('ws://'+location.host+'/control-ws')}catch(e){}navigator.sendBeacon('/control-beacon','x');"
    + "fetch('http://localhost:'+location.port+'/control-crossorigin-post',{method:'POST',body:'x'}).catch(()=>{});"
    + "setTimeout(()=>document.getElementById('f').submit(),800)<\/script></body>";

  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, session: ses } });
  w.webContents.setWindowOpenHandler(() => ({ action: 'allow', overrideBrowserWindowOptions: { show: false, webPreferences: { session: ses, sandbox: true } } }));
  await w.loadFile(page); await wait(2500);
  try { await w.loadFile(formPage); } catch (e) {}
  await wait(1500);
  await w.loadFile(page); await wait(1000);
  try { await w.loadURL(base + '/address-bar-get-nav'); } catch (e) {}
  await wait(1500);
  const fileSeen = seen.splice(0);
  const control = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, session: ses } });
  await control.loadURL(base + '/control-page'); await wait(2500);
  process.stdout.write('\nRESULT ' + JSON.stringify({ electron: process.versions.electron, fileSeen, controlSeen: seen, controlOrigin: base }) + '\n');
  app.exit(0);
});
`

type Seen = { method: string; url: string; origin: string }
type Result = { electron: string; fileSeen: Seen[]; controlSeen: Seen[]; controlOrigin: string }

describe.skipIf(noDisplay)('Browser session policy in real Electron (autobyteus-416 D6)', () => {
  let dir = ''
  let result: Result

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd6-electron-'))
    fs.mkdirSync(path.join(dir, 'lib'))
    for (const file of SOURCES) {
      const { outputText } = ts.transpileModule(fs.readFileSync(path.join(browserDir, file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      })
      fs.writeFileSync(path.join(dir, 'lib', file.replace(/\.ts$/, '.js')), outputText)
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
  }, 120_000)

  afterAll(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true })
  })

  it('runs in the Electron version the package pins', () => {
    expect(result.electron).toBe((requireFromHere('electron/package.json') as { version: string }).version)
  })

  it('sends every request a file:// document makes, in every form, with Origin: null', () => {
    const navigations = new Set(['/subframe-nav-get', '/address-bar-get-nav'])
    const fromFileDocuments = result.fileSeen.filter((entry) => !navigations.has(entry.url))
    expect(fromFileDocuments.filter((entry) => entry.origin !== 'null')).toEqual([])
    const forms = new Set(fromFileDocuments.map((entry) => `${entry.method} ${entry.url}`))
    const expected = [
      ...['top', 'blank', 'srcdoc', 'blobframe', 'popup'].flatMap((tag) => [`POST /${tag}-fetch`, `POST /${tag}-xhr`, `WS /${tag}-ws`]),
      'POST /worker-fetch',
      'WS /worker-ws',
      'POST /form-post-nav',
      'POST /beacon-on-hide',
      'POST /keepalive-on-hide',
    ]
    expect(expected.filter((form) => !forms.has(form))).toEqual([])
  })

  it('leaves GET navigations from a file:// tab unchanged (AR-002)', () => {
    const navigations = result.fileSeen.filter((entry) => entry.url === '/subframe-nav-get' || entry.url === '/address-bar-get-nav')
    expect(navigations.map((entry) => entry.url)).toContain('/address-bar-get-nav')
    expect(navigations.map((entry) => entry.url)).toContain('/subframe-nav-get')
    expect(navigations.filter((entry) => entry.origin !== '(none)')).toEqual([])
  })

  it('leaves an http page untouched: its non-GET requests and WebSocket carry its own Origin (control)', () => {
    const byUrl = new Map(result.controlSeen.map((entry) => [entry.url, entry]))
    for (const url of ['/control-fetch', '/control-xhr', '/control-beacon', '/control-crossorigin-post', '/control-form-nav', '/control-ws']) {
      expect({ url, origin: byUrl.get(url)?.origin }).toEqual({ url, origin: result.controlOrigin })
    }
    expect(byUrl.get('/control-get')?.origin).toBe('(none)')
    expect(result.controlSeen.filter((entry) => entry.origin === 'null')).toEqual([])
  })
})
