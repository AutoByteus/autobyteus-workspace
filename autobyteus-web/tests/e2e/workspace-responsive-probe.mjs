#!/usr/bin/env node
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const DEFAULT_VIEWPORTS = [
  { name: 'phone-390x844', width: 390, height: 844 },
  { name: 'phone-short-390x640', width: 390, height: 640 },
  { name: 'narrow-500x700', width: 500, height: 700 },
  { name: 'narrow-short-500x420', width: 500, height: 420 },
  { name: 'threshold-639x700', width: 639, height: 700 },
  { name: 'threshold-640x700', width: 640, height: 700 },
  { name: 'gap-700x700', width: 700, height: 700 },
  { name: 'gap-767x700', width: 767, height: 700 },
  { name: 'md-768x700', width: 768, height: 700 },
  { name: 'tablet-800x700', width: 800, height: 700 },
  { name: 'tablet-short-800x420', width: 800, height: 420 },
  { name: 'tablet-900x700', width: 900, height: 700 },
  { name: 'small-desktop-1024x768', width: 1024, height: 768 },
  { name: 'small-desktop-short-1024x480', width: 1024, height: 480 },
  { name: 'desktop-1180x800', width: 1180, height: 800 },
  { name: 'desktop-1280x800', width: 1280, height: 800 },
  { name: 'wide-1440x900', width: 1440, height: 900 },
];

const PRIMARY_SURFACE_ORDER = ['Work', 'Runs', 'Files', 'Tools'];
const CANONICAL_TOOL_ORDER = ['Files', 'Team', 'Terminal', 'Activity', 'Artifacts', 'Browser', 'VNC Viewer'];
const CENTER_MIN_WIDTH = 480;
const ACCEPTABLE_NARROW_CENTER_MIN_WIDTH = 320;

const getArg = (name, fallback = undefined) => {
  const prefixed = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefixed));
  if (direct) return direct.slice(prefixed.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
};

const hasFlag = (name) => process.argv.includes(`--${name}`);
const trimSlash = (value) => value.replace(/\/$/, '');
const baseUrl = trimSlash(getArg('base-url', process.env.WORKSPACE_RESPONSIVE_BASE_URL || 'http://127.0.0.1:13002'));
const outputDir = path.resolve(getArg('output-dir', process.env.WORKSPACE_RESPONSIVE_OUTPUT_DIR || 'test-results/workspace-responsive'));
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
const browserExecutableCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const executablePath = browserExecutableArg || browserExecutableCandidates.find((candidate) => existsSync(candidate));
const screenshotMode = getArg('screenshots', 'all');
const failOnConsoleError = hasFlag('fail-on-console-error');

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const orderedSubsequence = (actual, expectedOrder) => {
  const expectedIndexByLabel = new Map(expectedOrder.map((label, index) => [label, index]));
  const indexes = actual
    .filter((label) => expectedIndexByLabel.has(label))
    .map((label) => expectedIndexByLabel.get(label));
  return indexes.every((value, index) => index === 0 || value >= indexes[index - 1]);
};

const labelsEqualPrefix = (actual, expectedPrefix) => (
  actual.length >= expectedPrefix.length &&
  expectedPrefix.every((label, index) => actual[index] === label)
);

async function collect(page, label) {
  return await page.evaluate((evaluationLabel) => {
    const visible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== 'none' &&
        cs.visibility !== 'hidden' &&
        Number(cs.opacity) !== 0 &&
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > 0 &&
        r.right > 0 &&
        r.left < innerWidth &&
        r.top < innerHeight;
    };

    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom),
      };
    };

    const elementInfo = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        selector,
        visible: visible(el),
        display: cs.display,
        visibility: cs.visibility,
        position: cs.position,
        overflow: `${cs.overflowX}/${cs.overflowY}`,
        rect: rect(el),
        text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 800),
        classes: el.getAttribute('class') || '',
      };
    };

    const buttonLabel = (button) => (
      (button.innerText || button.textContent || button.getAttribute('title') || button.getAttribute('aria-label') || '')
        .replace(/\s+/g, ' ')
        .trim()
    );

    const allButtons = Array.from(document.querySelectorAll('button')).map((button, index) => ({
      index,
      label: buttonLabel(button),
      title: button.getAttribute('title') || '',
      aria: button.getAttribute('aria-label') || '',
      dataTest: button.getAttribute('data-test') || button.getAttribute('data-testid') || '',
      visible: visible(button),
      rect: rect(button),
      classes: (button.getAttribute('class') || '').slice(0, 240),
    }));

    const labelsIn = (selector, { visibleOnly = true, includeEmpty = false } = {}) => {
      const root = document.querySelector(selector);
      if (!root) return [];
      return Array.from(root.querySelectorAll('button'))
        .filter((button) => !visibleOnly || visible(button))
        .map(buttonLabel)
        .filter((labelText) => includeEmpty || Boolean(labelText));
    };

    const rightPanelLabels = labelsIn('[data-test="workspace-right-panel"]')
      .filter((labelText) => !/toggle sidebar/i.test(labelText));
    const rightStripLabels = labelsIn('[data-test="workspace-right-tool-strip"]')
      .filter((labelText) => !/toggle sidebar/i.test(labelText));
    const rightDrawerLabels = labelsIn('[data-test="workspace-right-tool-drawer"]')
      .filter((labelText) => !/close/i.test(labelText) && !/toggle sidebar/i.test(labelText));
    const primaryControlLabels = labelsIn('[data-test="workspace-primary-surface-controls"]');
    const topVisibleLabels = allButtons
      .filter((button) => button.visible && button.rect && button.rect.y < 130)
      .sort((left, right) => left.rect.y - right.rect.y || left.rect.x - right.rect.x)
      .map((button) => button.label || button.title || button.aria)
      .filter(Boolean);

    const bodyText = (document.body?.innerText || document.body?.textContent || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('main');
    const mainText = (main?.innerText || main?.textContent || '').replace(/\s+/g, ' ').trim();
    const oldDesktop = document.querySelector('[data-test="workspace-desktop-layout"]');
    const adaptive = document.querySelector('[data-test="workspace-adaptive-layout"]');
    const center = document.querySelector('[data-test="workspace-center-content-shell"]');
    const rightPanel = document.querySelector('[data-test="workspace-right-panel"]');
    const primaryControls = document.querySelector('[data-test="workspace-primary-surface-controls"]');
    const leftAside = document.querySelector('aside');
    const header = document.querySelector('header');
    const rightPanelTabList = document.querySelector('[data-test="workspace-right-panel"] [data-test="right-side-tab-list"]');
    const rightDrawerTabList = document.querySelector('[data-test="workspace-right-tool-drawer"] [data-test="right-side-tab-list"]');
    const rightPanelTabs = Array.from(rightPanelTabList?.querySelectorAll('button') ?? []).map((button) => ({
      label: buttonLabel(button),
      visible: visible(button),
      rect: rect(button),
    }));
    const rightDrawerTabs = Array.from(rightDrawerTabList?.querySelectorAll('button') ?? []).map((button) => ({
      label: buttonLabel(button),
      visible: visible(button),
      rect: rect(button),
    }));

    return {
      label: evaluationLabel,
      href: location.href,
      title: document.title,
      innerWidth,
      innerHeight,
      bodyText: bodyText.slice(0, 1600),
      mainText: mainText.slice(0, 1600),
      rects: {
        header: elementInfo('header'),
        main: elementInfo('main'),
        leftAside: elementInfo('aside'),
        adaptive: elementInfo('[data-test="workspace-adaptive-layout"]'),
        oldDesktop: elementInfo('[data-test="workspace-desktop-layout"]'),
        centerPane: elementInfo('[data-test="workspace-center-pane"]'),
        centerShell: elementInfo('[data-test="workspace-center-content-shell"]'),
        primaryControls: elementInfo('[data-test="workspace-primary-surface-controls"]'),
        rightPanel: elementInfo('[data-test="workspace-right-panel"]'),
        rightPanelTabList: elementInfo('[data-test="workspace-right-panel"] [data-test="right-side-tab-list"]'),
        rightStrip: elementInfo('[data-test="workspace-right-tool-strip"]'),
        rightDrawer: elementInfo('[data-test="workspace-right-tool-drawer"]'),
        rightDrawerTabList: elementInfo('[data-test="workspace-right-tool-drawer"] [data-test="right-side-tab-list"]'),
        mobileShell: elementInfo('[data-testid="mobile-remote-access-shell"]'),
      },
      visibleState: {
        header: visible(header),
        main: visible(main),
        adaptive: visible(adaptive),
        center: visible(center),
        rightPanel: visible(rightPanel),
        primaryControls: visible(primaryControls),
        leftAside: visible(leftAside),
        oldDesktop: visible(oldDesktop),
      },
      labels: {
        primaryControls: primaryControlLabels,
        rightPanel: rightPanelLabels,
        rightStrip: rightStripLabels,
        rightDrawer: rightDrawerLabels,
        topVisible: topVisibleLabels,
      },
      rightPanelTabs,
      rightDrawerTabs,
      media: {
        min640: matchMedia('(min-width: 640px)').matches,
        min768: matchMedia('(min-width: 768px)').matches,
        min1024: matchMedia('(min-width: 1024px)').matches,
      },
    };
  }, label);
}

async function clickButtonByLabel(page, rootSelector, label) {
  return await page.evaluate(({ rootSelector: selector, label: targetLabel }) => {
    const root = document.querySelector(selector);
    if (!root) return false;
    const buttons = Array.from(root.querySelectorAll('button'));
    const target = buttons.find((button) => (
      (button.innerText || button.textContent || button.getAttribute('title') || button.getAttribute('aria-label') || '')
        .replace(/\s+/g, ' ')
        .trim() === targetLabel
    ));
    if (!target) return false;
    target.click();
    return true;
  }, { rootSelector, label });
}

async function clickBackdropOutsideLeftDrawer(page) {
  await page.mouse.click(Math.max(360, Math.floor(page.viewportSize().width * 0.75)), Math.max(80, Math.floor(page.viewportSize().height / 2))).catch(() => undefined);
  await page.waitForTimeout(150);
}

function validateWorkspaceInitial(state, viewport) {
  const failures = [];
  const { width, height, name } = viewport;
  const centerRect = state.rects.centerShell?.rect;
  const rightPanelRect = state.rects.rightPanel?.rect;
  const leftRect = state.rects.leftAside?.rect;
  const mainTextWithoutChrome = state.mainText
    .replace(/Open menu|AutoByteus|Agents|Agent Teams|Skills|Memory|Nodes|Workspaces|Settings|Temp Workspace/g, '')
    .trim();

  if (!state.visibleState.adaptive) failures.push('workspace adaptive layout is not visible');
  if (!state.visibleState.center) failures.push('workspace center content shell is not visible');
  if (state.rects.oldDesktop) failures.push('legacy workspace desktop layout marker still exists');
  if (state.visibleState.main && !mainTextWithoutChrome && !state.visibleState.adaptive) failures.push('main workspace region appears blank');
  if (/Running List/.test(state.bodyText) && state.labels.topVisible.includes('Running') && state.labels.topVisible.includes('Agent')) {
    failures.push('legacy Running / Agent mobile button model is visible');
  }

  if (centerRect?.width > 0) {
    const requiredMin = width < 768 ? Math.min(ACCEPTABLE_NARROW_CENTER_MIN_WIDTH, width) : CENTER_MIN_WIDTH;
    if (centerRect.width < requiredMin) {
      failures.push(`center width ${centerRect.width}px is below ${requiredMin}px`);
    }
  }

  if (rightPanelRect?.width > 0 && rightPanelRect.width < 360) {
    failures.push(`right panel width ${rightPanelRect.width}px is cramped`);
  }

  if (width < 768) {
    if (!labelsEqualPrefix(state.labels.primaryControls, PRIMARY_SURFACE_ORDER)) {
      failures.push(`narrow primary controls are not ${PRIMARY_SURFACE_ORDER.join(' -> ')}: ${state.labels.primaryControls.join(' -> ')}`);
    }
    if (!state.visibleState.header) failures.push('narrow standard workspace header/menu is not visible');
    if (state.visibleState.rightPanel) failures.push('narrow standard workspace unexpectedly keeps right panel docked');
  }

  if (width >= 768 && width <= 900) {
    if (!state.visibleState.primaryControls && !state.rects.rightStrip?.visible) {
      failures.push('768-900px constrained workspace lacks right-tool recovery controls');
    }
    if (state.visibleState.rightPanel) failures.push('768-900px constrained workspace keeps right panel docked');
  }

  if (width <= 1024 && leftRect?.width >= 300) {
    failures.push(`left panel remains full docked at constrained width (${leftRect.width}px at ${width}px)`);
  }

  if (height <= 480) {
    if (leftRect?.width >= 300 && leftRect.height >= height) {
      failures.push('short-height viewport keeps a full docked left panel');
    }
    if (state.visibleState.rightPanel) {
      failures.push('short-height viewport keeps right panel docked instead of drawer/strip recovery');
    }
    if (!state.visibleState.primaryControls) failures.push('short-height viewport lacks recoverable primary controls');
  }

  if (name === 'small-desktop-1024x768') {
    if (centerRect?.width < CENTER_MIN_WIDTH) failures.push(`1024 center width ${centerRect?.width}px is below practical minimum`);
    if (!state.visibleState.primaryControls) failures.push('1024 left-strip/right-docked band lacks primary controls for Runs access');
  }

  if (name === 'desktop-1280x800' || name === 'wide-1440x900') {
    if (!leftRect || leftRect.width < 300) failures.push(`${name} does not keep left panel docked`);
    if (!state.visibleState.rightPanel || rightPanelRect?.width < 400) failures.push(`${name} does not keep right tools docked`);
    if (centerRect?.width < CENTER_MIN_WIDTH) failures.push(`${name} center width ${centerRect?.width}px is below practical minimum`);
  }

  const visibleTools = [...state.labels.rightPanel, ...state.labels.rightStrip].filter(Boolean);
  if (visibleTools.length > 1 && !orderedSubsequence(visibleTools, CANONICAL_TOOL_ORDER)) {
    failures.push(`visible right-tool order is not canonical: ${visibleTools.join(' -> ')}`);
  }

  if (state.visibleState.rightPanel && state.rightPanelTabs?.length) {
    const tabListRect = state.rects.rightPanelTabList?.rect;
    if (tabListRect) {
      for (const tab of state.rightPanelTabs.filter((candidate) => candidate.visible)) {
        if (tab.rect && (tab.rect.left < tabListRect.x - 1 || tab.rect.right > tabListRect.right + 1)) {
          failures.push(`right panel tab "${tab.label}" is clipped or outside the visible tab list`);
        }
      }
    }
  }

  return failures;
}

function validateRightDrawerTabFit(state) {
  const failures = [];
  if (!state.rects.rightDrawer?.visible || !state.rightDrawerTabs?.length) return failures;

  const tabListRect = state.rects.rightDrawerTabList?.rect;
  if (!tabListRect) return failures;

  for (const tab of state.rightDrawerTabs.filter((candidate) => candidate.visible)) {
    if (tab.rect && (tab.rect.left < tabListRect.x - 1 || tab.rect.right > tabListRect.right + 1)) {
      failures.push(`drawer tab "${tab.label}" is clipped or outside the visible tab list`);
    }
  }

  return failures;
}

async function validatePrimaryControlInteractions(page, initialState) {
  const interactionResults = [];
  const hasControls = labelsEqualPrefix(initialState.labels.primaryControls, PRIMARY_SURFACE_ORDER);
  if (!hasControls) return interactionResults;

  const clickRuns = await clickButtonByLabel(page, '[data-test="workspace-primary-surface-controls"]', 'Runs');
  await page.waitForTimeout(250);
  const afterRuns = await collect(page, 'after-runs');
  interactionResults.push({ action: 'click Runs', clicked: clickRuns, state: afterRuns });

  await clickBackdropOutsideLeftDrawer(page);
  await clickButtonByLabel(page, '[data-test="workspace-primary-surface-controls"]', 'Work');
  await page.waitForTimeout(150);

  const clickFiles = await clickButtonByLabel(page, '[data-test="workspace-primary-surface-controls"]', 'Files');
  await page.waitForTimeout(250);
  const afterFiles = await collect(page, 'after-files');
  interactionResults.push({ action: 'click Files', clicked: clickFiles, state: afterFiles });

  await clickButtonByLabel(page, '[data-test="workspace-primary-surface-controls"]', 'Work');
  await page.waitForTimeout(150);

  const clickTools = await clickButtonByLabel(page, '[data-test="workspace-primary-surface-controls"]', 'Tools');
  await page.waitForTimeout(250);
  const afterTools = await collect(page, 'after-tools');
  interactionResults.push({ action: 'click Tools', clicked: clickTools, state: afterTools });

  await clickButtonByLabel(page, '[data-test="workspace-primary-surface-controls"]', 'Work');
  await page.waitForTimeout(150);

  return interactionResults;
}

function validateInteractions(interactions) {
  const failures = [];
  for (const interaction of interactions) {
    if (!interaction.clicked) failures.push(`${interaction.action} target was not found`);
    if (interaction.action === 'click Runs' && !interaction.state.rects.leftAside?.visible) {
      failures.push('Runs control did not open a visible left drawer/history surface');
    }
    if (interaction.action === 'click Files' && !interaction.state.rects.rightDrawer?.visible) {
      failures.push('Files control did not open the right tool drawer');
    }
    if (interaction.action === 'click Files') {
      failures.push(...validateRightDrawerTabFit(interaction.state));
    }
    if (interaction.action === 'click Tools') {
      if (!interaction.state.rects.rightDrawer?.visible) failures.push('Tools control did not open the right tool drawer');
      if (interaction.state.labels.rightDrawer.length > 1 && !orderedSubsequence(interaction.state.labels.rightDrawer, CANONICAL_TOOL_ORDER)) {
        failures.push(`drawer right-tool order is not canonical: ${interaction.state.labels.rightDrawer.join(' -> ')}`);
      }
      failures.push(...validateRightDrawerTabFit(interaction.state));
    }
  }
  return failures;
}

function validateMobileRoute(state) {
  const failures = [];
  if (!state.rects.mobileShell?.visible) failures.push('/mobile did not render MobileRemoteAccessShell');
  if (state.visibleState.adaptive) failures.push('/mobile unexpectedly rendered standard workspace adaptive layout');
  if (!/Connect this phone|AUTOBYTEUS REMOTE ACCESS|Mobile|Phone Access|Pair/i.test(state.bodyText)) {
    failures.push('/mobile route text does not look like the phone/PWA remote-access shell');
  }
  return failures;
}

const run = async () => {
  await ensureDir(outputDir);
  if (!executablePath) {
    throw new Error('No Chrome/Chromium executable found. Pass --browser-executable or set PLAYWRIGHT_CHROME_EXECUTABLE_PATH.');
  }

  const browser = await chromium.launch({ headless: true, executablePath });
  const results = [];
  const failures = [];

  try {
    for (const viewport of DEFAULT_VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
      const consoleMessages = [];
      page.on('console', (message) => {
        const text = message.text();
        if (/error|warn|failed|graphql|apollo|websocket|workspace/i.test(text)) {
          consoleMessages.push({ type: message.type(), text });
        }
      });
      const pageFailures = [];
      const screenshotPath = path.join(outputDir, `${viewport.name}.png`);
      try {
        await page.goto(`${baseUrl}/workspace`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('[data-test="workspace-adaptive-layout"]', { state: 'visible', timeout: 20000 });
        await page.waitForTimeout(300);
        const initial = await collect(page, 'initial');
        pageFailures.push(...validateWorkspaceInitial(initial, viewport));

        const shouldExerciseControls = viewport.width <= 900 || viewport.height <= 480 || ['small-desktop-1024x768'].includes(viewport.name);
        const interactions = shouldExerciseControls ? await validatePrimaryControlInteractions(page, initial) : [];
        pageFailures.push(...validateInteractions(interactions));

        if (screenshotMode === 'all' || (screenshotMode === 'failures' && pageFailures.length > 0)) {
          await page.screenshot({ path: screenshotPath, fullPage: false });
        }

        if (failOnConsoleError) {
          const consoleErrors = consoleMessages.filter((message) => message.type === 'error');
          if (consoleErrors.length) pageFailures.push(`console errors: ${consoleErrors.map((message) => message.text).join(' | ')}`);
        }

        results.push({ viewport, screenshot: screenshotPath, consoleMessages, initial, interactions, failures: pageFailures });
        for (const failure of pageFailures) failures.push(`${viewport.name}: ${failure}`);
      } finally {
        await page.close();
      }
    }

    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    try {
      await mobilePage.goto(`${baseUrl}/mobile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await mobilePage.waitForSelector('[data-testid="mobile-remote-access-shell"]', { state: 'visible', timeout: 20000 });
      await mobilePage.waitForTimeout(300);
      const mobileState = await collect(mobilePage, 'mobile-route');
      const mobileFailures = validateMobileRoute(mobileState);
      const mobileScreenshotPath = path.join(outputDir, 'mobile-route-390x844.png');
      if (screenshotMode === 'all' || (screenshotMode === 'failures' && mobileFailures.length > 0)) {
        await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: false });
      }
      results.push({ viewport: { name: 'mobile-route-390x844', width: 390, height: 844 }, route: '/mobile', screenshot: mobileScreenshotPath, initial: mobileState, interactions: [], failures: mobileFailures });
      for (const failure of mobileFailures) failures.push(`mobile-route-390x844: ${failure}`);
    } finally {
      await mobilePage.close();
    }
  } finally {
    await browser.close();
  }

  const output = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    executablePath,
    viewportCount: DEFAULT_VIEWPORTS.length,
    result: failures.length ? 'Fail' : 'Pass',
    failures,
    results,
    summary: results.map((result) => ({
      viewport: result.viewport.name,
      route: result.route || '/workspace',
      size: `${result.viewport.width}x${result.viewport.height}`,
      failures: result.failures,
      centerRect: result.initial?.rects?.centerShell?.rect,
      leftRect: result.initial?.rects?.leftAside?.rect,
      rightRect: result.initial?.rects?.rightPanel?.rect,
      rightStripRect: result.initial?.rects?.rightStrip?.rect,
      primaryControls: result.initial?.labels?.primaryControls,
      rightPanelControls: result.initial?.labels?.rightPanel,
      rightStripControls: result.initial?.labels?.rightStrip,
      mobileShellVisible: result.initial?.rects?.mobileShell?.visible,
      screenshot: result.screenshot,
    })),
  };

  const jsonPath = path.join(outputDir, 'workspace-responsive-probe-results.json');
  await fs.writeFile(jsonPath, JSON.stringify(output, null, 2));

  const summaryPath = path.join(outputDir, 'workspace-responsive-probe-summary.json');
  await fs.writeFile(summaryPath, JSON.stringify({
    generatedAt: output.generatedAt,
    result: output.result,
    failures,
    summary: output.summary,
  }, null, 2));

  console.log(JSON.stringify({
    result: output.result,
    jsonPath,
    summaryPath,
    failures,
    summary: output.summary,
  }, null, 2));

  if (failures.length) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
