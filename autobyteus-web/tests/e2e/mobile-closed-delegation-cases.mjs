// A closed Task's run on the node that runs it for a peer leaves that node's run lists, the phone's and the desktop's, and
// comes back when its delegating node gives it a Task again (autobyteus-591 REQ-005, AC-006; DEC-004: "just like the task
// agent and task agent team"). A case of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs`
// (`--cases=MSP-93` runs only it).
//
// Roles: alpha (the phone's node, with the probe's desktop window) runs the delegated agent; beta, its paired peer, delegates
// it and owns the Task. Only the scripted AGY CLI stands in for a model; every step is a public API or the agents' own tool
// calls (`CALL_TOOL:{…}`).
// - alpha: the shared agent "Night Writer". beta: the agent "Remote Manager" (with update_task), whose run delegates
//   /night_writer on "alpha-node" with a description (an ad-hoc Task on beta).
// - A phone paired with alpha through Phone Access on the production phone bundle alpha serves at /mobile, in a headless Chrome
//   of its own that maps 192.168.77.40 to 127.0.0.1 (Host and Origin are a private address, as on a LAN/tailnet); the
//   probe's desktop window (`nuxt dev` against alpha) in its Runs view.
//
//   MSP-93 AC-006  Both lists show the delegated run. Beta's manager sets the Task DONE: alpha stops the run and records it
//                  closed, and its row leaves the phone and the desktop within 5 s of alpha's run list dropping it (the 5 s
//                  list re-read). Beta's manager reopens the Task: nothing changes on alpha (the row stays away). It gives the
//                  run a saved Task with the run's ID and `task_id`: the row returns on both.
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { attachToBrowserContext, ownerSocketUrl } from './fixtures/probe-node-access.mjs';

const PHONE_HOST = '192.168.77.40';
const MODEL = 'gemini-3.8-flash-low';
/** The run list's re-read interval on the desktop and the phone (`RUN_HISTORY_REFRESH_INTERVAL_MS`), plus render time. */
const LIST_REFRESH_BOUND_MS = 5_000 + 1_500;

/**
 * @param probe the probe's helpers: `runCase`, `chromium`, `executablePath`, `outputDir`, `evidence`, `selected`, `sleep`,
 *   `waitFor`, `assert`, `redact`, `browser`, `alpha`, `beta`, `stack`, `desktopRunsView`.
 */
export const runClosedDelegationCases = async (probe) => {
  const { runCase, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact, browser, alpha, beta, stack, desktopRunsView } = probe;
  if (selected && !selected.has('MSP-93')) return;
  const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined);
  let phoneBrowser = null;
  let desktopContext = null;
  await runCase('MSP-93', async () => {
    const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
    const def = async (node, name, tools = []) => (await node.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
      { i: { name, role: 'assistant', description: `${name} (closed delegation probe)`, instructions: 'Follow the request.', toolNames: tools, defaultLaunchConfig: agy } })).createAgentDefinition.id;
    const tag = randomUUID().slice(0, 4);
    await def(alpha, `Night Writer ${tag}`);
    const managerDef = await def(beta, `Remote Manager ${tag}`, ['update_task']);
    const workspace = path.join(beta.dataDir, '..', 'closed-delegation-workspace');
    await fs.mkdir(workspace, { recursive: true });
    const created = (await beta.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}',
      { i: { agentDefinitionId: managerDef, workspaceRootPath: workspace, autoExecuteTools: true, ...agy } })).createAgentRun;
    assert(created.success, created.message);
    const manager = created.runId;
    // One tool call by beta's manager, as the agent makes it; its result once stored in its conversation.
    const conversation = async () => JSON.stringify((await beta.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: manager })).getRunProjection?.conversation ?? []);
    const callTool = async (name, args) => {
      const before = (await conversation()).split('CALLED:').length;
      const socket = new WebSocket(ownerSocketUrl(`${beta.baseUrl.replace(/^http/, 'ws')}/ws/agent/${manager}`));
      await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
      await sleep(300);
      socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`,
        context_file_paths: [], image_urls: [], agent_run_id: manager, content: `CALL_TOOL:${JSON.stringify({ name, arguments: args })}` } }));
      await sleep(600);
      socket.close();
      let text = '';
      await waitFor(`${name} by beta's manager`, async () => (text = await conversation()).split('CALLED:').length > before, 90_000);
      return text.split('CALLED:').at(-1);
    };
    const field = (text, key) => new RegExp(`${key}\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)`).exec(text ?? '')?.[1];
    const delegated = await callTool('delegate_task', { node: 'alpha-node', recipient_address: `/night_writer_${tag}`, description: `Night work. Marker MSP93-PACKET-${tag}.` });
    const runId = field(delegated, 'target_agent_run_id');
    const taskId = field(delegated, 'task_id');
    assert(runId && taskId, 'the delegation from beta', { delegated: redact(delegated).slice(0, 600) });
    const alphaListed = async () => JSON.stringify((await alpha.gql('query{listWorkspaceRunHistory(limitPerAgent:500){agentDefinitions{runs{runId}}}}')).listWorkspaceRunHistory).includes(`"${runId}"`);
    await waitFor('alpha lists the delegated run', alphaListed, 60_000);

    // The phone, paired with alpha.
    phoneBrowser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
    const phoneOrigin = `http://${PHONE_HOST}:${alpha.port}`;
    const pairing = await alpha.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Alpha Test Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'alpha pairing session', pairing.status);
    const phoneContext = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
    const phone = await phoneContext.newPage();
    phone.on('pageerror', error => evidence.browserErrors.push({ case: 'MSP-93', line: redact(`phone pageerror ${error.message}`), known: false }));
    await phone.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await phone.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    await phone.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
    const phoneRow = () => phone.locator(`[data-testid="mobile-run-row-agent:${runId}"]`);
    const onPhone = async () => {
      if (await phoneRow().count()) return true;
      // Folded under "Show older (N)": unfold, then look again.
      const older = phone.locator('[data-testid="mobile-run-list-show-older"]');
      if (await older.count()) await older.click().catch(() => undefined);
      return (await phoneRow().count()) > 0;
    };

    // The desktop window, in its Runs view.
    desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
    await attachToBrowserContext(desktopContext);
    await desktopContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const desktop = await desktopContext.newPage();
    await desktop.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await desktopRunsView(desktop);
    const desktopRow = () => desktop.locator(`[data-test="run-list-row"][data-run-id="${runId}"]`);
    const onDesktop = async () => {
      if (await desktopRow().count()) return true;
      const older = desktop.locator('[data-test="run-list-show-older"]');
      if ((await older.innerText().catch(() => '')).startsWith('Show older')) await older.click().catch(() => undefined);
      return (await desktopRow().count()) > 0;
    };
    await waitFor('the phone lists the delegated run', onPhone, 30_000);
    await waitFor('the desktop lists the delegated run', onDesktop, 30_000);
    await shot(phone, 'MSP-93-phone-before');
    await shot(desktop, 'MSP-93-desktop-before');

    // DONE on beta: alpha stops the run and records it; the row leaves both lists within one re-read of the list.
    const closedAt = Date.now();
    const done = await callTool('update_task', { task_id: taskId, status: 'DONE' });
    assert(/"status\\*"\s*:\s*\\*"DONE/.test(done), 'DONE on beta', { done: redact(done).slice(0, 400) });
    const recordFile = path.join(alpha.dataDir, 'remote-collaboration', 'closed-delegations.json');
    const recorded = async () => JSON.stringify(JSON.parse(await fs.readFile(recordFile, 'utf8').catch(() => '[]'))).includes(`"${runId}"`);
    await waitFor('alpha records the run closed', recorded, 30_000);
    await waitFor('alpha\'s run list drops the run', async () => !(await alphaListed()), 30_000);
    const listDroppedAt = Date.now();
    await waitFor('the phone drops the row', async () => !(await onPhone()), LIST_REFRESH_BOUND_MS + 2_000);
    const phoneGoneAt = Date.now();
    await waitFor('the desktop drops the row', async () => !(await onDesktop()), LIST_REFRESH_BOUND_MS + 2_000);
    const desktopGoneAt = Date.now();
    await shot(phone, 'MSP-93-phone-after-done');
    await shot(desktop, 'MSP-93-desktop-after-done');
    const after = { listAfterCloseMs: listDroppedAt - closedAt, phoneAfterListMs: phoneGoneAt - listDroppedAt, desktopAfterListMs: desktopGoneAt - listDroppedAt };
    assert(after.phoneAfterListMs <= LIST_REFRESH_BOUND_MS && after.desktopAfterListMs <= LIST_REFRESH_BOUND_MS, 'the rows leave within one list re-read', after);

    // A reopen alone on beta changes nothing on alpha.
    await callTool('update_task', { task_id: taskId, status: 'TODO' });
    await sleep(LIST_REFRESH_BOUND_MS + 1_000);
    const afterReopen = { recorded: await recorded(), listed: await alphaListed(), phone: await onPhone(), desktop: await onDesktop() };
    assert(afterReopen.recorded && !afterReopen.listed && !afterReopen.phone && !afterReopen.desktop, 'a reopen alone changes nothing on alpha', afterReopen);

    // Given a saved Task with its run ID (REQ-006): the row returns on both. (The run's own reopened Task can't be given
    // again: finding F-2 of autobyteus-591's API/E2E round 1.)
    const project = (await beta.gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `Closed delegation ${tag}` } })).createProject.projectId;
    const savedTaskId = (await beta.gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId: project, title: 'More night work.', description: 'More night work.' } })).createProjectTask.taskId;
    const givenAt = Date.now();
    const again = await callTool('delegate_task', { target_agent_run_id: runId, task_id: savedTaskId });
    assert(/"delegated\\*"\s*:\s*true/.test(again), 'the Task given again', { again: redact(again).slice(0, 600) });
    await waitFor('alpha lists the run again', alphaListed, 30_000);
    await waitFor('the phone shows the row again', onPhone, LIST_REFRESH_BOUND_MS + 2_000);
    await waitFor('the desktop shows the row again', onDesktop, LIST_REFRESH_BOUND_MS + 2_000);
    const backMs = Date.now() - givenAt;
    await shot(phone, 'MSP-93-phone-after-again');
    await shot(desktop, 'MSP-93-desktop-after-again');
    evidence.closedDelegation = { runId, manager, ...after, afterReopen, backMs };
    return { runId, ...after, afterReopen, backMs };
  });
  await desktopContext?.close().catch(() => undefined);
  await phoneBrowser?.close().catch(() => undefined);
};
