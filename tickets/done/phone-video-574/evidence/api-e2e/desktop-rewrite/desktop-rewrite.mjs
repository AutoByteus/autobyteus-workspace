// Temporary (autobyteus-574 API/E2E, AC-005 last sentence / AC-006 desktop): the desktop renderer's engine (Chromium,
// with the owner credential on its requests as the desktop's main process attaches it) fetches a workspace file from a
// real node of this worktree, keeps it in its HTTP cache, the file is rewritten on disk, and the same fetch again must
// give the new content (Cache-Control: no-cache + ETag: the cache revalidates). Also a text file the viewer shows.
import fs from 'node:fs/promises';
import { mkdtempSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const worktree = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574';
const { probeNodeEnvironment, ownerHeaders, attachToBrowserContext } = await import(`${worktree}/autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs`);
const { chromium } = createRequire(`${worktree}/autobyteus-web/package.json`)('playwright-core');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'desktop-rewrite-')));
const dataDir = path.join(root, 'data'); const home = path.join(root, 'home'); const workspace = path.join(root, 'workspace');
for (const dir of [dataDir, home, workspace]) await fs.mkdir(dir, { recursive: true });
const port = 40000 + Math.floor(Math.random() * 20000);
const nodeUrl = `http://127.0.0.1:${port}`;
await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${nodeUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
const node = spawn(process.execPath, [`${worktree}/autobyteus-server-ts/dist/app.js`, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir],
  { cwd: `${worktree}/autobyteus-server-ts`, stdio: 'ignore', env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR, APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: nodeUrl, ...probeNodeEnvironment() } });
const results = {};
let browser;
try {
  for (let i = 0; i < 240; i += 1) { try { if ((await fetch(`${nodeUrl}/rest/health`)).ok) break; } catch { /* starting */ } await sleep(500); }
  const gql = async (query, variables) => (await (await fetch(`${nodeUrl}/graphql`, { method: 'POST', headers: ownerHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ query, variables }) })).json()).data;
  const workspaceId = (await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } })).createWorkspace.workspaceId;
  await fs.writeFile(path.join(workspace, 'notes.txt'), 'FIRST VERSION of the notes');
  await fs.writeFile(path.join(workspace, 'clip.bin'), Buffer.alloc(300_000, 1));
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox'] });
  const context = await browser.newContext();
  await attachToBrowserContext(context);
  const page = await context.newPage();
  const seen = [];
  page.on('response', async (response) => { if (response.url().includes('/content?')) seen.push({ url: response.url().replace(/.*path=/, ''), status: response.status(), fromCache: response.fromServiceWorker() ? 'sw' : (await response.request().headerValue('if-none-match')) ?? null }); });
  await page.goto(`${nodeUrl}/rest/health`);
  const read = (file) => page.evaluate(async (url) => { const r = await fetch(url); const b = await r.arrayBuffer(); return { status: r.status, etag: r.headers.get('etag'), cacheControl: r.headers.get('cache-control'), length: b.byteLength, text: new TextDecoder().decode(b.slice(0, 40)) }; }, `/rest/workspaces/${workspaceId}/content?path=${file}`);
  results.textFirst = await read('notes.txt');
  results.textAgainUnchanged = await read('notes.txt');
  await sleep(50);
  await fs.writeFile(path.join(workspace, 'notes.txt'), 'SECOND VERSION, rewritten by an agent');
  results.textAfterRewrite = await read('notes.txt');
  results.binFirst = await read('clip.bin');
  await fs.writeFile(path.join(workspace, 'clip.bin'), Buffer.alloc(200_000, 2));
  results.binAfterRewrite = await read('clip.bin');
  results.responses = seen;
  results.pass = results.textAfterRewrite.text.startsWith('SECOND VERSION') && results.textAfterRewrite.etag !== results.textFirst.etag && results.binAfterRewrite.length === 200_000;
} finally {
  await browser?.close();
  node.kill('SIGTERM');
  await sleep(1500);
  await fs.rm(root, { recursive: true, force: true });
}
console.log(JSON.stringify(results, null, 1));
