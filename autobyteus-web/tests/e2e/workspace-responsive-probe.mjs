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

const CANONICAL_TOOL_ORDER = ['Files', 'Team', 'Terminal', 'Activity', 'Token', 'Artifacts', 'Browser', 'VNC Viewer'];
const CENTER_MIN_WIDTH = 480;
const USER_RESIZE_CENTER_MIN_WIDTH = 200;
const LEFT_PANEL_RESIZE_HANDLE_WIDTH = 6;
const RIGHT_PANEL_RESIZE_HANDLE_WIDTH = 4;
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
        zIndex: cs.zIndex,
        ariaModal: el.getAttribute('aria-modal'),
        overflow: `${cs.overflowX}/${cs.overflowY}`,
        rect: rect(el),
        text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 800),
        classes: el.getAttribute('class') || '',
        stripBehavior: el.getAttribute('data-strip-behavior') || null,
        stripActivation: el.getAttribute('data-strip-activation') || null,
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
    const semanticTriggerLabels = labelsIn('[data-test="workspace-semantic-surface-triggers"]');
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
    const semanticTriggers = document.querySelector('[data-test="workspace-semantic-surface-triggers"]');
    const legacyGenericSurfaceBar = document.querySelector('[data-test="workspace-primary-surface-controls"]');
    const workspaceEmptyState = document.querySelector('[data-test="workspace-empty-state"]');
    const emptyStateChoose = document.querySelector('[data-test="workspace-empty-state-choose"]');
    const emptyStateRuns = document.querySelector('[data-test="workspace-empty-state-runs"]');
    const navigationTrigger = document.querySelector('[data-test="workspace-navigation-trigger"]');
    const leftNavigationDrawer = document.querySelector('[data-test="app-left-navigation-drawer"]');
    const leftStrip = document.querySelector('[data-test="workspace-left-navigation-strip"]');
    const leftPanelShell = document.querySelector('[data-test="app-left-navigation-drawer"], [data-test="app-left-panel-shell"]');
    const leftPanelRunHistory = document.querySelector('[data-test="app-left-panel-run-history"]');
    const leftHistoryScrollOwner = leftPanelRunHistory?.querySelector('div.h-full.overflow-y-auto');
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
    const activeElement = document.activeElement;

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
        centerRightFlow: elementInfo('[data-test="workspace-center-right-flow"]'),
        oldDesktop: elementInfo('[data-test="workspace-desktop-layout"]'),
        centerPane: elementInfo('[data-test="workspace-center-pane"]'),
        centerShell: elementInfo('[data-test="workspace-center-content-shell"]'),
        semanticTriggers: elementInfo('[data-test="workspace-semantic-surface-triggers"]'),
        legacyGenericSurfaceBar: elementInfo('[data-test="workspace-primary-surface-controls"]'),
        emptyState: elementInfo('[data-test="workspace-empty-state"]'),
        emptyStateChoose: elementInfo('[data-test="workspace-empty-state-choose"]'),
        emptyStateRuns: elementInfo('[data-test="workspace-empty-state-runs"]'),
        navigationTrigger: elementInfo('[data-test="workspace-navigation-trigger"]'),
        leftDrawerBackdrop: elementInfo('[data-test="app-left-drawer-backdrop"]'),
        leftNavigationDrawer: elementInfo('[data-test="app-left-navigation-drawer"]'),
        leftStrip: elementInfo('[data-test="workspace-left-navigation-strip"]'),
        leftPanelShell: elementInfo('[data-test="app-left-navigation-drawer"], [data-test="app-left-panel-shell"]'),
        leftPanelRunHistory: elementInfo('[data-test="app-left-panel-run-history"]'),
        rightPanel: elementInfo('[data-test="workspace-right-panel"]'),
        rightPanelTabList: elementInfo('[data-test="workspace-right-panel"] [data-test="right-side-tab-list"]'),
        rightStrip: elementInfo('[data-test="workspace-right-tool-strip"]'),
        rightDrawerBackdrop: elementInfo('[data-test="workspace-right-tool-drawer-backdrop"]'),
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
        semanticTriggers: visible(semanticTriggers),
        legacyGenericSurfaceBar: visible(legacyGenericSurfaceBar),
        emptyState: visible(workspaceEmptyState),
        navigationTrigger: visible(navigationTrigger),
        leftNavigationDrawer: visible(leftNavigationDrawer),
        leftStrip: visible(leftStrip),
        leftAside: visible(leftAside),
        oldDesktop: visible(oldDesktop),
      },
      labels: {
        semanticTriggers: semanticTriggerLabels,
        rightPanel: rightPanelLabels,
        rightStrip: rightStripLabels,
        rightDrawer: rightDrawerLabels,
        topVisible: topVisibleLabels,
      },
      rightPanelTabs,
      rightDrawerTabs,
      rightPanelTabList: rightPanelTabListDetails,
      rightDrawerTabList: rightDrawerTabListDetails,
      activeElement: {
        dataTest: activeElement?.getAttribute?.('data-test') || '',
        ariaLabel: activeElement?.getAttribute?.('aria-label') || '',
        insideLeftDrawer: Boolean(leftNavigationDrawer?.contains(activeElement)),
        insideRightDrawer: Boolean(rightDrawer?.contains(activeElement)),
        insideLeftStrip: Boolean(leftStrip?.contains(activeElement)),
        insideRightStrip: Boolean(document.querySelector('[data-test="workspace-right-tool-strip"]')?.contains(activeElement)),
      },
      panelToggle: panelToggle ? {
        visible: visible(panelToggle),
        rect: rect(panelToggle),
        ariaLabel: panelToggle.getAttribute('aria-label') || '',
        title: panelToggle.getAttribute('title') || '',
      } : null,
      leftPanelLayout: leftPanelShell ? (() => {
        const shellStyle = getComputedStyle(leftPanelShell);
        const historyStyle = leftPanelRunHistory ? getComputedStyle(leftPanelRunHistory) : null;
        const ownerStyle = leftHistoryScrollOwner ? getComputedStyle(leftHistoryScrollOwner) : null;
        return {
          shell: {
            display: shellStyle.display,
            flexDirection: shellStyle.flexDirection,
            minHeight: shellStyle.minHeight,
            height: Math.round(leftPanelShell.getBoundingClientRect().height),
          },
          history: leftPanelRunHistory ? {
            display: historyStyle.display,
            minHeight: historyStyle.minHeight,
            flex: historyStyle.flex,
            height: Math.round(leftPanelRunHistory.getBoundingClientRect().height),
          } : null,
          scrollOwner: leftHistoryScrollOwner ? {
            overflowY: ownerStyle.overflowY,
            clientHeight: leftHistoryScrollOwner.clientHeight,
            scrollHeight: leftHistoryScrollOwner.scrollHeight,
            scrollTop: Math.round(leftHistoryScrollOwner.scrollTop),
          } : null,
        };
      })() : null,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      media: {
        min640: matchMedia('(min-width: 640px)').matches,
        min768: matchMedia('(min-width: 768px)').matches,
        min1024: matchMedia('(min-width: 1024px)').matches,
      },
    };
  }, label);
}

async function clickButtonByTest(page, dataTest, rootSelector = 'body') {
  const target = page.locator(rootSelector).locator(`[data-test="${dataTest}"]`).first();
  if (!(await target.isVisible().catch(() => false))) return false;
  await target.click();
  return true;
}

async function clickFirstButton(page, rootSelector) {
  const target = page.locator(rootSelector).locator('button').first();
  if (!(await target.isVisible().catch(() => false))) return false;
  await target.click();
  return true;
}

async function clickTopmostDrawerBackdrop(page) {
  const point = await page.evaluate(() => {
    for (let y = 8; y < innerHeight - 8; y += 8) {
      for (let x = 8; x < innerWidth - 8; x += 8) {
        const element = document.elementFromPoint(x, y);
        const backdrop = element?.closest('[data-test$="-drawer-backdrop"]');
        if (backdrop) {
          return {
            x,
            y,
            dataTest: backdrop.getAttribute('data-test') || '',
          };
        }
      }
    }
    return null;
  });

  if (!point) return null;
  await page.mouse.click(point.x, point.y);
  return point.dataTest;
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
  if (state.visibleState.legacyGenericSurfaceBar || state.rects.legacyGenericSurfaceBar) {
    failures.push('legacy generic Work/Runs/Files/Tools surface row is present');
  }
  if (!state.visibleState.emptyState) failures.push('workspace empty state is not visible for the no-selection fixture');
  if (!state.rects.emptyStateChoose?.visible) failures.push('empty state lacks the semantic agent/team selection action');
  if (!state.rects.emptyStateRuns?.visible) failures.push('empty state lacks the semantic run-history action');
  if (state.visibleState.main && !mainTextWithoutChrome && !state.visibleState.adaptive) failures.push('main workspace region appears blank');
  failures.push(...validateLeftPanelLayout(state, 'initial left panel'));
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
    if (state.visibleState.header) failures.push('narrow standard workspace unexpectedly renders a responsive header/menu');
    if (state.visibleState.rightPanel) failures.push('narrow standard workspace unexpectedly keeps right panel docked');
    if (state.visibleState.semanticTriggers || state.visibleState.navigationTrigger) failures.push('narrow workspace renders duplicate top navigation controls');
    if (!state.rects.leftStrip?.visible) failures.push('narrow workspace lacks the left-edge navigation strip');
    if (state.rects.leftStrip?.stripBehavior !== 'overlay') failures.push('narrow workspace left strip is not an edge overlay');
    if (state.rects.leftStrip?.stripActivation !== 'open-drawer') failures.push('narrow workspace left strip does not expose open-drawer activation');
    if (!state.rects.rightStrip?.visible) failures.push('narrow workspace lacks the right-edge tools strip');
    if (state.rects.rightStrip?.stripBehavior !== 'overlay') failures.push('narrow workspace right strip is not an edge overlay');
    if (state.rects.rightStrip?.stripActivation !== 'open-drawer') failures.push('narrow workspace right strip does not expose open-drawer activation');
  }

  if (width >= 768 && width <= 900) {
    if (state.visibleState.rightPanel) failures.push('768-900px constrained workspace keeps right panel docked');
    if (!state.rects.rightStrip?.visible) {
      failures.push('768-900px constrained workspace lacks the right-tool strip');
    } else if (state.rects.rightStrip.stripActivation !== 'open-drawer') {
      failures.push('768-900px constrained right strip does not expose open-drawer activation');
    }
    if (!state.visibleState.leftAside && !state.rects.leftStrip?.visible) {
      failures.push('768-900px constrained workspace lacks a left navigation surface');
    }
  }

  if (height <= 480) {
    if (state.visibleState.rightPanel) {
      failures.push('short-height viewport keeps right panel docked instead of drawer/strip recovery');
    }
    if (!state.rects.leftStrip?.visible && !state.visibleState.leftAside) failures.push('short-height viewport lacks recoverable left navigation access');
    if (!state.rects.rightStrip?.visible) failures.push('short-height viewport lacks recoverable right tools access');
  }

  if (name === 'small-desktop-1024x768') {
    if (centerRect?.width < CENTER_MIN_WIDTH) failures.push(`1024 center width ${centerRect?.width}px is below practical minimum`);
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
    } else if (state.panelToggle.rect && state.rightPanelTabList?.rect && state.panelToggle.rect.x < state.rightPanelTabList.rect.right - 1) {
      failures.push('right panel toggle overlaps or scrolls with the tab-list header');
    }
  }

  return failures;
}

async function validateRightStripReopenInteraction(page, viewport) {
  if (viewport.name !== 'desktop-1280x800') {
    return null;
  }

  const failures = [];
  // The preceding wide resize-bound journey intentionally records a
  // user-sized right-panel width. Reset the route/module state before proving
  // the independent wide manual-collapse redock contract; otherwise the
  // widened user-sized panel may correctly fail the automatic 480px redock
  // capacity check and make this scenario sequence-dependent.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('[data-test="workspace-adaptive-layout"]', { state: 'visible', timeout: 20000 });
  await page.waitForTimeout(300);

  const hidden = await clickButtonByTest(page, 'right-side-panel-toggle');
  await page.waitForTimeout(250);

  const wideStripState = await collect(page, 'right-strip-redock-before');
  if (!hidden) failures.push('docked right panel toggle was not clickable for strip reopen validation');
  if (!wideStripState.rects.rightStrip?.visible) failures.push('user-hidden right panel did not render a right-tool strip');
  if (wideStripState.rects.rightStrip?.stripActivation !== 'redock-panel') failures.push('fitting wide hidden right strip did not expose redock-panel activation');

  const redocked = await clickFirstButton(page, '[data-test="workspace-right-tool-strip"]');
  await page.waitForTimeout(300);
  const redockedState = await collect(page, 'right-strip-redock-after');
  if (!redocked) failures.push('fitting wide hidden right strip did not expose a redock control');
  if (!redockedState.visibleState.rightPanel) failures.push('redock-panel activation did not restore the docked right panel');
  if (redockedState.rects.rightStrip?.visible) failures.push('redock-panel activation left the right strip visible');

  const hiddenAgain = await clickButtonByTest(page, 'right-side-panel-toggle');
  await page.waitForTimeout(250);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.waitForTimeout(300);

  const stripState = await collect(page, 'right-strip-reopen-before');
  if (!hiddenAgain) failures.push('re-docked right panel toggle was not clickable for constrained strip validation');
  if (!stripState.rects.rightStrip?.visible) failures.push('re-hidden right panel did not render a right-tool strip');
  if (stripState.rects.rightStrip?.stripActivation !== 'open-drawer') failures.push('constrained hidden right strip did not expose open-drawer activation');

  const clicked = await clickFirstButton(page, '[data-test="workspace-right-tool-strip"]');
  await page.waitForTimeout(350);
  const drawerState = await collect(page, 'right-strip-reopen-after');
  if (!clicked) failures.push('right-tool strip did not expose a clickable reopen control');
  if (!drawerState.rects.rightDrawer?.visible) failures.push('right-tool strip reopen did not open the right tool drawer');
  if (drawerState.rects.rightStrip?.visible) failures.push('right drawer open state kept the right strip visible');

  return {
    action: 'reopen right tools from user-hidden strip',
    clicked,
    state: drawerState,
    failures,
  };
}

async function validateLeftStripReopenInteraction(page, viewport) {
  if (viewport.name !== 'gap-700x700' && viewport.name !== 'tablet-800x700') {
    return null;
  }

  const failures = [];
  const clicked = await clickFirstButton(page, '[data-test="workspace-left-navigation-strip"]');
  await page.waitForTimeout(300);
  const drawerState = await collect(page, 'left-strip-reopen-after');
  if (!clicked) failures.push('left navigation strip did not expose a clickable drawer affordance');
  if (!drawerState.rects.leftNavigationDrawer?.visible) failures.push('left navigation strip did not open the navigation drawer');
  if (drawerState.rects.leftStrip?.visible) failures.push('left navigation drawer open state kept the left strip visible');
  if (drawerState.rects.leftStrip?.stripActivation !== 'open-drawer') failures.push('responsive left strip did not expose open-drawer activation');
  if (!drawerState.activeElement?.insideLeftDrawer) failures.push('left navigation strip did not move focus into the opened drawer');
  failures.push(...validateLeftPanelLayout(drawerState, 'left navigation drawer'));

  const closed = await clickButtonByTest(page, 'app-left-drawer-backdrop');
  await page.waitForTimeout(200);
  const closedState = await collect(page, 'left-strip-reopen-close');
  if (!closed) failures.push('left navigation drawer did not expose its backdrop dismissal');
  if (closedState.rects.leftNavigationDrawer?.visible) failures.push('left navigation drawer backdrop did not close the drawer');
  if (!closedState.activeElement?.insideLeftStrip) failures.push('left drawer backdrop dismissal did not restore focus to the remounted strip');

  const reopened = await clickFirstButton(page, '[data-test="workspace-left-navigation-strip"]');
  await page.waitForTimeout(250);
  const escapedStateBefore = await collect(page, 'left-strip-reopen-escape-before');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const escapedState = await collect(page, 'left-strip-reopen-escape-after');
  if (!reopened) failures.push('left navigation strip did not reopen after backdrop dismissal');
  if (!escapedStateBefore.activeElement?.insideLeftDrawer) failures.push('left navigation strip reopen did not move focus into the drawer');
  if (escapedState.rects.leftNavigationDrawer?.visible) failures.push('left navigation drawer Escape dismissal did not close the drawer');
  if (!escapedState.activeElement?.insideLeftStrip) failures.push('left drawer Escape dismissal did not restore focus to the remounted strip');

  return {
    action: 'reopen navigation from left strip',
    clicked,
    state: drawerState,
    failures,
  };
}

async function validateIndependentDrawerInteractions(page, viewport) {
  if (viewport.name !== 'gap-700x700') {
    return null;
  }

  const failures = [];
  const leftClicked = await clickFirstButton(page, '[data-test="workspace-left-navigation-strip"]');
  await page.waitForTimeout(250);
  const leftOpen = await collect(page, 'independent-drawers-left-open');

  const rightClicked = await clickFirstButton(page, '[data-test="workspace-right-tool-strip"]');
  await page.waitForTimeout(250);
  const bothOpen = await collect(page, 'independent-drawers-both-open');
  if (!leftClicked) failures.push('independent drawer test could not open the left drawer');
  if (!rightClicked) failures.push('independent drawer test could not open the right drawer while left was open');
  if (!leftOpen.rects.leftNavigationDrawer?.visible) failures.push('left drawer was not open before opening the right drawer');
  if (!bothOpen.rects.leftNavigationDrawer?.visible || !bothOpen.rects.rightDrawer?.visible) {
    failures.push('opening the right drawer unexpectedly closed or suppressed the independent left drawer');
  }
  if (!bothOpen.activeElement?.insideRightDrawer) failures.push('right drawer did not own focus when opened after the left drawer');
  if (bothOpen.rects.leftNavigationDrawer?.ariaModal !== null || bothOpen.rects.rightDrawer?.ariaModal !== 'true') {
    failures.push(`right-topmost aria-modal ownership mismatch: left ${bothOpen.rects.leftNavigationDrawer?.ariaModal}, right ${bothOpen.rects.rightDrawer?.ariaModal}`);
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const rightDismissed = await collect(page, 'independent-drawers-right-escape');
  if (rightDismissed.rects.rightDrawer?.visible) failures.push('topmost right drawer Escape dismissal did not close the right drawer');
  if (!rightDismissed.rects.leftNavigationDrawer?.visible) failures.push('right drawer Escape dismissal closed the independent left drawer');
  if (!rightDismissed.activeElement?.insideLeftDrawer) failures.push('right drawer Escape dismissal did not return focus to the remaining left drawer');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const leftDismissed = await collect(page, 'independent-drawers-left-escape');
  if (leftDismissed.rects.leftNavigationDrawer?.visible) failures.push('left drawer Escape dismissal did not close the remaining drawer');
  if (!leftDismissed.activeElement?.insideLeftStrip) failures.push('left drawer Escape dismissal did not restore focus to the left strip');

  const reverseRightClicked = await clickFirstButton(page, '[data-test="workspace-right-tool-strip"]');
  await page.waitForTimeout(250);
  const reverseRightOpen = await collect(page, 'independent-drawers-reverse-right-open');
  const reverseLeftClicked = await clickFirstButton(page, '[data-test="workspace-left-navigation-strip"]');
  await page.waitForTimeout(250);
  const reverseBothOpen = await collect(page, 'independent-drawers-reverse-both-open');
  if (!reverseRightClicked || !reverseLeftClicked) failures.push('reverse independent drawer journey could not open both sides');
  if (!reverseRightOpen.rects.rightDrawer?.visible || !reverseBothOpen.rects.rightDrawer?.visible || !reverseBothOpen.rects.leftNavigationDrawer?.visible) {
    failures.push('opening the left drawer unexpectedly closed or suppressed the independent right drawer');
  }
  if (!reverseBothOpen.activeElement?.insideLeftDrawer) failures.push('left drawer did not own focus when opened after the right drawer');
  const reverseLeftDrawerZ = Number(reverseBothOpen.rects.leftNavigationDrawer?.zIndex || 0);
  const reverseRightDrawerZ = Number(reverseBothOpen.rects.rightDrawer?.zIndex || 0);
  const reverseLeftBackdropZ = Number(reverseBothOpen.rects.leftDrawerBackdrop?.zIndex || 0);
  const reverseRightBackdropZ = Number(reverseBothOpen.rects.rightDrawerBackdrop?.zIndex || 0);
  if (!(reverseLeftDrawerZ > reverseRightDrawerZ && reverseLeftBackdropZ > reverseRightBackdropZ)) {
    failures.push(`reverse drawer visual layer does not match keyboard ownership: left drawer/backdrop ${reverseLeftDrawerZ}/${reverseLeftBackdropZ}, right ${reverseRightDrawerZ}/${reverseRightBackdropZ}`);
  }
  if (reverseBothOpen.rects.leftNavigationDrawer?.ariaModal !== 'true' || reverseBothOpen.rects.rightDrawer?.ariaModal !== null) {
    failures.push(`left-topmost aria-modal ownership mismatch: left ${reverseBothOpen.rects.leftNavigationDrawer?.ariaModal}, right ${reverseBothOpen.rects.rightDrawer?.ariaModal}`);
  }

  const reverseBackdropTarget = await clickTopmostDrawerBackdrop(page);
  await page.waitForTimeout(250);
  const reverseLeftDismissed = await collect(page, 'independent-drawers-reverse-left-backdrop');
  if (reverseBackdropTarget !== 'app-left-drawer-backdrop') failures.push(`reverse topmost backdrop hit ${reverseBackdropTarget || 'nothing'} instead of the left drawer backdrop`);
  if (reverseLeftDismissed.rects.leftNavigationDrawer?.visible) failures.push('reverse topmost left drawer backdrop dismissal did not close the left drawer');
  if (!reverseLeftDismissed.rects.rightDrawer?.visible) failures.push('reverse left drawer backdrop dismissal closed the independent right drawer');
  if (!reverseLeftDismissed.activeElement?.insideRightDrawer) failures.push('reverse left drawer backdrop dismissal did not return focus to the remaining right drawer');

  const remainingBackdropTarget = await clickTopmostDrawerBackdrop(page);
  await page.waitForTimeout(250);
  const reverseRightDismissed = await collect(page, 'independent-drawers-reverse-right-backdrop');
  if (remainingBackdropTarget !== 'workspace-right-tool-drawer-backdrop') failures.push(`remaining right backdrop hit ${remainingBackdropTarget || 'nothing'} instead of the right drawer backdrop`);
  if (reverseRightDismissed.rects.rightDrawer?.visible) failures.push('reverse right drawer backdrop dismissal did not close the remaining drawer');
  if (!reverseRightDismissed.activeElement?.insideRightStrip) failures.push('reverse right drawer backdrop dismissal did not restore focus to the right strip');

  return {
    action: 'open independent left and right drawers in both directions',
    clicked: leftClicked && rightClicked,
    state: bothOpen,
    failures,
  };
}

async function validateRightResizeBoundInteraction(page, viewport) {
  if (viewport.name !== 'desktop-1280x800' && viewport.name !== 'wide-1440x900') {
    return null;
  }

  const failures = [];
  const beforeState = await collect(page, 'right-resize-bound-before');
  const handle = await page.locator('[data-test="workspace-right-resize-handle"]').boundingBox();
  if (!handle) {
    return {
      action: 'drag right tools beyond center-preserving bound',
      clicked: false,
      state: await collect(page, 'right-resize-bound-missing-handle'),
      failures: ['docked right-panel resize handle was not available for bound validation'],
    };
  }

  const startX = handle.x + handle.width / 2;
  const startY = handle.y + handle.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(Math.max(0, startX - 1000), startY, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(350);

  const state = await collect(page, 'right-resize-bound-after');
  const beforeWidth = beforeState.rects.rightPanel?.rect?.width ?? 0;
  const flowWidth = beforeState.rects.centerRightFlow?.rect?.width ?? 0;
  const expectedBoundWidth = Math.max(
    0,
    flowWidth - LEFT_PANEL_RESIZE_HANDLE_WIDTH / 2 - USER_RESIZE_CENTER_MIN_WIDTH - RIGHT_PANEL_RESIZE_HANDLE_WIDTH,
  );
  const observedWidth = state.rects.rightPanel?.rect?.width ?? 0;
  if (!state.visibleState.rightPanel) failures.push('right-panel resize bound removed the docked right panel');
  if (state.rects.rightStrip?.visible) failures.push('right-panel resize bound rendered a right-tool strip');
  if (observedWidth <= beforeWidth) {
    failures.push(`right-panel resize bound did not increase panel width: before ${beforeWidth}px, after ${observedWidth}px`);
  }
  if (Math.abs(observedWidth - expectedBoundWidth) > 1) {
    failures.push(`right-panel resize bound stopped at ${observedWidth}px instead of capacity-derived ${expectedBoundWidth}px`);
  }
  if (!state.rects.centerShell?.visible || state.rects.centerShell.rect.width < USER_RESIZE_CENTER_MIN_WIDTH) {
    failures.push(`right-panel resize bound left center below ${USER_RESIZE_CENTER_MIN_WIDTH}px: ${state.rects.centerShell?.rect?.width ?? 0}px`);
  }

  return {
    action: 'drag right tools beyond center-preserving bound',
    clicked: true,
    state,
    failures,
  };
}

function validateLeftPanelLayout(state, context) {
  const failures = [];
  if (!state.leftPanelLayout) return failures;

  const { shell, history, scrollOwner } = state.leftPanelLayout;
  if (shell?.display !== 'flex' || shell?.flexDirection !== 'column' || shell?.height <= 0) {
    failures.push(`${context} does not expose a definite full-height flex-column shell`);
  }
  if (history && (history.minHeight !== '0px' || history.height <= 0)) {
    failures.push(`${context} history section is not a flexible visible region`);
  }
  if (scrollOwner && !['auto', 'scroll'].includes(scrollOwner.overflowY)) {
    failures.push(`${context} history scroll owner is not vertically scrollable`);
  }
  if (scrollOwner && scrollOwner.clientHeight <= 0) {
    failures.push(`${context} history scroll owner has no usable height`);
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

async function validateSemanticSurfaceInteractions(page, initialState) {
  const interactionResults = [];
  const semanticRoot = '[data-test="workspace-semantic-surface-triggers"]';
  if (!initialState.visibleState.semanticTriggers) return interactionResults;

  if (initialState.visibleState.navigationTrigger) {
    const clicked = await clickButtonByTest(page, 'workspace-navigation-trigger', semanticRoot);
    await page.waitForTimeout(300);
    const afterNavigation = await collect(page, 'after-navigation-trigger');
    interactionResults.push({ action: 'open Agents & teams navigation', clicked, state: afterNavigation });

    const drawerOpened = Boolean(afterNavigation.visibleState.leftNavigationDrawer);
    if (drawerOpened) {
      const closed = await clickButtonByTest(page, 'app-left-drawer-backdrop');
      await page.waitForTimeout(200);
      const afterNavigationClose = await collect(page, 'after-navigation-close');
      interactionResults.push({ action: 'close Agents & teams navigation', clicked: closed, state: afterNavigationClose });
    }
  }

  return interactionResults;
}

function validateInteractions(interactions) {
  const failures = [];
  for (const interaction of interactions) {
    if (!interaction.clicked) failures.push(`${interaction.action} target was not found`);
    if (interaction.action === 'open Agents & teams navigation' && !interaction.state.visibleState.leftNavigationDrawer && !interaction.state.visibleState.leftAside) {
      failures.push('Agents & teams trigger did not open the left navigation surface');
    }
    if (interaction.action === 'open Agents & teams navigation') {
      failures.push(...validateLeftPanelLayout(interaction.state, 'navigation drawer'));
    }
    if (interaction.action === 'close Agents & teams navigation' && interaction.state.visibleState.leftNavigationDrawer) {
      failures.push('left navigation drawer close action did not close the drawer');
    }
    if (interaction.action === 'reopen navigation from left strip' && !interaction.state.visibleState.leftNavigationDrawer) {
      failures.push('left navigation strip did not open the left navigation drawer');
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

        const shouldExerciseControls = initial.visibleState.semanticTriggers;
        const interactions = shouldExerciseControls ? await validateSemanticSurfaceInteractions(page, initial) : [];
        const rightResizeBoundInteraction = await validateRightResizeBoundInteraction(page, viewport);
        if (rightResizeBoundInteraction) {
          interactions.push(rightResizeBoundInteraction);
          pageFailures.push(...rightResizeBoundInteraction.failures);
        }
        const rightStripInteraction = await validateRightStripReopenInteraction(page, viewport);
        if (rightStripInteraction) {
          interactions.push(rightStripInteraction);
          pageFailures.push(...rightStripInteraction.failures);
        }
        const leftStripInteraction = await validateLeftStripReopenInteraction(page, viewport);
        if (leftStripInteraction) {
          interactions.push(leftStripInteraction);
          pageFailures.push(...leftStripInteraction.failures);
        }
        const independentDrawerInteraction = await validateIndependentDrawerInteractions(page, viewport);
        if (independentDrawerInteraction) {
          interactions.push(independentDrawerInteraction);
          pageFailures.push(...independentDrawerInteraction.failures);
        }
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
      semanticTriggers: result.initial?.labels?.semanticTriggers,
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
