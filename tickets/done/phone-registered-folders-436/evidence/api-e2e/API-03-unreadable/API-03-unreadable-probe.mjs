// API-03 (autobyteus-436, temporary): a file the node's user cannot read (chmod 000) on a host node of this worktree:
// the route answers 400 NODE_FILE_UNREADABLE and the phone shows "The file preview could not be opened.". Arg: <outDir>.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net'; import { spawn } from 'node:child_process'; import { randomBytes } from 'node:crypto'; import { createRequire } from 'node:module'; import { randomUUID } from 'node:crypto';
const W = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436';
const require = createRequire(`${W}/autobyteus-web/package.json`); const { chromium } = require('playwright-core'); const WS = require('ws');
const out = process.argv[2]; const TS = '100.127.30.107'; const lines = []; let ok = true;
const log = (...a) => { const l = a.join(' '); lines.push(l); console.log(l); }; const expect = (c, m) => { log(`${c ? 'PASS' : 'FAIL'} ${m}`); if (!c) ok = false; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = await new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const root = fs.realpathSync(fs.mkdtempSync('/tmp/abtest436/host-')); const data = path.join(root, 'data'); fs.mkdirSync(data);
const secret = path.join(root, 'no-read.md'); fs.writeFileSync(secret, '# unreadable\n'); fs.chmodSync(secret, 0o000);
const readable = path.join(root, 'readable.md'); fs.writeFileSync(readable, '# HOST-READABLE-436\n');
const owner = `own_${randomBytes(32).toString('base64url')}`;
fs.writeFileSync(path.join(data, '.env'), `APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://${TS}:${port}\n`);
const child = spawn(process.execPath, ['dist/app.js', '--host', '0.0.0.0', '--port', String(port), '--data-dir', data], { cwd: `${W}/autobyteus-server-ts`, env: { PATH: process.env.PATH, HOME: root, TMPDIR: os.tmpdir(), APP_ENV: 'test', AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner, ANTIGRAVITY_CLI_COMMAND: `${W}/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`, AGY_FAKE_CASE: 'linked_skills' }, stdio: ['ignore', 'pipe', 'pipe'] });
const slog = fs.createWriteStream(path.join(out, 'API-03-node.log')); child.stdout.pipe(slog); child.stderr.pipe(slog);
let browser;
try {
  for (let i = 0; i < 120 && !(await fetch(`http://127.0.0.1:${port}/rest/health`).then(r => r.ok).catch(() => false)); i++) await sleep(500);
  log(`# API-03 unreadable node file; node 0.0.0.0:${port}; ${new Date().toISOString()}; node runs as uid ${process.getuid()}`);
  const get = async p => { const r = await fetch(`http://127.0.0.1:${port}/rest/node-files/content?path=${encodeURIComponent(p)}`, { headers: { authorization: `Bearer ${owner}` } }); const t = await r.text(); let c = null; try { c = JSON.parse(t).code; } catch {} return { status: r.status, code: c, text: t.slice(0, 120) }; };
  const u = await get(secret); expect(u.status === 400 && u.code === 'NODE_FILE_UNREADABLE', `GET a chmod-000 file: ${u.status} ${u.code}`);
  const rd = await get(readable); expect(rd.status === 200 && rd.text.includes('HOST-READABLE-436'), `GET a readable file next to it: ${rd.status}`);
  const gql = async (q, v) => { const r = await (await fetch(`http://127.0.0.1:${port}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 300)); return r.data; };
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const ws = path.join(root, 'ws'); fs.mkdirSync(ws);
  const def = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Reporter', role: 'assistant', description: 'x', instructions: 'x', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const runId = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: def, workspaceRootPath: ws, autoExecuteTools: true, ...agy } })).createAgentRun.runId;
  const sock = new WS(`ws://127.0.0.1:${port}/ws/agent/${runId}?access_token=${encodeURIComponent(owner)}`); await new Promise((r, j) => { sock.once('open', r); sock.once('error', j); }); await sleep(500);
  const mid = randomUUID(); sock.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: mid, dedupe_key: `agent_run_input:probe:${mid}`, context_file_paths: [], image_urls: [], agent_run_id: runId, content: `ECHO_INPUT UNREADABLE-436 locked [no-read.md](${secret}), open [readable.md](${readable}).` } })); await sleep(800); sock.close();
  for (let i = 0; i < 120 && !/ECHO:[^]*UNREADABLE-436/.test(JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? [])); i++) await sleep(500);
  const rest = (m, r, b) => fetch(`http://127.0.0.1:${port}/rest${r}`, { method: m, headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify(b) }).then(x => x.json());
  await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  const s = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'tailscale', serverBaseUrl: `http://${TS}:${port}`, serverName: 'Host 436', trustedPrivateHttpAcknowledged: true });
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'en-US' })).newPage();
  await page.goto(s.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60000 }); await page.locator(`[data-testid="mobile-run-row-agent:${runId}"]`).waitFor({ timeout: 60000 }); await page.locator(`[data-testid="mobile-run-row-agent:${runId}"] [data-testid="mobile-run-open"]`).click();
  const control = p => page.locator('[data-testid="mobile-run-conversation"]').locator(`[data-event-monitor-file-action-control="true"][title="${p}"]`).last(); await control(secret).waitFor({ timeout: 60000 });
  const open = async (label, p, sel) => { await control(p).scrollIntoViewIfNeeded(); await control(p).click(); await page.locator('[data-testid="mobile-file-viewer"]').waitFor({ timeout: 30000 }); let t = ''; for (let i = 0; i < 100 && !t; i++) { t = await page.locator(sel).innerText().catch(() => ''); await sleep(200); } await page.screenshot({ path: path.join(out, `API-03-phone-${label}.png`) }); await page.goBack(); await page.locator('[data-testid="mobile-file-viewer"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {}); return t; };
  const m = await open('unreadable', secret, '[data-testid="mobile-file-preview-error"]');
  expect(m === 'The file preview could not be opened.', `phone, the unreadable file: ${JSON.stringify(m)}`);
  const ok2 = await open('readable', readable, '[data-testid="mobile-file-viewer"] [data-testid="mobile-file-preview-content"]');
  expect(ok2.includes('HOST-READABLE-436'), `phone, the readable file: ${JSON.stringify(ok2.slice(0, 60))}`);
  const nodeLog = fs.readFileSync(path.join(out, 'API-03-node.log'), 'utf8');
  expect(!nodeLog.includes(root), `the node's log names no node file path (${nodeLog.split(root).length - 1} occurrences of the temp folder)`);
} catch (e) { ok = false; log('ERROR', e.stack); }
finally { if (browser) await browser.close(); child.kill('SIGTERM'); await sleep(1500); fs.chmodSync(secret, 0o600); fs.rmSync(root, { recursive: true, force: true }); log(`result ${ok ? 'Pass' : 'Fail'}; node stopped; temp root removed`); fs.writeFileSync(path.join(out, 'API-03-unreadable.log'), lines.join('\n') + '\n'); process.exitCode = ok ? 0 : 1; }
