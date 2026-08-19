import fs from 'node:fs';
import { chromium } from '../../../../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const [runtime = 'autobyteus', model = 'gpt-5.6-luna', slug = 'autobyteus'] = process.argv.slice(2);
const base = 'http://127.0.0.1:31236';
const gqlEndpoint = 'http://127.0.0.1:60236/graphql';
const outDir = new URL('./browser/', import.meta.url).pathname;
const agentName = 'API REV 036 Browser Agent';
const expectedToken = `STANDALONE_${slug.toUpperCase()}_OK`;
fs.mkdirSync(outDir, { recursive: true });

async function gql(query, variables = {}) {
  const response = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors) throw new Error(`GRAPHQL_FAILED:${response.status}:${JSON.stringify(json.errors ?? json)}`);
  return json.data;
}

async function ensureAgentDefinition() {
  const listed = await gql('query { agentDefinitions { id name } }');
  const existing = listed.agentDefinitions.find((agent) => agent.name === agentName);
  if (existing) return existing.id;
  const created = await gql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name}}`,
    { input: {
      name: agentName,
      role: 'assistant',
      description: 'Disposable API-REV-036 standalone browser/provider agent.',
      instructions: 'Follow the user request exactly. When asked for an exact token, output that token exactly and nothing else.',
      category: 'runtime-e2e',
      toolNames: [],
      skillNames: [],
    } },
  );
  return created.createAgentDefinition.id;
}

const historyQuery = `query { listWorkspaceRunHistory(limitPerAgent:200) {
  workspaceRootPath workspaceName agentDefinitions { agentDefinitionId agentName runs {
    runId createdAt terminatedAt status isActive shouldConnectStream
  } }
} }`;

const agentDefinitionId = await ensureAgentDefinition();
const historyBefore = await gql(historyQuery);
const beforeIds = new Set(historyBefore.listWorkspaceRunHistory.flatMap((workspace) =>
  workspace.agentDefinitions.flatMap((agent) => agent.runs.map((run) => run.runId))));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 } });
const consoleEvents = [];
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    consoleEvents.push({ type: message.type(), text: message.text(), at: new Date().toISOString() });
  }
});

let runId = null;
let termination = null;
let result = null;
const startedAt = new Date().toISOString();

try {
  await page.goto(`${base}/agents?view=list`, { waitUntil: 'networkidle', timeout: 120000 });
  const card = page.locator('div.group').filter({ hasText: agentName }).first();
  await card.waitFor({ state: 'visible', timeout: 120000 });
  await card.getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForURL('**/workspace**', { timeout: 120000 });
  await page.locator('#agent-run-runtime-kind').selectOption(runtime);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Select a model', exact: true }).click();
  const search = page.getByPlaceholder('Search models...');
  await search.fill(model);
  const escapedModel = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await page.locator('li').filter({ hasText: new RegExp(escapedModel, 'i') }).first().click();
  if (runtime === 'codex_app_server') await page.locator('#agent-run-reasoning_effort').selectOption('medium');
  const autoApprove = page.locator('#auto-execute');
  if ((await autoApprove.getAttribute('class'))?.includes('bg-gray')) await autoApprove.click();
  const effective = {
    runtimeKind: await page.locator('#agent-run-runtime-kind').inputValue(),
    model,
    reasoningEffort: await page.locator('#agent-run-reasoning_effort').count()
      ? await page.locator('#agent-run-reasoning_effort').inputValue() : null,
    autoExecuteClass: await autoApprove.getAttribute('class'),
  };
  await page.screenshot({ path: `${outDir}/standalone-${slug}-config.png`, fullPage: true });
  await page.getByRole('button', { name: 'Run Agent', exact: true }).click();
  const input = page.getByPlaceholder('Type a message...');
  await input.waitFor({ state: 'visible', timeout: 180000 });
  // Current standalone launch intentionally promotes the immutable draft on
  // first send rather than when the empty conversation shell is opened.
  await input.fill(`Reply with exactly ${expectedToken} and nothing else.`);
  await input.press('Enter');

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const history = await gql(historyQuery);
    const fresh = history.listWorkspaceRunHistory
      .flatMap((workspace) => workspace.agentDefinitions)
      .filter((agent) => agent.agentDefinitionId === agentDefinitionId)
      .flatMap((agent) => agent.runs)
      .find((run) => !beforeIds.has(run.runId));
    if (fresh) { runId = fresh.runId; break; }
    await page.waitForTimeout(500);
  }
  if (!runId) throw new Error('FRESH_STANDALONE_RUN_NOT_DISCOVERED');
  await page.getByText(expectedToken, { exact: true }).last().waitFor({ state: 'visible', timeout: 240000 });
  const tokenCountBeforeRefresh = await page.getByText(expectedToken, { exact: true }).count();
  await page.screenshot({ path: `${outDir}/standalone-${slug}-completed.png`, fullPage: true });

  const resume = await gql(`query($id:String!){getAgentRunResumeConfig(runId:$id){runId isActive metadataConfig { runtimeKind llmModelIdentifier }}}`, { id: runId });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1500);
  const workspaceRow = page.locator('[data-test="workspace-row"]').first();
  await workspaceRow.waitFor({ state: 'visible', timeout: 120000 });
  if ((await workspaceRow.getAttribute('aria-expanded')) !== 'true') await workspaceRow.locator('button').first().click();
  const agentGroup = page.locator(`[data-test="workspace-agent-row"][data-agent-definition-id="${agentDefinitionId}"]`).first();
  await agentGroup.waitFor({ state: 'visible', timeout: 120000 });
  if ((await agentGroup.getAttribute('aria-expanded')) !== 'true') await agentGroup.click();
  // Current history rows expose exact identity through ordered run data, not a retired
  // per-run data-test selector. The newly launched active run is the first row.
  const runRow = agentGroup.locator('xpath=../../div[contains(@class,"ml-3")]/button').first();
  await runRow.waitFor({ state: 'visible', timeout: 120000 });
  await runRow.click();
  await page.getByText(expectedToken, { exact: true }).last().waitFor({ state: 'visible', timeout: 120000 });
  const tokenCountAfterRefresh = await page.getByText(expectedToken, { exact: true }).count();
  await page.screenshot({ path: `${outDir}/standalone-${slug}-restored.png`, fullPage: true });

  const conditions = {
    freshRun: Boolean(runId),
    effectiveRuntime: effective.runtimeKind === runtime,
    effectiveReasoning: runtime !== 'codex_app_server' || effective.reasoningEffort === 'medium',
    exactTokenBeforeRefresh: tokenCountBeforeRefresh >= 1,
    exactTokenAfterRefresh: tokenCountAfterRefresh >= 1,
    resumeRunMatches: resume.getAgentRunResumeConfig?.runId === runId,
    resumeActive: resume.getAgentRunResumeConfig?.isActive === true,
    resumeRuntimeMatches: resume.getAgentRunResumeConfig?.metadataConfig?.runtimeKind === runtime,
    resumeModelMatches: resume.getAgentRunResumeConfig?.metadataConfig?.llmModelIdentifier === model,
    noBrowserConsoleErrors: consoleEvents.filter((event) => event.type === 'error').length === 0,
  };
  result = { schemaVersion: 1, slug, runtime, model, agentDefinitionId, runId, expectedToken, startedAt,
    completedAt: new Date().toISOString(), passed: Object.values(conditions).every(Boolean), conditions,
    effective, resume: resume.getAgentRunResumeConfig, consoleEvents };
} catch (error) {
  result = { schemaVersion: 1, slug, runtime, model, agentDefinitionId, runId, expectedToken, startedAt,
    completedAt: new Date().toISOString(), passed: false,
    fatalError: error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error), consoleEvents };
  try { await page.screenshot({ path: `${outDir}/standalone-${slug}-failure.png`, fullPage: true }); } catch {}
} finally {
  if (runId) {
    try {
      termination = (await gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: runId })).terminateAgentRun;
    } catch (error) {
      termination = { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  }
  result = { ...result, termination };
  fs.writeFileSync(`${outDir}/standalone-${slug}.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ slug, runtime, model, passed: result.passed, runId, conditions: result.conditions,
    fatalError: result.fatalError ?? null, termination }, null, 2));
  await browser.close();
}

if (!result.passed || !termination?.success) process.exitCode = 2;
