#!/usr/bin/env node
// autobyteus-669 (agent-avatars-669) probe: a definition's package picture on every surface, desktop and phone.
// Test-owned data only (never a user's data or a copy of it); synthetic pictures only (plain coloured squares with one
// letter, drawn here), never a realistic person.
//
// Stack (owned, removed at the end): this worktree's `autobyteus-server-ts/dist/app.js` on 127.0.0.1 with its own data
// root and HOME, the probe's owner credential (fixtures/probe-node-access.mjs) and the scripted AGY CLI (no inference);
// `nuxt dev` against it for the desktop; the production phone bundle the node serves at /mobile
// (`pnpm build:mobile-web` first), reached as http://192.168.77.69:<port> in a Chrome that maps that address to
// 127.0.0.1, paired through Phone Access.
//
// Cases:
//   A-001 AC-001, AC-002  Two local packages (one shaped as a Git clone) with `avatar.png` in an agent's, a team's (and its
//                  team-local agent's) and an org's folder, and an agent whose `avatar.png` is not a picture. Imported: each
//                  `avatarUrl` is `/rest/definition-avatars/<kind>/<id>?v=<12 hex>`, `userAvatarUrl` null; the route sends
//                  the file's bytes as image/png. The broken agent has no picture and the node logs why once.
//   A-002 AC-001  The agent's picture replaced in its folder: the watcher reloads it, the version changes, the route
//                  sends the new bytes. The team's replaced and the package reloaded ("update"): the same.
//   A-003 AC-003  The user's own picture (an upload) wins; saving the package's address as the user's clears it instead
//                  (the package's shows again); a null save clears too.
//   D-001 AC-004, AC-006  Desktop (`nuxt dev`, 1440×900): the Agents, Teams and Orgs catalogs, a team's detail, the
//                  Workspaces tree with a hub's twenty delegated copies of the team, a conversation, the Runs view, the
//                  agent editor ("From the package", no Remove). Every copy shows the team's one picture; the broken agent
//                  its initials.
//   P-001 AC-004, AC-005  Phone (390×844): the run list with the hub's twenty copies (one team definition) and six runs
//                  of the agent: one fetch per picture address however many rows show it, with the credential in the
//                  Authorization header and nowhere in the address.
//   D-002 AC-003, AC-006  The desktop agent editor (autobyteus-669 API/E2E): upload a picture and save (the user's, shown);
//                  reopen and save another field only (the user's picture stays: input `avatarUrl` null now clears);
//                  Remove and save (the package's picture again, captioned, no Remove).
//   D-003 AC-003, AC-006  The same in the desktop team editor (Crew), from the package's captioned preview first.
//   P-002 C-3 (held)  The phone: the first fetch of one picture fails; its rows show the fallback; recorded whether they
//                  recover without a reload (the design remembers a failure for the session); after a reload, the picture.
//   P-003 C-3 (held)  The phone: the first read of the agents' pictures (GetAgentDefinitionAvatars) fails; the rows show
//                  the fallback; recorded whether they recover by themselves or after a definition change; after a reload, the picture.
//   Optional --installed-app <AutoByteus.app>: E-001 AC-004  the installed `file://` window on a copy of this data root
//                  (`pnpm isolated-app start --app … --data-root …`): pictures load from the node, not `file:///rest/…`.
//
// Run: node autobyteus-web/tests/e2e/definition-avatars-probe.mjs --output-dir <fresh dir> [--installed-app <app>] [--keep]
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { attachToBrowserContext, attachToProbeProcess, ownerHeaders, ownerSocketUrl, redactCredentials, withNodeCredential } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';

attachToProbeProcess();
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const WebSocket = require('ws');

const webDir = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const repoDir = path.dirname(webDir);
const serverDir = path.join(repoDir, 'autobyteus-server-ts');
const appEntry = path.join(serverDir, 'dist', 'app.js');
const agyCli = path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs');
const arg = (name, fallback) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const outputDir = path.resolve(arg('output-dir', path.join(webDir, 'test-results', 'definition-avatars')));
const installedApp = typeof arg('installed-app') === 'string' ? path.resolve(arg('installed-app')) : null;
const keep = arg('keep', false) === true;
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
const PHONE_HOST = '192.168.77.69';
const MODEL = 'gemini-3.8-flash-low';
// Twenty delegated copies of one team: twenty rows of one definition (the run history lists 6 runs per agent, so an
// agent's own runs cannot make twenty rows).
const COPIES = Number(arg('copies', '20'));
const WRITER_RUNS = 6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (what, predicate, timeout = 60_000) => {
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(250); }
  throw new Error(`Timed out: ${what}${last ? ` (${last.message})` : ''}`);
};
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const gitHead = () => { try { return execFileSync('git', ['-C', repoDir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; } };

// ---------------------------------------------------------------- synthetic pictures
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
/** 5×7 block letters, enough for the probe's initials. */
const GLYPHS = {
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'], M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'], R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'], U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
};
/** A plain square of one colour with one white letter: a synthetic picture, nothing like a person. */
const syntheticPng = (letter, [r, g, b], size = 96) => {
  const glyph = GLYPHS[letter]; const cell = Math.floor(size / 10); const ox = Math.floor((size - 5 * cell) / 2); const oy = Math.floor((size - 7 * cell) / 2);
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - ox) / cell), gy = Math.floor((y - oy) / cell);
      const on = gx >= 0 && gx < 5 && gy >= 0 && gy < 7 && x >= ox && y >= oy && glyph[gy][gx] === '1';
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = on ? 255 : r; raw[o + 1] = on ? 255 : g; raw[o + 2] = on ? 255 : b;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const COLOURS = { blue: [37, 99, 235], green: [22, 163, 74], orange: [234, 88, 12], purple: [124, 58, 237], red: [220, 38, 38], teal: [13, 148, 136], navy: [30, 58, 138], gold: [202, 138, 4], pink: [219, 39, 119] };

// ---------------------------------------------------------------- evidence
const evidence = { probe: 'definition-avatars', head: gitHead(), startedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`, node: process.version, cases: {}, cleanup: {}, browserErrors: [] };
const save = () => fsp.writeFile(path.join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
let root = '';
/** The page a case is on: its screen is kept when the case fails. */
let casePage = null;
const sanitize = (value) => JSON.parse(redactCredentials(JSON.stringify(value)).split(root).join('<probe-root>').split(repoDir).join('<worktree>').split(os.homedir()).join('~'));
const runCase = async (id, description, fn) => {
  const startedAt = Date.now();
  console.log(`[${new Date().toISOString()}] ${id} start: ${description}`);
  try {
    const details = await fn();
    evidence.cases[id] = { result: 'Pass', description, ms: Date.now() - startedAt, details: sanitize(details ?? null) };
    console.log(`[${new Date().toISOString()}] ${id} Pass`);
  } catch (e) {
    if (casePage) await casePage.screenshot({ path: path.join(outputDir, `${id}-at-failure.png`) }).catch(() => undefined);
    evidence.cases[id] = { result: 'Fail', description, ms: Date.now() - startedAt, message: sanitize(e.message), details: sanitize(e.details ?? null) };
    console.log(`[${new Date().toISOString()}] ${id} Fail: ${e.message}`);
  }
  casePage = null;
  await save();
};

// ---------------------------------------------------------------- stack
const stack = { backend: null, frontend: null, port: 0, baseUrl: '', frontendPort: 0, frontendUrl: '', dataRoot: '', dataDir: '', home: '' };
const spawnLogged = (cmd, args, cwd, env, name) => {
  const log = fs.createWriteStream(path.join(outputDir, `${name}.log`), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = '';
  child.stdout.on('data', (d) => { child.output += d; log.write(d); });
  child.stderr.on('data', (d) => { child.output += d; log.write(d); });
  child.once('close', () => log.end());
  return child;
};
const stopGroup = async (child) => {
  if (exited(child)) return 'not-running';
  try { process.kill(-child.pid, 'SIGTERM'); } catch { return 'gone'; }
  await waitFor('owned process exit', () => exited(child), 20_000).catch(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } });
  return 'terminated';
};
const startBackend = async () => {
  const env = withNodeCredential({ PATH: process.env.PATH, HOME: stack.home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'production',
    DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataDir, 'db', 'production.db')}`, AUTOBYTEUS_SERVER_HOST: stack.baseUrl,
    AUTOBYTEUS_ALLOWED_ORIGINS: stack.frontendUrl, ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: 'linked_skills' });
  const fileEnv = ['APP_ENV', 'DB_TYPE', 'DATABASE_URL', 'AUTOBYTEUS_SERVER_HOST', 'AUTOBYTEUS_ALLOWED_ORIGINS'].map((k) => `${k}=${env[k]}`).join('\n');
  await fsp.writeFile(path.join(stack.dataDir, '.env'), `${fileEnv}\n`, { mode: 0o600 });
  stack.backend = spawnLogged(process.execPath, [appEntry, '--host', '127.0.0.1', '--port', String(stack.port), '--data-dir', stack.dataDir], serverDir, env, 'backend');
  await waitFor('backend health', async () => { if (exited(stack.backend)) throw new Error('backend exited'); return (await fetch(`${stack.baseUrl}/rest/health`)).ok; }, 300_000);
};
const startFrontend = async () => {
  const ws = stack.baseUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(stack.frontendPort)], webDir,
    { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1',
      BACKEND_NODE_BASE_URL: stack.baseUrl, BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`,
      BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`, BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await waitFor('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 300_000);
  await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 300_000 });
};
const gql = async (query, variables = {}) => {
  const body = await (await fetch(`${stack.baseUrl}/graphql`, { method: 'POST', headers: ownerHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ query, variables }) })).json();
  assert(!body.errors?.length, `GraphQL failed: ${JSON.stringify(body.errors)?.slice(0, 400)}`, body.errors);
  return body.data;
};
const rest = async (method, route, body) => {
  const response = await fetch(`${stack.baseUrl}/rest${route}`, { method, headers: ownerHeaders(body ? { 'content-type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
  const text = await response.text(); let parsed = text; try { parsed = JSON.parse(text); } catch { /* text */ }
  return { status: response.status, body: parsed };
};

// ---------------------------------------------------------------- packages
const writeFile = async (file, content) => { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, content); };
const agentFiles = async (dir, name, toolNames = []) => {
  await writeFile(path.join(dir, 'agent.md'), `---\nname: ${name}\ndescription: ${name} (probe)\n---\n\nFollow the request.\n`);
  await writeFile(path.join(dir, 'agent-config.json'), `${JSON.stringify({ toolNames }, null, 2)}\n`);
};
const PICTURES = {};
const picture = async (file, letter, colour) => { const bytes = syntheticPng(letter, COLOURS[colour]); await writeFile(file, bytes); PICTURES[file] = bytes; return bytes; };
const writePackages = async () => {
  const studio = path.join(root, 'packages', 'avatar-studio-pack');
  await agentFiles(path.join(studio, 'agents', 'writer'), 'Story Writer');
  await picture(path.join(studio, 'agents', 'writer', 'avatar.png'), 'W', 'blue');
  await agentFiles(path.join(studio, 'agents', 'hub'), 'Hub Manager', ['list_projects', 'list_project_tasks', 'create_task', 'update_task']);
  await picture(path.join(studio, 'agents', 'hub', 'avatar.png'), 'M', 'green');
  await agentFiles(path.join(studio, 'agents', 'broken'), 'Broken Picture');
  await writeFile(path.join(studio, 'agents', 'broken', 'avatar.png'), 'this is not a picture');
  const crew = path.join(studio, 'agent-teams', 'crew');
  await writeFile(path.join(crew, 'team.md'), '---\nname: Crew\ndescription: Crew team (probe)\n---\n\nDo the assigned task.\n');
  await writeFile(path.join(crew, 'team-config.json'), `${JSON.stringify({ coordinatorMemberName: 'lead', members: [{ memberName: 'lead', ref: 'lead', refScope: 'team_local' }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2)}\n`);
  await picture(path.join(crew, 'avatar.png'), 'C', 'orange');
  await agentFiles(path.join(crew, 'agents', 'lead'), 'Crew Lead');
  await picture(path.join(crew, 'agents', 'lead', 'avatar.png'), 'L', 'purple');
  const org = path.join(studio, 'agent-orgs', 'studio');
  await writeFile(path.join(org, 'org.md'), '---\nname: Story Studio\ndescription: Story Studio org (probe)\n---\n\nRun the studio.\n');
  await writeFile(path.join(org, 'org-config.json'), `${JSON.stringify({ members: [{ memberName: 'writer', ref: 'writer', refType: 'agent', refScope: 'shared' }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2)}\n`);
  await picture(path.join(org, 'avatar.png'), 'S', 'red');
  // A package shaped as a Git clone: its own `.git` folder and README beside the definitions.
  const clone = path.join(root, 'packages', 'avatar-clone-pack');
  await writeFile(path.join(clone, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  await writeFile(path.join(clone, 'README.md'), '# Avatar clone pack (probe)\n');
  await agentFiles(path.join(clone, 'agents', 'reviewer'), 'Clone Reviewer');
  await picture(path.join(clone, 'agents', 'reviewer', 'avatar.png'), 'R', 'teal');
  return { studio, clone };
};
const DEFINITIONS = `{
  agentDefinitions { id name avatarUrl userAvatarUrl }
  agentTeamDefinitions { id name avatarUrl userAvatarUrl }
  agentOrgDefinitions { id name avatarUrl userAvatarUrl }
}`;
const definitions = async () => gql(`query ${DEFINITIONS}`);
const byName = (list, name) => list.find((d) => d.name === name);
const ADDRESS = /^\/rest\/definition-avatars\/(agent|agent_team|agent_org)\/[^?]+\?v=[0-9a-f]{12}$/;
const fetchPicture = async (address) => {
  const response = await fetch(`${stack.baseUrl}${address}`, { headers: ownerHeaders() });
  return { status: response.status, type: response.headers.get('content-type'), bytes: Buffer.from(await response.arrayBuffer()) };
};

// ---------------------------------------------------------------- runs
const config = (workspaceRootPath) => ({ workspaceRootPath, llmModelIdentifier: MODEL, runtimeKind: 'antigravity_cli', autoExecuteTools: true, llmConfig: null });
const sockets = [];
const inputFor = async (runId) => {
  const socket = new WebSocket(ownerSocketUrl(`${stack.baseUrl.replace(/^http/, 'ws')}/ws/agent/${runId}`)); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return (content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: runId, message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
};
const createRun = async (agentDefinitionId, workspace) => {
  const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId, ...config(workspace) } })).createAgentRun;
  assert(r.success, r.message); return r.runId;
};
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const tasksFor = async (projectId) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId root {teamRunId start}}}', { id: projectId })).projectTasks;

// ---------------------------------------------------------------- browser helpers
let browser;
const requestLog = [];
const watchPage = (page, label) => {
  page.on('console', (m) => { if (m.type() === 'error') evidence.browserErrors.push({ page: label, line: sanitize(m.text()).slice(0, 300) }); });
  page.on('pageerror', (e) => evidence.browserErrors.push({ page: label, line: sanitize(`pageerror ${e.message}`).slice(0, 300) }));
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/rest/definition-avatars/')) requestLog.push({ page: label, url, headers: request.headers(), at: Date.now() });
  });
};
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) });
/** Every definition avatar the page shows: its kind, state, picture address (resolved) and whether the picture drew. */
const avatarsOn = (page) => page.evaluate(() => [...document.querySelectorAll('[data-test="definition-avatar"]')]
  .filter((node) => node.getBoundingClientRect().width > 0)
  .map((node) => { const img = node.querySelector('img'); return { kind: node.getAttribute('data-avatar-kind'), state: node.getAttribute('data-avatar-state'),
    src: img?.getAttribute('src') ?? null, drawn: Boolean(img && img.complete && img.naturalWidth > 0), text: node.textContent.trim(),
    box: (({ width, height }) => ({ width: Math.round(width), height: Math.round(height) }))(node.getBoundingClientRect()) }; }));
const nuxtReady = (page) => page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$router), null, { timeout: 120_000 });
/** Calls a Pinia store's action in the page. */
const inStore = (page, storeId, action, ...args) => page.evaluate(([id, name, values]) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get(id)[name](...values), [storeId, action, args]);
/** Unfolds the Workspaces tree's workspace and the agent groups named, and returns their run rows. */
const unfoldTree = async (page, definitionIds) => {
  const workspaceRow = page.locator('[data-test="workspace-row"]').first();
  await workspaceRow.waitFor({ timeout: 60_000 });
  if ((await workspaceRow.getAttribute('aria-expanded')) !== 'true') await workspaceRow.click();
  for (const id of definitionIds) {
    const group = page.locator(`[data-test="workspace-agent-row"][data-agent-definition-id="${id}"]`).first();
    await group.waitFor({ timeout: 60_000 });
    if ((await group.getAttribute('aria-expanded')) !== 'true') await group.click();
  }
};

// ---------------------------------------------------------------- main
const main = async () => {
  await fsp.mkdir(outputDir, { recursive: true });
  root = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), 'definition-avatars-probe-')));
  stack.dataRoot = path.join(root, 'desktop'); stack.dataDir = path.join(stack.dataRoot, 'server-data'); stack.home = path.join(root, 'home');
  for (const dir of [stack.dataDir, stack.home]) await fsp.mkdir(dir, { recursive: true });
  stack.port = await freePort(); stack.baseUrl = `http://127.0.0.1:${stack.port}`;
  stack.frontendPort = await freePort(); stack.frontendUrl = `http://127.0.0.1:${stack.frontendPort}`;
  assert(fs.existsSync(appEntry), 'Build the server first (autobyteus-server-ts dist/app.js)');
  assert(fs.existsSync(path.join(webDir, 'dist', 'public', 'index.html')), 'Build the phone bundle first (pnpm -C autobyteus-web build:mobile-web)');
  const { studio, clone } = await writePackages();
  await startBackend();
  const frontendStarting = startFrontend();
  const ids = {};

  await runCase('A-001', 'Imported packages: each definition\'s avatarUrl is its package picture; the route sends its bytes; a broken picture is ignored and logged', async () => {
    for (const source of [studio, clone]) {
      await gql('mutation($input:ImportAgentPackageInput!){importAgentPackage(input:$input){packageId}}', { input: { source, sourceKind: 'LOCAL_PATH' } });
    }
    const all = await waitFor('the packages\' definitions', async () => {
      const d = await definitions();
      return byName(d.agentDefinitions, 'Story Writer') && byName(d.agentDefinitions, 'Clone Reviewer') && byName(d.agentTeamDefinitions, 'Crew') && byName(d.agentOrgDefinitions, 'Story Studio') ? d : null;
    }, 60_000);
    const checked = [];
    for (const [list, name, file] of [
      ['agentDefinitions', 'Story Writer', path.join(studio, 'agents', 'writer', 'avatar.png')], ['agentDefinitions', 'Hub Manager', path.join(studio, 'agents', 'hub', 'avatar.png')],
      ['agentDefinitions', 'Crew Lead', path.join(studio, 'agent-teams', 'crew', 'agents', 'lead', 'avatar.png')],
      ['agentDefinitions', 'Clone Reviewer', path.join(clone, 'agents', 'reviewer', 'avatar.png')],
      ['agentTeamDefinitions', 'Crew', path.join(studio, 'agent-teams', 'crew', 'avatar.png')], ['agentOrgDefinitions', 'Story Studio', path.join(studio, 'agent-orgs', 'studio', 'avatar.png')],
    ]) {
      const definition = byName(all[list], name);
      assert(definition, `${name} listed`);
      assert(ADDRESS.test(definition.avatarUrl ?? ''), `${name}: avatarUrl is its package-picture address`, definition);
      assert(definition.userAvatarUrl === null, `${name}: no user picture`, definition);
      const sent = await fetchPicture(definition.avatarUrl);
      assert(sent.status === 200 && sent.type === 'image/png' && sent.bytes.equals(PICTURES[file]), `${name}: the route sends the file`, { status: sent.status, type: sent.type, bytes: sent.bytes.length });
      ids[name] = definition.id;
      checked.push({ name, id: definition.id, avatarUrl: definition.avatarUrl, status: sent.status, type: sent.type, bytes: sent.bytes.length });
    }
    const broken = byName(all.agentDefinitions, 'Broken Picture');
    assert(broken && broken.avatarUrl === null && broken.userAvatarUrl === null, 'the broken picture is ignored: the agent loads with none', broken);
    ids['Broken Picture'] = broken.id;
    const logged = stack.backend.output.split('\n').filter((line) => line.includes('DEFINITION_AVATAR_IGNORED'));
    assert(logged.length === 1 && logged[0].includes('is not a PNG picture'), 'the reason is logged once', logged);
    // A request without a credential (401) and a peer's (403): tests/unit/api/rest/definition-avatars.test.ts; this
    // process attaches the owner credential to every loopback request.
    return { checked, broken: { name: broken.name, avatarUrl: broken.avatarUrl }, log: logged.map((l) => l.trim().slice(0, 240)) };
  });

  await runCase('A-002', 'A replaced picture: the watcher (agent) and a package reload (team) give a new version and the new bytes', async () => {
    const before = await definitions();
    const writerBefore = byName(before.agentDefinitions, 'Story Writer').avatarUrl;
    const file = path.join(studio, 'agents', 'writer', 'avatar.png');
    await picture(file, 'N', 'navy');
    const writerAfter = await waitFor('the watcher reloads the agent with a new version', async () => {
      const url = byName((await definitions()).agentDefinitions, 'Story Writer').avatarUrl; return url !== writerBefore ? url : null;
    }, 30_000);
    const sentWriter = await fetchPicture(writerAfter);
    assert(ADDRESS.test(writerAfter) && sentWriter.bytes.equals(PICTURES[file]), 'the new bytes at the new version', { writerAfter });
    const old = await fetchPicture(writerBefore);
    const teamBefore = byName(before.agentTeamDefinitions, 'Crew').avatarUrl;
    const teamFile = path.join(studio, 'agent-teams', 'crew', 'avatar.png');
    await picture(teamFile, 'U', 'gold');
    const packages = (await gql('{ agentPackages { packageId path } }')).agentPackages;
    const studioPackage = packages.find((p) => fs.realpathSync(p.path) === fs.realpathSync(studio));
    await gql('mutation($id:String!){reloadAgentPackage(packageId:$id){packageId}}', { id: studioPackage.packageId });
    const teamAfter = await waitFor('the team\'s new version', async () => { const url = byName((await definitions()).agentTeamDefinitions, 'Crew').avatarUrl; return url !== teamBefore ? url : null; }, 30_000);
    const sentTeam = await fetchPicture(teamAfter);
    assert(sentTeam.bytes.equals(PICTURES[teamFile]), 'the team route sends the new bytes', { teamAfter });
    return { agent: { before: writerBefore, after: writerAfter, oldAddressStatus: old.status, oldAddressSendsCurrentFile: old.bytes.equals(PICTURES[file]) },
      team: { before: teamBefore, after: teamAfter, via: 'reloadAgentPackage' } };
  });

  await runCase('A-003', 'The user\'s own picture wins; the package\'s address saved as the user\'s clears it; null clears', async () => {
    const packageAddress = byName((await definitions()).agentDefinitions, 'Clone Reviewer').avatarUrl;
    const form = new FormData();
    form.append('file', new Blob([syntheticPng('W', COLOURS.pink)], { type: 'image/png' }), 'mine.png');
    const upload = await (await fetch(`${stack.baseUrl}/rest/upload-file`, { method: 'POST', headers: ownerHeaders(), body: form })).json();
    assert(upload.fileUrl, 'uploaded', upload);
    const id = ids['Clone Reviewer'];
    const UPDATE = 'mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id avatarUrl userAvatarUrl personalSettings}}';
    const mine = (await gql(UPDATE, { input: { id, avatarUrl: upload.fileUrl } })).updateAgentDefinition;
    assert(mine.avatarUrl === upload.fileUrl && mine.userAvatarUrl === upload.fileUrl && mine.personalSettings.includes('AVATAR'), 'the user\'s picture wins', mine);
    const pinned = (await gql(UPDATE, { input: { id, avatarUrl: `/rest/definition-avatars/agent/${encodeURIComponent(id)}?v=000000000000` } })).updateAgentDefinition;
    assert(pinned.avatarUrl === packageAddress && pinned.userAvatarUrl === null && !pinned.personalSettings.includes('AVATAR'), 'a package address is never the user\'s: it clears', pinned);
    await gql(UPDATE, { input: { id, avatarUrl: upload.fileUrl } });
    const cleared = (await gql(UPDATE, { input: { id, avatarUrl: null } })).updateAgentDefinition;
    assert(cleared.avatarUrl === packageAddress && cleared.userAvatarUrl === null, 'null clears; the package\'s shows again', cleared);
    return { upload: upload.fileUrl, mine, packageAddress, afterPinningPackageAddress: pinned, afterNull: cleared };
  });

  // Runs: twenty of the agent (the phone list), a hub with ten delegated copies of the team, an org's definition listed.
  const workspace = path.join(root, 'workspace');
  await fsp.mkdir(workspace, { recursive: true });
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } });
  const writerRuns = [];
  for (let i = 0; i < WRITER_RUNS; i++) {
    const runId = await createRun(ids['Story Writer'], workspace); writerRuns.push(runId);
    (await inputFor(runId))(`Draft chapter ${i + 1}`);
  }
  const hubId = await createRun(ids['Hub Manager'], workspace);
  const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: 'Avatar Probe Project' } })).createProject.projectId;
  const toHub = await inputFor(hubId);
  const copies = [];
  for (let i = 0; i < COPIES; i++) {
    const taskId = (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId, title: `Chapter review ${i + 1}`, description: `Chapter review ${i + 1}\nReview one chapter.` } })).createProjectTask.taskId;
    toHub(callTool('delegate_task', { recipient_address: '/crew', task_id: taskId }));
    const started = await waitFor(`copy ${i + 1} started`, async () => (await tasksFor(projectId)).find((t) => t.taskId === taskId && t.root?.start === 'started'), 180_000);
    copies.push(started.root.teamRunId);
  }
  await sleep(5_000);
  evidence.data = sanitize({ writerRuns: writerRuns.length, hub: hubId, copies });
  await save();
  await frontendStarting;

  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });

  await runCase('D-001', `Desktop (nuxt dev, 1440×900): every surface shows the definitions\' pictures in their slots; ${COPIES} copies, one picture`, async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await attachToBrowserContext(context);
    const page = await context.newPage(); watchPage(page, 'desktop');
    const surfaces = {};
    casePage = page;
    // A cold Nuxt dev server reloads a page the first time its route pulls new dependencies: visit each route once first.
    for (const route of ['/agents', '/agent-teams', '/agent-orgs', '/workspace']) {
      await page.goto(`${stack.frontendUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await nuxtReady(page).catch(() => undefined); await page.waitForTimeout(3_000);
    }
    const visit = async (name, url, ready) => {
      if (url) {
        await page.goto(`${stack.frontendUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await nuxtReady(page);
      }
      if (ready) await ready();
      await page.waitForTimeout(1_500);
      await waitFor(`${name}: pictures drawn`, async () => (await avatarsOn(page)).filter((a) => a.state === 'picture').every((a) => a.drawn), 20_000).catch(() => undefined);
      surfaces[name] = await avatarsOn(page);
      await shot(page, `desktop-1440x900-${name}`);
    };
    await visit('agents-catalog', '/agents', () => page.getByText('Story Writer').first().waitFor({ timeout: 60_000 }));
    await visit('teams-catalog', '/agent-teams', () => page.getByText('Crew').first().waitFor({ timeout: 60_000 }));
    await visit('orgs-catalog', '/agent-orgs', () => page.getByText('Story Studio').first().waitFor({ timeout: 60_000 }));
    await visit('team-detail', `/agent-teams?view=team-detail&id=${encodeURIComponent(ids['Crew'])}`, () => page.getByText('Crew').first().waitFor({ timeout: 60_000 }));
    await visit('workspaces-tree', '/workspace', async () => {
      await unfoldTree(page, [ids['Hub Manager']]);
      await waitFor('the hub\'s copies listed', async () => (await page.locator('[data-team-icon="temporary-task-team"]').count()) >= COPIES, 60_000);
    });
    const copyAvatars = await page.locator('[data-team-icon="temporary-task-team"]').evaluateAll((nodes) => nodes.map((n) => ({ state: n.getAttribute('data-avatar-state'), src: n.querySelector('img')?.getAttribute('src') ?? null })));
    await visit('agent-editor', `/agents?view=edit&id=${encodeURIComponent(ids['Story Writer'])}`, async () => {
      await page.locator('[data-test="agent-avatar-preview"]').waitFor({ timeout: 60_000 });
      await page.locator('[data-test="agent-avatar-preview"]').scrollIntoViewIfNeeded();
    });
    const editor = { caption: await page.locator('[data-test="agent-avatar-from-package"]').count(), remove: await page.locator('[data-test="agent-avatar-remove"]').count(),
      preview: await page.locator('[data-test="agent-avatar-preview"]').getAttribute('data-avatar-state') };
    await visit('conversation', '/workspace', async () => {
      await unfoldTree(page, [ids['Story Writer']]);
      const last = writerRuns.at(-1);
      await page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${last}"]`).click({ timeout: 30_000 });
      await page.getByText(`Draft chapter ${WRITER_RUNS}`).last().waitFor({ timeout: 60_000 });
    });
    await visit('runs-view', null, async () => {
      await inStore(page, 'runSectionMode', 'setMode', 'runs');
      await page.locator('[data-test="run-list-row"]').first().waitFor({ timeout: 60_000 });
    });
    const pictureSrc = (list, fragment) => list.filter((a) => a.state === 'picture' && (a.src ?? '').includes(fragment));
    const writerPicture = `/rest/definition-avatars/agent/${encodeURIComponent(ids['Story Writer'])}`;
    assert(pictureSrc(surfaces['agents-catalog'], writerPicture).length >= 1, 'the Agents catalog shows the writer\'s picture', surfaces['agents-catalog']);
    assert(surfaces['agents-catalog'].some((a) => a.kind === 'agent' && a.state === 'fallback'), 'the broken agent shows its initials', surfaces['agents-catalog']);
    assert(pictureSrc(surfaces['teams-catalog'], '/rest/definition-avatars/agent_team/').length >= 1, 'the Teams catalog shows the team\'s picture', surfaces['teams-catalog']);
    assert(pictureSrc(surfaces['orgs-catalog'], '/rest/definition-avatars/agent_org/').length >= 1, 'the Orgs catalog shows the org\'s picture', surfaces['orgs-catalog']);
    const all = Object.values(surfaces).flat();
    assert(all.filter((a) => a.state === 'picture').every((a) => a.drawn && a.src.startsWith(stack.baseUrl)), 'every picture drew from the node (resolved against the bound node)', all.filter((a) => a.state === 'picture' && !(a.drawn && a.src.startsWith(stack.baseUrl))));
    assert(copyAvatars.length >= COPIES && new Set(copyAvatars.map((c) => c.src)).size === 1 && copyAvatars.every((c) => c.state === 'picture'), `${COPIES} copies, one picture`, copyAvatars);
    assert(surfaces['runs-view'].filter((a) => a.state === 'picture').length >= 2, 'the Runs view shows the pictures', surfaces['runs-view']);
    assert(surfaces.conversation.some((a) => a.state === 'picture' && (a.src ?? '').includes(writerPicture)), 'the conversation shows the writer\'s picture', surfaces.conversation);
    assert(editor.caption === 1 && editor.remove === 0 && editor.preview === 'picture', 'the editor previews the package\'s picture, captioned, with no Remove', editor);
    const summary = Object.fromEntries(Object.entries(surfaces).map(([k, v]) => [k, { pictures: v.filter((a) => a.state === 'picture').length, fallbacks: v.filter((a) => a.state === 'fallback').length,
      sizes: [...new Set(v.map((a) => `${a.box.width}x${a.box.height}`))] }]));
    await context.close();
    return { summary, copies: { count: copyAvatars.length, distinctSources: [...new Set(copyAvatars.map((c) => c.src))] }, editor };
  });

  await runCase('P-001', `Phone (390×844): ${COPIES} rows of one team, one picture fetch per address, credential in the Authorization header only`, async () => {
    const phoneOrigin = `http://${PHONE_HOST}:${stack.port}`;
    const settings = await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
    assert(settings.status === 200, 'Phone Access on', settings);
    const pairing = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Avatar Probe Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'pairing session', pairing.status);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' });
    const page = await context.newPage(); watchPage(page, 'phone'); casePage = page;
    await page.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    await page.locator('[data-testid="mobile-pair-button"]').waitFor({ state: 'detached', timeout: 60_000 });
    const credential = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) { const v = localStorage.getItem(localStorage.key(i)); const m = /"credential"\s*:\s*"([^"]+)"/.exec(v ?? ''); if (m) return m[1]; }
      return null;
    });
    assert(credential, 'the phone holds its credential');
    requestLog.length = 0;
    await page.goto(`${phoneOrigin}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
    const rowsNow = () => page.evaluate(() => [...document.querySelectorAll('[data-testid^="mobile-run-row-"]')].map((row) => {
      const avatar = row.querySelector('[data-test="definition-avatar"]'); const img = avatar?.querySelector('img');
      return { key: row.getAttribute('data-testid').slice('mobile-run-row-'.length), name: row.querySelector('[data-testid="mobile-run-name"]')?.textContent.trim() ?? '',
        state: avatar?.getAttribute('data-avatar-state') ?? null, src: img?.getAttribute('src') ?? null, drawn: Boolean(img && img.naturalWidth > 0) };
    }));
    let seen = [];
    // The phone lists the writer's latest runs (its own run-list rules); the copies are the rows of one definition.
    await waitFor(`${COPIES} copies and the writer's runs listed, every picture drawn`, async () => {
      const rows = seen = await rowsNow();
      return rows.filter((r) => r.key.includes('/team:')).length >= COPIES && rows.some((r) => r.name === 'Story Writer')
        && rows.filter((r) => r.state === 'picture').every((r) => r.drawn);
    }, 90_000).catch((error) => { error.details = seen; throw error; });
    // Scroll the whole list (every row mounted stays mounted), then wait for late reads.
    for (let y = 0; y < 12; y++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(250); }
    await page.waitForTimeout(3_000);
    const rows = await rowsNow();
    const fetches = requestLog.map((r) => ({ path: new URL(r.url).pathname + new URL(r.url).search, origin: new URL(r.url).origin.replace(/:\d+$/, ':<port>'),
      authorization: r.headers.authorization === `Bearer ${credential}` ? 'Bearer <phone credential>' : (r.headers.authorization ? 'other' : null) }));
    const byAddress = fetches.reduce((m, f) => m.set(f.path, (m.get(f.path) ?? 0) + 1), new Map());
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
    await shot(page, 'phone-390x844-run-list');
    const copyRows = rows.filter((r) => r.key.includes('/team:'));
    const crewPath = `/rest/definition-avatars/agent_team/${encodeURIComponent(ids['Crew'])}`;
    assert(copyRows.length >= COPIES && copyRows.every((r) => r.state === 'picture' && r.drawn && r.src.startsWith('blob:')) && new Set(copyRows.map((r) => r.src)).size === 1,
      `${COPIES} copies show the team's one picture from one object URL`, copyRows);
    assert([...byAddress].filter(([p]) => p.startsWith(crewPath)).map(([, n]) => n).join() === '1', `one fetch of the team's picture for ${copyRows.length} rows`, fetches);
    assert([...byAddress.values()].every((n) => n === 1), 'one fetch per picture address', fetches);
    assert(fetches.every((f) => f.authorization === 'Bearer <phone credential>'), 'the credential in the Authorization header', fetches);
    assert(requestLog.every((r) => !r.url.includes(credential) && !/access_token|credential|token=/i.test(new URL(r.url).search)), 'no credential in any picture address', fetches);
    const pictureRows = rows.filter((r) => r.state === 'picture');
    await context.close();
    return { rows: rows.length, pictureRows: pictureRows.length, copyRows: copyRows.length, distinctObjectUrls: new Set(pictureRows.map((r) => r.src)).size,
      fetchesPerAddress: Object.fromEntries(byAddress), fetches };
  });

  await runCase('D-002', 'Desktop agent editor (AC-003, AC-006): upload then save shows the user\'s picture; saving another field keeps it; Remove then save shows the package\'s again', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await attachToBrowserContext(context);
    const page = await context.newPage(); watchPage(page, 'desktop'); casePage = page;
    const id = ids['Story Writer'];
    const packageAddress = `/rest/definition-avatars/agent/${encodeURIComponent(id)}`;
    const stored = async () => (await gql('query{agentDefinitions{id description avatarUrl userAvatarUrl personalSettings}}')).agentDefinitions.find((a) => a.id === id);
    const preview = () => page.locator('[data-test="agent-avatar-preview"]').evaluate((n) => ({ state: n.getAttribute('data-avatar-state'), src: n.querySelector('img')?.getAttribute('src') ?? null }));
    const openEditor = async () => {
      await page.goto(`${stack.frontendUrl}/agents?view=edit&id=${encodeURIComponent(id)}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await nuxtReady(page);
      await page.locator('[data-test="agent-avatar-preview"]').waitFor({ timeout: 60_000 });
      await page.waitForTimeout(1_500);
    };
    const save = async () => {
      await page.locator('button[type="submit"]').last().click();
      await page.waitForTimeout(2_500);
    };
    const before = await stored();
    // 1. Upload a picture (a synthetic one), then save.
    await openEditor();
    const uploadFile = path.join(root, 'upload-user-picture.png');
    await fsp.writeFile(uploadFile, syntheticPng('U', COLOURS.pink));
    await page.locator('input[type="file"][accept*="image"]').setInputFiles(uploadFile);
    await waitFor('the upload previewed', async () => ((await preview()).src ?? '').includes('/rest/files/'), 30_000);
    await save();
    const afterUpload = await stored();
    // 2. Reopen; change only the description; save: the user's picture stays.
    await openEditor();
    const caption1 = await page.locator('[data-test="agent-avatar-from-package"]').count();
    const remove1 = await page.locator('[data-test="agent-avatar-remove"]').count();
    await page.locator('#description').fill(`${before.description} (edited)`);
    await save();
    const afterOtherField = await stored();
    // 3. Reopen; Remove; save: the package's picture is the display one again, captioned, no Remove.
    await openEditor();
    await page.locator('[data-test="agent-avatar-remove"]').click();
    await save();
    const afterRemove = await stored();
    await openEditor();
    const refill = { preview: await preview(), caption: await page.locator('[data-test="agent-avatar-from-package"]').count(), remove: await page.locator('[data-test="agent-avatar-remove"]').count() };
    await shot(page, 'desktop-1440x900-agent-editor-after-remove');
    // Put the description back for the later cases.
    await gql('mutation($i:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$i){id}}', { i: { id, description: before.description } }).catch(() => undefined);
    await context.close();
    const details = { before: { avatarUrl: before.avatarUrl, userAvatarUrl: before.userAvatarUrl },
      afterUpload: { avatarUrl: afterUpload.avatarUrl, userAvatarUrl: afterUpload.userAvatarUrl, personal: afterUpload.personalSettings },
      reopenedWithUserPicture: { caption: caption1, remove: remove1 },
      afterOtherField: { description: afterOtherField.description, avatarUrl: afterOtherField.avatarUrl, userAvatarUrl: afterOtherField.userAvatarUrl },
      afterRemove: { avatarUrl: afterRemove.avatarUrl, userAvatarUrl: afterRemove.userAvatarUrl, personal: afterRemove.personalSettings }, refill };
    assert((afterUpload.userAvatarUrl ?? '').includes('/rest/files/') && afterUpload.avatarUrl === afterUpload.userAvatarUrl, 'the upload is the user\'s picture and the one shown', details);
    assert(caption1 === 0 && remove1 === 1, 'with the user\'s picture: no package caption, Remove offered', details);
    assert(afterOtherField.description.endsWith('(edited)') && afterOtherField.userAvatarUrl === afterUpload.userAvatarUrl, 'saving another field keeps the user\'s picture', details);
    assert(afterRemove.userAvatarUrl === null && (afterRemove.avatarUrl ?? '').startsWith(packageAddress), 'Remove then save: the package\'s picture shows again', details);
    assert(refill.preview.state === 'picture' && (refill.preview.src ?? '').includes(packageAddress) && refill.caption === 1 && refill.remove === 0, 'the editor previews the package\'s picture, captioned, no Remove', details);
    return details;
  });

  await runCase('D-003', 'Desktop team editor (AC-003, AC-006, CRR-001 C-2): upload then save; saving another field keeps the user\'s picture; Remove then save shows the package\'s again', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await attachToBrowserContext(context);
    const page = await context.newPage(); watchPage(page, 'desktop'); casePage = page;
    const id = ids['Crew'];
    const packageAddress = `/rest/definition-avatars/agent_team/${encodeURIComponent(id)}`;
    const stored = async () => (await gql('query{agentTeamDefinitions{id description avatarUrl userAvatarUrl}}')).agentTeamDefinitions.find((t) => t.id === id);
    const preview = () => page.locator('[data-test="team-avatar-preview"]').evaluate((n) => ({ state: n.getAttribute('data-avatar-state'), src: n.querySelector('img')?.getAttribute('src') ?? null }));
    const openEditor = async () => {
      await page.goto(`${stack.frontendUrl}/agent-teams?view=team-edit&id=${encodeURIComponent(id)}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await nuxtReady(page);
      await page.locator('[data-test="team-avatar-preview"]').waitFor({ timeout: 60_000 });
      await page.waitForTimeout(1_500);
    };
    const save = async () => {
      await page.locator('button[type="submit"]').last().click();
      await page.waitForTimeout(2_500);
    };
    const before = await stored();
    await openEditor();
    const initial = { preview: await preview(), caption: await page.locator('[data-test="team-avatar-from-package"]').count(), remove: await page.locator('[data-test="team-avatar-remove"]').count() };
    const uploadFile = path.join(root, 'upload-team-picture.png');
    await fsp.writeFile(uploadFile, syntheticPng('L', COLOURS.red));
    await page.locator('input[type="file"][accept*="image"]').setInputFiles(uploadFile);
    await waitFor('the upload previewed', async () => ((await preview()).src ?? '').includes('/rest/files/'), 30_000);
    await save();
    const afterUpload = await stored();
    await openEditor();
    const reopened = { caption: await page.locator('[data-test="team-avatar-from-package"]').count(), remove: await page.locator('[data-test="team-avatar-remove"]').count() };
    await page.locator('#team-description').fill(`${before.description} (edited)`);
    await save();
    const afterOtherField = await stored();
    await openEditor();
    await page.locator('[data-test="team-avatar-remove"]').click();
    await save();
    const afterRemove = await stored();
    await openEditor();
    const refill = { preview: await preview(), caption: await page.locator('[data-test="team-avatar-from-package"]').count(), remove: await page.locator('[data-test="team-avatar-remove"]').count() };
    await shot(page, 'desktop-1440x900-team-editor-after-remove');
    await gql('mutation($i:UpdateAgentTeamDefinitionInput!){updateAgentTeamDefinition(input:$i){id}}', { i: { id, description: before.description } }).catch(() => undefined);
    await context.close();
    const details = { before: { avatarUrl: before.avatarUrl, userAvatarUrl: before.userAvatarUrl }, initial,
      afterUpload: { avatarUrl: afterUpload.avatarUrl, userAvatarUrl: afterUpload.userAvatarUrl }, reopened,
      afterOtherField: { description: afterOtherField.description, avatarUrl: afterOtherField.avatarUrl, userAvatarUrl: afterOtherField.userAvatarUrl },
      afterRemove: { avatarUrl: afterRemove.avatarUrl, userAvatarUrl: afterRemove.userAvatarUrl }, refill };
    assert(initial.preview.state === 'picture' && (initial.preview.src ?? '').includes(packageAddress) && initial.caption === 1 && initial.remove === 0, 'before: the package\'s picture previewed, captioned, no Remove', details);
    assert((afterUpload.userAvatarUrl ?? '').includes('/rest/files/') && afterUpload.avatarUrl === afterUpload.userAvatarUrl, 'the upload is the user\'s picture and the one shown', details);
    assert(reopened.caption === 0 && reopened.remove === 1, 'with the user\'s picture: no package caption, Remove offered', details);
    assert(afterOtherField.description.endsWith('(edited)') && afterOtherField.userAvatarUrl === afterUpload.userAvatarUrl, 'saving another field keeps the user\'s picture', details);
    assert(afterRemove.userAvatarUrl === null && (afterRemove.avatarUrl ?? '').startsWith(packageAddress), 'Remove then save: the package\'s picture shows again', details);
    assert(refill.preview.state === 'picture' && (refill.preview.src ?? '').includes(packageAddress) && refill.caption === 1 && refill.remove === 0, 'the editor previews the package\'s picture again', details);
    return details;
  });

  await runCase('P-002', 'Phone (CRR-001 C-3, held): the first fetch of a picture fails once; its rows show the fallback; whether they recover without a reload; after a reload, the picture', async () => {
    const phoneOrigin = `http://${PHONE_HOST}:${stack.port}`;
    const pairing = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Avatar Probe Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'pairing session', pairing.status);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' });
    const page = await context.newPage(); watchPage(page, 'phone-c3'); casePage = page;
    await page.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    await page.locator('[data-testid="mobile-pair-button"]').waitFor({ state: 'detached', timeout: 60_000 });
    const hubPath = `/rest/definition-avatars/agent/${encodeURIComponent(ids['Hub Manager'])}`;
    let failed = 0;
    await page.route((u) => u.pathname === hubPath, async (route) => { if (failed === 0) { failed += 1; return route.abort('failed'); } return route.fallback(); });
    await page.goto(`${phoneOrigin}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
    const hubRow = () => page.evaluate((name) => {
      const row = [...document.querySelectorAll('[data-testid^="mobile-run-row-"]')].find((r) => r.querySelector('[data-testid="mobile-run-name"]')?.textContent.trim() === name);
      const avatar = row?.querySelector('[data-test="definition-avatar"]');
      return row ? { state: avatar?.getAttribute('data-avatar-state') ?? null, drawn: Boolean(avatar?.querySelector('img')?.naturalWidth) } : null;
    }, 'Hub Manager');
    await waitFor('the hub row', async () => Boolean(await hubRow()), 60_000);
    await waitFor('the failed fetch', async () => failed >= 1, 30_000);
    await page.waitForTimeout(2_000);
    const afterFailure = await hubRow();
    await page.waitForTimeout(15_000);
    const after15s = await hubRow();
    await shot(page, 'phone-390x844-c3-after-failure');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
    let afterReload = null;
    await waitFor('the hub row\'s picture after a reload', async () => (afterReload = await hubRow())?.state === 'picture' && afterReload.drawn, 30_000).catch(() => undefined);
    await context.close();
    const details = { failedFetches: failed, afterFailure, after15s, afterReload, recoveredWithoutReload: after15s?.state === 'picture' };
    assert(afterFailure?.state === 'fallback', 'a failed picture fetch shows the fallback (initials), nothing broken', details);
    assert(afterReload?.state === 'picture' && afterReload.drawn, 'after a reload the picture shows', details);
    return details;
  });

  await runCase('P-003', 'Phone (CRR-001 C-3, held): the first read of the agents\' pictures fails once; the rows show the fallback; whether a definition change or only a reload brings them back', async () => {
    const phoneOrigin = `http://${PHONE_HOST}:${stack.port}`;
    const pairing = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Avatar Probe Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'pairing session', pairing.status);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' });
    const page = await context.newPage(); watchPage(page, 'phone-c3'); casePage = page;
    await page.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    await page.locator('[data-testid="mobile-pair-button"]').waitFor({ state: 'detached', timeout: 60_000 });
    let failed = 0; let reads = 0;
    await page.route((u) => u.pathname.endsWith('/graphql'), async (route) => {
      if (!(route.request().postData() ?? '').includes('GetAgentDefinitionAvatars')) return route.fallback();
      reads += 1;
      if (failed === 0) { failed += 1; return route.abort('failed'); }
      return route.fallback();
    });
    await page.goto(`${phoneOrigin}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
    const hubRow = () => page.evaluate((name) => {
      const row = [...document.querySelectorAll('[data-testid^="mobile-run-row-"]')].find((r) => r.querySelector('[data-testid="mobile-run-name"]')?.textContent.trim() === name);
      const avatar = row?.querySelector('[data-test="definition-avatar"]');
      return row ? { state: avatar?.getAttribute('data-avatar-state') ?? null, drawn: Boolean(avatar?.querySelector('img')?.naturalWidth) } : null;
    }, 'Hub Manager');
    await waitFor('the hub row', async () => Boolean(await hubRow()), 60_000);
    await waitFor('the failed read', async () => failed >= 1, 30_000);
    await page.waitForTimeout(2_000);
    const afterFailure = await hubRow();
    const teamPictureAfterFailure = await page.evaluate(() => [...document.querySelectorAll('[data-test="definition-avatar"][data-avatar-kind="team"]')].some((n) => n.getAttribute('data-avatar-state') === 'picture'));
    await page.waitForTimeout(15_000);
    const after15s = await hubRow();
    await shot(page, 'phone-390x844-c3-definitions-read-failed');
    // A definition change (the change feed): does it bring the agents' pictures back?
    const hub = (await gql('query{agentDefinitions{id description}}')).agentDefinitions.find((a) => a.id === ids['Hub Manager']);
    await gql('mutation($i:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$i){id}}', { i: { id: hub.id, description: `${hub.description} (P-003)` } });
    let afterChange = null;
    await waitFor('the hub row\'s picture after a definition change', async () => (afterChange = await hubRow())?.state === 'picture', 20_000).catch(() => undefined);
    const readsAfterChange = reads;
    await gql('mutation($i:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$i){id}}', { i: { id: hub.id, description: hub.description } }).catch(() => undefined);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
    let afterReload = null;
    await waitFor('the hub row\'s picture after a reload', async () => (afterReload = await hubRow())?.state === 'picture' && afterReload.drawn, 30_000).catch(() => undefined);
    await context.close();
    const details = { failedReads: failed, reads, readsAfterChange, afterFailure, teamPictureAfterFailure, after15s, recoveredWithoutChange: after15s?.state === 'picture',
      afterChange, recoveredByChange: afterChange?.state === 'picture', afterReload };
    assert(afterFailure?.state === 'fallback', 'a failed read shows the fallback (initials), nothing broken', details);
    assert(afterReload?.state === 'picture' && afterReload.drawn, 'after a reload the picture shows', details);
    return details;
  });

  if (installedApp) {
    await runCase('E-001', 'The installed file:// window (isolated instance on a copy of this data root): pictures load from the node', async () => {
      await stopGroup(stack.frontend); await stopGroup(stack.backend);
      for (const socket of sockets) socket.terminate();
      const copy = path.join(root, 'installed');
      await fsp.cp(stack.dataRoot, copy, { recursive: true });
      const started = JSON.parse(execFileSync('pnpm', ['--silent', 'isolated-app', 'start', '--app', installedApp, '--data-root', copy], { cwd: repoDir, encoding: 'utf8', env: { ...process.env } }));
      assert(started.ok, 'isolated instance started', started);
      evidence.installed = sanitize({ instanceId: started.result.instanceId, controlEndpoint: started.result.controlEndpoint });
      const cdp = await chromium.connectOverCDP(started.result.controlEndpoint);
      try {
        const page = await waitFor('the app window', async () => cdp.contexts().flatMap((c) => c.pages()).find((p) => !p.url().startsWith('devtools')), 60_000);
        watchPage(page, 'installed'); casePage = page;
        await page.setViewportSize({ width: 1440, height: 900 }).catch(() => undefined);
        assert(page.url().startsWith('file://'), 'a file:// window', page.url());
        const go = async (route) => { await page.evaluate((r) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(r), route); await page.waitForTimeout(2_500); };
        await nuxtReady(page);
        const shown = {};
        for (const [name, route, ready] of [
          ['agents-catalog', '/agents', () => page.getByText('Story Writer').first().waitFor({ timeout: 60_000 })],
          ['teams-catalog', '/agent-teams', () => page.getByText('Crew').first().waitFor({ timeout: 60_000 })],
          ['workspaces-tree', '/workspace', async () => {
            await unfoldTree(page, [ids['Hub Manager']]);
            await waitFor('the hub\'s copies listed', async () => (await page.locator('[data-team-icon="temporary-task-team"]').count()) >= COPIES, 60_000);
          }],
        ]) {
          await go(route);
          await ready();
          await page.waitForTimeout(2_000);
          shown[name] = await avatarsOn(page);
          await shot(page, `installed-1440x900-${name}`);
        }
        const pictures = Object.values(shown).flat().filter((a) => a.state === 'picture');
        assert(pictures.length >= 3 && pictures.every((a) => a.drawn && /^http:\/\/127\.0\.0\.1:\d+\/rest\/definition-avatars\//.test(a.src)), 'pictures drew from the node, not file:///rest', pictures);
        return { pageUrl: 'file://…', pictures: pictures.length, sources: [...new Set(pictures.map((a) => a.src.replace(/:\d+\//, ':<port>/')))] };
      } finally {
        await cdp.close().catch(() => undefined);
        const stopped = execFileSync('pnpm', ['--silent', 'isolated-app', 'stop', started.result.instanceId], { cwd: repoDir, encoding: 'utf8' });
        evidence.cleanup.installed = JSON.parse(stopped).ok ? 'stopped' : stopped.slice(0, 200);
      }
    });
  }
};

const cleanup = async () => {
  for (const socket of sockets) { try { socket.terminate(); } catch { /* closed */ } }
  await browser?.close().catch(() => undefined);
  evidence.cleanup.frontend = await stopGroup(stack.frontend);
  evidence.cleanup.backend = await stopGroup(stack.backend);
  if (root && !keep) { await fsp.rm(root, { recursive: true, force: true }); evidence.cleanup.root = 'removed'; }
  for (const name of ['backend.log', 'frontend.log']) {
    const file = path.join(outputDir, name);
    if (fs.existsSync(file)) await fsp.writeFile(file, sanitize(await fsp.readFile(file, 'utf8')));
  }
  evidence.finishedAt = new Date().toISOString();
  await save();
};

try {
  await main();
} catch (error) {
  evidence.failure = sanitize(`${error.message}`);
  console.error(error);
} finally {
  await cleanup();
}
const failed = Object.entries(evidence.cases).filter(([, c]) => c.result !== 'Pass').map(([id]) => id);
console.log(`definition-avatars probe: ${Object.keys(evidence.cases).length - failed.length} passed, ${failed.length} failed${failed.length ? ` (${failed.join(', ')})` : ''}${evidence.failure ? `; stopped: ${evidence.failure}` : ''}`);
process.exit(failed.length || evidence.failure ? 1 : 0);
