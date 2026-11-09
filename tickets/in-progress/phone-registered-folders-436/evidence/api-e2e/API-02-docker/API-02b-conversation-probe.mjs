// API-02b (autobyteus-436, temporary): a test-owned Docker node of this branch (abtest436 image) with the scripted AGY CLI;
// an agent run's own message names files by the container's absolute paths; the phone, paired over this Mac's Tailscale
// address, taps each name in the conversation (AC-005, REQ-001, REQ-004, REQ-006, RSK-001). Arg: <outDir>.
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { execFileSync } from 'node:child_process'; import { randomBytes, randomUUID } from 'node:crypto'; import { createRequire } from 'node:module';
const W = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436';
const require = createRequire(`${W}/autobyteus-web/package.json`); const { chromium } = require('playwright-core'); const WS = require('ws');
const out = process.argv[2]; const TS = '100.127.30.107'; const NAME = 'abtest436-scripted'; const lines = []; let ok = true;
const log = (...a) => { const l = a.join(' '); lines.push(l); console.log(l); }; const expect = (c, m) => { log(`${c ? 'PASS' : 'FAIL'} ${m}`); if (!c) ok = false; };
const sleep = ms => new Promise(r => setTimeout(r, ms)); const docker = (...a) => execFileSync('/tmp/abtest436/bin/docker', a, { encoding: 'utf8' });
const port = await new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const owner = `own_${randomBytes(32).toString('base64url')}`; const local = `http://127.0.0.1:${port}`; const origin = `http://${TS}:${port}`;
const S = '/home/autobyteus/shared'; const files = { notes: `${S}/ac005-notes.md`, image: `${S}/ac005-picture.png`, pdf: `${S}/ac005-large.pdf`, unmounted: '/tmp/abtest436/sample/ac005-notes.md', folder: `${S}/reports-436.md` };
let browser;
try {
  log(`# API-02b; image abtest436/autobyteus-server:test (this branch's server package, commit ${execFileSync('git', ['-C', W, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}); ${new Date().toISOString()}`);
  docker('run', '-d', '--name', NAME, '-p', `127.0.0.1:${port}:8000`, '-p', `${TS}:${port}:8000`,
    '-v', '/tmp/abtest436/shared-host/shared:/home/autobyteus/shared', '-v', `${W}/autobyteus-server-ts/tests/fixtures:/opt/abtest436-fixtures:ro`,
    '-e', 'AUTOBYTEUS_DATA_DIR=/home/autobyteus/data', '-e', 'AUTOBYTEUS_BIND_HOST=0.0.0.0', '-e', 'AUTOBYTEUS_SERVER_PORT=8000', '-e', `AUTOBYTEUS_SERVER_HOST=http://localhost:${port}`,
    '-e', 'APP_ENV=production', '-e', 'DB_TYPE=sqlite', '-e', 'AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace',
    '-e', 'ANTIGRAVITY_CLI_COMMAND=/opt/abtest436-fixtures/agy-failure-cli.mjs', '-e', 'AGY_FAKE_CASE=linked_skills', '-e', `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL=${owner}`,
    'abtest436/autobyteus-server:test');
  log(`container ${NAME} published: ${docker('port', NAME, '8000').trim().split('\n').join(' ')}`);
  for (let i = 0; i < 150 && !(await fetch(`${local}/rest/health`).then(r => r.ok).catch(() => false)); i++) await sleep(2000);
  const gql = async (q, v) => { const r = await (await fetch(`${local}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 400)); return r.data; };
  log(`owner GraphQL with the launch credential: ${(await gql('{__typename}')).__typename}`);
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const def = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Reporter', role: 'assistant', description: 'AC-005 probe', instructions: 'Answer.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const run = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: def, workspaceRootPath: '/home/autobyteus/workspace', autoExecuteTools: true, ...agy } })).createAgentRun;
  if (!run.success) throw new Error(run.message); const runId = run.runId; log(`agent run ${runId} in /home/autobyteus/workspace`);
  const sock = new WS(`ws://127.0.0.1:${port}/ws/agent/${runId}?access_token=${encodeURIComponent(owner)}`); await new Promise((r, j) => { sock.once('open', r); sock.once('error', j); }); await sleep(500);
  const id = randomUUID(); const content = `ECHO_INPUT SHARED-LINKS-436 notes [ac005-notes.md](${files.notes}), picture [ac005-picture.png](${files.image}), the plan [ac005-large.pdf](${files.pdf}), on my Mac [host-notes.md](${files.unmounted}), folder [reports-436.md](${files.folder}).`;
  sock.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:probe:${id}`, context_file_paths: [], image_urls: [], agent_run_id: runId, content } })); await sleep(800); sock.close();
  let conv = ''; for (let i = 0; i < 120 && !/ECHO:[^]*SHARED-LINKS-436/.test(conv); i++) { conv = JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []); await sleep(500); }
  expect(/ECHO:[^]*SHARED-LINKS-436/.test(conv), 'the agent\'s own message names the files (scripted AGY in the container)');
  const rest = (m, r, b) => fetch(`${local}/rest${r}`, { method: m, headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify(b) }).then(x => x.json());
  await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  const ps = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'tailscale', serverBaseUrl: origin, serverName: 'Docker 436', trustedPrivateHttpAcknowledged: true });
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' })).newPage();
  const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(ps.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60000 });
  await page.locator(`[data-testid="mobile-run-row-agent:${runId}"]`).waitFor({ timeout: 60000 });
  log(`phone paired at ${new URL(page.url()).origin}; the run is listed`);
  await page.locator(`[data-testid="mobile-run-row-agent:${runId}"] [data-testid="mobile-run-open"]`).click();
  const conversation = page.locator('[data-testid="mobile-run-conversation"]');
  const control = p => conversation.locator(`[data-event-monitor-file-action-control="true"][title="${p}"]`).last();
  await control(files.notes).waitFor({ timeout: 60000 });
  await page.screenshot({ path: path.join(out, 'API-02b-phone-conversation.png') });
  const tap = async (label, p, check, timeout = 30000) => {
    await control(p).scrollIntoViewIfNeeded(); const t0 = Date.now(); await control(p).click();
    await page.locator('[data-testid="mobile-file-viewer"]').waitFor({ timeout });
    let r = null; const end = Date.now() + timeout; while (Date.now() < end) { r = await check(); if (r?.done) break; await sleep(200); }
    r.ms = Date.now() - t0; r.query = new URL(page.url()).searchParams.get('nodeFile'); r.controls = await page.locator('[data-testid="mobile-file-viewer"] button').allInnerTexts();
    await page.screenshot({ path: path.join(out, `API-02b-phone-${label}.png`) });
    await page.goBack(); await page.locator('[data-testid="mobile-file-viewer"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    r.backToConversation = await conversation.isVisible().catch(() => false);
    return r;
  };
  const viewerText = () => page.locator('[data-testid="mobile-file-viewer"]').innerText().catch(() => '');
  const errorText = () => page.locator('[data-testid="mobile-file-preview-error"]').innerText().catch(() => '');
  const r1 = await tap('shared-markdown', files.notes, async () => { const t = await viewerText(); return { done: t.includes('SHARED-MARKER-436'), text: t.slice(0, 140) }; });
  expect(r1.done && r1.query === files.notes && r1.backToConversation, `tap ${files.notes}: opens read-only (${JSON.stringify(r1.text)}), nodeFile=${r1.query}, ${r1.ms} ms, Back → conversation ${r1.backToConversation}, viewer buttons ${JSON.stringify(r1.controls)}`);
  const r2 = await tap('shared-image', files.image, async () => { const w = await page.locator('[data-testid="mobile-file-viewer"] img').evaluateAll(e => e.map(x => x.naturalWidth)); return { done: w.includes(120), widths: w }; });
  expect(r2.done && r2.backToConversation, `tap ${files.image}: image naturalWidth ${JSON.stringify(r2.widths)}, ${r2.ms} ms`);
  const r3 = await tap('shared-large-pdf', files.pdf, async () => { const s = await page.evaluate(() => { const v = document.querySelector('[data-testid="mobile-file-viewer"]'); const c = [...(v?.querySelectorAll('canvas') ?? [])]; return { canvases: c.length, drawn: c.some(x => x.width > 0 && x.height > 0), error: v?.querySelector('[role="alert"]')?.textContent ?? null }; }); return { done: s.drawn || !!s.error, ...s }; }, 120000);
  expect(r3.drawn && !r3.error && r3.backToConversation, `tap ${files.pdf} (18 MB): ${JSON.stringify({ canvases: r3.canvases, drawn: r3.drawn, error: r3.error })}, ${r3.ms} ms`);
  const r4 = await tap('unmounted-host-path', files.unmounted, async () => { const t = await errorText(); return { done: !!t, text: t }; });
  expect(r4.text === 'This file was not found on the computer.', `tap ${files.unmounted} (on the host, not mounted into the container): ${JSON.stringify(r4.text)}`);
  const r5 = await tap('folder', files.folder, async () => { const t = await errorText(); return { done: !!t, text: t }; });
  expect(r5.text === 'This path is a folder, not a file.', `tap ${files.folder}: ${JSON.stringify(r5.text)}`);
  const unexpected = errors.filter(e => !/status of (404|400) \((Not Found|Bad Request)\)|favicon|401 \(Unauthorized\)|localhost:8000/.test(e));
  log(`phone console errors ${errors.length}, not explained by the refusals above: ${unexpected.length} ${JSON.stringify(unexpected.slice(0, 4))}`);
  const dl = docker('logs', NAME); fs.writeFileSync(path.join(out, 'API-02b-container.log'), dl.split(owner).join('own_…'));
  expect(!dl.includes('/home/autobyteus/shared/ac005') && !dl.includes('/tmp/abtest436/sample'), 'the container log names none of the opened paths (QR-001)');
} catch (e) { ok = false; log('ERROR', e.stack); }
finally { if (browser) await browser.close(); try { docker('rm', '-f', '-v', NAME); log(`container ${NAME} removed`); } catch {} log(`result ${ok ? 'Pass' : 'Fail'}`); fs.writeFileSync(path.join(out, 'API-02b-conversation.log'), lines.join('\n').split(owner).join('own_…') + '\n'); process.exitCode = ok ? 0 : 1; }
