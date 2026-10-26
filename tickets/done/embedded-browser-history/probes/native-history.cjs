// Dependency investigation only, not product E2E. Run with Electron 42.11.16.
// Environment: env -i PATH="$PATH" HOME=<owned-temp> PROBE_ROOT=<owned-temp> <electron> <this-file>
const {app, BrowserWindow, WebContentsView, session} = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = process.env.PROBE_ROOT;
if (!root) throw Error('PROBE_ROOT required');
app.setPath('userData', path.join(root,'user-data'));
app.setPath('sessionData', path.join(root,'session-data'));
const rows=[]; let win, server; const views=[];
const delay = ms => new Promise(r=>setTimeout(r,ms));
const state = wc => ({url:wc.getURL(), back:wc.navigationHistory.canGoBack(), forward:wc.navigationHistory.canGoForward(), index:wc.navigationHistory.getActiveIndex(), length:wc.navigationHistory.length()});
function record(label,wc){const s=state(wc);rows.push({label,...s});return s;}
async function until(test){for(let i=0;i<100;i++){if(test())return;await delay(20);}throw Error('timeout');}
async function traverse(wc,direction){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(Error('traversal event timeout'));},2000);const done=()=>{cleanup();resolve();};const cleanup=()=>{clearTimeout(timer);wc.off('did-navigate',done);wc.off('did-navigate-in-page',done);};wc.once('did-navigate',done);wc.once('did-navigate-in-page',done);wc.navigationHistory[direction]();});}
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<title>Fixture ${req.url}</title><h1>${req.url}</h1><a id="next" href="/b">B</a><a id="hash" href="#anchor">Anchor</a><button id="push" onclick="history.pushState({n:1},'', '/spa')">Push</button><button id="same" onclick="history.pushState({n:2},'', location.href)">Same URL</button><button id="replace" onclick="history.replaceState({n:3},'', '/replaced')">Replace</button>`);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r)); const base=`http://127.0.0.1:${server.address().port}`;
 win=new BrowserWindow({show:false});
 function create(){const v=new WebContentsView({webPreferences:{session:session.fromPartition('history-probe'),sandbox:true,contextIsolation:true,nodeIntegration:false}}); views.push(v);win.contentView.addChildView(v);return v.webContents;}
 const wc=create(); const other=create();
 for(const event of ['did-navigate','did-navigate-in-page','did-stop-loading'])wc.on(event,(_event,url,isMainFrame)=>rows.push({event,eventUrl:url,...(event==='did-navigate-in-page'?{isMainFrame}:{}),...state(wc)}));
 await wc.loadURL(base+'/a'); assert.equal(record('initial',wc).back,false);
 await wc.executeJavaScript("document.querySelector('#next').click()",true);await until(()=>wc.getURL()===base+'/b');await delay(50);assert.equal(record('linked B',wc).back,true);
 await traverse(wc,'goBack');await until(()=>wc.getURL()===base+'/a');await delay(50);assert.equal(record('back A',wc).forward,true);
 await traverse(wc,'goForward');await until(()=>wc.getURL()===base+'/b');await delay(50);assert.equal(record('forward B',wc).forward,false);
 await wc.executeJavaScript("document.querySelector('#hash').click()",true);await until(()=>wc.getURL().endsWith('#anchor'));record('hash',wc);
 await traverse(wc,'goBack');await until(()=>wc.getURL()===base+'/b');record('hash back',wc);
 await wc.executeJavaScript("document.querySelector('#push').click()",true);await delay(50);const p=record('push after back',wc);assert.equal(p.forward,false);
 await wc.executeJavaScript("document.querySelector('#same').click()",true);await delay(50);const same=record('same URL push',wc);assert.equal(same.length,p.length+1);
 await traverse(wc,'goBack');await until(()=>wc.navigationHistory.getActiveIndex()===same.index-1);assert.equal(record('same URL back changes flags',wc).forward,true);
 await traverse(wc,'goForward');await until(()=>wc.navigationHistory.getActiveIndex()===same.index);record('same URL forward',wc);
 await wc.executeJavaScript("document.querySelector('#replace').click()",true);await delay(50);assert.equal(record('replace',wc).length,same.length);
 await other.loadURL(base+'/other');assert.equal(record('independent tab',other).back,false);
 await traverse(wc,'goBack');await delay(100);record('SPA back',wc);assert.equal(other.getURL(),base+'/other');
 rows.push({result:'PASS',electron:process.versions.electron,chromium:process.versions.chrome,scope:'native dependency only'});
}).catch(e=>{rows.push({result:'FAIL',error:e.stack});process.exitCode=1;}).finally(async()=>{
 for(const v of views)if(!v.webContents.isDestroyed())v.webContents.close();if(win&&!win.isDestroyed())win.destroy();if(server)await new Promise(r=>server.close(r));
 fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(rows,null,2));app.exit(process.exitCode||0);
});
