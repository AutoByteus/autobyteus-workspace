const { chromium } = require('../../../../../autobyteus-web/node_modules/playwright-core');
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
  await page.locator('[data-testid="settings-page-layout"]').waitFor({ state: 'attached', timeout: 15000 });
}
const box = async (locator) => locator.evaluate(el => el.getBoundingClientRect().toJSON());
const active = async page => page.evaluate(() => ({
  tag: document.activeElement?.tagName || null,
  testId: document.activeElement?.getAttribute('data-testid') || null,
  text: document.activeElement?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) || null,
  inNavigation: !!document.querySelector('[data-testid="settings-page-navigation"]')?.contains(document.activeElement),
}));
const geometry = async page => page.evaluate(() => {
  const q = s => document.querySelector(s);
  const rect = s => q(s)?.getBoundingClientRect().toJSON() || null;
  const tableWrapper = q('.token-usage-statistics .overflow-x-auto');
  const table = tableWrapper?.querySelector('table');
  return {
    viewport: [innerWidth, innerHeight],
    layout: rect('[data-testid="settings-page-layout"]'),
    navigation: rect('[data-testid="settings-page-navigation"]'),
    anchor: rect('[data-testid="settings-navigation-separator-anchor"]'),
    line: rect('[data-testid="settings-navigation-separator-line"]'),
    target: rect('[data-testid="settings-navigation-resize-handle"]'),
    content: rect('[data-testid="settings-page-content"]'),
    manager: rect('.token-usage-statistics'),
    navigationDisplay: q('[data-testid="settings-page-navigation"]') ? getComputedStyle(q('[data-testid="settings-page-navigation"]')).display : null,
    anchorDisplay: q('[data-testid="settings-navigation-separator-anchor"]') ? getComputedStyle(q('[data-testid="settings-navigation-separator-anchor"]')).display : null,
    inert: q('[data-testid="settings-page-navigation"]')?.inert,
    ariaHidden: q('[data-testid="settings-page-navigation"]')?.getAttribute('aria-hidden'),
    ariaNow: q('[data-testid="settings-navigation-resize-handle"]')?.getAttribute('aria-valuenow'),
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    wrapperClientWidth: tableWrapper?.clientWidth,
    wrapperScrollWidth: tableWrapper?.scrollWidth,
    headers: [...(table?.querySelectorAll('thead th') || [])].map(el => el.textContent.trim().replace(/\s+/g, ' ')),
  };
});
function near(actual, expected, epsilon = 0.6) { return Math.abs(actual - expected) <= epsilon; }
function assertGeometry(g, width) {
  assert(near(g.navigation.width, width), `navigation width ${g.navigation.width} != ${width}`, g);
  assert(near(g.navigation.right, width) && near(g.anchor.x, width) && near(g.content.x, width), 'shared boundary mismatch', g);
  assert(near(g.anchor.width, 0), 'anchor consumes layout width', g);
  if (width === 0) {
    assert(near(g.line.x, 0) && near(g.line.width, 1), 'zero line geometry wrong', g);
    assert(near(g.target.x, 0) && near(g.target.width, 8), 'zero target geometry wrong', g);
  } else {
    assert(near(g.line.x, width - 1) && near(g.line.right, width), 'line geometry wrong', g);
    assert(near(g.target.x, Math.max(0, width - 4)) && near(g.target.width, 8), 'target geometry wrong', g);
  }
  assert(g.documentClientWidth === g.documentScrollWidth, 'document horizontal overflow', g);
}
async function axNames(context, page) {
  const session = await context.newCDPSession(page);
  try {
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    return nodes.filter(n => !n.ignored).map(n => ({ role: n.role?.value, name: n.name?.value || '' }));
  } finally { await session.detach(); }
}
async function syntheticStart(page, id = 77) {
  await page.evaluate(pointerId => {
    const handle = document.querySelector('[data-testid="settings-navigation-resize-handle"]');
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true, pointerType: 'mouse', button: 0, pointerId, clientX: handle.getBoundingClientRect().x + 4 }));
  }, id);
}
async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    // Geometry, pointer, keyboard, accessibility, manager-state, session/remount.
    {
      const { context, page, state } = await createHarness(browser, { width: 1440, height: 900 });
      try {
        await gotoSettings(page, '?section=token-usage');
        await page.getByText('Software Engineering Team', { exact: true }).waitFor({ timeout: 15000 });
        const fresh = await geometry(page);
        assertGeometry(fresh, 256);
        assert(near(fresh.layout.y, 0) && near(fresh.navigation.y, 0) && near(fresh.content.y, 0), 'fresh shell vertical placement changed', fresh);
        assert(fresh.navigationDisplay !== 'none' && fresh.ariaHidden === null && fresh.inert === false, 'fresh navigation unavailable', fresh);
        assert(fresh.ariaNow === '256', 'fresh ARIA width wrong', fresh);
        assert(fresh.headers.at(-1)?.includes('Created Time'), 'Created Time is not last table column', fresh);
        await page.screenshot({ path: path.join(OUT, 'desktop-fresh-1440x900.png'), fullPage: true });
        record('BROWSER-R2-001', 'Pass', fresh);

        const handle = page.locator('[data-testid="settings-navigation-resize-handle"]');
        let hb = await box(handle);
        await page.mouse.move(hb.x + 4, hb.y + 300);
        await page.mouse.down();
        await page.mouse.move(128, hb.y + 300, { steps: 8 });
        await page.mouse.up();
        const partial = await geometry(page); assertGeometry(partial, 128);

        hb = await box(handle);
        await page.mouse.move(hb.x + 4, hb.y + 300); await page.mouse.down();
        await page.mouse.move(-100, hb.y + 300, { steps: 8 }); await page.mouse.up();
        const zero = await geometry(page); assertGeometry(zero, 0);
        assert(zero.inert === true && zero.ariaHidden === 'true', 'zero nav not natively hidden', zero);
        const hit = await page.evaluate(() => {
          const el = document.elementFromPoint(4, Math.floor(innerHeight / 2));
          return { testId: el?.getAttribute('data-testid'), className: el?.className };
        });
        assert(hit.testId === 'settings-navigation-resize-handle', 'zero separator is not topmost/hit-testable at x=4', hit);
        assert(zero.wrapperScrollWidth <= zero.wrapperClientWidth, 'Created Time table still horizontally scrolls at zero navigation width', zero);
        await page.mouse.move(4, 300); await page.mouse.down(); await page.mouse.move(400, 300, { steps: 8 }); await page.mouse.up();
        const restored = await geometry(page); assertGeometry(restored, 256);
        record('BROWSER-R2-002', 'Pass', { partial, zero, hit, restored });

        // Exact body-style cleanup for pointerup, cancel, window loss and unmount.
        const cleanup = {};
        for (const mode of ['pointerup', 'pointercancel', 'blur']) {
          await page.evaluate(() => { document.body.style.cursor = 'crosshair'; document.body.style.userSelect = 'text'; });
          await syntheticStart(page, 77);
          const during = await page.evaluate(() => ({ cursor: document.body.style.cursor, userSelect: document.body.style.userSelect }));
          assert(during.cursor === 'col-resize' && during.userSelect === 'none', `${mode} did not enter drag body styles`, during);
          await page.evaluate(mode => {
            if (mode === 'blur') window.dispatchEvent(new Event('blur'));
            else window.dispatchEvent(new PointerEvent(mode, { bubbles: true, isPrimary: true, pointerType: 'mouse', pointerId: 77 }));
          }, mode);
          const after = await page.evaluate(() => ({ cursor: document.body.style.cursor, userSelect: document.body.style.userSelect }));
          assert(after.cursor === 'crosshair' && after.userSelect === 'text', `${mode} did not restore exact styles`, after);
          cleanup[mode] = { during, after };
        }
        await page.evaluate(() => { document.body.style.cursor = 'wait'; document.body.style.userSelect = 'all'; });
        await syntheticStart(page, 88);
        await page.evaluate(() => document.querySelector('[data-testid="settings-nav-back"]').click());
        await page.waitForURL(url => url.pathname === '/workspace', { timeout: 15000 });
        await page.locator('[data-testid="settings-page-layout"]').waitFor({ state: 'detached', timeout: 15000 });
        cleanup.unmount = await page.evaluate(() => ({ cursor: document.body.style.cursor, userSelect: document.body.style.userSelect }));
        assert(cleanup.unmount.cursor === 'wait' && cleanup.unmount.userSelect === 'all', 'unmount did not restore exact body styles', cleanup.unmount);
        record('BROWSER-R2-003', 'Pass', cleanup);

        // Return to fresh Token for keyboard/AX/Tab and state preservation.
        await gotoSettings(page, '?section=token-usage');
        await page.getByText('Software Engineering Team', { exact: true }).waitFor();
        await handle.focus(); await page.keyboard.press('ArrowLeft');
        assert((await geometry(page)).ariaNow === '240', 'ArrowLeft step wrong');
        await page.keyboard.press('ArrowRight'); assert((await geometry(page)).ariaNow === '256', 'ArrowRight step wrong');
        await page.keyboard.press('Home');
        const zeroK = await geometry(page); assertGeometry(zeroK, 0);
        const focusedStyle = await handle.evaluate(el => ({ outlineStyle: getComputedStyle(el).outlineStyle, outlineWidth: getComputedStyle(el).outlineWidth }));
        const axZero = await axNames(context, page);
        assert(axZero.some(n => n.role === 'separator' && /Resize Settings menu/i.test(n.name)), 'separator missing from AX tree', axZero);
        assert(!axZero.some(n => /Back to Workspace/i.test(n.name)), 'zero navigation Back remains in AX tree', axZero);
        await page.keyboard.press('Tab');
        const tabAtZero = await active(page);
        assert(!tabAtZero.inNavigation && tabAtZero.tag !== 'BODY', 'Tab entered inert nav or fell to body', tabAtZero);
        await handle.focus(); await page.keyboard.press('ArrowRight');
        const nonzero = await geometry(page); assertGeometry(nonzero, 16);
        const axNonzero = await axNames(context, page);
        assert(axNonzero.some(n => /Back to Workspace/i.test(n.name)), 'nonzero navigation not restored to AX tree', axNonzero);
        await page.locator('[data-testid="settings-nav-back"]').focus();
        assert((await active(page)).inNavigation, 'nonzero nav control cannot receive focus');
        await handle.focus(); await page.keyboard.press('End'); assertGeometry(await geometry(page), 256);
        record('BROWSER-R2-004', 'Pass', { focusedStyle, axZeroRelevant: axZero.filter(n => n.role === 'separator' || /Back to Workspace/i.test(n.name)), tabAtZero, axNonzeroBack: axNonzero.filter(n => /Back to Workspace/i.test(n.name)) });

        const manager = page.locator('.token-usage-statistics');
        await manager.evaluate(el => { el.dataset.executionIdentity = 'manager-r2'; });
        const table = page.locator('.token-usage-statistics table');
        await table.evaluate(el => { el.dataset.executionIdentity = 'table-r2'; });
        await page.locator('#token-usage-start-date').fill('2026-07-01');
        await page.locator('#token-usage-end-date').fill('2026-07-15');
        await page.getByRole('button', { name: 'Expand team' }).first().click();
        await page.getByText('implementation_engineer', { exact: false }).waitFor();
        await page.getByRole('button', { name: /Show cost details for Software Engineering Team/ }).click();
        await page.getByText('Cost breakdown', { exact: true }).first().waitFor();
        await page.getByRole('button', { name: /Sort Task \/ Run/ }).click();
        await page.locator('.token-usage-statistics > .flex-1').evaluate(el => { el.scrollTop = 220; });
        const preserved = async () => ({
          ...(await page.evaluate(() => ({
            manager: document.querySelector('.token-usage-statistics')?.dataset.executionIdentity,
            table: document.querySelector('.token-usage-statistics table')?.dataset.executionIdentity,
            start: document.querySelector('#token-usage-start-date')?.value,
            end: document.querySelector('#token-usage-end-date')?.value,
            grouping: document.querySelector('#token-usage-grouping')?.value,
            scrollTop: document.querySelector('.token-usage-statistics > .flex-1')?.scrollTop,
            sort: document.querySelector('thead th')?.getAttribute('aria-sort'),
            child: document.body.innerText.includes('implementation_engineer'),
            detail: !!document.querySelector('tbody tr[id^="token-usage-cost-details"]'),
            localStorage: JSON.stringify({ ...localStorage }), sessionStorage: JSON.stringify({ ...sessionStorage }),
          }))), requests: statRequestCount(state)
        });
        const before = await preserved();
        await handle.focus(); await page.keyboard.press('Home'); await page.keyboard.press('End');
        const after = await preserved();
        for (const key of Object.keys(before)) assert(JSON.stringify(after[key]) === JSON.stringify(before[key]), `resize changed manager state ${key}`, { before, after });
        record('BROWSER-R2-007', 'Pass', { before, after, requests: state.requests });

        await handle.focus(); await page.keyboard.press('ArrowLeft');
        const sessionWidth = (await geometry(page)).ariaNow;
        await page.getByRole('button', { name: 'Display' }).click();
        assert((await geometry(page)).ariaNow === sessionWidth, 'section change reset width');
        await page.getByRole('button', { name: /Token Statistics/i }).click();
        assert((await geometry(page)).ariaNow === sessionWidth, 'Token selection changed width');
        await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-testid="settings-page-layout"]').waitFor();
        assert((await geometry(page)).ariaNow === '256', 'remount did not reset width');
        record('BROWSER-R2-006', 'Pass', { sessionWidth, remountWidth: (await geometry(page)).ariaNow });
      } finally { await context.close(); }
    }

    // Breakpoint/native narrow behavior and both exact focus directions.
    {
      const { context, page } = await createHarness(browser, { width: 1440, height: 900 });
      try {
        await gotoSettings(page);
        const handle = page.locator('[data-testid="settings-navigation-resize-handle"]');
        await handle.focus(); await page.keyboard.press('Home');
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(100);
        const narrowFromSeparator = { geometry: await geometry(page), focus: await active(page), ax: await axNames(context, page) };
        assert(narrowFromSeparator.geometry.navigation.width === 390 && narrowFromSeparator.geometry.anchorDisplay === 'none', 'narrow original stack/separator visibility wrong', narrowFromSeparator);
        assert(narrowFromSeparator.geometry.inert === false && narrowFromSeparator.geometry.ariaHidden === null, 'narrow retained-zero nav still hidden', narrowFromSeparator);
        assert(narrowFromSeparator.focus.testId === 'settings-nav-back', 'separator focus did not recover to Back on narrow', narrowFromSeparator.focus);
        assert(!narrowFromSeparator.ax.some(n => n.role === 'separator' && /Resize Settings menu/i.test(n.name)), 'narrow separator remains in AX tree', narrowFromSeparator.ax);
        assert(narrowFromSeparator.ax.some(n => /Back to Workspace/i.test(n.name)), 'narrow navigation missing from AX tree', narrowFromSeparator.ax);
        await page.screenshot({ path: path.join(OUT, 'narrow-stacked-390x844.png'), fullPage: true });

        await page.getByRole('button', { name: 'Display' }).focus();
        await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(100);
        const desktopFromNav = { geometry: await geometry(page), focus: await active(page) };
        assert(desktopFromNav.geometry.inert === true && desktopFromNav.focus.testId === 'settings-navigation-resize-handle', 'narrow nav focus did not recover to separator at desktop zero', desktopFromNav);

        await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(100);
        await page.locator('[data-testid="settings-page-content"]').focus().catch(() => {});
        await page.evaluate(() => { const input = document.createElement('button'); input.id='unrelated-probe'; input.textContent='unrelated'; document.querySelector('[data-testid="settings-page-content"]').append(input); input.focus(); });
        const unrelatedBefore = await active(page);
        await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(100);
        const unrelatedAfter = await active(page);
        assert(unrelatedAfter.text === 'unrelated' && unrelatedAfter.tag === 'BUTTON', 'breakpoint stole unrelated focus', { unrelatedBefore, unrelatedAfter });
        record('BROWSER-R2-005', 'Pass', { narrowFromSeparator: { geometry: narrowFromSeparator.geometry, focus: narrowFromSeparator.focus }, desktopFromNav, unrelatedBefore, unrelatedAfter });
      } finally { await context.close(); }
    }

    // Loading, error, empty under manual resize.
    for (const phase of ['loading', 'error', 'empty']) {
      const { context, page, state } = await createHarness(browser, { width: 1440, height: 900 }, phase);
      try {
        await gotoSettings(page, '?section=token-usage');
        if (phase === 'loading') await page.getByText('Loading token usage statistics…', { exact: true }).waitFor();
        if (phase === 'error') await page.getByText('deterministic statistics error', { exact: false }).first().waitFor();
        if (phase === 'empty') await page.getByText('No agent or team usage found for this date range.', { exact: true }).waitFor();
        const count = statRequestCount(state);
        const h = page.locator('[data-testid="settings-navigation-resize-handle"]'); await h.focus(); await page.keyboard.press('Home'); await page.keyboard.press('End');
        assert(statRequestCount(state) === count, `${phase} resize refetched`, state.requests);
        if (phase === 'loading') { state.phase='loaded'; state.releases.splice(0).forEach(r=>r()); await page.getByText('Software Engineering Team', { exact: true }).waitFor(); }
        if (phase === 'empty') { await page.selectOption('#token-usage-grouping', 'model'); await page.getByText('No runtime/model usage found for this date range.', { exact: true }).waitFor(); }
        await page.screenshot({ path: path.join(OUT, `${phase}-state.png`), fullPage: true });
        record(`BROWSER-R2-008-${phase}`, 'Pass', { requestsBefore: count, requestsAfter: statRequestCount(state) });
      } finally { state.releases.splice(0).forEach(r=>r()); await context.close(); }
    }

    // Routes, modes and Back. Embedded fallback remains durable unit-covered because emulating bootstrap identity would bypass app ownership.
    {
      const { context, page } = await createHarness(browser, { width: 1440, height: 900 });
      try {
        const cases = [
          ['?section=about', '[data-testid="settings-nav-updates"]', 'Updates'],
          ['?section=server-status', '[data-testid="settings-nav-server-settings-advanced"]', 'advanced'],
          ['?section=invalid-section', null, 'API Keys'],
          ['?section=server-settings', '[data-testid="settings-nav-server-settings-quick"]', 'quick'],
          ['?section=server-settings&mode=advanced', '[data-testid="settings-nav-server-settings-advanced"]', 'advanced'],
          ['?section=server-settings&mode=migrations', '[data-testid="settings-nav-server-settings-migrations"]', 'migrations'],
        ];
        const evidence=[];
        for (const [query, selector, label] of cases) {
          await gotoSettings(page, query);
          const button = selector ? page.locator(selector) : page.getByRole('button', { name: label, exact: true }).first(); await button.waitFor();
          const cls = await button.getAttribute('class');
          assert(cls.includes('bg-gray-100') || cls.includes('font-medium'), `route ${query} not visibly active`, { label, cls });
          evidence.push({ query, label, class: cls, width: (await geometry(page)).ariaNow });
        }
        await gotoSettings(page); await page.locator('[data-testid="settings-nav-back"]').click(); await page.waitForURL(url => url.pathname === '/workspace', { timeout: 15000 });
        record('BROWSER-R2-009', 'Pass', { cases: evidence, backUrl: page.url(), embeddedFallback: 'covered by pages/__tests__/settings.spec.ts without bypassing bootstrap ownership' });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
main().then(() => {
  const failed = results.filter(r => r.result === 'Fail');
  const output = { result: failed.length ? 'Fail' : 'Pass', targetCommit: '173848dea69e5095b23f6bdf61f089ff02992325', generatedAt: new Date().toISOString(), results, consoleEvents };
  fs.writeFileSync(path.join(OUT, 'browser-validation-results.json'), JSON.stringify(output, null, 2)); console.log(JSON.stringify(output, null, 2));
  if (failed.length) process.exitCode=1;
}).catch(error => {
  const output = { result:'Fail', targetCommit:'173848dea69e5095b23f6bdf61f089ff02992325', generatedAt:new Date().toISOString(), error:error.message, detail:error.detail, stack:error.stack, results, consoleEvents };
  fs.writeFileSync(path.join(OUT, 'browser-validation-results.json'), JSON.stringify(output,null,2)); console.error(JSON.stringify(output,null,2)); process.exitCode=1;
});
