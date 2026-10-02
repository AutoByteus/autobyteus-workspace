#!/usr/bin/env node
// Temporary API/E2E probe (TC-007): real Chrome → Nuxt dev → built backend (dist/app.js) → fake AGY CLI
// (tests/fixtures/agy-failure-cli.mjs, case mcp_calls). Owned temp data root, free ports, sanitized env.
// Usage: node tc-007-activity-panel-probe.mjs <worktree root> <output dir>
import { spawn, execFileSync } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const rootDir = path.resolve(process.argv[2]); const outDir = path.resolve(process.argv[3])
const webDir = path.join(rootDir, 'autobyteus-web'); const serverDir = path.join(rootDir, 'autobyteus-server-ts')
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const fakeAgy = path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs')
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) }) })
const waitFor = async (label, fn, timeout = 90000, interval = 250) => { const start = Date.now()
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`) }
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => { const log = createWriteStream(path.join(outDir, `tc-007-${label}.log`))
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log); child.stderr.pipe(log); owned.push(child); return child }
const stopOwned = async (child) => { if (child.exitCode !== null || child.signalCode) return 'already-exited'
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  const exited = await Promise.race([new Promise((r) => child.once('exit', () => r(true))), delay(15000).then(() => false)])
  if (!exited) { try { process.kill(-child.pid, 'SIGKILL') } catch {} }
  return exited ? 'SIGTERM' : 'SIGKILL' }
const sel = (t) => `[data-test="${t}"]`
const RUN_VIEW = '[data-testid="agent-workspace-surface"]'
const evidence = { startedAt: new Date().toISOString(), steps: {}, cleanup: [] }
let ownedRoot, browser, exitCode = 0, instance, page;

// Reads the rendered Activity feed: every item's title and status, expanding each item to read its sections.
const readActivity = async (page) => {
  const tab = page.locator('[data-tab-name="progress"]:visible').first(); if (!await page.locator(sel('activity-feed-scroll-container')).isVisible()) await tab.click();
  const feed = page.locator(sel('activity-feed-scroll-container'))
  await feed.waitFor({ timeout: 60000 })
  const count = await feed.locator('span.truncate.font-bold').count()
  const items = []
  for (let i = 0; i < count; i += 1) {
    const title = feed.locator('span.truncate.font-bold').nth(i)
    const card = title.locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
    // Items are expanded by default; their Arguments / Result / Error sections are opened by their labels.
    const labels = card.locator('span.text-xs.font-semibold')
    for (let j = 0; j < await labels.count(); j += 1) { const label = labels.nth(j); const body = label.locator('xpath=../following-sibling::div[1]'); if (!await body.isVisible()) await label.click(); await body.waitFor({state:'visible'}); }
    await delay(150)
    const sections = await card.locator('div.font-mono').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText))
    items.push({ title: (await title.innerText()).trim(), text: await card.innerText(),
      status: (await card.locator('span.uppercase').first().innerText()).trim(), sections })
  }
  return items
}
const json = (text) => { try { return JSON.parse(text) } catch { return text } }
const check = (items, label) => {
  const titles = items.map((i) => i.title)
  assert(JSON.stringify(titles) === JSON.stringify(['view_file', 'delegate_task', 'mcp__shape-test__echo_args',
    'mcp__shape-test__json_result', 'mcp__shape-test__always_fails', 'call_mcp_tool', 'generate_image']),
  `${label}: Activity titles`, titles)
  const delegate = items[1]
  assert(JSON.stringify(json(delegate.sections[0])) === JSON.stringify({ description: 'Summarise the report.', recipient_address: '/researcher' }),
    `${label}: delegate_task arguments`, delegate.sections)
  assert(JSON.stringify(json(delegate.sections[1])) === JSON.stringify({ provider_state: 'DONE',
    output: { target_agent_run_id: 'run-7318', message: 'Task delegated.' } }), `${label}: delegate_task result`, delegate.sections)
  assert(!/ServerName|ToolName/.test(delegate.sections.join('\n')), `${label}: wrapper leaked into delegate_task`, delegate.sections)
  assert(JSON.stringify(json(items[2].sections[0])) === JSON.stringify({ note: 'hello', options: { count: 2, tags: ['a', 'b'] } }),
    `${label}: third-party arguments`, items[2].sections)
  assert(/PROBE-FAILURE-9920/.test(items[4].text), `${label}: failure text`, items[4])
  assert(JSON.stringify(json(items[5].sections[0])) === JSON.stringify({ Arguments: { content: 'no server name' }, ToolName: 'send_message_to' }),
    `${label}: incomplete wrapper arguments`, items[5].sections)
  return items.map((i) => ({ title: i.title, status: i.status }))
}

const lifecycle = (verb) => { const r=JSON.parse(execFileSync('pnpm',['--silent','isolated-app',verb,instance.instanceId],{cwd:rootDir,encoding:'utf8',timeout:180000})); assert(r.ok,verb,r); return r; };
const attach=async()=>{browser=await chromium.connectOverCDP(instance.controlEndpoint); page=browser.contexts()[0].pages().find(p=>p.url().includes('/renderer/index.html')); assert(page,'owned renderer missing'); page.setDefaultTimeout(45000); await page.setViewportSize({width:1440,height:1000}); page.on('dialog',d=>d.accept()); await page.waitForLoadState('domcontentloaded'); await page.locator(sel('chat-new')).waitFor({timeout:120000}); await delay(1500); return page;};
const ledger=async(msg)=>fs.appendFile(path.join(rootDir,'tickets/in-progress/agy-mcp-tool-call-presentation-only/api-e2e-test-case-ledger.md'),`| TC-013 | ${msg} | api-rev-003/desktop/desktop-result.json |\n`);
try {
 await fs.mkdir(outDir,{recursive:true});
 const start=JSON.parse(await fs.readFile(path.join(path.dirname(outDir),'desktop-start.json'),'utf8'));assert(start.ok,'desktop start failed',start); instance=start.result; evidence.instance=instance;
 const envFile=path.join(instance.dataRoot,'server-data/.env'); const initialEnv=await fs.readFile(envFile,'utf8');
 const workspace=path.join(instance.dataRoot,'probe-workspace'); await fs.mkdir(workspace,{recursive:true});
 await fs.writeFile(envFile,initialEnv+`\nANTIGRAVITY_CLI_COMMAND=${fakeAgy}\nAGY_FAKE_CASE=mcp_calls\nAGY_FAKE_MCP_IMAGE_PATH=${workspace}/mcp-blue-dog.png\n`);
 evidence.fakeRestart=lifecycle('restart'); await attach(); evidence.browserVersion=browser.version(); evidence.initialUrl=page.url(); evidence.initialDOM=await page.locator('body').innerText();
 const entry=page.url().split('#')[0]+'#/chat';
 await page.goto(entry); await page.locator(sel('chat-new')).waitFor({timeout:120000}); await delay(1000);
 await page.locator(sel('chat-model-trigger')).click(); await page.locator(sel('chat-runtime-antigravity_cli')).click();
 const models=page.locator('button[role="menuitemradio"][data-test^="chat-model-option-"]'); await models.first().waitFor({timeout:120000}); await models.first().click();
 await page.locator(sel('chat-workspace-trigger')).click();await page.locator(sel('chat-workspace-open-folder')).click();const folder=page.locator(`${sel('chat-workspace-folder-form')} input`);await folder.fill(workspace);await folder.press('Enter');
 await page.locator(`${sel('chat-composer')} textarea`).first().fill('Delegate the report summary and call the MCP tools.'); await page.locator(sel('chat-primary-action')).first().click();
 await page.locator(RUN_VIEW).waitFor({timeout:120000}); await page.waitForFunction(()=>[...document.querySelectorAll('[data-testid="agent-workspace-surface"] *')].some(n=>n.children.length===0&&n.textContent.trim()==='MCP_DONE'),null,{timeout:120000});
 const fakeUrl=page.url();evidence.fakeRunUrl=fakeUrl;
 evidence.steps.fakeLive=check(await readActivity(page),'packaged-live');await page.screenshot({path:path.join(outDir,'fake-activity.png')});
 await page.reload();await delay(3000);evidence.steps.fakeReload=check(await readActivity(page),'packaged-reload');
 await ledger('Packaged scripted MCP journey and reload Pass; seven names/arguments/results/failure/fallback verified. Real CLI and process-reopen next.');
 await browser.close();browser=null; evidence.processRestart=lifecycle('restart'); await attach();await page.goto(fakeUrl);await delay(3000);evidence.steps.fakeProcessReopen=check(await readActivity(page),'packaged-process-reopen');await page.screenshot({path:path.join(outDir,'fake-restarted.png')});
 // Reset only this instance's test transport configuration, then use the installed real AGY CLI.
 await fs.writeFile(envFile,initialEnv);await browser.close();browser=null;evidence.realRestart=lifecycle('restart');await attach();await page.goto(entry);await page.locator(sel('chat-new')).waitFor({timeout:120000});
 await page.locator(sel('chat-model-trigger')).click();await page.locator(sel('chat-runtime-antigravity_cli')).click();await page.locator('button[role="menuitemradio"][data-test^="chat-model-option-"]').first().click();
 await page.locator(`${sel('chat-composer')} textarea`).first().fill('Use the native run_command tool exactly once to execute printf AGY_DESKTOP_NATIVE_7318. Then reply DONE. Do not read or modify any files, do not run any other command.');await page.locator(sel('chat-primary-action')).first().click();await page.locator(RUN_VIEW).waitFor({timeout:120000});
 await page.locator('[data-tab-name="progress"]:visible').first().click(); const feed=page.locator(sel('activity-feed-scroll-container'));await feed.waitFor({timeout:180000});await page.waitForFunction(()=>{const e=document.querySelector('[data-test="activity-feed-scroll-container"]');return e&&e.innerText.includes('run_command')&&e.innerText.toLowerCase().includes('success')},null,{timeout:180000});await delay(2500);
 evidence.steps.realNative=await readActivity(page);assert(evidence.steps.realNative.some(x=>x.title==='run_command'&&JSON.stringify(x).includes('AGY_DESKTOP_NATIVE_7318')),'real native result missing',evidence.steps.realNative);
 evidence.realRunUrl=page.url();await page.screenshot({path:path.join(outDir,'real-native.png')});await ledger('Real packaged AGY native run_command journey Pass; command output marker displayed.');
 await browser.close();browser=null;evidence.realProcessRestart=lifecycle('restart');await attach();await page.goto(evidence.realRunUrl);await delay(3000);evidence.steps.realReopened=await readActivity(page);assert(evidence.steps.realReopened.some(x=>x.title==='run_command'&&JSON.stringify(x).includes('AGY_DESKTOP_NATIVE_7318')),'real native persisted result missing');evidence.result='Pass';
} catch(err){exitCode=1;evidence.result='Fail';evidence.error=String(err.stack??err);evidence.details=err.details; if(page) await page.screenshot({path:path.join(outDir,'failure.png')}).catch(()=>{});}
finally{ await browser?.close().catch(()=>{});if(instance){await fs.copyFile(instance.logPath,path.join(outDir,'instance.log')).catch(()=>{});try{evidence.cleanup.push(lifecycle('stop'));}catch(err){evidence.cleanup.push({error:String(err)});exitCode=1;}}evidence.completedAt=new Date().toISOString();await fs.writeFile(path.join(outDir,'desktop-result.json'),JSON.stringify(evidence,null,2));await ledger('Desktop final '+evidence.result+'; cleanup receipt recorded.'); console.log(evidence.result,evidence.error??'');process.exitCode=exitCode;}
