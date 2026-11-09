// A closed Task's delegated runs leave every run list, not only the window whose open run is their host (autobyteus-446).
// Cases of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after all its other cases
// (`--cases=MSP-24,MSP-25,MSP-26,MSP-27` runs only these).
//
// Stack of MSP-24…26 (owned by these cases, removed at their end, inside the probe's temp root):
// - delta, one more node from this worktree's `autobyteus-server-ts/dist/app.js` with the probe's owner credential, on
//   the scripted AGY CLI (`linked_skills`: `CALL_TOOL:{…}` makes the agent call the real tool). Data, in the shape of the
//   user's report: a "Project Task Manager" (PTM) run delegated Task A to the agent "Release Notes Writer" and Task B to the
//   Team "Docs Review Team"; a Team "Live Team" whose lead delegated Task C to an agent; a plain run "Other".
// - Two phones on the production phone bundle delta serves at /mobile, in a headless Chrome of their own that maps
//   192.168.77.30 to 127.0.0.1 (Host and Origin are a private address, as on a LAN/tailnet), paired through Phone Access:
//   phone-host last opened the PTM (its open run is the host, so its live stream follows it);
//   phone-other last opened "Other" (the PTM is only listed), as on the user's phone.
//   Both are on the run list with the PTM (and the Live Team) unfolded. Each phone's GraphQL reads are recorded.
// - Closes and reopens come from the agents' own `update_task` calls (the PM in the user's report); a user has no status
//   change on Tasks (`updateProjectTask` carries none).
//
// Cases:
//   MSP-24 AC-001, AC-003, AC-004, AC-005  50 s with nothing changing: phone-other reads the batched statuses about once per
//                  refresh and the PTM's collaboration view never. The PTM closes Task A and Task B: on phone-other both
//                  delegated rows leave within 10 s of each close (before the fix: still listed after 120 s), on phone-host
//                  within 1 s; phone-other re-reads the PTM's view at most once per close and not again afterwards. The PTM
//                  reopens Task A: its row returns on phone-other within 10 s.
//   MSP-25 AC-006  phone-other in the background (page hidden) when the PTM closes Task A again: no history, statuses or view
//                  read while hidden; shown again, the row leaves within 10 s.
//   MSP-26 design Risks (Team hosts)  The Live Team's lead closes Task C (its own delegated Task) while phone-other shows
//                  "Other": the delegated row under the lead leaves within 10 s.
//   MSP-27 AC-002  A desktop window (`nuxt dev` against alpha, the probe's PTM) whose open run is a plain run: the PTM is
//                  active and read as active first (a host turning active is re-read by the older rule and would not test
//                  this one); 12 s with no view read; the PTM closes Task B: its Team row leaves the desktop list within
//                  10 s. Runs last (no later case uses alpha's Task B).
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { attachToBrowserContext, ownerSocketUrl } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';

const PHONE_HOST = '192.168.77.30';
const MODEL = 'gemini-3.8-flash-low';
const STATUS_OP = 'GetAgentRunCollaborationStatuses';
const VIEW_OP = 'GetAgentRunCollaboration';
const HISTORY_OP = 'ListWorkspaceRunHistory';

/**
 * @param probe the probe's helpers: `runCase`, `serverAt`, `freePort`, `chromium`, `executablePath`, `outputDir`,
 *   `evidence`, `selected`, `sleep`, `waitFor`, `assert`, `redact`; for MSP-27 also `browser`, `alpha`, `stack`,
 *   `desktopRunsView`.
 */
export const runClosedTaskRowsCases = async (probe) => {
  const { runCase, serverAt, freePort, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact } = probe;
  const wants = id => !selected || selected.has(id);
  const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined);
  /** A `CALL_TOOL:` result's id field (`target_agent_run_id`, `target_team_run_id`). */
  const pickId = (text, key) => new RegExp(`${key}\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)`).exec(text ?? '')?.[1];
  /** Browser lines: any is unknown, except the browser's own favicon request at the origin root (by its source location). */
  const watchBrowser = (page, label, origin, caseOf) => {
    const record = (text, sourceUrl = '') => {
      const line = redact(`${label} console: ${text}`);
      // The node answers the browser's own favicon request at the origin root with 401 (no credential on it, autobyteus-437)
      // or 404; the line names no URL in its text, so only its source location identifies it.
      const favicon = /: Failed to load resource: the server responded with a status of 40[14] \((Unauthorized|Not Found)\)$/.test(line) && sourceUrl.startsWith(origin) && new URL(sourceUrl).pathname === '/favicon.ico';
      evidence.browserErrors.push({ case: caseOf(), line, known: favicon, ...(favicon ? { cause: 'the browser\'s favicon request at the origin root (/favicon.ico)' } : {}) });
    };
    page.on('console', message => { if (message.type() === 'error') record(message.text(), message.location()?.url ?? ''); });
    page.on('pageerror', error => record(`pageerror ${error.message}`));
    page.on('requestfailed', request => evidence.failedRequests.push({ case: caseOf(), label, url: redact(request.url()), error: request.failure()?.errorText ?? null }));
  };
  /** Every GraphQL read a page starts: operation, the run IDs it names, time. */
  const recordReads = (page, net) => page.on('request', (request) => {
    if (request.method() !== 'POST' || !request.url().includes('/graphql')) return;
    try { const body = JSON.parse(request.postData() ?? '{}'); net.push({ at: Date.now(), op: body.operationName ?? null, runId: body.variables?.runId ?? null, runIds: body.variables?.runIds ?? null }); } catch { /* not JSON */ }
  });
  const reads = (net, from, to = Date.now()) => net.filter(entry => entry.at >= from && entry.at <= to);

  if (['MSP-24', 'MSP-25', 'MSP-26'].some(wants)) {
    const delta = await serverAt('delta', await freePort(), { AGY_FAKE_CASE: 'linked_skills', AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: 'all' });
    const phoneOrigin = `http://${PHONE_HOST}:${delta.port}`;
    let phoneBrowser = null;
    let currentCase = 'closed-rows-setup';
    try {
      // ---- data on delta, through the public API and the agents' own tool calls --------------------------------------
      const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
      const def = async (name, tools = []) => (await delta.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
        { i: { name, role: 'assistant', description: `${name} (closed rows probe)`, instructions: 'Follow the request.', toolNames: tools, defaultLaunchConfig: agy } })).createAgentDefinition.id;
      const ptmDef = await def('Project Task Manager', ['list_projects', 'list_project_tasks', 'create_task', 'update_task']);
      const writerDef = await def('Release Notes Writer');
      const checkerDef = await def('Fact Checker');
      const leadDef = await def('Live Lead', ['update_task']);
      const teamDef = async (name, coordinatorMemberName, nodes) => (await delta.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}',
        { i: { name, description: `${name} (closed rows probe)`, instructions: 'Work together.', coordinatorMemberName, nodes, defaultLaunchConfig: agy } })).createAgentTeamDefinition.id;
      await teamDef('Docs Review Team', 'reviewer', [{ memberName: 'reviewer', ref: writerDef, refScope: 'SHARED' }, { memberName: 'editor', ref: checkerDef, refScope: 'SHARED' }]);
      const liveTeamDef = await teamDef('Live Team', 'lead', [{ memberName: 'lead', ref: leadDef, refScope: 'SHARED' }, { memberName: 'mate', ref: checkerDef, refScope: 'SHARED' }]);
      const workspace = path.join(delta.dataDir, '..', 'workspace');
      await fs.mkdir(workspace, { recursive: true });
      await delta.gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
      const runConfig = { workspaceRootPath: workspace, autoExecuteTools: true, ...agy };
      const createRun = async (agentDefinitionId) => { const r = (await delta.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId, ...runConfig } })).createAgentRun; assert(r.success, r.message); return r.runId; };
      const wsBase = delta.baseUrl.replace(/^http/, 'ws');
      const sendOver = async (route, payload) => {
        const socket = new WebSocket(ownerSocketUrl(`${wsBase}/ws/${route}`));
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        await sleep(300);
        socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload }));
        await sleep(600);
        socket.close();
      };
      const message = (agentRunId, content, kind) => ({ message_id: randomUUID(), dedupe_key: `${kind}:probe:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: agentRunId, content });
      /** One tool call by an agent run (or a Team member), as the agent would make it; returns its result once stored. */
      const callTool = async ({ runId, teamRunId = null }, name, args) => {
        const conversation = async () => JSON.stringify(teamRunId
          ? (await delta.gql('query($t:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$t,agentRunId:$a){conversation}}', { t: teamRunId, a: runId })).getTeamMemberRunProjection?.conversation ?? []
          : (await delta.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
        const before = (await conversation()).split('CALLED:').length;
        const content = `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
        await (teamRunId ? sendOver(`agent-team/${teamRunId}`, message(runId, content, 'team_member_input')) : sendOver(`agent/${runId}`, message(runId, content, 'agent_run_input')));
        let text = '';
        await waitFor(`${name} by ${runId}`, async () => (text = await conversation()).split('CALLED:').length > before, 60_000);
        return text.split('CALLED:').at(-1);
      };

      const other = await createRun(checkerDef);
      await sendOver(`agent/${other}`, message(other, 'Hello from Other.', 'agent_run_input'));
      const project = (await delta.gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `Closed rows ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
      const task = async title => (await delta.gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}', { input: { projectId: project, title, description: title } })).createProjectTask;
      const taskA = await task('Write the release notes.');
      const taskB = await task('Review the docs site.');
      const taskC = await task('Draft the changelog.');
      const ptm = await createRun(ptmDef);
      const writerRun = pickId(await callTool({ runId: ptm }, 'delegate_task', { recipient_address: '/release_notes_writer', task_id: taskA.taskId }), 'target_agent_run_id');
      const teamRun = pickId(await callTool({ runId: ptm }, 'delegate_task', { recipient_address: '/docs_review_team', task_id: taskB.taskId }), 'target_team_run_id');
      const liveTeam = (await delta.gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: liveTeamDef,
        teamConfigs: [{ teamAddress: '/', ...runConfig }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: leadDef, ...runConfig }, { memberAddress: '/mate', agentDefinitionId: checkerDef, ...runConfig }] } })).createAgentTeamRun;
      assert(liveTeam.success, liveTeam.message);
      const liveTree = JSON.stringify((await delta.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: liveTeam.teamRunId })).getTeamRunResumeConfig.executionTree);
      const liveLead = /"address":"\/lead"[^}]*"agent_run_id":"([^"]+)"/.exec(liveTree)?.[1];
      const leadTaskRun = pickId(await callTool({ runId: liveLead, teamRunId: liveTeam.teamRunId }, 'delegate_task', { recipient_address: '/release_notes_writer', task_id: taskC.taskId }), 'target_agent_run_id');
      assert(writerRun && teamRun && liveLead && leadTaskRun, 'the delegations on delta', { writerRun, teamRun, liveLead, leadTaskRun });
      evidence.closedTaskRows = { runs: { ptm, other, writerRun, teamRun, liveTeam: liveTeam.teamRunId, liveLead, leadTaskRun }, tasks: { a: taskA.taskKey, b: taskB.taskKey, c: taskC.taskKey } };
      const closeTask = (by, taskId, status) => callTool(by, 'update_task', { task_id: taskId, status });
      /** Whether the host view's `closed_task_executions` (wherever it sits in the view) names the run. */
      const closedOnNode = (viewJson, runId) => [...viewJson.matchAll(/"closed_task_executions":(\[[^\]]*\])/g)].some(match => match[1].includes(runId));

      // ---- the phones -------------------------------------------------------------------------------------------------
      phoneBrowser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
      const settings = await delta.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
      assert(settings.status === 200, 'delta Phone Access on', settings);
      const pairing = await delta.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Delta Test Node', trustedPrivateHttpAcknowledged: true });
      assert(pairing.status === 201 && pairing.body.mobileUrl, 'delta pairing session', pairing.status);
      let paired = null;
      const openPhone = async (label) => {
        const context = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC', ...(paired ? { storageState: paired } : {}) });
        const page = await context.newPage();
        const phone = { label, context, page, net: [] };
        recordReads(page, phone.net);
        watchBrowser(page, label, phoneOrigin, () => currentCase);
        if (!paired) {
          await page.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
          await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
          await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
          paired = await context.storageState();
        } else {
          await page.goto(`${phoneOrigin}/mobile`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
          await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
        }
        return phone;
      };
      const rowKeys = page => page.evaluate(() => [...document.querySelectorAll('[data-test="mobile-run-row"]')].map(li => li.getAttribute('data-testid')));
      const listed = async (phone, id) => (await rowKeys(phone.page)).some(key => key.includes(id));
      const openAndBack = async (phone, runId) => {
        await waitFor(`row ${runId}`, async () => (await phone.page.locator(`[data-testid="mobile-run-row-agent:${runId}"] [data-testid="mobile-run-open"]`).count()) > 0, 30_000);
        await phone.page.locator(`[data-testid="mobile-run-row-agent:${runId}"] [data-testid="mobile-run-open"]`).click();
        await waitFor('the run screen', async () => (await phone.page.evaluate(() => document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state'))) === 'open', 30_000);
        await sleep(1_500);
        await phone.page.locator('[data-testid="mobile-run-back"]:visible').first().click();
        await phone.page.locator('[data-testid="mobile-run-tree"]:visible').waitFor({ timeout: 20_000 });
      };
      /** Unfolds every folded row under a host until its delegated rows are on screen. */
      const unfold = async (phone, hostKey) => {
        for (let round = 0; round < 4; round += 1) {
          for (const handle of await phone.page.locator(`[data-test="mobile-run-row"][data-testid^="mobile-run-row-${hostKey}"][aria-expanded="false"] [data-testid="mobile-run-toggle"]`).all()) await handle.click({ timeout: 1_500 }).catch(() => undefined);
          await sleep(400);
        }
      };
      const setVisibility = (phone, state) => phone.page.evaluate((value) => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => value === 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      }, state);
      /** Watches rows on phones from now: the first time each one is gone (or back), until all are or `timeoutMs` passes. */
      const watchRows = (targets, want, timeoutMs) => {
        const seen = Object.fromEntries(targets.map(t => [t.name, null]));
        const done = (async () => {
          const end = Date.now() + timeoutMs;
          while (Date.now() < end && Object.values(seen).some(v => v === null)) {
            for (const t of targets) if (seen[t.name] === null && (await listed(t.phone, t.id)) === (want === 'back')) seen[t.name] = Date.now();
            await sleep(100);
          }
          return seen;
        })();
        return done;
      };
      const phoneHost = await openPhone('phone-host');
      const phoneOther = await openPhone('phone-other');
      await openAndBack(phoneHost, ptm);
      await openAndBack(phoneOther, other);
      for (const phone of [phoneHost, phoneOther]) await unfold(phone, `agent:${ptm}`);
      await unfold(phoneOther, `team:${liveTeam.teamRunId}`);
      await waitFor('the delegated rows on both phones', async () => (await listed(phoneHost, writerRun)) && (await listed(phoneHost, teamRun))
        && (await listed(phoneOther, writerRun)) && (await listed(phoneOther, teamRun)), 60_000);

      await runCase('MSP-24', async () => {
        currentCase = 'MSP-24';
        // AC-005: nothing changes for 50 s.
        const quietFrom = Date.now();
        await sleep(50_000);
        const quiet = reads(phoneOther.net, quietFrom);
        const quietCounts = { history: quiet.filter(e => e.op === HISTORY_OP).length, statuses: quiet.filter(e => e.op === STATUS_OP).length,
          statusesNamingPtm: quiet.filter(e => e.op === STATUS_OP && e.runIds?.includes(ptm)).length, ptmViewReads: quiet.filter(e => e.op === VIEW_OP && e.runId === ptm).length };
        // AC-001, AC-004: the PTM closes Task A, then Task B.
        const gone = watchRows([{ name: 'other-A', phone: phoneOther, id: writerRun }, { name: 'other-B', phone: phoneOther, id: teamRun },
          { name: 'host-A', phone: phoneHost, id: writerRun }, { name: 'host-B', phone: phoneHost, id: teamRun }], 'gone', 90_000);
        const closeFrom = Date.now();
        await closeTask({ runId: ptm }, taskA.taskId, 'DONE');
        const closedA = Date.now();
        await closeTask({ runId: ptm }, taskB.taskId, 'DONE');
        const closedB = Date.now();
        const goneAt = await gone;
        const after = ms => (ms === null ? null : ms);
        const goneMs = { otherA: after(goneAt['other-A'] && goneAt['other-A'] - closedA), otherB: after(goneAt['other-B'] && goneAt['other-B'] - closedB),
          hostA: after(goneAt['host-A'] && goneAt['host-A'] - closedA), hostB: after(goneAt['host-B'] && goneAt['host-B'] - closedB) };
        const lastGone = Math.max(...Object.values(goneAt).filter(Boolean));
        await sleep(15_000);
        const viewReadsAfterClose = reads(phoneOther.net, closeFrom, lastGone).filter(e => e.op === VIEW_OP && e.runId === ptm).length;
        const viewReadsAfterGone = reads(phoneOther.net, lastGone + 1).filter(e => e.op === VIEW_OP && e.runId === ptm).length;
        await shot(phoneOther.page, 'MSP-24-phone-other-closed');
        await shot(phoneHost.page, 'MSP-24-phone-host-closed');
        // AC-003: the PTM reopens Task A. On the node a Task set back to TODO keeps its copy closed; the copy reopens
        // (`task_executions_reopened`) when its delegator reactivates it, here with a message to it. Both phones follow the
        // node: after TODO alone they agree; after the reactivation the row returns on both.
        await closeTask({ runId: ptm }, taskA.taskId, 'TODO');
        await sleep(12_000);
        const afterTodo = { phoneHost: await listed(phoneHost, writerRun), phoneOther: await listed(phoneOther, writerRun),
          nodeStillClosed: closedOnNode(JSON.stringify((await delta.gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: ptm })).agentRunCollaboration), writerRun) };
        const back = watchRows([{ name: 'other-A', phone: phoneOther, id: writerRun }, { name: 'host-A', phone: phoneHost, id: writerRun }], 'back', 30_000);
        await callTool({ runId: ptm }, 'send_message_to', { target_agent_run_id: writerRun, content: 'Task A is open again: continue the release notes.' });
        const reactivated = Date.now();
        const backAt = await back;
        const reopenMs = { other: backAt['other-A'] && backAt['other-A'] - reactivated, host: backAt['host-A'] && backAt['host-A'] - reactivated };
        await shot(phoneOther.page, 'MSP-24-phone-other-reopened');
        const details = { quiet: { seconds: 50, ...quietCounts }, goneAfterCloseMs: goneMs, viewReadsAfterClose, viewReadsInThe15sAfterGone: viewReadsAfterGone,
          afterTodoOnly: afterTodo, rowBackAfterReactivationMs: reopenMs, listedOnOtherAtEnd: { writerRun: await listed(phoneOther, writerRun), teamRun: await listed(phoneOther, teamRun) } };
        assert(quietCounts.ptmViewReads === 0, 'no view read of the PTM while nothing changes (AC-005)', details);
        assert(quietCounts.statuses >= 8 && quietCounts.statuses <= quietCounts.history + 1 && quietCounts.statusesNamingPtm === quietCounts.statuses, 'one batched statuses read per refresh, naming the PTM (AC-005)', details);
        assert(goneMs.otherA !== null && goneMs.otherA <= 10_000 && goneMs.otherB !== null && goneMs.otherB <= 10_000, 'phone-other: both delegated rows leave within 10 s (AC-001)', details);
        assert(goneMs.hostA !== null && goneMs.hostA <= 1_000 && goneMs.hostB !== null && goneMs.hostB <= 1_000, 'phone-host (the PTM open): both rows leave within 1 s (AC-004)', details);
        assert(viewReadsAfterClose >= 1 && viewReadsAfterClose <= 2 && viewReadsAfterGone === 0, 'one view re-read per close, none afterwards (QR-002)', details);
        assert(afterTodo.phoneHost === afterTodo.phoneOther && afterTodo.phoneOther === !afterTodo.nodeStillClosed, 'after TODO alone both phones agree with the node (REQ-002: the same way)', details);
        assert(reopenMs.other !== null && reopenMs.other <= 10_000 && reopenMs.host !== null, 'the reopened copy\'s row returns on both phones, within 10 s on phone-other (AC-003)', details);
        return details;
      });

      await runCase('MSP-25', async () => {
        currentCase = 'MSP-25';
        await waitFor('Task A\'s row listed on phone-other', async () => listed(phoneOther, writerRun), 30_000);
        const hiddenFrom = Date.now();
        await setVisibility(phoneOther, 'hidden');
        await sleep(2_000);
        await closeTask({ runId: ptm }, taskA.taskId, 'DONE');
        const closedAt = Date.now();
        await sleep(12_000);
        const whileHidden = reads(phoneOther.net, hiddenFrom);
        const hiddenCounts = { history: whileHidden.filter(e => e.op === HISTORY_OP).length, statuses: whileHidden.filter(e => e.op === STATUS_OP).length,
          views: whileHidden.filter(e => e.op === VIEW_OP).length, all: whileHidden.map(e => ({ op: e.op, afterHiddenMs: e.at - hiddenFrom, runId: e.runId, runIds: e.runIds })) };
        const listedWhenShown = await listed(phoneOther, writerRun);
        const gone = watchRows([{ name: 'other-A', phone: phoneOther, id: writerRun }], 'gone', 15_000);
        const shownAt = Date.now();
        await setVisibility(phoneOther, 'visible');
        const goneAt = (await gone)['other-A'];
        const firstReadAfterShown = reads(phoneOther.net, shownAt).find(e => e.op === HISTORY_OP);
        await shot(phoneOther.page, 'MSP-25-phone-other-shown');
        const details = { hiddenMs: shownAt - hiddenFrom, closedWhileHiddenAfterMs: closedAt - hiddenFrom, whileHidden: hiddenCounts, rowListedWhenShown: listedWhenShown,
          goneAfterShownMs: goneAt && goneAt - shownAt, firstHistoryReadAfterShownMs: firstReadAfterShown ? firstReadAfterShown.at - shownAt : null };
        assert(hiddenCounts.history === 0 && hiddenCounts.statuses === 0 && hiddenCounts.views === 0, 'no read while the phone is in the background (AC-006, E-25)', details);
        assert(details.goneAfterShownMs !== null && details.goneAfterShownMs <= 10_000, 'shown again, the closed Task\'s row leaves within 10 s (AC-006)', details);
        return details;
      });

      await runCase('MSP-26', async () => {
        currentCase = 'MSP-26';
        await unfold(phoneOther, `team:${liveTeam.teamRunId}`);
        let listedBefore = true;
        try { await waitFor('the lead\'s delegated row on phone-other', async () => listed(phoneOther, leadTaskRun), 30_000); } catch { listedBefore = false; }
        await shot(phoneOther.page, 'MSP-26-phone-other-before');
        const gone = watchRows([{ name: 'lead-C', phone: phoneOther, id: leadTaskRun }], 'gone', 30_000);
        await closeTask({ runId: liveLead, teamRunId: liveTeam.teamRunId }, taskC.taskId, 'DONE');
        const closedAt = Date.now();
        const goneAt = (await gone)['lead-C'];
        await shot(phoneOther.page, 'MSP-26-phone-other-after');
        const details = { listedBefore, goneAfterCloseMs: goneAt && goneAt - closedAt, openRunOnPhone: 'Other' };
        assert(listedBefore, 'the Team lead\'s delegated row is listed under the Team on the phone', details);
        assert(details.goneAfterCloseMs !== null && details.goneAfterCloseMs <= 10_000, 'a Team host: the closed Task\'s row leaves within 10 s', details);
        return details;
      });
    } finally {
      if (phoneBrowser) await phoneBrowser.close().catch(() => undefined);
      await delta.stop();
    }
  }

  if (wants('MSP-27')) {
    const { browser, alpha, stack, desktopRunsView } = probe;
    await runCase('MSP-27', async () => {
      // The PTM active, and read as active by the window before the close.
      await stack.agentSay(stack.ptm, 'Status check before the close.');
      const ptmActive = async () => (await alpha.gql('query($ids:[String!]!){agentRunCollaborationStatuses(runIds:$ids){runId isActive}}', { ids: [stack.ptm] })).agentRunCollaborationStatuses[0]?.isActive === true;
      await waitFor('the PTM active on alpha', ptmActive, 60_000);
      const context = await browser.newContext({ viewport: { width: 1440, height: 1400 }, locale: 'en-US', timezoneId: 'UTC' });
      await attachToBrowserContext(context);
      await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
      const page = await context.newPage();
      const net = [];
      recordReads(page, net);
      watchBrowser(page, 'desktop', stack.frontendUrl, () => 'MSP-27');
      try {
        // The dev server may still restart after alpha's restarts, and a cold one re-optimizes and reloads (TESTING.md): wait, warm up.
        await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
        await page.goto(stack.frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
        await sleep(3_000);
        await page.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
        await desktopRunsView(page);
        const showOlder = page.locator('[data-test="run-list-show-older"]');
        if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
        // The open run: a plain run, not the PTM.
        const plain = stack.plain[0];
        await page.locator(`[data-test="run-list-row"][data-run-id="${plain}"] [data-test="workspace-agent-run-row"]`).first().click();
        await waitFor('the plain run open in the window', async () => new URL(page.url()).searchParams.get('id') === plain, 30_000);
        const ptmRow = `[data-test="run-list-row"][data-run-id="${stack.ptm}"]`;
        // Task B's Team row under the PTM: a delegated Team row carries the delegating host's ID and the Team's address.
        const teamRow = `${ptmRow} [data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"][data-member-address="/docs_review_team"]`;
        const desktopListed = async () => (await page.locator(teamRow).count()) > 0;
        // Unfold the PTM's row with its disclosure only (a click on a row itself opens that run).
        const disclosure = page.locator(`${ptmRow} [data-test="run-list-disclosure"]`).first();
        if ((await disclosure.getAttribute('aria-expanded')) === 'false') await disclosure.click();
        try { await waitFor('Task B\'s Team row under the PTM on the desktop', desktopListed, 30_000); } catch (error) {
          await page.screenshot({ path: path.join(outputDir, 'MSP-27-desktop-no-row.png') });
          const underPtm = await page.evaluate(rowSelector => [...(document.querySelector(rowSelector)?.querySelectorAll('[data-agent-run-id], [data-team-run-id], [data-run-id]') ?? [])]
            .map(el => [...el.attributes].filter(a => a.name.startsWith('data-')).map(a => `${a.name}=${a.value}`).join(' ')).slice(0, 40), ptmRow);
          throw Object.assign(error, { details: { ptmRowFound: underPtm.length > 0, underPtm, squadRun: stack.squadRun, writerRun: stack.writerRun } });
        }
        const quietFrom = Date.now();
        await sleep(12_000);
        const quietViewReads = reads(net, quietFrom).filter(e => e.op === VIEW_OP && e.runId === stack.ptm).length;
        const quietStatusReads = reads(net, quietFrom).filter(e => e.op === STATUS_OP && e.runIds?.includes(stack.ptm)).length;
        await page.screenshot({ path: path.join(outputDir, 'MSP-27-desktop-before.png') });
        const openRunBeforeClose = new URL(page.url()).searchParams.get('id');
        await stack.agentCall(stack.ptm, 'update_task', { task_id: stack.taskB.taskId, status: 'DONE' });
        const closedAt = Date.now();
        let goneAt = null;
        while (Date.now() < closedAt + 30_000) { if (!(await desktopListed())) { goneAt = Date.now(); break; } await sleep(100); }
        await page.screenshot({ path: path.join(outputDir, 'MSP-27-desktop-after.png') });
        const viewReadsAfterClose = reads(net, closedAt - 5_000).filter(e => e.op === VIEW_OP && e.runId === stack.ptm).length;
        const details = { openRun: openRunBeforeClose, openRunAtEnd: new URL(page.url()).searchParams.get('id'), quietSeconds: 12, quietViewReads, quietStatusReads, goneAfterCloseMs: goneAt && goneAt - closedAt, viewReadsAfterClose };
        assert(details.openRun === plain && details.openRunAtEnd === plain, 'the window\'s open run is a plain run, not the PTM, throughout', details);
        assert(quietViewReads === 0 && quietStatusReads >= 1, 'the window polls the PTM\'s statuses and reads no view while nothing changes (AC-005)', details);
        assert(details.goneAfterCloseMs !== null && details.goneAfterCloseMs <= 10_000, 'the closed Task\'s Team row leaves the desktop list within 10 s (AC-002)', details);
        return details;
      } finally {
        await context.close().catch(() => undefined);
      }
    });
  }
};
