// A stopped delegator's run on the phone (autobyteus-461 SCN-005 / AC-007, REQ-002, REQ-004, SR-045 … SR-048; code review O-1).
// Cases of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after its other cases
// (`--cases=MSP-53,MSP-54,MSP-55` runs only these). The desktop layout of the same journeys is
// `stopped-delegator-views-probe.mjs` (SDV-01 … SDV-03).
//
// Stack (owned by these cases, removed at their end, inside the probe's temp root): eta, one more node from this worktree's
// `autobyteus-server-ts/dist/app.js` with the probe's owner credential, on the scripted AGY CLI (`linked_skills`:
// `CALL_TOOL:{…}` makes the agent call the real tool; any other message is answered "OK"); one phone on the production phone
// bundle eta serves at /mobile, in a headless Chrome of its own that maps 192.168.77.31 to 127.0.0.1, paired through Phone
// Access.
//
// Each case: a root of one kind (agent run, team run, org run) whose Manager delegated a Project Task to a worker agent
// (the Manager's own `delegate_task` call); the root is stopped (its Stop mutation). On the phone, from the run list:
//   - the stopped root's row shows stopped (`data-status`), sampled for 15 s (O-1);
//   - the worker's row is listed under the root; the user opens it and sends a message: the worker's reply shows live;
//   - the root stays stopped on the node and its row keeps showing stopped for 15 s after that child command (O-1);
//   - the user opens the root and messages its own member (the Manager): the root starts (agent) or is restored (team,
//     org) and the Manager's reply shows live.
//   MSP-53 agent root, MSP-54 team root, MSP-55 org root.
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ownerSocketUrl } from './fixtures/probe-node-access.mjs';

const PHONE_HOST = '192.168.77.31';
const MODEL = 'gemini-3.8-flash-low';
const RUNNING = new Set(['running', 'initializing', 'idle', 'active']);

/**
 * @param probe the probe's helpers: `runCase`, `serverAt`, `freePort`, `chromium`, `executablePath`, `outputDir`,
 *   `evidence`, `selected`, `sleep`, `waitFor`, `assert`, `redact`.
 */
export const runStoppedDelegatorCases = async (probe) => {
  const { runCase, serverAt, freePort, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact } = probe;
  const ids = ['MSP-53', 'MSP-54', 'MSP-55'];
  if (!ids.some((id) => !selected || selected.has(id))) return;
  const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined);
  const eta = await serverAt('eta', await freePort(), { AGY_FAKE_CASE: 'linked_skills' });
  const phoneOrigin = `http://${PHONE_HOST}:${eta.port}`;
  let phoneBrowser = null;
  try {
    // ---- the node's data, through its public API ----------------------------------------------------------------------
    const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
    const workspace = path.join(eta.dataDir, '..', 'workspace-stopped-delegator');
    await fs.mkdir(workspace, { recursive: true });
    await eta.gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
    const runConfig = { workspaceRootPath: workspace, autoExecuteTools: true, ...agy };
    const agentDef = async (name) => (await eta.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
      { i: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
    const wsBase = eta.baseUrl.replace(/^http/, 'ws');
    const sendOver = async (route, payload) => {
      const socket = new WebSocket(ownerSocketUrl(`${wsBase}/ws/${route}`));
      await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
      await sleep(300);
      socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload }));
      await sleep(600);
      socket.close();
    };
    const projection = async (root) => JSON.stringify(root.kind === 'agent'
      ? (await eta.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: root.rootId })).getRunProjection?.conversation ?? []
      : root.kind === 'team'
        ? (await eta.gql('query($t:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$t,agentRunId:$a){conversation}}', { t: root.rootId, a: root.managerRunId })).getTeamMemberRunProjection?.conversation ?? []
        : (await eta.gql('query($o:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$o,agentRunId:$a,memberAddress:$m){conversation}}', { o: root.rootId, a: root.managerRunId, m: '/manager' })).getAgentOrgMemberRunProjection?.conversation ?? []);
    /** The Manager's own tool call, as the agent makes it; returns its result once stored. */
    const managerCall = async (root, name, args) => {
      const before = (await projection(root)).split('CALLED:').length;
      const content = `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
      if (root.kind === 'org') {
        await sendOver(`agent-org/${root.rootId}`, { root_subject_kind: 'agent_org', root_run_id: root.rootId, target_agent_run_id: root.managerRunId,
          command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] });
      } else {
        await sendOver(root.kind === 'agent' ? `agent/${root.rootId}` : `agent-team/${root.rootId}`, { agent_run_id: root.managerRunId, content,
          message_id: randomUUID(), dedupe_key: `${root.kind === 'agent' ? 'agent_run_input' : 'team_member_input'}:probe:${randomUUID()}`, context_file_paths: [], image_urls: [] });
      }
      let text = '';
      await waitFor(`${name} by the ${root.kind} Manager`, async () => (text = await projection(root)).split('CALLED:').length > before, 60_000);
      return text.split('CALLED:').at(-1);
    };
    const isActive = async (root) => root.kind === 'agent'
      ? Boolean((await eta.gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}', { id: root.rootId })).getAgentRunResumeConfig?.isActive)
      : root.kind === 'team'
        ? Boolean((await eta.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive}}', { id: root.rootId })).getTeamRunResumeConfig.isActive)
        : Boolean((await eta.gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){isActive}}', { id: root.rootId })).getAgentOrgRunConfig.isActive);
    const stop = async (root) => {
      const r = Object.values(await eta.gql(root.kind === 'agent' ? 'mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}'
        : root.kind === 'team' ? 'mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}'
          : 'mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id: root.rootId }))[0];
      assert(r.success, `stop the ${root.kind} root`, r);
      await waitFor(`the ${root.kind} root stopped`, async () => !(await isActive(root)), 30_000);
    };
    const project = (await eta.gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `Stopped delegator ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
    /** A root of `kind` whose Manager delegated a Project Task to its worker; the root is then stopped. */
    const rootOf = async (kind) => {
      const label = `${kind} ${randomUUID().slice(0, 4)}`;
      const names = { manager: `Manager ${label}`, worker: `Worker ${label}` };
      const manager = await agentDef(names.manager);
      await agentDef(names.worker);
      let root;
      if (kind === 'agent') {
        const r = (await eta.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: manager, ...runConfig } })).createAgentRun;
        assert(r.success, r.message); root = { kind, rootId: r.runId, managerRunId: r.runId, key: `agent:${r.runId}` };
      } else if (kind === 'team') {
        const team = (await eta.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: `Team ${label}`, description: label,
          instructions: 'Deliver.', coordinatorMemberName: 'manager', nodes: [{ memberName: 'manager', ref: manager, refScope: 'SHARED' }], defaultLaunchConfig: agy } })).createAgentTeamDefinition.id;
        const r = (await eta.gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: team,
          teamConfigs: [{ teamAddress: '/', ...runConfig }], memberConfigs: [{ memberAddress: '/manager', agentDefinitionId: manager, ...runConfig }] } })).createAgentTeamRun;
        assert(r.success, r.message);
        const tree = (await eta.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: r.teamRunId })).getTeamRunResumeConfig.executionTree;
        root = { kind, rootId: r.teamRunId, managerRunId: tree.root_team.members.find((m) => m.address === '/manager').agent_run_id, key: `team:${r.teamRunId}` };
      } else {
        const org = (await eta.gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: { name: `Org ${label}`, description: label,
          instructions: 'Deliver.', handoffs: [], members: [{ memberName: 'manager', ref: manager, refType: 'AGENT', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
        const r = (await eta.gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
          { i: { agentOrgDefinitionId: org, rootConfiguration: runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
        assert(r.success, r.message);
        const tree = (await eta.gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: r.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
        root = { kind, rootId: r.agentOrgRunId, managerRunId: tree.rootOrg.members.find((m) => m.address === '/manager').agentRunId, key: `org:${r.agentOrgRunId}` };
      }
      const task = (await eta.gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId: project, title: `Notes ${label}`, description: 'Write the notes.' } })).createProjectTask.taskId;
      const result = await managerCall(root, 'delegate_task', { recipient_address: `/${names.worker.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, task_id: task });
      const worker = /target_agent_run_id\\*"\s*:\s*\\*"([^"\\]+)/.exec(result)?.[1];
      assert(worker, `the ${kind} Manager delegated to its worker`, { result: redact(result.slice(0, 600)) });
      await stop(root);
      return { ...root, worker, names };
    };

    // The three roots exist before the phone pairs (an empty run list shows no run tree).
    const roots = { agent: await rootOf('agent'), team: await rootOf('team'), org: await rootOf('org') };
    evidence.stoppedDelegatorRoots = Object.fromEntries(Object.entries(roots).map(([kind, r]) => [kind, { rootId: r.rootId, worker: r.worker }]));

    // ---- the phone ---------------------------------------------------------------------------------------------------
    phoneBrowser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
    const settings = await eta.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
    assert(settings.status === 200, 'eta Phone Access on', settings);
    const pairing = await eta.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Eta Test Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'eta pairing session', pairing.status);
    const context = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(redact(`pageerror ${error.message}`)));
    await page.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 }).catch(async (error) => { await shot(page, 'msp-37-pairing'); throw error; });
    const conversation = () => page.evaluate(() => document.querySelector('[data-testid="mobile-run-conversation"]')?.innerText ?? '');
    const okCount = (text) => (text.match(/\bOK\b/g) ?? []).length;
    const toList = async () => {
      if (await page.locator('[data-testid="mobile-run-tree"]:visible').count()) return;
      await page.locator('[data-testid="mobile-run-back"]:visible').first().click();
      await page.locator('[data-testid="mobile-run-tree"]:visible').waitFor({ timeout: 20_000 });
    };
    const rowStatus = (key) => page.locator(`[data-testid="mobile-run-row-${key}"] [data-testid="mobile-run-status-dot"]`).first().getAttribute('data-status').catch(() => null);
    /** The root row's shown status, sampled for `ms`: never running (O-1). */
    const showsStopped = async (root, ms, label, out) => {
      await toList();
      await waitFor(`row ${root.key}`, async () => (await page.locator(`[data-testid="mobile-run-row-${root.key}"]`).count()) > 0, 60_000);
      const samples = [];
      const end = Date.now() + ms;
      while (Date.now() < end) { samples.push(await rowStatus(root.key)); await sleep(1_500); }
      out.rootRowStatus = { ...(out.rootRowStatus ?? {}), [label]: samples };
      assert(samples.every((status) => status !== null && !RUNNING.has(status)), `${root.kind}: the stopped root shows as running on the phone (${label})`, out);
    };
    const unfold = async (root) => {
      for (let round = 0; round < 4; round += 1) {
        for (const toggle of await page.locator(`[data-test="mobile-run-row"][data-testid^="mobile-run-row-${root.key}"][aria-expanded="false"] [data-testid="mobile-run-toggle"]`).all()) await toggle.click({ timeout: 1_500 }).catch(() => undefined);
        await sleep(400);
      }
    };
    /** The worker's row under the root (its key starts with the root's), found by the worker's run ID or its name. */
    const workerRow = async (root) => {
      for (const row of await page.locator(`[data-test="mobile-run-row"][data-testid^="mobile-run-row-${root.key}/"]`).all()) {
        const key = await row.getAttribute('data-testid');
        const name = await row.locator('[data-testid="mobile-run-name"]').innerText().catch(() => '');
        if (key.includes(root.worker) || name.toLowerCase().includes(root.names.worker.toLowerCase())) return row;
      }
      return null;
    };
    const listedRows = () => page.evaluate(() => [...document.querySelectorAll('[data-test="mobile-run-row"]')].map((li) => ({ key: li.getAttribute('data-testid'),
      depth: li.getAttribute('data-depth'), expanded: li.getAttribute('aria-expanded'), name: li.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() })));
    /** What the node itself lists (the phone's list reads), for a failure's details: the agent runs and the root's rows. */
    const nodeLists = async (root) => {
      const history = (await eta.gql('query{listWorkspaceRunHistory(limitPerAgent:20){agentDefinitions{agentName runs{runId isActive hasCollaboration}} teamDefinitions{teamDefinitionName runs{teamRunId isActive members{memberAddress agentRunId}}}}}', {})).listWorkspaceRunHistory;
      const listedAgentRuns = history.flatMap((ws) => ws.agentDefinitions.flatMap((d) => d.runs.map((r) => ({ agent: d.agentName, ...r }))));
      const rootRows = root.kind === 'agent'
        ? (await eta.gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: root.rootId }).catch((e) => ({ error: String(e.message ?? e) })))
        : root.kind === 'team'
          ? (await eta.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: root.rootId }).catch((e) => ({ error: String(e.message ?? e) })))
          : (await eta.gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}', { id: root.rootId }).catch((e) => ({ error: String(e.message ?? e) })));
      return { listedAgentRuns, workerListedAsAgentRun: listedAgentRuns.some((r) => r.runId === root.worker), rootRows: redact(JSON.stringify(rootRows)).slice(0, 4000) };
    };
    const openRow = async (row, label) => {
      const rowKey = await row.getAttribute('data-testid').catch(() => null);
      await row.locator('[data-testid="mobile-run-open"]').first().click();
      await waitFor('the run screen', async () => (await page.evaluate(() => document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state'))) === 'open', 30_000)
        .catch(async (error) => {
          error.details = { rowKey, screenState: await page.evaluate(() => document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state') ?? null),
            alerts: await page.evaluate(() => [...document.querySelectorAll('[role="alert"], [role="status"], [data-testid*="error"], [data-testid*="notice"]')].map((el) => el.textContent?.trim()).filter(Boolean).slice(0, 10)),
            openControls: await row.locator('[data-testid="mobile-run-open"]').count().catch(() => -1) };
          await shot(page, `${label}-run-screen-not-open`);
          throw error;
        });
    };
    const composerSend = async (text) => {
      const box = page.locator('[data-testid="mobile-run-conversation"] textarea').last();
      const send = page.locator('[data-testid="mobile-run-conversation"] button[aria-label="Send message"]').last();
      await box.fill(text);
      await waitFor('Send enabled', async () => (await send.count()) > 0 && await send.isEnabled(), 20_000);
      await send.click();
    };
    const workerHas = async (root, marker) => JSON.stringify((await eta.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: root.worker })).getRunProjection?.conversation ?? []).includes(marker);

    const journey = (id, kind) => runCase(id, async () => {
      const root = roots[kind];
      const out = { root: { kind, rootId: root.rootId, worker: root.worker } };
      await toList();
      await showsStopped(root, 6_000, 'listed while stopped', out);
      // SR-073 (as at base): a listed team's or org's delegated rows show once its view is open (an agent run's show in
      // the list through hasCollaboration). Opening never starts the run (REQ-004); O-1 is sampled again below.
      if (kind !== 'agent') {
        await openRow(page.locator(`[data-testid="mobile-run-row-${root.key}"]`).first(), `${id.toLowerCase()}-root-view`);
        out.rootActiveAfterOpen = await isActive(root);
        assert(!out.rootActiveAfterOpen, `${kind}: opening the stopped root started it`, out);
        await toList();
      }
      await unfold(root);
      let row = null;
      await waitFor(`the worker's row under the ${kind} root`, async () => { await unfold(root); return Boolean(row = await workerRow(root)); }, 30_000)
        .catch(async (error) => {
          error.details = { rows: await listedRows(), node: await nodeLists(root).catch((e) => ({ error: String(e.message ?? e) })) };
          await shot(page, `${id.toLowerCase()}-worker-row-missing`);
          throw error;
        });
      // REQ-002: a delegated run is shown under the run that delegated it, once: never also as a top-level run.
      const topLevelWorker = (await listedRows()).filter((r) => r.depth === '0' && r.key?.includes(root.worker));
      out.workerTopLevelRows = topLevelWorker;
      if (topLevelWorker.length) out.node = await nodeLists(root).catch((e) => ({ error: String(e.message ?? e) }));
      await openRow(row, `${id.toLowerCase()}-worker`);
      const before = okCount(await conversation());
      const marker = `PHONE-STOPPED-${kind}`;
      await composerSend(`Status of the notes? Marker ${marker}`);
      await waitFor(`the worker's reply live (${kind})`, async () => { const text = await conversation(); return text.includes(marker) && okCount(text) > before; }, 60_000);
      out.markerInWorkerRun = await workerHas(root, marker);
      assert(out.markerInWorkerRun, `${kind}: the message reached the worker's own run`, out);
      out.rootActiveAfterChild = await isActive(root);
      assert(!out.rootActiveAfterChild, `${kind}: the stopped root was started by a message to its worker`, out);
      await shot(page, `${id.toLowerCase()}-worker-answered`);
      await showsStopped(root, 15_000, 'after a child command', out);
      // REQ-002 again after the worker was opened: opening its row must not add it as a top-level run.
      out.workerTopLevelRowsAfterOpen = (await listedRows()).filter((r) => r.depth === '0' && r.key?.includes(root.worker));
      // The user's message to the root's own member (the Manager) starts it: back on the list, the root's own row (agent)
      // or its Manager member's row (team, org: by the member's run ID in its key, else its member name `manager`).
      await toList();
      await unfold(root);
      let managerRow = page.locator(`[data-testid="mobile-run-row-${root.key}"]`).first();
      if (kind !== 'agent') {
        managerRow = null;
        const rows = [];
        for (const candidate of await page.locator(`[data-test="mobile-run-row"][data-testid^="mobile-run-row-${root.key}"]`).all()) {
          const key = await candidate.getAttribute('data-testid');
          const name = (await candidate.locator('[data-testid="mobile-run-name"]').first().innerText().catch(() => '')).trim();
          rows.push({ key, name });
          if (!managerRow && !key.includes(root.worker) && (key.includes(root.managerRunId) || /^manager$/i.test(name))) managerRow = candidate;
        }
        out.ownRows = rows;
        assert(managerRow, `${kind}: the Manager's row is listed under the root`, out);
      }
      await openRow(managerRow, `${id.toLowerCase()}-manager`);
      const ownMarker = `PHONE-OWN-${kind}`;
      const beforeOwn = okCount(await conversation());
      await composerSend(`Back to work. Marker ${ownMarker}`);
      await waitFor(`the ${kind} root started on its member's message`, () => isActive(root), 60_000);
      await waitFor(`the Manager's reply live (${kind})`, async () => { const text = await conversation(); return text.includes(ownMarker) && okCount(text) > beforeOwn; }, 60_000);
      out.rootStartedOnOwnMember = true;
      await shot(page, `${id.toLowerCase()}-root-started`);
      assert(errors.length === 0, 'phone page errors', errors);
      assert(out.workerTopLevelRows.length === 0 && out.workerTopLevelRowsAfterOpen.length === 0,
        `${kind}: the delegated worker is also listed as a top-level run (REQ-002: once)`, out);
      return out;
    });
    await journey('MSP-53', 'agent');
    await journey('MSP-54', 'team');
    await journey('MSP-55', 'org');
  } finally {
    await phoneBrowser?.close().catch(() => undefined);
    await eta.stop?.().catch(() => undefined);
  }
};
