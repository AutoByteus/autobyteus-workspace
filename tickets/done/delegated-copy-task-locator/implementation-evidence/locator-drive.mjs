#!/usr/bin/env node
// Implementation self-check driver for delegated-copy-task-locator (not a product test).
// Runs one or more named checks in fresh headless Chrome against the stack started by locator-stack.mjs.
// Usage (repository root): node .../locator-drive.mjs <output-dir> <check>[,<check>...]
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const repo = process.cwd();
const require = createRequire(path.join(repo, 'autobyteus-web', 'package.json'));
const { chromium } = require('playwright-core');
const outputDir = path.resolve(process.argv[2]);
const checks = (process.argv[3] ?? '').split(',').filter(Boolean);
const state = JSON.parse(await fsp.readFile(path.join(outputDir, 'state.json'), 'utf8'));
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 30000, every = 100) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(every); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const command = async (body) => {
  await fsp.writeFile(path.join(outputDir, 'command.json'), JSON.stringify(body));
  const file = path.join(outputDir, 'result.json');
  const result = await until('stack command', async () => fs.existsSync(file) && JSON.parse(await fsp.readFile(file, 'utf8')), 30000, 200);
  await fsp.rm(file);
  if (!result.ok) throw new Error(result.error);
  return result.data;
};
const shot = (page, name, clip) => page.screenshot({ path: path.join(outputDir, `${name}.png`), ...(clip ? { clip } : {}) });

const browser = await chromium.launch({ headless: true, executablePath });
const results = {};
const newPage = async ({ width = 1440, height = 900, reducedMotion = 'no-preference', scale = 1 } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'en-US', reducedMotion, deviceScaleFactor: scale });
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module/.test(m.text())) page.errors.push(m.text()); });
  return { context, page };
};
const rowOf = (page, selector) => page.locator(`[data-test="workspace-team-transient-execution-row"]${selector}`);
const summaryOf = (page, selector) => rowOf(page, selector).locator('[data-test="workspace-task-worker-task-summary"]');
const agentCopy = `[data-agent-run-id="${state.roots.agentCopy.ingressAgentRunId}"][data-transient-kind="task_agent"]`;
const tempCopy = `[data-agent-run-id="${state.roots.temp.ingressAgentRunId}"][data-transient-kind="task_agent"]`;
const teamCopy = '[data-transient-kind="task_team"]';
const teamHostedCopy = `[data-agent-run-id="${state.roots.teamHosted.ingressAgentRunId}"]`;

/** Opens /workspace with the Agent run selected and its delegated copies listed (what a user does). */
const openAgentRun = async (page, route = '/workspace') => {
  await page.goto(`${state.frontendUrl}${route}`, { waitUntil: 'networkidle', timeout: 120000 });
  await until('workspace row', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 1, 60000);
  if (!(await page.locator('[data-test="workspace-agent-row"]', { hasText: state.names.manager }).count())) {
    await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();
  }
  await page.locator('[data-test="workspace-agent-row"]', { hasText: state.names.manager }).click();
  await page.locator('[data-test="workspace-agent-run-row"]').first().click();
  await summaryOf(page, tempCopy).waitFor({ timeout: 30000 });
  // Selecting a standalone run redirects /workspace to /chat; a user reads the rows after that.
  await page.waitForURL(/\/chat\?id=/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
};
const expandTaskTeam = async (page) => {
  const team = rowOf(page, teamCopy);
  if ((await team.getAttribute('aria-expanded')) !== 'true') await team.locator('[data-test="workspace-team-transient-disclosure"]').click();
};
const panelState = (page) => page.evaluate(() => ({
  activeTab: document.querySelector('[data-test="workspace-right-panel"] [aria-selected="true"], [data-test="workspace-right-panel"] .is-active')?.textContent?.trim() ?? null,
  docked: Boolean(document.querySelector('[data-test="workspace-right-panel"]')),
  projectsPanel: Boolean(document.querySelector('[data-testid="projects-panel"]')),
  picker: document.querySelector('[data-testid="projects-panel-picker-select"]')?.value ?? null,
  located: [...document.querySelectorAll('[data-located="true"]')].map((e) => e.getAttribute('data-testid')),
  focused: document.activeElement?.closest('div[data-testid^="project-task-row-"]')?.getAttribute('data-testid') ?? null,
  path: location.pathname + location.search,
}));
const centerTitle = (page) => page.locator('[data-test="workspace-center-pane"]').innerText().then((t) => t.slice(0, 200)).catch(() => '');
const located = (page, taskId) => until(`card ${taskId} located`, async () => {
  const s = await panelState(page); return s.located.includes(`project-task-row-${taskId}`) && s.focused === `project-task-row-${taskId}` ? s : null;
}, 15000, 50);
const box = (locator) => locator.boundingBox();

const CHECKS = {
  /** VIS-001/002/014: summaries under Task workers only; type, colour, sizes, alignment, elbow and chevron on the name line. */
  async rows() {
    const { page } = await newPage();
    await openAgentRun(page);
    await expandTaskTeam(page);
    const rows = await page.locator('[data-test="workspace-team-transient-execution-row"]').evaluateAll((es) => es.map((e) => ({
      kind: e.getAttribute('data-transient-kind'), address: e.getAttribute('data-member-address'), height: e.getBoundingClientRect().height,
      summary: e.querySelector('[data-test="workspace-task-worker-task-summary"]')?.textContent ?? null, label: e.getAttribute('aria-label') })));
    const style = await summaryOf(page, agentCopy).evaluate((e) => {
      const s = getComputedStyle(e); const name = e.previousElementSibling; const r = e.getBoundingClientRect(); const n = name.getBoundingClientRect();
      const text = document.createRange(); text.selectNodeContents(e); const tr = text.getBoundingClientRect();
      return { fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight, color: s.color, height: r.height, gapAbove: r.top - n.bottom,
        textLeft: tr.left, nameLeft: n.left, width: r.width, nameColumnWidth: name.parentElement.getBoundingClientRect().width, overflow: s.textOverflow };
    });
    const teamStyle = await summaryOf(page, teamCopy).evaluate((e) => ({ fontWeight: getComputedStyle(e).fontWeight, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth }));
    const anchors = await rowOf(page, teamCopy).evaluate((row) => {
      const top = row.getBoundingClientRect().top;
      const elbow = getComputedStyle(row.querySelector('.hierarchy-current-branch'), '::after');
      const chevron = row.querySelector('[data-test="workspace-team-transient-disclosure"]').getBoundingClientRect();
      const name = row.querySelector('.block.truncate').getBoundingClientRect();
      const dot = row.querySelector('.member-status')?.getBoundingClientRect();
      return { elbowTop: elbow.top, chevronCentre: chevron.top + chevron.height / 2 - top, nameCentre: name.top + name.height / 2 - top, iconBoxTop: dot ? dot.top - top : null };
    });
    await shot(page, 'R1-tree-rows-1440x900');
    const tree = page.locator('[data-test="workspace-agent-run-task-tree"]');
    const treeBox = await box(tree);
    const { page: hd } = await newPage({ scale: 2 });
    await openAgentRun(hd); await expandTaskTeam(hd);
    const hdBox = await box(hd.locator('[data-test="workspace-agent-run-task-tree"]'));
    await shot(hd, 'R2-copy-rows-closeup-2x', { x: hdBox.x - 8, y: hdBox.y - 4, width: Math.min(hdBox.width + 16, 420), height: hdBox.height + 8 });
    await summaryOf(hd, agentCopy).hover();
    await sleep(400);
    await shot(hd, 'R3-summary-hover-closeup-2x', { x: hdBox.x - 8, y: hdBox.y - 4, width: Math.min(hdBox.width + 16, 420), height: hdBox.height + 8 });
    const hover = await summaryOf(hd, agentCopy).evaluate((e) => ({ color: getComputedStyle(e).color, decoration: getComputedStyle(e).textDecorationLine, offset: getComputedStyle(e).textUnderlineOffset }));
    return { rows, style, teamStyle, anchors, hover, treeBox, errors: [...page.errors, ...hd.errors] };
  },

  /** VIS-005/006/007, AC-005/006/014: locate from the tree with the panel docked; center and tree selection unchanged. */
  async locate() {
    const { page } = await newPage();
    await openAgentRun(page);
    await sleep(1500);
    const centerBefore = await centerTitle(page);
    const selectedBefore = await page.locator('[aria-current="true"],[aria-selected="true"]').evaluateAll((es) => es.map((e) => e.getAttribute('data-test') + ':' + (e.getAttribute('data-agent-run-id') ?? e.getAttribute('data-run-id'))));
    await summaryOf(page, agentCopy).click();
    const first = await located(page, state.tasks.agentCopy);
    assert(first.picker === `project:${state.projects.desktop}`, 'picker on the Task\'s Project', first);
    await sleep(400);
    await shot(page, 'R4-located-desktop-app-1440x900');
    const centerAfter = await centerTitle(page);
    const selectedAfter = await page.locator('[aria-current="true"],[aria-selected="true"]').evaluateAll((es) => es.map((e) => e.getAttribute('data-test') + ':' + (e.getAttribute('data-agent-run-id') ?? e.getAttribute('data-run-id'))));
    const cardInView = await page.locator(`[data-testid="project-task-row-${state.tasks.agentCopy}"]`).evaluate((e) => {
      const r = e.getBoundingClientRect(); const p = e.closest('.overflow-y-auto').getBoundingClientRect();
      return { cardCentre: r.top + r.height / 2, panelCentre: p.top + p.height / 2, inView: r.top >= p.top && r.bottom <= p.bottom };
    });
    const highlight = await page.locator(`[data-testid="project-task-row-${state.tasks.agentCopy}"]`).evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, shadow: getComputedStyle(e).boxShadow, animation: getComputedStyle(e).animationName }));
    // Temp task: the picker switches to Temp tasks.
    await summaryOf(page, tempCopy).click();
    const temp = await located(page, state.tempTaskId);
    assert(temp.picker === 'temp', 'picker on Temp tasks', temp);
    await sleep(400);
    await shot(page, 'R5-located-temp-task-1440x900');
    // The previous card is no longer highlighted.
    // Enter on the focused card opens the Task inside the tab.
    await page.keyboard.press('Enter');
    await until('Task opened in the tab', async () => page.locator('[data-testid="projects-panel-task-description"]').isVisible(), 10000);
    // From an open Task: locating the team copy's Task returns to the board, on Desktop App.
    await expandTaskTeam(page);
    await summaryOf(page, teamCopy).click();
    const team = await located(page, state.tasks.teamCopy);
    assert(team.picker === `project:${state.projects.desktop}`, 'picker back on Desktop App', team);
    await sleep(400);
    await shot(page, 'R6-located-from-open-task-team-copy-1440x900');
    // Locate twice quickly: only the latest is highlighted.
    await summaryOf(page, agentCopy).click();
    await sleep(150);
    await summaryOf(page, teamCopy).click();
    const twice = await located(page, state.tasks.teamCopy);
    assert(twice.located.length === 1, 'only the latest card highlighted', twice);
    return { first, centerUnchanged: centerBefore === centerAfter, centerBefore, centerAfter, selectedBefore, selectedAfter, cardInView, highlight, temp, team, twice, errors: page.errors };
  },

  /** VIS-009a/b, VIS-010: a search hiding the Task is cleared; a search still showing it is kept; Cancelled lane. */
  async hidden() {
    const { page } = await newPage();
    await openAgentRun(page);
    await summaryOf(page, agentCopy).click();
    await located(page, state.tasks.agentCopy);
    const search = page.locator('[data-testid="project-tasks-search-input"]');
    await search.fill('ship the copy');
    await summaryOf(page, agentCopy).click();
    await located(page, state.tasks.agentCopy);
    const kept = await search.inputValue();
    await search.fill('backlog');
    await shot(page, 'R7a-search-hides-task-1440x900');
    await summaryOf(page, agentCopy).click();
    const cleared = await located(page, state.tasks.agentCopy);
    await sleep(400);
    await shot(page, 'R7b-search-cleared-located-1440x900');
    const clearedValue = await search.inputValue();
    // The team copy's Task is cancelled just before the click; the row is still on screen.
    await command({ query: 'mutation($input:UpdateTaskByIdInput!){updateTaskById(input:$input){status}}', variables: { input: { taskId: state.tasks.teamCopy, status: 'CANCELLED' } } })
      .catch(async () => command({ agentMessage: `CALL_TOOL:${JSON.stringify({ name: 'create_or_update_task', arguments: { task_id: state.tasks.teamCopy, status: 'CANCELLED' } })}` }));
    let clickedBeforeLeave = false;
    if (await summaryOf(page, teamCopy).count()) { await summaryOf(page, teamCopy).click({ timeout: 2000 }).then(() => { clickedBeforeLeave = true; }).catch(() => undefined); }
    let cancelled = null;
    if (clickedBeforeLeave) {
      cancelled = await located(page, state.tasks.teamCopy);
      const pressed = await page.locator('[data-testid="project-tasks-cancelled-toggle"]').getAttribute('aria-pressed');
      const lane = await page.locator(`[data-testid="project-task-row-${state.tasks.teamCopy}"]`).evaluate((e) => e.closest('[data-testid^="project-task-column-"]')?.getAttribute('data-testid'));
      cancelled = { ...cancelled, pressed, lane };
      await sleep(300);
      await shot(page, 'R8-cancelled-lane-located-1440x900');
    }
    const teamRowGone = await until('closed copy row leaves the tree', async () => (await rowOf(page, teamCopy).count()) === 0, 15000).then(() => true).catch(() => false);
    return { kept, cleared, clearedValue, clickedBeforeLeave, cancelled, teamRowGone, errors: page.errors };
  },

  /** VIS-010: a Task closed (Cancelled) just before the click — the same request the summary places, issued in-page. */
  async cancelledLane() {
    const { page } = await newPage();
    await openAgentRun(page);
    await page.evaluate((task) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('taskLocator')
      .locate(task, () => undefined), { taskId: state.tasks.teamCopy, projectId: state.projects.desktop, description: 'x', status: 'CANCELLED' });
    const s = await located(page, state.tasks.teamCopy);
    const pressed = await page.locator('[data-testid="project-tasks-cancelled-toggle"]').getAttribute('aria-pressed');
    const lane = await page.locator(`[data-testid="project-task-row-${state.tasks.teamCopy}"]`).evaluate((e) => e.closest('[data-testid^="project-task-column-"]')?.getAttribute('data-testid'));
    await sleep(300);
    await shot(page, 'R8-cancelled-lane-located-1440x900');
    return { ...s, pressed, lane, errors: page.errors };
  },

  /** VIS-004, AC-004: opening a copy (row click) keeps its summary, which turns indigo-700; the Task is not located. */
  async selected() {
    const { page } = await newPage({ scale: 2 });
    await openAgentRun(page);
    await rowOf(page, tempCopy).locator('span.block.truncate').click();
    await until('copy selected', async () => (await rowOf(page, tempCopy).getAttribute('aria-selected')) === 'true', 15000);
    await page.mouse.move(1000, 800);
    await sleep(400);
    const color = await summaryOf(page, tempCopy).evaluate((e) => getComputedStyle(e).color);
    const projectsShown = await page.locator('[data-testid="projects-panel"]').count();
    const b = await box(page.locator('[data-test="workspace-agent-run-task-tree"]'));
    await shot(page, 'R15-copy-open-summary-selected-2x', { x: b.x - 8, y: b.y - 4, width: Math.min(b.width + 16, 420), height: b.height + 8 });
    return { color, projectsShown, located: (await panelState(page)).located, errors: page.errors };
  },

  /** VIS-011, VIS-013: hidden panel reopens docked; narrow window opens the drawer. Reduced motion: instant scroll. */
  async panels() {
    const { page } = await newPage();
    await openAgentRun(page);
    const close = page.locator('[data-test="right-side-panel-toggle"]').first();
    const closed = await close.count() ? await close.click().then(() => true) : false;
    await until('panel hidden', async () => !(await page.locator('[data-test="workspace-right-panel"]').count()), 5000).catch(() => undefined);
    await shot(page, 'R9a-right-panel-hidden-1440x900');
    const hiddenBefore = !(await page.locator('[data-test="workspace-right-panel"]').count());
    await summaryOf(page, agentCopy).click();
    const reopened = await located(page, state.tasks.agentCopy);
    await sleep(400);
    await shot(page, 'R9b-right-panel-reopened-located-1440x900');
    const { page: narrow } = await newPage({ width: 900, height: 800, reducedMotion: 'reduce' });
    await openAgentRun(narrow);
    await summaryOf(narrow, agentCopy).click();
    const drawer = await located(narrow, state.tasks.agentCopy);
    const drawerOpen = await narrow.locator('[role="dialog"], [data-test="workspace-right-tool-drawer"]').count();
    await sleep(400);
    const reduced = await narrow.locator(`[data-testid="project-task-row-${state.tasks.agentCopy}"]`).evaluate((e) => ({ animation: getComputedStyle(e).animationName, bg: getComputedStyle(e).backgroundColor }));
    await shot(narrow, 'R10-narrow-drawer-located-900x800');
    return { closeButtonFound: closed, hiddenBefore, reopened, drawer, drawerOpen, reduced, errors: [...page.errors, ...narrow.errors] };
  },

  /** VIS-012, AC-014: Tab from the row reaches the summary (ring); Enter locates and moves focus to the card. */
  async keyboard() {
    const { page } = await newPage({ scale: 2 });
    await openAgentRun(page);
    await rowOf(page, agentCopy).focus();
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-test'));
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
    const b = await box(rowOf(page, agentCopy));
    await shot(page, 'R11-summary-keyboard-focus-2x', { x: b.x - 6, y: b.y - 6, width: Math.min(b.width + 12, 420), height: b.height + 12 });
    const centerBefore = await centerTitle(page);
    await page.keyboard.press('Enter');
    const viaEnter = await located(page, state.tasks.agentCopy);
    await rowOf(page, tempCopy).focus(); await page.keyboard.press('Tab');
    await page.keyboard.press(' ');
    const viaSpace = await located(page, state.tempTaskId);
    return { focused, ring, viaEnter, viaSpace, centerUnchanged: centerBefore === await centerTitle(page), errors: page.errors };
  },

  /** AC-015: a rename updates the summary live; a Task deletion removes it; Team-run host rows show summaries. */
  async live() {
    const { page } = await newPage();
    await openAgentRun(page);
    await command({ query: 'mutation($input:UpdateProjectTaskInput!){updateProjectTask(input:$input){taskId}}', variables: { input: { projectId: state.projects.desktop, taskId: state.tasks.agentCopy, description: 'Renamed: ship the summary live\nmore' } } });
    const renamed = await until('summary renamed live', async () => (await summaryOf(page, agentCopy).innerText()) === 'Renamed: ship the summary live', 15000);
    // Team-run host: its delegated member copy shows its Task summary.
    await page.locator('[data-test^="workspace-team-definition-row-"]').first().click().catch(() => undefined);
    const teamRunRow = page.locator(`[data-test="workspace-team-row-${state.teamRunId}"]`);
    await until('team run row', async () => (await teamRunRow.count()) > 0, 20000);
    await teamRunRow.first().click();
    const teamHostSummary = await until('team host summary', async () => { const s = summaryOf(page, teamHostedCopy); return (await s.count()) ? s.innerText() : null; }, 30000);
    await shot(page, 'R12-team-run-host-summary-1440x900');
    await command({ query: 'mutation($input:DeleteProjectTaskInput!){deleteProjectTask(input:$input)}', variables: { input: { projectId: state.projects.desktop, taskId: state.tasks.agentCopy } } });
    const removed = await until('summary removed live', async () => (await summaryOf(page, agentCopy).count()) === 0, 15000).then(() => true);
    return { renamed: Boolean(renamed), teamHostSummary, removed, errors: page.errors };
  },

  /** REQ-012 in a narrow window: the run opens and the drawer shows the located Task. */
  async noPanelNarrow() { return CHECKS.noPanel({ width: 900, height: 800 }, 'R14-agents-page-narrow-drawer-located-900x800'); },

  /** REQ-012 / AC-020: from the Agents page (no right panel) the summary opens the row's run, then locates. */
  async noPanel(viewport = {}, name = 'R13-agents-page-summary-opened-run-located-1440x900') {
    const { page } = await newPage(viewport);
    await openAgentRun(page);
    await page.locator('[data-test="app-left-panel-primary-nav"]').getByText('Agents', { exact: true }).click();
    await until('on the Agents page', async () => new URL(page.url()).pathname.startsWith('/agents'), 15000);
    const visible = await summaryOf(page, tempCopy).isVisible().catch(() => false);
    assert(visible, 'summary visible on the Agents page');
    await summaryOf(page, tempCopy).click();
    const opened = await located(page, state.tempTaskId);
    const runRowCurrent = await page.locator('[data-test="workspace-agent-run-row"][aria-current="true"]').count();
    await sleep(400);
    await shot(page, name);
    const drawer = await page.locator('[data-test="workspace-right-tool-drawer"]').count();
    return { opened, drawer, runRowCurrent, stillExpanded: await rowOf(page, tempCopy).count(), errors: page.errors };
  },
};

let failed = false;
for (const name of checks) {
  try { results[name] = { result: 'Pass', details: await CHECKS[name]() }; }
  catch (error) { failed = true; results[name] = { result: 'Fail', message: error.message, details: error.details }; }
  for (const context of browser.contexts()) {
    if (results[name].result === 'Fail') for (const [i, p] of context.pages().entries()) await p.screenshot({ path: path.join(outputDir, `${name}-failure-${i}.png`) }).catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}
await browser.close();
const file = path.join(outputDir, 'drive-results.json');
const all = fs.existsSync(file) ? JSON.parse(await fsp.readFile(file, 'utf8')) : {};
await fsp.writeFile(file, `${JSON.stringify({ ...all, ...results }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
process.exit(failed ? 1 : 0);
