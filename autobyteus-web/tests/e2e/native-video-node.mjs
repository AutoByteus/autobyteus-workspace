// A real node for the phone apps' native video player (autobyteus-574 API/E2E): this worktree's built node
// (`autobyteus-server-ts/dist/app.js`, the phone bundle it serves at /mobile) behind a logging HTTP proxy throttled to
// about 1.5 MB/s, with test videos, a run whose message links them, and a pairing link for a phone at the proxy's origin.
// The iOS UI test `NativeVideoRealNodeUITests` runs against it; on Android the app is driven by adb and the debug
// WebView's DevTools socket (the API/E2E report of autobyteus-574 lists the steps).
//
// Run: node autobyteus-web/tests/e2e/native-video-node.mjs --output-dir=<fresh> --origin-host=<host the phone uses>
//        [--listen-host=127.0.0.1] [--bps=1500000] [--latency-ms=0] [--secrets-file=<path outside the evidence>]
// Android emulator: --origin-host=10.0.2.2 (the host's loopback). iOS simulator: a pairing link may not name a loopback
// host, so --origin-host and --listen-host are this computer's LAN address (the proxy then listens there; the node stays
// on loopback and refuses every request without a credential).
// Builds first: `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`; ffmpeg on PATH (or FFMPEG).
// It prints one JSON line (`NATIVE_VIDEO_NODE_READY {…}`, no secret) and serves a control endpoint on 127.0.0.1:
//   GET  /info            the stack (ports, run, workspace, file paths and their node URLs)
//   GET  /log?since=<ms>  the proxy's request log: method, path, Range, If-None-Match, which credential came (`phone`,
//                         `owner`, `none`), whether the URL held one, status, Content-Range, ETag, bytes, ms
//   GET  /fetch?path=<node URL>[&range=…][&ifNoneMatch=…][&as=owner|none]  one request to the node (not throttled) with the
//                         owner credential (or none): status, the range and cache headers, the body's length and SHA-256
//   POST /rewrite         replaces the wide video with other content (a new ETag)
//   POST /throttle?bps=<n> changes the file routes' rate
//   POST /latency?ms=<n>   delays each file-route answer's first byte by n ms (a slower network's round trip)
//   POST /touch           gives the wide video a new modification time (a new ETag, the same content: nothing cached)
//   POST /stop            stops everything
// The pairing link is a secret (a one-time code): it is written only to the secrets file (mode 600), never printed.
// The node runs on a test-owned data root with the probe's launch owner credential; nothing of the user's is touched.
import fs from 'node:fs/promises';
import { existsSync, mkdtempSync, realpathSync, createWriteStream } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ownerHeaders, ownerSocketUrl, probeNodeEnvironment } from './fixtures/probe-node-access.mjs';

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const appEntry = path.join(serverDir, 'dist', 'app.js');
const agyCli = path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs');
const arg = (name, fallback) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const outputDir = path.resolve(arg('output-dir', path.join(webDir, 'test-results', 'native-video-node')));
const originHost = arg('origin-host', '127.0.0.1');
const listenHost = arg('listen-host', '127.0.0.1');
let bytesPerSecond = Number(arg('bps', '1500000'));
// Each file-route answer waits this long before its first byte: a round trip of a slower network (Wi-Fi, a tailnet).
let latencyMs = Number(arg('latency-ms', '0'));
const secretsFile = path.resolve(arg('secrets-file', path.join(outputDir, '..', 'native-video-node.secrets.json')));
const MODEL = 'gemini-3.8-flash-low';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
  server.on('error', reject);
});
const waitFor = async (label, fn, ms = 60_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await fn()) return; } catch { /* retry */ } await sleep(300); }
  throw new Error(`timed out: ${label}`);
};

/** Test videos, made with ffmpeg's lavfi sources; each frame shows its own time, so a screenshot tells the position. */
const FONT = ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc'].find((file) => existsSync(file));
const makeVideo = (target, { size, seconds, bitrate, label, source }) => {
  const text = FONT ? `,drawtext=fontfile=${FONT}:text='${label} %{pts\\:hms}':fontsize=64:fontcolor=white:box=1:boxcolor=black@0.6:x=40:y=40` : '';
  execFileSync(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `${source}=size=${size}:rate=30`,
    '-t', String(seconds), '-vf', `format=yuv420p${text}`, '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', bitrate, '-maxrate', bitrate,
    '-bufsize', '12M', '-g', '60', '-movflags', '+faststart', target]);
};

const main = async () => {
  await fs.mkdir(outputDir, { recursive: true });
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'native-video-node-')));
  const dataDir = path.join(root, 'data');
  const home = path.join(root, 'home');
  const workspace = path.join(root, 'workspace');
  const outside = path.join(root, 'outside');
  for (const dir of [dataDir, home, workspace, outside, path.join(dataDir, 'media', 'video')]) await fs.mkdir(dir, { recursive: true });
  const files = { wide: path.join(workspace, 'wide-574.mp4'), tall: path.join(workspace, 'tall-574.mp4'), outside: path.join(outside, 'outside-574.mp4'),
    media: path.join(dataDir, 'media', 'video', 'media-574.mp4'), changed: path.join(root, 'changed-574.mp4') };
  makeVideo(files.wide, { size: '1280x720', seconds: 30, bitrate: '6M', label: 'WIDE-574', source: 'testsrc2' });
  makeVideo(files.changed, { size: '1280x720', seconds: 30, bitrate: '6M', label: 'CHANGED-574', source: 'smptehdbars' });
  makeVideo(files.tall, { size: '720x1280', seconds: 10, bitrate: '3M', label: 'TALL-574', source: 'testsrc2' });
  await fs.copyFile(files.wide, files.outside);
  await fs.copyFile(files.wide, files.media);

  // The node.
  const nodePort = await freePort();
  const proxyPort = await freePort();
  const controlPort = await freePort();
  const nodeUrl = `http://127.0.0.1:${nodePort}`;
  const phoneOrigin = `http://${originHost}:${proxyPort}`;
  await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${nodeUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
  const nodeLog = createWriteStream(path.join(outputDir, 'node.log'));
  const node = spawn(process.execPath, [appEntry, '--host', '127.0.0.1', '--port', String(nodePort), '--data-dir', dataDir], { cwd: serverDir,
    stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN',
      AUTOBYTEUS_SERVER_HOST: nodeUrl, ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: 'linked_skills', ...probeNodeEnvironment() } });
  node.stdout.pipe(nodeLog); node.stderr.pipe(nodeLog);
  const stop = async () => { node.kill('SIGTERM'); await Promise.race([new Promise((resolve) => node.once('close', resolve)), sleep(10_000)]); if (node.exitCode === null) node.kill('SIGKILL'); };
  stopNode = stop;
  process.on('SIGINT', async () => { await stop(); process.exit(130); });
  await waitFor('the node answers', async () => (await fetch(`${nodeUrl}/rest/health`)).ok, 120_000);
  const gql = async (query, variables) => {
    const body = await (await fetch(`${nodeUrl}/graphql`, { method: 'POST', headers: ownerHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
    return body.data;
  };
  const rest = async (method, route, body) => {
    const response = await fetch(`${nodeUrl}/rest${route}`, { method, headers: ownerHeaders(body ? { 'content-type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, body: await response.json().catch(() => null) };
  };

  // A run in the workspace whose message links the videos (file links: absolute paths).
  const workspaceId = (await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } })).createWorkspace.workspaceId;
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
  const definitionId = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Video Checker', role: 'assistant',
    description: 'Native video probe (autobyteus-574)', instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const created = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: definitionId, workspaceRootPath: workspace, autoExecuteTools: true, ...agy } })).createAgentRun;
  if (!created.success) throw new Error(created.message);
  const runId = created.runId;
  const socket = new WebSocket(ownerSocketUrl(`${nodeUrl.replace(/^http/, 'ws')}/ws/agent/${runId}`));
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  await sleep(400);
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [],
    agent_run_id: runId, content: `ECHO_INPUT VIDEO-574 the wide video ${files.wide} and the tall video ${files.tall}` } }));
  await sleep(800);
  socket.close();
  await waitFor('the run\'s reply', async () => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []).includes('VIDEO-574'));

  // Phone Access and a pairing link for a phone at the proxy's origin.
  const settings = await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  if (settings.status !== 200) throw new Error(`Phone Access: ${settings.status}`);
  const pairing = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Video Test Node', trustedPrivateHttpAcknowledged: true });
  if (pairing.status !== 201 || !pairing.body?.mobileUrl) throw new Error(`pairing session: ${pairing.status} ${JSON.stringify(pairing.body?.error ?? pairing.body?.message ?? '')}`);
  await fs.writeFile(secretsFile, JSON.stringify({ pairingLink: pairing.body.mobileUrl }), { mode: 0o600 });

  // The logging, throttled proxy (HTTP, and WebSocket upgrades passed through).
  const log = [];
  let nextFreeAt = 0;
  const paced = async (bytes) => {
    const now = Date.now();
    nextFreeAt = Math.max(now, nextFreeAt) + (bytes / bytesPerSecond) * 1000;
    if (nextFreeAt - now > 1) await sleep(nextFreeAt - now);
  };
  const credentialKind = (value) => {
    if (!value) return 'none';
    const token = String(value).replace(/^Bearer\s+/i, '');
    return token.startsWith('mra_') ? 'phone' : ownerHeaders().authorization.endsWith(token) ? 'owner' : 'other';
  };
  const urlHoldsCredential = (url) => /mra_[A-Za-z0-9]/.test(url) || /(access_token|token|credential)=/i.test(url);
  // A pairing link's query holds its one-time code: redacted like a credential.
  const redactUrl = (url) => url.replace(/(access_token|token|credential|pairing)=[^&]+/gi, '$1=<redacted>').replace(/mra_[A-Za-z0-9_-]+/g, 'mra_<redacted>');
  const proxy = http.createServer((request, response) => {
    const started = Date.now();
    const entry = { at: started, method: request.method, path: redactUrl(request.url), range: request.headers.range ?? null, ifNoneMatch: request.headers['if-none-match'] ?? null,
      credential: credentialKind(request.headers.authorization), urlCredential: urlHoldsCredential(request.url), userAgent: (request.headers['user-agent'] ?? '').slice(0, 60) };
    const upstream = http.request({ host: '127.0.0.1', port: nodePort, method: request.method, path: request.url, headers: request.headers }, async (answer) => {
      Object.assign(entry, { status: answer.statusCode, contentRange: answer.headers['content-range'] ?? null, etag: answer.headers.etag ?? null,
        cacheControl: answer.headers['cache-control'] ?? null, acceptRanges: answer.headers['accept-ranges'] ?? null, bytes: 0 });
      answer.pause();
      const throttled = /\/rest\/(workspaces\/[^/]+\/(content|static)|node-files\/content|files\/)/.test(request.url);
      if (throttled && latencyMs > 0) await sleep(latencyMs);
      response.writeHead(answer.statusCode, answer.headers);
      // Each chunk is written after its throttle wait, in order; the response ends only after the last one is written
      // (a stream emits 'end' right after its last 'data', even while paused).
      let written = Promise.resolve();
      answer.on('data', (chunk) => {
        answer.pause();
        written = written.then(async () => {
          if (throttled) await paced(chunk.length);
          entry.bytes += chunk.length;
          if (!response.write(chunk)) await new Promise((resolve) => response.once('drain', resolve));
          answer.resume();
        });
      });
      answer.on('end', () => { written.then(() => { entry.ms = Date.now() - started; response.end(); }); });
      answer.on('error', () => response.destroy());
      response.on('close', () => { entry.ms ??= Date.now() - started; entry.aborted = !answer.complete; answer.destroy(); });
      answer.resume();
    });
    upstream.on('error', () => { entry.status = 502; response.writeHead(502); response.end(); });
    request.pipe(upstream);
    log.push(entry);
  });
  proxy.on('upgrade', (request, client, head) => {
    log.push({ at: Date.now(), method: 'UPGRADE', path: redactUrl(request.url), credential: credentialKind(request.headers.authorization), urlCredential: urlHoldsCredential(request.url) });
    const upstream = net.connect(nodePort, '127.0.0.1', () => {
      upstream.write(`${request.method} ${request.url} HTTP/1.1\r\n${Object.entries(request.headers).map(([key, value]) => `${key}: ${value}`).join('\r\n')}\r\n\r\n`);
      if (head?.length) upstream.write(head);
      upstream.pipe(client); client.pipe(upstream);
    });
    upstream.on('error', () => client.destroy()); client.on('error', () => upstream.destroy());
  });
  await new Promise((resolve) => proxy.listen(proxyPort, listenHost, resolve));

  const nodeUrlOf = (file) => file.startsWith(workspace)
    ? `/rest/workspaces/${encodeURIComponent(workspaceId)}/content?path=${encodeURIComponent(path.relative(workspace, file))}`
    : file.startsWith(path.join(dataDir, 'media')) ? `/rest/files/video/${encodeURIComponent(path.basename(file))}` : `/rest/node-files/content?path=${encodeURIComponent(file)}`;
  const info = { nodePort, proxyPort, controlPort, phoneOrigin, root, runId, workspaceId, workspace, bytesPerSecond,
    files: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, { path: file, url: key === 'changed' ? null : nodeUrlOf(file) }])),
    staticWide: `/rest/workspaces/${encodeURIComponent(workspaceId)}/static/${encodeURIComponent(path.basename(files.wide))}`,
    sizes: Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, file]) => [key, (await fs.stat(file)).size]))) };
  const control = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://control');
    const json = (value) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)); };
    if (url.pathname === '/info') return json(info);
    if (url.pathname === '/log') return json(log.filter((entry) => entry.at >= Number(url.searchParams.get('since') ?? 0)));
    if (url.pathname === '/fetch') {
      const headers = url.searchParams.get('as') === 'none' ? {} : ownerHeaders();
      if (url.searchParams.get('range')) headers.range = url.searchParams.get('range');
      if (url.searchParams.get('ifNoneMatch')) headers['if-none-match'] = url.searchParams.get('ifNoneMatch');
      const answer = await fetch(`${nodeUrl}${url.searchParams.get('path')}`, { headers });
      const body = Buffer.from(await answer.arrayBuffer());
      const pick = ['content-range', 'accept-ranges', 'etag', 'cache-control', 'content-length', 'content-type'];
      return json({ status: answer.status, headers: Object.fromEntries(pick.map((key) => [key, answer.headers.get(key)])), length: body.length,
        sha256: createHash('sha256').update(body).digest('hex') });
    }
    if (url.pathname === '/rewrite' && request.method === 'POST') { await fs.copyFile(files.changed, files.wide); return json({ rewritten: true, size: (await fs.stat(files.wide)).size }); }
    if (url.pathname === '/touch' && request.method === 'POST') { const now = new Date(); await fs.utimes(files.wide, now, now); return json({ touched: true }); }
    if (url.pathname === '/latency' && request.method === 'POST') { latencyMs = Math.max(0, Number(url.searchParams.get('ms')) || 0); return json({ latencyMs }); }
    if (url.pathname === '/throttle' && request.method === 'POST') { bytesPerSecond = Number(url.searchParams.get('bps')) || bytesPerSecond; return json({ bytesPerSecond }); }
    if (url.pathname === '/stop' && request.method === 'POST') { json({ stopping: true }); await fs.writeFile(path.join(outputDir, 'proxy-log.json'), JSON.stringify(log, null, 1)); await stop(); proxy.close(); control.close(); process.exit(0); }
    response.writeHead(404); response.end();
  });
  await new Promise((resolve) => control.listen(controlPort, '127.0.0.1', resolve));
  await fs.writeFile(path.join(outputDir, 'stack-info.json'), JSON.stringify(info, null, 1));
  console.log(`NATIVE_VIDEO_NODE_READY ${JSON.stringify({ controlPort, proxyPort, phoneOrigin, runId, secretsFile })}`);
};

// A failed start stops the node it started (nothing is left running).
let stopNode = async () => {};
main().catch(async (error) => { console.error(`native-video-node: ${error.stack ?? error}`); await stopNode(); process.exit(1); });
