#!/usr/bin/env node
// Real-stack browser journeys for task-run-resources-workspace-cleanup (temporary API/E2E evidence).
// Stack: owned built backend (dist) + Nuxt dev + headless Chrome (stack.mjs). The Manager's tool calls are real
// scoped-MCP calls made by the repository's scripted AGY CLI; no inference, no mocks between browser and server.
// Usage: node journeys.mjs <case...>   (cases: BR-001 BR-002 BR-003 BR-004 BR-005 BR-006)  --ledger <abs path>
import fs from 'node:fs';
import path from 'node:path';
import * as L from './lib.mjs';

const args = process.argv.slice(2);
const ledger = args.includes('--ledger') ? args[args.indexOf('--ledger') + 1] : null;
const cases = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--ledger');
const out = path.join(L.here, 'journeys');
fs.mkdirSync(out, { recursive: true });
const evidencePath = path.join(out, 'evidence.json');
const evidence = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath, 'utf8')) : { cases: {} };
const save = () => fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SELECTED = 'rgb(238, 242, 255)';

const browser = await L.chromium.launch({ headless: true, executablePath: CHROME });
await L.ensureWorkspace();

const newPage = async ({ reducedMotion = 'no-preference', initScript } = {}) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion, locale: 'en-US' });
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization/.test(m.text())) errors.push(m.text()); });
  return { context, page, errors };
};
const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}.png`) });

/** Opens the Workspaces tree down to the root run and selects/opens that run. */
const openRoot = async (page, root, names) => {
  await page.goto(`${L.state().frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
  await L.until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 2, 60000);
  const ws = page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ });
  const wsRow = (await ws.count()) ? ws.first() : page.locator('[data-test="workspace-row"]').nth(1);
  await wsRow.click();
  if (root.kind === 'agent') {
    await page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager }).click();
    const runRow = page.locator('[data-test="workspace-agent-run-row"]');
    await L.until('agent run row', async () => (await runRow.count()) === 1, 30000);
    await runRow.click();
    await L.until('agent task tree', async () => (await page.locator('[data-test="workspace-agent-run-task-tree"]').count()) === 1, 30000);
    return runRow;
  }
  if (root.kind === 'team') {
    await page.locator(`[data-test="workspace-team-definition-row-${L.segment(names.team).replace(/_/g, '-')}"]`).click();
    const runRow = page.locator(`[data-test="workspace-team-row-${root.rootId}"]`);
    await runRow.click();
    await L.until('team tree', async () => (await page.locator('[data-test="workspace-team-execution-tree"]').count()) >= 1, 30000);
    return runRow;
  }
  await page.locator(`[data-test="agent-org-definition-${L.segment(names.org).replace(/_/g, '-')}"]`).click();
  const runRow = page.locator(`[data-test="agent-org-run-open-${root.rootId}"]`);
  await runRow.click();
  await L.until('org children', async () => (await page.locator(`[data-test="agent-org-run-children-${root.rootId}"]`).count()) === 1, 30000);
  return runRow;
};
const rowSelector = (kind, ref) => {
  if (kind === 'org') return ref.teamRunId ? `[data-test="agent-org-task-team-row-${ref.teamRunId}"]` : `[data-test="agent-org-task-agent-row-${ref.agentRunId}"]`;
  // Transient rows expose no node Team run ID; each journey root has exactly one task Team.
  return ref.teamRunId ? `[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]`
    : `[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${ref.agentRunId}"]`;
};
/** Per-frame sampler of the given rows (opacity/height/aria-hidden/inert) and the focused element. */
const startSampler = (page, selectors) => page.evaluate((sels) => {
  window.__samples = []; const t0 = performance.now(); const gen = (window.__samplerGen = (window.__samplerGen ?? 0) + 1);
  const tick = () => {
    if (window.__samplerGen !== gen) return; // a newer sampler replaced this one
    window.__samples.push({ t: Math.round(performance.now() - t0), active: document.activeElement?.getAttribute('data-test') ?? document.activeElement?.tagName,
      rows: sels.map((s) => { const e = document.querySelector(s); if (!e) return null;
        // Effective (visible) opacity: a TransitionGroup may animate a wrapper rather than the row itself.
        let op = 1; for (let n = e; n && n.nodeType === 1; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
        const hiddenAncestor = e.closest('[aria-hidden="true"]');
        return { op: Math.round(op * 1000) / 1000, h: Math.round(e.getBoundingClientRect().height * 10) / 10,
          hidden: hiddenAncestor ? 'true' : null, inert: !!e.closest('[inert]'),
          cls: [...e.classList].filter((c) => c.startsWith('tree-row')).join(' '), tr: getComputedStyle(e).transitionProperty.slice(0, 60) }; }) });
    if (performance.now() - t0 < 4000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, selectors);
const samples = (page) => page.evaluate(() => window.__samples);
/** Leave analysis: first frame a row is hidden; opacity mid-leave; frame when all are gone. */
const analyzeLeave = (frames) => {
  const firstHidden = frames.find((f) => f.rows.some((r) => r && r.hidden === 'true'));
  const gone = frames.find((f) => f.rows.every((r) => r === null));
  const mids = frames.filter((f) => f.rows.some((r) => r && r.op > 0.05 && r.op < 0.95));
  return { firstHiddenAt: firstHidden?.t ?? null, goneAt: gone?.t ?? null, leaveMs: firstHidden && gone ? gone.t - firstHidden.t : null,
    midOpacityFrames: mids.length, minHeightSeen: Math.min(...frames.flatMap((f) => f.rows.filter(Boolean).map((r) => r.h))),
    hiddenAndInertAtOnce: !!firstHidden && firstHidden.rows.every((r) => r === null || (r.hidden === 'true' && r.inert)),
    activeAtFirstHidden: firstHidden?.active ?? null };
};

/** Sets up a root with Task A (Agent + delegated helper + brought-in researcher), Task B (Team), non-Task work. */
const setupRoot = async (kind, label, { withB = true, withPlain = true } = {}) => {
  const { ids, names } = await L.createDefinitions(label);
  const { projectId, task } = await L.createProject(label);
  const helper = kind === 'agent' ? `/${L.segment(names.helper)}` : '/helper';
  const worker = kind === 'agent' ? `/${L.segment(names.worker)}` : '/worker';
  const squad = kind === 'org' ? '/squad' : `/${L.segment(names.squad)}`;
  const taskA = await task(L.callTool('delegate_task', { recipient_address: helper,
    description: L.callTool('send_message_to', { recipient_address: `/${L.segment(names.assistant)}`, content: 'Collect the changelog links.' }) }));
  const taskB = await task('Review the docs site.');
  const root = await L.createRoot(kind, ids);
  const input = await L.managerInput(root);
  const count = async () => L.taskNodes(await L.storedTree(root)).length;
  input.send(L.callTool('delegate_task', { recipient_address: worker, task_id: taskA }));
  await L.until('Task A runs', async () => (await count()) >= 3, 60000);
  const aNodes = L.taskNodes(await L.storedTree(root));
  if (withB) { input.send(L.callTool('delegate_task', { recipient_address: squad, task_id: taskB })); await L.until('Task B', async () => (await count()) >= 4, 60000); }
  if (withPlain) { input.send(L.callTool('delegate_task', { recipient_address: worker, description: 'Draft a short summary.' })); await L.until('plain', async () => (await count()) >= aNodes.length + (withB ? 2 : 1), 60000); }
  const all = L.taskNodes(await L.storedTree(root));
  const key = (n) => n.teamRunId ?? n.agentRunId;
  const aRefs = aNodes.map((n) => (n.teamRunId ? { teamRunId: n.teamRunId } : { agentRunId: n.agentRunId }));
  const bNode = all.find((n) => n.teamRunId && !aNodes.some((a) => key(a) === key(n)));
  const plainNode = all.find((n) => !n.teamRunId && !aNodes.some((a) => key(a) === key(n)) && n !== bNode);
  return { ids, names, projectId, taskA, taskB, root, input, aRefs, aAssigned: aNodes.find((n) => n.delegatorAgentRunId === root.managerRunId),
    bRef: bNode ? { teamRunId: bNode.teamRunId } : null, bMembers: bNode?.members ?? [], plainRef: plainNode ? { agentRunId: plainNode.agentRunId } : null };
};

const runCase = async (id, description, fn) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await fn();
    evidence.cases[id] = { result: 'Pass', description, startedAt, finishedAt: new Date().toISOString(), details };
    if (ledger) fs.appendFileSync(ledger, `\n- ${id}: Pass — ${description}. Evidence: ${evidencePath}\n`);
  } catch (error) {
    evidence.cases[id] = { result: 'Fail', description, startedAt, message: error.message, details: error.details, stack: error.stack };
    if (ledger) fs.appendFileSync(ledger, `\n- ${id}: Fail — ${error.message}. Evidence: ${evidencePath}\n`);
  }
  save();
};

/** Live DONE with the closed worker's conversation open and focused; asserts motion, fallback, remaining rows. */
const classLog = `(() => { window.__classLog = []; const t0 = performance.now();
  new MutationObserver((records) => { for (const r of records) { const e = r.target; if (e.getAttribute && e.getAttribute('role') === 'treeitem' && r.attributeName === 'class') {
    const c = [...e.classList].filter((x) => x.startsWith('tree-row')).join(' '); const id = e.getAttribute('data-agent-run-id') || e.getAttribute('data-test');
    const last = window.__classLog.findLast?.((x) => x.id === id); if (!last || last.c !== c) window.__classLog.push({ t: Math.round(performance.now() - t0), id, c }); } } })
    .observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] }); window.__classT0 = t0; })();`;
const liveDoneJourney = async (kind, label) => {
  const findings = []; // motion findings are recorded, and the rest of the journey still runs
  const soft = (cond, message, details) => { if (!cond) findings.push({ message, details }); };
  const s = await setupRoot(kind, label);
  const { page, errors, context } = await newPage({ initScript: classLog });
  const runRow = await openRoot(page, s.root, s.names);
  const aSel = s.aRefs.map((ref) => rowSelector(kind, ref));
  for (const sel of aSel) await page.locator(sel).waitFor({ state: 'visible', timeout: 30000 });
  if (kind === 'org') { // Org task Team rows start collapsed only when not expanded; members of B must render to check they stay.
    const bRow = page.locator(rowSelector(kind, s.bRef));
    if ((await bRow.getAttribute('aria-expanded')) === 'false') await bRow.click();
  }
  // AC-008 precondition: the Manager talks to Task A's worker.
  s.input.send(L.callTool('send_message_to', { target_agent_run_id: s.aAssigned.agentRunId, content: 'Status of the release notes?' }));
  // Open the worker's conversation and keep keyboard focus on its row (AC-009).
  const worker = page.locator(rowSelector(kind, { agentRunId: s.aAssigned.agentRunId }));
  await worker.click();
  await L.until('worker conversation open', async () => /Task delegator address/.test(await page.locator('[data-test="workspace-center-pane"]').innerText()), 30000);
  await worker.focus();
  const beforeShot = `${kind}-live-before`;
  await shot(page, beforeShot);
  const otherSel = [s.bRef && rowSelector(kind, s.bRef), s.plainRef && rowSelector(kind, s.plainRef)].filter(Boolean);
  // BR-002M: reproduce the round-1 state exactly — the leaving rows still carry a FLIP `tree-row-move`
  // (observed 4/4 in round 1 after the worker click) when the DONE leave starts.
  const forcedMove = process.env.JOURNEY_STALE_MOVE === '1'
    ? await page.evaluate((sels) => sels.map((sel) => { const e = document.querySelector(sel); e?.classList.add('tree-row-move'); return !!e?.classList.contains('tree-row-move'); }), aSel)
    : null;
  await startSampler(page, aSel);
  const sentAt = Date.now();
  s.input.send(L.callTool('create_or_update_task', { project_id: s.projectId, task_id: s.taskA, status: 'DONE' }));
  await L.until('Task A rows gone', async () => { for (const sel of aSel) if (await page.locator(sel).count()) return false; return true; }, 60000);
  const latencyMs = Date.now() - sentAt;
  await L.sleep(500);
  const aFrames = await samples(page);
  const classHistory = await page.evaluate(() => window.__classLog.filter((x) => x.c.includes('tree-row-move') || x.c.includes('leave') || x.c === ''));
  const leave = { ...analyzeLeave(aFrames), frames: aFrames.filter((f, i) => i < 3 || f.rows.some((r) => r && r.hidden)).slice(0, 25),
    aIds: s.aRefs.map((r) => r.agentRunId), classHistory: classHistory.filter((x) => s.aRefs.some((r) => r.agentRunId === x.id)).slice(-40) };
  assert(leave.hiddenAndInertAtOnce, 'leaving rows not aria-hidden+inert at once', leave);
  const firstHiddenFrame = aFrames.find((f) => f.rows.some((r) => r && r.hidden === 'true'));
  leave.moveClassAtLeaveStart = firstHiddenFrame ? firstHiddenFrame.rows.map((r) => !!r && r.cls.includes('tree-row-move')) : null;
  leave.forcedMove = forcedMove;
  soft(leave.midOpacityFrames >= 3, 'Task A rows: no visible fade/collapse frames (AC-010)', { kind, leave });
  assert(leave.leaveMs !== null && leave.leaveMs >= 150 && leave.leaveMs <= 450, 'leave duration outside ~200 ms', leave);
  for (const sel of otherSel) assert(await page.locator(sel).count() === 1, `non-closed row left: ${sel}`);
  // Focus moved to the root run row, and selection returned to the Manager (AC-009).
  const active = await page.evaluate(() => document.activeElement?.getAttribute('data-test'));
  const runTest = await runRow.getAttribute('data-test');
  assert(active === runTest, 'focus did not move to the root run row', { active, runTest, leave });
  const center = await page.locator('[data-test="workspace-center-pane"]').innerText();
  assert(!/Task delegator address/.test(center), 'main view still shows the closed worker conversation', { center: center.slice(0, 400) });
  let selection;
  if (kind === 'agent') {
    selection = await runRow.evaluate((e) => getComputedStyle(e).backgroundColor);
    assert(selection === SELECTED, 'Agent run row not selected after fallback', { selection });
  } else {
    const managerRow = kind === 'team' ? page.locator(`[data-test="workspace-team-member-${s.root.rootId}-/manager"]`)
      : page.locator(`[data-test="agent-org-agent-row-${s.root.managerRunId}"]`);
    selection = await managerRow.getAttribute('aria-selected');
    assert(selection === 'true', 'Manager (delegator) not selected after fallback', { selection });
  }
  await shot(page, `${kind}-live-after`);
  // AC-008: Team tab still lists the Manager's messages with the closed worker.
  await page.locator('[data-test="right-side-tab-list"]').getByText('Team', { exact: true }).click().catch(() => {});
  await L.sleep(800);
  const teamTab = await page.locator('[data-test="workspace-right-panel"]').innerText();
  assert(/Status of the release notes\?/.test(teamTab), 'Team tab lost the Manager message with the closed run', { teamTab: teamTab.slice(0, 600) });
  await shot(page, `${kind}-team-tab-after`);
  // AC-006: reopen Task A and delegate again — the new run appears, old ones stay hidden.
  s.input.send(L.callTool('create_or_update_task', { project_id: s.projectId, task_id: s.taskA, status: 'IN_PROGRESS' }));
  await L.until('reopened', async () => (await L.taskStatus(s.projectId, s.taskA)) === 'IN_PROGRESS', 30000);
  const beforeNodes = L.taskNodes(await L.storedTree(s.root)).map((n) => n.agentRunId ?? n.teamRunId);
  s.input.send(L.callTool('delegate_task', { recipient_address: kind === 'agent' ? `/${L.segment(s.names.worker)}` : '/worker', task_id: s.taskA }));
  const fresh = await L.until('redelegated node', async () => L.taskNodes(await L.storedTree(s.root)).find((n) => !beforeNodes.includes(n.agentRunId ?? n.teamRunId)), 60000);
  await page.locator(rowSelector(kind, { agentRunId: fresh.agentRunId })).waitFor({ state: 'visible', timeout: 30000 });
  for (const sel of aSel) assert(await page.locator(sel).count() === 0, `old closed row reappeared: ${sel}`);
  await shot(page, `${kind}-reopen-redelegate`);
  // Team-root members of a closed Task Team (AC-002): close Task B through the UI composer as the user would ask.
  let bLeave = null;
  if (s.bRef) {
    const bSel = rowSelector(kind, s.bRef);
    if (kind !== 'org') { const bRow = page.locator(bSel); if ((await bRow.getAttribute('aria-expanded')) === 'false') await bRow.locator('[data-test="workspace-team-transient-disclosure"]').click(); }
    else { const bRow = page.locator(bSel); if ((await bRow.getAttribute('aria-expanded')) === 'false') await bRow.click(); }
    const memberSel = s.bMembers.map((id) => rowSelector(kind, { agentRunId: id }));
    await L.until('B members visible', async () => { for (const sel of memberSel) if (!(await page.locator(sel).count())) return false; return true; }, 30000);
    // Select the Manager (run row for Agent root; Manager member for Team/Org) and type into the real composer.
    if (kind === 'agent') await runRow.click();
    else if (kind === 'team') await page.locator(`[data-test="workspace-team-member-${s.root.rootId}-/manager"]`).click();
    else await page.locator(`[data-test="agent-org-agent-row-${s.root.managerRunId}"]`).click();
    await L.sleep(800);
    const composer = page.locator('[data-test="workspace-center-pane"] textarea').first();
    await composer.fill(L.callTool('create_or_update_task', { project_id: s.projectId, task_id: s.taskB, status: 'DONE' }));
    await startSampler(page, [bSel, ...memberSel]);
    await composer.press('Enter');
    await L.until('Task B team + members gone', async () => { for (const sel of [bSel, ...memberSel]) if (await page.locator(sel).count()) return false; return true; }, 60000);
    await L.sleep(400);
    const bFrames = await samples(page);
    bLeave = { ...analyzeLeave(bFrames), selectors: [bSel, ...memberSel],
      frames: bFrames.filter((f, i) => i < 4 || f.rows.some((r) => r && r.op > 0.05 && r.op < 0.95) || i % 20 === 0).slice(0, 60) };
    assert(bLeave.hiddenAndInertAtOnce, 'Task Team rows not hidden/inert at once', bLeave);
    soft(bLeave.midOpacityFrames >= 3, 'Task Team rows: no visible fade/collapse frames (AC-010)', { kind, bLeave });
    assert((await L.taskStatus(s.projectId, s.taskB)) === 'DONE', 'Task B not DONE through the composer');
    if (s.plainRef) assert(await page.locator(rowSelector(kind, s.plainRef)).count() === 1, 'non-Task row left with Task B');
    await shot(page, `${kind}-task-team-closed-via-composer`);
  }
  s.input.close();
  const consoleErrors = [...errors];
  await context.close();
  assert(consoleErrors.length === 0, 'browser errors', consoleErrors);
  const result = { root: s.root, aRefs: s.aRefs, bRef: s.bRef, bMembers: s.bMembers, plainRef: s.plainRef, latencyMs, leave, bLeave, selection, active,
    redelegated: fresh, setup: { projectId: s.projectId, taskA: s.taskA, taskB: s.taskB }, names: s.names, findings };
  keep(kind, result);
  if (findings.length) { const e = new Error(findings.map((f) => f.message).join('; ')); e.details = result; throw e; }
  return result;
};

/** Reduced motion: rows are removed without a fade; focus still moves to the run row. */
const reducedMotionJourney = async (kind, label) => {
  const s = await setupRoot(kind, label, { withB: false });
  const { page, errors, context } = await newPage({ reducedMotion: 'reduce' });
  const runRow = await openRoot(page, s.root, s.names);
  const aSel = s.aRefs.map((ref) => rowSelector(kind, ref));
  for (const sel of aSel) await page.locator(sel).waitFor({ state: 'visible', timeout: 30000 });
  await page.locator(aSel[0]).focus();
  await startSampler(page, aSel);
  s.input.send(L.callTool('create_or_update_task', { project_id: s.projectId, task_id: s.taskA, status: 'DONE' }));
  await L.until('rows gone', async () => { for (const sel of aSel) if (await page.locator(sel).count()) return false; return true; }, 60000);
  await L.sleep(300);
  const leave = analyzeLeave(await samples(page));
  assert(leave.midOpacityFrames === 0, 'reduced motion still fades', leave);
  assert(leave.leaveMs !== null && leave.leaveMs <= 80, 'reduced-motion removal not immediate (≤ ~5 frames)', leave);
  const active = await page.evaluate(() => document.activeElement?.getAttribute('data-test'));
  assert(active === await runRow.getAttribute('data-test'), 'focus not on run row (reduced motion)', { active });
  assert(await page.locator(rowSelector(kind, s.plainRef)).count() === 1, 'non-Task row missing');
  await shot(page, `${kind}-reduced-motion-after`);
  s.input.close();
  const consoleErrors = [...errors]; await context.close();
  assert(consoleErrors.length === 0, 'browser errors', consoleErrors);
  return { root: s.root, leave, active };
};

/** CR-001: the last task rows under a standalone Agent run leave with motion, then the empty tree disappears. */
const lastRowsJourney = async () => {
  const s = await setupRoot('agent', 'LastRows', { withB: false, withPlain: false });
  const { page, errors, context } = await newPage();
  const runRow = await openRoot(page, s.root, s.names);
  const aSel = s.aRefs.map((ref) => rowSelector('agent', ref));
  for (const sel of aSel) await page.locator(sel).waitFor({ state: 'visible', timeout: 30000 });
  await page.locator(aSel[1]).focus();
  await page.evaluate(() => { window.__treeFrames = []; const t0 = performance.now();
    const tick = () => { window.__treeFrames.push({ t: Math.round(performance.now() - t0), tree: !!document.querySelector('[data-test="workspace-agent-run-task-tree"]'),
      rows: document.querySelectorAll('[data-test="workspace-team-transient-execution-row"]').length }); if (performance.now() - t0 < 4000) requestAnimationFrame(tick); };
    window.__startTree = () => requestAnimationFrame(tick); });
  await startSampler(page, aSel);
  await page.evaluate(() => window.__startTree());
  s.input.send(L.callTool('create_or_update_task', { project_id: s.projectId, task_id: s.taskA, status: 'DONE' }));
  await L.until('tree removed', async () => (await page.locator('[data-test="workspace-agent-run-task-tree"]').count()) === 0, 60000);
  await L.sleep(300);
  const leave = analyzeLeave(await samples(page));
  const treeFrames = await page.evaluate(() => window.__treeFrames);
  const firstHidden = leave.firstHiddenAt;
  const treeDuringLeave = treeFrames.filter((f) => firstHidden !== null && f.t >= firstHidden && f.rows > 0).every((f) => f.tree);
  assert(leave.hiddenAndInertAtOnce && leave.midOpacityFrames >= 3, 'last rows did not fade (tree unmounted early?)', leave);
  assert(treeDuringLeave, 'tree unmounted while rows were still leaving', { treeFrames: treeFrames.slice(0, 40) });
  const active = await page.evaluate(() => document.activeElement?.getAttribute('data-test'));
  assert(active === await runRow.getAttribute('data-test'), 'focus not moved to run row on last-row leave', { active });
  await shot(page, 'agent-last-rows-after');
  s.input.close();
  const consoleErrors = [...errors]; await context.close();
  assert(consoleErrors.length === 0, 'browser errors', consoleErrors);
  return { root: s.root, leave, active, treeFramesSample: treeFrames.filter((_, i) => i % 6 === 0).slice(0, 30) };
};

/** Reload and backend restart: closed rows never appear, not even for one frame; open rows do (AC-004, AC-010 no flash). */
const watchClosed = (ids) => `(() => { const ids = ${JSON.stringify(ids)}; window.__closedSeen = [];
  const check = () => { for (const id of ids) { if (document.querySelector('[data-agent-run-id="' + id + '"], [data-test$="-row-' + id + '"]')) window.__closedSeen.push(id); }
    if (document.querySelector('[data-transient-kind="task_team"]')) window.__closedSeen.push('task_team-row'); };
  new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true }); })();`;
const reloadJourney = async (kinds, runs) => {
  const results = {};
  for (const kind of kinds) {
    const r = runs[kind];
    const closedIds = [...r.aRefs.map((x) => x.agentRunId ?? x.teamRunId), r.bRef?.teamRunId, ...(r.bMembers ?? [])].filter(Boolean);
    const { page, errors, context } = await newPage({ initScript: watchClosed(closedIds) });
    await openRoot(page, r.root, r.names);
    await page.locator(rowSelector(kind, r.plainRef)).waitFor({ state: 'visible', timeout: 30000 });
    await page.locator(rowSelector(kind, { agentRunId: r.redelegated.agentRunId })).waitFor({ state: 'visible', timeout: 30000 });
    await L.sleep(1500);
    const seen = await page.evaluate(() => window.__closedSeen);
    assert(seen.length === 0, `${kind}: closed rows appeared after reload`, { seen });
    await shot(page, `${kind}-reload`);
    const consoleErrors = [...errors]; await context.close();
    assert(consoleErrors.length === 0, `${kind}: browser errors`, consoleErrors);
    results[kind] = { closedIds: closedIds.length, seen };
  }
  return results;
};
const restartBackend = async () => {
  const before = L.state().backendStarts;
  process.kill(L.state().launcherPid, 'SIGUSR2');
  await L.until('backend restarted', async () => L.state().backendStarts === before + 1, 120000);
  await L.until('graphql up', async () => (await fetch(`${L.state().backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
  return { backendStarts: L.state().backendStarts, backendPid: L.state().backendPid };
};

/** SP-3: a stopped Org run is expanded from the history list before its context hydrates; closed rows never render. */
const orgHistoryFirstRender = async (r) => {
  const t = await L.terminate(r.root);
  const history = (await L.gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){is_active closed_task_executions}}', { id: r.root.rootId })).getAgentOrgRootHistory;
  // After the BR-005 backend restart the root may already be inactive; either way it must now be stopped.
  assert(t.success || history.is_active === false, 'Org root not stopped', { t, history });
  assert(history.is_active === false, 'Org root still active', history);
  const closedIds = [...r.aRefs.map((x) => x.agentRunId ?? x.teamRunId), r.bRef?.teamRunId, ...(r.bMembers ?? [])].filter(Boolean);
  const { page, errors, context } = await newPage({ initScript: watchClosed(closedIds) });
  await page.goto(`${L.state().frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
  const ws = page.locator('[data-test="workspace-row"]').nth(1); await ws.click();
  await page.locator(`[data-test="agent-org-definition-${L.segment(r.names.org).replace(/_/g, '-')}"]`).click();
  // Expand with the disclosure only (no run open → no context hydration).
  await page.locator(`[data-test="agent-org-run-disclosure-${r.root.rootId}"]`).click();
  await page.locator(rowSelector('org', r.plainRef)).waitFor({ state: 'visible', timeout: 30000 });
  await L.sleep(1500);
  const seen = await page.evaluate(() => window.__closedSeen);
  assert(seen.length === 0, 'closed Org rows rendered from the history list', { seen });
  await shot(page, 'org-history-first-render');
  const consoleErrors = [...errors]; await context.close();
  assert(consoleErrors.length === 0, 'browser errors', consoleErrors);
  return { closedIds: closedIds.length, seen, terminate: t, historyItemClosed: history.closed_task_executions };
};

const runsPath = path.join(out, 'runs.json');
const runs = fs.existsSync(runsPath) ? JSON.parse(fs.readFileSync(runsPath, 'utf8')) : {};
const keep = (kind, details) => { runs[kind] = details; fs.writeFileSync(runsPath, `${JSON.stringify(runs, null, 2)}\n`); return details; };
for (const id of cases) {
  if (id === 'BR-001') await runCase(id, 'Agent root live DONE: Task A rows (assigned, delegated, broughtIn) leave with a 200 ms fade, aria-hidden+inert at once; open worker conversation returns to the Manager, run row selected, focus to run row; Team tab keeps messages; reopen+redelegate shows the new run; Task Team + members leave after DONE typed in the composer', async () => keep('agent', await liveDoneJourney('agent', 'BrAgent')));
  if (id === 'BR-002') await runCase(id, 'Team root live DONE (same journey; fallback to the delegating Manager)', async () => keep('team', await liveDoneJourney('team', 'BrTeam')));
  if (id.startsWith('BR-002R')) await runCase(id, 'Team root live DONE, natural repeat', async () => liveDoneJourney('team', id.replace(/-/g, '')));
  if (id === 'BR-002M') { process.env.JOURNEY_STALE_MOVE = '1'; await runCase(id, 'Team root live DONE with the leaving rows still carrying tree-row-move at leave start (round-1 failure state)', async () => liveDoneJourney('team', 'BrTeamMove')); delete process.env.JOURNEY_STALE_MOVE; }
  if (id === 'BR-003') await runCase(id, 'Org root live DONE (same journey; fallback to the delegating Manager)', async () => keep('org', await liveDoneJourney('org', 'BrOrg')));
  if (id === 'BR-004') await runCase(id, 'Reduced motion (Agent and Team trees): rows removed without fade; focus to run row', async () => ({
    agent: await reducedMotionJourney('agent', 'RmAgent'), team: await reducedMotionJourney('team', 'RmTeam') }));
  if (id === 'BR-005') await runCase(id, 'Reload, then real backend restart + reload: closed rows never render (no flash); open rows render', async () => {
    const reload = await reloadJourney(['agent', 'team', 'org'], runs);
    const restart = await restartBackend();
    const afterRestart = await reloadJourney(['agent', 'team', 'org'], runs);
    return { reload, restart, afterRestart };
  });
  if (id === 'BR-006') await runCase(id, 'CR-001: the last task rows under a standalone Agent run fade out, the empty tree then disappears, focus to run row', lastRowsJourney);
  if (id === 'BR-007') await runCase(id, 'SP-3: stopped Org run expanded from the history list before context hydration renders no closed rows', async () => orgHistoryFirstRender(runs.org));
}
await browser.close();
const summary = Object.fromEntries(Object.entries(evidence.cases).map(([k, v]) => [k, v.result + (v.message ? `: ${v.message}` : '')]));
console.log(JSON.stringify(summary, null, 1));
process.exit(0);
