#!/usr/bin/env node
/** Native Browser history regression: real worktree Electron UI/preload/IPC/WebContentsView.
 * Prerequisites: current packaged worktree build, Node 22, pnpm install, graphical desktop.
 * No providers/accounts; ephemeral loopback HTML and canonical isolated-app private data root.
 * Run from repo root: pnpm -C autobyteus-web test:e2e:embedded-browser-history
 * Options: --cases API-03,API-04,... --output-dir <path> --native-capture (macOS Swift/screencapture).
 * Each case resets through UI. Cases: documents, SPA/draft/truncation, tabs/IPC/pending,
 * failure/popup, layout/keyboard/emulation. Always stop owned instance and fixture in finally.
 * Assertions use committed document/state and shell flags, never invoke success/index alone.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(webRoot);
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const out = path.resolve(arg('output-dir', path.join(webRoot, 'test-results/embedded-browser-history')));
const selected = new Set(arg('cases', 'API-03,API-04,API-05,API-06,API-07').split(','));
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const header = { command: process.argv.join(' '), commit, date: new Date().toISOString(), environment: `${process.platform}-${process.arch} Node ${process.version}`, dirtyPaths: execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' }).trim() };
const delay = ms => new Promise(r => setTimeout(r, ms));
const cli = args => JSON.parse(execFileSync(process.execPath, [path.join(webRoot, 'scripts/isolated-app/cli.mjs'), ...args], { cwd: root, encoding: 'utf8', timeout: 150000 }));
let instance, browser, app, origin, activeRecord, windowId;
let heldResponse, pendingRequested = false, failPath = false, holdPath = false;
let requestCounts = {};
const logFile = path.join(out, 'API-progress.jsonl');
await fs.mkdir(out, { recursive: true });
const log = async (caseId, event, details = {}) => {
  const row = { time: new Date().toISOString(), caseId, event, ...details };
  console.log(JSON.stringify(row));
  await fs.appendFile(logFile, JSON.stringify(row) + '\n');
};
const save = record => fs.writeFile(path.join(out, `${record.caseId}-result.json`), JSON.stringify(record, null, 2));
async function appendRecord(file, record) {
  const target = path.join(out, file);
  const records = existsSync(target) ? JSON.parse(await fs.readFile(target, 'utf8')) : [];
  records.push(record); await fs.writeFile(target, JSON.stringify(records, null, 2));
}
async function until(fn, message, timeout = 12000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try { const value = await fn(); if (value) return value; } catch (e) { last = e.message; }
    await delay(50);
  }
  throw new Error(`${message}${last ? ` (${last})` : ''}`);
}
const allPages = () => browser.contexts().flatMap(c => c.pages());
const snapshot = () => app.evaluate(() => window.electronAPI.getBrowserShellSnapshot());
const address = () => app.getByPlaceholder('Enter URL and press Enter');
const control = title => app.locator(`button[title="${title}"]`);
const back = () => control('Back');
const forward = () => control('Forward');
const active = s => s.sessions.find(t => t.tab_id === s.activeTabId);
async function observe(label, page) {
  const row = { label, time: new Date().toISOString(), shell: await snapshot(), address: await address().inputValue(), buttons: { backDisabled: await back().isDisabled(), forwardDisabled: await forward().isDisabled() } };
  if (page && !page.isClosed()) row.document = await page.evaluate(() => ({ url: location.href, title: document.title, heading: document.querySelector('h1')?.textContent, state: history.state, length: history.length, marker: document.querySelector('#state')?.textContent, loads: document.querySelector('#loads')?.textContent }));
  activeRecord.observations.push(row);
  return row;
}
async function flags(canBack, canForward) {
  await until(async () => (await back().isEnabled()) === canBack && (await forward().isEnabled()) === canForward, `toolbar flags ${canBack}/${canForward}`);
  const s = active(await snapshot());
  if (s) { assert.equal(s.canGoBack, canBack); assert.equal(s.canGoForward, canForward); }
}
async function committed(page, pathname, marker) {
  await until(async () => page.evaluate(({ pathname, marker }) => location.pathname + location.hash === pathname && document.querySelector('h1')?.textContent === `Page ${location.pathname}` && (marker === undefined || document.querySelector('#state')?.textContent === marker), { pathname, marker }), `committed ${pathname}/${marker}`);
  await until(async () => active(await snapshot())?.url === origin + pathname, `shell URL ${pathname}`);
}
async function openTab(url) {
  const before = (await snapshot()).sessions.map(s => s.tab_id);
  await address().fill(origin + url);
  await control('Open new tab').click();
  const s = await until(async () => { const s = await snapshot(); return s.activeTabId && !before.includes(s.activeTabId) && active(s)?.url === origin + url && s; }, `new tab ${url}`);
  const page = await until(async () => allPages().find(p => p.url() === origin + url), `native target ${url}`);
  page.setDefaultTimeout(8000);
  await committed(page, url);
  return { id: s.activeTabId, page };
}
async function navigate(page, pathname) {
  await address().fill(origin + pathname); await address().press('Enter'); await committed(page, pathname);
}
async function traverse(page, direction, pathname, marker) {
  await control(direction).click(); await committed(page, pathname, marker); await observe(`${direction} committed ${pathname}/${marker ?? ''}`, page);
}
async function clearTabs() {
  holdPath = false; failPath = false;
  if (heldResponse) { heldResponse(); heldResponse = null; }
  if (await control('Restore Browser view').count()) await control('Restore Browser view').click();
  while ((await snapshot()).sessions.length) {
    const count = (await snapshot()).sessions.length;
    await control('Close active tab').click();
    await until(async () => (await snapshot()).sessions.length < count, 'tab destroyed');
  }
  await flags(false, false);
}
async function selectTitle(title, id) {
  await app.getByText(title, { exact: true }).click();
  await until(async () => (await snapshot()).activeTabId === id, `selected ${title}`);
}
async function capture(name) {
  await delay(250); // Allow native layer paint after the semantic assertions.
  await app.screenshot({ path: path.join(out, `${name}-renderer.png`) });
  if (!process.argv.includes('--native-capture')) return;
  assert.equal(process.platform, 'darwin', '--native-capture requires macOS');
  if (!windowId) {
    const swift = `import CoreGraphics\nlet ws = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as! [[String:Any]]\nfor w in ws { if (w[kCGWindowOwnerPID as String] as? Int) == ${instance.pid}, (w[kCGWindowLayer as String] as? Int) == 0 { print(w[kCGWindowNumber as String]!); break } }`;
    windowId = execFileSync('swift', ['-e', swift], { encoding: 'utf8', timeout: 30000 }).trim();
    assert.match(windowId, /^\d+$/, 'owned native window identified');
  }
  execFileSync('screencapture', ['-x', '-o', '-l', windowId, path.join(out, `${name}-native.png`)]);
}

function html(url, count) {
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fixture ${url}</title>
<style>body{font:18px system-ui;padding:16px;background:#eaf4ff;color:#17334d}a,button{display:inline-block;margin:8px;padding:8px}#state{padding:12px;background:white}</style>
<h1>Page ${url}</h1><div id="state">base</div><div id="loads">Request ${count}</div>
<a id="toA" href="/A">A</a><a id="toB" href="/B">B</a><a id="toC" href="/C">C</a><a id="hash" href="#anchor">Hash</a><div id="anchor">Anchor</div>
<button id="push">Push route</button><button id="same">Same URL entry</button><button id="replace">Replace route</button><button id="popup">Open popup</button><button id="title">Change title</button><button id="self-close">Close popup</button>
<script>
window.addEventListener('unload',()=>{}); // Ordinary page cleanup also makes slow network traversal observable rather than BFCache restore.
function render(){document.querySelector('#state').textContent=history.state?.step||'base'}
window.addEventListener('popstate',render);
push.onclick=()=>{history.pushState({step:'push'},'', '/spa-push');render()};
same.onclick=()=>{history.pushState({step:'same'},'',location.href);render()};
replace.onclick=()=>{history.replaceState({step:'replaced'},'', '/spa-replaced');render()};
popup.onclick=()=>window.open('/popup','_blank');
document.querySelector('#title').onclick=()=>document.title='Changed popup';
document.querySelector('#self-close').onclick=()=>window.close();
render();
</script>`;
}
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  requestCounts[pathname] = (requestCounts[pathname] || 0) + 1;
  if (pathname === '/failure' && failPath) { req.socket.destroy(); return; }
  const respond = () => { if (!res.destroyed) { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end(html(pathname, requestCounts[pathname])); } };
  if (pathname === '/slow' && holdPath) { pendingRequested = true; heldResponse = respond; } else respond();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const fixturePort = server.address().port;
origin = `http://127.0.0.1:${fixturePort}`;

const cases = {
  'API-03': async () => {
    const { page } = await openTab('/A'); await flags(false, false); await observe('initial A', page);
    const length = await page.evaluate(() => history.length);
    await page.locator('#toB').click(); await committed(page, '/B'); await flags(true, false);
    await page.locator('#toC').click(); await committed(page, '/C'); await flags(true, false); await observe('A B C', page);
    for (const [direction, route, b, f] of [['Back','/B',true,true],['Back','/A',false,true],['Forward','/B',true,true],['Forward','/C',true,false]]) {
      await traverse(page, direction, route); await flags(b, f);
      assert.equal(await page.evaluate(() => history.length), length + 2, 'traversal does not append entries');
    }
  },
  'API-04': async () => {
    const { page } = await openTab('/spa');
    await page.locator('#hash').click(); await committed(page, '/spa#anchor'); await flags(true,false);
    await traverse(page, 'Back', '/spa', 'base'); await flags(false,true);
    await traverse(page, 'Forward', '/spa#anchor', 'base');
    await page.locator('#push').click();
    // History API keeps the original document heading; assert URL + state marker, not a new page.
    const spaCommit = async (route, marker) => {
      await until(async () => page.evaluate(({route,marker}) => location.pathname + location.hash === route && document.querySelector('#state').textContent === marker, {route,marker}), `SPA commit ${route}/${marker}`);
      await until(async () => active(await snapshot())?.url === origin + route, `SPA shell ${route}`);
    };
    await spaCommit('/spa-push','push'); await flags(true,false);
    await back().click(); await spaCommit('/spa#anchor','base'); await forward().click(); await spaCommit('/spa-push','push');
    const beforeSame = await page.evaluate(() => history.length);
    await page.locator('#same').click(); await spaCommit('/spa-push','same');
    assert.equal(await page.evaluate(() => history.length), beforeSame + 1);
    await address().fill('unfinished.example/path');
    await back().click(); await spaCommit('/spa-push','push'); await flags(true,true);
    assert.equal(await address().inputValue(), 'unfinished.example/path'); await observe('same URL Back committed, draft retained', page);
    await forward().click(); await spaCommit('/spa-push','same'); await flags(true,false);
    assert.equal(await address().inputValue(), 'unfinished.example/path');
    const beforeReplace = await page.evaluate(() => history.length);
    await page.locator('#replace').click(); await spaCommit('/spa-replaced','replaced');
    assert.equal(await page.evaluate(() => history.length), beforeReplace); await observe('replace does not append', page);
    await back().click(); await spaCommit('/spa-push','push'); await flags(true,true);
    await page.locator('#toC').click(); await committed(page,'/C'); await flags(true,false); await observe('new link truncates forward',page);
    await back().click(); await spaCommit('/spa-push','push'); await flags(true,true);
    await navigate(page,'/D'); await flags(true,false); await observe('new address truncates forward',page);
  },
  'API-05': async () => {
    const one = await openTab('/A'); await one.page.locator('#toB').click(); await committed(one.page,'/B');
    const two = await openTab('/D'); await flags(false,false);
    const ipc = request => app.evaluate(async request => { try { return {ok:true, snapshot:await window.electronAPI.navigateBrowserHistory(request)}; } catch(e) { return {ok:false,error:e.message}; } },request);
    for (const request of [null,{}, {tabId:two.id,direction:'invalid'}, {tabId:' ',direction:'back'}, {tabId:'not-attached',direction:'back'}]) {
      const result=await ipc(request); assert.equal(result.ok,false); activeRecord.observations.push({request,result});
    }
    assert.equal((await ipc({tabId:one.id,direction:'back'})).ok,true); // Real stale active-tab command is inert.
    assert.equal(await one.page.locator('h1').textContent(),'Page /B');
    assert.equal((await snapshot()).activeTabId,two.id);
    assert.equal((await ipc({tabId:two.id,direction:'back',shellId:999})).ok,true); // Extra identity cannot redirect actual sender.
    await committed(two.page,'/D'); await flags(false,false); await observe('inactive and unavailable IPC inert',two.page);
    await selectTitle('Fixture /B',one.id); await flags(true,false);
    await traverse(one.page,'Back','/A'); await flags(false,true);
    assert.equal(await two.page.locator('h1').textContent(),'Page /D');
    await selectTitle('Fixture /D',two.id); await flags(false,false);
    await control('Close active tab').click(); await until(async()=> (await snapshot()).activeTabId===one.id,'close selects remaining'); await flags(false,true);
    await clearTabs();
    const slow=await openTab('/slow'); await slow.page.locator('#toB').click(); await committed(slow.page,'/B');
    const stable=await openTab('/stable'); await selectTitle('Fixture /B',slow.id);
    holdPath=true; pendingRequested=false;
    await back().click(); await until(()=>pendingRequested,'actual pending back HTTP request');
    await selectTitle('Fixture /stable',stable.id);
    heldResponse(); heldResponse=null; holdPath=false;
    await until(async()=>slow.page.locator('h1').textContent().then(x=>x==='Page /slow'),'background traversal committed');
    assert.equal((await snapshot()).activeTabId,stable.id); await observe('pending traversal did not steal selection',stable.page);
    await selectTitle('Fixture /slow',slow.id); await forward().click(); await committed(slow.page,'/B');
    holdPath=true; pendingRequested=false; await back().click(); await until(()=>pendingRequested,'second pending HTTP request');
    await control('Close active tab').click(); await until(async()=> (await snapshot()).activeTabId===stable.id,'closed pending tab selects stable');
    if(heldResponse){heldResponse();heldResponse=null;} holdPath=false;
    await until(()=>slow.page.isClosed(),'native target destroyed');
    assert.equal((await ipc({tabId:slow.id,direction:'back'})).ok,false);
    await committed(stable.page,'/stable'); await flags(false,false); await observe('closed pending traversal cannot reselect',stable.page);
  },
  'API-06': async () => {
    const one=await openTab('/failure'); await one.page.locator('#toB').click(); await committed(one.page,'/B');
    const failed=[]; one.page.on('requestfailed',req=>failed.push({url:req.url(),failure:req.failure()}));
    const cdp=await one.page.context().newCDPSession(one.page); await cdp.send('Page.enable');
    const {frameTree}=await cdp.send('Page.getFrameTree'); let stopped=false;
    cdp.on('Page.frameStoppedLoading',e=>{if(e.frameId===frameTree.frame.id)stopped=true;});
    failPath=true; await back().click();
    await until(()=>failed.some(r=>r.url===origin+'/failure'),'native failed history navigation');
    await until(async()=>stopped && one.page.url().startsWith('chrome-error://') && active(await snapshot())?.url===origin+'/failure','native error document committed and loading stopped');
    await until(async()=>{const s=active(await snapshot());return s?.canGoBack===false && s?.canGoForward===true;},'settled native failure capabilities');
    activeRecord.observations.push({label:'native failure committed after frameStoppedLoading',failed,shell:await snapshot(),url:one.page.url(),body:await one.page.locator('body').innerText(),buttons:{back:await back().isEnabled(),forward:await forward().isEnabled()}});
    await flags(false,true); activeRecord.observations.push({label:'native requestfailed',failed});
    failPath=false; await traverse(one.page,'Forward','/B'); await flags(true,false); await cdp.detach();
    await pagePopup(one);
  },
  'API-07': async () => {
    const {page}=await openTab('/A'); await page.locator('#toB').click(); await committed(page,'/B'); await flags(true,false);
    await address().focus(); await address().press('Shift+Tab');
    assert.equal(await app.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Back');
    await app.keyboard.press('Enter'); await committed(page,'/A'); await flags(false,true); await observe('keyboard Back, disabled skipped',page);
    assert.equal(await back().evaluate(e=>getComputedStyle(e).opacity),'0.5');
    const originalLoads=await page.locator('#loads').textContent();
    await control('Refresh active tab').click(); await until(async()=>await page.locator('#loads').textContent()!==originalLoads,'refresh served new document');
    await flags(false,true);
    const geometry = async label => {
      const row=await address().evaluate(input=>{const f=input.closest('form'), r=f.getBoundingClientRect();return {formWidth:r.width,scrollWidth:f.scrollWidth,clientWidth:f.clientWidth,inputWidth:input.getBoundingClientRect().width,controls:[...f.querySelectorAll('button,input')].map(e=>({title:e.title,disabled:e.disabled,x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})),right:r.right}});
      assert.ok(row.scrollWidth<=row.clientWidth+1, 'no toolbar overflow'); assert.ok(row.inputWidth>=80, 'usable address width');
      assert.ok(row.controls.every(c=>c.right<=row.right+1),'controls inside toolbar'); activeRecord.observations.push({label,...row});
    };
    await geometry('normal panel'); await capture('API-07-panel');
    // At 1200px with the expanded left sidebar, tools use a drawer, not a resizable dock.
    // Make room through ordinary UI rather than forcing layout/store state.
    await app.locator('[data-test="workspace-right-tool-drawer-backdrop"]').click({position:{x:500,y:100}});
    await control('Collapse left panel').click();
    await app.getByRole('button',{name:'Show tools',exact:true}).click();
    await app.getByText('Browser',{exact:true}).click();
    await committed(page,'/A'); await geometry('normal docked panel'); await capture('API-07-docked');
    const handle=app.locator('[data-test="workspace-right-resize-handle"]');
    const box=await handle.boundingBox(); assert.ok(box,'resize handle');
    await app.mouse.move(box.x+box.width/2,box.y+box.height/2); await app.mouse.down(); await app.mouse.move(box.x+300,box.y+box.height/2,{steps:10}); await app.mouse.up();
    await until(async()=> (await address().evaluate(e=>e.closest('form').getBoundingClientRect().width))<=400,'minimum panel');
    await geometry('minimum 400px panel'); await capture('API-07-minimum');
    await control('Maximize Browser view').click(); await geometry('full-view'); await capture('API-07-full-view');
    const before=await snapshot();
    await control('Switch active tab to mobile view').click(); await until(async()=>active(await snapshot())?.deviceEmulation?.mode==='mobile','mobile projection');
    assert.equal((await snapshot()).activeTabId,before.activeTabId);
    const mobile=await page.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio,url:location.href})); assert.equal(mobile.width,390);
    await observe('mobile emulation same native content',page); activeRecord.observations.push({mobile}); await capture('API-07-mobile');
    await control('Switch active tab to desktop view').click(); await until(async()=>active(await snapshot())?.deviceEmulation?.mode==='desktop','desktop projection');
    await control('Restore Browser view').click(); await committed(page,'/A'); await flags(false,true); await geometry('restored panel');
    await control('Close active tab').click(); await until(async()=>!(await snapshot()).sessions.length,'empty after close'); await flags(false,false); await observe('empty buttons disabled');
  }
};
async function pagePopup(one) {
  await one.page.locator('#popup').click();
  const popup=await until(async()=>allPages().find(p=>p.url()===origin+'/popup'),'popup target');
  await committed(popup,'/popup');
  const popupId=(await snapshot()).activeTabId; assert.notEqual(popupId,one.id);
  await flags(false,false); await popup.locator('#title').click();
  await until(async()=>active(await snapshot())?.title==='Changed popup','title observation'); await observe('popup adopted and title updated',popup);
  await popup.locator('#toC').click(); await committed(popup,'/C'); await traverse(popup,'Back','/popup');
  await popup.locator('#self-close').click(); await until(()=>popup.isClosed(),'self-close destroys popup');
  await until(async()=> (await snapshot()).activeTabId===one.id && (await snapshot()).sessions.length===1,'popup cleanup restores opener');
  await committed(one.page,'/B'); await flags(true,false); await observe('popup destruction preserves opener',one.page);
}

let failure;
try {
  const receipt=cli(['start','--from-worktree']); assert.equal(receipt.ok,true); instance=receipt.result;
  await appendRecord('API-environments.json',{...header,instance,fixtureOrigin:origin});
  browser=await chromium.connectOverCDP(instance.controlEndpoint);
  app=allPages().find(p=>p.url().includes('/renderer/index.html')); assert.ok(app); app.setDefaultTimeout(10000);
  await until(async()=>{
    if(await app.getByText('Browser',{exact:true}).isVisible()) return true;
    const show=app.getByRole('button',{name:'Show tools',exact:true});
    if(await show.isVisible()) await show.click();
    await delay(300); return false;
  },'hydrated tools panel');
  await app.getByText('Browser',{exact:true}).click();
  for(const [id,run] of Object.entries(cases)) {
    if(!selected.has(id)) continue;
    activeRecord={...header,caseId:id,instanceId:instance.instanceId,fixtureOrigin:origin,observations:[],startedAt:new Date().toISOString()};
    await log(id,'Started');
    try { await clearTabs(); await run(); activeRecord.result='Pass'; }
    catch(e) { activeRecord.result='Fail'; activeRecord.error=e.stack; failure=e; try{await observe('failure state',allPages().find(p=>p.url().startsWith(origin)));await capture(`${id}-failure`);}catch{} }
    activeRecord.completedAt=new Date().toISOString(); await save(activeRecord); await log(id,'Completed',{result:activeRecord.result,error:activeRecord.error});
    if(failure)break;
  }
} catch(e){failure=e;await log('SETUP','Fail',{error:e.stack});if(app)await fs.writeFile(path.join(out,'API-setup-failure.txt'),await app.locator('body').innerText());}
finally {
  await log('API-08','Started');
  const cleanup={...header,caseId:'API-08'};
  try {
    holdPath=false;if(heldResponse){heldResponse();heldResponse=null;}
    if(instance){cleanup.stop=cli(['stop',instance.instanceId]);assert.equal(cleanup.stop.ok,true);cleanup.dataRootRemoved=!existsSync(instance.dataRoot);assert.equal(cleanup.dataRootRemoved,true);}
    server.closeAllConnections(); await new Promise(r=>server.close(r));
    cleanup.ports={};
    for(const port of [fixturePort,instance?.controlPort,instance?.serverPort].filter(Boolean)) {
      cleanup.ports[port]=await new Promise(r=>{const s=net.createServer();s.once('error',()=>r(false));s.listen(port,'127.0.0.1',()=>s.close(()=>r(true)));});
      assert.equal(cleanup.ports[port],true,`owned port ${port} released`);
    }
    cleanup.result='Pass';
  }catch(e){cleanup.result='Fail';cleanup.error=e.stack;failure??=e;}
  await appendRecord('API-08-cleanups.json',cleanup);await save(cleanup);await log('API-08','Completed',{result:cleanup.result});
}
if(failure){console.error(failure);process.exit(1);}process.exit(0);
