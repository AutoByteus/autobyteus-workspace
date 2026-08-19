import fs from 'node:fs';
import { chromium } from '../../../../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const webBase = 'http://127.0.0.1:31233';
const serverBase = 'http://127.0.0.1:60233';
const gqlEndpoint = `${serverBase}/graphql`;
const evidenceRoot = new URL('./', import.meta.url).pathname;
const browserRoot = new URL('./browser/', import.meta.url).pathname;
const mobileStorageState = '/tmp/api33-mobile-storage.json';
fs.mkdirSync(browserRoot, { recursive: true });

async function gql(query, variables = {}) {
  const response = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(`GRAPHQL_FAILED:${response.status}:${JSON.stringify(payload.errors ?? payload)}`);
  }
  return payload.data;
}

const historyQuery = `query { listWorkspaceRunHistory(limitPerAgent:200) {
  workspaceRootPath teamDefinitions { teamDefinitionId runs {
    teamRunId createdAt isActive rootTeam members { memberAddress runtimeKind agentRunId status }
  } }
} }`;

function nestedRuns(history) {
  return history.listWorkspaceRunHistory
    .flatMap((workspace) => workspace.teamDefinitions)
    .filter((team) => team.teamDefinitionId === 'nested-classroom-test')
    .flatMap((team) => team.runs)
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

async function freshRun(beforeIds) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const runs = nestedRuns(await gql(historyQuery));
    const fresh = runs.filter((run) => !beforeIds.has(run.teamRunId)).at(-1);
    if (fresh) return fresh;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('FRESH_TEAM_RUN_NOT_DISCOVERED');
}

async function terminate(teamRunId) {
  return (await gql(
    `mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`,
    { id: teamRunId },
  )).terminateAgentTeamRun;
}

function allTrue(conditions) {
  return Object.values(conditions).every(Boolean);
}

async function configureDesktopDraft(page, runtime, model) {
  await page.goto(`${webBase}/agent-teams?view=team-list`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForURL('**/workspace**', { timeout: 120_000 });
  await page.locator('#team-run-runtime-kind').selectOption(runtime);
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Select a model', exact: true }).click();
  const search = page.getByPlaceholder('Search models...');
  await search.fill(model);
  const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await page.locator('li').filter({ hasText: new RegExp(escaped, 'i') }).first().click();
  if (runtime === 'codex_app_server') {
    await page.locator('#team-run-reasoning_effort').selectOption('medium');
  }
  const draft = await page.evaluate(() => {
    const pinia = window.useNuxtApp().$pinia;
    const store = pinia._s.get('teamRunConfig');
    return {
      draftId: store.selectedDraft?.draftId ?? null,
      runtimeKind: store.selectedDraft?.config.runtimeKind ?? null,
      model: store.selectedDraft?.config.llmModelIdentifier ?? null,
      workspaceId: store.selectedDraft?.config.workspaceId ?? null,
      focusedMemberAddress: store.selectedDraft?.focusedMemberAddress ?? null,
      frozenDraft: Object.isFrozen(store.selectedDraft),
      frozenConfig: Object.isFrozen(store.selectedDraft?.config),
    };
  });
  if (!draft.draftId || draft.runtimeKind !== runtime || draft.model !== model || !draft.workspaceId) {
    throw new Error(`DESKTOP_DRAFT_NOT_READY:${JSON.stringify(draft)}`);
  }
  return draft;
}

async function waitForExactToken(page, token, timeout = 300_000) {
  await page.getByText(token, { exact: true }).last().waitFor({ state: 'visible', timeout });
  return await page.getByText(token, { exact: true }).count();
}

async function waitForRawTraceToken(rootTeamRunId, token, timeout = 300_000) {
  const runRoot = `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/.tmp/api-rev-033-live-20260812-1/memory/agent_teams/${rootTeamRunId}`;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (fs.existsSync(runRoot)) {
      const stack = [runRoot];
      while (stack.length) {
        const candidate = stack.pop();
        for (const entry of fs.readdirSync(candidate, { withFileTypes: true })) {
          const child = `${candidate}/${entry.name}`;
          if (entry.isDirectory()) stack.push(child);
          else if (entry.name === 'raw_traces_active.jsonl') {
            const content = fs.readFileSync(child, 'utf8');
            const exactAssistant = content.split(/\r?\n/).filter(Boolean).some((line) => {
              try {
                const parsed = JSON.parse(line);
                return parsed.trace_type === 'assistant' && parsed.content === token;
              } catch { return false; }
            });
            if (exactAssistant) return { exactAssistant: true, rawTracePath: child };
          }
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`RAW_TRACE_TOKEN_NOT_OBSERVED:${rootTeamRunId}:${token}`);
}

async function openTeamRunFromHistory(page, rootTeamRunId) {
  await page.goto(`${webBase}/workspace`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(1000);
  const workspaceRow = page.locator('[data-test="workspace-row"]').first();
  await workspaceRow.waitFor({ state: 'visible', timeout: 120_000 });
  if ((await workspaceRow.getAttribute('aria-expanded')) !== 'true') {
    await workspaceRow.locator('button').first().click();
  }
  const definitionRow = page.locator('[data-test^="workspace-team-definition-row-"]')
    .filter({ hasText: 'Nested Classroom Test Team' }).first();
  await definitionRow.waitFor({ state: 'visible', timeout: 120_000 });
  if ((await definitionRow.getAttribute('aria-expanded')) !== 'true') await definitionRow.click();
  const runRow = page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`);
  await runRow.waitFor({ state: 'visible', timeout: 120_000 });
  await runRow.click();
}

async function runAutoByteusFirstSend(browser) {
  const context = await browser.newContext({ viewport: { width: 1800, height: 1200 } });
  const page = await context.newPage();
  const token = 'API33_AUTOBYTEUS_FIRST_SEND_OK';
  const beforeIds = new Set(nestedRuns(await gql(historyQuery)).map((run) => run.teamRunId));
  const consoleEvents = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 1000) });
    }
  });

  let allocationRequests = 0;
  let allocationMode = 'failure';
  let pendingResolve;
  let releaseResolve;
  const pendingCaptured = () => new Promise((resolve) => { pendingResolve = resolve; });
  let currentPending = pendingCaptured();
  let currentRelease = new Promise((resolve) => { releaseResolve = resolve; });
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    let body = null;
    try { body = request.postDataJSON(); } catch {}
    if (String(body?.query ?? '').includes('mutation CreateAgentTeamRun')) {
      allocationRequests += 1;
      if (allocationMode === 'failure') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { createAgentTeamRun: {
            success: false,
            message: 'API33_INJECTED_ALLOCATION_FAILURE',
            teamRunId: null,
          } } }),
        });
        return;
      }
      pendingResolve?.();
      await currentRelease;
    }
    await route.continue();
  });

  let rootTeamRunId = null;
  let termination = null;
  let result;
  try {
    const configured = await configureDesktopDraft(page, 'autobyteus', 'gpt-5.6-luna');
    const selectedForFirstSend = await page.evaluate(() => {
      const pinia = window.useNuxtApp().$pinia;
      const drafts = pinia._s.get('teamRunConfig');
      const selection = pinia._s.get('agentSelection');
      selection.setTeamDraftSelection(drafts.selectedDraft.draftId);
      return selection.subject;
    });
    await page.screenshot({ path: `${browserRoot}autobyteus-first-send-config.png`, fullPage: true });

    const failedFirstSend = await page.evaluate(async (value) => {
      const store = window.useNuxtApp().$pinia._s.get('agentTeamRun');
      try {
        await store.sendMessageToFocusedMember(`Reply with exactly ${value} and nothing else.`, []);
        return { rejected: false, message: null };
      } catch (error) {
        return { rejected: true, message: error instanceof Error ? error.message : String(error) };
      }
    }, token);
    const afterFailure = await page.evaluate(() => {
      const pinia = window.useNuxtApp().$pinia;
      const drafts = pinia._s.get('teamRunConfig');
      const selection = pinia._s.get('agentSelection');
      let editUnlocked = false;
      try {
        drafts.applyConfigEdit({ kind: 'set_auto_execute_tools', autoExecuteTools: true });
        editUnlocked = true;
      } catch {}
      return {
        draftId: drafts.selectedDraft?.draftId ?? null,
        pendingText: drafts.selectedDraft?.pendingInputsByMemberAddress?.['/Teacher']?.text ?? null,
        inFlight: drafts.hasInFlightLaunch,
        selection: selection.subject,
        editUnlocked,
      };
    });
    const afterFailureRuns = nestedRuns(await gql(historyQuery)).filter((run) => !beforeIds.has(run.teamRunId));

    allocationMode = 'pending-success';
    currentPending = pendingCaptured();
    currentRelease = new Promise((resolve) => { releaseResolve = resolve; });
    const sendPromise = page.evaluate(async (value) => {
      const store = window.useNuxtApp().$pinia._s.get('agentTeamRun');
      try {
        await store.sendMessageToFocusedMember(`Reply with exactly ${value} and nothing else.`, []);
        return { sent: true, error: null };
      } catch (error) {
        return { sent: false, error: error instanceof Error ? error.message : String(error) };
      }
    }, token);
    await Promise.race([
      currentPending,
      new Promise((_, reject) => setTimeout(() => reject(new Error('ALLOCATION_PENDING_NOT_CAPTURED')), 30_000)),
    ]);

    const pendingEvidence = await page.evaluate(async () => {
      const pinia = window.useNuxtApp().$pinia;
      const drafts = pinia._s.get('teamRunConfig');
      const selection = pinia._s.get('agentSelection');
      const runStore = pinia._s.get('agentTeamRun');
      const draft = drafts.selectedDraft;
      const attempt = (operation) => {
        try { operation(); return { rejected: false, message: null }; }
        catch (error) { return { rejected: true, message: error instanceof Error ? error.message : String(error) }; }
      };
      let duplicateLaunch;
      try {
        await runStore.launchDraft(draft);
        duplicateLaunch = { rejected: false, message: null };
      } catch (error) {
        duplicateLaunch = { rejected: true, message: error instanceof Error ? error.message : String(error) };
      }
      return {
          draftId: draft?.draftId ?? null,
          exactAdmitted: drafts.inFlightDrafts.get(draft?.draftId) === draft,
          runButtonDisabled: document.querySelector('button.run-btn')?.disabled === true,
          runtimeDisabled: document.querySelector('#team-run-runtime-kind')?.disabled === true,
          edit: attempt(() => drafts.applyConfigEdit({ kind: 'set_model', llmModelIdentifier: 'forbidden' })),
          focus: attempt(() => drafts.focusMember('/StudentStudyGroup/student_one')),
          input: attempt(() => drafts.setPendingInput('/Teacher', { text: 'forbidden', attachments: [] })),
          workspace: attempt(() => drafts.setWorkspaceLoading(true)),
          removal: attempt(() => drafts.removeDraft(draft.draftId)),
          clear: attempt(() => drafts.clearConfig()),
          selection: attempt(() => selection.setRunSelection('forbidden-run', 'agent')),
          duplicateLaunch,
        };
    });
    await page.screenshot({ path: `${browserRoot}autobyteus-first-send-pending.png`, fullPage: true });
    const allocationCountBeforeRelease = allocationRequests;
    releaseResolve();
    const sendOutcome = await sendPromise;
    if (!sendOutcome.sent) throw new Error(`FIRST_SEND_RETRY_FAILED:${sendOutcome.error}`);

    const run = await freshRun(beforeIds);
    rootTeamRunId = run.teamRunId;
    await page.evaluate(() => window.useNuxtApp().$pinia._s.get('workspaceCenterView').showChat());
    const input = page.getByPlaceholder('Type a message...');
    await input.waitFor({ state: 'visible', timeout: 120_000 });
    const rawProviderEvidence = await waitForRawTraceToken(rootTeamRunId, token);
    await page.screenshot({ path: `${browserRoot}autobyteus-first-send-complete.png`, fullPage: true });
    const afterSuccess = await page.evaluate(() => {
      const pinia = window.useNuxtApp().$pinia;
      const drafts = pinia._s.get('teamRunConfig');
      const selection = pinia._s.get('agentSelection');
      const contexts = pinia._s.get('agentTeamContexts');
      return {
        draftRemoved: drafts.selectedDraft === null && drafts.drafts.size === 0,
        inFlightReleased: !drafts.hasInFlightLaunch,
        selection: selection.subject,
        contextRootIds: [...contexts.teams.keys()],
      };
    });

    const conditions = {
      configuredExactFrozenDraft: configured.frozenDraft && configured.frozenConfig,
      failureRejectedExactly: failedFirstSend.rejected && failedFirstSend.message?.includes('API33_INJECTED_ALLOCATION_FAILURE'),
      failurePreservedSameDraft: afterFailure.draftId === configured.draftId,
      failurePreservedPendingInput: afterFailure.pendingText?.includes(token),
      failureReleasedAndUnlocked: afterFailure.inFlight === false && afterFailure.editUnlocked,
      failurePreservedDraftSelection: afterFailure.selection?.kind === 'team_draft' && afterFailure.selection.draftId === configured.draftId,
      failureAllocatedNoServerRun: afterFailureRuns.length === 0,
      pendingExactAdmission: pendingEvidence.exactAdmitted,
      pendingUiLocked: pendingEvidence.runButtonDisabled && pendingEvidence.runtimeDisabled,
      pendingEditsRejected: ['edit', 'focus', 'input', 'workspace', 'removal', 'clear', 'selection'].every((key) => pendingEvidence[key].rejected),
      duplicateRejected: pendingEvidence.duplicateLaunch.rejected,
      duplicateBeforeAllocation: allocationCountBeforeRelease === 2,
      oneRealCanonicalPromotion: allocationRequests === 2 && Boolean(rootTeamRunId),
      exactTeamSelection: afterSuccess.selection?.kind === 'team_run' && afterSuccess.selection.rootTeamRunId === rootTeamRunId,
      exactContextRegistered: afterSuccess.contextRootIds.includes(rootTeamRunId),
      draftRemovedAndUnlocked: afterSuccess.draftRemoved && afterSuccess.inFlightReleased,
      providerResponseExactInCurrentRawTrace: rawProviderEvidence.exactAssistant,
    };
    result = {
      scenario: 'autobyteus-first-send-failure-pending-success',
      runtime: 'autobyteus', model: 'gpt-5.6-luna', token,
      rootTeamRunId, allocationRequests, configured, selectedForFirstSend, failedFirstSend, afterFailure,
      rawProviderEvidence,
      pendingEvidence, afterSuccess, conditions, passed: allTrue(conditions), consoleEvents,
    };
  } catch (error) {
    result = {
      scenario: 'autobyteus-first-send-failure-pending-success',
      runtime: 'autobyteus', model: 'gpt-5.6-luna', token, rootTeamRunId,
      passed: false,
      fatalError: error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error),
      consoleEvents,
    };
    try { await page.screenshot({ path: `${browserRoot}autobyteus-first-send-failure.png`, fullPage: true }); } catch {}
  } finally {
    if (rootTeamRunId) {
      try { termination = await terminate(rootTeamRunId); } catch (error) { termination = { success: false, message: String(error) }; }
    }
    result = { ...result, termination };
    fs.writeFileSync(`${browserRoot}autobyteus-first-send.json`, `${JSON.stringify(result, null, 2)}\n`);
    await context.close();
  }
  if (!result.passed || !termination?.success) throw new Error(`AUTOBYTEUS_SCENARIO_FAILED:${JSON.stringify(result)}`);
  return result;
}

async function runCodexDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1800, height: 1200 } });
  const page = await context.newPage();
  const token = 'API33_CODEX_DESKTOP_OK';
  const beforeIds = new Set(nestedRuns(await gql(historyQuery)).map((run) => run.teamRunId));
  let rootTeamRunId = null;
  let termination = null;
  let result;
  try {
    const configured = await configureDesktopDraft(page, 'codex_app_server', 'gpt-5.6-luna');
    const reasoningEffort = await page.locator('#team-run-reasoning_effort').inputValue();
    let allocationRequests = 0;
    page.on('request', (request) => {
      if (request.url().endsWith('/graphql') && String(request.postData() ?? '').includes('mutation CreateAgentTeamRun')) {
        allocationRequests += 1;
      }
    });
    await page.getByRole('button', { name: 'Run Team', exact: true }).click();
    const input = page.getByPlaceholder('Type a message...');
    await input.waitFor({ state: 'visible', timeout: 180_000 });
    const run = await freshRun(beforeIds);
    rootTeamRunId = run.teamRunId;
    await input.fill(`Reply with exactly ${token} and nothing else.`);
    await input.press('Enter');
    const rawProviderEvidence = await waitForRawTraceToken(rootTeamRunId, token);
    await page.screenshot({ path: `${browserRoot}codex-desktop-complete.png`, fullPage: true });
    const exact = await page.evaluate(() => {
      const pinia = window.useNuxtApp().$pinia;
      const drafts = pinia._s.get('teamRunConfig');
      const selection = pinia._s.get('agentSelection');
      const context = pinia._s.get('agentTeamContexts').activeTeamContext;
      return {
        draftRemoved: drafts.selectedDraft === null,
        inFlightReleased: !drafts.hasInFlightLaunch,
        selection: selection.subject,
        rootTeamRunId: context?.executions.getRootTeamRunId() ?? null,
      };
    });
    const conditions = {
      configuredExactFrozenDraft: configured.frozenDraft && configured.frozenConfig,
      reasoningEffortMedium: reasoningEffort === 'medium',
      allocationExactlyOnce: allocationRequests === 1,
      canonicalSelection: exact.selection?.kind === 'team_run' && exact.selection.rootTeamRunId === rootTeamRunId,
      canonicalContext: exact.rootTeamRunId === rootTeamRunId,
      draftRemovedAndUnlocked: exact.draftRemoved && exact.inFlightReleased,
      providerResponseExactInCurrentRawTrace: rawProviderEvidence.exactAssistant,
    };
    result = { scenario: 'codex-desktop-run', runtime: 'codex_app_server', model: 'gpt-5.6-luna',
      token, rootTeamRunId, configured, reasoningEffort, allocationRequests, exact, rawProviderEvidence, conditions, passed: allTrue(conditions) };
  } catch (error) {
    result = { scenario: 'codex-desktop-run', runtime: 'codex_app_server', model: 'gpt-5.6-luna', token,
      rootTeamRunId, passed: false, fatalError: error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error) };
    try { await page.screenshot({ path: `${browserRoot}codex-desktop-failure.png`, fullPage: true }); } catch {}
  } finally {
    if (rootTeamRunId) {
      try { termination = await terminate(rootTeamRunId); } catch (error) { termination = { success: false, message: String(error) }; }
    }
    result = { ...result, termination };
    fs.writeFileSync(`${browserRoot}codex-desktop.json`, `${JSON.stringify(result, null, 2)}\n`);
    await context.close();
  }
  if (!result.passed || !termination?.success) throw new Error(`CODEX_SCENARIO_FAILED:${JSON.stringify(result)}`);
  return result;
}

async function runClaudeMobile(browser) {
  if (!fs.existsSync(mobileStorageState)) throw new Error('MOBILE_STORAGE_STATE_MISSING');
  const context = await browser.newContext({ viewport: { width: 430, height: 900 }, storageState: mobileStorageState });
  const page = await context.newPage();
  const token = 'API33_CLAUDE_MOBILE_OK';
  const beforeIds = new Set(nestedRuns(await gql(historyQuery)).map((run) => run.teamRunId));
  let rootTeamRunId = null;
  let termination = null;
  let result;
  try {
    await page.goto(`${webBase}/mobile`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.getByRole('button', { name: 'Switch work' }).click();
    await page.getByRole('button', { name: 'Teams', exact: true }).click();
    await page.locator('[data-testid="mobile-context-list"]')
      .locator('button').filter({ hasText: 'Nested Classroom Test Team' }).first().click();
    await page.locator('[data-testid="mobile-run-setup"]').waitFor({ state: 'visible', timeout: 120_000 });

    await page.locator('[data-testid="mobile-run-workspace-select-toggle"]').click();
    const workspaceOptions = page.locator('[data-testid="mobile-run-workspace-select-option"]');
    await workspaceOptions.filter({ hasText: 'Temp Workspace' }).first().click();
    await page.locator('#mobile-team-run-runtime-kind').selectOption('claude_agent_sdk');
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Select a model', exact: true }).click();
    await page.getByPlaceholder('Search models...').fill('sonnet');
    await page.locator('li').filter({ hasText: /sonnet/i }).first().click();

    const configured = await page.evaluate(() => {
      const draft = window.useNuxtApp().$pinia._s.get('teamRunConfig').selectedDraft;
      return {
        draftId: draft?.draftId ?? null,
        runtimeKind: draft?.config.runtimeKind ?? null,
        model: draft?.config.llmModelIdentifier ?? null,
        workspaceId: draft?.config.workspaceId ?? null,
        frozenDraft: Object.isFrozen(draft),
        frozenConfig: Object.isFrozen(draft?.config),
      };
    });
    await page.screenshot({ path: `${browserRoot}claude-mobile-config.png`, fullPage: true });
    let allocationRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/graphql') && String(request.postData() ?? '').includes('mutation CreateAgentTeamRun')) {
        allocationRequests += 1;
      }
    });
    await page.locator('[data-testid="mobile-run-launch"]').click();
    await page.locator('[data-testid="mobile-chat"]').waitFor({ state: 'visible', timeout: 180_000 });
    const input = page.getByPlaceholder('Type a message...');
    await input.waitFor({ state: 'visible', timeout: 180_000 });
    const run = await freshRun(beforeIds);
    rootTeamRunId = run.teamRunId;
    await input.fill(`Reply with exactly ${token} and nothing else.`);
    await input.press('Enter');
    const rawProviderEvidence = await waitForRawTraceToken(rootTeamRunId, token);
    await page.screenshot({ path: `${browserRoot}claude-mobile-complete.png`, fullPage: true });
    const exact = await page.evaluate(() => {
      const pinia = window.useNuxtApp().$pinia;
      const drafts = pinia._s.get('teamRunConfig');
      const selection = pinia._s.get('agentSelection');
      const mobile = pinia._s.get('mobileWork');
      return {
        draftRemoved: drafts.selectedDraft === null,
        inFlightReleased: !drafts.hasInFlightLaunch,
        selection: selection.subject,
        mobileContext: mobile.currentContext,
      };
    });
    const conditions = {
      configuredExactFrozenDraft: configured.frozenDraft && configured.frozenConfig,
      configuredClaude: configured.runtimeKind === 'claude_agent_sdk' && configured.model === 'sonnet' && Boolean(configured.workspaceId),
      allocationExactlyOnce: allocationRequests === 1,
      canonicalSelection: exact.selection?.kind === 'team_run' && exact.selection.rootTeamRunId === rootTeamRunId,
      canonicalMobileContext: exact.mobileContext?.kind === 'team-run' && exact.mobileContext.teamRunId === rootTeamRunId,
      draftRemovedAndUnlocked: exact.draftRemoved && exact.inFlightReleased,
      providerResponseExactInCurrentRawTrace: rawProviderEvidence.exactAssistant,
    };
    result = { scenario: 'claude-mobile-run', runtime: 'claude_agent_sdk', model: 'sonnet', token,
      rootTeamRunId, configured, allocationRequests, exact, rawProviderEvidence, conditions, passed: allTrue(conditions) };
  } catch (error) {
    result = { scenario: 'claude-mobile-run', runtime: 'claude_agent_sdk', model: 'sonnet', token,
      rootTeamRunId, passed: false, fatalError: error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error) };
    try { await page.screenshot({ path: `${browserRoot}claude-mobile-failure.png`, fullPage: true }); } catch {}
  } finally {
    if (rootTeamRunId) {
      try { termination = await terminate(rootTeamRunId); } catch (error) { termination = { success: false, message: String(error) }; }
    }
    result = { ...result, termination };
    fs.writeFileSync(`${browserRoot}claude-mobile.json`, `${JSON.stringify(result, null, 2)}\n`);
    await context.close();
  }
  if (!result.passed || !termination?.success) throw new Error(`CLAUDE_SCENARIO_FAILED:${JSON.stringify(result)}`);
  return result;
}

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--host-resolver-rules=MAP api33.local 127.0.0.1'],
});
const startedAt = new Date().toISOString();
const rows = [];
let fatalError = null;
try {
  const existingAuto = JSON.parse(fs.readFileSync(`${browserRoot}autobyteus-first-send.json`, 'utf8'));
  const existingCodex = JSON.parse(fs.readFileSync(`${browserRoot}codex-desktop.json`, 'utf8'));
  if (!existingAuto.passed || !existingAuto.termination?.success || !existingCodex.passed || !existingCodex.termination?.success) {
    throw new Error('PRIOR_GREEN_ROWS_NOT_AVAILABLE');
  }
  rows.push(existingAuto, existingCodex);
  rows.push(await runClaudeMobile(browser));
} catch (error) {
  fatalError = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
} finally {
  await browser.close();
}
const summary = {
  schemaVersion: 1,
  startedAt,
  completedAt: new Date().toISOString(),
  safeTarget: {
    serverBase,
    webBase,
    databasePath: '/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/db/api-rev-033-live-20260812-1.db',
    operationalDatabaseTargeted: false,
    protectedUserStackTouched: false,
  },
  rows,
  fatalError,
  passed: fatalError === null && rows.length === 3 && rows.every((row) => row.passed && row.termination?.success),
};
fs.writeFileSync(`${browserRoot}ir038-browser-matrix-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  passed: summary.passed,
  rows: rows.map((row) => ({ scenario: row.scenario, runtime: row.runtime, passed: row.passed, rootTeamRunId: row.rootTeamRunId })),
  fatalError,
}, null, 2)}\n`);
if (!summary.passed) process.exitCode = 2;
