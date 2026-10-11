#!/usr/bin/env node
// REAL-001 (temporary, API/E2E-owned): the user's journey with a real model in an isolated desktop instance of this
// worktree build. The public package's Project Task Manager (Claude runtime) creates a Project + dummy Task from New chat
// and delegates it to Daily Assistant. With the left panel collapsed, the worker is opened from the Task card in the right
// Projects tab, then the strip's Workspaces icon is used. Driven over the instance's CDP control port like a user.
// Usage: node real-ptm-journey.mjs <controlEndpoint> <backendUrl> <outputDir> [phase]
//   phase: send (default: New chat → send the request) | open (Task card → Workspaces checks) | all
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const webDir = '/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/autobyteus-web';
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const [controlEndpoint, backendUrl, outputDir, phase = 'all'] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, fn, ms = 30000, every = 250) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(every); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const assert = (c, m, d) => { if (!c) { const e = new Error(m); e.details = d; throw e; } };
const gql = async (query, variables = {}) => {
  const r = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const b = await r.json(); if (!r.ok || b.errors?.length) throw new Error(JSON.stringify(b.errors ?? b)); return b.data;
};
const evidencePath = path.join(outputDir, `real-${phase}.json`);
const evidence = { phase, startedAt: new Date().toISOString(), steps: {}, errors: [] };
const save = () => fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `real-${name}.png`) });
const PROJECT_NAME = 'Strip Check';

const shellNav = (page) => page.evaluate(() => {
  const strip = document.querySelector('[data-test="workspace-left-navigation-strip"]');
  const ws = document.querySelector('[data-test="workspace-left-strip-workspaces"]');
  return { strip: Boolean(strip), workspacesLit: ws ? ws.getAttribute('aria-current') === 'location' : null,
    stripChatLit: strip?.querySelector('[data-nav-key="chat"]')?.classList.contains('bg-gray-100') ?? null,
    focus: document.activeElement?.getAttribute('data-test') ?? document.activeElement?.tagName ?? null, hash: location.hash };
});
const revealed = (page) => page.evaluate(() => {
  const sc = [...document.querySelectorAll('[data-test="workspace-history-tree-scroll"]')].filter((e) => e.getBoundingClientRect().height > 0).at(-1);
  const rows = sc ? sc.querySelectorAll('[aria-current="true"], [aria-selected="true"]') : [];
  const row = rows[rows.length - 1]; if (!sc || !row) return null;
  const b = sc.getBoundingClientRect(); const r = row.getBoundingClientRect();
  return { agentRunId: row.getAttribute('data-agent-run-id') ?? row.getAttribute('data-run-id'), test: row.getAttribute('data-test'),
    text: row.textContent.replace(/\s+/g, ' ').trim().slice(0, 80), visible: r.height > 0 && r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5,
    scrollTop: Math.round(sc.scrollTop), focused: document.activeElement === row, selectedRows: rows.length };
});
const selection = (page) => page.evaluate(() => {
  const pinia = document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$pinia;
  return { hash: location.hash, subject: JSON.stringify(pinia?._s.get('agentSelection')?.subject ?? null) };
});
const centerText = (page) => page.locator('[data-test="workspace-center-pane"]').innerText().catch(() => '');
const findProject = async () => (await gql('query{projects{projectId name}}')).projects.find((p) => p.name.startsWith(PROJECT_NAME)) ?? null;
const projectTasks = async (projectId) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId description status root{kind recipientAddress ingressAgentRunId start status hostRoot{kind runId}}}}', { id: projectId })).projectTasks;

const browser = await chromium.connectOverCDP(controlEndpoint);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => /renderer\/index\.html/.test(p.url()));
page.setDefaultTimeout(30000);
page.on('pageerror', (e) => evidence.errors.push(`pageerror: ${e.message}`));
try {
  await fs.mkdir(outputDir, { recursive: true });
  evidence.window = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  assert(evidence.window.width >= 1400, 'resize the instance window to at least 1400 px wide first', evidence.window);

  if (phase === 'send' || phase === 'all') {
    // New chat with the Project Task Manager on Claude (cheapest listed model), panel collapsed before sending.
    if (await page.locator('[data-test="workspace-left-strip-workspaces"]').isVisible().catch(() => false)) await page.locator('[data-test="workspace-left-strip-workspaces"]').click();
    await page.locator('[data-test="app-left-panel-chat"]').click();
    const input = page.locator('[data-test="chat-composer"] textarea').first();
    await input.waitFor({ timeout: 60000 });
    const ptm = (await gql('query{agentDefinitions{id name}}')).agentDefinitions.find((d) => d.name === 'Project Task Manager');
    assert(ptm, 'Project Task Manager not in the catalog (import the public package first)');
    await page.locator('[data-test="run-target-switcher-trigger"]').click();
    await page.locator('[data-test="run-target-switcher-search"]').fill('Project Task');
    await page.locator(`[data-test="run-target-switcher-option-${ptm.id}"]`).click();
    await page.locator('[data-test="run-target-switcher-menu"]').waitFor({ state: 'detached', timeout: 30000 });
    await page.locator('[data-test="chat-model-trigger"]').click();
    const list = page.locator('[data-test="chat-model-list-claude_agent_sdk"]');
    const runtimeRow = page.locator('[data-test="chat-runtime-claude_agent_sdk"]');
    for (let i = 0; i < 6 && !(await list.isVisible().catch(() => false)); i += 1) {
      await runtimeRow.hover().catch(() => undefined); await sleep(400);
      if (!(await list.isVisible().catch(() => false))) { await runtimeRow.click().catch(() => undefined); await sleep(700); }
    }
    const models = await list.locator('button[role="menuitemradio"][data-test^="chat-model-option-"]').evaluateAll((es) => es.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')));
    const model = models.find((m) => /haiku/i.test(m)) ?? models[0];
    await list.locator(`[data-test="chat-model-option-${model}"]`).click();
    await page.keyboard.press('Escape').catch(() => undefined);
    evidence.steps.target = { ptmId: ptm.id, models, model };
    const request = `Create a Project named "${PROJECT_NAME}" with one Task: "Write a two-line poem about trees and reply with it." Then delegate that Task to the Daily Assistant. You have my approval for this dispatch.`;
    await input.click(); await input.fill(request);
    await page.locator('[data-test="app-left-panel-collapse"]').click();
    await page.locator('[data-test="workspace-left-strip-workspaces"]').waitFor({ timeout: 15000 });
    await shot(page, '01-new-chat-collapsed-before-send');
    await page.locator('[data-test="chat-primary-action"]').first().click();
    await page.waitForURL((u) => /#\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 });
    evidence.steps.sent = { request, hash: (await selection(page)).hash, nav: await shellNav(page) };
    await save();
    // Wait for the manager's real tool calls: Project, Task, delegation started.
    const delegated = await until('Project created and its Task delegated', async () => {
      const project = await findProject(); if (!project) return null;
      const tasks = await projectTasks(project.projectId);
      const task = tasks.find((t) => t.root?.ingressAgentRunId && t.root.start && t.root.start !== 'initializing');
      return task ? { project, task } : null;
    }, 600000, 3000);
    evidence.steps.delegated = delegated;
    await sleep(3000);
    await shot(page, '02-manager-after-delegation');
    await save();
  }

  if (phase === 'open' || phase === 'all') {
    const project = await findProject(); assert(project, 'no Strip Check project');
    const task = (await projectTasks(project.projectId)).find((t) => t.root?.ingressAgentRunId);
    assert(task, 'no delegated Task');
    evidence.steps.task = task;
    // Panel collapsed (the user's starting state), manager conversation open.
    if (await page.locator('[data-test="app-left-panel-collapse"]').isVisible().catch(() => false)) {
      await page.locator('[data-test="app-left-panel-collapse"]').click();
      await page.locator('[data-test="workspace-left-strip-workspaces"]').waitFor({ timeout: 15000 });
    }
    evidence.steps.onManager = await shellNav(page);
    // Open the worker from the Task card in the right Projects tab.
    const tabs = page.locator('[data-test="right-side-tab-list"]:visible [data-tab-name]');
    await tabs.first().waitFor({ timeout: 60000 });
    if (await tabs.first().getAttribute('aria-selected') !== 'true') await tabs.first().click();
    const panel = page.locator('[data-test="right-side-projects-panel"]');
    await panel.getByTestId('projects-panel-picker-select').selectOption(`project:${project.projectId}`);
    const line = panel.locator(`[data-testid="project-task-row-${task.taskId}"] [data-testid^="project-task-root-"][data-openable="true"]`);
    await line.waitFor({ timeout: 60000 });
    await line.click();
    await until('worker conversation in the center', async () => /Task delegator address/.test(await centerText(page)), 60000);
    const before = await until('Workspaces lit for the worker', async () => { const n = await shellNav(page); return n.workspacesLit ? n : null; }, 30000);
    const selBefore = await until('route settled', async () => { const a = await selection(page); await sleep(750); const b = await selection(page); return JSON.stringify(a) === JSON.stringify(b) ? b : null; }, 15000);
    evidence.steps.workerOpen = { before, selBefore, center: (await centerText(page)).slice(0, 300) };
    await shot(page, '03-collapsed-worker-open');
    // The user's action: the strip's Workspaces icon.
    await page.locator('[data-test="workspace-left-strip-workspaces"]').click();
    await page.locator('[data-test="app-left-panel-run-history"]').waitFor({ timeout: 15000 });
    const row = await until('worker row revealed', async () => { const r = await revealed(page); return r?.visible && r.agentRunId === task.root.ingressAgentRunId ? r : null; }, 15000);
    await sleep(800);
    const settled = await revealed(page); const selAfter = await selection(page);
    evidence.steps.afterWorkspaces = { row, settled, selAfter, center: (await centerText(page)).slice(0, 300),
      projectsTabSelected: await tabs.first().getAttribute('aria-selected') };
    assert(before.stripChatLit === false, 'Chat must not be lit on the open worker', before);
    assert(JSON.stringify(selAfter) === JSON.stringify(selBefore), 'Workspaces changed the route or selection', { selBefore, selAfter });
    assert(settled.visible && settled.focused && settled.selectedRows === 1 && settled.agentRunId === task.root.ingressAgentRunId, 'worker row selected, visible, focused, only selected row', settled);
    assert(/Task delegator address/.test(await centerText(page)) && evidence.steps.afterWorkspaces.projectsTabSelected === 'true', 'center or Projects tab changed');
    await shot(page, '04-workspaces-revealed');
  }
  assert(evidence.errors.length === 0, 'renderer errors', evidence.errors);
  evidence.result = 'Pass';
} catch (error) {
  evidence.result = 'Fail'; evidence.failure = { message: error.message, details: error.details };
  await shot(page, `failure-${phase}`).catch(() => undefined);
} finally {
  evidence.finishedAt = new Date().toISOString();
  await save();
  process.stdout.write(`REAL-001 ${phase}: ${evidence.result}\n`);
  process.exit(evidence.result === 'Pass' ? 0 : 1);
}
