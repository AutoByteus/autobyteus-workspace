#!/usr/bin/env node
// AC-011 evidence in the real desktop app (ticket-owned automation, not a package command).
// Usage: node ac011-desktop.mjs <isolated-start.json> <evidence dir>
// Attaches over CDP to the isolated instance's controlPort and drives its renderer like a user; setup uses the
// instance's own public GraphQL. Runtime: AGY with the repository's scripted CLI, configured on this instance only through
// updateServerSetting (ANTIGRAVITY_CLI_COMMAND, AGY_FAKE_CASE=linked_skills) + restart; `CALL_TOOL:{…}` makes an agent call the
// real tool, `HOLD_TURN` keeps its turn running. (The Codex attempt hit the account's usage limit; see attempt1-codex-quota/.)
//   (a) an Agent run delegates a Team; its coordinator answers (green, collapsed and expanded), then works (blue, pulsing,
//       collapsed and expanded);
//   (b) an idle standalone Team run under TEAMS: run and group rows green with Stop present;
//   (c) Stop that run → run and group gray; stop the Agent-run host → its delegated Team gray.
// Each step records DOM assertions (data-status, colour, pulse, aria-label/title, dot before the icon) and a screenshot.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/autobyteus-web/package.json');
const { chromium } = require('playwright-core');

const [startFile, outDir, suffixArg] = process.argv.slice(2);
const S = suffixArg ?? 'AGY'; const s = S.toLowerCase(); // a fresh suffix gives fresh definitions, workspace and rows
const inst = JSON.parse(await fs.readFile(startFile, 'utf8')).result;
const base = inst.backendUrl;
const evidence = { instanceId: inst.instanceId, controlPort: inst.controlPort, backendUrl: base, executablePath: inst.executablePath,
  startedAt: new Date().toISOString(), steps: {}, timeline: [], failures: [] };
const save = () => fs.writeFile(path.join(outDir, 'ac011-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, fn, ms) => { const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(250); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`); };
const assert = (c, m, d) => { if (!c) { const e = new Error(m); e.details = d; throw e; } };
const gql = async (query, variables = {}) => {
  const b = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
  if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };

// ---------------------------------------------------------------- setup through the instance's public API
const wsRoot = path.join(inst.dataRoot, `ac011-${s}`);
await fs.mkdir(wsRoot, { recursive: true });
const cfg = { workspaceRootPath: wsRoot, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' };
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const agentDef = async (name, instructions) => (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
  { i: { name, role: 'assistant', description: name, instructions, toolNames: [] } })).createAgentDefinition.id;
const ids = {
  manager: await agentDef(`Status Manager ${S}`, 'You coordinate work by delegating it. Follow the user exactly. Never call create_or_update_task.'),
  lead: await agentDef(`Status Lead ${S}`, 'Do exactly what the message asks, using your shell tool when told to run a command.'),
  helper: await agentDef(`Status Helper ${S}`, 'Help when asked.'),
};
ids.team = (await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: `Status Check Team ${S}`,
  description: 'Status check team', instructions: 'Do what the coordinator is asked.', coordinatorMemberName: 'lead',
  nodes: [{ memberName: 'lead', ref: ids.lead, refScope: 'SHARED' }, { memberName: 'helper', ref: ids.helper, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
await gql('mutation($i:CreateWorkspaceInput!){createWorkspace(input:$i){workspaceId}}', { i: { rootPath: wsRoot } }).catch(() => {});
const host = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: ids.manager, ...cfg } })).createAgentRun;
assert(host.success, host.message);
evidence.setup = { ids, wsRoot, hostRunId: host.runId, model: cfg.llmModelIdentifier, runtime: cfg.runtimeKind };

// ---------------------------------------------------------------- renderer helpers
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${inst.controlPort}`);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => !p.url().startsWith('devtools'));
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const shot = (name) => page.screenshot({ path: path.join(outDir, `${name}.png`) });
const TEAM_DOT = '[data-test="team-aggregate-status-dot"]';
/** The Team dot of a row as rendered: status, colour, pulse, label/title, count and position before the people-group icon. */
const dotOf = (loc) => loc.evaluate((el, sel) => {
  const dots = el.querySelectorAll(sel); const dot = dots[0]; const inner = dot?.querySelector('span, svg');
  const icon = el.querySelector('[data-team-icon]') ?? (dot?.nextElementSibling?.matches('svg') ? dot.nextElementSibling : null);
  const cs = inner ? getComputedStyle(inner) : null;
  return { count: dots.length, status: dot?.getAttribute('data-status') ?? null, ariaLabel: dot?.getAttribute('aria-label') ?? null,
    title: dot?.getAttribute('title') ?? null, dotClass: inner?.getAttribute('class') ?? null, backgroundColor: cs?.backgroundColor ?? null,
    animationName: cs?.animationName ?? null, rowLabel: el.getAttribute('aria-label'),
    beforeIcon: icon && dot ? dot.getBoundingClientRect().right <= icon.getBoundingClientRect().left + 0.5 : null };
}, TEAM_DOT);
// Rendered colours: blue/green/red as the Tailwind palette; this app's gray-400 renders as a neutral gray (equal channels).
const COLOUR = { running: ['bg-blue-500', /^rgb\(59, 130, 246\)$/], idle: ['bg-green-500', /^rgb\(34, 197, 94\)$/], error: ['bg-red-500', /^rgb\(239, 68, 68\)$/], offline: ['bg-gray-400', /^rgb\((\d+), \1, \1\)$/] };
const WORD = { running: 'Running', idle: 'Idle', error: 'Error', offline: 'Offline' };
const assertDot = (d, status, where, { icon = true } = {}) => {
  assert(d.count === 1, `${where}: expected one Team dot`, d);
  assert(d.status === status, `${where}: status ${d.status}, expected ${status}`, d);
  assert((d.dotClass ?? '').split(/\s+/).includes(COLOUR[status][0]) && COLOUR[status][1].test(d.backgroundColor ?? ''), `${where}: colour`, d);
  assert(status === 'running' ? d.animationName === 'pulse' : d.animationName === 'none', `${where}: pulse only when busy`, d);
  assert(d.ariaLabel === `Team status: ${WORD[status]}` && d.title === d.ariaLabel, `${where}: label/title`, d);
  if (icon) assert(d.beforeIcon === true, `${where}: dot not before the people-group icon`, d);
};
const taskTeamRow = () => page.locator('[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]').first();
const agentRowStatus = async (agentRunId) => {
  const cls = await page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${agentRunId}"] [data-test="workspace-transient-status-dot"]`).getAttribute('class');
  return [['gray', 'offline'], ['green', 'idle'], ['blue', 'running'], ['amber', 'initializing'], ['red', 'error']].find(([c]) => (cls ?? '').includes(`-${c}-`))?.[1] ?? `unknown(${cls})`;
};
const layoutOf = () => taskTeamRow().evaluate((row) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height }; };
  return { dot: box(row.querySelector('[data-test="team-aggregate-status-dot"]')), icon: box(row.querySelector('[data-team-icon]')),
    name: box(row.querySelector('.min-w-0.flex-1 > span.block.truncate')), summary: box(row.querySelector('[data-test="workspace-task-worker-task-summary"]')),
    stop: box(row.querySelector('[data-test="workspace-delegated-stop"]')) };
});
const overlaps = (a, b) => !!a && !!b && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
const assertLayout = (l, where, stop) => {
  assert(l.dot && l.icon && l.name && l.dot.right <= l.icon.left + 0.5 && l.icon.right <= l.name.left + 0.5, `${where}: dot → icon → name`, l);
  assert(Math.abs((l.dot.top + l.dot.height / 2) - (l.name.top + l.name.height / 2)) <= 2, `${where}: dot centered on the name line`, l);
  for (const a of ['dot', 'icon', 'name']) for (const b of ['summary', 'stop']) if (!(a === 'name' && b === 'summary')) assert(!overlaps(l[a], l[b]), `${where}: ${a} overlaps ${b}`, l);
  assert(stop ? !!l.stop : !l.stop, `${where}: per-copy Stop ${stop ? 'missing' : 'still shown'}`, l);
};
const step = async (id, fn) => {
  try { evidence.steps[id] = { result: 'Pass', ...(await fn()) }; }
  catch (e) { evidence.steps[id] = { result: 'Fail', message: e.message, details: e.details }; evidence.failures.push({ id, message: e.message }); throw e; }
  finally { await save(); }
};
/** Records every Team-dot status change of the delegated row, as the user would see it. */
let sampling = true;
const sampler = (async () => { let last = null; while (sampling) { try { const s = await taskTeamRow().locator(TEAM_DOT).getAttribute('data-status', { timeout: 500 });
  if (s !== last) { evidence.timeline.push({ at: new Date().toISOString(), delegatedTeam: s }); last = s; } } catch { /* row not rendered yet */ } await sleep(200); } })();

try {
  // ---------------------------------------------------------------- (a) delegated Team under an Agent run
  await page.reload({ waitUntil: 'load' });
  await until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 1, 60000);
  await page.locator('[data-test="workspace-row"]', { hasText: `ac011-${s}` }).first().click();
  await page.locator('[data-test="workspace-agent-row"]', { hasText: `Status Manager ${S}` }).first().click();
  const runRow = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${host.runId}"]`);
  await runRow.waitFor({ state: 'visible', timeout: 30000 });
  await runRow.click();
  const composer = page.locator('[data-test="workspace-center-pane"] textarea').first();
  await composer.waitFor({ state: 'visible', timeout: 30000 });
  // The user asks the Manager (in its composer) to delegate a piece of work to the Team.
  await composer.fill(callTool('delegate_task', { recipient_address: `/status_check_team_${s}`, description: 'Review the docs site.' }));
  await composer.press('Enter');
  evidence.sentAt = new Date().toISOString();
  const row = taskTeamRow();
  let members;
  const memberStatuses = async () => { const out = {}; for (const m of members) out[m.address] = await agentRowStatus(m.agentRunId); return out; };
  const expand = async (want) => { if ((await row.getAttribute('aria-expanded')) !== String(want)) await row.locator('[data-test="workspace-team-transient-disclosure"]').click();
    await until(`aria-expanded=${want}`, async () => (await row.getAttribute('aria-expanded')) === String(want), 10000); };
  await step('A1-idle', async () => {
    await row.waitFor({ state: 'visible', timeout: 120000 });
    await until('delegated Team idle', async () => (await dotOf(row)).status === 'idle', 120000);
    await expand(true);
    members = await until('member rows', async () => { const rows = page.locator('[data-test="workspace-team-transient-execution-row"][data-agent-run-id]');
      return (await rows.count()) >= 2 ? rows.evaluateAll((els) => els.map((e) => ({ agentRunId: e.getAttribute('data-agent-run-id'), address: e.getAttribute('data-member-address') }))) : null; }, 30000);
    const statuses = await memberStatuses();
    const expanded = await dotOf(row); assertDot(expanded, 'idle', 'idle delegated Team (expanded)');
    assert(Object.values(statuses).includes('idle') && !Object.values(statuses).some((s) => ['running', 'initializing', 'error'].includes(s)), 'member rows contradict idle', statuses);
    assert(/, idle, /.test(expanded.rowLabel ?? ''), 'row aria-label lacks the status word', expanded);
    const layout = await layoutOf(); assertLayout(layout, 'idle row (merged layout)', true);
    await shot('a1-delegated-team-idle-expanded');
    await expand(false);
    const collapsed = await dotOf(row); assertDot(collapsed, 'idle', 'idle delegated Team (collapsed)');
    await shot('a1-delegated-team-idle-collapsed');
    return { expanded, collapsed, members, memberStatuses: statuses, layout };
  });
  await step('A2-busy-collapsed', async () => {
    const lead = members.find((m) => /\/lead$/.test(m.address));
    assert(lead, 'coordinator row not found', members);
    // The Manager messages its delegated coordinator, which starts working; the row stays collapsed.
    await composer.fill(callTool('send_message_to', { target_agent_run_id: lead.agentRunId, content: 'Please take another look. HOLD_TURN' }));
    await composer.press('Enter');
    const sentAt = Date.now();
    await until('collapsed delegated Team busy', async () => (await dotOf(row)).status === 'running', 120000);
    const latencyMs = Date.now() - sentAt;
    assert((await row.getAttribute('aria-expanded')) === 'false', 'row expanded by itself');
    const d = await dotOf(row); assertDot(d, 'running', 'busy delegated Team (collapsed)');
    const layout = await layoutOf(); assertLayout(layout, 'busy collapsed row (merged layout)', true);
    await shot('a2-delegated-team-busy-collapsed');
    return { dot: d, latencyMs, layout };
  });
  await step('A3-busy-expanded', async () => {
    await expand(true);
    const statuses = await until('a member row busy', async () => { const s = await memberStatuses(); return Object.values(s).includes('running') ? s : null; }, 30000);
    const d = await dotOf(row); assertDot(d, 'running', 'busy delegated Team (expanded)');
    assert(/, running, /.test(d.rowLabel ?? ''), 'row aria-label lacks the status word', d);
    await shot('a3-delegated-team-busy-expanded');
    return { dot: d, memberStatuses: statuses };
  });

  // ---------------------------------------------------------------- (b) an idle standalone Team run under TEAMS
  const teamRun = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: {
    teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: '/', ...cfg }],
    memberConfigs: [['lead', ids.lead], ['helper', ids.helper]].map(([m, id]) => ({ memberAddress: `/${m}`, agentDefinitionId: id, ...cfg })) } })).createAgentTeamRun;
  assert(teamRun.success, teamRun.message); evidence.setup.teamRunId = teamRun.teamRunId;
  await page.reload({ waitUntil: 'load' });
  await until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 1, 60000);
  const wsRow = page.locator('[data-test="workspace-row"]', { hasText: `ac011-${s}` }).first();
  await wsRow.waitFor({ timeout: 30000 });
  if (!(await page.locator('[data-test="workspace-agent-row"]', { hasText: `Status Manager ${S}` }).count())) await wsRow.click();
  const group = page.locator('[data-test^="workspace-team-definition-row-"]', { hasText: `Status Check Team ${S}` }).first();
  await group.waitFor({ timeout: 30000 });
  if ((await group.getAttribute('aria-expanded')) === 'false') await group.click();
  const teamRow = page.locator(`[data-test="workspace-team-row-${teamRun.teamRunId}"]`);
  await teamRow.click(); // the user opens the run and talks to its coordinator in the composer
  const teamComposer = page.locator('[data-test="workspace-center-pane"] textarea').first();
  await teamComposer.waitFor({ state: 'visible', timeout: 30000 });
  await teamComposer.fill('Hello, a quick check before we start.');
  await teamComposer.press('Enter');
  const stopOf = (r) => r.locator('xpath=..').locator('button[aria-label="Terminate team"]');
  await step('B1-idle-team-run', async () => {
    await until('team run idle', async () => (await dotOf(teamRow)).status === 'idle', 240000);
    await sleep(1500);
    const run = await dotOf(teamRow); const grp = await dotOf(group);
    assertDot(run, 'idle', 'idle standalone run row', { icon: false });
    assertDot(grp, 'idle', 'group row', { icon: false });
    assert(await stopOf(teamRow).count() === 1, 'Stop missing on the alive idle run');
    assert(await page.locator('[data-test="team-activity-dot"]').count() === 0, 'binary Team dot rendered');
    await shot('b1-idle-team-run-green');
    return { run, group: grp, stopPresent: true };
  });

  // ---------------------------------------------------------------- (c) stop the Team run, then the Agent-run host
  await step('C1-team-run-stopped', async () => {
    await stopOf(teamRow).click();
    await until('run gray', async () => (await dotOf(teamRow)).status === 'offline', 60000);
    await until('group gray', async () => (await dotOf(group)).status === 'offline', 60000);
    const run = await dotOf(teamRow); const grp = await dotOf(group);
    assertDot(run, 'offline', 'stopped run row', { icon: false }); assertDot(grp, 'offline', 'group row after stop', { icon: false });
    assert(await stopOf(teamRow).count() === 0, 'Stop still shown on the stopped run');
    const archiveDelete = await teamRow.locator('xpath=..').locator('button[title="Archive team history"], button[aria-label="Delete team history permanently"]').count();
    assert(archiveDelete >= 1, 'archive/delete not offered on the stopped run');
    await shot('c1-team-run-stopped-gray');
    return { run, group: grp, archiveDeleteButtons: archiveDelete };
  });
  await step('C2-host-stopped', async () => {
    const hostRow = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${host.runId}"]`);
    if (!(await hostRow.count())) await page.locator('[data-test="workspace-agent-row"]', { hasText: `Status Manager ${S}` }).first().click();
    await hostRow.click();
    const row = taskTeamRow(); await row.waitFor({ timeout: 30000 });
    await hostRow.hover();
    const terminate = hostRow.locator('[data-test="terminate-agent-run"]');
    await ((await terminate.count()) ? terminate : hostRow.locator('xpath=..').locator('[data-test="terminate-agent-run"]')).first().click();
    await until('delegated Team gray', async () => (await dotOf(row)).status === 'offline', 60000);
    const d = await dotOf(row); assertDot(d, 'offline', 'delegated Team after host stop');
    await until('per-copy Stop gone', async () => !(await layoutOf()).stop, 30000);
    const layout = await layoutOf(); assertLayout(layout, 'stopped row (merged layout)', false);
    await shot('c2-host-stopped-delegated-team-gray');
    return { dot: d, layout };
  });
  assert(errors.length === 0, 'renderer page errors', errors);
  evidence.result = 'Pass';
} catch (e) {
  evidence.result = 'Fail'; if (!evidence.failures.length) evidence.failures.push({ id: 'HARNESS', message: e.message, details: e.details });
  await shot('failure-state').catch(() => {});
} finally {
  sampling = false; await sampler; evidence.pageErrors = errors; evidence.finishedAt = new Date().toISOString();
  await save(); await browser.close().catch(() => {}); // disconnects CDP only; the instance is stopped separately
}
console.log(`AC-011 desktop: ${evidence.result}`);
process.exit(evidence.result === 'Pass' ? 0 : 1);
