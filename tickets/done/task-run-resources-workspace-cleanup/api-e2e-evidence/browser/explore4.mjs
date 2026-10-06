import fs from 'node:fs';
import * as L from './lib.mjs';
const out = {};
for (const kind of ['team', 'org']) {
  const { ids, names } = await L.createDefinitions(`X${kind}`);
  const { projectId, task } = await L.createProject(kind);
  const helper = kind === 'org' || kind === 'team' ? '/helper' : `/${L.segment(names.helper)}`;
  const taskA = await task(L.callTool('delegate_task', { recipient_address: helper,
    description: L.callTool('send_message_to', { recipient_address: `/${L.segment(names.assistant)}`, content: 'Collect the changelog links.' }) }));
  const taskB = await task('Review the docs site.');
  const root = await L.createRoot(kind, ids);
  const input = await L.managerInput(root);
  input.send(L.callTool('delegate_task', { recipient_address: '/worker', task_id: taskA }));
  await L.until('A', async () => L.taskNodes(await L.storedTree(root)).length >= 3, 60000);
  input.send(L.callTool('delegate_task', { recipient_address: kind === 'org' ? '/squad' : `/${L.segment(names.squad)}`, task_id: taskB }));
  await L.until('B', async () => L.taskNodes(await L.storedTree(root)).length >= 4, 60000);
  input.send(L.callTool('delegate_task', { recipient_address: '/worker', description: 'Draft a short summary.' }));
  await L.until('plain', async () => L.taskNodes(await L.storedTree(root)).length >= 5, 60000);
  input.close();
  out[kind] = { ids, names, projectId, taskA, taskB, root, nodes: L.taskNodes(await L.storedTree(root)) };
}
fs.writeFileSync(new URL('./explore-team-org.json', import.meta.url), JSON.stringify(out, null, 2));
const browser = await L.chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(L.state().frontendUrl + '/workspace', { waitUntil: 'networkidle', timeout: 120000 });
await L.sleep(1500);
await page.locator('[data-test="workspace-row"]').nth(1).click(); await L.sleep(1000);
const dump = async (label) => { const rows = await page.evaluate(() => [...document.querySelectorAll('[data-test="app-left-panel-run-history"] [data-test]')]
  .map(e => `${e.getAttribute('data-test')}|${e.getAttribute('role')}|${(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,60)}`)
  .filter(s => !/branches|status-dot|avatar\|/.test(s)));
  console.log('==', label); console.log(rows.slice(0, 80).join('\n')); };
await dump('workspace expanded');
await page.screenshot({ path: new URL('./explore-4.png', import.meta.url).pathname, fullPage: true });
await browser.close();
