#!/usr/bin/env node
// autobyteus-434 API-09 (API/E2E, temporary ticket-owned harness; not a package probe): AC-003 / ASM-001 on the real
// Android app. The app (debug APK of this worktree) runs in an emulator instance this harness's operator started; the
// node is this worktree's `autobyteus-server-ts/dist/app.js` with a temp data root and HOME and the scripted AGY CLI
// (`interrupt_resend`: a message is answered `REPLY:<message>`).
//
// The emulator reaches the node at `10.0.2.2:<proxy port>` through a TCP proxy this harness owns. The proxy only
// forwards and records every connection (time, whether it is a WebSocket upgrade, its path): that is how the phone's
// stream reconnects are observed from outside the app.
//
// Per cycle (one run open on the phone): app to the background (HOME), screen off (SLEEP); optionally Doze forced
// (`deviceidle force-idle`, the deep sleep a phone enters, which cuts the app's network); markers sent to the run while
// it sleeps; after `--background-seconds` the screen on and the app back in front (launcher intent). Then: when the
// phone shows every marker (read from the WebView's accessibility tree, `uiautomator dump`), the connections opened
// while in the background and after, and a next marker live.
//
// Usage: node emulator-background-harness.mjs --serial=emulator-5584 --apk=<app-debug.apk> --output-dir=<fresh dir>
//          [--background-seconds=150]
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const worktree = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434';
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const require = createRequire(path.join(worktree, 'autobyteus-web', 'package.json'));
const WS = require('ws');
const arg = (name, fallback) => { const hit = process.argv.find(v => v.startsWith(`--${name}=`)); return hit ? hit.slice(name.length + 3) : fallback; };
const SERIAL = arg('serial', 'emulator-5584');
const APK = arg('apk');
const outputDir = path.resolve(arg('output-dir'));
const BACKGROUND_MS = Number(arg('background-seconds', '150')) * 1000;
const ADB = path.join(os.homedir(), 'Library/Android/sdk/platform-tools/adb');
const PKG = 'org.autobyteus.mobile';
const MODEL = 'gemini-3.8-flash-low';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const now = () => Date.now() - t0;
const summary = { startedAt: new Date().toISOString(), serial: SERIAL, cycles: [], connections: [], timeline: [], error: null };
const log = (event, details = {}) => { const e = { t: now(), event, ...details }; summary.timeline.push(e); console.log(JSON.stringify(e)); };
const adb = (...args) => execFileSync(ADB, ['-s', SERIAL, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const shell = (...args) => adb('shell', ...args);
const waitFor = async (what, fn, timeoutMs = 60_000, every = 300) => {
  const deadline = Date.now() + timeoutMs; let last;
  while (Date.now() < deadline) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(every); }
  throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
/**
 * The WebView's accessibility tree: every node's text / content-desc with its bounds. An "isn't responding" dialog
 * (a cold emulator under load; the dump itself builds the WebView's accessibility tree on the app's main thread) is
 * answered with Wait, as a user would, and counted in the summary.
 */
const uiNodes = () => {
  const parse = xml => [...xml.matchAll(/<node [^>]*?text="([^"]*)"[^>]*?content-desc="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)]
    .map(m => ({ text: m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'"), desc: m[2], x: (Number(m[3]) + Number(m[5])) / 2, y: (Number(m[4]) + Number(m[6])) / 2 }));
  const nodes = parse(adb('exec-out', 'uiautomator', 'dump', '/dev/tty'));
  const wait = nodes.find(n => n.text === 'Wait');
  if (wait && nodes.some(n => /isn.t responding/.test(n.text))) {
    summary.notRespondingDialogs = (summary.notRespondingDialogs ?? 0) + 1;
    log('not-responding dialog answered with Wait');
    shell('input', 'tap', String(Math.round(wait.x)), String(Math.round(wait.y)));
    execFileSync('sleep', ['1']);
    return parse(adb('exec-out', 'uiautomator', 'dump', '/dev/tty'));
  }
  return nodes;
};
/** The launcher icon's intent (FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_RESET_TASK_IF_NEEDED). */
const launcher = () => shell('am', 'start', '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.LAUNCHER', '-f', '0x10200000', '-n', `${PKG}/.MainActivity`);
const screenText = () => uiNodes().map(n => `${n.text}${n.desc ? ` [${n.desc}]` : ''}`).filter(s => s.trim()).join('\n');
/**
 * Polls the screen until `test(text)`; returns the bounds of the moment it became true: after the start of the last
 * look that did not show it, no later than the end of the first look that did (a dump takes about 1–2 s here).
 */
// Looks pause 1 s between them: back-to-back dumps keep the app's main thread busy building the WebView's accessibility
// tree and starve the page (run-0-busy-dumps: the streams reconnected only when the dumping stopped).
const shownBetween = async (test, timeoutMs, idleFirstMs = 0) => {
  const deadline = Date.now() + timeoutMs; let lastMissStart = null; const looks = [];
  if (idleFirstMs) await sleep(idleFirstMs);
  while (Date.now() < deadline) {
    const start = now(); const hit = test(screenText()); const end = now(); looks.push(end - start);
    if (hit) return { notBefore: lastMissStart ?? start, noLaterThan: end, looks: looks.length, lookMs: Math.round(looks.reduce((a, b) => a + b, 0) / looks.length) };
    lastMissStart = start;
    await sleep(1_000);
  }
  return null;
};
/** Wall-clock milliseconds of a `logcat -v time` line (the emulator keeps the host's clock and time zone). */
const logcatTime = (line) => { const m = /^(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)\.(\d{3})/.exec(line); if (!m) return null;
  const d = new Date(); d.setMonth(Number(m[1]) - 1, Number(m[2])); d.setHours(Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])); return d.getTime(); };
const screenshot = async name => fs.writeFile(path.join(outputDir, `${name}.png`), execFileSync(ADB, ['-s', SERIAL, 'exec-out', 'screencap', '-p'], { maxBuffer: 64 * 1024 * 1024 }));
const dumpText = async (name) => fs.writeFile(path.join(outputDir, `${name}.txt`), screenText());

await fs.mkdir(outputDir, { recursive: true });
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'api434-emulator-')));
const nodePort = await freePort();
const proxyPort = await freePort();
const nodeBase = `http://127.0.0.1:${nodePort}`;
const dataDir = path.join(root, 'data'); const home = path.join(root, 'home');
await fs.mkdir(dataDir, { recursive: true }); await fs.mkdir(home, { recursive: true });
await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${nodeBase}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
const serverLog = createWriteStream(path.join(outputDir, 'server.log'));
const server = spawn(process.execPath, [path.join(serverDir, 'dist', 'app.js'), '--host', '127.0.0.1', '--port', String(nodePort), '--data-dir', dataDir], {
  cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
  env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: nodeBase,
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs'), AGY_FAKE_CASE: 'interrupt_resend' } });
server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);

// The emulator's path to the node: forwards everything, records every connection.
const live = new Set();
const proxy = net.createServer((client) => {
  const upstream = net.connect(nodePort, '127.0.0.1');
  const entry = { openedAt: now(), closedAt: null, webSocket: false, path: null };
  summary.connections.push(entry);
  live.add({ client, upstream });
  client.once('data', (chunk) => { const head = String(chunk); entry.path = /^[A-Z]+ (\S+)/.exec(head)?.[1]?.replace(/access_token=[^&]+/, 'access_token=…') ?? null; entry.webSocket = /^upgrade:\s*websocket/im.test(head); });
  client.on('data', c => upstream.write(c)); upstream.on('data', c => client.write(c));
  const end = () => { entry.closedAt ??= now(); client.destroy(); upstream.destroy(); };
  for (const s of [client, upstream]) { s.on('close', end); s.on('error', end); }
});
await new Promise(r => proxy.listen(proxyPort, '127.0.0.1', r));
const streamConnections = (from, to = Infinity) => summary.connections.filter(c => c.webSocket && c.openedAt >= from && c.openedAt < to && /\/ws\/agent(-team)?\//.test(c.path ?? ''));

let teamClient; let agentClient;
try {
  await waitFor('node health', async () => { if (server.exitCode !== null) throw new Error(`server exited ${server.exitCode}`); return fetch(`${nodeBase}/rest/health`).then(r => r.ok).catch(() => false); }, 120_000);
  const gql = async (query, variables) => { const b = await (await fetch(`${nodeBase}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };
  const rest = async (method, route, body) => { const r = await fetch(`${nodeBase}/rest${route}`, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
  const def = async name => (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name, role: 'assistant', description: `${name} (434 emulator)`, instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const lead = await def('Emu Lead'); const mate = await def('Emu Mate'); const solo = await def('Emu Agent');
  const workspace = path.join(root, 'workspace'); await fs.mkdir(workspace, { recursive: true });
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
  const runConfig = { workspaceRootPath: workspace, autoExecuteTools: true, ...agy };
  const teamDef = (await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Emu Team', description: '434 emulator', instructions: 'Work together.', coordinatorMemberName: 'lead',
    nodes: [{ memberName: 'lead', ref: lead, refScope: 'SHARED' }, { memberName: 'mate', ref: mate, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  const team = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: teamDef, teamConfigs: [{ teamAddress: '/', ...runConfig }],
    memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: lead, ...runConfig }, { memberAddress: '/mate', agentDefinitionId: mate, ...runConfig }] } })).createAgentTeamRun;
  const leadRun = /"address":"\/lead"[^}]*"agent_run_id":"([^"]+)"/.exec(JSON.stringify((await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: team.teamRunId })).getTeamRunResumeConfig.executionTree))?.[1];
  const agentRun = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: solo, ...runConfig } })).createAgentRun.runId;
  summary.runs = { teamRun: team.teamRunId, leadRun, agentRun };
  const seen = new Map();
  const client = async (route) => { const s = new WS(`${nodeBase.replace('http', 'ws')}/ws/${route}`); await new Promise((res, rej) => { s.once('open', res); s.once('error', rej); });
    s.on('message', d => { for (const m of String(d).matchAll(/REPLY:(EMU-[A-Z]+-\d+)/g)) if (!seen.has(m[1])) seen.set(m[1], now()); }); return s; };
  teamClient = await client(`agent-team/${team.teamRunId}`); agentClient = await client(`agent/${agentRun}`);
  const send = { team: c => teamClient.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `team_member_input:emu:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: leadRun, content: c } })),
    agent: c => agentClient.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:emu:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: agentRun, content: c } })) };
  send.team('EMU-START-1'); send.agent('EMU-START-2');
  await waitFor('warm-up replies on the node', async () => seen.has('EMU-START-1') && seen.has('EMU-START-2'), 60_000);
  let n = 0;
  const mark = kind => { n += 1; const id = `EMU-${kind === 'team' ? 'T' : 'A'}-${n}`; send[kind](id); log('marker sent', { id }); return id; };

  // ---- the app --------------------------------------------------------------------------------------------------------
  await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  const pairing = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: `http://10.0.2.2:${proxyPort}`, serverName: 'Emulator Test Node', trustedPrivateHttpAcknowledged: true });
  if (pairing.status !== 201) throw new Error(`pairing ${pairing.status}`);
  log('device', { model: shell('getprop', 'ro.product.model').trim(), sdk: shell('getprop', 'ro.build.version.sdk').trim(), webview: (/versionName=(\S+)/.exec(shell('dumpsys', 'package', 'com.google.android.webview')) ?? [])[1] ?? null });
  adb('install', '-r', APK); shell('pm', 'clear', PKG);
  log('apk', { versionName: (/versionName=(\S+)/.exec(shell('dumpsys', 'package', PKG)) ?? [])[1] ?? null });
  shell('input', 'keyevent', 'KEYCODE_WAKEUP'); shell('wm', 'dismiss-keyguard');
  shell('am', 'start', '-a', 'android.intent.action.SEND', '-t', 'text/plain', '--es', 'android.intent.extra.TEXT', `'${pairing.body.mobileUrl}'`, '-n', `${PKG}/.MainActivity`);
  await waitFor('the run list in the app', async () => uiNodes().some(x => x.text.startsWith('Emu Team,')), 180_000, 3_000);
  log('paired through the share intent');
  // Real use opens the app from its icon: the task's root is the launcher intent, so the launcher brings that task
  // (the same activity and page) back to front later. Stop the app the share opened, open it from the launcher, tap
  // the saved node.
  shell('am', 'force-stop', PKG);
  launcher();
  // The app reopens the last node's page by itself; when it shows its node list instead, tap the saved node.
  await waitFor('the run list in the app', async () => {
    const nodes = uiNodes();
    if (nodes.some(x => x.text.startsWith('Emu Team,'))) return true;
    const saved = nodes.find(x => x.text === 'Emulator Test Node');
    if (saved && nodes.some(x => x.text === 'YOUR NODES')) shell('input', 'tap', String(Math.round(saved.x)), String(Math.round(saved.y)));
    return false;
  }, 120_000, 3_000);
  await screenshot('API-09-01-run-list'); await dumpText('API-09-01-run-list');
  log('opened from the launcher, run list shown');

  const openRow = async (name, warmup) => {
    await waitFor(`row ${name}`, async () => { const node = uiNodes().filter(x => x.text.startsWith(`${name},`)).at(-1); if (!node) return false; shell('input', 'tap', String(Math.round(node.x)), String(Math.round(node.y))); return true; }, 60_000, 1_500);
    await waitFor(`${name} conversation`, async () => screenText().includes(warmup), 60_000, 1_000);
  };
  const toList = async () => { shell('input', 'keyevent', 'KEYCODE_BACK'); await waitFor('the run list', async () => uiNodes().some(x => x.text.startsWith('Emu Agent,')), 30_000, 1_000); };

  const cycle = async ({ kind, row, warmup, doze }) => {
    await openRow(row, warmup);
    const label = `${kind}${doze ? '-doze' : ''}`;
    await screenshot(`API-09-${label}-a-open`);
    const before = mark(kind);
    const liveBefore = await waitFor(`${before} live`, async () => (screenText().includes(`REPLY:${before}`) ? now() : false), 30_000, 400);
    const activityRecord = () => /ActivityRecord\{(\w+) u0 org\.autobyteus\.mobile\/\.MainActivity t(\d+)/.exec(shell('dumpsys', 'activity', 'activities'))?.slice(1, 3).join(' task ') ?? null;
    const activityBefore = activityRecord();
    const bgAt = now();
    shell('input', 'keyevent', 'KEYCODE_HOME'); await sleep(1_000);
    shell('input', 'keyevent', 'KEYCODE_SLEEP'); await sleep(1_000);
    const screenOff = shell('dumpsys', 'power').match(/mWakefulness=(\w+)/)?.[1] ?? null;
    if (doze) { shell('dumpsys', 'battery', 'unplug'); log('doze', { forceIdle: shell('dumpsys', 'deviceidle', 'force-idle').trim() }); }
    const markers = [];
    for (const at of [15_000, 70_000, 130_000].filter(t => t < BACKGROUND_MS - 5_000)) { await sleep(Math.max(0, bgAt + at - now())); markers.push(mark(kind)); }
    await sleep(Math.max(0, bgAt + BACKGROUND_MS - now()));
    const producedAll = markers.every(id => seen.has(id));
    if (doze) { log('doze end', { unforce: shell('dumpsys', 'deviceidle', 'unforce').trim() }); shell('dumpsys', 'battery', 'reset'); }
    const fgAt = now();
    const fgWall = Date.now();
    shell('input', 'keyevent', 'KEYCODE_WAKEUP'); shell('wm', 'dismiss-keyguard');
    // What a launcher icon tap sends: the existing task comes to front (the same activity and page, not a reload).
    launcher();
    const frontAt = now();
    await sleep(500);
    const activityAfter = activityRecord();
    // The app is left alone for 5 s (AC-003's bound), then looked at; logcat gives the precise times.
    const shown = await shownBetween(text => markers.every(id => text.includes(`REPLY:${id}`)), 60_000, 4_500);
    const shownAt = shown?.noLaterThan ?? null;
    await screenshot(`API-09-${label}-b-after-foreground`); await dumpText(`API-09-${label}-b-after-foreground`);
    const next = mark(kind);
    const nextProducedAt = await waitFor(`${next} on the node`, async () => seen.get(next), 30_000, 50);
    const nextShown = await shownBetween(text => text.includes(`REPLY:${next}`), 30_000);
    const nextShownAt = nextShown?.noLaterThan ?? null;
    const result = { label, kind, doze, sameActivityAndTask: activityBefore !== null && activityBefore === activityAfter, activityBefore, activityAfter, backgroundMs: fgAt - bgAt, screenWakefulnessAfterSleep: screenOff, markers, producedAllWhileInBackground: producedAll,
      backgroundAt: bgAt, foregroundAt: fgAt, foregroundWallClock: new Date(fgWall).toISOString(), appInFrontAfterMs: frontAt - fgAt,
      streamReopenedAfterAppInFrontMs: Object.fromEntries(['agent-team', 'agent'].map(kindOfStream => [kindOfStream,
        (streamConnections(fgAt).find(c => (c.path ?? '').startsWith(`/ws/${kindOfStream}/`))?.openedAt ?? NaN) - frontAt])),
      shownAfterForegroundMs: shownAt === null ? null : shownAt - fgAt,
      shownAfterForegroundBounds: shown ? { notBeforeMs: shown.notBefore - fgAt, noLaterThanMs: shown.noLaterThan - fgAt, looks: shown.looks, averageLookMs: shown.lookMs } : null,
      nextMarker: { id: next, phoneMinusNodeMs: nextShownAt === null ? null : nextShownAt - nextProducedAt,
        bounds: nextShown ? { notBeforeMs: nextShown.notBefore - nextProducedAt, noLaterThanMs: nextShown.noLaterThan - nextProducedAt, averageLookMs: nextShown.lookMs } : null },
      streamReopenedAfterForegroundMs: Object.fromEntries(['agent-team', 'agent'].map(kindOfStream => [kindOfStream,
        (streamConnections(fgAt).find(c => (c.path ?? '').startsWith(`/ws/${kindOfStream}/`))?.openedAt ?? NaN) - fgAt])),
      liveBeforeBackgroundMs: liveBefore - bgAt,
      streamConnectionsWhileInBackground: streamConnections(bgAt + 2_000, fgAt).map(c => ({ ...c })),
      streamConnectionsAfterForeground: streamConnections(fgAt).map(c => ({ ...c })),
      note: 'shownAfterForegroundMs includes the time of the accessibility dumps (about 1 s each) and the launcher bringing the task to front' };
    summary.cycles.push(result); log('cycle', result);
    await toList();
    return result;
  };
  adb('logcat', '-b', 'all', '-c');
  await cycle({ kind: 'team', row: 'Emu Team', warmup: 'REPLY:EMU-START-1', doze: false });
  await cycle({ kind: 'agent', row: 'Emu Agent', warmup: 'REPLY:EMU-START-2', doze: false });
  await cycle({ kind: 'agent', row: 'Emu Agent', warmup: 'REPLY:EMU-START-2', doze: true });
} catch (error) {
  summary.error = String(error.stack ?? error); console.error(summary.error); process.exitCode = 1;
  await screenshot('API-09-error').catch(() => undefined); await dumpText('API-09-error').catch(() => undefined);
} finally {
  try { shell('dumpsys', 'deviceidle', 'unforce'); shell('dumpsys', 'battery', 'reset'); } catch { /* emulator gone */ }
  try {
    // The page's console lines (this node's port) and the app's lifecycle, and per cycle the resume → stream-connected times.
    const main = adb('logcat', '-d', '-v', 'time').split('\n').filter(l => /CONSOLE/.test(l) && l.includes(`:${proxyPort}/`) && !/serverStore|ServerLoading/.test(l));
    const events = adb('logcat', '-d', '-b', 'events', '-v', 'time').split('\n').filter(l => /wm_on_(resume|paused|stop|restart|start)_called|power_screen_state/.test(l) && /autobyteus|power_screen/.test(l));
    const lines = [...main, ...events].sort((a, b) => (logcatTime(a) ?? 0) - (logcatTime(b) ?? 0));
    await fs.writeFile(path.join(outputDir, 'API-09-logcat.txt'), `${lines.join('\n')}\n`);
    for (const c of summary.cycles) {
      const fg = Date.parse(c.foregroundWallClock);
      const resume = lines.find(l => /wm_on_resume_called/.test(l) && logcatTime(l) >= fg - 1_000);
      const at = resume ? logcatTime(resume) : null;
      const first = re => { const l = lines.find(x => re.test(x) && at !== null && logcatTime(x) >= at); return l ? logcatTime(l) - at : null; };
      c.logcat = { resumeLine: resume ?? null, teamConnectedAfterResumeMs: first(/"Team WebSocket transport connected"/), agentConnectedAfterResumeMs: first(/"Agent WebSocket connected"/),
        note: 'the agent stream opens only after its catch-up (stored state) is committed; the Team stream gets its snapshot right after it connects' };
    }
  } catch (error) { summary.logcatError = String(error); }
  teamClient?.close(); agentClient?.close();
  proxy.close(); for (const p of live) { p.client.destroy(); p.upstream.destroy(); }
  server.kill('SIGTERM'); await Promise.race([new Promise(r => server.once('close', r)), sleep(10_000)]); if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  summary.cleanup = { serverExited: server.exitCode !== null || server.signalCode !== null, rootRemoved: !existsSync(root) };
  summary.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'API-09-emulator-summary.json'), `${JSON.stringify(summary, null, 2).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…')}\n`);
  process.exit(process.exitCode ?? 0);
}
