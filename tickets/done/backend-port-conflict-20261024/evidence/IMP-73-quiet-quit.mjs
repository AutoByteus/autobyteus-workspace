// Implementation-only no-work quit smoke, distinct from active native/Codex API acceptance.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
const dir=resolve('tickets/in-progress/backend-port-conflict-20261024/evidence');
const {chromium}=createRequire(resolve('autobyteus-web/package.json'))('playwright-core');
const r=JSON.parse(await fs.readFile(resolve(dir,'IMP-73-start.json'),'utf8')).result;
const browser=await chromium.connectOverCDP(r.controlEndpoint);
const page=browser.contexts()[0].pages().find(p=>!p.url().startsWith('devtools:'));
const alive=()=>{try{process.kill(r.pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
const closed=port=>new Promise(resolve=>{const s=net.connect({port,host:'127.0.0.1'});s.once('connect',()=>{s.destroy();resolve(false)});s.once('error',()=>resolve(true));});
const begin=Date.now();let requested=false;
try {
 await page.waitForFunction(()=>typeof window.electronAPI?.startShutdown==='function');
 requested=await page.evaluate(()=>{window.electronAPI.startShutdown();return true});
 while(alive() && Date.now()-begin<32_000)await new Promise(r=>setTimeout(r,100));
 const result={source:'9b10fcd4d3eee578b9d1d23e1d6ab47f9b950c5c',scope:'no-work current app quit smoke, not active provider acceptance',requestedViaPreload:requested,appPid:r.pid,appExited:!alive(),elapsedMs:Date.now()-begin,controlPortClosed:await closed(r.controlPort),serverPortClosed:await closed(r.serverPort)};
 await fs.writeFile(resolve(dir,'IMP-73-result.json'),JSON.stringify(result,null,2));
 assert(result.requestedViaPreload && result.appExited && result.controlPortClosed && result.serverPortClosed);
 console.log(JSON.stringify(result));
} finally {await browser.close().catch(()=>{});}
