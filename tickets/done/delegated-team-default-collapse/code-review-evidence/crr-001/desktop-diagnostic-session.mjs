// Ticket-owned automation: canonical isolated lifecycle under the same private HOME/Xvfb session.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const root = process.cwd(), out = process.argv[2];
const samples=[];
const sample = async () => {
  const s=await fs.statfs('/dev/shm');
  samples.push({at:Date.now(),bytesFree:s.bavail*s.bsize,bytesTotal:s.blocks*s.bsize});
};
const sampler=setInterval(() => sample().catch(()=>{}),20);
const require = createRequire(path.join(root, 'autobyteus-web/package.json'));
const { chromium } = require('playwright-core');
const evidence = { uid: process.getuid(), environment: 'private HOME, Xvfb, non-root, sandbox preserved', result: 'Not Tested' };
const save = () => fs.writeFile(path.join(out, 'desktop-receipt.json'), JSON.stringify(evidence, null, 2));
const run = (cmd, args) => new Promise((resolve, reject) => {
  const c = spawn(cmd, args, { cwd: root, env: process.env, stdio: ['ignore','pipe','pipe'] });
  let stdout='', stderr=''; c.stdout.on('data',d=>stdout+=d); c.stderr.on('data',d=>stderr+=d);
  c.once('error',reject); c.once('exit',code=>resolve({code,stdout,stderr}));
});
const lifecycle = async (...args) => {
  const r = await run('pnpm', ['--silent','isolated-app',...args]);
  await fs.writeFile(path.join(out, `lifecycle-${args[0]}.json`), r.stdout || JSON.stringify(r));
  const j = JSON.parse(r.stdout); if (!j.ok) { const e = new Error(JSON.stringify(j.error)); e.receipt=j; throw e; } return j.result;
};
const wait = async (fn, ms=60000) => { const end=Date.now()+ms; while(Date.now()<end){ if(await fn())return; await new Promise(r=>setTimeout(r,100)); } throw new Error('Desktop assertion timeout'); };
let instance, browser;
await fs.mkdir(out, {recursive:true});
try {
  instance = await lifecycle('start','--from-worktree'); evidence.instance = instance; await save();
  await fs.writeFile(path.join(out,'instance.json'), JSON.stringify(instance));
  await fs.writeFile(path.join(out,'case-ledger.md'),'# Desktop cases B-001..006, P-001; initialized before journey\n');
  const r = await run('node',['/home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/code-review-evidence/crr-001/diagnostic-probe.mjs','--desktop-instance',path.join(out,'instance.json'),'--output-dir',path.join(out,'journey'),'--ledger-file',path.join(out,'case-ledger.md')]);
  await fs.writeFile(path.join(out,'journey.log'), r.stdout+'\n'+r.stderr); evidence.journeyExit = r.code; await save();
  if(r.code!==0) throw new Error('Desktop journey probe failed; inspect journey/evidence.json');
  // Actual app process restart, same owned data/ports. A page reload is not this evidence.
  const first = instance.pid; instance = await lifecycle('restart',instance.instanceId);
  evidence.restart = { oldPid:first, newPid:instance.pid, sameInstance:instance.instanceId===evidence.instance.instanceId, samePorts:instance.controlPort===evidence.instance.controlPort && instance.serverPort===evidence.instance.serverPort };
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${instance.controlPort}`);
  const page = browser.contexts()[0].pages().find(p=>/renderer\/index\.html/.test(p.url()));
  const j = JSON.parse(await fs.readFile(path.join(out,'journey/evidence.json'))), host=j.setup.hostId;
  await page.goto(page.url().split('#')[0]+'#/workspace');
  const workspace=page.locator('[data-test="workspace-row"]',{hasText:/^\s*workspace\s*$/}).first();
  await workspace.waitFor(); if(await workspace.getAttribute('aria-expanded')!=='true')await workspace.locator('button').first().click();
  const agent=page.locator('[data-test="workspace-agent-row"]',{hasText:'Project Task Manager Probe'});
  await agent.waitFor(); if(await agent.getAttribute('aria-expanded')!=='true')await agent.click();
  await page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${host}"]`).click();
  const tree = page.locator(`[data-test="workspace-agent-run-task-tree"][data-run-id="${host}"]`);
  await wait(async()=>await tree.locator('[role="treeitem"]:not([aria-hidden="true"])').count()===8);
  if(await tree.locator('[data-node-kind="agent"]').count())throw new Error('Restart auto-opened members');
  evidence.restart.rows=8; evidence.restart.collapsed=await tree.locator('[data-node-kind="agent_team"][aria-expanded="false"]').count();
  await page.screenshot({path:path.join(out,'actual-restart.png')});
  evidence.result='Pass';
} catch(e) { evidence.result='Fail'; evidence.failure={message:e.message,receipt:e.receipt}; process.exitCode=1; }
finally {
  await browser?.close();
  if(instance) {
    // Preserve native diagnostics before canonical stop removes the auto-owned data/logs.
    for (const [source, name] of [[path.join(instance.dataRoot,'server-data/logs/server.log'),'server.log'], [instance.logPath,'electron.log']]) {
      if(source) await fs.copyFile(source,path.join(out,name)).catch(() => {});
    }
  }
  if(instance) { try { evidence.stop=await lifecycle('stop',instance.instanceId); evidence.listAfter=await lifecycle('list'); } catch(e){evidence.cleanupFailure=e.message; process.exitCode=1;} }
  if(instance?.dataRoot) evidence.ownedDataRootAbsent=!existsSync(instance.dataRoot);
  clearInterval(sampler); await fs.writeFile(path.join(out,'shm-samples.json'), JSON.stringify(samples));
  await save();
}
console.log(JSON.stringify(evidence));
