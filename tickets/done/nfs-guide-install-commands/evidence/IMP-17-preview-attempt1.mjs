// IMP-17 implementation-scoped current-component preview, not API/E2E acceptance.
// Current R3 driver: requires the private HOME/TMPDIR in IMP-14-environment.json.
// Those owned directories are removed after validation; recreate an owned environment before reuse.
// Run from worktree: node tickets/in-progress/nfs-guide-install-commands/evidence/IMP-17-preview.mjs <fresh-output-name>
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
const w = process.cwd(), web = path.join(w, 'autobyteus-web');
const e = path.join(w, 'tickets/in-progress/nfs-guide-install-commands/evidence');
const owned = JSON.parse(await fs.readFile(path.join(e, 'IMP-14-environment.json'))).scratch;
const out = path.join(e, process.argv[2]); await fs.mkdir(out);
const { chromium } = createRequire(path.join(web, 'package.json'))('playwright-core');
const pagePath = path.join(web, 'pages/imp-nfs-guide-r3.vue');
const fixture = `<template><main class="mx-auto max-w-6xl bg-slate-100 p-4"><nav class="mb-3 flex gap-3"><button @click="setPreference('en')" id="en">English</button><button @click="setPreference('zh-CN')" id="zh">中文</button><button @click="mode='null'" id="null">Unavailable fixture</button><button @click="mode='partial'" id="partial">Partial fixture</button><button @click="mode='invalid'" id="invalid">Invalid fixture</button><button @click="mode='published'" id="published">Published</button></nav><NfsGuideCard :release="release" /></main></template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import NfsGuideCard from '~/components/settings/NfsGuideCard.vue';
import { nfsPublishedRelease } from '~/utils/nfsLauncherCommands';
import { useLocalization } from '~/composables/useLocalization';
definePageMeta({ layout: false });
const { setPreference } = useLocalization();
const mode = ref('published');
const release = computed(() => mode.value === 'null' ? null : mode.value === 'invalid' ? {...nfsPublishedRelease, downloadUrl: 'http://unsafe'} : mode.value === 'partial' ? {...nfsPublishedRelease, availableComputers: ['macos'] as const} : nfsPublishedRelease);
</script>`;
await fs.writeFile(pagePath, fixture, { flag: 'wx' }); await fs.writeFile(path.join(out, 'fixture.vue.txt'), fixture);
const port = await new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => {const port = s.address().port; s.close(() => resolve(port));}); });
const base = `http://127.0.0.1:${port}`;
const result = { id: 'IMP-17', date: new Date().toISOString(), commit: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), sourceState: execFileSync('git',['status','--short','--','autobyteus-web/components/settings/NfsGuideCard.vue','autobyteus-web/utils/nfsLauncherCommands.ts','autobyteus-web/localization/messages'],{encoding:'utf8'}).trim() || 'committed product source clean', base, events: [], scenarios: [], cleanup: {} };
const log = createWriteStream(path.join(out, 'nuxt.log'));
const server = spawn('pnpm', ['exec', 'nuxt', 'dev', '--host', '127.0.0.1', '--port', String(port)], {cwd: web, detached:true, env:{PATH:process.env.PATH,HOME:path.join(owned,'home'),TMPDIR:path.join(owned,'tmp'),NUXT_TELEMETRY_DISABLED:'1',BACKEND_NODE_BASE_URL:'http://127.0.0.1:1'}, stdio:['ignore','pipe','pipe']});
server.stdout.pipe(log);server.stderr.pipe(log); result.serverPid = server.pid;
let browser;
const assert = (c,m) => {if(!c)throw Error(m);};
try {
  for(let i=0;i<120;i++){try{if((await fetch(base+'/imp-nfs-guide-r3')).ok)break;}catch{} await new Promise(r=>setTimeout(r,1000));}
  browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,env:{PATH:process.env.PATH,HOME:path.join(owned,'home'),TMPDIR:path.join(owned,'tmp')}});
  result.browser=browser.version();
  const context=await browser.newContext({viewport:{width:1280,height:1000},permissions:['clipboard-read','clipboard-write'],locale:'en-US'});
  // Open empty feeds for app-level invalidation subscriptions; no application/backend work is run.
  await context.routeWebSocket(/\/ws\/(agent-package-definitions|update-notifications)(\?|$)/,ws=>ws.send(JSON.stringify({type:'connected'})));
  await context.route('**/rest/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',version:'fixture'})}));
  await context.route('**/graphql',route=>{if(route.request().postDataJSON()?.operationName === 'GetUpdateAutomationSettings') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{updateAutomationSettings:{__typename:'UpdateAutomationSettings',intervals:{__typename:'UpdateCheckIntervals',agentPackages:60,skillSources:60,agentRuntimes:60},automaticUpdates:{__typename:'AutomaticUpdates',agentPackages:false,skillSources:false,agentRuntimes:false},githubWaitUntil:null,desktopEmbeddedNode:false}}})}); if(route.request().postDataJSON()?.operationName === 'GetUpdateNotifications') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{updateNotifications:[]}})}); result.events.push({type:'unexpected-graphql',operation:route.request().postDataJSON()});return route.fulfill({status:200,contentType:'application/json',body:'{"data":{}}'});});
  const page=await context.newPage();
  page.on('pageerror',error=>result.events.push({type:'pageerror',text:error.message}));
  page.on('console',message=>{if(message.type()==='error')result.events.push({type:'console-error',text:message.text()});});
  await page.goto(base+'/imp-nfs-guide-r3');
  await page.getByTestId('nfs-guide-card').waitFor({timeout:90000});
  // Cold Nuxt optimization may reload; wait for the same product card after settling.
  await page.waitForTimeout(4000); await page.getByTestId('nfs-guide-card').waitFor();
  for(const locale of ['en','zh']) {
    await page.locator('#'+locale).click();
    for(const width of [1280,390]) {
      await page.setViewportSize({width,height:1000});
      assert(await page.locator('[data-testid="nfs-guide-card"] code').count()===9,'nine displayed commands');
      const card = page.getByTestId('nfs-guide-card');
      assert(await card.locator('a').count() === 0, 'no standalone anchors');
      const content = await card.innerText();
      for (const label of ['View release downloads', 'Review the pinned installer script', '查看版本下载', '查看固定版本的安装脚本', 'Public CLI documentation and advanced flags', '公开命令行文档和高级参数', 'physical-host', 'testing remains deferred', 'Checksums do not replace', '独立客户端', '仍待进行']) assert(!content.includes(label), 'removed label absent');
      assert(content.includes(locale === 'en' ? 'URL shown in the command' : '命令中网址对应的安装脚本'), 'review reminder');
      assert(content.includes(locale === 'en' ? 'Published installer: v0.1.0' : '已发布安装器：v0.1.0'), 'valid version notice');
      const installGap = await page.getByTestId('copy-nfs-macos').evaluate(b => {
        const grid = b.parentElement.parentElement.parentElement;
        return grid.parentElement.getBoundingClientRect().bottom - grid.getBoundingClientRect().bottom;
      });
      assert(installGap <= 18, 'no reserved link area (only section padding/border)');
      const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
      assert(overflow.scroll<=overflow.client,'document overflow');
      for(const id of ['macos','linux','create','connect','interactive','status','reconnect','detach','version']) {
        const button=page.getByTestId('copy-nfs-'+id);
        const expected=await button.evaluate(b=>b.parentElement.parentElement.querySelector('code').textContent);
        await button.click();
        await page.waitForFunction(({id,label})=>document.querySelector('[data-testid="copy-nfs-'+id+'"]').textContent.trim()===label,{id,label:locale==='en'?'Copied':'已复制'});
        assert(await page.evaluate(()=>navigator.clipboard.readText())===expected,'exact clipboard '+id);
      }
      await page.locator('#'+locale).scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(out,`${locale}-${width}.png`),fullPage:true});
      const footer=await card.evaluate(c=>{
        const tip=c.querySelector('[data-testid="nfs-folder-tip"]'), note=c.querySelector('[data-testid="nfs-safety-note"]');
        return {tip:tip.textContent.trim(),note:[...note.querySelectorAll('p')].map(p=>p.textContent.trim()),tipBackground:getComputedStyle(tip).backgroundColor,tipBorder:getComputedStyle(tip).borderWidth,following:note.nextElementSibling?.tagName??null,gap:tip.getBoundingClientRect().top-tip.previousElementSibling.getBoundingClientRect().bottom,noteGap:note.getBoundingClientRect().top-tip.getBoundingClientRect().bottom};
      });
      assert(footer.following===null && footer.tipBackground==='rgba(0, 0, 0, 0)' && footer.tipBorder==='0px','plain tip and no trailing prose');
      assert(footer.gap===20 && footer.noteGap===16,'no empty advanced-link gap');
      if(locale==='en')assert([footer.tip,...footer.note].join(' ').split(/\s+/).length<=60,'short English footer');
      await page.getByTestId('nfs-safety-note').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(out,`${locale}-${width}-footer.png`)});
      result.scenarios.push({locale,width,commands:9,links:0,footer,installGap,clipboard:'nine actual Chrome clipboard comparisons matched displayed bytes',overflow});
    }
  }
  await page.locator('#en').click();
  await page.getByTestId('copy-nfs-create').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-testid="copy-nfs-create"]').textContent.trim() === 'Copied');
  assert(await page.evaluate(()=>navigator.clipboard.readText()) === '~/.local/bin/autobyteus-nfs create', 'keyboard exact clipboard');
  await page.waitForTimeout(2200); assert((await page.getByTestId('nfs-copy-feedback').innerText()) === '', 'success timer reset');
  result.scenarios.push({keyboard: 'Enter activates Copy', timer:'success clears after two seconds'});
  // Deliberately deny only the browser clipboard boundary, never execute any CLI.
  await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new DOMException('denied','NotAllowedError');};});
  await page.getByTestId('copy-nfs-status').click();
  assert((await page.getByTestId('nfs-copy-feedback').innerText()).includes('Select and copy'),'denial feedback');
  await page.screenshot({path:path.join(out,'denial.png'),fullPage:true});
  await page.locator('#null').click();
  assert(await page.getByTestId('copy-nfs-macos').isDisabled() && await page.getByTestId('copy-nfs-linux').isDisabled(),'unavailable controls');
  assert(await page.locator('[data-testid="nfs-guide-card"] a').count()===0,'no unavailable anchors');
  assert(!(await page.getByTestId('nfs-guide-card').innerText()).includes('Published installer:'), 'unavailable version hidden');
  await page.locator('#partial').click();
  assert(!await page.getByTestId('copy-nfs-macos').isDisabled() && await page.getByTestId('copy-nfs-linux').isDisabled(),'partial controls');
  assert((await page.getByTestId('nfs-guide-card').innerText()).includes('Published installer: v0.1.0'), 'partial version preserved');
  assert(await page.locator('[data-testid="nfs-guide-card"] a').count()===0,'no partial anchors');
  await page.locator('#invalid').click();
  assert(await page.getByTestId('copy-nfs-macos').isDisabled() && await page.getByTestId('copy-nfs-linux').isDisabled(),'invalid controls');
  assert(await page.locator('[data-testid="nfs-guide-card"] a').count()===0,'no invalid anchors');
  assert(!(await page.getByTestId('nfs-guide-card').innerText()).includes('Published installer:'),'invalid version hidden');
  result.scenarios.push({invalid:'both install disabled, version hidden, no anchors',denial:'manual selection message',unavailable:'both install disabled',partial:'Linux disabled only'});
  await fs.writeFile(path.join(out,'dom.txt'),await page.locator('[data-testid="nfs-guide-card"]').innerText());
  assert(result.events.length===0,'browser errors or unhandled fixture boundary');
  result.result='Pass';
} catch(error) {result.result='Fail';result.error=String(error);process.exitCode=1;}
finally {
  if(browser)await browser.close();result.cleanup.browser='closed';
  process.kill(-server.pid,'SIGTERM'); await new Promise(r=>server.once('close',r));log.end();
  result.cleanup.nuxt='closed';await fs.unlink(pagePath);result.cleanup.fixture='removed';
  await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
