#!/usr/bin/env node

import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '../..');
const fixturePath = path.join(scriptDir, 'fixtures/nested-team-hierarchy.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-nested-team-hierarchy.vue');
const routePath = '/api-e2e-nested-team-hierarchy';
const nuxiExecutable = path.join(
  webDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'nuxi.cmd' : 'nuxi',
);

const TEAM_RUN_ID = 'hierarchy-browser-team-run';
const PRODUCT_ROW = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/product"]`;
const SOFTWARE_ROW = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/software"]`;
const QUALITY_ROW = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/software/quality"]`;
const QUALITY_AGENT_ROW = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/software/quality/automation"]`;
const ACCESSIBILITY_ROW = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/product/accessibility"]`;
const RESEARCH_ROW = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/product/research"]`;
const ARCHITECT_ROW = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/software/architect"]`;
const TASK_TEAM_ROW = '[data-test="workspace-team-transient-execution-row"][data-member-address="/temporary-review"]';

const getArg = (name, fallback = undefined) => {
  const prefix = `--${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
};

const timeoutMs = Number(getArg('timeout-ms', '90000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/nested-team-hierarchy'));
const explicitPort = getArg('port');
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const executablePath = browserExecutableArg || browserCandidates.find((candidate) => existsSync(candidate));

const evidence = {
  startedAt: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  browserExecutable: executablePath || null,
  webDir,
  fixturePath,
  installedPagePath,
  routePath,
  scenarios: {},
  browserEvents: [],
  requests: [],
  failures: [],
  cleanup: {},
};

const assert = (condition, message, details = undefined) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const errorDetails = (error) => ({
  message: error instanceof Error ? error.message : String(error),
  ...(error?.details !== undefined ? { details: error.details } : {}),
  ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
});

const waitFor = async (description, fn, timeout = timeoutMs, interval = 100) => {
  const startedAt = Date.now();
  let lastValue;
  let lastError;
  while (Date.now() - startedAt < timeout) {
    try {
      lastValue = await fn();
      if (lastValue) return lastValue;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(
    `Timed out waiting for ${description}; last=${JSON.stringify(lastValue)}`
      + (lastError ? `; error=${lastError.message}` : ''),
  );
};

const choosePort = async () => {
  if (explicitPort) return Number(explicitPort);
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
};

const childHasExited = (child) => child.exitCode !== null || child.signalCode !== null;

const waitForChildExit = async (child, timeout) => {
  if (childHasExited(child)) return true;
  return await new Promise((resolve) => {
    const onExit = () => finish(true);
    let timer;
    const finish = (exited) => {
      clearTimeout(timer);
      child.off('exit', onExit);
      resolve(exited);
    };
    child.once('exit', onExit);
    timer = setTimeout(() => finish(childHasExited(child)), timeout);
  });
};

const stopOwnedProcess = async (child) => {
  if (!child) return { status: 'not-started' };
  if (!child.pid) throw new Error('Owned Nuxt process has no PID');
  const details = { pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
  if (!childHasExited(child)) {
    if (process.platform === 'win32') child.kill('SIGTERM');
    else process.kill(-child.pid, 'SIGTERM');
    if (!(await waitForChildExit(child, 10000))) {
      if (process.platform === 'win32') child.kill('SIGKILL');
      else process.kill(-child.pid, 'SIGKILL');
      assert(await waitForChildExit(child, 5000), 'Owned Nuxt process did not stop after SIGKILL', details);
    }
  }
  return {
    status: 'terminated',
    ...details,
    finalExitCode: child.exitCode,
    finalSignalCode: child.signalCode,
  };
};

const finishStream = async (stream) => {
  if (!stream) return;
  await new Promise((resolve) => stream.end(resolve));
};

const runScenario = async (id, description, fn) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await fn();
    evidence.scenarios[id] = { description, result: 'Pass', startedAt, details };
    return details;
  } catch (error) {
    const failure = { id, description, ...errorDetails(error) };
    evidence.scenarios[id] = { description, result: 'Fail', startedAt, failure };
    evidence.failures.push(failure);
    throw error;
  }
};

const fontScalePixels = { default: 16, large: 18, 'extra-large': 20 };

const setProbeState = async (page, input) => {
  await page.evaluate(async (next) => {
    const control = window.__nestedTeamHierarchyProbe;
    if (next.locale) await control.setLocale(next.locale);
    if (next.width) control.setPanelWidth(next.width);
    if (next.font) control.setFontScale(next.font);
    if (typeof next.expanded === 'boolean') control.setAllExpanded(next.expanded);
    if (next.selected) control.setSelectedAgentRun(next.selected);
    document.activeElement?.blur();
  }, input);
  await page.waitForFunction((next) => {
    const state = window.__nestedTeamHierarchyProbe?.getState();
    return state
      && (!next.width || state.panelWidth === next.width)
      && (!next.font || state.fontScale === next.font)
      && (!next.locale || document.documentElement.lang === next.locale || state)
      && (!next.selected || state.selectedAgentRunId === next.selected);
  }, input, { timeout: timeoutMs });
  await page.waitForTimeout(180);
};

const rowLayout = async (locator) => locator.evaluate((row) => {
  const branch = row.querySelector('.hierarchy-current-branch');
  const leading = row.querySelector(
    ':scope > [data-test="workspace-team-member-disclosure"], '
      + ':scope > [data-test="workspace-team-transient-disclosure"], '
      + ':scope > span.ml-2[aria-hidden="true"]',
  );
  if (!(branch instanceof HTMLElement) || !(leading instanceof HTMLElement)) {
    throw new Error('Hierarchy row lacks its current branch or leading control/spacer');
  }
  const rowRect = row.getBoundingClientRect();
  const branchRect = branch.getBoundingClientRect();
  const leadingRect = leading.getBoundingClientRect();
  const before = getComputedStyle(branch, '::before');
  const after = getComputedStyle(branch, '::after');
  return {
    address: row.getAttribute('data-member-address'),
    depth: Number(row.getAttribute('data-tree-depth')),
    hasFollowingSibling: branch.getAttribute('data-has-following-sibling') === 'true',
    rowHeight: rowRect.height,
    branchHeight: branchRect.height,
    branchLeft: branchRect.left,
    branchRight: branchRect.right,
    leadingLeft: leadingRect.left,
    beforeLeft: Number.parseFloat(before.left),
    beforeWidth: Number.parseFloat(before.width),
    beforeHeight: Number.parseFloat(before.height),
    afterLeft: Number.parseFloat(after.left),
    afterWidth: Number.parseFloat(after.width),
    afterHeight: Number.parseFloat(after.height),
    ancestorDepths: [...row.querySelectorAll('[data-ancestor-depth]')]
      .map((element) => Number(element.getAttribute('data-ancestor-depth'))),
  };
});

const axDetails = async (client, selector) => {
  const { root } = await client.send('DOM.getDocument', { depth: -1, pierce: true });
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  assert(nodeId, `Could not find DOM node for AX selector: ${selector}`);
  const { nodes } = await client.send('Accessibility.getPartialAXTree', {
    nodeId,
    fetchRelatives: false,
  });
  assert(nodes.length > 0, `No AX node returned for selector: ${selector}`);
  const node = nodes[0];
  return {
    role: node.role?.value ?? null,
    name: node.name?.value ?? null,
    ignored: node.ignored,
    properties: Object.fromEntries((node.properties ?? []).map((property) => [
      property.name,
      property.value?.value ?? null,
    ])),
  };
};

await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'evidence.json');
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
const deepScreenshotPath = path.join(outputDir, 'deep-320.png');
const narrowScreenshotPath = path.join(outputDir, 'focus-260-extra-large-zh-cn.png');
const wideScreenshotPath = path.join(outputDir, 'deep-520.png');

let nuxtProcess;
let nuxtLog;
let browser;
let context;
let page;
let client;
let fixtureInstalled = false;
let executionError;
let nuxtSpawnError;

try {
  assert(existsSync(fixturePath), `Fixture does not exist: ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`);
  assert(executablePath, 'No Chrome/Chromium executable found; pass --browser-executable');
  assert(existsSync(nuxiExecutable), `Nuxt CLI does not exist: ${nuxiExecutable}`);

  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;

  const port = await choosePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.port = port;
  evidence.baseUrl = baseUrl;
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxtProcess = spawn(
    nuxiExecutable,
    ['dev', '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: webDir,
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534',
        NUXT_TELEMETRY_DISABLED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  nuxtProcess.on('error', (error) => { nuxtSpawnError = error; });
  nuxtProcess.stdout.pipe(nuxtLog);
  nuxtProcess.stderr.pipe(nuxtLog);

  await waitFor('Nuxt hierarchy fixture route', async () => {
    if (nuxtSpawnError) throw nuxtSpawnError;
    if (childHasExited(nuxtProcess)) {
      throw new Error(`Nuxt exited before readiness: code=${nuxtProcess.exitCode} signal=${nuxtProcess.signalCode}`);
    }
    const response = await fetch(`${baseUrl}${routePath}`);
    return response.ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });
  context = await browser.newContext({
    viewport: { width: 1200, height: 1100 },
    locale: 'en-US',
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  });
  await context.route('**/rest/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    });
  });
  page = await context.newPage();
  client = await context.newCDPSession(page);
  page.on('console', (message) => {
    evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() });
  });
  page.on('pageerror', (error) => {
    evidence.browserEvents.push({ type: 'pageerror', text: error.message });
  });
  page.on('request', (request) => {
    evidence.requests.push({
      at: new Date().toISOString(),
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    });
  });
  page.on('requestfailed', (request) => {
    evidence.browserEvents.push({
      type: 'requestfailed',
      text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
    });
  });

  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="nested-team-hierarchy-probe"]').waitFor({ state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => Boolean(window.__nestedTeamHierarchyProbe), null, { timeout: timeoutMs });
  await setProbeState(page, {
    width: 320,
    font: 'default',
    locale: 'en',
    expanded: true,
    selected: 'hierarchy-accessibility-agent-run',
  });
  await page.locator('[data-test="workspace-team-execution-tree"]').waitFor({ state: 'visible', timeout: timeoutMs });
  evidence.browserEvents = [];
  evidence.requests = [];

  await runScenario(
    'NTHUI-BR-001',
    'Production components render the approved deep configured/transient printed tree, connector grammar, role identity, and orthogonal selection',
    async () => {
      const tree = page.locator('[data-test="workspace-team-execution-tree"]');
      const rows = tree.locator('[role="treeitem"]');
      const rowCount = await rows.count();
      assert(rowCount === 16, 'Deep fixture must expose all 16 execution rows', { rowCount });
      assert(await tree.getAttribute('role') === 'tree', 'Execution subtree must expose role=tree');
      assert((await tree.getAttribute('aria-label'))?.includes('organization tree'), 'Tree must expose a localized identity');
      assert(await page.locator('[data-test="workspace-team-definition-row-hierarchy-browser-team-definition"]').count() === 1,
        'Definition group must remain visible');
      assert(await page.locator(`[data-test="workspace-team-row-${TEAM_RUN_ID}"]`).count() === 1,
        'TeamRun row must remain visible');

      const configuredTeamIcons = await tree.locator('[data-team-icon="user-group-solid"]').count();
      const agentAvatars = await tree.locator('[data-test="workspace-team-member-avatar"]').count();
      const transientTeamIcons = await tree.locator('[data-team-icon="temporary-task-team"]').count();
      const transientRows = await tree.locator('[data-row-kind="transient_execution"]').count();
      assert(configuredTeamIcons === 4, 'Every configured nested Team must use the filled group identity', { configuredTeamIcons });
      assert(agentAvatars === 10, 'Every configured Agent must retain a circular avatar identity', { agentAvatars });
      assert(transientTeamIcons === 1 && transientRows === 2,
        'Transient task Team and child must remain independently recognizable', { transientTeamIcons, transientRows });

      const rowLayouts = [];
      for (let index = 0; index < rowCount; index += 1) {
        const layout = await rowLayout(rows.nth(index));
        assert(layout.beforeLeft === 0 && layout.afterLeft === 0,
          'Vertical and horizontal branch segments must begin at the rail coordinate', layout);
        assert(layout.beforeWidth === 1 && layout.afterHeight === 1 && layout.afterWidth > 0,
          'Branch segments must retain 1px printed-tree grammar', layout);
        assert(layout.branchRight <= layout.leadingLeft + 0.5,
          'Horizontal branch must stop before the disclosure/alignment control', layout);
        if (layout.hasFollowingSibling) {
          assert(Math.abs(layout.beforeHeight - layout.branchHeight) <= 1.5,
            'A non-final sibling vertical must continue through the row', layout);
        } else {
          assert(layout.beforeHeight < layout.branchHeight * 0.7,
            'A final sibling vertical must terminate near the row midpoint', layout);
        }
        rowLayouts.push(layout);
      }
      assert(rowLayouts.some((layout) => layout.hasFollowingSibling), 'Fixture must exercise continuing sibling branches');
      assert(rowLayouts.some((layout) => !layout.hasFollowingSibling), 'Fixture must exercise final-sibling elbows');
      const deepLayout = rowLayouts.find((layout) => layout.address === '/software/quality/automation');
      assert(deepLayout?.depth === 2 && deepLayout.ancestorDepths.includes(0),
        'Deep configured Agent must retain the continuing root ancestor rail', deepLayout);

      const selected = await page.locator(ACCESSIBILITY_ROW).evaluate((row) => {
        const style = getComputedStyle(row);
        return {
          backgroundColor: style.backgroundColor,
          boxShadow: style.boxShadow,
          borderRadius: style.borderRadius,
          ariaSelected: row.getAttribute('aria-selected'),
          ariaCurrent: row.getAttribute('aria-current'),
        };
      });
      assert(selected.backgroundColor === 'rgb(238, 242, 255)', 'Selected background must be #eef2ff', selected);
      assert(selected.boxShadow.includes('rgb(99, 102, 241)') && selected.boxShadow.includes('2px'),
        'Selected row must have the straight 2px #6366f1 inset rule', selected);
      assert(selected.borderRadius === '0px' && selected.ariaSelected === 'true' && selected.ariaCurrent === 'true',
        'Selected row must be orthogonal and programmatically selected/current', selected);

      const statusEvidence = {
        exactAgentLabel: await page.locator(ACCESSIBILITY_ROW).getAttribute('aria-label'),
        configuredAggregate: await page.locator(PRODUCT_ROW).locator('[data-test="nested-team-aggregate-status-dot"]').getAttribute('data-status'),
        transientAgentLabel: await page.locator('[data-member-address="/temporary-review/reviewer"]').getAttribute('aria-label'),
      };
      assert(statusEvidence.exactAgentLabel?.includes(', error, /product/accessibility')
        && statusEvidence.configuredAggregate === 'running'
        && statusEvidence.transientAgentLabel?.includes(', initializing, /temporary-review/reviewer'),
      'Exact, aggregate, and transient statuses must remain available', statusEvidence);

      await page.screenshot({ path: deepScreenshotPath, fullPage: true });
      return {
        rowCount,
        configuredTeamIcons,
        agentAvatars,
        transientTeamIcons,
        transientRows,
        selected,
        statusEvidence,
        deepLayout,
        screenshot: deepScreenshotPath,
      };
    },
  );

  await runScenario(
    'NTHUI-BR-002',
    'The complete supported width/font matrix has no overflow or clipped disclosure while narrow metadata yields and remains recoverable',
    async () => {
      const matrix = [];
      for (const width of [260, 320, 520]) {
        for (const font of ['default', 'large', 'extra-large']) {
          await setProbeState(page, { width, font, locale: 'en', expanded: true });
          const details = await page.locator('[data-test="history-panel"]').evaluate((panel) => {
            const panelRect = panel.getBoundingClientRect();
            const tree = panel.querySelector('[data-test="workspace-team-execution-tree"]');
            const disclosures = [...panel.querySelectorAll(
              '[data-test="workspace-team-member-disclosure"], [data-test="workspace-team-transient-disclosure"]',
            )];
            const outsideControls = disclosures.filter((control) => {
              const rect = control.getBoundingClientRect();
              return rect.left < panelRect.left - 0.5 || rect.right > panelRect.right + 0.5;
            }).length;
            const rowOverflow = [...panel.querySelectorAll('[role="treeitem"]')].filter((row) => {
              const rect = row.getBoundingClientRect();
              return rect.left < panelRect.left - 0.5 || rect.right > panelRect.right + 0.5;
            }).length;
            return {
              clientWidth: panel.clientWidth,
              scrollWidth: panel.scrollWidth,
              panelRect: { left: panelRect.left, right: panelRect.right, width: panelRect.width },
              treeRole: tree?.getAttribute('role') ?? null,
              disclosures: disclosures.length,
              outsideControls,
              rowOverflow,
            };
          });
          assert(details.clientWidth === width && details.scrollWidth === width,
            'Supported panel must not introduce horizontal overflow', { width, font, details });
          assert(details.outsideControls === 0 && details.rowOverflow === 0 && details.disclosures === 5,
            'Required rows and disclosure controls must remain inside the panel', { width, font, details });
          const ageOpacity = await page.locator(RESEARCH_ROW).locator('.member-age').evaluate((element) => getComputedStyle(element).opacity);
          const expectedAgeOpacity = width <= 320 ? '0' : '1';
          assert(ageOpacity === expectedAgeOpacity, 'Responsive age visibility mismatch', {
            width, font, ageOpacity, expectedAgeOpacity,
          });
          const depthTwoStatusOpacity = await page.locator(QUALITY_AGENT_ROW).locator('.member-status')
            .evaluate((element) => getComputedStyle(element).opacity);
          const expectedStatusOpacity = width === 260 ? '0' : '1';
          assert(depthTwoStatusOpacity === expectedStatusOpacity, 'Depth-2 status visibility mismatch', {
            width, font, depthTwoStatusOpacity, expectedStatusOpacity,
          });
          const nameMetrics = await page.locator(RESEARCH_ROW).locator('.truncate').evaluate((element) => ({
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
          }));
          if (width <= 320) {
            assert(nameMetrics.scrollWidth > nameMetrics.clientWidth,
              'Long identity must truncate rather than overlap at narrow widths', { width, font, nameMetrics });
          }
          matrix.push({ width, font, rootFontPixels: fontScalePixels[font], ageOpacity, depthTwoStatusOpacity, nameMetrics, ...details });
        }
      }

      await setProbeState(page, { width: 320, font: 'default', locale: 'en', expanded: true });
      const researchRow = page.locator(RESEARCH_ROW);
      await researchRow.hover();
      await page.waitForTimeout(150);
      const hoverAgeOpacity = await researchRow.locator('.member-age').evaluate((element) => getComputedStyle(element).opacity);
      assert(hoverAgeOpacity === '1', 'Narrow pointer hover must recover age metadata', { hoverAgeOpacity });

      await setProbeState(page, { width: 260, font: 'extra-large', locale: 'zh-CN', expanded: true });
      await researchRow.focus();
      await page.waitForTimeout(150);
      const focus = await researchRow.evaluate((row) => {
        const tooltip = row.querySelector('[role="tooltip"]');
        const age = row.querySelector('.member-age');
        return {
          title: row.getAttribute('title'),
          ariaLabel: row.getAttribute('aria-label'),
          rowZIndex: getComputedStyle(row).zIndex,
          tooltipDisplay: tooltip ? getComputedStyle(tooltip).display : null,
          tooltipText: tooltip?.textContent?.trim() ?? null,
          ageOpacity: age ? getComputedStyle(age).opacity : null,
        };
      });
      assert(focus.title === '智能体 · Research Operations Specialist With A Very Long Localized Role · /product/research',
        'Localized full identity title must preserve role, exact name, and address', focus);
      assert(focus.tooltipDisplay === 'block' && focus.tooltipText === focus.title && focus.rowZIndex === '60',
        'Keyboard identity tooltip must be visible and stack above following rows', focus);
      assert(focus.ageOpacity === '1', 'Keyboard focus must recover narrow age metadata', focus);
      await page.screenshot({ path: narrowScreenshotPath, fullPage: true });

      await setProbeState(page, { width: 520, font: 'default', locale: 'en', expanded: true });
      await page.screenshot({ path: wideScreenshotPath, fullPage: true });
      return {
        matrix,
        hoverAgeOpacity,
        focus,
        narrowScreenshot: narrowScreenshotPath,
        wideScreenshot: wideScreenshotPath,
      };
    },
  );

  await runScenario(
    'NTHUI-BR-003',
    'Pointer and keyboard disclosure remain independent, structural rows never fabricate selection, concrete selection and run actions remain exact, and quiet refresh preserves state',
    async () => {
      await setProbeState(page, { width: 320, font: 'default', locale: 'en', expanded: false });
      await page.evaluate(() => window.__nestedTeamHierarchyProbe.resetCounters());
      const tree = page.locator('[data-test="workspace-team-execution-tree"]');
      assert(await tree.locator('[role="treeitem"]').count() === 5, 'All nested Teams must default to the collapsed fixture state');

      await page.locator(PRODUCT_ROW).click();
      assert(await tree.locator('[role="treeitem"]').count() === 11, 'Pointer activation must reveal only Product descendants');
      let state = await page.evaluate(() => window.__nestedTeamHierarchyProbe.getState());
      assert(state.counters.toggles === 1 && state.counters.memberSelections === 0,
        'Configured structural Team pointer activation must toggle exactly once without selection', state);

      await page.locator(SOFTWARE_ROW).focus();
      await page.locator(SOFTWARE_ROW).press('Enter');
      assert(await tree.locator('[role="treeitem"]').count() === 13, 'Enter must reveal only Software direct descendants');
      await page.locator(QUALITY_ROW).focus();
      await page.locator(QUALITY_ROW).press('Space');
      assert(await tree.locator('[role="treeitem"]').count() === 14, 'Space must reveal only the deeper Quality subtree');

      await page.locator(TASK_TEAM_ROW).click();
      assert(await tree.locator('[role="treeitem"]').count() === 15, 'Transient structural Team must reveal its child');
      state = await page.evaluate(() => window.__nestedTeamHierarchyProbe.getState());
      assert(state.counters.toggles === 4 && state.counters.memberSelections === 0,
        'Configured and transient structural activation must never fabricate a concrete member selection', state);

      await page.locator(PRODUCT_ROW).locator('[data-test="workspace-team-member-disclosure"]').click();
      assert(await tree.locator('[role="treeitem"]').count() === 9, 'Dedicated disclosure must collapse only Product descendants');
      assert(await page.locator(SOFTWARE_ROW).getAttribute('aria-expanded') === 'true'
        && await page.locator(QUALITY_ROW).getAttribute('aria-expanded') === 'true',
      'Unrelated expansion choices must remain unchanged');

      await page.locator(ARCHITECT_ROW).click();
      state = await page.evaluate(() => window.__nestedTeamHierarchyProbe.getState());
      assert(state.counters.memberSelections === 1 && state.selectedAgentRunId === 'hierarchy-architect-run',
        'Concrete selection must emit the exact AgentRun identity once', state);
      assert(await page.locator(ARCHITECT_ROW).getAttribute('aria-selected') === 'true',
        'Concrete selection must update programmatic selected state');

      const beforeStop = state;
      await page.locator('button[title="Terminate team"]').click();
      state = await page.evaluate(() => window.__nestedTeamHierarchyProbe.getState());
      assert(state.counters.terminate === 1 && state.counters.memberSelections === beforeStop.counters.memberSelections,
        'Stop action must remain exact and must not select the TeamRun or member', state);

      const urlBefore = page.url();
      const rowCountBeforeRefresh = await tree.locator('[role="treeitem"]').count();
      const selectedBeforeRefresh = state.selectedAgentRunId;
      await page.evaluate(() => window.__nestedTeamHierarchyProbe.quietRefresh());
      await page.waitForFunction(() => window.__nestedTeamHierarchyProbe.getState().refreshCount === 1);
      await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-label')?.includes(', idle, /coordinator'),
        `[data-test="workspace-team-member-${TEAM_RUN_ID}-/coordinator"]`);
      const afterRefresh = await page.evaluate(() => window.__nestedTeamHierarchyProbe.getState());
      const rowCountAfterRefresh = await tree.locator('[role="treeitem"]').count();
      assert(page.url() === urlBefore && rowCountAfterRefresh === rowCountBeforeRefresh,
        'Quiet refresh must not navigate, reload, or reset visible expansion', {
          urlBefore, currentUrl: page.url(), rowCountBeforeRefresh, rowCountAfterRefresh,
        });
      assert(afterRefresh.selectedAgentRunId === selectedBeforeRefresh
        && afterRefresh.expanded['team:hierarchy-software-team-run'] === true
        && afterRefresh.expanded['team:hierarchy-quality-team-run'] === true,
      'Quiet refresh must retain selection and independent nested expansion', afterRefresh);
      const coordinatorLabel = await page.locator(`[data-test="workspace-team-member-${TEAM_RUN_ID}-/coordinator"]`).getAttribute('aria-label');
      assert(coordinatorLabel?.includes(', idle, /coordinator'),
        'Reactive quiet refresh must publish the changed exact status without rebuilding tree state', { coordinatorLabel });

      return {
        rowCountBeforeRefresh,
        rowCountAfterRefresh,
        stateBeforeRefresh: state,
        stateAfterRefresh: afterRefresh,
      };
    },
  );

  await runScenario(
    'NTHUI-BR-004',
    'Chromium accessibility output and localized keyboard focus expose role, identity, level, status, selection, and disclosure state',
    async () => {
      await setProbeState(page, {
        width: 260,
        font: 'extra-large',
        locale: 'zh-CN',
        expanded: true,
        selected: 'hierarchy-accessibility-agent-run',
      });
      const selectedRow = page.locator(ACCESSIBILITY_ROW);
      await selectedRow.focus();
      const attributes = await selectedRow.evaluate((row) => ({
        role: row.getAttribute('role'),
        level: row.getAttribute('aria-level'),
        selected: row.getAttribute('aria-selected'),
        current: row.getAttribute('aria-current'),
        label: row.getAttribute('aria-label'),
        title: row.getAttribute('title'),
        tooltip: row.querySelector('[role="tooltip"]')?.textContent?.trim() ?? null,
      }));
      assert(attributes.role === 'treeitem' && attributes.level === '2'
        && attributes.selected === 'true' && attributes.current === 'true',
      'Selected leaf must expose its tree role, level, and selected/current state', attributes);
      assert(attributes.label === '智能体，Accessibility & Design System Coordinator，第 2 级，错误，/product/accessibility',
        'Localized accessible label must expose role, exact name, level, status, and address', attributes);
      assert(attributes.title === '智能体 · Accessibility & Design System Coordinator · /product/accessibility'
        && attributes.tooltip === attributes.title,
      'Pointer and keyboard full-identity recovery must agree', attributes);

      const teamAttributes = await page.locator(SOFTWARE_ROW).evaluate((row) => ({
        role: row.getAttribute('role'),
        level: row.getAttribute('aria-level'),
        expanded: row.getAttribute('aria-expanded'),
        label: row.getAttribute('aria-label'),
        disclosureLabel: row.querySelector('[data-test="workspace-team-member-disclosure"]')?.getAttribute('aria-label') ?? null,
      }));
      assert(teamAttributes.role === 'treeitem' && teamAttributes.level === '1' && teamAttributes.expanded === 'true',
        'Configured structural Team must expose level and expanded state', teamAttributes);
      assert(teamAttributes.label?.includes('智能体团队') && teamAttributes.disclosureLabel === '折叠Software Engineering',
        'Configured Team and disclosure must expose localized role/action identity', teamAttributes);

      const treeAx = await axDetails(client, '[data-test="workspace-team-execution-tree"]');
      const selectedAx = await axDetails(client, ACCESSIBILITY_ROW);
      const softwareAx = await axDetails(client, SOFTWARE_ROW);
      assert(treeAx.role === 'tree' && !treeAx.ignored, 'Chromium AX tree must expose the production tree', treeAx);
      assert(selectedAx.role === 'treeitem' && selectedAx.name === attributes.label && selectedAx.properties.selected === true,
        'Chromium AX node must expose selected leaf identity', selectedAx);
      assert(softwareAx.role === 'treeitem' && softwareAx.properties.expanded === true,
        'Chromium AX node must expose structural expanded state', softwareAx);

      const depthTwoFocus = page.locator(QUALITY_AGENT_ROW);
      await depthTwoFocus.focus();
      await page.waitForTimeout(150);
      const recoveredStatusOpacity = await depthTwoFocus.locator('.member-status')
        .evaluate((element) => getComputedStyle(element).opacity);
      assert(recoveredStatusOpacity === '1', 'Depth-2 status must recover for keyboard focus at 260px', {
        recoveredStatusOpacity,
      });
      return { attributes, teamAttributes, treeAx, selectedAx, softwareAx, recoveredStatusOpacity };
    },
  );

  await runScenario(
    'NTHUI-BR-005',
    'Browser execution completes without console errors, page errors, or failed requests',
    async () => {
      const unexpectedEvents = evidence.browserEvents.filter((event) =>
        event.type === 'console:error' || event.type === 'pageerror' || event.type === 'requestfailed');
      assert(unexpectedEvents.length === 0, 'Unexpected browser runtime errors occurred', unexpectedEvents);
      return {
        browserEventCount: evidence.browserEvents.length,
        unexpectedEvents,
        observedRequestCount: evidence.requests.length,
      };
    },
  );
} catch (error) {
  executionError = error;
  if (!evidence.failures.some((failure) => failure.message === errorDetails(error).message)) {
    evidence.failures.push({ id: 'PROBE', ...errorDetails(error) });
  }
} finally {
  if (client) await client.detach().catch((error) => { evidence.cleanup.cdp = errorDetails(error); });
  if (page) await page.close().catch((error) => { evidence.cleanup.page = errorDetails(error); });
  if (context) await context.close().catch((error) => { evidence.cleanup.context = errorDetails(error); });
  if (browser) await browser.close().catch((error) => { evidence.cleanup.browser = errorDetails(error); });
  try {
    evidence.cleanup.nuxt = await stopOwnedProcess(nuxtProcess);
  } catch (error) {
    evidence.cleanup.nuxt = { status: 'failed', ...errorDetails(error) };
    executionError ||= error;
  }
  await finishStream(nuxtLog).catch((error) => { evidence.cleanup.nuxtLog = errorDetails(error); });
  if (fixtureInstalled) {
    try {
      await fs.rm(installedPagePath, { force: true });
      evidence.cleanup.fixture = { status: 'removed', path: installedPagePath };
    } catch (error) {
      evidence.cleanup.fixture = { status: 'failed', path: installedPagePath, ...errorDetails(error) };
      executionError ||= error;
    }
  } else {
    evidence.cleanup.fixture = { status: 'not-installed', path: installedPagePath };
  }
  evidence.finishedAt = new Date().toISOString();
  evidence.result = executionError ? 'Fail' : 'Pass';
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (executionError) {
  process.stderr.write(`${executionError.stack || executionError.message || String(executionError)}\n`);
  process.stderr.write(`Evidence: ${evidencePath}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Nested Team hierarchy browser probe passed. Evidence: ${evidencePath}\n`);
}
