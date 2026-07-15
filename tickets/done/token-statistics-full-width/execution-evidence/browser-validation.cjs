const { chromium } = require('../../../../autobyteus-web/node_modules/playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const BASE = 'http://127.0.0.1:3317';
const OUT = path.resolve(__dirname);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const results = [];
const consoleEvents = [];

function assert(condition, message, detail = undefined) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}
function record(id, result, evidence) {
  results.push({ id, result, evidence });
}
function statRequestCount(state) {
  return state.requests.filter(({ operationName }) => operationName === 'GetTokenUsageTaskStatisticsInPeriod' || operationName === 'GetUsageStatisticsInPeriod').length;
}

const aggregate = (overrides = {}) => ({
  __typename: 'TokenUsageCostSummaryAggregateGraphql',
  grossInputTokens: 1600,
  standardInputTokens: 1200,
  cacheMissInputTokens: 1200,
  cacheReadInputTokens: 400,
  cacheCreationInputTokens: 0,
  cacheCreation5mInputTokens: 0,
  cacheCreation1hInputTokens: 0,
  outputTokens: 180,
  reasoningOutputTokens: 50,
  billableOutputTokens: 180,
  totalTokens: 1780,
  cacheReadInputTokenRate: 0.25,
  standardInputTokenRate: 0.75,
  cacheCreationInputTokenRate: 0,
  cacheState: 'positive',
  estimatedApiInputCost: 1.6,
  estimatedApiStandardInputCost: 1.2,
  estimatedApiCacheReadInputCost: 0.4,
  estimatedApiCacheCreationInputCost: 0,
  estimatedApiCacheCreation5mInputCost: 0,
  estimatedApiCacheCreation1hInputCost: 0,
  estimatedApiOutputCost: 0.18,
  estimatedApiReasoningOutputCost: 0.05,
  estimatedApiTotalCost: 1.78,
  currency: 'USD',
  apiCostStatus: 'estimated',
  missingPriceDimensions: [],
  pricingPolicyKey: 'catalog:test:gpt-shared',
  selectedPricingTierId: null,
  usageReportCount: 2,
  updatedAt: '2026-07-15T08:05:00.000Z',
  observedRuntimeKinds: ['autobyteus', 'codex_app_server'],
  observedModelIdentifiers: ['gpt-shared'],
  observedModelProviders: ['OPENAI'],
  ...overrides,
});

function taskRow(index, children = []) {
  return {
    __typename: 'TokenUsageTaskStatisticsRowGraphql',
    rowId: `team:run-${index}`,
    rowKind: 'TEAM_RUN',
    runId: null,
    rootTeamRunId: `run-${index}`,
    memberRouteKey: null,
    memberAgentRunId: null,
    taskAgentRunId: null,
    taskTeamRunId: null,
    taskId: `task-${index}`,
    executionAddress: null,
    displayName: index === 0 ? 'Software Engineering Team' : `Representative Team Run ${String(index + 1).padStart(2, '0')}`,
    summary: index === 0 ? 'Validate Settings navigation and token statistics' : `Representative statistics row ${index + 1}`,
    createdAt: `2026-07-${String(15 - (index % 7)).padStart(2, '0')}T08:${String(index).padStart(2, '0')}:00.000Z`,
    createdTimeSource: 'RUN_HISTORY',
    models: ['gpt-shared'],
    runtimeKinds: ['codex_app_server'],
    aggregate: aggregate({ estimatedApiTotalCost: 1.78 + index / 100 }),
    children,
  };
}
const childRow = {
  __typename: 'TokenUsageTaskStatisticsRowGraphql',
  rowId: 'team:run-0:member:implementation-engineer',
  rowKind: 'MEMBER_RUN',
  runId: 'member-implementation-engineer',
  rootTeamRunId: 'run-0',
  memberRouteKey: 'implementation_engineer',
  memberAgentRunId: 'member-implementation-engineer',
  taskAgentRunId: null,
  taskTeamRunId: null,
  taskId: null,
  executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'implementation_engineer' }] },
  displayName: 'implementation_engineer',
  summary: null,
  createdAt: '2026-07-15T08:01:00.000Z',
  createdTimeSource: 'FIRST_USAGE_OBSERVED',
  models: ['gpt-shared'],
  runtimeKinds: ['codex_app_server'],
  aggregate: aggregate({ grossInputTokens: 400, outputTokens: 50, estimatedApiTotalCost: 0.4, usageReportCount: 1 }),
  children: [],
};
const taskRows = Array.from({ length: 20 }, (_, i) => taskRow(i, i === 0 ? [childRow] : []));
const modelRows = [{
  __typename: 'TokenUsageRuntimeModelStatisticsRowGraphql',
  runtimeKind: 'codex_app_server',
  llmModel: 'gpt-shared',
  inputTokens: 3000,
  cacheReadInputTokens: 400,
  cacheCreationInputTokens: 0,
  cacheReadInputTokenRate: 0.13,
  cacheState: 'positive',
  outputTokens: 300,
  thinkingTokens: 50,
  inputCost: 3,
  outputCost: 0.3,
  thinkingCost: 0.05,
  totalCost: 3.35,
  currency: 'USD',
  apiCostStatus: 'estimated',
  aggregate: aggregate({ grossInputTokens: 3000, outputTokens: 300, estimatedApiTotalCost: 3.35 }),
}];

async function createHarness(browser, viewport, initialPhase = 'loaded') {
  const context = await browser.newContext({ viewport, locale: 'en-US', timezoneId: 'Europe/Berlin' });
  const state = { phase: initialPhase, requests: [], releases: [] };
  await context.route('**/rest/health', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{\"status\":\"ok\"}' }));
  await context.route(/^https?:\/\/(?:localhost|127\.0\.0\.1):(?:8000|3317)\/graphql$/, async route => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': '*',
      }});
    }
    let body = {};
    try { body = req.postDataJSON() || {}; } catch {}
    const operationName = body.operationName || 'unknown';
    state.requests.push({ operationName, variables: body.variables, phase: state.phase, url: req.url() }); console.log('GRAPHQL_REQUEST', operationName, state.phase);
    const fulfill = payload => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(payload) });
    if (operationName === 'GetAvailableLLMProvidersWithModels') {
      return fulfill({ data: { availableLlmProvidersWithModels: [], availableAudioProvidersWithModels: [], availableImageProvidersWithModels: [], availableVideoProvidersWithModels: [] } });
    }
    if (operationName === 'GetGeminiSetupConfig') {
      return fulfill({ data: { getGeminiSetupConfig: { mode: 'ai_studio', geminiApiKeyConfigured: false, vertexApiKeyConfigured: false, vertexProject: null, vertexLocation: null } } });
    }
    if (state.phase === 'loading') {
      await new Promise(resolve => state.releases.push(resolve));
    }
    let payload;
    if (state.phase === 'error') {
      payload = { data: null, errors: [{ message: 'deterministic statistics error' }] };
    } else if (operationName === 'GetTokenUsageTaskStatisticsInPeriod') {
      payload = { data: { tokenUsageTaskStatisticsInPeriod: { rows: state.phase === 'empty' ? [] : taskRows } } };
    } else if (operationName === 'GetUsageStatisticsInPeriod') {
      payload = { data: { usageStatisticsInPeriod: state.phase === 'empty' ? [] : modelRows } };
    } else {
      payload = { data: {} };
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(payload),
    });
  });
  const page = await context.newPage();
  page.on('console', msg => {
    if (['error', 'warning'].includes(msg.type())) consoleEvents.push({ type: msg.type(), text: msg.text(), url: page.url() });
  });
  page.on('pageerror', error => consoleEvents.push({ type: 'pageerror', text: error.message, url: page.url() }));
  return { context, page, state };
}

async function gotoSettings(page, suffix = '') {
  await page.goto(`${BASE}/settings${suffix}`, { waitUntil: 'domcontentloaded' });
  try {
    await page.locator('[data-testid="settings-page-layout"]').waitFor({ state: 'attached', timeout: 10000 });
  } catch (error) {
    console.error('GOTO_DEBUG', JSON.stringify({ url: page.url(), body: (await page.locator('body').innerText()).slice(0, 3000), app: (await page.locator('#app').innerHTML()).slice(0, 3000) }));
    throw error;
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    // BROWSER-001, 002, 003: desktop geometry, focus, state, request and persistence.
    {
      const { context, page, state } = await createHarness(browser, { width: 1440, height: 900 });
      try {
        await gotoSettings(page, '?section=token-usage');
        try { await page.getByText('Software Engineering Team', { exact: true }).waitFor({ timeout: 10000 }); } catch (error) { console.error('DATA_DEBUG', JSON.stringify({ body: (await page.locator('body').innerText()).slice(0,5000), requests: state.requests })); throw error; }
        const metrics = await page.evaluate(() => {
          const nav = document.querySelector('[data-testid="settings-page-navigation"]');
          const content = document.querySelector('[data-testid="settings-page-content"]');
          const layout = document.querySelector('[data-testid="settings-page-layout"]');
          const header = document.querySelector('[data-testid="settings-collapsed-header"]');
          const wrapper = document.querySelector('.token-usage-statistics .overflow-x-auto');
          const table = wrapper?.querySelector('table');
          const svg = document.querySelector('[data-testid="settings-navigation-expand"] [data-testid="left-panel-toggle-icon"]');
          return {
            viewport: [innerWidth, innerHeight],
            navDisplay: nav ? getComputedStyle(nav).display : null,
            navRects: nav?.getClientRects().length,
            content: content?.getBoundingClientRect().toJSON(),
            layout: layout?.getBoundingClientRect().toJSON(),
            headerDisplay: header ? getComputedStyle(header).display : null,
            wrapperClientWidth: wrapper?.clientWidth,
            wrapperScrollWidth: wrapper?.scrollWidth,
            tableWidth: table?.getBoundingClientRect().width,
            headers: [...(table?.querySelectorAll('thead th') || [])].map(el => el.textContent.trim().replace(/\s+/g, ' ')),
            documentScrollWidth: document.documentElement.scrollWidth,
            svg: svg ? {
              width: svg.getAttribute('width'), height: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox'),
              rect: svg.querySelector('rect')?.outerHTML, path: svg.querySelector('path')?.getAttribute('d'),
              bbox: svg.getBoundingClientRect().toJSON(),
            } : null,
            focusedTestId: document.activeElement?.getAttribute('data-testid'),
          };
        });
        assert(metrics.navDisplay === 'none' && metrics.navRects === 0, 'Desktop Token Statistics navigation did not collapse to zero rendered width', metrics);
        assert(metrics.content.x === 0 && metrics.content.width === 1440 && metrics.layout.width === 1440, 'Collapsed desktop content did not occupy full layout width', metrics);
        assert(metrics.headerDisplay === 'flex', 'Collapsed header was not visible on desktop', metrics);
        assert(metrics.wrapperScrollWidth <= metrics.wrapperClientWidth, 'Task table has horizontal scrolling at 1440x900', metrics);
        assert(metrics.headers.at(-1).includes('Created Time'), 'Created Time is not the final visible task column', metrics);
        assert(metrics.documentScrollWidth === 1440, 'Document overflows desktop viewport', metrics);
        assert(metrics.svg?.width === '18' && metrics.svg?.height === '18' && metrics.svg?.viewBox === '0 0 24 24' && metrics.svg?.path === 'M9 3v18', 'Settings toggle does not render exact shared icon geometry', metrics.svg);
        assert(metrics.focusedTestId !== 'settings-navigation-expand', 'Direct Token route stole focus', metrics);
        await page.screenshot({ path: path.join(OUT, 'desktop-token-statistics-1440x900.png'), fullPage: true });
        record('BROWSER-001', 'Pass', metrics);

        const manager = page.locator('.token-usage-statistics');
        await manager.evaluate(el => { el.dataset.executionIdentity = 'manager-1'; });
        const table = page.locator('.token-usage-statistics table');
        await table.evaluate(el => { el.dataset.executionIdentity = 'table-1'; });
        const [startInput, endInput] = await Promise.all([
          page.locator('#token-usage-start-date'), page.locator('#token-usage-end-date'),
        ]);
        await startInput.fill('2026-07-01');
        await endInput.fill('2026-07-15');
        const teamExpand = page.getByRole('button', { name: 'Expand team' }).first();
        await teamExpand.click();
        await page.getByText('↳ implementation_engineer', { exact: false }).waitFor();
        const detail = page.getByRole('button', { name: /Show cost details for Software Engineering Team/ });
        await detail.click();
        await page.getByText('Cost breakdown', { exact: true }).first().waitFor();
        const taskSort = page.getByRole('button', { name: /Sort Task \/ Run/ });
        await taskSort.click();
        const scrollContainer = page.locator('.token-usage-statistics > .flex-1');
        await scrollContainer.evaluate(el => { el.scrollTop = 220; });
        const before = await page.evaluate(() => ({
          requests: undefined,
          localStorage: JSON.stringify({ ...localStorage }),
          sessionStorage: JSON.stringify({ ...sessionStorage }),
          active: document.activeElement?.getAttribute('data-testid'),
          managerIdentity: document.querySelector('.token-usage-statistics')?.dataset.executionIdentity,
          tableIdentity: document.querySelector('.token-usage-statistics table')?.dataset.executionIdentity,
          start: document.querySelector('#token-usage-start-date')?.value,
          end: document.querySelector('#token-usage-end-date')?.value,
          grouping: document.querySelector('#token-usage-grouping')?.value,
          scrollTop: document.querySelector('.token-usage-statistics > .flex-1')?.scrollTop,
          taskSort: document.querySelector('thead th')?.getAttribute('aria-sort'),
          expandedChild: document.body.innerText.includes('implementation_engineer'),
          detailOpen: !!document.querySelector('tbody tr[id^="token-usage-cost-details"]'),
        }));
        before.requests = statRequestCount(state);

        const expandButton = page.locator('[data-testid="settings-navigation-expand"]');
        assert(await expandButton.getAttribute('aria-expanded') === 'false', 'Collapsed toggle aria-expanded is not false');
        assert(await expandButton.getAttribute('aria-controls') === 'settings-navigation-region', 'Collapsed toggle controls incorrect region');
        await expandButton.click();
        await page.locator('[data-testid="settings-navigation-collapse"]').waitFor({ state: 'visible' });
        assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'settings-navigation-collapse', 'Reopen did not move focus to visible sidebar toggle');
        const openMetrics = await page.evaluate(() => {
          const nav = document.querySelector('[data-testid="settings-page-navigation"]');
          const close = document.querySelector('[data-testid="settings-navigation-collapse"]');
          const n = nav.getBoundingClientRect(); const c = close.getBoundingClientRect();
          return { nav: n.toJSON(), close: c.toJSON(), display: getComputedStyle(nav).display, closeAria: close.getAttribute('aria-expanded'), controls: close.getAttribute('aria-controls'), headerExists: !!document.querySelector('[data-testid="settings-collapsed-header"]') };
        });
        assert(openMetrics.nav.width === 256 && openMetrics.display !== 'none', 'Reopened sidebar is not persistent 16rem layout width', openMetrics);
        assert(openMetrics.close.x + openMetrics.close.width <= openMetrics.nav.x + openMetrics.nav.width && openMetrics.close.x > openMetrics.nav.x + openMetrics.nav.width / 2, 'Open toggle is not right aligned inside sidebar Back row', openMetrics);
        assert(openMetrics.closeAria === 'true' && openMetrics.controls === 'settings-navigation-region' && !openMetrics.headerExists, 'Open toggle/header ARIA state incorrect', openMetrics);
        await page.locator('[data-testid="settings-navigation-collapse"]').click();
        await expandButton.waitFor({ state: 'visible' });
        assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'settings-navigation-expand', 'Collapse did not move focus to visible header toggle');

        const after = await page.evaluate(() => ({
          localStorage: JSON.stringify({ ...localStorage }),
          sessionStorage: JSON.stringify({ ...sessionStorage }),
          managerIdentity: document.querySelector('.token-usage-statistics')?.dataset.executionIdentity,
          tableIdentity: document.querySelector('.token-usage-statistics table')?.dataset.executionIdentity,
          start: document.querySelector('#token-usage-start-date')?.value,
          end: document.querySelector('#token-usage-end-date')?.value,
          grouping: document.querySelector('#token-usage-grouping')?.value,
          scrollTop: document.querySelector('.token-usage-statistics > .flex-1')?.scrollTop,
          taskSort: document.querySelector('thead th')?.getAttribute('aria-sort'),
          expandedChild: document.body.innerText.includes('implementation_engineer'),
          detailOpen: !!document.querySelector('tbody tr[id^="token-usage-cost-details"]'),
        }));
        after.requests = statRequestCount(state);
        for (const key of ['localStorage','sessionStorage','managerIdentity','tableIdentity','start','end','grouping','scrollTop','taskSort','expandedChild','detailOpen','requests']) {
          assert(after[key] === before[key], `Toggle changed preserved state: ${key}`, { before, after });
        }
        await page.selectOption('#token-usage-grouping', 'model');
        await page.getByText('gpt-shared', { exact: true }).first().waitFor();
        assert(statRequestCount(state) === before.requests, 'Grouping switch/reflected loaded model value unexpectedly refetched', state.requests);
        record('BROWSER-002', 'Pass', { openMetrics, focusAfterCollapse: await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) });
        record('BROWSER-003', 'Pass', { before, after, requestOperations: state.requests });

        // Viewport changes must not invoke programmatic focus transfer.
        const focusBeforeResize = await page.evaluate(() => ({ testId: document.activeElement?.getAttribute('data-testid') ?? null, tag: document.activeElement?.tagName ?? null }));
        await page.setViewportSize({ width: 390, height: 844 });
        const focusAfterResize = await page.evaluate(() => ({ testId: document.activeElement?.getAttribute('data-testid') ?? null, tag: document.activeElement?.tagName ?? null }));
        if (focusAfterResize.testId === focusBeforeResize.testId) {
          record('BROWSER-002-RESIZE', 'Pass', { focusBeforeResize, focusAfterResize });
        } else {
          record('BROWSER-002-RESIZE', 'Fail', { expected: focusBeforeResize, actual: focusAfterResize, note: 'Chrome cleared focus when the desktop-only collapsed-header toggle became display:none at narrow width.' });
        }
      } finally { await context.close(); }
    }

    // BROWSER-004: loading/error/empty states remain toggleable without toggle requests.
    for (const phase of ['loading', 'error', 'empty']) {
      const { context, page, state } = await createHarness(browser, { width: 1440, height: 900 }, phase);
      try {
        await gotoSettings(page, '?section=token-usage');
        if (phase === 'loading') {
          await page.getByText('Loading token usage statistics…', { exact: true }).waitFor();
        } else if (phase === 'error') {
          await page.getByText('deterministic statistics error', { exact: false }).first().waitFor();
        } else {
          await page.getByText('No agent or team usage found for this date range.', { exact: true }).waitFor();
        }
        const requestCount = statRequestCount(state);
        await page.locator('[data-testid="settings-navigation-expand"]').click();
        await page.locator('[data-testid="settings-navigation-collapse"]').click();
        assert(statRequestCount(state) === requestCount, `${phase} state toggle caused GraphQL request`, state.requests);
        if (phase === 'loading') {
          assert(requestCount === 2, 'Loading phase did not hold both statistics requests', state.requests);
          state.phase = 'loaded'; state.releases.splice(0).forEach(release => release());
          await page.getByText('Software Engineering Team', { exact: true }).waitFor();
        } else if (phase === 'empty') {
          await page.selectOption('#token-usage-grouping', 'model');
          await page.getByText('No runtime/model usage found for this date range.', { exact: true }).waitFor();
        }
        await page.screenshot({ path: path.join(OUT, `desktop-${phase}-state.png`), fullPage: true });
        record(`BROWSER-004-${phase}`, 'Pass', { requestCount, requestsAfterToggle: statRequestCount(state) });
      } finally {
        state.releases.splice(0).forEach(release => release());
        await context.close();
      }
    }

    // BROWSER-005: narrow selection retains stacked navigation and focus/containment.
    {
      const { context, page, state } = await createHarness(browser, { width: 390, height: 844 });
      try {
        await gotoSettings(page);
        const tokenButton = page.locator('[data-testid="settings-nav-token-usage"]');
        await tokenButton.focus();
        await tokenButton.click();
        await page.getByText('Software Engineering Team', { exact: true }).waitFor();
        const narrow = await page.evaluate(() => {
          const nav = document.querySelector('[data-testid="settings-page-navigation"]');
          const header = document.querySelector('[data-testid="settings-collapsed-header"]');
          const close = document.querySelector('[data-testid="settings-navigation-collapse"]');
          const content = document.querySelector('[data-testid="settings-page-content"]');
          const wrapper = document.querySelector('.token-usage-statistics .overflow-x-auto');
          return {
            viewport: [innerWidth, innerHeight],
            navDisplay: getComputedStyle(nav).display,
            navBox: nav.getBoundingClientRect().toJSON(),
            headerDisplay: header ? getComputedStyle(header).display : null,
            closeDisplay: close ? getComputedStyle(close).display : null,
            activeTestId: document.activeElement?.getAttribute('data-testid'),
            contentBox: content.getBoundingClientRect().toJSON(),
            documentScrollWidth: document.documentElement.scrollWidth,
            wrapperClientWidth: wrapper.clientWidth,
            wrapperScrollWidth: wrapper.scrollWidth,
            visiblePanelIcons: [...document.querySelectorAll('[data-testid="left-panel-toggle-icon"]')].filter(el => el.getClientRects().length).length,
          };
        });
        assert(narrow.navDisplay !== 'none' && narrow.navBox.width === 390, 'Narrow navigation is not stacked full width', narrow);
        assert(narrow.headerDisplay === 'none' && (narrow.closeDisplay === null || narrow.closeDisplay === 'none'), 'Desktop-only toggle/header visible at narrow width', narrow);
        assert(narrow.activeTestId === 'settings-nav-token-usage', 'Narrow Token selection did not retain focus on visible navigation item', narrow);
        assert(narrow.contentBox.width === 390 && narrow.documentScrollWidth === 390, 'Narrow page/content escapes viewport containment', narrow);
        assert(narrow.wrapperScrollWidth > narrow.wrapperClientWidth, 'Representative narrow table should contain overflow in its own scroller', narrow);
        assert(narrow.visiblePanelIcons === 0, 'A visible compact icon rail/toggle exists at narrow width', narrow);
        assert(statRequestCount(state) === 2, 'Narrow Token selection request count unexpected', state.requests);
        await page.screenshot({ path: path.join(OUT, 'narrow-token-statistics-390x844.png'), fullPage: true });
        record('BROWSER-005', 'Pass', narrow);
      } finally { await context.close(); }
    }

    // BROWSER-006: route normalization and Server Settings modes.
    {
      const { context, page } = await createHarness(browser, { width: 1440, height: 900 });
      try {
        const cases = [
          ['?section=about', 'settings-nav-updates', null],
          ['?section=server-status', 'settings-nav-server-settings', 'settings-nav-server-settings-advanced'],
          ['?section=invalid-section', 'settings-nav-api-keys', null],
          ['?section=server-settings', 'settings-nav-server-settings', 'settings-nav-server-settings-quick'],
          ['?section=server-settings&mode=advanced', 'settings-nav-server-settings', 'settings-nav-server-settings-advanced'],
          ['?section=server-settings&mode=migrations', 'settings-nav-server-settings', 'settings-nav-server-settings-migrations'],
        ];
        const evidence = [];
        for (const [query, active, submode] of cases) {
          await gotoSettings(page, query);
          await page.locator(`[data-testid="${active}"]`).waitFor();
          const row = {
            query,
            activeCurrent: await page.locator(`[data-testid="${active}"]`).getAttribute('aria-current'),
            submodeCurrent: submode ? await page.locator(`[data-testid="${submode}"]`).getAttribute('aria-current') : null,
            navDisplay: await page.locator('[data-testid="settings-page-navigation"]').evaluate(el => getComputedStyle(el).display),
          };
          assert(row.activeCurrent === 'page', `Route ${query} did not activate expected section`, row);
          if (submode) assert(row.submodeCurrent === 'page', `Route ${query} did not activate expected Server Settings mode`, row);
          assert(row.navDisplay !== 'none', `Non-statistics route ${query} collapsed navigation`, row);
          evidence.push(row);
        }
        record('BROWSER-006', 'Pass', evidence);
      } finally { await context.close(); }
    }

    // BROWSER-007: Back route; Agents icon comparison if workspace shell mounts.
    {
      const { context, page } = await createHarness(browser, { width: 1440, height: 900 });
      try {
        await gotoSettings(page);
        const settingsIcon = await page.locator('[data-testid="settings-navigation-collapse"] [data-testid="left-panel-toggle-icon"]').evaluate(el => ({
          outerHTML: el.outerHTML, box: el.getBoundingClientRect().toJSON(), buttonBox: el.parentElement.getBoundingClientRect().toJSON(),
        }));
        await page.locator('[data-testid="settings-nav-back"]').click();
        await page.waitForURL(url => url.pathname === '/workspace', { timeout: 15000 });
        let agentsIcon = null;
        const agentsToggle = page.locator('button[title="Collapse left panel"]');
        if (await agentsToggle.count()) {
          agentsIcon = await agentsToggle.locator('[data-testid="left-panel-toggle-icon"]').evaluate(el => ({
            outerHTML: el.outerHTML, box: el.getBoundingClientRect().toJSON(), buttonBox: el.parentElement.getBoundingClientRect().toJSON(),
          }));
          assert(agentsIcon.outerHTML === settingsIcon.outerHTML, 'Agents and Settings toggles do not use identical SVG markup', { settingsIcon, agentsIcon });
          assert(agentsIcon.box.width === settingsIcon.box.width && agentsIcon.box.height === settingsIcon.box.height, 'Agents and Settings SVG rendered geometry differs', { settingsIcon, agentsIcon });
        }
        record('BROWSER-007', 'Pass', { url: page.url(), settingsIcon, agentsIcon, sharedSourceLiveComparison: !!agentsIcon });
      } finally { await context.close(); }
    }
  } finally {
    await browser.close();
  }
}

main().then(() => {
  const failed = results.filter(({ result }) => result === 'Fail');
  const output = { result: failed.length ? 'Fail' : 'Pass', generatedAt: new Date().toISOString(), results, consoleEvents };
  fs.writeFileSync(path.join(OUT, 'browser-validation-results.json'), JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
  if (failed.length) process.exitCode = 1;
}).catch(error => {
  const output = { result: 'Fail', generatedAt: new Date().toISOString(), error: error.message, detail: error.detail, stack: error.stack, results, consoleEvents };
  fs.writeFileSync(path.join(OUT, 'browser-validation-results.json'), JSON.stringify(output, null, 2));
  console.error(JSON.stringify(output, null, 2));
  process.exitCode = 1;
});
