import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(new URL('../../../../autobyteus-web/package.json', import.meta.url));
const { chromium } = require('playwright-core');

const outDir = path.resolve('tickets/frontend-responsive-ux-audit/probes/comprehensive');
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath });

const viewports = [
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

const isVisible = (el) => {
  if (!el) return false;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.left < innerWidth && r.top < innerHeight;
};

async function collect(page, label) {
  return await page.evaluate((label) => {
    const elementInfo = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        selector,
        display: cs.display,
        visibility: cs.visibility,
        position: cs.position,
        overflow: `${cs.overflowX}/${cs.overflowY}`,
        rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
        text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500),
        classes: el.getAttribute('class') || '',
      };
    };
    const visible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.left < innerWidth && r.top < innerHeight;
    };
    const buttonInfos = Array.from(document.querySelectorAll('button')).map((el, index) => {
      const r = el.getBoundingClientRect();
      return {
        index,
        text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(),
        title: el.getAttribute('title') || '',
        aria: el.getAttribute('aria-label') || '',
        dataTest: el.getAttribute('data-test') || el.getAttribute('data-testid') || '',
        visible: visible(el),
        rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
        classes: (el.getAttribute('class') || '').slice(0, 180),
      };
    });
    const visibleButtons = buttonInfos.filter(b => b.visible).sort((a,b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
    const topBarButtons = visibleButtons.filter(b => b.rect.y < 130);
    const rightPanel = document.querySelector('[data-test="workspace-right-panel"]');
    const rightTabButtons = visibleButtons.filter((b) => rightPanel && rightPanel.contains(document.querySelectorAll('button')[b.index]));
    const main = document.querySelector('main');
    const mainText = main ? (main.innerText || '').replace(/\s+/g, ' ').trim() : '';
    const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const desktop = document.querySelector('[data-test="workspace-desktop-layout"]');
    const center = document.querySelector('[data-test="workspace-center-content-shell"]');
    const aside = document.querySelector('aside');
    const header = document.querySelector('header');
    const allRects = {
      header: elementInfo('header'),
      aside: elementInfo('aside'),
      main: elementInfo('main'),
      desktopLayout: elementInfo('[data-test="workspace-desktop-layout"]'),
      centerShell: elementInfo('[data-test="workspace-center-content-shell"]'),
      rightPanel: elementInfo('[data-test="workspace-right-panel"]'),
      rightTabContent: elementInfo('[data-test="right-side-tab-content-shell"]'),
    };
    const hiddenDesktopMounted = Boolean(desktop) && !visible(desktop);
    const blankMain = Boolean(main) && visible(main) && !mainText.replace(/Open menu|AutoByteus|Agents|Agent Teams|Skills|Memory|Nodes|Workspaces|Settings|Temp Workspace/g, '').trim();
    const legacyMobileTopButtons = topBarButtons.map(b => b.text).filter(Boolean);
    const issueFlags = [];
    if (hiddenDesktopMounted) issueFlags.push('desktop_layout_mounted_but_hidden');
    if (blankMain) issueFlags.push('visible_main_has_no_workspace_content');
    if (allRects.centerShell?.rect.width > 0 && allRects.centerShell.rect.width < 360) issueFlags.push(`center_too_narrow_${allRects.centerShell.rect.width}px`);
    if (allRects.rightPanel?.rect.width > 0 && allRects.rightPanel.rect.width < 360) issueFlags.push(`right_panel_cramped_${allRects.rightPanel.rect.width}px`);
    if (allRects.aside?.rect.width >= 300 && innerWidth <= 1024 && matchMedia('(min-width: 768px)').matches) issueFlags.push('left_panel_docked_too_wide_for_viewport');
    if (bodyText.includes('Running List') && legacyMobileTopButtons.includes('Running') && legacyMobileTopButtons.includes('Agent')) issueFlags.push('legacy_mobile_running_agent_button_model');
    if (innerHeight <= 480 && allRects.aside?.rect.height > 0 && allRects.aside.rect.height === innerHeight) issueFlags.push('short_height_keeps_full_left_panel_docked');
    return {
      label,
      href: location.href,
      title: document.title,
      innerWidth,
      innerHeight,
      media: {
        min390: matchMedia('(min-width: 390px)').matches,
        min500: matchMedia('(min-width: 500px)').matches,
        min640: matchMedia('(min-width: 640px)').matches,
        min768: matchMedia('(min-width: 768px)').matches,
        min1024: matchMedia('(min-width: 1024px)').matches,
      },
      bodyText: bodyText.slice(0, 1200),
      mainText: mainText.slice(0, 1200),
      rects: allRects,
      visibleButtons,
      topBarButtons,
      rightTabButtons,
      issueFlags,
    };
  }, label);
}

const results = [];
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    if (/error|warn|Workspace|Failed|GraphQL|Apollo|WebSocket/i.test(text)) consoleMessages.push(`${msg.type()}: ${text}`);
  });
  await page.goto('http://127.0.0.1:13002/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1200);
  const initialShot = path.join(outDir, `${vp.name}-initial.png`);
  await page.screenshot({ path: initialShot, fullPage: false });
  const initial = await collect(page, 'initial');

  const interactions = [];
  // If hamburger/header is visible, open the left drawer.
  const firstVisibleTopButton = initial.topBarButtons[0];
  if (firstVisibleTopButton && firstVisibleTopButton.rect.y < 80 && firstVisibleTopButton.rect.x < 80) {
    await page.mouse.click(firstVisibleTopButton.rect.x + Math.max(4, firstVisibleTopButton.rect.width / 2), firstVisibleTopButton.rect.y + Math.max(4, firstVisibleTopButton.rect.height / 2));
    await page.waitForTimeout(250);
    const shot = path.join(outDir, `${vp.name}-after-hamburger.png`);
    await page.screenshot({ path: shot, fullPage: false });
    interactions.push({ action: 'click_hamburger', screenshot: shot, state: await collect(page, 'after_hamburger') });
    // close by pressing Escape if possible
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  // If a legacy Agent tab button is visible, click it to detect redirect/stability.
  const agentButton = initial.visibleButtons.find(b => b.text === 'Agent');
  if (agentButton) {
    await page.mouse.click(agentButton.rect.x + agentButton.rect.width / 2, agentButton.rect.y + agentButton.rect.height / 2);
    await page.waitForTimeout(250);
    interactions.push({ action: 'click_agent_top_button', state: await collect(page, 'after_agent_button') });
  }

  // On docked desktop, click each visible right tab to verify order/reachability at current width.
  if (initial.rightTabButtons.length) {
    const tabClicks = [];
    for (const b of initial.rightTabButtons.slice(0, 8)) {
      if (!b.text && !b.title) continue;
      await page.mouse.click(b.rect.x + Math.min(20, Math.max(4, b.rect.width / 2)), b.rect.y + Math.max(4, b.rect.height / 2));
      await page.waitForTimeout(150);
      const state = await collect(page, `after_right_tab_${b.text || b.title}`);
      tabClicks.push({ tab: b.text || b.title, stateSummary: { rightTabButtons: state.rightTabButtons.map(x => x.text || x.title), mainText: state.mainText.slice(0,200), issueFlags: state.issueFlags } });
    }
    interactions.push({ action: 'click_visible_right_tabs_in_order', tabs: tabClicks });
  }

  results.push({ viewport: vp, screenshot: initialShot, consoleMessages, initial, interactions });
  await page.close();
}

// Probe /mobile boundary lightly.
const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await mobilePage.goto('http://127.0.0.1:13002/mobile', { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(800);
const mobileShot = path.join(outDir, `mobile-route-390x844.png`);
await mobilePage.screenshot({ path: mobileShot, fullPage: false });
const mobileRoute = await collect(mobilePage, 'mobile_route');
await mobilePage.close();

await browser.close();
const output = { generatedAt: new Date().toISOString(), viewports, results, mobileRoute: { screenshot: mobileShot, state: mobileRoute } };
await fs.writeFile(path.join(outDir, 'current-responsive-ui-results.json'), JSON.stringify(output, null, 2));

const summary = results.map((r) => ({
  viewport: r.viewport.name,
  size: `${r.viewport.width}x${r.viewport.height}`,
  media: r.initial.media,
  flags: r.initial.issueFlags,
  mainRect: r.initial.rects.main?.rect,
  centerRect: r.initial.rects.centerShell?.rect,
  rightRect: r.initial.rects.rightPanel?.rect,
  topButtons: r.initial.topBarButtons.map(b => b.text || b.title || b.aria).filter(Boolean),
  rightTabs: r.initial.rightTabButtons.map(b => b.text || b.title || b.aria).filter(Boolean),
  interactions: r.interactions.map(i => ({ action: i.action, afterFlags: i.state?.issueFlags, tabs: i.tabs?.map(t=>t.tab) })),
}));
console.log(JSON.stringify({ summary, mobileRouteFlags: mobileRoute.issueFlags, mobileRouteText: mobileRoute.bodyText.slice(0,300) }, null, 2));
