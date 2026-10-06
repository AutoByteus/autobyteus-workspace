// Diagnostic: when does `tree-row-move` attach to Team-tree rows, and is it ever removed?
import fs from 'node:fs';
import * as L from './lib.mjs';
const kind = process.argv[2] ?? 'team';
const { ids, names } = await L.createDefinitions(`Diag${kind}`);
const { projectId, task } = await L.createProject(`Diag${kind}`);
const helper = kind === 'agent' ? `/${L.segment(names.helper)}` : '/helper';
const worker = kind === 'agent' ? `/${L.segment(names.worker)}` : '/worker';
const taskA = await task(L.callTool('delegate_task', { recipient_address: helper, description: L.callTool('send_message_to', { recipient_address: `/${L.segment(names.assistant)}`, content: 'Collect links.' }) }));
const root = await L.createRoot(kind, ids);
const input = await L.managerInput(root);
input.send(L.callTool('delegate_task', { recipient_address: worker, task_id: taskA }));
await L.until('A', async () => L.taskNodes(await L.storedTree(root)).length >= 3, 60000);
if (process.argv.includes('--full')) {
  input.send(L.callTool('delegate_task', { recipient_address: kind === 'org' ? '/squad' : `/${L.segment(names.squad)}`, task_id: await task('Review the docs site.') }));
  await L.until('B', async () => L.taskNodes(await L.storedTree(root)).length >= 4, 60000);
  input.send(L.callTool('delegate_task', { recipient_address: worker, description: 'Draft a short summary.' }));
  await L.until('plain', async () => L.taskNodes(await L.storedTree(root)).length >= 5, 60000);
}
const browser = await L.chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto(L.state().frontendUrl + '/workspace', { waitUntil: 'networkidle', timeout: 120000 });
await page.locator('[data-test="workspace-row"]').nth(1).click();
const classes = () => page.evaluate(() => [...document.querySelectorAll('[role="treeitem"]')].map(e => `${(e.getAttribute('aria-label')||'').split(',').slice(0,2).join(',')}=>[${[...e.classList].filter(c=>c.startsWith('tree-row')).join(' ')}]`).filter(s => s.includes('tree-row')));
const log = async (label) => console.log(label, JSON.stringify(await classes()));
if (kind === 'team') { await page.locator(`[data-test="workspace-team-definition-row-${L.segment(names.team).replace(/_/g,'-')}"]`).click(); await page.locator(`[data-test="workspace-team-row-${root.rootId}"]`).click(); }
else { await page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager }).click(); await page.locator('[data-test="workspace-agent-run-row"]').click(); }
await L.sleep(2500); await log('opened');
const workerRow = (await L.taskNodes(await L.storedTree(root))).find(n => n.delegatorAgentRunId === root.managerRunId);
await page.evaluate(() => { window.__f = []; const t0 = performance.now(); const tick = () => {
  window.__f.push({ t: Math.round(performance.now() - t0), rows: [...document.querySelectorAll('[role="treeitem"]')].map(e => ({
    n: (e.getAttribute('aria-label')||'').split(',').slice(0,3).join(','), y: Math.round(e.getBoundingClientRect().top), h: Math.round(e.getBoundingClientRect().height),
    c: [...e.classList].filter(c=>c.startsWith('tree-row')).join(' '), tf: getComputedStyle(e).transform })) });
  if (performance.now() - t0 < 6000) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
const tMsg = Date.now();
input.send(L.callTool('send_message_to', { target_agent_run_id: workerRow.agentRunId, content: 'Status?' }));
await page.locator(`[data-agent-run-id="${workerRow.agentRunId}"]`).click();
await L.until('conv', async () => /Task delegator address/.test(await page.locator('[data-test="workspace-center-pane"]').innerText()), 30000);
await page.locator(`[data-agent-run-id="${workerRow.agentRunId}"]`).focus();
console.log('DONE sent at +', Date.now() - tMsg, 'ms after message');
input.send(L.callTool('create_or_update_task', { project_id: projectId, task_id: taskA, status: 'DONE' }));
await L.sleep(4000);
const frames = await page.evaluate(() => window.__f);
fs.writeFileSync(new URL(`./diag-move-${kind}.json`, import.meta.url), JSON.stringify(frames, null, 1));
let prev = '';
for (const f of frames) { const sig = f.rows.map(r => `${r.n.split(',')[1]?.trim()}@${r.y}/${r.h}${r.c ? '['+r.c+']' : ''}${r.tf !== 'none' ? '{'+r.tf.slice(0,30)+'}' : ''}`).join(' | ');
  if (sig !== prev) { console.log(f.t, sig.slice(0, 900)); prev = sig; } }
input.close(); await browser.close();
const t = await L.terminate(root); console.log('terminated', t.success);
process.exit(0);
