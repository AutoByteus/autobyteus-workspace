// Live run streams on the phone after the path to the node drops, after the phone was in the background, and a user
// message loaded during its own turn (autobyteus-434). Cases of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by
// `mobile-shell-probe.mjs` after its own cases (`--cases=MSP-21,MSP-22,MSP-23` runs only these).
//
// Stack (owned by these cases, removed at their end, inside the probe's temp root):
// - gamma, one more node from this worktree's `autobyteus-server-ts/dist/app.js`, on the scripted AGY CLI in case
//   `interrupt_resend`: a message is answered `REPLY:<message>`; `HOLD_MS:<n>` keeps one `run_command` step open for n ms,
//   then answers. Its own node keeps these outages and runs away from the probe's shared alpha stack.
// - The phone's network path: a TCP proxy in front of gamma. Its modes: pass; refuse (every open connection destroyed,
//   new ones closed at once: Wi-Fi/LTE switch, Tailscale reconnecting, the laptop asleep); blackhole of the open
//   WebSocket connections (they stay open but forward nothing either way: a path that died silently while the phone
//   slept). Pooled HTTP connections are left alone in a blackhole, as a real node closes idle ones and answers a reuse of
//   a dead one with a reset (autobyteus-434 FU-003).
// - The phones: a headless Chrome of their own that maps 192.168.77.20 to 127.0.0.1, so the production phone bundle gamma
//   serves at /mobile is loaded from `http://192.168.77.20:<proxy port>` with that Host and Origin, as on a LAN/tailnet
//   path, and paired through Phone Access. 390×844. Visibility is set in the page (`document.visibilityState`,
//   `visibilitychange`), as the Android WebView reports background and screen-off.
// - "The agent keeps working": another client of each run's stream on the node itself (as the desktop is) sends marker
//   messages `MK-…`; the delay is the phone showing `REPLY:MK-…` minus the node producing it (seen by that client).
//
// Cases:
//   MSP-21 AC-001, AC-002  Three phones show a Team member (the Team's coordinator), a top-level agent run and an Org run's
//                  member. The path is refused for 45 s, then passes; a marker to each run is sent the moment it passes.
//                  Each phone shows its marker without any action within 35 s, and the next marker within 1 s. While the
//                  agent phone reconnects, the agent answers a marker every 2 s; every one of them ends up on the phone
//                  (the agent catch-up reads the stored state before it opens the stream: nothing may be lost there).
//   MSP-22 AC-003, AC-004  Two phones (Team member, agent run). Hidden 5 s with healthy streams, then visible: no new
//                  stream. Hidden 35 s while the open streams die silently and the agent answers a marker: no stream is
//                  opened while hidden; within 5 s of visible each phone shows the marker, the next within 1 s. Hidden while
//                  the node is refused: no attempt of the run shown while hidden (Team phone: its Team socket; agent phone:
//                  its catch-up read `GetRunProjection` or its socket), one within 2 s of visible (the agent's catch-up read
//                  first); once the node passes, the phones catch up.
//   MSP-23 AC-005  A phone sends "LONG-… HOLD_MS:30000" to the Team member and another to the agent run (a 30 s turn
//                  with a tool call). Each sending phone shows it once. A second phone opening each run during the turn
//                  shows it once, before the tool call; again after the turn. The node's stored user record of each
//                  message has `message_id` and `dedupe_key`.
import { createWriteStream, readdirSync, readFileSync, statSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { ownerSocketUrl } from './fixtures/probe-node-access.mjs';

const require = createRequire(import.meta.url);
const NodeWebSocket = require('ws');
const PHONE_HOST = '192.168.77.20';
const MODEL = 'gemini-3.8-flash-low';
const OUTAGE_MS = 45_000;

/**
 * @param probe the probe's helpers: `runCase`, `serverAt`, `freePort`, `chromium`, `executablePath`, `outputDir`,
 *   `evidence`, `sleep`, `waitFor`, `assert`, `redact`.
 */
export const runLiveReconnectCases = async (probe) => {
  const { runCase, serverAt, freePort, chromium, executablePath, outputDir, evidence, sleep, waitFor, assert, redact } = probe;
  const ids = ['MSP-21', 'MSP-22', 'MSP-23'];
  if (probe.selected && !ids.some(id => probe.selected.has(id))) return;
  const t0 = Date.now();
  const now = () => Date.now() - t0;
  const log = [];
  const note = (event, details = {}) => { log.push({ t: now(), event, ...details }); };
  evidence.liveReconnect = { log };

  // ---- gamma and the phone's path -------------------------------------------------------------------------------------
  const gamma = await serverAt('gamma', await freePort(), { AGY_FAKE_CASE: 'interrupt_resend', AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: 'all' });
  const proxyPort = await freePort();
  const phoneOrigin = `http://${PHONE_HOST}:${proxyPort}`;
  let mode = 'pass';
  const live = new Set();
  const proxy = net.createServer((client) => {
    if (mode === 'refuse') { client.destroy(); return; }
    const upstream = net.connect(gamma.port, '127.0.0.1');
    const pair = { client, upstream, webSocket: false, dead: false };
    live.add(pair);
    client.once('data', (chunk) => { pair.webSocket = /^upgrade:\s*websocket/im.test(String(chunk)); });
    client.on('data', (chunk) => { if (mode !== 'refuse' && !pair.dead) upstream.write(chunk); });
    upstream.on('data', (chunk) => { if (mode !== 'refuse' && !pair.dead) client.write(chunk); });
    const end = () => { live.delete(pair); client.destroy(); upstream.destroy(); };
    for (const socket of [client, upstream]) { socket.on('close', end); socket.on('error', end); }
  });
  await new Promise(resolve => proxy.listen(proxyPort, '127.0.0.1', resolve));
  const refuse = () => { mode = 'refuse'; for (const pair of [...live]) { pair.client.destroy(); pair.upstream.destroy(); } note('path refused', { open: live.size }); };
  const pass = () => { mode = 'pass'; note('path passes'); };
  const blackholeWebSockets = () => {
    let count = 0;
    for (const pair of live) if (pair.webSocket && !pair.dead) { pair.dead = true; count += 1; }
    note('open WebSocket connections black-holed', { count });
    return count;
  };
  /** Browser lines caused on purpose while the path is down (and shortly after, while the phone's reads fail over). */
  let outageUntil = 0;
  const outage = (on) => { outageUntil = on ? Number.POSITIVE_INFINITY : Date.now() + 5_000; };

  let browser = null;
  const phones = [];
  const gammaLog = path.join(outputDir, 'server-gamma.log');
  try {
    // ---- data on gamma ------------------------------------------------------------------------------------------------
    const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
    const def = async name => (await gamma.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
      { i: { name, role: 'assistant', description: `${name} (phone live probe)`, instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
    const leadDef = await def('Live Lead');
    const mateDef = await def('Live Mate');
    const agentDef = await def('Live Agent');
    const plannerDef = await def('Live Planner');
    const workspace = path.join(gamma.dataDir, '..', 'workspace');
    await (await import('node:fs/promises')).mkdir(workspace, { recursive: true });
    await gamma.gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
    const runConfig = { workspaceRootPath: workspace, autoExecuteTools: true, ...agy };
    const teamDef = (await gamma.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Live Team',
      description: 'phone live probe', instructions: 'Work together.', coordinatorMemberName: 'lead',
      nodes: [{ memberName: 'lead', ref: leadDef, refScope: 'SHARED' }, { memberName: 'mate', ref: mateDef, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
    const team = (await gamma.gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: teamDef,
      teamConfigs: [{ teamAddress: '/', ...runConfig }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: leadDef, ...runConfig },
        { memberAddress: '/mate', agentDefinitionId: mateDef, ...runConfig }] } })).createAgentTeamRun;
    assert(team.success, team.message);
    const teamTree = JSON.stringify((await gamma.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: team.teamRunId })).getTeamRunResumeConfig.executionTree);
    const leadRun = /"address":"\/lead"[^}]*"agent_run_id":"([^"]+)"/.exec(teamTree)?.[1];
    const agentRunResult = (await gamma.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: agentDef, ...runConfig } })).createAgentRun;
    assert(agentRunResult.success, agentRunResult.message);
    const agentRun = agentRunResult.runId;
    const orgDef = (await gamma.gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: { name: 'Live Org', description: 'phone live probe',
      instructions: 'Deliver.', handoffs: [], members: [{ memberName: 'planner', ref: plannerDef, refType: 'AGENT', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
    const org = (await gamma.gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
      { i: { agentOrgDefinitionId: orgDef, rootConfiguration: runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    assert(org.success, org.message);
    const orgRun = org.agentOrgRunId;
    const orgPlanner = (await gamma.gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: orgRun }))
      .getAgentOrgRunConfig.executionTree.rootOrg.members.find(member => member.address === '/planner')?.agentRunId;
    assert(leadRun && agentRun && orgPlanner, 'the gamma runs', { leadRun, agentRun, orgPlanner });
    evidence.liveReconnect.runs = { teamRun: team.teamRunId, leadRun, agentRun, orgRun, orgPlanner };

    // ---- the node-side clients (another window of each run) ------------------------------------------------------------
    /** First time the node delivered `REPLY:<id>` to a node-side client, per marker id. */
    const nodeSeen = new Map();
    const wsBase = gamma.baseUrl.replace(/^http/, 'ws');
    const nodeClient = async (route) => {
      // The other window is the owner's: it carries the probe's credential (autobyteus-437).
      const socket = new NodeWebSocket(ownerSocketUrl(`${wsBase}/ws/${route}`));
      await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
      socket.on('message', (data) => {
        for (const match of String(data).matchAll(/REPLY:((?:MK|LONG)-[A-Z]+-\d+)/g)) if (!nodeSeen.has(match[1])) nodeSeen.set(match[1], Date.now());
      });
      return socket;
    };
    const teamClient = await nodeClient(`agent-team/${team.teamRunId}`);
    const agentClient = await nodeClient(`agent/${agentRun}`);
    const orgClient = await nodeClient(`agent-org/${orgRun}`);
    const sendTo = {
      team: content => teamClient.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`,
        context_file_paths: [], image_urls: [], agent_run_id: leadRun, content } })),
      agent: content => agentClient.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`,
        context_file_paths: [], image_urls: [], agent_run_id: agentRun, content } })),
      org: content => orgClient.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: 'agent_org', root_run_id: orgRun, target_agent_run_id: orgPlanner,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } })),
    };
    /** The Org member's reply as stored on the node (the Org stream's client side needs its own handshake; the projection does not). */
    const orgStoredReply = async id => JSON.stringify((await gamma.gql('query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}',
      { id: orgRun, a: orgPlanner, m: '/planner' }).catch(() => ({}))).getAgentOrgMemberRunProjection?.conversation ?? []).includes(`REPLY:${id}`);
    const markerNo = { team: 0, agent: 0, org: 0 };
    const letter = { team: 'T', agent: 'A', org: 'O' };
    /** Sends a marker to one run; returns its id. */
    const mark = (kind) => { markerNo[kind] += 1; const id = `MK-${letter[kind]}-${markerNo[kind]}`; sendTo[kind](id); note('marker sent', { id }); return id; };
    /** Waits until the node produced the reply; returns the time it did. */
    const producedAt = async (kind, id, timeoutMs = 30_000) => {
      if (kind === 'org') {
        await waitFor(`${id} stored on the node`, async () => { if (await orgStoredReply(id)) { if (!nodeSeen.has(id)) nodeSeen.set(id, Date.now()); return true; } return false; }, timeoutMs);
      } else {
        await waitFor(`${id} on the node`, async () => nodeSeen.has(id), timeoutMs);
      }
      return nodeSeen.get(id);
    };
    for (const kind of ['team', 'agent', 'org']) sendTo[kind](`Start ${kind}.`);
    await waitFor('the warm-up replies stored on the node', async () => {
      const agentText = JSON.stringify((await gamma.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: agentRun })).getRunProjection?.conversation ?? []);
      const leadText = JSON.stringify((await gamma.gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}',
        { id: team.teamRunId, a: leadRun })).getTeamMemberRunProjection?.conversation ?? []);
      return agentText.includes('REPLY:Start agent.') && leadText.includes('REPLY:Start team.') && await orgStoredReply('Start org.');
    }, 60_000);
    await sleep(1_000);

    // ---- the phones ---------------------------------------------------------------------------------------------------
    browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
    const settings = await gamma.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
    assert(settings.status === 200, 'gamma Phone Access on', settings);
    const pairing = await gamma.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Gamma Test Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'gamma pairing session', pairing.status);
    let paired = null;
    const openPhone = async (label) => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC',
        ...(paired ? { storageState: paired } : {}) });
      const page = await context.newPage();
      const phone = { label, context, page, sockets: [], reads: [] };
      // Every GraphQL read the phone starts (a refused one too): the agent stream's catch-up is a `GetRunProjection` read.
      page.on('request', (request) => {
        if (request.method() !== 'POST' || !request.url().includes('/graphql')) return;
        try { const body = JSON.parse(request.postData() ?? '{}'); phone.reads.push({ op: body.operationName ?? null, runId: body.variables?.runId ?? null, at: now() }); } catch { /* not JSON */ }
      });
      page.on('websocket', (ws) => {
        const entry = { url: redact(ws.url()).replace(phoneOrigin.replace(/^http/, 'ws'), ''), openedAt: now(), closedAt: null };
        phone.sockets.push(entry);
        ws.on('close', () => { entry.closedAt = now(); });
      });
      // The browser's own request for `/favicon.ico` at the origin root carries no credential, so the node refuses it with
      // 401 before any route (node access model NA-1, NA-2; autobyteus-437; it answered 404 before). The node serves the
      // phone bundle under /mobile and the Android WebView asks for no favicon. Its console line names no URL in its text;
      // it counts as known only when the line's own source location is exactly that path.
      const browserError = (text, sourceUrl = '') => {
        const line = redact(`${label} console: ${text}`);
        let cause = Date.now() <= outageUntil ? 'the case refused or black-holed the phone\'s path on purpose' : null;
        if (!cause && /: Failed to load resource: the server responded with a status of 401 \(Unauthorized\)$/.test(line)
          && sourceUrl.startsWith(phoneOrigin) && new URL(sourceUrl).pathname === '/favicon.ico') cause = 'the browser\'s favicon request at the origin root (401 /favicon.ico, no credential)';
        // autobyteus-434 FU-004 (pre-existing, outside this change): a tap on an active Team while the phone's first history
        // read still mounts that Team in the background fails the tap's open; the user taps again (MSP-23 does, once).
        if (!cause && line.includes(`console: Failed to open team: Error: Team context '${team.teamRunId}' became mounted while it was loading.`)) {
          phone.teamOpenRaces = (phone.teamOpenRaces ?? 0) + 1;
          cause = 'FU-004: the Team was mounted by the phone\'s first history read while the tap opened it';
        }
        evidence.browserErrors.push({ case: phone.case ?? 'live-setup', line, known: Boolean(cause), ...(cause ? { cause } : {}) });
      };
      page.on('console', message => { if (message.type() === 'error') browserError(message.text(), message.location()?.url ?? ''); });
      page.on('pageerror', error => browserError(`pageerror ${error.message}`));
      page.on('requestfailed', request => evidence.failedRequests.push({ case: phone.case ?? 'live-setup', label, url: redact(request.url()), error: request.failure()?.errorText ?? null }));
      phones.push(phone);
      return phone;
    };
    const conversation = phone => phone.page.evaluate(() => document.querySelector('[data-testid="mobile-run-conversation"]')?.innerText ?? '');
    const shows = async (phone, text) => (await conversation(phone)).includes(text);
    const openRun = async (phone, key, timeoutMs = 30_000) => {
      await phone.page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
      await waitFor(`row ${key}`, async () => (await phone.page.locator(`[data-testid="mobile-run-row-${key}"] [data-testid="mobile-run-open"]`).count()) > 0, 30_000);
      await phone.page.locator(`[data-testid="mobile-run-row-${key}"] [data-testid="mobile-run-open"]`).click();
      await waitFor(`the run screen of ${key}`, async () => (await phone.page.evaluate(() => document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state'))) === 'open', timeoutMs);
    };
    const backToList = async (phone) => {
      await phone.page.locator('[data-testid="mobile-run-back"]:visible').first().click();
      await phone.page.locator('[data-testid="mobile-run-tree"]:visible').waitFor({ timeout: 20_000 });
    };
    const setVisibility = (phone, state) => phone.page.evaluate((value) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => value === 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
    /** The delay from the node producing `REPLY:<id>` to the phone showing it, or null within `timeoutMs`. */
    const phoneDelay = async (phone, kind, id, timeoutMs) => {
      const at = await producedAt(kind, id);
      try { await waitFor(`${id} on ${phone.label}`, async () => shows(phone, `REPLY:${id}`), timeoutMs); } catch { return null; }
      return Date.now() - at;
    };
    const shot = (phone, name) => phone.page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined);
    const keys = { team: `team:${team.teamRunId}`, agent: `agent:${agentRun}`, org: `org:${orgRun}` };
    const warmups = { team: 'REPLY:Start team.', agent: 'REPLY:Start agent.', org: 'REPLY:Start org.' };
    const phoneOn = async (kind, label) => {
      const phone = await openPhone(label);
      if (!paired) {
        await phone.page.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await phone.page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
        await phone.page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
        paired = await phone.context.storageState();
      } else {
        await phone.page.goto(`${phoneOrigin}/mobile`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      }
      await openRun(phone, keys[kind]);
      await waitFor(`${label}: the warm-up reply`, async () => shows(phone, warmups[kind]), 30_000);
      phone.kind = kind;
      return phone;
    };
    const socketsOf = (phone, from) => phone.sockets.filter(entry => entry.openedAt >= from && /\/ws\/agent(-team|-org)?\//.test(entry.url));
    /**
     * The reconnect attempts of the run a phone shows, and nothing of the other streams it keeps: the Team phone's Team
     * stream; the agent phone's catch-up reads of that run (`GetRunProjection`, read before the stream opens) and its stream.
     */
    const ownAttempts = (phone, from, to = Infinity) => {
      const inWindow = at => at >= from && at < to;
      if (phone.kind === 'team') return phone.sockets.filter(e => inWindow(e.openedAt) && e.url.startsWith(`/ws/agent-team/${team.teamRunId}`)).map(e => ({ socket: '/ws/agent-team/…', at: e.openedAt - from }));
      return [
        ...phone.reads.filter(e => inWindow(e.at) && e.op === 'GetRunProjection' && e.runId === agentRun).map(e => ({ read: 'GetRunProjection', at: e.at - from })),
        ...phone.sockets.filter(e => inWindow(e.openedAt) && e.url.startsWith(`/ws/agent/${agentRun}`)).map(e => ({ socket: '/ws/agent/…', at: e.openedAt - from })),
      ].sort((a, b) => a.at - b.at);
    };

    const teamPhone = await phoneOn('team', 'phone-team');
    const agentPhone = await phoneOn('agent', 'phone-agent');
    const orgPhone = await phoneOn('org', 'phone-org');
    note('phones open', { team: keys.team, agent: keys.agent, org: keys.org });

    await runCase('MSP-21', async () => {
      for (const phone of phones) phone.case = 'MSP-21';
      const before = now();
      refuse(); outage(true);
      await sleep(OUTAGE_MS);
      pass(); outage(false);
      const passedAt = Date.now();
      const passedRel = now();
      const first = { team: mark('team'), agent: mark('agent'), org: mark('org') };
      // The agent keeps answering while its phone reconnects (the read-to-open window of the agent catch-up).
      const stream = [];
      const streaming = (async () => { for (let index = 0; index < 15; index += 1) { stream.push(mark('agent')); await sleep(2_000); } })();
      const shownAfterPass = {};
      await Promise.all(Object.entries({ team: teamPhone, agent: agentPhone, org: orgPhone }).map(async ([kind, phone]) => {
        try { await waitFor(`${first[kind]} on ${phone.label}`, async () => shows(phone, `REPLY:${first[kind]}`), 60_000); shownAfterPass[kind] = Date.now() - passedAt; } catch { shownAfterPass[kind] = null; }
      }));
      await streaming;
      await Promise.all(stream.map(id => producedAt('agent', id)));
      await sleep(3_000);
      const agentText = await conversation(agentPhone);
      const missingOnAgentPhone = stream.filter(id => !agentText.includes(`REPLY:${id}`));
      const next = {};
      for (const [kind, phone] of Object.entries({ team: teamPhone, agent: agentPhone, org: orgPhone })) next[kind] = await phoneDelay(phone, kind, mark(kind), 15_000);
      const sockets = Object.fromEntries([teamPhone, agentPhone, orgPhone].map(phone => [phone.label, socketsOf(phone, before).map(({ url, openedAt, closedAt }) => ({ url: url.replace(/\?.*$/, ''), openedAt, closedAt }))]));
      for (const phone of [teamPhone, agentPhone, orgPhone]) await shot(phone, `MSP-21-${phone.label}`);
      // The collaboration stream a phone keeps for a top-level agent run (the stream of its delegated copies): each one
      // open before the outage is open again after it.
      const collaboration = Object.fromEntries([teamPhone, agentPhone, orgPhone].map((phone) => {
        const ofPhone = phone.sockets.filter(entry => entry.url.startsWith('/ws/agent-collaboration/'));
        const routes = [...new Set(ofPhone.filter(entry => entry.openedAt < before).map(entry => entry.url.replace(/\?.*$/, '')))];
        return [phone.label, routes.map((route) => {
          const reopened = ofPhone.find(entry => entry.url.startsWith(route) && entry.openedAt >= passedRel && entry.closedAt === null);
          return { route, reopenedAfterPassMs: reopened ? reopened.openedAt - passedRel : null,
          attemptsDuringOutage: ofPhone.filter(entry => entry.url.startsWith(route) && entry.openedAt >= before && entry.openedAt < passedRel).length };
        })];
      }));
      const details = { outageMs: OUTAGE_MS, shownAfterPathPassesMs: shownAfterPass, nextMarkerDelayMs: next, agentMarkersWhileReconnecting: stream.length, missingOnAgentPhone, collaboration, sockets };
      assert(Object.values(shownAfterPass).every(ms => ms !== null && ms <= 35_000), 'each phone shows its marker by itself within 35 s after the path passes (AC-001, AC-002)', details);
      assert(Object.values(next).every(ms => ms !== null && ms <= 1_000), 'the next marker within 1 s on each phone', details);
      assert(missingOnAgentPhone.length === 0, 'every reply the agent produced while its phone reconnected is on the phone', details);
      const collaborationRoutes = Object.values(collaboration).flat();
      assert(collaborationRoutes.length > 0 && collaborationRoutes.every(entry => Number.isFinite(entry.reopenedAfterPassMs) && entry.reopenedAfterPassMs <= 35_000),
        'each collaboration stream open before the outage is open again within 35 s after the path passes (AC-002, delegated copies)', details);
      return details;
    });

    await runCase('MSP-22', async () => {
      for (const phone of phones) phone.case = 'MSP-22';
      const pair = { team: teamPhone, agent: agentPhone };
      // (a) A short glance away with healthy streams: nothing reconnects.
      const glance = now();
      for (const phone of Object.values(pair)) await setVisibility(phone, 'hidden');
      await sleep(5_000);
      for (const phone of Object.values(pair)) await setVisibility(phone, 'visible');
      await sleep(3_000);
      const glanceSockets = Object.fromEntries(Object.values(pair).map(phone => [phone.label, socketsOf(phone, glance).length]));
      const glanceNext = {};
      for (const [kind, phone] of Object.entries(pair)) glanceNext[kind] = await phoneDelay(phone, kind, mark(kind), 15_000);

      // (b) Hidden 35 s while the open streams die silently and the runs answer: caught up within 5 s of visible.
      const hiddenFrom = now();
      for (const phone of Object.values(pair)) await setVisibility(phone, 'hidden');
      const blackholed = blackholeWebSockets(); outage(true);
      const meanwhile = { team: mark('team'), agent: mark('agent') };
      await Promise.all(Object.entries(meanwhile).map(([kind, id]) => producedAt(kind, id)));
      await sleep(35_000 - (now() - hiddenFrom));
      const shownWhileHidden = Object.fromEntries(await Promise.all(Object.entries(pair).map(async ([kind, phone]) => [kind, await shows(phone, `REPLY:${meanwhile[kind]}`)])));
      const openedWhileHidden = Object.fromEntries(Object.values(pair).map(phone => [phone.label, socketsOf(phone, hiddenFrom).length]));
      const visibleAt = Date.now();
      outage(false);
      for (const phone of Object.values(pair)) await setVisibility(phone, 'visible');
      const shownAfterVisible = {};
      await Promise.all(Object.entries(pair).map(async ([kind, phone]) => {
        try { await waitFor(`${meanwhile[kind]} after visible`, async () => shows(phone, `REPLY:${meanwhile[kind]}`), 15_000); shownAfterVisible[kind] = Date.now() - visibleAt; } catch { shownAfterVisible[kind] = null; }
      }));
      const hiddenNext = {};
      for (const [kind, phone] of Object.entries(pair)) hiddenNext[kind] = await phoneDelay(phone, kind, mark(kind), 15_000);

      // (c) Hidden while the node is unreachable: no attempt while hidden; an attempt at once on visible.
      const heldFrom = now();
      for (const phone of Object.values(pair)) await setVisibility(phone, 'hidden');
      await sleep(500);
      refuse(); outage(true);
      await sleep(20_000);
      // Counted per phone for its own run only (the agent phone also keeps the Team's stream).
      const attemptsWhileHidden = Object.fromEntries(Object.values(pair).map(phone => [phone.label, ownAttempts(phone, heldFrom)]));
      const shownAt = now();
      for (const phone of Object.values(pair)) await setVisibility(phone, 'visible');
      await sleep(2_000);
      const attemptsWithin2sOfVisible = Object.fromEntries(Object.values(pair).map(phone => [phone.label, ownAttempts(phone, shownAt, shownAt + 2_000)]));
      await sleep(1_000);
      pass(); outage(false);
      const back = { team: mark('team'), agent: mark('agent') };
      const backShownMs = {};
      const passedAt = Date.now();
      await Promise.all(Object.entries(pair).map(async ([kind, phone]) => {
        try { await waitFor(`${back[kind]} after the node passes`, async () => shows(phone, `REPLY:${back[kind]}`), 40_000); backShownMs[kind] = Date.now() - passedAt; } catch { backShownMs[kind] = null; }
      }));
      for (const phone of Object.values(pair)) await shot(phone, `MSP-22-${phone.label}`);
      const details = {
        glance: { hiddenMs: 5_000, newStreams: glanceSockets, nextMarkerDelayMs: glanceNext },
        hiddenDeadPath: { hiddenMs: 35_000, webSocketsBlackholed: blackholed, shownWhileHidden, streamsOpenedWhileHidden: openedWhileHidden, shownAfterVisibleMs: shownAfterVisible, nextMarkerDelayMs: hiddenNext },
        hiddenUnreachable: { hiddenMs: 20_000, attemptsWhileHidden, attemptsWithin2sOfVisible, shownAfterPathPassesMs: backShownMs },
      };
      assert(Object.values(glanceSockets).every(count => count === 0), 'a short glance with healthy streams opens no new stream (AC-003 alternate)', details);
      assert(Object.values(glanceNext).every(ms => ms !== null && ms <= 1_000), 'after the glance the streams are live', details);
      assert(blackholed >= 2, 'the open streams were black-holed', details);
      assert(Object.values(openedWhileHidden).every(count => count === 0), 'no stream opened while hidden (AC-003, QR-003)', details);
      assert(Object.values(shownAfterVisible).every(ms => ms !== null && ms <= 5_000), 'within 5 s of visible each phone shows what happened meanwhile (AC-003)', details);
      assert(Object.values(hiddenNext).every(ms => ms !== null && ms <= 1_000), 'the next marker within 1 s (AC-003)', details);
      assert(Object.values(attemptsWhileHidden).every(list => list.length === 0), 'no reconnect attempt of the shown run while hidden and unreachable: no Team socket, no agent catch-up read or socket (AC-004)', details);
      assert(Object.values(attemptsWithin2sOfVisible).every(list => list.length >= 1), 'an attempt of the shown run within 2 s of visible: the Team socket; the agent catch-up read (AC-004)', details);
      assert(attemptsWithin2sOfVisible[agentPhone.label].some(entry => entry.read === 'GetRunProjection'), 'the agent run attempts with its catch-up read first (AC-004)', details);
      assert(Object.values(backShownMs).every(ms => ms !== null), 'caught up once the node passes', details);
      return details;
    });

    await runCase('MSP-23', async () => {
      for (const phone of phones) phone.case = 'MSP-23';
      const lines = text => text.split('\n').map(line => line.trim()).filter(Boolean);
      /** The message's copies and whether the turn's tool call (its `sleep` command) comes after the one copy. */
      const view = (text, message) => {
        const all = lines(text);
        const copies = all.reduce((list, line, index) => (line === message ? [...list, index] : list), []);
        const tool = all.findIndex((line, index) => index > (copies[0] ?? Infinity) && /\bsleep\b|run_command/i.test(line));
        return { copies: copies.length, toolCallAfterMessage: tool > -1, tail: all.slice(-10) };
      };
      const composerSend = async (phone, text) => {
        const box = phone.page.locator('[data-testid="mobile-run-conversation"] textarea').last();
        const send = phone.page.locator('[data-testid="mobile-run-conversation"] button[aria-label="Send message"]').last();
        await box.fill(text);
        await waitFor('Send enabled', async () => (await send.count()) > 0 && await send.isEnabled(), 20_000);
        await send.click();
      };
      const sending = { team: teamPhone, agent: agentPhone };
      const message = { team: 'LONG-T-1 HOLD_MS:30000', agent: 'LONG-A-1 HOLD_MS:30000' };
      for (const [kind, phone] of Object.entries(sending)) await composerSend(phone, message[kind]);
      const sentAt = Date.now();
      await sleep(4_000);
      const sendingView = {};
      for (const [kind, phone] of Object.entries(sending)) sendingView[kind] = view(await conversation(phone), message[kind]);
      // A second phone opens each run while the turn runs.
      const during = {};
      const second = {};
      const openRetries = {};
      await Promise.all(Object.keys(sending).map(async (kind) => {
        const phone = await openPhone(`phone-second-${kind}`);
        phone.case = 'MSP-23';
        await phone.page.goto(`${phoneOrigin}/mobile`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await phone.page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
        await sleep(1_500);
        try { await openRun(phone, keys[kind], 8_000); openRetries[kind] = 0; } catch (error) {
          // Only the pre-existing FU-004 failure earns the user's second tap; anything else fails the case.
          if (!phone.teamOpenRaces) throw error;
          openRetries[kind] = 1;
          const back = phone.page.locator('[data-testid="mobile-run-back"]:visible');
          if (await back.count()) await back.first().click();
          await openRun(phone, keys[kind], 15_000);
        }
        await waitFor(`${phone.label}: the message`, async () => (await conversation(phone)).includes(message[kind].split(' ')[0]), 20_000).catch(() => undefined);
        await sleep(2_000);
        during[kind] = view(await conversation(phone), message[kind]);
        await shot(phone, `MSP-23-${phone.label}-during-turn`);
        second[kind] = phone;
      }));
      const duringTurnElapsedMs = Date.now() - sentAt;
      // After the turn.
      await Promise.all(Object.keys(sending).map(kind => producedAt(kind, message[kind].split(' ')[0], 60_000)));
      await sleep(2_000);
      const after = {};
      for (const [kind, phone] of Object.entries(second)) {
        await backToList(phone);
        await openRun(phone, keys[kind]);
        await waitFor(`${phone.label}: the reply`, async () => shows(phone, `REPLY:${message[kind]}`), 20_000).catch(() => undefined);
        await sleep(1_500);
        after[kind] = view(await conversation(phone), message[kind]);
        await shot(phone, `MSP-23-${phone.label}-after-turn`);
      }
      const sendingAfter = {};
      for (const [kind, phone] of Object.entries(sending)) sendingAfter[kind] = view(await conversation(phone), message[kind]);
      // The node's stored user records (raw traces under gamma's data root).
      const files = [];
      const walk = (dir) => { for (const name of readdirSync(dir)) { const full = path.join(dir, name); if (statSync(full).isDirectory()) walk(full); else if (/^raw_traces.*\.jsonl$/.test(name)) files.push(full); } };
      walk(gamma.dataDir);
      const stored = {};
      for (const kind of Object.keys(sending)) {
        const records = files.flatMap(file => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return null; } }))
          .filter(record => record?.trace_type === 'user' && String(record.content ?? '').includes(message[kind]));
        stored[kind] = records.map(record => ({ content: record.content, hasMessageId: typeof record.message_id === 'string' && record.message_id.length > 0,
          hasDedupeKey: typeof record.dedupe_key === 'string' && record.dedupe_key.length > 0 }));
      }
      const details = { message, sendingView, duringTurn: during, duringTurnElapsedMs, secondPhoneOpenRetriesFU004: openRetries, afterTurn: after, sendingAfter, stored, rawTraceFiles: files.length };
      for (const kind of Object.keys(sending)) {
        assert(sendingView[kind].copies === 1 && sendingAfter[kind].copies === 1, `${kind}: the sending phone shows the message once (BEH-006)`, details);
        assert(during[kind].copies === 1 && during[kind].toolCallAfterMessage, `${kind}: a second phone opening during the turn shows it once, before the tool call (AC-005)`, details);
        assert(after[kind].copies === 1 && after[kind].toolCallAfterMessage, `${kind}: once, before the tool call, after the turn (AC-005)`, details);
        assert(stored[kind].length === 1 && stored[kind][0].hasMessageId && stored[kind][0].hasDedupeKey, `${kind}: the stored user record has message_id and dedupe_key (AC-005)`, details);
      }
      assert(duringTurnElapsedMs < 30_000, 'the second phones read the runs during the turn', details);
      return details;
    });
  } finally {
    evidence.liveReconnect.cleanup = {};
    if (browser) await browser.close().catch(() => undefined);
    proxy.close();
    for (const pair of live) { pair.client.destroy(); pair.upstream.destroy(); }
    await gamma.stop();
    evidence.liveReconnect.cleanup = { browserClosed: true, proxyClosed: true, gammaStopped: gamma.child?.exitCode !== null || gamma.child?.signalCode !== null, gammaLog };
    createWriteStream(path.join(outputDir, 'live-reconnect-log.json')).end(`${JSON.stringify(log, null, 2)}\n`);
  }
};
