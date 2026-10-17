/** Implementation rendered feedback loop only. Task-owned Nuxt route and Chrome,
 * fixture release/clipboard/definition-feed, no backend API or E2E signoff. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../../../..');
const web=path.join(root,'autobyteus-web');
const require=createRequire(path.join(web,'package.json'));
const {chromium}=require('playwright-core');
const installed=path.join(web,'pages/implementation-nfs-preview.vue');
const output=path.join(here,process.argv[2]??'render-1');
await fs.mkdir(output); // Fresh evidence only.
const home=await fs.mkdtemp(path.join(os.tmpdir(),'ab-nfs-ui-'));
const report={scope:'Rendered implementation self-check, no API/E2E or release qualification',cases:[],errors:[],cleanup:{},home};
let dev,browser,installedOwned=false;
const logs=[];
const check=(name,ok)=>{report.cases.push({name,pass:!!ok});if(!ok)throw Error(name);};
try {
 await fs.copyFile(path.join(here,'nfs-render-fixture.vue'),installed,fs.constants.COPYFILE_EXCL);installedOwned=true;
 const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));report.port=port;
 dev=spawn('pnpm',['exec','nuxt','dev','--host','127.0.0.1','--port',String(port)],{cwd:web,env:{PATH:process.env.PATH,HOME:home,TMPDIR:home,NODE_DISABLE_COMPILE_CACHE:'1',NUXT_TELEMETRY_DISABLED:'1',BACKEND_NODE_BASE_URL:'http://127.0.0.1:9'},detached:true,stdio:['ignore','pipe','pipe']});report.devPid=dev.pid;
 dev.stdout.on('data',x=>logs.push(x.toString()));dev.stderr.on('data',x=>logs.push(x.toString()));
 const url=`http://127.0.0.1:${port}/implementation-nfs-preview?nodeTab=nfsGuide`;
 let ready=false;for(let i=0;i<120;i++){if(dev.exitCode!==null)throw Error('Nuxt exited');try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}check('fixture route ready',ready);
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:1280,height:1000},locale:'en-US'});
 await context.routeWebSocket('**/ws/agent-package-definitions*',ws=>ws.send(JSON.stringify({type:'connected'})));
 await context.addInitScript(()=>{window.__copied=[];window.__failClipboard=false;Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(window.__failClipboard)throw Error('fixture clipboard denied');window.__copied.push(text);}},configurable:true});});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(url,{waitUntil:'networkidle'});await page.getByTestId('nfs-guide-card').waitFor();
 await page.getByTestId('locale-en').click();await page.getByText('Command not yet available').first().waitFor();
 check('actual NodeManager route opens NFS tab',await page.getByTestId('node-manager-tab-nfsGuide').getAttribute('aria-selected')==='true');
 check('unpublished commands disabled',await page.getByTestId('copy-nfs-macos').isDisabled()&&await page.getByTestId('copy-nfs-linux').isDisabled());
 check('unpublished has no download link',await page.locator('[data-testid="nfs-guide-card"] a').count()===0);
 await page.screenshot({path:path.join(output,'desktop-unavailable.png')});
 await page.getByTestId('node-manager-tab-nfsGuide').focus();await page.keyboard.press('ArrowLeft');check('keyboard selects Docker Guide',await page.getByTestId('node-manager-tab-dockerGuide').getAttribute('aria-selected')==='true');
 await page.keyboard.press('End');await page.getByTestId('nfs-guide-card').waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'mobile-unavailable.png')});
 check('mobile has no horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.getByTestId('locale-zh').click();await page.getByText('命令尚不可用').first().waitFor();await page.screenshot({path:path.join(output,'mobile-zh.png')});
 await page.setViewportSize({width:1280,height:1000});await page.getByTestId('locale-en').click();await page.getByTestId('show-fixture').click();
 await page.getByTestId('copy-nfs-macos').click();await page.getByTestId('nfs-copy-feedback').filter({hasText:'Command copied.'}).waitFor();
 check('copy fixture invokes clipboard only',await page.evaluate(()=>window.__copied[0]==="curl -fsSL 'https://release.example.invalid/test-only/install.sh' | bash"));
 await page.screenshot({path:path.join(output,'desktop-fixture-copy.png')});
 await page.evaluate(()=>{window.__failClipboard=true;});await page.getByTestId('copy-nfs-linux').click();await page.getByText('Could not copy. Select and copy the displayed command manually.').waitFor();
 await page.screenshot({path:path.join(output,'desktop-fixture-copy-failure.png')});
 check('no browser errors',report.errors.length===0);
} catch(e){report.failure=String(e);process.exitCode=1;}
finally {
 if(browser){await browser.close();report.cleanup.browserClosed=true;}
 if(dev&&dev.exitCode===null){const exited=new Promise(r=>dev.once('exit',r));process.kill(-dev.pid,'SIGTERM');await Promise.race([exited,new Promise(r=>setTimeout(r,5000))]);if(dev.exitCode===null&&dev.signalCode===null){process.kill(-dev.pid,'SIGKILL');await exited;}report.cleanup.devExited=dev.exitCode!==null||dev.signalCode!==null;}
 if(installedOwned){await fs.rm(installed);report.cleanup.fixtureRemoved=true;}
 try { await fs.rm(home,{recursive:true,force:true,maxRetries:10,retryDelay:100});report.cleanup.homeRemoved=true; } catch(e) { report.cleanup.homeRemovalError=String(e);process.exitCode=1; }
 await fs.writeFile(path.join(output,'nuxt.log'),logs.join(''));await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2));
}
console.log(JSON.stringify(report));
