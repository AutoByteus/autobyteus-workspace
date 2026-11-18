// API-11 (autobyteus-437, temporary): peers through a real prefix-stripping reverse proxy (nginx 1.30 in a test-owned
// alpine container): node B is reached only at http://127.0.0.1:<gw>/autobyteus (nginx strips /autobyteus). Two built
// nodes of this worktree on the host with the scripted AGY CLI. Pairing by invite, a signed offer read, a signed
// delegation (POST with a body hash) and the delegated run's status through the gateway.
import { spawn, execFileSync } from 'node:child_process'; import { randomBytes, randomUUID } from 'node:crypto'; import fs from 'node:fs'; import net from 'node:net'; import os from 'node:os'; import path from 'node:path';
const wt = '/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437'; const serverDir = `${wt}/autobyteus-server-ts`;
const agy = `${serverDir}/tests/fixtures/agy-failure-cli.mjs`; const out = process.argv[2];
const owner = `own_${randomBytes(32).toString('base64url')}`; const lines = []; const log = (...a) => { const l = a.join(' ').split(owner).join('own_…').replace(/abpi_[A-Za-z0-9_-]+/g, 'abpi_…'); lines.push(l); console.log(l); };
const port = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms)); const docker = (...a) => execFileSync('/tmp/abtest437/bin/docker', a, { encoding: 'utf8' });
const root = fs.realpathSync(fs.mkdtempSync('/tmp/abtest437/gw-')); const children = [];
const [pa, pb, pg] = [await port(), await port(), await port()]; const gw = `http://127.0.0.1:${pg}/autobyteus`;
const start = async (name, p, host) => { const d = path.join(root, name); fs.mkdirSync(path.join(d, 'data'), { recursive: true }); fs.mkdirSync(path.join(d, 'ws'));
  fs.writeFileSync(path.join(d, 'data/.env'), `APP_ENV=test\nLOG_LEVEL=INFO\nAUTOBYTEUS_SERVER_HOST=${host}\n`);
  const c = spawn(process.execPath, ['dist/app.js', '--host', '127.0.0.1', '--port', String(p), '--data-dir', path.join(d, 'data')], { cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: d, TMPDIR: os.tmpdir(), APP_ENV: 'test', AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner, ANTIGRAVITY_CLI_COMMAND: agy, AGY_FAKE_CASE: 'linked_skills' } });
  const s = fs.createWriteStream(path.join(out, `API-11-node-${name}.log`)); c.stdout.pipe(s); c.stderr.pipe(s); children.push(c);
  for (let i = 0; i < 120 && !(await fetch(`http://127.0.0.1:${p}/rest/health`).then(r => r.ok).catch(() => false)); i++) await sleep(500);
  const gql = async (q, v) => { const r = await fetch(`http://127.0.0.1:${p}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify({ query: q, variables: v }) }); const b = await r.json(); if (b.errors) throw new Error(`${name}: ${JSON.stringify(b.errors)}`); return b.data; };
  return { name, p, gql, ws: path.join(d, 'ws') }; };
let result = 'Fail';
try {
  log(`# API-11 gateway probe; commit ${execFileSync('git', ['-C', wt, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}; ${new Date().toISOString()}`);
  fs.writeFileSync(path.join(root, 'nginx.conf'), `events {}\nhttp { access_log /dev/stdout; server { listen 8080;\n location /autobyteus/ { proxy_pass http://host.docker.internal:${pb}/; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host $http_host; proxy_read_timeout 300s; }\n location / { return 404 'not routed'; } } }\n`);
  docker('run', '-d', '--name', 'abtest437-gateway', '-p', `127.0.0.1:${pg}:8080`, '-v', `${root}/nginx.conf:/etc/nginx/nginx.conf:ro`, 'alpine:latest', 'sh', '-c', 'apk add --no-cache nginx >/dev/null 2>&1 && nginx -g "daemon off;"');
  const A = await start('alpha', pa, `http://127.0.0.1:${pa}`); const B = await start('beta', pb, gw);
  for (let i = 0; i < 120 && !(await fetch(`${gw}/rest/health`).then(r => r.ok).catch(() => false)); i++) await sleep(1000);
  log(`gateway ${gw}/rest/health -> ${(await fetch(`${gw}/rest/health`)).status}; ${gw.replace('/autobyteus', '')}/rest/health -> ${(await fetch(`http://127.0.0.1:${pg}/rest/health`)).status} (only /autobyteus is routed)`);
  for (const n of [A, B]) await n.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  const pub = (await B.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Publisher', role: 'assistant', description: 'Publisher (gateway probe)', instructions: 'Help.', toolNames: [], defaultLaunchConfig: { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null } } })).createAgentDefinition.id;
  const invite = (await B.gql('mutation { createPeerInvite { inviteText } }')).createPeerInvite.inviteText;
  const decoded = JSON.parse(Buffer.from(invite.slice(5), 'base64url').toString()); log(`B's invite address candidates: ${JSON.stringify(decoded.addressCandidates)}`);
  const paired = (await A.gql('mutation($t:String!,$n:String!,$o:String){acceptPeerInvite(inviteText:$t,name:$n,nameOnInviter:$o){nodeId name baseUrl paired}}', { t: invite, n: 'beta-node', o: 'alpha-node' })).acceptPeerInvite;
  log(`A's peer row for B: ${JSON.stringify(paired)}`); if (paired.baseUrl !== gw || !paired.paired) throw new Error('A did not pair B at the gateway address');
  const offer = (await A.gql('query($id:String!){peerNodeOffer(nodeId:$id){refusalCode unreachableReason entries{name kind}}}', { id: paired.nodeId })).peerNodeOffer;
  log(`signed offer read A -> B through the gateway: ${JSON.stringify(offer)}`); if (offer.refusalCode || !offer.entries.some(e => e.name === 'Publisher')) throw new Error('offer');
  const del = (await A.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Delegator', role: 'assistant', description: 'x', instructions: 'x', toolNames: [] } })).createAgentDefinition.id;
  const run = (await A.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: del, workspaceRootPath: A.ws, autoExecuteTools: true, runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null } })).createAgentRun;
  const sock = new WebSocket(`ws://127.0.0.1:${pa}/ws/agent/${run.runId}?access_token=${encodeURIComponent(owner)}`); await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; }); await sleep(500);
  const id = randomUUID(); sock.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:gw:${id}`, context_file_paths: [], image_urls: [], agent_run_id: run.runId,
    content: `CALL_TOOL:${JSON.stringify({ name: 'delegate_task', arguments: { node: 'beta-node', recipient_address: '/publisher', description: 'Gateway check. Marker GW-437.' } })}` } })); await sleep(800); sock.close();
  let conv = ''; for (let i = 0; i < 120 && !(conv = JSON.stringify((await A.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: run.runId })).getRunProjection?.conversation ?? [])).includes('CALLED:'); i++) await sleep(500);
  const called = conv.split('CALLED:').pop().slice(0, 600); log(`delegate_task through the gateway: ${called.replace(/\\"/g, '"').slice(0, 300)}`);
  const remoteRun = /target_agent_run_id\\*"\s*:\s*\\*"([^"\\]+)/.exec(called)?.[1]; if (!remoteRun) throw new Error('no remote run');
  const onB = (await B.gql('query{listWorkspaceRunHistory(limitPerAgent:50){agentDefinitions{runs{runId summary}}}}')).listWorkspaceRunHistory.flatMap(g => g.agentDefinitions.flatMap(d => d.runs)).find(r => r.runId === remoteRun);
  log(`the delegated run on B: ${JSON.stringify(onB)}`); if (!onB?.summary?.includes('GW-437')) throw new Error('run on B');
  const access = docker('logs', 'abtest437-gateway'); fs.writeFileSync(path.join(out, 'API-11-nginx-access.log'), access);
  const remoteLines = access.split('\n').filter(l => l.includes('/autobyteus/rest/remote')); log(`nginx lines for /autobyteus/rest/remote*: ${remoteLines.length}; statuses ${[...new Set(remoteLines.map(l => (/" (\d{3}) /.exec(l) || [])[1]))].join(',')}`);
  const refused = fs.readFileSync(path.join(out, 'API-11-node-beta.log'), 'utf8').split('\n').filter(l => /refused/.test(l)); log(`B refusal lines: ${refused.length} ${refused.slice(0, 3).join(' | ')}`);
  result = 'Pass';
} catch (e) { log('ERROR', e.stack); }
finally { for (const c of children) c.kill('SIGTERM'); await sleep(1500); try { docker('rm', '-f', 'abtest437-gateway'); } catch {} fs.rmSync(root, { recursive: true, force: true });
  log(`result ${result}; gateway container removed; data removed`); fs.writeFileSync(path.join(out, 'API-11-gateway.log'), lines.join('\n') + '\n'); process.exitCode = result === 'Pass' ? 0 : 1; }
