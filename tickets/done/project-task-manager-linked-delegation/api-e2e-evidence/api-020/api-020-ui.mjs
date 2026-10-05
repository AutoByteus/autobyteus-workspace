// API-REV-020 temporary rendered check in the owned isolated app window (attach-only over its control port).
// Asserts the Projects list and Task board render the per-folder data written by this round; screenshots support.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const E = 'tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/api-020';
const i = JSON.parse(await fs.readFile(`${E}/api-301-instance.json`, 'utf8')).result;
const reply = JSON.parse(await fs.readFile(`${E}/api-020-reply.json`, 'utf8'));
const { chromium } = createRequire(new URL('./autobyteus-web/package.json', `file://${process.cwd()}/`))('playwright-core');
const out = { at: new Date().toISOString(), instanceId: i.instanceId };
const gql = async (query, variables = {}) => { const r = await fetch(i.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const j = await r.json(); assert(!j.errors, JSON.stringify(j.errors)); return j.data; };
await gql('mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}', { k: 'ENABLE_PROJECTS', v: 'true' });
const browser = await chromium.connectOverCDP(i.controlEndpoint);
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('index.html'));
  assert(page, 'app window page');
  const go = async hash => { const u = new URL(page.url()); u.hash = hash; await page.goto(u.href); };
  await go('/projects');
  await page.reload();
  const card = page.locator(`[data-testid="project-card-${reply.project.projectId}"]`);
  await card.first().waitFor({ timeout: 30_000 });
  out.listText = (await page.locator('main').first().innerText()).slice(0, 1500);
  assert(out.listText.includes(reply.project.projectId) || (await card.count()) > 0);
  await page.screenshot({ path: `${E}/api-020-ui-projects.png` });
  await go(`/projects/${reply.project.projectId}`);
  await page.locator('[data-testid="project-task-board"]').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  out.boardText = (await page.locator('[data-testid="project-task-board"]').innerText()).slice(0, 2000);
  out.columns = await page.locator('[data-testid^="project-task-column-"]').evaluateAll(es => es.map(e => ({ id: e.getAttribute('data-testid'), text: e.innerText.slice(0, 300) })));
  assert(/Task R/.test(out.boardText), 'Task R visible on the board');
  const doneColumn = out.columns.find(c => /done/i.test(c.id ?? '') && /Task R/.test(c.text));
  assert(doneColumn, 'Task R is in the DONE column: ' + JSON.stringify(out.columns));
  await page.screenshot({ path: `${E}/api-020-ui-task-board.png` });
  out.result = 'pass';
} catch (error) { out.error = String(error); process.exitCode = 1; }
finally { await fs.writeFile(`${E}/api-020-ui.json`, JSON.stringify(out, null, 2) + '\n'); await browser.close(); }
console.log(JSON.stringify({ result: out.result, error: out.error, columns: out.columns?.map(c => c.id) }));
