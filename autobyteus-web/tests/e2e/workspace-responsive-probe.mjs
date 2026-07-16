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
const CANONICAL_TOOL_ORDER = ['Files', 'Team', 'Terminal', 'Activity', 'Token', 'Artifacts', 'Browser', 'VNC Viewer'];
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

    const tabLabelsIn = (selector) => {
      const root = document.querySelector(selector);
      if (!root) return [];
      return Array.from(root.querySelectorAll('[role="tab"]'))
        .filter((tab) => visible(tab))
        .map(buttonLabel)
        .filter(Boolean);
    };

    const rightPanelLabels = tabLabelsIn('[data-test="workspace-right-panel"]');
    const rightStripLabels = labelsIn('[data-test="workspace-right-tool-strip"]')
      .filter((labelText) => !/toggle sidebar/i.test(labelText) && !['‹', '›'].includes(labelText));
    const rightDrawerLabels = tabLabelsIn('[data-test="workspace-right-tool-drawer"]');
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
    const tabButtonDetails = (button) => ({
      label: buttonLabel(button),
      name: button.dataset.tabName || '',
      visible: visible(button),
      rendered: getComputedStyle(button).display !== 'none' && getComputedStyle(button).visibility !== 'hidden' && button.getBoundingClientRect().width > 0,
      rect: rect(button),
      ariaSelected: button.getAttribute('aria-selected'),
      tabIndex: button.tabIndex,
      focused: document.activeElement === button,
      activeUnderline: Boolean(button.querySelector('.bg-blue-600')),
    });

    const affordanceDetails = (button) => button ? ({
      visible: visible(button),
      rect: rect(button),
      ariaLabel: button.getAttribute('aria-label') || '',
      title: button.getAttribute('title') || '',
    }) : null;

    const tabListDetails = (tabList) => {
      if (!tabList) return null;
      const style = getComputedStyle(tabList);
      const tabButtons = Array.from(tabList.querySelectorAll('[role="tab"]'));
      const tabRects = tabButtons.map((button) => button.getBoundingClientRect());
      const uniqueRowTops = [...new Set(tabRects.map((tabRect) => Math.round(tabRect.top)))];
      return {
        rect: rect(tabList),
        role: tabList.getAttribute('role') || '',
        ariaLabel: tabList.getAttribute('aria-label') || '',
        styles: {
          flexWrap: style.flexWrap,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          whiteSpace: style.whiteSpace,
        },
        clientWidth: tabList.clientWidth,
        scrollWidth: tabList.scrollWidth,
        clientHeight: tabList.clientHeight,
        scrollHeight: tabList.scrollHeight,
        scrollLeft: Math.round(tabList.scrollLeft),
        maxScrollLeft: Math.max(0, Math.round(tabList.scrollWidth - tabList.clientWidth)),
        hasHorizontalOverflow: tabList.scrollWidth > tabList.clientWidth + 1,
        rowTops: uniqueRowTops,
        tabs: tabButtons.map(tabButtonDetails),
        leftFade: affordanceDetails(tabList.querySelector('[data-test="tab-list-left-fade"]')),
        rightFade: affordanceDetails(tabList.querySelector('[data-test="tab-list-right-fade"]')),
        leftChevron: affordanceDetails(tabList.querySelector('[data-test="tab-list-scroll-left"]')),
        rightChevron: affordanceDetails(tabList.querySelector('[data-test="tab-list-scroll-right"]')),
      };
    };

    const rightPanelTabListDetails = tabListDetails(rightPanelTabList);
    const rightDrawerTabListDetails = tabListDetails(rightDrawerTabList);
    const rightPanelTabs = rightPanelTabListDetails?.tabs ?? [];
    const rightDrawerTabs = rightDrawerTabListDetails?.tabs ?? [];
    const panelToggle = document.querySelector('[data-test="right-side-panel-toggle"]');

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
        panelToggle: elementInfo('[data-test="right-side-panel-toggle"]'),
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
      rightPanelTabList: rightPanelTabListDetails,
      rightDrawerTabList: rightDrawerTabListDetails,
      panelToggle: panelToggle ? {
        visible: visible(panelToggle),
        rect: rect(panelToggle),
        ariaLabel: panelToggle.getAttribute('aria-label') || '',
        title: panelToggle.getAttribute('title') || '',
      } : null,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
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

async function clickTabAffordance(page, rootSelector, dataTest) {
  return await page.evaluate(({ selector, test }) => {
    const root = document.querySelector(selector);
    const button = root?.querySelector(`[data-test="${test}"]`);
    if (!button) return false;
    const style = getComputedStyle(button);
    const buttonRect = button.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      buttonRect.width <= 0 ||
      buttonRect.height <= 0 ||
      buttonRect.left < rootRect.left ||
      buttonRect.right > rootRect.right ||
      buttonRect.top < rootRect.top ||
      buttonRect.bottom > rootRect.bottom
    ) return false;
    button.click();
    return true;
  }, { selector: rootSelector, test: dataTest });
}

async function focusTabAndCollect(page, rootSelector, tabName, label, click = false) {
  const found = await page.evaluate(({ selector, name, shouldClick }) => {
    const root = document.querySelector(selector);
    const tab = root?.querySelector(`[data-tab-name="${name}"]`);
    if (!tab) return false;
    // Re-focus even when the deterministic setup already left this tab as the
    // active element; otherwise no native focus event is emitted and the
    // production focus-to-scroll path is not exercised.
    if (document.activeElement === tab) tab.blur();
    tab.focus();
    if (shouldClick) tab.click();
    return true;
  }, { selector: rootSelector, name: tabName, shouldClick: click });
  // The production path uses smooth scrolling unless reduced motion is
  // requested. Allow that browser animation to settle before observing the
  // resulting tab geometry.
  await page.waitForTimeout(1200);
  return { found, state: await collect(page, label) };
}

async function resetTabListToStart(page, rootSelector) {
  await page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return;
    if (typeof root.scrollTo === 'function') root.scrollTo({ left: 0, behavior: 'auto' });
    else root.scrollLeft = 0;
    root.dispatchEvent(new Event('scroll'));
  }, rootSelector);
  await page.waitForTimeout(100);
}

async function exerciseTabList(page, rootSelector, initialState, context) {
  const listKey = context === 'drawer' ? 'rightDrawerTabList' : 'rightPanelTabList';
  const initial = initialState[listKey];
  const failures = validateTabListContract(initial, context);
  const checks = { initial };
  if (!initial || !initial.hasHorizontalOverflow) return { failures, checks };

  // An active tab is intentionally auto-scrolled into view. Select the first
  // tab before resetting so this deterministic setup does not race that
  // approved active-tab behavior when the preceding surface left a later tab
  // selected.
  await focusTabAndCollect(page, rootSelector, 'files', `${context}-tab-reset-selection`, true);
  await resetTabListToStart(page, rootSelector);
  const resetState = await collect(page, `${context}-tab-reset`);
  const reset = resetState[listKey];
  checks.reset = reset;
  failures.push(...validateTabListContract(reset, `${context} reset`));

  const rightClicked = await clickTabAffordance(page, rootSelector, 'tab-list-scroll-right');
  await page.waitForTimeout(700);
  const afterRightState = await collect(page, `${context}-tab-after-right`);
  const afterRight = afterRightState[listKey];
  checks.afterRight = afterRight;
  if (!rightClicked) failures.push(`${context} right overflow control was not clickable`);
  if (afterRight.scrollLeft <= reset.scrollLeft + 1) failures.push(`${context} right overflow control did not advance the native scroll position`);
  failures.push(...validateTabListContract(afterRight, `${context} after right scroll`));

  const firstFocused = await focusTabAndCollect(page, rootSelector, 'files', `${context}-tab-first-focused`);
  const firstFocus = firstFocused.state[listKey];
  checks.firstFocused = firstFocus;
  if (!firstFocused.found) failures.push(`${context} Files tab could not receive focus`);
  if (!firstFocus.tabs.find((tab) => tab.name === 'files')?.focused) failures.push(`${context} Files tab focus was not observed`);
  if (!isTabFullyInView(firstFocus, 'files')) failures.push(`${context} focused Files tab was not scrolled into view`);
  failures.push(...validateTabListContract(firstFocus, `${context} after Files focus`));

  const firstSelected = await focusTabAndCollect(page, rootSelector, 'files', `${context}-tab-first-selected`, true);
  const firstSelect = firstSelected.state[listKey];
  checks.firstSelected = firstSelect;
  if (!firstSelected.found) failures.push(`${context} Files tab could not be selected`);
  if (firstSelect.tabs.find((tab) => tab.name === 'files')?.ariaSelected !== 'true') failures.push(`${context} Files tab selection was not reflected in aria-selected`);
  if (!isTabFullyInView(firstSelect, 'files')) failures.push(`${context} selected Files tab was not scrolled into view`);
  failures.push(...validateTabListContract(firstSelect, `${context} after Files selection`));

  const lastFocused = await focusTabAndCollect(page, rootSelector, 'vnc', `${context}-tab-last-focused`);
  const lastFocus = lastFocused.state[listKey];
  const lastFocusState = lastFocused.state;
  checks.lastFocused = lastFocus;
  if (!lastFocused.found) failures.push(`${context} VNC Viewer tab could not receive focus`);
  if (!lastFocus.tabs.find((tab) => tab.name === 'vnc')?.focused) failures.push(`${context} VNC Viewer tab focus was not observed`);
  if (!isTabFullyInView(lastFocus, 'vnc')) failures.push(`${context} focused VNC Viewer tab was not scrolled into view`);
  failures.push(...validateTabListContract(lastFocus, `${context} after VNC Viewer focus`));

  // Focus VNC Viewer to prove the offscreen tab is reachable and auto-scrolls
  // without selecting it. Selecting VNC starts external WebSocket sessions;
  // no VNC service is part of this deterministic workspace fixture, so the
  // selection path is covered by Files above while console-error enforcement
  // remains enabled for all browser runs.
  const leftBefore = lastFocus.scrollLeft;
  const leftClicked = await clickTabAffordance(page, rootSelector, 'tab-list-scroll-left');
  await page.waitForTimeout(700);
  const afterLeftState = await collect(page, `${context}-tab-after-left`);
  const afterLeft = afterLeftState[listKey];
  checks.afterLeft = afterLeft;
  if (!leftClicked) failures.push(`${context} left overflow control was not clickable`);
  if (afterLeft.scrollLeft >= leftBefore - 1) failures.push(`${context} left overflow control did not reverse the native scroll position`);
  failures.push(...validateTabListContract(afterLeft, `${context} after left scroll`));

  if (context === 'docked' && initialState.panelToggle?.visible && lastFocusState.panelToggle?.rect) {
    const initialToggle = initialState.panelToggle.rect;
    const finalToggle = lastFocusState.panelToggle.rect;
    if (Math.abs(initialToggle.x - finalToggle.x) > 1 || Math.abs(initialToggle.right - finalToggle.right) > 1) {
      failures.push('docked panel toggle moved with tab-list scrolling');
    }
  }

  return { failures, checks };
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

  if (state.visibleState.rightPanel) {
    failures.push(...validateTabListContract(state.rightPanelTabList, 'right panel'));
    if (!state.panelToggle?.visible) {
      failures.push('right panel toggle affordance is not visible');
    } else if (state.panelToggle.rect && state.rightPanelTabList?.rect && state.panelToggle.rect.left < state.rightPanelTabList.rect.right - 1) {
      failures.push('right panel toggle overlaps or scrolls with the tab-list header');
    }
  }

  return failures;
}

function isTabFullyInView(tabList, tabName) {
  if (!tabList?.rect) return false;
  const tab = tabList.tabs?.find((candidate) => candidate.name === tabName);
  if (!tab?.rect) return false;
  const leftInset = 4;
  const rightInset = 4;
  return tab.rect.x >= tabList.rect.x + leftInset - 1 &&
    tab.rect.right <= tabList.rect.right - rightInset + 1;
}

function validateTabListContract(tabList, context) {
  const failures = [];
  if (!tabList) return failures;

  if (tabList.role !== 'tablist') failures.push(`${context} tab-list is missing role=tablist`);
  if (tabList.styles.flexWrap !== 'nowrap') failures.push(`${context} tab-list wraps instead of remaining one row`);
  if (tabList.styles.overflowX !== 'auto') failures.push(`${context} tab-list is not horizontally scrollable`);
  if (tabList.styles.overflowY !== 'hidden') failures.push(`${context} tab-list exposes vertical overflow`);
  if (tabList.styles.whiteSpace !== 'nowrap') failures.push(`${context} tab-list does not preserve one-row whitespace`);
  if (tabList.rowTops.length > 1) failures.push(`${context} tab-list renders multiple tab rows`);

  const tabs = tabList.tabs.filter((tab) => tab.rendered);
  const labels = tabs.map((tab) => tab.label);
  if (tabs.length > 1 && !orderedSubsequence(labels, CANONICAL_TOOL_ORDER)) {
    failures.push(`${context} tab order is not canonical: ${labels.join(' -> ')}`);
  }
  const selectedTabs = tabs.filter((tab) => tab.ariaSelected === 'true');
  if (tabs.length > 0 && selectedTabs.length !== 1) {
    failures.push(`${context} tab-list does not expose exactly one aria-selected tab`);
  }
  if (selectedTabs.length === 1 && !selectedTabs[0].activeUnderline) {
    failures.push(`${context} active tab is missing its active underline`);
  }
  if (tabs.some((tab) => tab.ariaSelected !== 'true' && tab.ariaSelected !== 'false')) {
    failures.push(`${context} tab-list has a tab without aria-selected semantics`);
  }

  const atStart = tabList.scrollLeft <= 1;
  const atEnd = tabList.scrollLeft >= tabList.maxScrollLeft - 1;
  const leftVisible = Boolean(tabList.leftChevron?.visible);
  const rightVisible = Boolean(tabList.rightChevron?.visible);
  const leftFadeVisible = Boolean(tabList.leftFade?.visible);
  const rightFadeVisible = Boolean(tabList.rightFade?.visible);

  if (!tabList.hasHorizontalOverflow) {
    if (leftVisible || rightVisible || leftFadeVisible || rightFadeVisible) {
      failures.push(`${context} shows overflow affordances without hidden tab content`);
    }
  } else {
    if (atStart && (leftVisible || leftFadeVisible)) failures.push(`${context} shows a left overflow affordance at the left boundary`);
    if (atStart && !atEnd && (!rightVisible || !rightFadeVisible)) failures.push(`${context} hides the right overflow affordance at the left boundary`);
    if (atEnd && (rightVisible || rightFadeVisible)) failures.push(`${context} shows a right overflow affordance at the right boundary`);
    if (atEnd && !atStart && (!leftVisible || !leftFadeVisible)) failures.push(`${context} hides the left overflow affordance at the right boundary`);
    if (!atStart && !atEnd && (!leftVisible || !rightVisible || !leftFadeVisible || !rightFadeVisible)) {
      failures.push(`${context} does not update both overflow affordances in the middle scroll position`);
    }
    if (leftVisible && !tabList.leftChevron.ariaLabel) failures.push(`${context} left overflow control has no accessible label`);
    if (rightVisible && !tabList.rightChevron.ariaLabel) failures.push(`${context} right overflow control has no accessible label`);
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
  const afterFilesTabValidation = await exerciseTabList(
    page,
    '[data-test="workspace-right-tool-drawer"] [data-test="right-side-tab-list"]',
    afterFiles,
    'drawer',
  );
  interactionResults.push({ action: 'click Files', clicked: clickFiles, state: afterFiles, tabValidation: afterFilesTabValidation });

  await clickButtonByLabel(page, '[data-test="workspace-primary-surface-controls"]', 'Work');
  await page.waitForTimeout(150);

  const clickTools = await clickButtonByLabel(page, '[data-test="workspace-primary-surface-controls"]', 'Tools');
  await page.waitForTimeout(250);
  const afterTools = await collect(page, 'after-tools');
  const afterToolsTabValidation = await exerciseTabList(
    page,
    '[data-test="workspace-right-tool-drawer"] [data-test="right-side-tab-list"]',
    afterTools,
    'drawer',
  );
  interactionResults.push({ action: 'click Tools', clicked: clickTools, state: afterTools, tabValidation: afterToolsTabValidation });

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
    if (interaction.action === 'click Tools') {
      if (!interaction.state.rects.rightDrawer?.visible) failures.push('Tools control did not open the right tool drawer');
      if (interaction.state.labels.rightDrawer.length > 1 && !orderedSubsequence(interaction.state.labels.rightDrawer, CANONICAL_TOOL_ORDER)) {
        failures.push(`drawer right-tool order is not canonical: ${interaction.state.labels.rightDrawer.join(' -> ')}`);
      }
    }
    failures.push(...(interaction.tabValidation?.failures ?? []));
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
        await page.emulateMedia({ reducedMotion: viewport.name === 'small-desktop-short-1024x480' ? 'reduce' : 'no-preference' });
        await page.goto(`${baseUrl}/workspace`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('[data-test="workspace-adaptive-layout"]', { state: 'visible', timeout: 20000 });
        await page.waitForTimeout(300);
        const initial = await collect(page, 'initial');
        pageFailures.push(...validateWorkspaceInitial(initial, viewport));

        let initialTabValidation = null;
        if (initial.visibleState.rightPanel) {
          initialTabValidation = await exerciseTabList(
            page,
            '[data-test="workspace-right-panel"] [data-test="right-side-tab-list"]',
            initial,
            'docked',
          );
          pageFailures.push(...initialTabValidation.failures);
        }

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

        results.push({ viewport, screenshot: screenshotPath, consoleMessages, initial, initialTabValidation, interactions, failures: pageFailures });
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
