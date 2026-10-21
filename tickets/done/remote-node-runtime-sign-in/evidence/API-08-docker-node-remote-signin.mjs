#!/usr/bin/env node
// API-08 (API/E2E, ticket remote-node-runtime-sign-in): Settings -> Agent Runtimes in a window bound to a real Docker
// node running this worktree's server, through the real vendor CLIs and the node's own Chromium.
// Stack: a test-owned container of autobyteus/autobyteus-server:beta (shipped security options, 127.0.0.1 ports, fresh
// anonymous volumes so every runtime starts signed out) with this worktree's server dist mounted read-only after
// checking that only the changed files differ (TESTING.md "Docker server nodes"); this worktree's Nuxt dev server;
// headless Chrome. Never touches the user's node containers.
// Cases:
//   D1 page in a remote window: VNC note, Sign in for Codex and Grok, hints "on that node", no Update (AC-003, AC-004)
//   D2 Codex Sign in from the page -> vendor page in the node's Chromium, shown on the node's VNC display, the CLI's
//      loopback callback listening on the node; Cancel (AC-001 up to the vendor page, SCN-A1, SCN-A2)
//   D3 the same for Grok (AC-002)
//   D4 privacy: the live sign-in URLs' parameter values and the vendor sign-in hosts appear nowhere in the page, its
//      storage, its GraphQL responses, the node's server output or AutoByteus data; positive control in the node's
//      Chromium profile (AC-009, QR-001)
// Secret handling: sign-in URLs are read inside this process only; files get hosts, parameter names and counts.
// Usage: node API-08-docker-node-remote-signin.mjs <worktree> <output-dir>
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';

const [worktree, outputDir] = process.argv.slice(2);
const webDir = path.join(worktree, 'autobyteus-web');
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core');
const IMAGE = 'autobyteus/autobyteus-server:beta';
const NAME = 'api08-signin-node';
const CODEX = 'codex_app_server';
const CLAUDE = 'claude_agent_sdk';
const AGY = 'antigravity_cli';
const GROK = 'grok_build';
const result = { startedAt: new Date().toISOString(), image: null, cases: {}, browserErrors: [], cleanup: {} };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const waitFor = async (what, fn, ms = 60000) => {
  const deadline = Date.now() + ms;
  let last;
  while (Date.now() < deadline) { try { if (await fn()) return; } catch (error) { last = error; } await sleep(300); }
  throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`);
};
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const docker = (args, input) => execFileSync('docker', args, { encoding: 'utf8', input, maxBuffer: 64 * 1024 * 1024 });
const inNode = (script, input) => docker(['exec', '-i', NAME, 'bash', '-lc', script], input);
/** Full tab URLs of the node's Chromium (kept in memory only). */
const nodeTabUrls = () => JSON.parse(inNode('curl -s http://127.0.0.1:9222/json')).filter((tab) => tab.type === 'page').map((tab) => tab.url);
const redact = (url) => url.replace(/\?.*$/, '?<query redacted>');

let frontend, browser, page;
const graphqlResponses = [];
const markers = new Set();
try {
  await fs.mkdir(outputDir, { recursive: true });
  result.image = docker(['image', 'inspect', IMAGE, '--format', '{{.Id}}']).trim();

  // TESTING.md: the image's dist may differ from the worktree's only in the files this change touched.
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'api08-dist-'));
  const probe = docker(['create', IMAGE]).trim();
  try { docker(['cp', `${probe}:/app/autobyteus-server-ts/dist`, scratch]); } finally { docker(['rm', '-f', probe]); }
  let diff = '';
  try { execFileSync('diff', ['-rq', '--exclude=*.map', '--exclude=*.d.ts', path.join(scratch, 'dist'), path.join(worktree, 'autobyteus-server-ts/dist')], { encoding: 'utf8' }); } catch (error) { diff = error.stdout; }
  await fs.rm(scratch, { recursive: true, force: true });
  const differing = diff.split('\n').filter(Boolean).map((line) => line.replace(scratch, '<image>').replace(worktree, '<worktree>'));
  result.distDiff = differing;
  assert(differing.length === 3 && ['api/graphql/types/agent-runtimes.js', 'agent-runtimes/agent-runtime-status-service.js', 'sign-in-browser-availability.js']
    .every((file) => differing.some((line) => line.includes(file))), `unexpected dist differences: ${differing.join(' | ')}`);

  const [apiPort, vncPort] = [await freePort(), await freePort()];
  const backend = `http://127.0.0.1:${apiPort}`;
  docker(['run', '-d', '--name', NAME, '--security-opt', 'seccomp=unconfined', '--cap-add', 'SYS_ADMIN',
    '-p', `127.0.0.1:${apiPort}:8000`, '-p', `127.0.0.1:${vncPort}:6080`,
    '-v', `${worktree}/autobyteus-server-ts/dist:/app/autobyteus-server-ts/dist:ro`,
    '-e', `AUTOBYTEUS_SERVER_HOST=http://localhost:${apiPort}`, '-e', `AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:${vncPort}`, IMAGE]);
  const gql = async (query) => (await (await fetch(`${backend}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) })).json());
  await waitFor('node GraphQL', async () => (await gql('{ __typename }')).data, 120000);
  result.nodeFact = (await gql('{ agentRuntimeSignInBrowserAvailable }')).data;
  assert(result.nodeFact?.agentRuntimeSignInBrowserAvailable === true, `node fact ${JSON.stringify(result.nodeFact)}`);

  const port = await freePort();
  const frontendUrl = `http://127.0.0.1:${port}`;
  const log = await fs.open(path.join(outputDir, 'frontend.log'), 'w');
  frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir, detached: true, stdio: ['ignore', log.fd, log.fd],
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('AUTOBYTEUS_'))), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backend },
  });
  await waitFor('frontend', async () => (await fetch(frontendUrl)).ok, 240000);

  browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--disable-dev-shm-usage'] });
  result.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await context.addInitScript(() => { localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage();
  page.on('pageerror', (error) => result.browserErrors.push(error.message));
  page.on('response', async (response) => { if (response.url().includes('/graphql')) graphqlResponses.push(await response.text().catch(() => '')); });
  const byId = (id) => page.locator(`[data-testid="${id}"]`);
  const has = async (id) => (await byId(id).count()) > 0;
  const text = async (id) => (await byId(id).first().innerText()).replace(/\s+/g, ' ').trim();
  const shot = (name) => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
  const open = async () => {
    await page.goto(`${frontendUrl}/settings?section=agent-runtimes`, { waitUntil: 'domcontentloaded' });
    await byId('agent-runtimes-card').waitFor({ timeout: 120000 });
  };
  const kase = async (id, title, body) => {
    try { await body(); result.cases[id] = { title, result: 'Pass', ...(result.cases[id] ?? {}) }; }
    catch (error) { result.cases[id] = { title, result: 'Fail', error: error.message, ...(result.cases[id] ?? {}) }; await shot(`${id}-failure`).catch(() => {}); }
    console.log(`${result.cases[id].result} ${id} ${title}${result.cases[id].error ? `: ${result.cases[id].error}` : ''}`);
  };
  const vncShot = async (name) => {
    inNode(`runuser -u vncuser -- env DISPLAY=:99 XAUTHORITY=/home/vncuser/.Xauthority scrot -o /tmp/${name}.png`);
    docker(['cp', `${NAME}:/tmp/${name}.png`, path.join(outputDir, `${name}.png`)]);
  };
  /** Reads the vendor tab the login opened; adds its parameter values to the scan markers; checks the CLI's callback. */
  const vendorTab = async (host, cliPattern) => {
    let url;
    await waitFor(`${host} tab in the node's Chromium`, async () => (url = nodeTabUrls().find((tab) => new URL(tab).host === host)), 60000);
    const parsed = new URL(url);
    markers.add(url);
    const names = [];
    for (const [name, value] of parsed.searchParams) {
      names.push(name);
      if (value.length >= 12 && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(value)) markers.add(value);
    }
    // The CLI's own callback server on the node's loopback, which the node's Chromium reaches after the vendor page.
    const listening = inNode(`ss -ltnpH | grep -E '${cliPattern}' || true`).trim();
    const ports = [...new Set([...listening.matchAll(/127\.0\.0\.1:(\d+)|\[::1\]:(\d+)|0\.0\.0\.0:(\d+)|\*:(\d+)/g)].map((m) => m.slice(1).find(Boolean)))];
    const callbackAnswers = Object.fromEntries(ports.map((p) => [p, inNode(`curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${p}/ || true`).trim()]));
    return { tab: redact(url), host, parameterNames: names, redirectUri: parsed.searchParams.get('redirect_uri'), cliListening: listening.split('\n').filter(Boolean).map((line) => line.replace(/\s+/g, ' ')), callbackAnswers };
  };

  await open();
  await sleep(4000); // cold Nuxt dev server warm-up (TESTING.md)
  await open();
  await page.evaluate((url) => {
    const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
    pinia._s.get('windowNodeContext').bindNodeContext('docker-node', url);
  }, backend);
  await waitFor('remote note', async () => has('agent-runtimes-remote-note'));
  await waitFor('accounts read on the node', async () => (await text(`runtime-${CODEX}-signin`)) === 'Not signed in' && (await text(`runtime-${GROK}-signin`)) === 'Not signed in', 120000);

  await kase('D1', 'Remote window on the Docker node: VNC note, Sign in for Codex and Grok, hints on that node, no Update (AC-003, AC-004)', async () => {
    assert(/·\s*Remote node$/.test(await text('agent-runtimes-node')), `node line ${await text('agent-runtimes-node')}`);
    assert(await text('agent-runtimes-remote-note') === "Sign-in opens the browser on that node; finish it in the VNC Viewer. Update these runtimes on that node's computer.", 'note');
    for (const kind of [CODEX, GROK]) assert(await text(`runtime-${kind}-signin-button`) === 'Sign in', `${kind} Sign in`);
    for (const kind of [CLAUDE, AGY]) {
      assert(await text(`runtime-${kind}-signin-hint`) === 'Sign in from its command line on that node.', `${kind} hint`);
      assert(!(await has(`runtime-${kind}-signin-button`)), `${kind} has no button`);
    }
    const actions = await page.locator('[data-testid$="-actions"] button').evaluateAll((buttons) => buttons.map((b) => b.getAttribute('data-testid')));
    assert(JSON.stringify(actions) === JSON.stringify([`runtime-${CODEX}-signin-button`, `runtime-${GROK}-signin-button`]), `actions ${JSON.stringify(actions)}`);
    assert((await page.locator('[data-testid$="-update"], [data-testid$="-blocked"]').count()) === 0, 'no Update or blocked line');
    await shot('API-08-D1-remote-docker-node');
  });

  const signIn = async (id, kind, name, host, cliPattern, loginPattern) => kase(id, `${name} Sign in from the page: vendor page in the node's Chromium and on its VNC display, CLI callback listening on the node; Cancel (${kind === CODEX ? 'AC-001' : 'AC-002'} up to the vendor page)`, async () => {
    await byId(`runtime-${kind}-signin-button`).click();
    await waitFor('signing in', async () => (await text(`runtime-${kind}-signin-button`)) === 'Signing in…', 30000);
    assert(await text(`runtime-${kind}-signin-waiting`) === `Finish signing in to ${name} in the browser on that node (VNC Viewer).`, 'waiting copy');
    const tab = await vendorTab(host, cliPattern);
    result.cases[id] = { ...tab };
    assert(tab.cliListening.length > 0, `no listening socket of the ${name} CLI on the node`);
    await sleep(3000); // let the vendor page render on the node's display
    await shot(`API-08-${id}-page-signing-in`);
    await vncShot(`API-08-${id}-node-vnc-display`);
    // During the sign-in: nothing of the URL in the page or its responses so far.
    result.cases[id].duringScan = scanPage(`${await page.content()}\n${graphqlResponses.join('\n')}`, 'page or responses');
    await byId(`runtime-${kind}-signin-cancel`).click();
    await waitFor('back to Sign in', async () => !(await has(`runtime-${kind}-signin-outcome`)) && (await text(`runtime-${kind}-signin-button`)) === 'Sign in', 30000);
    await waitFor('login process ended on the node', async () => !inNode(`pgrep -af '${loginPattern}' || true`).trim(), 20000);
    assert((await text(`runtime-${kind}-signin`)) === 'Not signed in', 'still signed out after Cancel');
  });
  const VENDOR_HOSTS = ['auth.openai.com', 'accounts.x.ai', 'oauth/authorize'];
  const scanPage = (content, where) => [...markers, ...VENDOR_HOSTS].filter((marker) => content.includes(marker)).map(() => where);

  await signIn('D2', CODEX, 'Codex', 'auth.openai.com', 'codex', '[c]odex login');
  await signIn('D3', GROK, 'Grok', 'accounts.x.ai', 'grok', '[g]rok login');

  await kase('D4', 'No sign-in URL, parameter value or vendor sign-in host in the page, its storage, its GraphQL responses, the node server output or AutoByteus data; found in the node Chromium profile (control) (AC-009)', async () => {
    assert(markers.size >= 4, `markers ${markers.size}`);
    const all = [...markers, ...VENDOR_HOSTS];
    const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    const corpora = { page: await page.content(), webStorage: storage, graphqlResponses: graphqlResponses.join('\n'),
      nodeServerOutput: execFileSync('bash', ['-c', `docker logs ${NAME} 2>&1`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) };
    const hits = Object.entries(corpora).flatMap(([where, content]) => all.filter((m) => content.includes(m)).map(() => where));
    // AutoByteus data on the node (database, logs, memory, ...): grep with the markers on stdin, file names only.
    const dataHits = inNode('grep -rlaF -f /dev/stdin /home/autobyteus/data /app/autobyteus-server-ts/logs 2>/dev/null || true', `${all.join('\n')}\n`).trim().split('\n').filter(Boolean);
    const dataFiles = Number(inNode('find /home/autobyteus/data -type f | wc -l').trim());
    // Control: the same markers are found where they are expected, in the node Chromium's own profile.
    const control = inNode('grep -rlaF -f /dev/stdin /home/vncuser/.config 2>/dev/null | head -3 || true', `${[...markers].join('\n')}\n`).trim().split('\n').filter(Boolean);
    result.cases.D4 = { markers: markers.size, vendorHosts: VENDOR_HOSTS, graphqlResponses: graphqlResponses.length, nodeOutputBytes: corpora.nodeServerOutput.length, dataFiles, hits, dataHits, controlHits: control.length,
      duringSignIn: { D2: result.cases.D2?.duringScan, D3: result.cases.D3?.duringScan } };
    assert(graphqlResponses.length > 10, 'responses captured');
    assert(dataFiles > 0, 'data files found');
    assert(control.length > 0, 'control: markers not found in the node Chromium profile, so the scan could not have found them');
    assert(hits.length === 0 && dataHits.length === 0, `found: ${[...hits, ...dataHits].join('; ')}`);
    assert(!(result.cases.D2?.duringScan?.length) && !(result.cases.D3?.duringScan?.length), 'found in the page during sign-in');
  });
} catch (error) {
  result.error = error.stack || error.message;
  console.error(error);
} finally {
  result.browserErrorsCount = result.browserErrors.length;
  result.cleanup.browser = browser ? await browser.close().then(() => 'closed', (e) => e.message) : 'not-started';
  if (frontend) { try { process.kill(-frontend.pid, 'SIGTERM'); result.cleanup.frontend = `terminated:${frontend.pid}`; } catch (e) { result.cleanup.frontend = e.message; } }
  try { docker(['rm', '-f', '-v', NAME]); result.cleanup.container = 'removed'; } catch (e) { result.cleanup.container = e.message; }
  result.result = !result.error && Object.values(result.cases).every((c) => c.result === 'Pass') && result.browserErrors.length === 0 ? 'Pass' : 'Fail';
  result.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(`Result: ${result.result}`);
  process.exitCode = result.result === 'Pass' ? 0 : 1;
}
