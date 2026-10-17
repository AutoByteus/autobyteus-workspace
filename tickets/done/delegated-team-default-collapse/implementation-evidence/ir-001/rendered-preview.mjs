// Implementation self-inspection only: a fixture-backed dev surface, not product/API/E2E sign-off.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
const root = '/home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse';
const web = root + '/autobyteus-web';
const require = createRequire(web + '/package.json');
const { chromium } = require('playwright-core');
const { routeTaskWorkerBoundaries } = await import(web + '/tests/e2e/fixtures/task-worker-boundaries.mjs');
const label = process.argv[2];
const output = root + '/tickets/in-progress/delegated-team-default-collapse/implementation-evidence/ir-001/';
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const evidence = { label, runtime: process.platform + '-' + process.arch, browser: browser.version(), samples: [], errors: [], requests: {}, limitation: 'Mock GraphQL/Projects feed; host button is preview-only, not actual role/run open; timings are collaboration inspection plus render, not real manager selection latency.' };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(90000);
  await page.route('**/rest/health', route => route.fulfill({ json: { status: 'ok' } }));
  await page.route('**/graphql', async route => {
    const p = route.request().postDataJSON();
    evidence.requests[p.operationName] = (evidence.requests[p.operationName] || 0) + 1;
    let data;
    if (p.operationName === 'GetAgentRunCollaboration') data = { agentRunCollaboration: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: await page.evaluate(() => window.__sidebarPreview.view) } };
    else if (p.operationName === 'GetAgentRunCollaborationMemberProjection') data = { agentRunCollaborationMemberProjection: { __typename: 'AgentRunCollaborationMemberProjection', agentRunId: p.variables.agentRunId, memberAddress: p.variables.memberAddress, conversation: [], activities: [], summary: null, lastActivityAt: null, hasEarlierActiveTraceEvents: false } };
    else if (p.operationName === 'GetRunFileChanges') data = { getRunFileChanges: [] };
    else if (p.operationName === 'GetAgentDefinitions') data = { agentDefinitions: [] };
    else if (p.operationName === 'GetAgentTeamDefinitions') data = { agentTeamDefinitions: [] };
    else if (p.operationName === 'GetAllWorkspaces') data = { workspaces: [] };
    else if (p.operationName === 'GetServerSettings') data = { serverSettings: [] };
    else if (p.operationName === 'GetApplicationsCapability') data = { applicationsCapability: { enabled: false, scope: 'BOUND_NODE', settingKey: 'ENABLE_APPLICATIONS', source: 'INITIALIZED_EMPTY_CATALOG' } };
    else if (p.operationName === 'GetSkillImprovementCapability') data = { skillImprovementCapability: { enabled: false, settingKey: 'ENABLE_SKILL_IMPROVEMENT', source: 'INITIALIZED_EMPTY_CATALOG' } };
    else throw new Error('Unprovided boundary: ' + p.operationName);
    await route.fulfill({ json: { data } });
  });
  await routeTaskWorkerBoundaries(page);
  await page.routeWebSocket(/\/ws\/agent-package-definitions(\?|$)/, ws => { ws.send(JSON.stringify({ type: 'connected' })); });
  const url = 'http://127.0.0.1:43187/local-sidebar-preview';
  await page.goto(url); await page.waitForFunction(() => Boolean(window.__sidebarPreview));
  await page.waitForTimeout(2500); // dependency optimization warmup, not measured product behavior
  await page.reload(); await page.waitForFunction(() => Boolean(window.__sidebarPreview));
  page.on('pageerror', e => evidence.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') evidence.errors.push(m.text()); });
  evidence.requests = {};
  const expected = label === 'baseline' ? 49 : 7;
  const rows = page.locator('[data-test="workspace-team-transient-execution-row"]');
  let start = performance.now();
  await page.locator('[data-preview="host"]').click();
  await page.waitForFunction(n => window.__sidebarPreview.state().rows.length === n, expected);
  evidence.samples.push({ boundary: 'fresh-store preview disclosure click to collaboration rows', ms: performance.now() - start, rows: await rows.count(), requests: { ...evidence.requests } });
  evidence.requests = {}; start = performance.now();
  await page.evaluate(() => window.__sidebarPreview.refresh());
  evidence.samples.push({ boundary: 'warm collaboration refresh to published rows', ms: performance.now() - start, rows: await rows.count(), requests: { ...evidence.requests } });
  await page.screenshot({ path: output + label + '-initial.png', fullPage: true });
  if (label !== 'baseline') {
    const team = page.locator('[role="treeitem"][data-node-kind="agent_team"]').nth(4);
    await team.locator('[data-test="workspace-team-transient-disclosure"]').click();
    await page.waitForFunction(() => window.__sidebarPreview.state().rows.length === 13);
    if (await page.evaluate(() => window.__sidebarPreview.state().selections) !== 0) throw new Error('Disclosure selected conversation');
    await page.locator('[data-agent-run-id="software-team-4-member-2"]').click();
    if (await page.locator('[data-preview="selected"]').innerText() !== 'software-team-4-member-2') throw new Error('Wrong member target');
    await page.evaluate(() => window.__sidebarPreview.refresh());
    if (await rows.count() !== 13) throw new Error('Refresh lost manual disclosure');
    await page.waitForTimeout(500); // inspect settled layout, not the 200ms row enter/move transition
    await page.screenshot({ path: output + label + '-member.png', fullPage: true });
    await team.locator('[data-test="workspace-team-transient-disclosure"]').click();
    await page.waitForFunction(() => window.__sidebarPreview.state().rows.length === 7);
    await page.waitForTimeout(300);
    await team.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__sidebarPreview.state().rows.length === 13);
    if (await page.locator('[data-preview="selected"]').innerText() !== 'software-team-4-member-0') throw new Error('Wrong coordinator target');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__sidebarPreview.state().rows.length === 7);
    await page.reload(); await page.waitForFunction(() => Boolean(window.__sidebarPreview));
    await page.locator('[data-preview="host"]').click(); await page.waitForFunction(() => window.__sidebarPreview.state().rows.length === 7);
    await page.setViewportSize({ width: 760, height: 900 });
    await page.screenshot({ path: output + label + '-restart-narrow.png', fullPage: true });
    evidence.interactions = 'disclosure-only, exact same-address member, refresh, collapse, Enter/Space coordinator, fresh page restart, narrow viewport';
  }
  evidence.state = await page.evaluate(() => window.__sidebarPreview.state());
  if (evidence.errors.length || evidence.state.error) throw new Error('Browser errors: ' + JSON.stringify(evidence.errors) + ', store error=' + evidence.state.error);
} finally {
  await browser.close(); evidence.browserClosed = true;
  await fs.writeFile(output + label + '-preview.json', JSON.stringify(evidence, null, 2));
}
console.log(JSON.stringify(evidence, null, 2));
