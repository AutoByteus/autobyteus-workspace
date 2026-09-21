import fs from 'node:fs';
import pw from '/home/autobyteus/workspace/autobyteus-workspace/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.js';
const outPath = new URL('./LIVE-004-stopped-root-recovery-cdp.jsonl', import.meta.url);
fs.writeFileSync(outPath, '');
const emit = (kind, payload = {}) => fs.appendFileSync(outPath, JSON.stringify({at:new Date().toISOString(),kind,...payload})+'\n');
const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('127.0.0.1:3588'));
if (!page) throw new Error('open_tab 3588 page not found');
const cdp = await page.context().newCDPSession(page);
await cdp.send('Runtime.enable'); await cdp.send('Network.enable');
for (const method of ['Network.webSocketCreated','Network.webSocketWillSendHandshakeRequest','Network.webSocketHandshakeResponseReceived','Network.webSocketFrameSent','Network.webSocketFrameReceived','Network.webSocketClosed','Network.webSocketFrameError','Runtime.exceptionThrown','Runtime.consoleAPICalled']) {
  cdp.on(method, params => emit(method, params));
}
page.on('pageerror', e=>emit('pageerror',{name:e.name,message:e.message,stack:e.stack}));
page.on('console', m=>emit('console',{type:m.type(),text:m.text()}));
await page.evaluate(() => {
  window.__APIREV8_RECOVERY_PROBE__ = {closes:[],errors:[],rejections:[],installedAt:new Date().toISOString()};
  const original = WebSocket.prototype.close;
  WebSocket.prototype.close = function(code, reason) {
    window.__APIREV8_RECOVERY_PROBE__.closes.push({at:new Date().toISOString(),url:this.url,readyState:this.readyState,code:code ?? null,reason:reason ?? null});
    return original.call(this, code, reason);
  };
  window.addEventListener('error', e=>window.__APIREV8_RECOVERY_PROBE__.errors.push({at:new Date().toISOString(),message:e.message,error:String(e.error||'')}));
  window.addEventListener('unhandledrejection', e=>window.__APIREV8_RECOVERY_PROBE__.rejections.push({at:new Date().toISOString(),reason:String(e.reason),stack:e.reason?.stack||null}));
});
emit('probe-installed',{url:page.url()});
await page.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push({path:'/workspace',query:{rootSubjectKind:'agent_org',definitionId:'apirev8',orgRunId:'apirev8_613529cf063144d0a9e6cd6e385d58ba',mode:'active'}}));
emit('route-triggered',{url:page.url()});
for (let i=0;i<100;i++) {
  await page.waitForTimeout(250);
  if (i%4===0) {
    const state=await page.evaluate(() => ({
      url:location.href,
      text:document.body.innerText.slice(0,1800),
      connecting:document.body.innerText.includes('Connecting'),
      notice:document.body.innerText.includes('Live updates could not recover automatically'),
      priorMarker:document.body.innerText.includes('APIREV8-ORG-DIRECT-LIVE-001') || document.body.innerText.includes('APIREV8-ORG-TEAM-LIVE-001'),
      stopControl:[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Stop Agent Org'),
      statuses:[...document.querySelectorAll('button[aria-label]')].map(b=>b.getAttribute('aria-label')).filter(x=>/team\. Team status|e2e/.test(x)),
      probe:window.__APIREV8_RECOVERY_PROBE__
    }));
    emit('sample',{i,state});
  }
}
const final=await page.evaluate(() => ({
  url:location.href,
  text:document.body.innerText.slice(0,5000),
  probe:window.__APIREV8_RECOVERY_PROBE__,
  alerts:[...document.querySelectorAll('[role=alert]')].map(x=>x.innerText),
  statuses:[...document.querySelectorAll('button[aria-label]')].map(b=>b.getAttribute('aria-label')).filter(x=>/team\. Team status|e2e/.test(x)),
  buttons:[...document.querySelectorAll('button')].map(b=>({text:b.innerText.trim(),aria:b.getAttribute('aria-label'),title:b.title})).filter(x=>x.text||x.aria||x.title)
}));
emit('final',{final});
console.log(JSON.stringify({outPath:outPath.pathname,url:page.url(),closes:final.probe.closes,errors:final.probe.errors,rejections:final.probe.rejections,notice:final.text.includes('Live updates could not recover automatically'),connecting:final.text.includes('Connecting'),priorMarker:/APIREV8-ORG-(DIRECT|TEAM)-LIVE-001/.test(final.text),stopControl:final.buttons.some(x=>x.aria==='Stop Agent Org'),statuses:final.statuses},null,2));
await cdp.detach(); await browser.close();
