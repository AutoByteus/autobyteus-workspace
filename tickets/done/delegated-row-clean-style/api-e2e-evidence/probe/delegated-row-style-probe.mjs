#!/usr/bin/env node
// Temporary API/E2E probe for delegated-row-clean-style (REQ-001 / AC-001 / AC-002).
// Run from anywhere: node <this file> [--output-dir <dir>] [--browser-executable <path>]
// Installs three temporary Nuxt pages (Agent root: own fixture; Team root: the durable
// task-agent-peer-sidebar fixture; Org root: the durable agent-org-task-team-disclosure fixture),
// starts its own Nuxt dev server on a free port against a dead backend, emulates GraphQL transport,
// and asserts *computed* styles of the production rows in headless Chrome with trusted mouse and
// keyboard input. Pages, browser and the Nuxt process group are always removed in finally.

import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const probeDir = path.dirname(fileURLToPath(import.meta.url));
const worktree = path.resolve(probeDir, '../../../../..');
const webDir = path.join(worktree, 'autobyteus-web');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');

const getArg = (name, fallback) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const outputDir = path.resolve(getArg('output-dir', path.join(probeDir, '..', 'browser')));
const timeoutMs = 90000;
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']
    .find((c) => existsSync(c));

const pages = [
  { key: 'agent', src: path.join(probeDir, 'agent-root.page.vue'), dest: path.join(webDir, 'pages/api-e2e-drcs-agent-root.vue'), route: '/api-e2e-drcs-agent-root' },
  { key: 'team', src: path.join(webDir, 'tests/e2e/fixtures/task-agent-peer-sidebar.page.vue'), dest: path.join(webDir, 'pages/api-e2e-drcs-team-root.vue'), route: '/api-e2e-drcs-team-root' },
  { key: 'org', src: path.join(webDir, 'tests/e2e/fixtures/agent-org-task-team-disclosure.page.vue'), dest: path.join(webDir, 'pages/api-e2e-drcs-org-root.vue'), route: '/api-e2e-drcs-org-root' },
];

// Expected computed values (tailwind.config.js gray override; Tailwind 3 default indigo/slate).
const EXPECT = {
  text: 'rgb(102, 102, 102)',          // gray-600 #666666
  rest: 'rgba(0, 0, 0, 0)',            // no background at rest
  hover: 'rgb(242, 242, 242)',         // gray-50 #f2f2f2
  ring: 'rgb(99, 102, 241) 0px 0px 0px 2px', // 2px indigo-500
  bolt: 'rgb(100, 116, 139)',          // slate-500 #64748b
  selectedBg: 'rgb(238, 242, 255)',
  selectedText: 'rgb(49, 46, 129)',    // indigo-900
  selectedShadow: 'rgb(99, 102, 241) 2px 0px 0px 0px inset',
};

const evidence = { startedAt: new Date().toISOString(), executablePath, expect: EXPECT, cases: {}, requests: [], browserEvents: [], cleanup: {}, failures: [] };
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const evidencePath = path.join(outputDir, 'evidence.json');
const save = () => fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
const ledger = getArg('ledger');
const runCase = async (id, description, fn) => {
  try {
    const details = await fn();
    evidence.cases[id] = { result: 'Pass', description, details };
    if (ledger) await fs.appendFile(ledger, `\n- ${id}: Pass — ${description}. Evidence: ${evidencePath}\n`);
  } catch (error) {
    evidence.cases[id] = { result: 'Fail', description, message: error.message, details: error.details };
    evidence.failures.push({ id, message: error.message, details: error.details });
    if (ledger) await fs.appendFile(ledger, `\n- ${id}: Fail — ${error.message}. Evidence: ${evidencePath}\n`);
  }
  await save();
};
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const waitExit = (c, ms) => exited(c) ? Promise.resolve(true) : new Promise((r) => { const t = setTimeout(() => r(exited(c)), ms); c.once('exit', () => { clearTimeout(t); r(true); }); });
const waitFor = async (label, pred, ms = timeoutMs) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await pred(); if (v) return v; } catch (e) { last = e; } await new Promise((r) => setTimeout(r, 100)); }
  throw new Error(`Timed out waiting for ${label}${last ? `: ${last.message}` : ''}`);
};

// Agent root view (shape of services/agentCollaboration/__tests__/agentRootFixture.ts) plus one delegated task Agent.
const created = '2026-09-30T00:00:00.000Z';
const launch = { runtimeKind: 'codex_app_server', llmModelIdentifier: 'root-model', llmConfig: null, autoExecuteTools: false, workspaceRootPath: null };
const status = (agent_run_id, member_address, s) => ({ agent_run_id, member_address, status: s, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null });
const agentRootEnvelope = {
  root_subject_kind: 'agent', root_run_id: 'host-run',
  root_agent: {
    base_change_sequence: 4, is_active: false,
    execution_tree: {
      subjectKind: 'agent', createdAt: created,
      host: { address: '/research_assistant', agentRunId: 'host-run', agentDefinitionId: 'research-assistant' },
      collaborators: [
        { kind: 'agent', address: '/computer_use_agent', agentDefinitionId: 'computer-use', agentRunId: 'cua-run', platformAgentRunId: null, launchConfiguration: launch, addedAt: created, addedViaAgentRunId: 'host-run' },
        { kind: 'agent_team', address: '/product_team', teamDefinitionId: 'product-team', teamRunId: 'team-run', coordinatorAddress: '/product_team/prototyper',
          members: [
            { address: '/product_team/prototyper', agentDefinitionId: 'prototyper', agentRunId: 'pp-run', platformAgentRunId: null },
            { address: '/product_team/bootstrapper', agentDefinitionId: 'bootstrapper', agentRunId: 'pb-run', platformAgentRunId: null },
          ], handoffs: [], defaultLaunchConfiguration: launch, taskExecutions: [], addedAt: created, addedViaAgentRunId: 'host-run' },
      ],
      taskExecutions: [
        { address: '/release_notes_writer', agentRunId: 'task-run', platformAgentRunId: null, delegatorAgentRunId: 'host-run', startedAt: created,
          source: { kind: 'agent', agentDefinitionId: 'release-notes-writer', launchConfiguration: launch } },
      ],
    },
    communication_messages: { schemaVersion: 1, subjectKind: 'agent', hostRunId: 'host-run', messages: [] },
    agent_input_states: [],
    agent_statuses: [status('cua-run', '/computer_use_agent', 'idle'), status('pp-run', '/product_team/prototyper', 'running'),
      status('pb-run', '/product_team/bootstrapper', 'offline'), status('task-run', '/release_notes_writer', 'idle')],
  },
};
const defaultData = (op, q) => {
  if (op === 'GetAgentDefinitions' || q.includes('agentDefinitions')) return { agentDefinitions: [] };
  if (op === 'GetAgentTeamDefinitions' || q.includes('agentTeamDefinitions')) return { agentTeamDefinitions: [] };
  if (op === 'GetApplicationsCapability' || q.includes('applicationsCapability')) return { applicationsCapability: { enabled: false, scope: 'BOUND_NODE', settingKey: 'ENABLE_APPLICATIONS', source: 'INITIALIZED_EMPTY_CATALOG' } };
  if (op === 'GetSkillImprovementCapability' || q.includes('skillImprovementCapability')) return { skillImprovementCapability: { enabled: false, settingKey: 'ENABLE_SKILL_IMPROVEMENT', source: 'INITIALIZED_EMPTY_CATALOG' } };
  if (op === 'GetAllWorkspaces' || q.includes('workspaces')) return { workspaces: [] };
  if (op === 'GetServerSettings' || q.includes('serverSettings')) return { serverSettings: [] };
  return {};
};

// --- in-page measurement helpers -------------------------------------------------------
const measure = (locator) => locator.evaluate((el) => {
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const branches = el.querySelector(':scope > .hierarchy-branches');
  const br = branches?.getBoundingClientRect();
  const teamIcon = el.querySelector('[data-team-icon="temporary-task-team"]');
  const svg = teamIcon ? (teamIcon.tagName.toLowerCase() === 'svg' ? teamIcon : teamIcon.querySelector('svg')) : null;
  const iconWrapCs = teamIcon ? getComputedStyle(teamIcon) : null;
  const nameSpan = [...el.querySelectorAll('span.truncate')].pop();
  return {
    label: el.getAttribute('aria-label'),
    selected: el.getAttribute('aria-selected'),
    color: cs.color, background: cs.backgroundColor, boxShadow: cs.boxShadow, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor,
    borderWidths: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth],
    borderStyles: [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle],
    borderRadius: cs.borderTopLeftRadius, focusVisible: el.matches(':focus-visible'),
    rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height, right: rect.right },
    branchesInset: br ? { dx: br.x - rect.x, dy: br.y - rect.y, dw: br.width - rect.width, dh: br.height - rect.height } : null,
    teamIcon: teamIcon ? {
      color: getComputedStyle(svg ?? teamIcon).color, svgIcon: (svg ?? teamIcon).getAttribute('data-icon') ?? (svg ?? teamIcon).outerHTML.slice(0, 60),
      w: (svg ?? teamIcon).getBoundingClientRect().width, h: (svg ?? teamIcon).getBoundingClientRect().height,
      wrapBorder: [iconWrapCs.borderTopWidth, iconWrapCs.borderTopStyle], wrapBackground: iconWrapCs.backgroundColor,
    } : null,
    nameWeight: nameSpan ? getComputedStyle(nameSpan).fontWeight : null,
    nameText: nameSpan?.textContent?.trim() ?? null,
    nameOverflow: nameSpan ? getComputedStyle(nameSpan).textOverflow : null,
    hasStatusDot: Boolean(el.querySelector('[data-test="workspace-transient-status-dot"], .status-dot, [data-test*="status-dot"], [class*="rounded-full"][class*="h-2"]')),
    avatarText: el.querySelector('[data-test="workspace-task-agent-avatar"], [data-test="agent-org-task-agent-avatar"]')?.textContent?.trim() ?? null,
  };
});
const restChecks = (m, where) => {
  // Tailwind preflight sets `border-style: solid` with 0 width on every element; a visible border needs width.
  assert(m.borderWidths.every((w) => w === '0px') && !m.borderStyles.includes('dashed'), `${where}: row has a border`, m);
  assert(m.background === EXPECT.rest, `${where}: row has a background at rest`, m);
  assert(m.color === EXPECT.text, `${where}: row text is not gray-600`, m);
  assert(m.branchesInset && Object.values(m.branchesInset).every((d) => Math.abs(d) <= 0.5), `${where}: branch lines are offset from the row box`, m);
};
const hoverCheck = async (page, locator, where) => {
  await page.mouse.move(2, 2);
  await locator.hover();
  await page.waitForTimeout(350); // transition-colors 150ms
  const m = await measure(locator);
  assert(m.background === EXPECT.hover, `${where}: hover background is not gray-50`, m);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(350);
  return m.background;
};
/** Real keyboard traversal: click a neutral heading, then press Tab until the row has focus. */
const keyboardFocus = async (page, locator, where) => {
  await page.locator('h1').first().click();
  const handle = await locator.elementHandle();
  for (let i = 0; i < 80; i += 1) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((el) => document.activeElement === el, handle)) {
      const m = await measure(locator);
      assert(m.focusVisible, `${where}: keyboard focus is not :focus-visible`, m);
      // Tailwind 3 `outline-none` = `2px solid transparent`; a visible outline needs a non-transparent color.
      assert(m.outlineStyle === 'none' || m.outlineColor === 'rgba(0, 0, 0, 0)', `${where}: focus shows a browser outline`, m);
      assert(m.boxShadow.includes(EXPECT.ring), `${where}: focus ring is not 2px indigo-500`, m);
      return { tabs: i + 1, boxShadow: m.boxShadow, outline: `${m.outlineStyle} ${m.outlineColor}` };
    }
  }
  throw Object.assign(new Error(`${where}: row not reachable by Tab`), { details: { where } });
};
const teamChecks = (m, where) => {
  assert(m.teamIcon, `${where}: no delegated Team icon`, m);
  assert(m.teamIcon.color === EXPECT.bolt, `${where}: bolt is not slate-500`, m);
  assert(Math.round(m.teamIcon.w) === 16 && Math.round(m.teamIcon.h) === 16, `${where}: bolt is not 16px`, m);
  assert(m.teamIcon.wrapBorder[0] === '0px' && m.teamIcon.wrapBackground === 'rgba(0, 0, 0, 0)', `${where}: bolt still boxed`, m);
  assert(m.nameWeight === '600', `${where}: Team name not semibold`, m);
};
const agentChecks = (m, where) => {
  assert(!m.teamIcon, `${where}: Agent row shows a Team icon`, m);
  assert(m.avatarText && m.avatarText.length > 0, `${where}: Agent row lost its initials avatar`, m);
  assert(m.nameWeight === '400', `${where}: Agent name not regular weight`, m);
};
const selectedChecks = (m, where) => {
  assert(m.selected === 'true', `${where}: not aria-selected`, m);
  assert(m.background === EXPECT.selectedBg && m.color === EXPECT.selectedText && m.boxShadow.includes(EXPECT.selectedShadow) && m.borderRadius === '0px',
    `${where}: selected style differs from member selection`, m);
};

await fs.mkdir(outputDir, { recursive: true });
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
const installed = [];
let nuxt; let nuxtLog; let browser; let context; let page;
const shot = (name) => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });

try {
  assert(executablePath, 'No Chrome executable found');
  for (const p of pages) {
    assert(existsSync(p.src), `Missing fixture ${p.src}`);
    assert(!existsSync(p.dest), `Refusing to overwrite ${p.dest}`);
  }
  for (const p of pages) { await fs.copyFile(p.src, p.dest); installed.push(p.dest); }
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  evidence.baseUrl = base;
  nuxtLog = createWriteStream(nuxtLogPath);
  nuxt = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
  });
  nuxt.stdout.pipe(nuxtLog); nuxt.stderr.pipe(nuxtLog);
  evidence.nuxtPid = nuxt.pid;
  for (const p of pages) {
    await waitFor(`Nuxt route ${p.route}`, async () => {
      if (exited(nuxt)) throw new Error('Nuxt exited');
      return (await fetch(`${base}${p.route}`)).ok;
    });
  }
  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'en-US', colorScheme: 'light' });
  page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.on('pageerror', (e) => evidence.browserEvents.push({ type: 'pageerror', text: e.message }));
  page.on('console', (m) => { if (m.type() === 'error') evidence.browserEvents.push({ type: 'console:error', text: m.text() }); });
  await page.route('**/rest/health', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' }));
  await page.route('**/graphql', async (route) => {
    let payload = {}; try { payload = route.request().postDataJSON() ?? {}; } catch { payload = {}; }
    const op = payload.operationName ?? ''; const q = payload.query ?? ''; const v = payload.variables ?? {};
    evidence.requests.push({ op, variables: v });
    const ok = (data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
    if (op === 'GetAgentRunCollaboration') return ok({ agentRunCollaboration: v.runId === 'host-run' ? agentRootEnvelope : null });
    if (op === 'GetAgentRunCollaborationMemberProjection') return ok({ agentRunCollaborationMemberProjection: {
      agentRunId: v.agentRunId, memberAddress: v.memberAddress, conversation: [], activities: [], summary: null,
      lastActivityAt: created, hasEarlierActiveTraceEvents: false } });
    if (op === 'GetTeamMemberRunProjection' || q.includes('getTeamMemberRunProjection')) return ok({ getTeamMemberRunProjection: {
      agentRunId: v.agentRunId, summary: `Exact ${v.agentRunId}`, lastActivityAt: created,
      conversation: [{ kind: 'message', role: 'assistant', content: `CONVERSATION_${v.agentRunId}`, ts: 1788177630 }], activities: [], hasEarlierActiveTraceEvents: false } });
    return ok(defaultData(op, q));
  });

  // ---------------------------------------------------------------- Agent root
  await runCase('E2E-001', 'Agent root (AgentRunTaskRows): delegated Agent, Team and Team-member rows render flat; hover, keyboard focus, Team bolt, Agent avatar, selection, Enter/Space/click, collapse', async () => {
    await page.goto(`${base}/api-e2e-drcs-agent-root`, { waitUntil: 'domcontentloaded' });
    const tree = page.locator('[data-test="workspace-agent-run-task-tree"]');
    await tree.waitFor({ state: 'visible' });
    const rows = tree.locator('[data-test="workspace-team-transient-execution-row"]');
    await waitFor('four Agent-root rows', async () => (await rows.count()) === 5);
    const all = [];
    for (let i = 0; i < await rows.count(); i += 1) {
      const row = rows.nth(i);
      const m = await measure(row);
      const where = `agent-root row ${m.label}`;
      restChecks(m, where);
      const kind = await row.getAttribute('data-node-kind');
      if (kind === 'agent_team') teamChecks(m, where); else agentChecks(m, where);
      all.push({ kind, ...m, hover: await hoverCheck(page, row, where), focus: await keyboardFocus(page, row, where) });
    }
    await page.mouse.move(2, 2);
    await shot('agent-root-rest');
    const taskAgent = tree.locator('[data-agent-run-id="task-run"]');
    const memberRow = tree.locator('[data-agent-run-id="pb-run"]');
    const teamRow = tree.locator('[data-node-kind="agent_team"]');
    // Keyboard Enter selects the delegated Agent; Space selects the Team member; click selects again.
    await keyboardFocus(page, taskAgent, 'agent-root task agent');
    await page.keyboard.press('Enter');
    await waitFor('task-run selected', async () => (await page.evaluate(() => window.__drcsAgentRoot.selected())) === 'task-run');
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400); selectedChecks(await measure(taskAgent), 'agent-root selected task agent');
    await shot('agent-root-selected');
    await keyboardFocus(page, memberRow, 'agent-root member');
    await page.keyboard.press('Space');
    await waitFor('pb-run selected', async () => (await page.evaluate(() => window.__drcsAgentRoot.selected())) === 'pb-run');
    await page.waitForTimeout(400); selectedChecks(await measure(memberRow), 'agent-root selected Team member');
    assert((await measure(taskAgent)).selected === 'false', 'previous selection not cleared');
    await taskAgent.click();
    await waitFor('task-run reselected by click', async () => (await page.evaluate(() => window.__drcsAgentRoot.selected())) === 'task-run');
    // Team disclosure still collapses/expands its members.
    assert(await teamRow.getAttribute('aria-expanded') === 'true', 'Team not expanded initially');
    await teamRow.locator('[data-test="workspace-team-transient-disclosure"]').click();
    await waitFor('Team collapsed', async () => (await rows.count()) === 3 && await teamRow.getAttribute('aria-expanded') === 'false');
    await teamRow.locator('[data-test="workspace-team-transient-disclosure"]').click();
    await waitFor('Team expanded', async () => (await rows.count()) === 5);
    // Focus shows the identity tooltip (preserved).
    await keyboardFocus(page, teamRow, 'agent-root team tooltip');
    const tooltipVisible = await teamRow.locator('.hierarchy-identity-tooltip').evaluate((el) => getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity !== '0').catch(() => 'no-tooltip-element');
    await shot('agent-root-team-focus');
    return { rows: all, storeRows: await page.evaluate(() => window.__drcsAgentRoot.rows()), tooltipVisible };
  });

  await runCase('E2E-002', 'Agent root at 390x844 (VIS-008): rows fit, names truncate, style unchanged', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/api-e2e-drcs-agent-root?narrow=1`, { waitUntil: 'domcontentloaded' });
    const tree = page.locator('[data-test="workspace-agent-run-task-tree"]');
    await tree.waitFor({ state: 'visible' });
    const rows = tree.locator('[data-test="workspace-team-transient-execution-row"]');
    await waitFor('rows', async () => (await rows.count()) === 5);
    const aside = await page.locator('[data-test="sidebar"]').evaluate((el) => el.getBoundingClientRect().right);
    const out = [];
    for (let i = 0; i < 5; i += 1) {
      const m = await measure(rows.nth(i));
      restChecks(m, `narrow agent-root ${m.label}`);
      assert(m.rect.right <= aside + 0.5, 'row overflows sidebar', { m, aside });
      assert(m.nameOverflow === 'ellipsis', 'name does not truncate', m);
      out.push(m);
    }
    const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(docOverflow <= 0, 'page scrolls horizontally', { docOverflow });
    await shot('agent-root-390');
    await page.setViewportSize({ width: 1440, height: 960 });
    return { rows: out, docOverflow };
  });

  // ---------------------------------------------------------------- Team root
  await runCase('E2E-003', 'Team root (WorkspaceTeamExecutionTree): delegated rows flat, hover/focus, bolt Team, selection identical to a member row', async () => {
    await page.goto(`${base}/api-e2e-drcs-team-root`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__peerSidebarProbe));
    const rows = page.locator('[data-test="workspace-team-transient-execution-row"]');
    await rows.first().waitFor({ state: 'visible' });
    // Reveal the nested delegated Team so the Team row, its member and nested delegated agent all render.
    await page.evaluate(() => window.__peerSidebarProbe.revealNested());
    await page.locator('[data-agent-run-id="peer-nested-task"]').waitFor({ state: 'visible' });
    const all = [];
    for (let i = 0; i < await rows.count(); i += 1) {
      const row = rows.nth(i);
      const m = await measure(row);
      const where = `team-root row ${m.label}`;
      if (m.selected === 'true') { all.push({ skippedSelected: m.label }); continue; }
      restChecks(m, where);
      const kind = await row.getAttribute('data-node-kind');
      if (kind === 'agent_team') teamChecks(m, where); else agentChecks(m, where);
      all.push({ kind, ...m, hover: await hoverCheck(page, row, where), focus: await keyboardFocus(page, row, where) });
    }
    assert(all.some((r) => r.kind === 'agent_team') && all.filter((r) => r.kind === 'agent').length >= 3, 'Team root fixture lacks expected delegated kinds', all);
    // Member row as the reference for rest/hover/focus.
    const worker = page.locator('[role="treeitem"][data-row-kind="stable_member"][data-member-address="/Worker"]');
    const memberRest = await measure(worker);
    const memberHover = await hoverCheck(page, worker, 'team-root member Worker');
    const memberFocus = await keyboardFocus(page, worker, 'team-root member Worker');
    await page.mouse.move(2, 2);
    await shot('team-root-rest');
    // Selection: delegated row and member row produce identical selected styles.
    const taskA = page.locator('[role="treeitem"][data-agent-run-id="peer-task-a"]');
    await taskA.click();
    await waitFor('task A selected', async () => (await page.evaluate(() => window.__peerSidebarProbe.state())).focus === 'peer-task-a');
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400); // transition-colors 150ms
    const delegatedSelected = await measure(taskA);
    selectedChecks(delegatedSelected, 'team-root selected delegated row');
    await shot('team-root-delegated-selected');
    await worker.click();
    await waitFor('worker selected', async () => (await page.evaluate(() => window.__peerSidebarProbe.state())).focus === 'peer-worker');
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);
    const memberSelected = await measure(worker);
    selectedChecks(memberSelected, 'team-root selected member row');
    for (const k of ['background', 'color', 'boxShadow', 'borderRadius']) assert(delegatedSelected[k] === memberSelected[k], `selected ${k} differs`, { delegatedSelected, memberSelected });
    const tabTo = async (locator) => { await page.locator('h1').first().click(); const h = await locator.elementHandle();
      for (let i = 0; i < 80; i += 1) { await page.keyboard.press('Tab'); if (await page.evaluate((el) => document.activeElement === el, h)) return true; } return false; };
    assert(await tabTo(worker), 'selected member not reachable by Tab'); await page.waitForTimeout(400);
    const memberSelectedFocused = await measure(worker);
    await taskA.click(); await waitFor('task A reselected', async () => (await page.evaluate(() => window.__peerSidebarProbe.state())).focus === 'peer-task-a');
    assert(await tabTo(taskA), 'selected delegated row not reachable by Tab'); await page.waitForTimeout(400);
    const delegatedSelectedFocused = await measure(taskA);
    for (const k of ['background', 'color', 'boxShadow', 'borderRadius', 'focusVisible']) assert(delegatedSelectedFocused[k] === memberSelectedFocused[k], `selected+focused ${k} differs from member`, { delegatedSelectedFocused, memberSelectedFocused });
    return { rows: all, member: { rest: memberRest, hover: memberHover, focus: memberFocus }, delegatedSelected, memberSelected, delegatedSelectedFocused, memberSelectedFocused };
  });

  // ---------------------------------------------------------------- Org root
  await runCase('E2E-004', 'Org root (WorkspaceAgentOrgHistoryCollection): task Agent and task Team rows flat, hover/focus ring, slate bolt + semibold, click/Enter/Space', async () => {
    await page.goto(`${base}/api-e2e-drcs-org-root`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__taskTeamDisclosureProbe));
    const rows = page.locator('[data-test^="agent-org-task-agent-row-"], [data-test^="agent-org-task-team-row-"]');
    await rows.first().waitFor({ state: 'visible' });
    const all = [];
    for (let i = 0; i < await rows.count(); i += 1) {
      const row = rows.nth(i);
      const m = await measure(row);
      const dataTest = await row.getAttribute('data-test');
      const where = `org row ${dataTest}`;
      restChecks(m, where);
      if (dataTest.startsWith('agent-org-task-team-row-')) {
        teamChecks(m, where);
        assert(await row.locator('[data-icon="heroicons:user-group-20-solid"], svg[data-icon*="user-group"]').count() === 0, `${where}: still shows user-group`);
      } else agentChecks(m, where);
      all.push({ dataTest, ...m, hover: await hoverCheck(page, row, where), focus: await keyboardFocus(page, row, where) });
    }
    assert(all.some((r) => r.dataTest.includes('task-team')) && all.some((r) => r.dataTest.includes('task-agent')), 'Org fixture lacks a task Team or task Agent row', all);
    // Org member row reference (configured Agent) for rest/hover parity.
    const member = page.locator('[data-test="agent-org-agent-row-teacher-run"]');
    const memberRest = await measure(member);
    assert(memberRest.color === EXPECT.text && memberRest.background === EXPECT.rest, 'Org member row reference changed', memberRest);
    await page.mouse.move(2, 2);
    await shot('org-root-rest');
    // Interaction unchanged: Enter / Space / click on the task Agent row reach the inspect action.
    await page.evaluate(() => window.__taskTeamDisclosureProbe.resetCalls());
    const taskAgent = page.locator('[data-test="agent-org-task-agent-row-teacher-task"]');
    await keyboardFocus(page, taskAgent, 'org task agent');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await taskAgent.click();
    await waitFor('3 inspect calls', async () => (await page.evaluate(() => window.__taskTeamDisclosureProbe.state())).calls.inspect.length === 3);
    // Task Team row click toggles its disclosure.
    const teamRow = page.locator('[data-test="agent-org-task-team-row-ssg-task-2"]');
    const before = await teamRow.getAttribute('aria-expanded');
    await teamRow.click();
    await waitFor('task team toggled', async () => (await teamRow.getAttribute('aria-expanded')) !== before);
    await keyboardFocus(page, teamRow, 'org task team focus shot');
    await shot('org-root-team-focus');
    return { rows: all, memberRest, calls: (await page.evaluate(() => window.__taskTeamDisclosureProbe.state())).calls, teamToggle: { before, after: await teamRow.getAttribute('aria-expanded') } };
  });

  await runCase('E2E-005', 'Org root at 390x844 (VIS-008): delegated rows do not overflow the page; names truncate', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__taskTeamDisclosureProbe));
    // The fixture's sidebar is a fixed 360px; constrain it to the viewport like the narrow app layout.
    await page.addStyleTag({ content: '[data-test="sidebar"]{width:100% !important;max-width:100% !important}' });
    const rows = page.locator('[data-test^="agent-org-task-agent-row-"], [data-test^="agent-org-task-team-row-"]');
    await rows.first().waitFor({ state: 'visible' });
    const out = [];
    for (let i = 0; i < await rows.count(); i += 1) {
      const m = await measure(rows.nth(i));
      restChecks(m, `narrow org ${m.label}`);
      assert(m.rect.right <= 390, 'row overflows viewport', m);
      assert(m.nameOverflow === 'ellipsis', 'name does not truncate', m);
      out.push(m);
    }
    await shot('org-root-390');
    await page.setViewportSize({ width: 1440, height: 960 });
    return { rows: out };
  });

  const errors = evidence.browserEvents.filter((e) => e.type === 'pageerror' || (e.type === 'console:error' && !/hydration|Hydration/.test(e.text)));
  evidence.unexpectedBrowserErrors = errors;
} catch (error) {
  evidence.failures.push({ id: 'HARNESS', message: error.message, details: error.details, stack: error.stack });
  if (page) await shot('failure').catch(() => {});
} finally {
  try { await context?.close(); await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; } catch (e) { evidence.cleanup.browser = `failed: ${e.message}`; }
  try {
    if (nuxt && !exited(nuxt)) {
      process.kill(-nuxt.pid, 'SIGTERM');
      if (!await waitExit(nuxt, 10000)) { process.kill(-nuxt.pid, 'SIGKILL'); await waitExit(nuxt, 5000); }
    }
    evidence.cleanup.nuxt = nuxt ? { pid: nuxt.pid, exited: exited(nuxt), exitCode: nuxt.exitCode, signal: nuxt.signalCode } : 'not-started';
  } catch (e) { evidence.cleanup.nuxt = `failed: ${e.message}`; }
  if (nuxtLog) await new Promise((r) => nuxtLog.end(r));
  const removed = [];
  for (const dest of installed) { await fs.rm(dest, { force: true }); removed.push({ dest, exists: existsSync(dest) }); }
  evidence.cleanup.pages = removed;
  evidence.result = evidence.failures.length === 0 && Object.values(evidence.cases).every((c) => c.result === 'Pass') ? 'Pass' : 'Fail';
  evidence.finishedAt = new Date().toISOString();
  await save();
}
process.stdout.write(`delegated-row-style probe: ${evidence.result}. Evidence: ${evidencePath}\n`);
if (evidence.result !== 'Pass') process.exitCode = 1;
