#!/usr/bin/env node
// autobyteus-450 API-06 (API/E2E, temporary ticket-owned harness; not a package probe): the real Android app and the phone
// page's attachment taps (AC-002, AC-005, ASM-001, BEH-007).
//
// A node from `--worktree` (its `autobyteus-server-ts/dist/app.js`, which serves that worktree's phone bundle at /mobile),
// temp data root and HOME, the probe's owner credential, scripted AGY CLI. A run "Content Creator". A second phone, headless
// Chrome on the same node, attaches a PNG and a text file in the run's composer and sends them (as the user did from his
// phone). The emulator's app (`--apk`) is paired by the share intent, opened from the launcher, shows that run and taps:
//   the text file's chip, then the PNG's thumbnail (Back after each);
// and records what the app shows after each tap: the page's file viewer (its text), the app's pairing screen, or the
// conversation unchanged. With `--revoke` it then revokes the device on the node and starts the app again (a real
// rejection lands on pairing, BEH-007).
//
// The emulator reaches the node at 10.0.2.2:<proxy port> through a TCP proxy that forwards and records every connection
// (path, WebSocket or not).
//
// Usage: node emulator-attachment-harness.mjs --worktree=<dir> --apk=<apk> --label=<name> --serial=emulator-5584
//          --output-dir=<fresh dir> [--revoke]
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const arg = (name, fallback) => { const hit = process.argv.find(v => v === `--${name}` || v.startsWith(`--${name}=`)); return hit ? (hit.includes('=') ? hit.slice(name.length + 3) : true) : fallback; };
const worktree = path.resolve(arg('worktree'));
const harnessWeb = '/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450/autobyteus-web';
const require = createRequire(path.join(harnessWeb, 'package.json'));
const { chromium } = require('playwright-core');
const access = await import(path.join(harnessWeb, 'tests', 'e2e', 'fixtures', 'probe-node-access.mjs'));
access.attachToProbeProcess();
const SERIAL = arg('serial', 'emulator-5584');
const APK = path.resolve(arg('apk'));
const LABEL = arg('label', 'run');
const REVOKE = arg('revoke', false) === true;
const outputDir = path.resolve(arg('output-dir'));
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const ADB = path.join(os.homedir(), 'Library/Android/sdk/platform-tools/adb');
const PKG = 'org.autobyteus.mobile';
const PHONE_HOST = '192.168.77.50';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const now = () => Date.now() - t0;
const summary = { label: LABEL, worktree, apk: APK, startedAt: new Date().toISOString(), taps: [], connections: [], timeline: [], error: null };
const log = (event, d = {}) => { const e = { t: now(), event, ...d }; summary.timeline.push(e); console.log(JSON.stringify(e)); };
const adb = (...a) => execFileSync(ADB, ['-s', SERIAL, ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const shell = (...a) => adb('shell', ...a);
const waitFor = async (what, fn, ms = 60_000, every = 300) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(every); } throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`); };
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
/** The UI tree (WebView included): text/desc and bounds. An "isn't responding" dialog is answered with Wait (counted). */
const uiNodes = () => {
  const parse = xml => [...xml.matchAll(/<node [^>]*?text="([^"]*)"[^>]*?content-desc="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)]
    .map(m => ({ text: m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'"), desc: m[2], x: (Number(m[3]) + Number(m[5])) / 2, y: (Number(m[4]) + Number(m[6])) / 2 }));
  const nodes = parse(adb('exec-out', 'uiautomator', 'dump', '/dev/tty'));
  const wait = nodes.find(n => n.text === 'Wait');
  if (wait && nodes.some(n => /isn.t responding/.test(n.text))) { summary.notRespondingDialogs = (summary.notRespondingDialogs ?? 0) + 1; shell('input', 'tap', String(Math.round(wait.x)), String(Math.round(wait.y))); execFileSync('sleep', ['1']); return parse(adb('exec-out', 'uiautomator', 'dump', '/dev/tty')); }
  return nodes;
};
const screenText = () => uiNodes().map(n => `${n.text}${n.desc ? ` [${n.desc}]` : ''}`).filter(s => s.trim()).join('\n');
const screenshot = async name => fs.writeFile(path.join(outputDir, `${name}.png`), execFileSync(ADB, ['-s', SERIAL, 'exec-out', 'screencap', '-p'], { maxBuffer: 64 * 1024 * 1024 }));
const launcher = () => shell('am', 'start', '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.LAUNCHER', '-f', '0x10200000', '-n', `${PKG}/.MainActivity`);
/** Looks with 1 s pauses (back-to-back UI dumps starve the WebView, autobyteus-434 API-09). */
const waitOnScreen = async (what, test, ms) => { const end = Date.now() + ms; while (Date.now() < end) { const text = screenText(); if (test(text)) return text; await sleep(1_000); } return null; };
const png = (w, h) => { const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(body) >>> 0); return Buffer.concat([l, body, c]); };
  const hdr = Buffer.alloc(13); hdr.writeUInt32BE(w, 0); hdr.writeUInt32BE(h, 4); hdr[8] = 8; hdr[9] = 2; const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0x40)]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', hdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))), chunk('IEND', Buffer.alloc(0))]); };

await fs.mkdir(outputDir, { recursive: true });
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'api450-emulator-')));
const nodePort = await freePort(); const proxyPort = await freePort();
const nodeBase = `http://127.0.0.1:${nodePort}`;
const dataDir = path.join(root, 'data'); const home = path.join(root, 'home');
await fs.mkdir(dataDir, { recursive: true }); await fs.mkdir(home, { recursive: true });
await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${nodeBase}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
const server = spawn(process.execPath, [path.join(serverDir, 'dist', 'app.js'), '--host', '127.0.0.1', '--port', String(nodePort), '--data-dir', dataDir], {
  cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...access.probeNodeEnvironment(), PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: nodeBase,
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' } });
server.stdout.pipe(createWriteStream(path.join(outputDir, 'server.log'))); server.stderr.pipe(createWriteStream(path.join(outputDir, 'server.err.log')));
const live = new Set();
const proxy = net.createServer((client) => {
  const upstream = net.connect(nodePort, '127.0.0.1');
  const entry = { openedAt: now(), path: null, webSocket: false };
  summary.connections.push(entry); live.add({ client, upstream });
  client.once('data', c => { const head = String(c); entry.path = /^[A-Z]+ (\S+)/.exec(head)?.[1]?.replace(/access_token=[^&]+/, 'access_token=…') ?? null; entry.webSocket = /^upgrade:\s*websocket/im.test(head); });
  client.on('data', c => upstream.write(c)); upstream.on('data', c => client.write(c));
  const end = () => { client.destroy(); upstream.destroy(); };
  for (const s of [client, upstream]) { s.on('close', end); s.on('error', end); }
});
await new Promise(r => proxy.listen(proxyPort, '127.0.0.1', r));
let browser;
try {
  await waitFor('node health', async () => { if (server.exitCode !== null) throw new Error(`server exited ${server.exitCode}`); return fetch(`${nodeBase}/rest/health`).then(r => r.ok).catch(() => false); }, 120_000);
  const gql = async (q, v) => { const b = await (await fetch(`${nodeBase}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };
  const rest = async (m, r, body) => { const x = await fetch(`${nodeBase}/rest${r}`, { method: m, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); return { status: x.status, body: await x.json().catch(() => null) }; };
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const defId = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Content Creator', role: 'assistant', description: '450 emulator', instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const workspace = path.join(root, 'workspace'); await fs.mkdir(workspace, { recursive: true });
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
  const run = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: defId, workspaceRootPath: workspace, autoExecuteTools: true, ...agy } })).createAgentRun.runId;
  const ws = new WebSocket(access.ownerSocketUrl(`${nodeBase.replace('http', 'ws')}/ws/agent/${run}`)); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); await sleep(300);
  ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:emu:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: run, content: 'Start.' } })); await sleep(800); ws.close();
  summary.run = run;
  // ---- the second phone (headless Chrome) attaches and sends -----------------------------------------------------------
  await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  const chromeOrigin = `http://${PHONE_HOST}:${nodePort}`;
  const chromePairing = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: chromeOrigin, serverName: 'Emulator Test Node', trustedPrivateHttpAcknowledged: true });
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await page.goto(chromePairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
  await page.locator(`[data-testid="mobile-run-row-agent:${run}"] [data-testid="mobile-run-open"]`).click({ timeout: 60_000 });
  const conv = page.locator('[data-testid="mobile-run-conversation"]');
  await conv.waitFor({ timeout: 30_000 });
  const files = { png: path.join(root, 'photo-emu.png'), txt: path.join(root, 'notes-emu.txt') };
  await fs.writeFile(files.png, png(4, 3)); await fs.writeFile(files.txt, 'TEXT-EMU-450: the attached notes.\n');
  await conv.locator('input[type="file"]').first().setInputFiles([files.png, files.txt]);
  await sleep(4_000);
  await conv.locator('textarea').last().fill('EMU-ATTACH-450 two files');
  const send = conv.locator('button[aria-label="Send message"]').last();
  await waitFor('send enabled', async () => (await send.count()) > 0 && await send.isEnabled(), 30_000); await send.click();
  await waitFor('the message stored', async () => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: run })).getRunProjection?.conversation ?? []).includes('notes-emu.txt'), 60_000);
  await browser.close(); browser = null;
  log('attachments sent by the second phone');

  // ---- the app ---------------------------------------------------------------------------------------------------------
  const pairing = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: `http://10.0.2.2:${proxyPort}`, serverName: 'Emulator Test Node', trustedPrivateHttpAcknowledged: true });
  adb('install', '-r', APK); shell('pm', 'clear', PKG);
  log('apk', { versionName: (/versionName=(\S+)/.exec(shell('dumpsys', 'package', PKG)) ?? [])[1] ?? null });
  shell('input', 'keyevent', 'KEYCODE_WAKEUP'); shell('wm', 'dismiss-keyguard');
  shell('am', 'start', '-a', 'android.intent.action.SEND', '-t', 'text/plain', '--es', 'android.intent.extra.TEXT', `'${pairing.body.mobileUrl}'`, '-n', `${PKG}/.MainActivity`);
  await waitOnScreen('the run list after pairing', t => t.includes('Content Creator'), 120_000) ?? (() => { throw new Error('the app did not show the run list after pairing'); })();
  shell('am', 'force-stop', PKG); launcher();
  const listed = await waitOnScreen('the run list from the launcher', t => t.includes('Content Creator'), 90_000);
  if (!listed) throw new Error('the app did not reopen the run list');
  const runRow = uiNodes().filter(n => n.text.startsWith('Content Creator,')).at(-1);
  shell('input', 'tap', String(Math.round(runRow.x)), String(Math.round(runRow.y)));
  const opened = await waitOnScreen('the conversation with the attachments', t => t.includes('EMU-ATTACH-450') && /notes-emu\.txt/.test(t), 60_000);
  if (!opened) throw new Error('the run\'s conversation did not show the attachments');
  await screenshot(`${LABEL}-01-conversation`); await fs.writeFile(path.join(outputDir, `${LABEL}-01-conversation.txt`), opened);
  adb('logcat', '-b', 'all', '-c');
  // The app's own screen for a refused page load (ConnectionDiagnosticMapper 401/403), the page's pairing screen, the phone
  // viewer (its bar: ← and the file's name; a text's content is drawn by Monaco, outside the accessibility tree: see the
  // screenshot), or the conversation.
  const classify = (text, fileName) => ({
    appRejectionScreen: /Pair this phone again|Phone credential was rejected/.test(text),
    pagePairingScreen: /Connect this phone/.test(text),
    viewer: text.split('\n').some(line => line.trim() === fileName) && !text.includes('EMU-ATTACH-450'),
    conversationShown: text.includes('EMU-ATTACH-450') });
  const tap = async (name, find) => {
    const node = uiNodes().filter(find).at(-1);
    if (!node) { summary.taps.push({ name, found: false }); return; }
    const from = now();
    shell('input', 'tap', String(Math.round(node.x)), String(Math.round(node.y)));
    await sleep(6_000);
    const text = screenText();
    await screenshot(`${LABEL}-tap-${name}`); await fs.writeFile(path.join(outputDir, `${LABEL}-tap-${name}.txt`), text);
    const result = { name, found: true, ...classify(text, name === 'text' ? 'notes-emu.txt' : 'photo-emu.png'), connectionsAfterTap: summary.connections.filter(c => c.openedAt >= from).map(c => ({ path: c.path, webSocket: c.webSocket })) };
    shell('input', 'keyevent', 'KEYCODE_BACK');
    const back = await waitOnScreen('back to the conversation', t => t.includes('EMU-ATTACH-450'), 15_000);
    result.backToConversation = Boolean(back);
    summary.taps.push(result); log('tap', result);
    if (!back) { launcher(); await sleep(3_000); }
  };
  await tap('text', n => n.text === 'notes-emu.txt' || n.desc === 'Open notes-emu.txt' || n.text === 'Open notes-emu.txt');
  await tap('png', n => n.desc === 'Open photo-emu.png' || n.text === 'Open photo-emu.png' || n.text === 'photo-emu.png');
  if (REVOKE) {
    const revoked = await rest('DELETE', '/remote-access/devices');
    shell('am', 'force-stop', PKG); launcher();
    const after = await waitOnScreen('the app after the revocation', t => /Connect this phone|Pair this phone again|Phone credential was rejected/.test(t), 60_000);
    await screenshot(`${LABEL}-revoked`); await fs.writeFile(path.join(outputDir, `${LABEL}-revoked.txt`), after ?? screenText());
    summary.revocation = { status: revoked.status, pairingShown: Boolean(after), screen: (after ?? '').split('\n').slice(0, 8) };
    log('revocation', summary.revocation);
  }
  const events = adb('logcat', '-d', '-b', 'all', '-v', 'time').split('\n').filter(l => /CONSOLE|AutoByteus|Navigation|KeepPage|onReceivedHttpError|ConnectionDiagnostic|chromium/.test(l) && !/nativeloader/.test(l));
  await fs.writeFile(path.join(outputDir, `${LABEL}-logcat.txt`), `${events.join('\n')}\n`);
} catch (error) {
  summary.error = String(error.stack ?? error); console.error(summary.error); process.exitCode = 1;
  await screenshot(`${LABEL}-error`).catch(() => undefined);
} finally {
  if (browser) await browser.close().catch(() => undefined);
  proxy.close(); for (const p of live) { p.client.destroy(); p.upstream.destroy(); }
  server.kill('SIGTERM'); await Promise.race([new Promise(r => server.once('close', r)), sleep(10_000)]); if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  summary.cleanup = { serverExited: server.exitCode !== null || server.signalCode !== null, rootRemoved: !existsSync(root) };
  summary.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, `${LABEL}-summary.json`), `${access.redactCredentials(JSON.stringify(summary, null, 2)).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…')}\n`);
  process.exit(process.exitCode ?? 0);
}
