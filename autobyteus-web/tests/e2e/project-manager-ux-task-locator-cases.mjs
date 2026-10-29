// PMU-020..PMU-025 for project-manager-ux-probe.mjs (delegated-copy-task-locator): Task summaries under delegated
// copy rows in the Workspaces tree, and "Show Task in Projects" from a summary.
// Same owned stack as the other PMU cases: built backend, scripted AGY actor (`CALL_TOOL:` makes an agent call the
// real tool), Nuxt dev and fresh headless Chrome. Copies are created by the real `delegate_task` / `send_message_to`.
// Two network conditions are emulated in the browser with Playwright `routeWebSocket`, never the server:
//   - PMU-024 drops the page's `/ws/projects` connection for a while (a lost network) to prove the reconnect re-read;
//   - PMU-024 holds the run's collaboration-stream frames that close a Task's rows, so the still-shown summary is
//     clicked after the Task closed (the "closed just before the click" edge, DEC-006 / VIS-010).
import { randomUUID } from 'node:crypto';

const INDIGO_700 = 'rgb(67, 56, 202)';
const GRAY_500 = 'rgb(128, 128, 128)';
const LOCATED_BG = 'rgb(238, 242, 255)';
const INDIGO_500 = 'rgb(99, 102, 241)';
const SLATE_300 = 'rgb(203, 213, 225)';
const LIVE_HIGHLIGHT_MS = 2400;
/** Where two texts first differ, with a little context on each side (null when equal). */
const textDiff = (a, b) => {
  if (a === b) return null;
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return { at: i, lengths: [a.length, b.length], before: a.slice(Math.max(0, i - 120), i + 200), after: b.slice(Math.max(0, i - 120), i + 200) };
};

/** @param {Record<string, any>} h the probe's helpers */
export const createTaskLocatorCases = (h) => {
  const { gql, createDefinitions, createProject, createTask, createRoot, managerInput, rootOf, projectTasks, tempTasks,
    newPage, goto, shot, until, sleep, assert, callTool, segment, slug, expandWorkspace, centerText, selectionState,
    navTo, assertNoBrowserErrors } = h;
  const shared = {};

  // ------------------------------------------------------------ fixtures (public API + real tools)
  const createAgent = async (name) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames: [] } })).createAgentDefinition.id;
  const workerTasks = async (agentRunIds, teamRunIds = []) => (await gql('query($a:[String!]!,$t:[String!]!){taskWorkerTasks(agentRunIds:$a,teamRunIds:$t){workerKind workerRunId task{taskId projectId description status}}}',
    { a: agentRunIds, t: teamRunIds })).taskWorkerTasks;
  const started = (projectId, taskId, label) => until(`${label}: worker started`, async () => {
    const root = await rootOf(projectId, taskId); return root?.start === 'started' ? root : null;
  }, 90000);
  const startedTemp = (prefix) => until(`Temp task "${prefix}" started`, async () =>
    (await tempTasks()).find((t) => t.description.startsWith(prefix) && t.root?.start === 'started'), 90000);

  /**
   * One Agent run (Manager) with: an agent copy on a Project Task (its own work sub-delegates: a sub-work copy),
   * a task Team copy on a long-described Task and an agent copy on a Temp task. One Team run whose manager delegates a Task of
   * another Project to a catalog Agent (Team host: a Team never delegates its own member).
   */
  const setupLocator = async () => {
    if (shared.locator) return shared.locator;
    const { ids, names } = await createDefinitions('PmuLocate');
    const suffix = randomUUID().slice(0, 4);
    names.verifier = `Link Verifier ${suffix}`;
    ids.verifier = await createAgent(names.verifier);
    const projectA = await createProject(`Locate Desktop ${randomUUID().slice(0, 6)}`);
    const tasks = {
      // The worker's own work is one sub-delegation (a sub-work copy shares this Task and shows no summary).
      agent: await createTask(projectA, `Ship the copy Task summary in the tree\n${callTool('delegate_task', { recipient_address: `/${segment(names.verifier)}`, description: 'Check the links.' })}`),
      team: await createTask(projectA, 'Review the locate journey with the docs review team and report back on every edge case found during the whole session'),
    };
    for (let i = 0; i < 14; i += 1) await createTask(projectA, `Backlog item ${i + 1}`);
    const projectB = await createProject(`Locate Launch ${randomUUID().slice(0, 6)}`);
    tasks.teamHost = await createTask(projectB, 'Draft the release notes for the beta');
    await createTask(projectB, 'Plan the next sprint');

    const agentRoot = await createRoot('agent', ids);
    const input = await managerInput(agentRoot);
    input.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, task_id: tasks.agent }));
    const agentWorker = await started(projectA, tasks.agent, 'agent copy');
    input.send(callTool('delegate_task', { recipient_address: `/${segment(names.squad)}`, task_id: tasks.team }));
    const teamWorker = await started(projectA, tasks.team, 'team copy');
    input.send(callTool('delegate_task', { recipient_address: `/${segment(names.helper)}`, description: 'Check the FAQ links.\nReport broken ones.' }));
    const temp = await startedTemp('Check the FAQ links.');

    const teamRoot = await createRoot('team', ids);
    const teamInput = await managerInput(teamRoot);
    teamInput.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, task_id: tasks.teamHost }));
    const teamHostWorker = await started(projectB, tasks.teamHost, 'Team-host copy');
    shared.locator = { ids, names, projectA, projectB, tasks, agentRoot, teamRoot, input, teamInput,
      workers: { agent: agentWorker.ingressAgentRunId, team: teamWorker.teamRunId, temp: temp.root.ingressAgentRunId ?? null, teamHost: teamHostWorker.ingressAgentRunId },
      tempTaskId: temp.taskId };
    // The Temp root view does not list the run ID; the tree row does (resolved on first open).
    return shared.locator;
  };

  // ------------------------------------------------------------ browser helpers
  const ROW = '[data-test="workspace-team-transient-execution-row"]';
  const agentRow = (page, runId) => page.locator(`${ROW}[data-agent-run-id="${runId}"]:visible`);
  /** A task Team copy row of a host Agent run's tree (its row carries the copy's address, not its team run ID). */
  const teamRow = (page, hostRunId, teamName) => page.locator(`[data-test="workspace-agent-run-task-tree"][data-run-id="${hostRunId}"] ${ROW}[data-transient-kind="task_team"][data-member-address="/${segment(teamName)}"]:visible`);
  const addressRow = (page, address) => page.locator(`${ROW}[data-member-address="${address}"]:visible`);
  const summaryIn = (row) => row.locator('[data-test="workspace-task-worker-task-summary"]');
  // task-keys-declutter (REQ-002): the tree shows only the Task summary, never a Task key.
  const summaryLabel = (summary) => summary.evaluate((e) => e.textContent);
  const keyOf = async (projectId, taskId) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId taskKey}}', { id: projectId })).projectTasks.find((t) => t.taskId === taskId)?.taskKey;
  const card = (page, taskId) => page.locator(`[data-testid="project-task-row-${taskId}"]:visible`);
  const panelState = (page) => page.evaluate(() => {
    const picker = [...document.querySelectorAll('[data-testid="projects-panel-picker-select"]')].find((e) => e.getBoundingClientRect().height > 0);
    return {
      path: location.pathname + location.search,
      docked: Boolean(document.querySelector('[data-test="workspace-right-panel"]')),
      drawer: Boolean(document.querySelector('[data-test="workspace-right-tool-drawer"]')),
      picker: picker?.value ?? null,
      located: [...document.querySelectorAll('[data-located="true"]')].map((e) => e.getAttribute('data-testid')),
      focused: document.activeElement?.closest('div[data-testid^="project-task-row-"]')?.getAttribute('data-testid') ?? null,
    };
  });
  /** The card is located: highlighted (only it) and holding focus. */
  const located = (page, taskId, label) => until(`${label}: card ${taskId} located and focused`, async () => {
    const s = await panelState(page);
    return s.located.length === 1 && s.located[0] === `project-task-row-${taskId}` && s.focused === `project-task-row-${taskId}` ? s : null;
  }, 20000, 50);
  const cardGeometry = (page, taskId) => card(page, taskId).evaluate((e) => {
    let scroller = e.parentElement;
    while (scroller && !(scroller.scrollHeight > scroller.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement;
    const r = e.getBoundingClientRect(); const p = (scroller ?? document.documentElement).getBoundingClientRect();
    const atEdge = scroller ? scroller.scrollTop <= 1 || scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1 : true;
    const s = getComputedStyle(e);
    return { centreOffset: Math.round(r.top + r.height / 2 - (p.top + p.height / 2)), inView: r.top >= p.top - 1 && r.bottom <= p.bottom + 1, atEdge,
      background: s.backgroundColor, boxShadow: s.boxShadow, animation: s.animationName };
  });
  /** Waits for the (smooth) scroll to settle: the card fully in view and centred, or its scroller at an end. */
  const settledCard = (page, taskId) => until(`card ${taskId} scrolled into view`, async () => {
    const g = await cardGeometry(page, taskId); return g.inView && (Math.abs(g.centreOffset) <= 3 || g.atEdge) ? g : null;
  }, 5000, 50);
  const treeSelection = (page) => page.evaluate(() => [...document.querySelectorAll('[role="treeitem"][aria-selected="true"], [data-test^="workspace-"][aria-current="true"]')]
    .filter((e) => e.getBoundingClientRect().height > 0)
    .map((e) => `${e.getAttribute('data-test')}:${e.getAttribute('data-agent-run-id') ?? e.getAttribute('data-run-id') ?? e.getAttribute('data-tab-name') ?? ''}`).sort());
  const pickerSelect = (page) => page.locator('[data-test="right-side-projects-panel"] [data-testid="projects-panel-picker-select"]');
  const rightTab = (page, name) => page.locator(`[data-test="right-side-tab-list"] [data-tab-name="${name}"]`);
  /** The user picks the Projects tab (a run with a Team member switches the panel to Team once after it opens). */
  const showProjectsTab = (page) => until('Projects tab chosen', async () => {
    if ((await rightTab(page, 'projects').getAttribute('aria-selected')) !== 'true') await rightTab(page, 'projects').click();
    await sleep(600);
    return (await rightTab(page, 'projects').getAttribute('aria-selected')) === 'true' && pickerSelect(page).isVisible();
  }, 30000, 200);

  /** Opens the Manager's Agent run from the left tree as a user does (the run redirects to /chat?id=…). */
  const openHostRun = async (page, s, rootId = s.agentRoot.rootId, firstWorker = s.workers.agent) => {
    await goto(page, '/workspace');
    await expandWorkspace(page);
    const runRow = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${rootId}"]`);
    if (!(await runRow.count())) await page.locator('[data-test="workspace-agent-row"]', { hasText: s.names.manager }).click();
    await runRow.waitFor({ timeout: 30000 });
    await runRow.click();
    await page.waitForURL(/\/chat\?id=/, { timeout: 30000 });
    await summaryIn(agentRow(page, firstWorker)).waitFor({ timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => undefined);
  };
  const expandRow = async (row) => {
    if ((await row.getAttribute('aria-expanded')) === 'false') await row.locator('[data-test="workspace-team-transient-disclosure"]').click();
  };
  /** Opens the Team run from the left tree; its tree (with the Team-host copy) expands. */
  const openTeamHostRun = async (page, s) => {
    await goto(page, '/workspace');
    await expandWorkspace(page);
    const teamRunRow = page.locator(`[data-test="workspace-team-row-${s.teamRoot.rootId}"]`);
    if (!(await teamRunRow.count())) await page.locator(`[data-test="workspace-team-definition-row-${slug(s.names.team)}"]`).click();
    await teamRunRow.click();
    await summaryIn(agentRow(page, s.workers.teamHost)).waitFor({ timeout: 30000 });
  };
  /** Records every GraphQL operation the page sends. */
  const recordGraphql = (page) => {
    const operations = [];
    page.on('request', (r) => {
      if (!r.url().includes('/graphql') || r.method() !== 'POST') return;
      try { const body = JSON.parse(r.postData() ?? '{}'); operations.push({ at: Date.now(), name: body.operationName ?? null, variables: body.variables ?? {} }); } catch { /* not JSON */ }
    });
    return operations;
  };

  // ------------------------------------------------------------ PMU-020
  /**
   * AC-001/002/003/016, REQ-001/002/008, QR-001: summaries under the agent copy, the task Team copy, the Temp copy
   * (Agent host) and the Team-host copy; none under team members and the sub-work copy. The
   * server answers each worker's current Task (GraphQL) and the tree reads them in batches, never the Task lists.
   */
  const rows = async () => {
    const s = await setupLocator();
    const { page, errors } = await newPage({ width: 1440, height: 900 });
    const operations = recordGraphql(page);
    await openHostRun(page, s);
    await expandRow(teamRow(page, s.agentRoot.rootId, s.names.squad));
    // Sub-work (the agent copy's own delegate_task) appears in the host tree.
    const subWork = addressRow(page, `/${segment(s.names.verifier)}`);
    await expandRow(agentRow(page, s.workers.agent));
    await until('sub-work copy row shown', async () => (await subWork.count()) === 1, 60000);
    const tempRow = page.locator(`${ROW}[data-member-address="/${segment(s.names.helper)}"][data-transient-kind="task_agent"]:visible`).first();
    s.workers.temp ??= await tempRow.getAttribute('data-agent-run-id');
    const subWorkRunId = await subWork.getAttribute('data-agent-run-id');
    await until('Temp copy summary', async () => (await summaryIn(agentRow(page, s.workers.temp)).count()) === 1, 15000);
    await sleep(1000);

    const listed = await page.locator(`[data-test="workspace-agent-run-task-tree"][data-run-id="${s.agentRoot.rootId}"] ${ROW}`).evaluateAll((es) => es.map((e) => ({
      kind: e.getAttribute('data-transient-kind'), address: e.getAttribute('data-member-address'), agentRunId: e.getAttribute('data-agent-run-id'),
      height: Math.round(e.getBoundingClientRect().height),
      summary: e.querySelector('[data-test="workspace-task-worker-task-summary"]')?.textContent ?? null,
      label: e.getAttribute('aria-label') })));
    const byRun = (id) => listed.find((r) => r.agentRunId === id);
    const teamListed = listed.find((r) => r.kind === 'task_team');
    const agentKey = await keyOf(s.projectA, s.tasks.agent), teamKey = await keyOf(s.projectA, s.tasks.team);
    assert(byRun(s.workers.agent)?.summary === 'Ship the copy Task summary in the tree' && !byRun(s.workers.agent).summary.includes(agentKey) && byRun(s.workers.agent).height === 46, 'agent copy: first line as summary, no key, 46 px row', listed);
    assert(byRun(s.workers.temp)?.summary === 'Check the FAQ links.', 'Temp copy summary', listed);
    assert(teamListed?.summary?.startsWith('Review the locate journey') && !teamListed.summary.includes(teamKey) && teamListed.height === 46, 'task Team copy summary', listed);
    const oneLine = listed.filter((r) => r.kind === 'task_team_child' || r.agentRunId === subWorkRunId);
    assert(oneLine.length >= 3 && oneLine.every((r) => r.summary === null && r.height === 28 && !/Task:/.test(r.label)), 'members and sub-work: one line, no Task in the name', oneLine);
    assert(byRun(s.workers.agent).label.endsWith(', Task: Ship the copy Task summary in the tree'), 'row accessible name gains the Task', byRun(s.workers.agent));

    // REQ-002 values (the agent copy; the Team row for weight and ellipsis), elbow and chevron on the name line.
    const agentSummary = summaryIn(agentRow(page, s.workers.agent));
    const style = await agentSummary.evaluate((e) => {
      const st = getComputedStyle(e); const name = e.previousElementSibling.getBoundingClientRect(); const r = e.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(e); const text = range.getBoundingClientRect();
      return { fontSize: st.fontSize, lineHeight: st.lineHeight, fontWeight: st.fontWeight, color: st.color, gapAbove: Math.round((r.top - name.bottom) * 10) / 10,
        textLeftMinusName: Math.round((text.left - name.left) * 10) / 10, title: e.getAttribute('title'), ariaLabel: e.getAttribute('aria-label'),
        ariaCurrent: e.getAttribute('aria-current'), ariaSelected: e.getAttribute('aria-selected'), tag: e.tagName };
    });
    assert(style.tag === 'BUTTON' && style.fontSize === '11px' && style.lineHeight === '16px' && style.fontWeight === '400' && style.color === GRAY_500
      && style.gapAbove === 2 && Math.abs(style.textLeftMinusName) <= 0.5 && style.ariaCurrent === null && style.ariaSelected === null
      && style.title === 'Show Task in Projects: Ship the copy Task summary in the tree' && style.ariaLabel === style.title, 'summary presentation (REQ-002, REQ-010; task-keys-declutter REQ-002)', style);
    const team = await teamRow(page, s.agentRoot.rootId, s.names.squad).evaluate((row) => {
      const top = row.getBoundingClientRect().top; const summary = row.querySelector('[data-test="workspace-task-worker-task-summary"]');
      const branch = row.querySelector('.hierarchy-current-branch'); const elbow = getComputedStyle(branch, '::after');
      const chevron = row.querySelector('[data-test="workspace-team-transient-disclosure"]').getBoundingClientRect();
      const name = row.querySelector('.block.truncate').getBoundingClientRect();
      return { weight: getComputedStyle(summary).fontWeight, ellipsis: getComputedStyle(summary).textOverflow, truncated: summary.scrollWidth > summary.clientWidth,
        elbowFromRowTop: Math.round((branch.getBoundingClientRect().top - top + parseFloat(elbow.top)) * 10) / 10,
        chevronCentre: Math.round((chevron.top + chevron.height / 2 - top) * 10) / 10, nameCentre: Math.round((name.top + name.height / 2 - top) * 10) / 10 };
    });
    assert(team.weight === '400' && team.ellipsis === 'ellipsis' && team.truncated && Math.abs(team.elbowFromRowTop - 14) <= 1
      && Math.abs(team.chevronCentre - 14) <= 1 && Math.abs(team.nameCentre - 14) <= 1, 'Team row: weight 400 on a semibold row, ellipsis, elbow and chevron on the name line', team);
    await shot(page, 'pmu-020-rows-agent-host');
    await agentSummary.hover(); await sleep(300);
    const hover = await agentSummary.evaluate((e) => ({ color: getComputedStyle(e).color, line: getComputedStyle(e).textDecorationLine, offset: getComputedStyle(e).textUnderlineOffset }));
    assert(hover.color === INDIGO_700 && hover.line === 'underline' && hover.offset === '2px', 'hover: indigo-700, underline, 2 px offset', hover);
    await shot(page, 'pmu-020-summary-hover');
    await page.mouse.move(1200, 850);

    // The server's answers through the real GraphQL query (sub-work is no Task's root).
    const answers = await workerTasks([s.workers.agent, s.workers.temp, subWorkRunId, s.workers.teamHost], [s.workers.team]);
    const answer = (id) => answers.find((a) => a.workerRunId === id)?.task ?? null;
    assert(answer(s.workers.agent)?.taskId === s.tasks.agent && answer(s.workers.agent).projectId === s.projectA && answer(s.workers.temp)?.projectId === null
      && answer(s.workers.team)?.taskId === s.tasks.team && answer(s.workers.teamHost)?.taskId === s.tasks.teamHost
      && answer(subWorkRunId) === null, 'GraphQL taskWorkerTasks answers', answers);

    // QR-001 / AC-016: batched reads of the shown workers; the tree never reads a Task list.
    const reads = operations.filter((o) => o.name === 'GetTaskWorkerTasks');
    const perRead = reads.map((o) => (o.variables.agentRunIds?.length ?? 0) + (o.variables.teamRunIds?.length ?? 0));
    assert(reads.length >= 1 && reads.length <= 6 && Math.max(...perRead) >= 4, 'one batched read per batch of shown workers', { reads });
    const listReads = operations.filter((o) => o.name === 'GetProjectTasks' || o.name === 'GetTasksWithoutProject');
    const listScopes = [...new Set(listReads.map((o) => o.variables.projectId ?? 'temp'))];
    assert(listScopes.length <= 1, 'no Task list read per row or per Project (only the open Projects tab board)', { listReads });

    // Team host: its delegated member copy shows its Task summary (DEC-001 b).
    await openTeamHostRun(page, s);
    const teamHostSummary = await summaryLabel(summaryIn(agentRow(page, s.workers.teamHost)));
    assert(teamHostSummary === 'Draft the release notes for the beta', 'Team-host copy summary, no key', { teamHostSummary });
    await shot(page, 'pmu-020-rows-team-host');
    assertNoBrowserErrors(errors);
    return { listed, style, team, hover, answers, reads: reads.map((o) => o.variables), listScopes, teamHostSummary, subWorkRunId };
  };

  // ------------------------------------------------------------ PMU-021
  /**
   * AC-004..AC-007, AC-009, AC-013, AC-014, REQ-003..REQ-007: locate from the tree with the panel docked. Picker
   * switch to another Project and to Temp tasks (remembered after reload), card centred / focused / highlighted for
   * 2.4 s, center and tree selection unchanged, Enter opens the Task, an open Task returns to the board, only the
   * latest of two locates highlighted, a search kept or cleared; keyboard Tab / Enter / Space; a row click (agent copy,
   * task Team copy) opens the copy and locates nothing.
   */
  const locateDocked = async () => {
    const s = await setupLocator();
    const { page, errors } = await newPage({ width: 1440, height: 900 });
    const details = {};
    await openHostRun(page, s);
    if (!s.workers.temp) s.workers.temp = await page.locator(`${ROW}[data-member-address="/${segment(s.names.helper)}"][data-transient-kind="task_agent"]:visible`).first().getAttribute('data-agent-run-id');
    // A manual pick of the other Project first, so the locate has to switch it; then the panel shows another tab.
    await showProjectsTab(page);
    await pickerSelect(page).selectOption(`project:${s.projectB}`);
    await sleep(800);
    await rightTab(page, 'files').click();
    await until('docked on another tab', async () => !(await page.locator('[data-test="right-side-projects-panel"]').count()), 10000);
    // The center is the host's live conversation: read it only after the Manager's tool reply is shown and the text is
    // stable, so a late reply or status change under load is not mistaken for the locate opening something. Each check
    // compares with a baseline read just before its own action.
    const settledCenter = (label) => until(`host conversation settled (${label})`, async () => {
      const first = await centerText(page);
      // The Manager's header status must have left Running too: it turns Idle after the reply is shown.
      if (!first.includes('CALLED:') || /\nRunning\n/.test(first)) return null;
      await sleep(1000);
      return first === await centerText(page) ? first : null;
    }, 30000);
    const centerBefore = await settledCenter('before the docked locate');
    const selectionBefore = await selectionState(page); const treeBefore = await treeSelection(page);

    await summaryIn(agentRow(page, s.workers.agent)).click();
    details.first = await located(page, s.tasks.agent, 'docked');
    details.highlight = await cardGeometry(page, s.tasks.agent);
    details.firstGeometry = await settledCard(page, s.tasks.agent);
    assert(details.first.picker === `project:${s.projectA}` && (await rightTab(page, 'projects').getAttribute('aria-selected')) === 'true', 'Projects tab shown, picker switched to the Task\'s Project', details.first);
    assert(details.firstGeometry.inView && (Math.abs(details.firstGeometry.centreOffset) <= 3 || details.firstGeometry.atEdge), 'card centred in the tab', details.firstGeometry);
    assert(details.highlight.background === LOCATED_BG && details.highlight.boxShadow.includes(INDIGO_500) && details.highlight.animation.startsWith('task-live'),
      'located highlight: #eef2ff wash, inset #6366f1 bar (task-live)', details.highlight);
    await shot(page, 'pmu-021-located-docked');
    const centerAfter = await centerText(page); const selectionAfter = await selectionState(page); const treeAfter = await treeSelection(page);
    assert(centerAfter === centerBefore && JSON.stringify(selectionAfter) === JSON.stringify(selectionBefore)
      && JSON.stringify(treeAfter) === JSON.stringify(treeBefore), 'center view and tree selection unchanged',
    { selectionBefore, selectionAfter, treeBefore, treeAfter, centerDiff: textDiff(centerBefore, centerAfter) });
    await sleep(LIVE_HIGHLIGHT_MS + 300);
    details.afterHighlight = await panelState(page);
    assert(details.afterHighlight.located.length === 0, 'highlight ends after 2.4 s', details.afterHighlight);

    // Temp tasks; Enter on the focused card opens the Task in the tab.
    await summaryIn(agentRow(page, s.workers.temp)).click();
    details.temp = await located(page, s.tempTaskId, 'Temp task');
    assert(details.temp.picker === 'temp', 'picker on Temp tasks', details.temp);
    await page.keyboard.press('Enter');
    await page.getByTestId('projects-panel-task-description').waitFor({ timeout: 10000 });
    await shot(page, 'pmu-021-temp-task-opened');
    // From the open Task: the task Team copy's summary returns the tab to the board of its Project.
    await summaryIn(teamRow(page, s.agentRoot.rootId, s.names.squad)).click();
    details.fromOpenTask = await located(page, s.tasks.team, 'from an open Task');
    assert(details.fromOpenTask.picker === `project:${s.projectA}` && !(await page.getByTestId('projects-panel-task-description').count()), 'board shown again', details.fromOpenTask);
    // Two locates in quick succession: only the latest card is highlighted.
    await summaryIn(agentRow(page, s.workers.agent)).click();
    await sleep(120);
    await summaryIn(teamRow(page, s.agentRoot.rootId, s.names.squad)).click();
    details.twice = await located(page, s.tasks.team, 'second of two locates');
    await sleep(300);
    assert((await panelState(page)).located.length === 1, 'only the latest located card highlighted', await panelState(page));

    // Search: kept when it still shows the Task, cleared when it hides it.
    const search = page.locator('[data-test="right-side-projects-panel"] [data-testid="project-tasks-search-input"]');
    await search.fill('ship the copy');
    await summaryIn(agentRow(page, s.workers.agent)).click();
    await located(page, s.tasks.agent, 'search that still shows the Task');
    details.searchKept = await search.inputValue();
    await search.fill('backlog');
    await shot(page, 'pmu-021-search-hides-task');
    await summaryIn(agentRow(page, s.workers.agent)).click();
    await located(page, s.tasks.agent, 'search that hides the Task');
    details.searchCleared = await search.inputValue();
    assert(details.searchKept === 'ship the copy' && details.searchCleared === '', 'search kept / cleared', details);
    await shot(page, 'pmu-021-search-cleared-located');

    // Keyboard: Tab from the row reaches the summary (focus ring); Enter and Space locate, the row is not opened.
    await agentRow(page, s.workers.agent).focus();
    await page.keyboard.press('Tab');
    details.keyboardFocus = await page.evaluate(() => ({ test: document.activeElement?.getAttribute('data-test'), ring: getComputedStyle(document.activeElement).boxShadow }));
    assert(details.keyboardFocus.test === 'workspace-task-worker-task-summary' && details.keyboardFocus.ring.includes(INDIGO_500), 'Tab reaches the summary with the indigo-500 ring', details.keyboardFocus);
    await shot(page, 'pmu-021-summary-keyboard-focus');
    const centerBeforeKeys = await settledCenter('before the keys'); const selectionBeforeKeys = await selectionState(page);
    await page.keyboard.press('Enter');
    await located(page, s.tasks.agent, 'Enter on the summary');
    await agentRow(page, s.workers.temp).focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press(' ');
    await located(page, s.tempTaskId, 'Space on the summary');
    const selectionAfterKeys = await selectionState(page); const centerAfterKeys = await centerText(page);
    assert(JSON.stringify(selectionAfterKeys) === JSON.stringify(selectionBeforeKeys) && centerAfterKeys === centerBeforeKeys, 'Enter / Space neither open nor toggle the row',
      { selectionBeforeKeys, selectionAfterKeys, centerDiff: textDiff(centerBeforeKeys, centerAfterKeys) });

    // The choice made by a locate is remembered like a manual pick (reload).
    await summaryIn(agentRow(page, s.workers.agent)).click();
    await located(page, s.tasks.agent, 'before reload');
    await sleep(500);
    await page.reload({ waitUntil: 'networkidle' });
    await showProjectsTab(page);
    details.pickerAfterReload = await until('picker restored', async () => { const v = await pickerSelect(page).inputValue(); return v || null; }, 15000);
    assert(details.pickerAfterReload === `project:${s.projectA}`, 'locate choice remembered after reload', details);

    // BEH-002: a row click opens the copy (and the task Team row its coordinator); nothing is located.
    await summaryIn(agentRow(page, s.workers.agent)).waitFor({ timeout: 30000 });
    await sleep(LIVE_HIGHLIGHT_MS);
    await agentRow(page, s.workers.agent).locator('span.block.truncate').click();
    await until('agent copy opened', async () => (await agentRow(page, s.workers.agent).getAttribute('aria-selected')) === 'true' && /You have a new task from/.test(await centerText(page)), 20000);
    await sleep(500);
    details.rowClick = await panelState(page);
    details.selectedSummaryColour = await summaryIn(agentRow(page, s.workers.agent)).evaluate((e) => getComputedStyle(e).color);
    assert(details.rowClick.located.length === 0 && details.selectedSummaryColour === INDIGO_700, 'row click opens the copy, locates nothing; summary #4338ca on the selected row', details);
    await shot(page, 'pmu-021-row-click-copy-open');
    // The row keeps its behaviour (BEH-002): it opens the coordinator's conversation and toggles the Team's rows.
    const expandedBefore = await teamRow(page, s.agentRoot.rootId, s.names.squad).getAttribute('aria-expanded');
    await teamRow(page, s.agentRoot.rootId, s.names.squad).locator('span.block.truncate').click();
    await until('task Team copy opened at its coordinator', async () => /Review the locate journey/.test(await centerText(page))
      && (await teamRow(page, s.agentRoot.rootId, s.names.squad).getAttribute('aria-expanded')) !== expandedBefore, 20000);
    await sleep(500);
    details.teamRowClick = await panelState(page);
    assert(details.teamRowClick.located.length === 0, 'Team copy row click locates nothing', details.teamRowClick);
    details.teamSummaryStillLocates = await summaryIn(teamRow(page, s.agentRoot.rootId, s.names.squad)).click().then(() => located(page, s.tasks.team, 'Team copy summary after its row opened'));
    await shot(page, 'pmu-021-team-copy-open-summary-located');
    assertNoBrowserErrors(errors);
    return details;
  };

  // ------------------------------------------------------------ PMU-022
  /** AC-008, REQ-004, REQ-006: hidden panel reopened docked; narrow drawer with reduced motion; start surface (New chat). */
  const revealVariants = async () => {
    const s = await setupLocator();
    const details = {};
    {
      const { page, errors } = await newPage({ width: 1440, height: 900 });
      await openHostRun(page, s);
      await page.locator('[data-test="right-side-panel-toggle"]').first().click();
      await until('right panel hidden', async () => !(await page.locator('[data-test="workspace-right-panel"]').count()), 10000);
      await shot(page, 'pmu-022-panel-hidden');
      await summaryIn(agentRow(page, s.workers.agent)).click();
      details.reopened = await located(page, s.tasks.agent, 'hidden panel');
      await settledCard(page, s.tasks.agent);
      assert(details.reopened.docked && !details.reopened.drawer, 'panel reopened docked on Projects', details.reopened);
      await shot(page, 'pmu-022-panel-reopened-located');
      assertNoBrowserErrors(errors);
    }
    {
      const { page, errors } = await newPage({ width: 900, height: 800 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openHostRun(page, s);
      await summaryIn(agentRow(page, s.workers.agent)).click();
      details.drawer = await located(page, s.tasks.agent, 'narrow drawer');
      assert(details.drawer.drawer && !details.drawer.docked, 'right drawer opened on Projects', details.drawer);
      // Static: the full wash at 0.4 s and still at 2.0 s (the animated highlight has faded by then), gone after 2.4 s.
      await sleep(400);
      details.drawerGeometry = await cardGeometry(page, s.tasks.agent);
      await shot(page, 'pmu-022-narrow-drawer-located');
      await sleep(1600);
      details.drawerLate = await cardGeometry(page, s.tasks.agent);
      assert(details.drawerGeometry.animation === 'none' && details.drawerGeometry.inView && details.drawerGeometry.background === LOCATED_BG
        && details.drawerLate.background === LOCATED_BG && details.drawerLate.boxShadow.includes(INDIGO_500), 'reduced motion: static highlight, card in view', details);
      await sleep(LIVE_HIGHLIGHT_MS - 2000 + 500);
      assert((await panelState(page)).located.length === 0, 'static highlight ends after 2.4 s', await panelState(page));
      assertNoBrowserErrors(errors);
    }
    {
      const { page, errors } = await newPage({ width: 1440, height: 900 });
      await openHostRun(page, s);
      await page.locator('[data-test="app-left-panel-chat"]').click();
      await until('New chat start surface', async () => new URL(page.url()).pathname === '/chat' && !new URL(page.url()).search
        && (await page.locator('[data-test="start-surface-tools-toggle"]').count()) > 0, 20000);
      details.startSurfaceBefore = await panelState(page);
      assert(!details.startSurfaceBefore.docked, 'start surface: tools closed', details.startSurfaceBefore);
      await summaryIn(agentRow(page, s.workers.agent)).click();
      details.startSurface = await located(page, s.tasks.agent, 'start surface');
      await settledCard(page, s.tasks.agent);
      assert(details.startSurface.docked && details.startSurface.path === '/chat', 'start surface: tools opened on Projects, route kept', details.startSurface);
      await shot(page, 'pmu-022-start-surface-located');
      assertNoBrowserErrors(errors);
    }
    return details;
  };

  // ------------------------------------------------------------ PMU-023
  /** AC-020, REQ-012: from pages with no right panel, the summary opens the row's run (no collapse), then locates. */
  const noRightPanel = async () => {
    const s = await setupLocator();
    const details = {};
    for (const viewport of [{ width: 1440, height: 900 }, { width: 900, height: 800 }]) {
      const { page, errors } = await newPage(viewport);
      await openHostRun(page, s);
      if (!s.workers.temp) s.workers.temp = await page.locator(`${ROW}[data-member-address="/${segment(s.names.helper)}"][data-transient-kind="task_agent"]:visible`).first().getAttribute('data-agent-run-id');
      await navTo(page, 'Agents');
      await until('on the Agents page', async () => new URL(page.url()).pathname.startsWith('/agents'), 15000);
      await summaryIn(agentRow(page, s.workers.temp)).waitFor({ timeout: 15000 });
      assert(!(await panelState(page)).docked, 'Agents page has no right panel', await panelState(page));
      await summaryIn(agentRow(page, s.workers.temp)).click();
      const opened = await located(page, s.tempTaskId, `Agents page ${viewport.width}`);
      const runCurrent = await page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${s.agentRoot.rootId}"][aria-current="true"]`).count();
      assert(opened.path === `/chat?id=${s.agentRoot.rootId}` && runCurrent === 1 && (await summaryIn(agentRow(page, s.workers.temp)).count()) === 1,
        'the Agent run opened (its own conversation), tree still expanded, Task located', { opened, runCurrent });
      assert(viewport.width < 1000 ? opened.drawer : opened.docked, 'docked when wide, drawer when narrow', opened);
      await shot(page, `pmu-023-agents-page-located-${viewport.width}`);
      details[`agentHost${viewport.width}`] = { opened, runCurrent };
      assertNoBrowserErrors(errors);
    }
    // Team host: the Team run is open (selected); from the Projects page the summary opens it without collapsing.
    const { page, errors } = await newPage({ width: 1440, height: 900 });
    await openTeamHostRun(page, s);
    const routeOfTeam = new URL(page.url()).pathname;
    await navTo(page, 'Projects');
    await until('on the Projects page', async () => new URL(page.url()).pathname.startsWith('/projects'), 15000);
    await summaryIn(agentRow(page, s.workers.teamHost)).waitFor({ timeout: 15000 });
    await summaryIn(agentRow(page, s.workers.teamHost)).click();
    const teamOpened = await located(page, s.tasks.teamHost, 'Projects page, Team host');
    const teamRunRow = page.locator(`[data-test="workspace-team-row-${s.teamRoot.rootId}"]`);
    details.teamHost = { teamOpened, routeOfTeam, teamRowExpanded: await teamRunRow.getAttribute('aria-expanded'),
      copyRowShown: await agentRow(page, s.workers.teamHost).count(), selection: await selectionState(page) };
    assert(new URL(page.url()).pathname === routeOfTeam && teamOpened.picker === `project:${s.projectB}` && details.teamHost.copyRowShown === 1
      && details.teamHost.teamRowExpanded !== 'false', 'Team run opened without collapsing; Task located in its right panel', details.teamHost);
    await shot(page, 'pmu-023-projects-page-team-host-located');
    assertNoBrowserErrors(errors);
    return details;
  };

  // ------------------------------------------------------------ PMU-024
  /**
   * AC-010, AC-012, AC-015, AC-018, REQ-007..REQ-009, REQ-011 on its own Agent run, live without reload:
   * a rename (UI write); a feed lost while the Task is renamed again, then the reconnect re-reads; the follow-up Task
   * given to the copy by `delegate_task` with its run ID (VIS-008); the Task cancelled just before the click
   * (Cancelled lane, slate-300 pill ring), after which the row leaves; a Task deleted; a Project deleted.
   */
  const liveSummaries = async () => {
    const s = await setupLocator();
    const projectL = await createProject(`Locate Live ${randomUUID().slice(0, 6)}`);
    const projectD = await createProject(`Locate Doomed ${randomUUID().slice(0, 6)}`);
    const live = {
      first: await createTask(projectL, 'Write the changelog'),
      followUp: await createTask(projectL, 'Publish the changelog to the docs site'),
      deleted: await createTask(projectL, 'Translate the changelog'),
      doomed: await createTask(projectD, 'Archive the old release pages'),
    };
    const root = await createRoot('agent', s.ids);
    const input = await managerInput(root);
    input.send(callTool('delegate_task', { recipient_address: `/${segment(s.names.worker)}`, task_id: live.first }));
    const worker = (await started(projectL, live.first, 'live: worker')).ingressAgentRunId;
    input.send(callTool('delegate_task', { recipient_address: `/${segment(s.names.helper)}`, task_id: live.deleted }));
    const helper = (await started(projectL, live.deleted, 'live: helper')).ingressAgentRunId;
    input.send(callTool('delegate_task', { recipient_address: `/${segment(s.names.squad)}`, task_id: live.doomed }));
    const squad = (await started(projectD, live.doomed, 'live: team copy')).teamRunId;

    const { page, context, errors } = await newPage({ width: 1440, height: 900 });
    // Emulated network: the feed can be cut; closure frames of the run stream can be held (see the file header).
    const net = { feedBlocked: false, feedSockets: new Set(), holdClosure: false, held: [] };
    await context.routeWebSocket((url) => url.pathname === '/ws/projects', (ws) => {
      if (net.feedBlocked) { ws.close({ code: 1006 }); return; }
      ws.connectToServer(); net.feedSockets.add(ws);
    });
    await context.routeWebSocket((url) => url.pathname.startsWith('/ws/agent-collaboration/'), (ws) => {
      const server = ws.connectToServer();
      // A delayed stream keeps its order: from the closure frame on, every later frame waits too.
      server.onMessage((message) => {
        if (net.holdClosure && (net.held.length || String(message).includes('task_executions_closed'))) net.held.push(() => ws.send(message)); else ws.send(message);
      });
      ws.onMessage((message) => server.send(message));
    });
    await page.addInitScript(() => { window.__noReload ??= Math.random(); });
    await openHostRun(page, s, root.rootId, worker);
    const marker = await page.evaluate(() => window.__noReload);
    const workerSummary = () => summaryIn(agentRow(page, worker));
    const details = {};

    // Rename (the Task page's Save): autobyteus-260, the tree line is the Task's title.
    await gql('mutation($input:UpdateProjectTaskInput!){updateProjectTask(input:$input){taskId}}', { input: { projectId: projectL, taskId: live.first, title: 'Write the changelog for 1.6', description: 'Write the changelog for 1.6\nwith links' } });
    await until('summary renamed live', async () => (await summaryLabel(workerSummary())) === 'Write the changelog for 1.6', 15000);

    // The feed is lost; a rename made meanwhile is missed; the reconnect re-reads it.
    net.feedBlocked = true;
    for (const ws of net.feedSockets) ws.close({ code: 1006 });
    net.feedSockets.clear();
    await sleep(500);
    await gql('mutation($input:UpdateProjectTaskInput!){updateProjectTask(input:$input){taskId}}', { input: { projectId: projectL, taskId: live.first, title: 'Write the changelog while offline', description: 'Write the changelog while offline' } });
    await sleep(3000);
    details.whileOffline = await summaryLabel(workerSummary());
    assert(details.whileOffline === 'Write the changelog for 1.6', 'the rename is not seen while the feed is lost', details);
    net.feedBlocked = false;
    await until('reconnect re-reads the summary', async () => (await summaryLabel(workerSummary())) === 'Write the changelog while offline', 45000, 200);
    await shot(page, 'pmu-024-reconnect-reread');

    // VIS-008: the copy's Task is done, then the copy is given a follow-up Task with its run ID.
    input.send(callTool('update_task', { task_id: live.first, status: 'DONE' }));
    await until('worker row leaves at DONE', async () => (await agentRow(page, worker).count()) === 0, 30000);
    input.send(callTool('delegate_task', { target_agent_run_id: worker, task_id: live.followUp }));
    await until('worker row returns with the follow-up Task', async () => (await workerSummary().count()) === 1
      && (await summaryLabel(workerSummary())) === 'Publish the changelog to the docs site', 60000);
    const board = await projectTasks(projectL);
    details.followUp = { first: board.find((t) => t.taskId === live.first), followUp: board.find((t) => t.taskId === live.followUp) };
    assert(details.followUp.first?.status === 'DONE' && details.followUp.first.root?.ingressAgentRunId === worker && details.followUp.followUp?.root?.ingressAgentRunId === worker,
      'earlier Task stays in Done with the same worker; the follow-up is its current Task', details.followUp);
    await workerSummary().click();
    details.followUpLocated = await located(page, live.followUp, 'follow-up Task');
    details.followUpDoneCard = await card(page, live.first).evaluate((e) => e.closest('[data-testid^="project-task-column-"]')?.getAttribute('data-testid'));
    assert(details.followUpDoneCard === 'project-task-column-DONE', 'earlier Task in Done on the board', details);
    await shot(page, 'pmu-024-follow-up-located');

    // DEC-006 / VIS-010: the Task is cancelled; the summary is clicked before its row leaves.
    net.holdClosure = true;
    input.send(callTool('update_task', { task_id: live.followUp, status: 'CANCELLED' }));
    await until('Task cancelled on the server', async () => (await projectTasks(projectL)).find((t) => t.taskId === live.followUp)?.status === 'CANCELLED', 30000);
    await until('board knows it is cancelled', async () => (await page.locator('[data-test="right-side-projects-panel"] [data-testid="project-tasks-cancelled-toggle"]').count()) === 1, 15000);
    assert((await workerSummary().count()) === 1, 'the row is still shown when the summary is clicked', { held: net.held.length });
    await workerSummary().click();
    details.cancelled = await located(page, live.followUp, 'closed just before the click');
    details.cancelledLane = await card(page, live.followUp).evaluate((e) => e.closest('[data-testid^="project-task-column-"]')?.getAttribute('data-testid'));
    details.cancelledToggle = await page.locator('[data-test="right-side-projects-panel"] [data-testid="project-tasks-cancelled-toggle"]').getAttribute('aria-pressed');
    assert(details.cancelledLane === 'project-task-column-CANCELLED' && details.cancelledToggle === 'true', '"Cancelled (N)" pressed, card in the Cancelled lane', details);
    await shot(page, 'pmu-024-cancelled-lane-located');
    // REQ-011: the Cancelled pill's slate-300 ring (Enter opens the Task in the tab).
    await page.keyboard.press('Enter');
    await page.getByTestId('projects-panel-task-description').waitFor({ timeout: 10000 });
    details.cancelledPill = await page.locator('[data-test="right-side-projects-panel"] .ring-slate-300').first().evaluate((e) => ({ text: e.textContent.trim(), boxShadow: getComputedStyle(e).boxShadow }));
    assert(details.cancelledPill.boxShadow.includes(SLATE_300), 'Cancelled pill renders the slate-300 ring', details.cancelledPill);
    await shot(page, 'pmu-024-cancelled-pill');
    net.holdClosure = false;
    details.heldClosureFrames = net.held.length;
    for (const release of net.held.splice(0)) release();
    await until('closed row leaves the tree', async () => (await agentRow(page, worker).count()) === 0, 30000);

    // A Task deleted; a Project deleted (its Task's worker answers null): the summaries disappear.
    await gql('mutation($input:DeleteProjectTaskInput!){deleteProjectTask(input:$input)}', { input: { projectId: projectL, taskId: live.deleted } });
    await until('summary removed after Task delete', async () => (await summaryIn(agentRow(page, helper)).count()) === 0, 15000);
    assert((await agentRow(page, helper).count()) === 1, 'the copy row stays, one line', {});
    await gql('mutation($id:String!){deleteProject(projectId:$id)}', { id: projectD });
    await until('summary removed after Project delete', async () => (await summaryIn(teamRow(page, root.rootId, s.names.squad)).count()) === 0, 15000);
    await shot(page, 'pmu-024-deleted-summaries-removed');
    details.noReload = (await page.evaluate(() => window.__noReload)) === marker;
    assert(details.noReload, 'everything happened without a reload', details);
    input.close();
    assertNoBrowserErrors(errors);
    return details;
  };

  // ------------------------------------------------------------ PMU-025
  /** AC-017, REQ-010 in zh-CN: the summary's tooltip / accessible name and the row's accessible name. */
  const chinese = async () => {
    const s = await setupLocator();
    const { page, errors } = await newPage({ width: 1440, height: 900, locale: 'zh-CN' });
    await openHostRun(page, s);
    const summary = summaryIn(agentRow(page, s.workers.agent));
    const zh = { text: await summaryLabel(summary), title: await summary.getAttribute('title'), aria: await summary.getAttribute('aria-label'),
      row: await agentRow(page, s.workers.agent).getAttribute('aria-label') };
    const label = 'Ship the copy Task summary in the tree';
    assert(zh.text === label && zh.title === `在项目中显示任务：${label}` && zh.aria === zh.title && zh.row.endsWith(`, 任务：${label}`), 'zh-CN strings', zh);
    await summary.click();
    zh.located = await located(page, s.tasks.agent, 'zh-CN');
    await settledCard(page, s.tasks.agent);
    await shot(page, 'pmu-025-zh-CN-located');
    assertNoBrowserErrors(errors);
    return zh;
  };

  return {
    'PMU-020': ['Task summaries under delegated copy rows (Agent host: agent, task Team, Temp copies; Team host): one line for members and sub-work; spec values, hover; GraphQL answers; batched reads, no Task-list reads', rows],
    'PMU-021': ['Show Task in Projects, docked: picker switch (remembered after reload), centred / focused / 2.4 s highlight, center and selection unchanged, Temp tasks, Enter opens, back from an open Task, only the latest highlighted, search kept / cleared, keyboard Tab / Enter / Space; a row click (agent copy, Team copy) opens the copy and locates nothing', locateDocked],
    'PMU-022': ['Show Task in Projects: hidden panel reopened docked; 900×800 drawer with reduced motion (static highlight); New chat start surface opens its tools', revealVariants],
    'PMU-023': ['Show Task in Projects from pages with no right panel: Agents page (wide and narrow) opens the Agent run; Projects page opens the selected Team run without collapsing it; then locates', noRightPanel],
    'PMU-024': ['Live summaries without reload: rename; feed lost then reconnect re-read; follow-up Task by run ID (earlier in Done); cancelled just before the click → Cancelled lane and slate-300 pill, then the row leaves; Task delete; Project delete', liveSummaries],
    'PMU-025': ['zh-CN: summary tooltip / accessible name and the row\'s accessible name; locate', chinese],
  };
};
