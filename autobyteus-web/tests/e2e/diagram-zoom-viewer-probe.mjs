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
const fixturePath = path.join(scriptDir, 'fixtures/diagram-zoom-viewer.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-diagram-zoom-viewer.vue');
const routePath = '/api-e2e-diagram-zoom-viewer';

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
};

const timeoutMs = Number(getArg('timeout-ms', '90000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/diagram-zoom-viewer'));
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
  browserExecutable: executablePath || 'playwright-default',
  webDir,
  fixturePath,
  installedPagePath,
  routePath,
  scenarios: {},
  browserEvents: [],
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

const approximately = (actual, expected, tolerance, message) => {
  assert(Math.abs(actual - expected) <= tolerance, message, { actual, expected, tolerance });
};

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
  throw new Error(`Timed out waiting for ${description}; last=${JSON.stringify(lastValue)}${lastError ? `; error=${lastError.message}` : ''}`);
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

const installFixturePage = async () => {
  assert(existsSync(fixturePath), `Fixture does not exist: ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`);
  await fs.copyFile(fixturePath, installedPagePath);
};

const childHasExited = (child) => child.exitCode !== null || child.signalCode !== null;

const waitForChildExit = async (child, timeout) => {
  if (childHasExited(child)) return true;
  return await new Promise((resolve) => {
    let timer;
    const finish = (exited) => {
      clearTimeout(timer);
      child.off('exit', onExit);
      resolve(exited);
    };
    const onExit = () => finish(true);
    child.once('exit', onExit);
    timer = setTimeout(() => finish(childHasExited(child)), timeout);
    if (childHasExited(child)) finish(true);
  });
};

const signalOwnedProcess = (child, signal) => {
  let groupError;
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, signal);
      return 'process-group';
    } catch (error) {
      groupError = error;
    }
  }
  try {
    const accepted = child.kill(signal);
    if (!accepted && !childHasExited(child)) throw new Error('Child process rejected the signal');
    return groupError ? 'child-fallback' : 'child';
  } catch (error) {
    if (childHasExited(child)) return 'already-exited';
    const groupMessage = groupError instanceof Error ? groupError.message : String(groupError || 'not attempted');
    const childMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to send ${signal} to owned process ${child.pid}; group=${groupMessage}; child=${childMessage}`);
  }
};

const waitForProcessGroupExit = async (pid, timeout) => {
  if (process.platform === 'win32') return true;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      process.kill(-pid, 0);
    } catch (error) {
      if (error?.code === 'ESRCH') return true;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  try {
    process.kill(-pid, 0);
    return false;
  } catch (error) {
    if (error?.code === 'ESRCH') return true;
    throw error;
  }
};

const killOwnedProcess = async (child) => {
  if (!child) return { status: 'not-started' };
  assert(child.pid, 'Owned process has no PID and cannot be verified during cleanup');
  const details = { pid: child.pid, initialExitCode: child.exitCode, initialSignalCode: child.signalCode };
  if (!childHasExited(child)) {
    details.sigtermTarget = signalOwnedProcess(child, 'SIGTERM');
    details.exitedAfterSigterm = await waitForChildExit(child, 5000);
    if (!details.exitedAfterSigterm) {
      details.sigkillTarget = signalOwnedProcess(child, 'SIGKILL');
      details.exitedAfterSigkill = await waitForChildExit(child, 5000);
      assert(details.exitedAfterSigkill, `Owned process ${child.pid} did not exit within 5000ms after SIGKILL`, details);
    }
  }
  details.finalExitCode = child.exitCode;
  details.finalSignalCode = child.signalCode;
  details.childExited = childHasExited(child);
  assert(details.childExited, `Owned process ${child.pid} has no final exit result`, details);
  details.processGroupExited = await waitForProcessGroupExit(child.pid, 5000);
  assert(details.processGroupExited, `Owned process group ${child.pid} remained alive after cleanup`, details);
  return { status: 'terminated', ...details };
};

const recordCleanupFailure = (id, resource, error) => {
  const failure = {
    id,
    description: `Clean up owned ${resource}`,
    message: error instanceof Error ? error.message : String(error),
    details: error?.details,
    stack: error instanceof Error ? error.stack : undefined,
  };
  evidence.failures.push(failure);
  return `failed: ${failure.message}`;
};

const recordPageEvents = (page, label) => {
  page.on('console', (message) => {
    evidence.browserEvents.push({ label, type: `console:${message.type()}`, text: message.text() });
  });
  page.on('pageerror', (error) => {
    evidence.browserEvents.push({ label, type: 'pageerror', text: error.message });
  });
  page.on('requestfailed', (request) => {
    evidence.browserEvents.push({
      label,
      type: 'requestfailed',
      text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
    });
  });
};

const gotoReady = async (page, baseUrl) => {
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="diagram-zoom-probe"]').waitFor({ state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => Boolean(window.__diagramProbe), null, { timeout: timeoutMs });
  await page.waitForFunction(() => document.querySelectorAll('.mermaid-expand-button').length >= 3, null, { timeout: timeoutMs });
  await page.waitForFunction(() => document.querySelectorAll('.loading-state').length === 0, null, { timeout: timeoutMs });
  await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll('.mermaid-expand-button'));
    return buttons.length >= 3 && buttons.every((button) => button.querySelector('svg path'));
  }, null, { timeout: timeoutMs });
};

const readInlineVisualState = async (component) => await component.evaluate((root) => {
  const preview = root.querySelector('.diagram-content');
  const button = root.querySelector('.mermaid-expand-button');
  const host = root.querySelector('.mermaid-svg-container');
  const svg = host?.querySelector(':scope > svg');
  const rectOf = (element) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
  };
  const previewRect = rectOf(preview);
  const buttonRect = rectOf(button);
  const hostRect = rectOf(host);
  const svgRect = rectOf(svg);
  const buttonStyle = getComputedStyle(button);
  const surfaceStyle = getComputedStyle(button, '::before');
  const previewStyle = getComputedStyle(preview);
  return {
    preview: previewRect,
    button: buttonRect,
    host: hostRect,
    svg: svgRect,
    previewStyle: {
      paddingTop: previewStyle.paddingTop,
      paddingBottom: previewStyle.paddingBottom,
    },
    buttonStyle: {
      position: buttonStyle.position,
      opacity: buttonStyle.opacity,
      pointerEvents: buttonStyle.pointerEvents,
      transform: buttonStyle.transform,
      color: buttonStyle.color,
      outlineStyle: buttonStyle.outlineStyle,
      outlineWidth: buttonStyle.outlineWidth,
      visibility: buttonStyle.visibility,
      display: buttonStyle.display,
    },
    surfaceStyle: {
      inset: surfaceStyle.inset,
      top: surfaceStyle.top,
      background: surfaceStyle.backgroundColor,
      borderColor: surfaceStyle.borderColor,
      boxShadow: surfaceStyle.boxShadow,
    },
    rightGap: previewRect && buttonRect ? previewRect.right - buttonRect.right : null,
    topGap: previewRect && buttonRect ? buttonRect.y - previewRect.y : null,
    normalFlowChildren: Array.from(preview?.children ?? [])
      .filter((element) => !['absolute', 'fixed'].includes(getComputedStyle(element).position))
      .map((element) => ({ tag: element.tagName, className: element.className })),
    text: (button?.textContent || '').replace(/\s+/g, ' ').trim(),
    ariaLabel: button?.getAttribute('aria-label'),
    title: button?.getAttribute('title'),
    iconPaths: button?.querySelectorAll('svg path').length ?? 0,
    active: document.activeElement === button,
    media: {
      fineHover: matchMedia('(hover: hover) and (pointer: fine)').matches,
      pointerCoarse: matchMedia('(pointer: coarse)').matches,
      anyCoarse: matchMedia('(any-pointer: coarse)').matches,
      noHover: matchMedia('(hover: none)').matches,
      dark: matchMedia('(prefers-color-scheme: dark)').matches,
    },
  };
});

const readToolbarVisualState = async (page) => await page.evaluate(() => {
  const actions = Array.from(document.querySelectorAll('.mermaid-viewer-action'));
  const toolbar = document.querySelector('[role="toolbar"]');
  const rectOf = (element) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
  };
  return {
    toolbar: rectOf(toolbar),
    actions: actions.map((action) => {
      const style = getComputedStyle(action);
      return {
        rect: rectOf(action),
        text: (action.textContent || '').replace(/\s+/g, ' ').trim(),
        ariaLabel: action.getAttribute('aria-label'),
        title: action.getAttribute('title'),
        disabled: action.disabled,
        iconPaths: action.querySelectorAll('svg path').length,
        iconRect: rectOf(action.querySelector('svg')),
        style: {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          color: style.color,
          background: style.backgroundColor,
          borderColor: style.borderColor,
        },
      };
    }),
    media: {
      fineHover: matchMedia('(hover: hover) and (pointer: fine)').matches,
      pointerCoarse: matchMedia('(pointer: coarse)').matches,
      anyCoarse: matchMedia('(any-pointer: coarse)').matches,
      noHover: matchMedia('(hover: none)').matches,
      dark: matchMedia('(prefers-color-scheme: dark)').matches,
    },
  };
});

const waitForToolbarIcons = async (page) => await page.waitForFunction(() => {
  const actions = Array.from(document.querySelectorAll('.mermaid-viewer-action'));
  return actions.length === 4 && actions.every((action) => {
    const icon = action.querySelector('svg');
    return icon && icon.getBoundingClientRect().width > 0 && icon.querySelector('path');
  });
}, null, { timeout: timeoutMs });

const assertRectStable = (actual, expected, tolerance, message) => {
  for (const key of ['x', 'y', 'width', 'height']) {
    approximately(actual[key], expected[key], tolerance, `${message}: ${key}`);
  }
};

const revealAndClickExpand = async (component) => {
  const preview = component.locator('.diagram-content');
  const button = component.locator('.mermaid-expand-button');
  const media = await component.evaluate(() => ({
    fineHover: matchMedia('(hover: hover) and (pointer: fine)').matches,
    anyCoarse: matchMedia('(any-pointer: coarse)').matches,
  }));
  if (media.fineHover && !media.anyCoarse) await preview.hover();
  await waitFor('expand control to accept pointer input', () => button.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.pointerEvents !== 'none' && Number.parseFloat(style.opacity) > 0.9;
  }));
  await button.click();
};

const openConversationViewer = async (page) => {
  const component = page.locator('[data-test="conversation-surface"] .mermaid-diagram-component').first();
  await revealAndClickExpand(component);
  await page.locator('.mermaid-viewer-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
  return component;
};

const applyHybridCoarseCssomOverride = async (page) => await page.evaluate(() => {
  const splitMediaDisjunction = (condition) => {
    const branches = [];
    let branch = '';
    let parenthesisDepth = 0;
    for (const character of condition) {
      if (character === '(') parenthesisDepth += 1;
      if (character === ')') parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      if (character === ',' && parenthesisDepth === 0) {
        branches.push(branch);
        branch = '';
      } else {
        branch += character;
      }
    }
    branches.push(branch);
    return branches;
  };
  const normalizeMediaBranch = (branch) => branch
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s*:\s*/g, ': ')
    .trim();
  const analyzeMediaCondition = (condition) => {
    const branches = splitMediaDisjunction(condition)
      .map(normalizeMediaBranch)
      .filter(Boolean);
    return {
      normalizedCondition: branches.join(', '),
      mediaBranches: branches,
      hasStandaloneAnyCoarseBranch: branches.includes('(any-pointer: coarse)'),
      isExactStandaloneAnyCoarse: branches.length === 1 && branches[0] === '(any-pointer: coarse)',
    };
  };
  const extracted = [];
  let order = 0;
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = Array.from(sheet.cssRules || []);
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (rule.type !== CSSRule.MEDIA_RULE) continue;
      const mediaSemantics = analyzeMediaCondition(rule.conditionText);
      for (const child of Array.from(rule.cssRules || [])) {
        if (child.type !== CSSRule.STYLE_RULE) continue;
        if (!child.selectorText.includes('mermaid-expand-button') && !child.selectorText.includes('mermaid-viewer-action')) continue;
        const sourceKind = child.selectorText.includes('mermaid-expand-button') ? 'inline' : 'viewer';
        const acceptedBySemanticPolicy = sourceKind === 'inline'
          ? mediaSemantics.isExactStandaloneAnyCoarse
          : mediaSemantics.hasStandaloneAnyCoarseBranch;
        if (!acceptedBySemanticPolicy) continue;
        extracted.push({
          condition: rule.conditionText,
          ...mediaSemantics,
          sourceKind,
          acceptedBySemanticPolicy,
          selector: child.selectorText,
          declarations: child.style.cssText,
          order: order += 1,
        });
      }
    }
  }
  const style = document.createElement('style');
  style.dataset.diagramProbeHybridOverride = 'true';
  style.textContent = extracted.map((rule) => {
    const selectors = rule.selector
      .split(',')
      .map((selector) => `.e2e-force-any-coarse ${selector.trim()}`)
      .join(', ');
    return `${selectors} { ${rule.declarations} }`;
  }).join('\n');
  document.head.append(style);
  document.documentElement.classList.add('e2e-force-any-coarse');
  return {
    method: 'Deterministic test-only cascade of exact emitted CSSOM any-pointer:coarse declarations while real fine-primary media remains active; not real hybrid hardware.',
    realCapabilities: {
      fineHover: matchMedia('(hover: hover) and (pointer: fine)').matches,
      anyCoarse: matchMedia('(any-pointer: coarse)').matches,
    },
    extracted,
  };
});

const removeHybridCoarseCssomOverride = async (page) => await page.evaluate(() => {
  document.documentElement.classList.remove('e2e-force-any-coarse');
  document.querySelector('style[data-diagram-probe-hybrid-override="true"]')?.remove();
});

const closeViewerWithButton = async (page) => {
  const actions = page.locator('.mermaid-viewer-action');
  assert(await actions.count() === 4, 'Viewer must expose exactly four persistent actions');
  await actions.nth(3).click();
  await page.locator('.mermaid-viewer-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
};

const getLinkInventory = async (root) => await root.locator('a').evaluateAll((anchors) => anchors.map((anchor, index) => ({
  index,
  text: (anchor.textContent || '').replace(/\s+/g, ' ').trim(),
  href: anchor.getAttribute('href'),
  xlink: anchor.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || anchor.getAttribute('xlink:href'),
})));

const getLinkLocator = async (root, predicate, description) => {
  const inventory = await getLinkInventory(root);
  const item = inventory.find(predicate);
  assert(item, `Unable to find ${description}`, inventory);
  return { locator: root.locator('a').nth(item.index), item, inventory };
};

const clickHttpAnchor = async (root) => {
  const match = await getLinkLocator(
    root,
    (item) => (item.href || item.xlink || '').startsWith('http'),
    'HTTP(S) SVG anchor',
  );
  await match.locator.click();
  return match.item;
};

const rootSvgCount = (page) => page.locator('.mermaid-svg-container > svg, .mermaid-diagram-stage > svg').count();

const readNestedArtifactState = async (page) => await page.evaluate(() => {
  const shell = document.querySelector('[data-testid="artifact-content-viewer-shell"]');
  const toggle = shell?.querySelector('[data-testid="artifact-viewer-zen-toggle"]');
  const previewButton = shell?.querySelector('button[title="Preview Mode"]');
  const opener = shell?.querySelector('.mermaid-expand-button');
  const inlineSvg = shell?.querySelector('.mermaid-svg-container > svg');
  const inlineRect = inlineSvg?.getBoundingClientRect();
  return {
    shellClass: shell?.className || '',
    shellZIndex: shell ? getComputedStyle(shell).zIndex : null,
    shellFixed: Boolean(shell?.classList.contains('fixed')),
    toggleTitle: toggle?.getAttribute('title') || null,
    path: shell?.querySelector('[data-testid="artifact-path-display"]')?.textContent?.trim() || null,
    previewSelected: Boolean(previewButton?.classList.contains('bg-blue-50')),
    contentPreserved: Boolean(shell?.textContent?.includes('Nested artifact preserved heading')),
    inlineSvgCount: shell?.querySelectorAll('.mermaid-svg-container > svg').length ?? 0,
    inlineSvgId: inlineSvg?.getAttribute('id') || null,
    inlineSvgRect: inlineRect
      ? { width: inlineRect.width, height: inlineRect.height }
      : null,
    viewerSvgCount: document.querySelectorAll('.mermaid-diagram-stage > svg').length,
    backdropCount: document.querySelectorAll('.mermaid-viewer-backdrop').length,
    viewerCanvasCount: document.querySelectorAll('.mermaid-viewer-canvas').length,
    bodyOverflow: document.body.style.overflow,
    openerFocused: document.activeElement === opener,
    underlayPresent: Boolean(document.querySelector('[data-test="artifact-underlying-heading"]')),
  };
});

let devServer;
let browser;
const contexts = [];
let pageInstalled = false;
let devLogStream;

await fs.mkdir(outputDir, { recursive: true });
for (const entry of await fs.readdir(outputDir)) {
  if (/^DZV-BR-\d{3}.*\.png$/.test(entry) || ['evidence.json', 'nuxt-dev.log'].includes(entry)) {
    await fs.rm(path.join(outputDir, entry), { force: true });
  }
}
const evidencePath = path.join(outputDir, 'evidence.json');
const devLogPath = path.join(outputDir, 'nuxt-dev.log');

const runScenario = async (id, description, fn, pageForFailure = null) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await fn();
    evidence.scenarios[id] = { id, description, status: 'Pass', startedAt, finishedAt: new Date().toISOString(), details };
  } catch (error) {
    const failure = {
      id,
      description,
      message: error instanceof Error ? error.message : String(error),
      details: error?.details,
      stack: error instanceof Error ? error.stack : undefined,
    };
    evidence.scenarios[id] = { id, description, status: 'Fail', startedAt, finishedAt: new Date().toISOString(), failure };
    evidence.failures.push(failure);
    if (pageForFailure) {
      try {
        await pageForFailure.screenshot({ path: path.join(outputDir, `${id}-failure.png`), fullPage: true });
      } catch {}
    }
  }
};

try {
  await installFixturePage();
  pageInstalled = true;
  const port = await choosePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.port = port;
  evidence.baseUrl = baseUrl;

  devLogStream = createWriteStream(devLogPath, { flags: 'w' });
  devServer = spawn('pnpm', ['dev', '--port', String(port)], {
    cwd: webDir,
    env: {
      ...process.env,
      BACKEND_NODE_BASE_URL: 'http://127.0.0.1:9',
      NUXT_TELEMETRY_DISABLED: '1',
    },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  devServer.stdout.pipe(devLogStream);
  devServer.stderr.pipe(devLogStream);

  await waitFor('Nuxt fixture route readiness', async () => {
    if (devServer.exitCode !== null) throw new Error(`Nuxt dev server exited with ${devServer.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}${routePath}`);
      return response.ok;
    } catch {
      return false;
    }
  });

  browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
  });
  contexts.push(context);
  await context.addInitScript(() => {
    window.__diagramProbeWindowOpenCalls = [];
    window.open = (...args) => {
      window.__diagramProbeWindowOpenCalls.push(args);
      return null;
    };
  });
  const page = await context.newPage();
  recordPageEvents(page, 'primary');

  await runScenario('DZV-BR-001', 'Shared consumers, refined fine-pointer chrome, inline sizing, one-mounted-SVG transfer, and open paths', async () => {
    await gotoReady(page, baseUrl);
    const layout = await page.evaluate(() => {
      const metric = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }, scrollWidth: element.scrollWidth };
      };
      const components = Array.from(document.querySelectorAll('.mermaid-diagram-component')).map((component, index) => {
        const shell = component.querySelector('.diagram-content');
        const host = component.querySelector('.mermaid-svg-container');
        const svg = host?.querySelector(':scope > svg');
        const rectOf = (element) => {
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
        };
        return { index, shell: rectOf(shell), host: rectOf(host), svg: rectOf(svg), svgId: svg?.id || null };
      });
      return {
        viewport: { width: innerWidth, height: innerHeight },
        documentScrollWidth: document.documentElement.scrollWidth,
        conversationSurface: metric('[data-test="conversation-surface"]'),
        filePreviewSurface: metric('[data-test="file-preview-surface"]'),
        components,
      };
    });

    assert(layout.components.length === 3, 'Expected one conversation and two file-preview Mermaid components', layout);
    for (const component of layout.components) {
      assert(component.shell && component.host && component.svg, 'Every successful diagram must have shell, host, and SVG geometry', component);
      assert(component.shell.width > 0 && component.host.width > 0 && component.svg.width > 0, 'Diagram geometry must be positive', component);
      assert(component.host.width >= component.shell.width - 20, 'SVG host must occupy the shell content width', component);
      assert(component.svg.width <= component.host.width + 1, 'Inline SVG must not widen its host', component);
    }
    assert(layout.components[0].svg.width >= layout.components[0].host.width * 0.9, 'Dense conversation diagram should use available width', layout.components[0]);
    assert(layout.components[1].svg.width >= layout.components[1].host.width * 0.9, 'Wide file-preview sequence should use available width', layout.components[1]);
    assert(layout.components[2].svg.width < layout.components[2].host.width * 0.8, 'Simple file-preview diagram should retain an intrinsic cap', layout.components[2]);
    assert(layout.documentScrollWidth <= layout.viewport.width + 1, 'Diagrams must not create page-level horizontal overflow', layout);
    assert(await rootSvgCount(page) === 3, 'Exactly one root SVG per diagram must be mounted before expansion');

    const component = page.locator('[data-test="conversation-surface"] .mermaid-diagram-component').first();
    const preview = component.locator('.diagram-content');
    const expandButton = component.locator('.mermaid-expand-button');
    const inlineRoot = component.locator('.mermaid-svg-container > svg');
    const originalSvgId = await inlineRoot.getAttribute('id');
    const sourceScrollY = await page.evaluate(() => window.scrollY);

    const rest = await readInlineVisualState(component);
    assert(rest.media.fineHover && !rest.media.anyCoarse && !rest.media.noHover, 'Primary desktop context must expose a real fine-pointer/hover capability without coarse fallback', rest.media);
    assert(Number.parseFloat(rest.buttonStyle.opacity) < 0.1 && rest.buttonStyle.pointerEvents === 'none', 'Fine-pointer expand chrome must be visually absent and non-hit-testing at rest', rest);
    assert(rest.buttonStyle.position === 'absolute', 'Expand chrome must be absolutely overlaid', rest);
    assert(rest.normalFlowChildren.length === 1 && String(rest.normalFlowChildren[0].className).includes('mermaid-svg-container'), 'Only the SVG host may contribute to preview flow; no control row is allowed', rest.normalFlowChildren);
    approximately(
      rest.preview.height - rest.host.height,
      Number.parseFloat(rest.previewStyle.paddingTop) + Number.parseFloat(rest.previewStyle.paddingBottom),
      1,
      'Preview height must equal SVG host plus preview padding with no control-row contribution',
    );
    assert(rest.text === '' && rest.ariaLabel && rest.title === rest.ariaLabel && rest.iconPaths > 0, 'Expand must remain icon-only with localized name/title and a rendered icon', rest);
    assert(rest.button.width >= 32 && rest.button.width <= 35 && rest.button.height >= 32 && rest.button.height <= 35, 'Fine-pointer resting target must remain compact', rest.button);
    await page.screenshot({ path: path.join(outputDir, 'DZV-BR-001-inline-rest-light.png'), fullPage: false });

    await preview.hover();
    await waitFor('fine-pointer expand hover reveal', () => expandButton.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.pointerEvents === 'auto' && Number.parseFloat(style.opacity) > 0.9;
    }));
    await page.waitForTimeout(180);
    const hover = await readInlineVisualState(component);
    assert(hover.buttonStyle.opacity === '1' && hover.buttonStyle.pointerEvents === 'auto', 'Preview hover must reveal an operable expand action', hover);
    approximately(hover.button.width, 34, 0.2, 'Fine-pointer expand target width must be compact');
    approximately(hover.button.height, 34, 0.2, 'Fine-pointer expand target height must be compact');
    approximately(Number.parseFloat(hover.surfaceStyle.top), 2, 0.1, 'Fine-pointer paint inset must leave a 30px surface');
    approximately(hover.rightGap, 4, 0.2, 'Fine-pointer expand action must use the four-pixel right safe inset');
    approximately(hover.topGap, 4, 0.2, 'Fine-pointer expand action must use the four-pixel top safe inset');
    assertRectStable(hover.svg, rest.svg, 0.1, 'Hover reveal must not move or resize the SVG');
    assertRectStable(hover.preview, rest.preview, 0.1, 'Hover reveal must not move or resize the preview');
    await page.screenshot({ path: path.join(outputDir, 'DZV-BR-001-inline-hover-light.png'), fullPage: false });

    await page.mouse.move(1, 1);
    await waitFor('fine-pointer expand pointer-leave concealment', () => expandButton.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.pointerEvents === 'none' && Number.parseFloat(style.opacity) < 0.1;
    }));
    await page.waitForTimeout(180);
    const leave = await readInlineVisualState(component);
    assertRectStable(leave.svg, rest.svg, 0.1, 'Pointer leave must not move or resize the SVG');
    assertRectStable(leave.preview, rest.preview, 0.1, 'Pointer leave must not move or resize the preview');
    await page.screenshot({ path: path.join(outputDir, 'DZV-BR-001-inline-leave-light.png'), fullPage: false });

    await page.locator('[data-test="set-locale-en"]').focus();
    let focusTabs = 0;
    for (; focusTabs < 10 && !(await expandButton.evaluate((element) => document.activeElement === element)); focusTabs += 1) {
      await page.keyboard.press('Tab');
    }
    assert(await expandButton.evaluate((element) => document.activeElement === element), 'Keyboard Tab must reach the fine-pointer expand action within a bounded sequence', { focusTabs });
    await waitFor('keyboard focus reveal', () => expandButton.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.pointerEvents === 'auto' && Number.parseFloat(style.opacity) > 0.9;
    }));
    await page.waitForTimeout(180);
    const keyboardFocus = await readInlineVisualState(component);
    assert(keyboardFocus.active && keyboardFocus.buttonStyle.outlineStyle !== 'none' && Number.parseFloat(keyboardFocus.buttonStyle.outlineWidth) >= 2, 'Keyboard focus must reveal the control with a visible focus ring', keyboardFocus);
    assertRectStable(keyboardFocus.svg, rest.svg, 0.1, 'Keyboard reveal must not move or resize the SVG');
    assertRectStable(keyboardFocus.preview, rest.preview, 0.1, 'Keyboard reveal must not move or resize the preview');
    await page.screenshot({ path: path.join(outputDir, 'DZV-BR-001-inline-focus-light.png'), fullPage: false });

    await page.keyboard.press('Enter');
    await page.locator('.mermaid-viewer-dialog').waitFor({ state: 'visible' });
    assert(await component.locator('.mermaid-svg-container > svg').count() === 0, 'Inline SVG must unmount while viewer owns the current SVG');
    assert(await page.locator('.mermaid-diagram-stage > svg').count() === 1, 'Viewer must mount one transferred SVG');
    assert(await rootSvgCount(page) === 3, 'Opening must not duplicate any root SVG');
    assert(await page.locator('.mermaid-diagram-stage > svg').getAttribute('id') === originalSvgId, 'Transferred SVG identity must remain stable');
    await waitForToolbarIcons(page);
    const lightToolbar = await readToolbarVisualState(page);
    assert(lightToolbar.actions.length === 4, 'Wide viewer must expose exactly four toolbar actions', lightToolbar);
    const expectedLabels = ['Zoom out', 'Fit diagram', 'Zoom in', 'Close diagram viewer'];
    for (const [index, action] of lightToolbar.actions.entries()) {
      assert(action.text === '' && action.ariaLabel === expectedLabels[index] && action.title === expectedLabels[index], 'Every wide viewer action must be icon-only with matching localized name/title', { index, action });
      assert(action.iconPaths > 0 && action.iconRect.width > 0 && action.iconRect.height > 0, 'Every wide viewer action must render its icon', { index, action });
      approximately(action.rect.width, 36, 0.2, 'Wide fine-pointer toolbar actions must have uniform compact width');
      approximately(action.rect.height, 36, 0.2, 'Wide fine-pointer toolbar actions must have uniform compact height');
      assert(action.style.display !== 'none' && action.style.visibility === 'visible' && Number.parseFloat(action.style.opacity) > 0.4, 'Viewer actions must remain visibly present without viewer hover', { index, action });
    }
    await page.screenshot({ path: path.join(outputDir, 'DZV-BR-001-viewer-wide-light.png'), fullPage: false });
    await closeViewerWithButton(page);
    assert(await rootSvgCount(page) === 3, 'Closing must restore exactly one root SVG per diagram');
    assert(await component.locator('.mermaid-svg-container > svg').getAttribute('id') === originalSvgId, 'Closing must restore current SVG identity');
    assert(await page.evaluate(() => window.scrollY) === sourceScrollY, 'Open/close must preserve source scroll position');

    await page.locator('[data-test="background-action"]').focus();
    await revealAndClickExpand(component);
    await page.locator('.mermaid-viewer-dialog').waitFor({ state: 'visible' });
    await closeViewerWithButton(page);

    await preview.click({ position: { x: 8, y: Math.max(8, rest.preview.height - 8) } });
    await page.locator('.mermaid-viewer-dialog').waitFor({ state: 'visible' });
    await closeViewerWithButton(page);

    return { layout, finePointerPresentation: { rest, hover, leave, keyboardFocus, focusTabs, lightToolbar } };
  }, page);

  await runScenario('DZV-BR-002', 'Fitted view, focal wheel zoom, 4x clamp, pointer/touch pan, native edges, and Fit', async () => {
    await gotoReady(page, baseUrl);
    await openConversationViewer(page);
    const canvas = page.locator('.mermaid-viewer-canvas');
    const stage = page.locator('.mermaid-diagram-stage');
    const actions = page.locator('.mermaid-viewer-action');

    const initial = await page.evaluate(() => {
      const canvas = document.querySelector('.mermaid-viewer-canvas');
      const stage = document.querySelector('.mermaid-diagram-stage');
      const plane = document.querySelector('.mermaid-diagram-plane');
      const cr = canvas.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      const pr = plane.getBoundingClientRect();
      const rect = (value) => ({ x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom });
      return { canvas: rect(cr), stage: rect(sr), plane: rect(pr) };
    });
    assert(initial.stage.x >= initial.canvas.x - 1 && initial.stage.right <= initial.canvas.right + 1, 'Fitted stage must be horizontally visible', initial);
    assert(initial.stage.y >= initial.canvas.y - 1 && initial.stage.bottom <= initial.canvas.bottom + 1, 'Fitted stage must be vertically visible', initial);
    assert(await actions.nth(0).isDisabled(), 'Zoom-out must be disabled at fitted minimum');

    const beforeFocal = await page.evaluate(() => {
      const canvas = document.querySelector('.mermaid-viewer-canvas');
      const stage = document.querySelector('.mermaid-diagram-stage');
      const cr = canvas.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      const clientX = sr.left + sr.width * 0.35;
      const clientY = sr.top + sr.height * 0.4;
      return {
        clientX,
        clientY,
        ratioX: (clientX - sr.left) / sr.width,
        ratioY: (clientY - sr.top) / sr.height,
        canvas: { left: cr.left, top: cr.top },
        width: sr.width,
      };
    });
    await canvas.dispatchEvent('wheel', { deltaY: -100, clientX: beforeFocal.clientX, clientY: beforeFocal.clientY });
    await page.waitForFunction((width) => document.querySelector('.mermaid-diagram-stage').getBoundingClientRect().width > width, beforeFocal.width);
    const afterFocal = await page.evaluate(({ clientX, clientY }) => {
      const stage = document.querySelector('.mermaid-diagram-stage');
      const sr = stage.getBoundingClientRect();
      return {
        ratioX: (clientX - sr.left) / sr.width,
        ratioY: (clientY - sr.top) / sr.height,
        width: sr.width,
      };
    }, beforeFocal);
    approximately(afterFocal.ratioX, beforeFocal.ratioX, 0.015, 'Wheel zoom must keep the horizontal interaction point stable');
    approximately(afterFocal.ratioY, beforeFocal.ratioY, 0.015, 'Wheel zoom must keep the vertical interaction point stable');

    const maximumZoomAttempts = 20;
    let zoomInAttempts = 0;
    for (; zoomInAttempts < maximumZoomAttempts && !(await actions.nth(2).isDisabled()); zoomInAttempts += 1) {
      await actions.nth(2).click();
    }
    const maximumZoomDisabled = await actions.nth(2).isDisabled();
    assert(maximumZoomDisabled, `Zoom-in must become disabled within ${maximumZoomAttempts} attempts`, {
      zoomInAttempts,
      maximumZoomAttempts,
    });
    const maximum = await page.evaluate(() => {
      const canvas = document.querySelector('.mermaid-viewer-canvas');
      const stage = document.querySelector('.mermaid-diagram-stage');
      const plane = document.querySelector('.mermaid-diagram-plane');
      return {
        stage: { width: stage.getBoundingClientRect().width, height: stage.getBoundingClientRect().height },
        plane: { width: plane.getBoundingClientRect().width, height: plane.getBoundingClientRect().height },
        canvas: { width: canvas.clientWidth, height: canvas.clientHeight, scrollWidth: canvas.scrollWidth, scrollHeight: canvas.scrollHeight },
      };
    });
    approximately(maximum.stage.width / initial.stage.width, 4, 0.03, 'Maximum zoom must reach exactly four times fitted width');
    approximately(maximum.stage.height / initial.stage.height, 4, 0.03, 'Maximum zoom must reach exactly four times fitted height');
    assert(maximum.canvas.scrollWidth > maximum.canvas.width && maximum.canvas.scrollHeight > maximum.canvas.height, 'Maximum zoom must create real two-axis scroll extents', maximum);
    assert(maximumZoomDisabled, 'Zoom-in must be natively disabled at maximum');

    const nativeEdges = await canvas.evaluate((element) => {
      const points = [];
      const set = (x, y) => {
        element.scrollLeft = x;
        element.scrollTop = y;
        points.push({ left: element.scrollLeft, top: element.scrollTop });
      };
      const maxX = element.scrollWidth - element.clientWidth;
      const maxY = element.scrollHeight - element.clientHeight;
      set(0, 0);
      set(maxX, 0);
      set(0, maxY);
      set(maxX, maxY);
      return { maxX, maxY, points, userSelect: getComputedStyle(element).userSelect };
    });
    assert(nativeEdges.maxX > 0 && nativeEdges.maxY > 0, 'Both native scroll axes must have reachable extent', nativeEdges);
    assert(nativeEdges.points[0].left === 0 && nativeEdges.points[0].top === 0, 'Native scrolling must reach top-left', nativeEdges);
    approximately(nativeEdges.points[1].left, nativeEdges.maxX, 1, 'Native scrolling must reach top-right');
    approximately(nativeEdges.points[2].top, nativeEdges.maxY, 1, 'Native scrolling must reach bottom-left');
    approximately(nativeEdges.points[3].left, nativeEdges.maxX, 1, 'Native scrolling must reach bottom-right horizontally');
    approximately(nativeEdges.points[3].top, nativeEdges.maxY, 1, 'Native scrolling must reach bottom-right vertically');
    assert(nativeEdges.userSelect === 'none', 'Panning surface must suppress text selection', nativeEdges);

    await canvas.evaluate((element) => {
      element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
      element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
    });
    const panTarget = await page.evaluate(() => {
      const canvas = document.querySelector('.mermaid-viewer-canvas');
      const cr = canvas.getBoundingClientRect();
      const interactiveSelector = 'a,[role="link"],button,input,select,textarea,summary,[contenteditable="true"],[tabindex]:not([tabindex="-1"]),.clickable,[onclick]';
      for (const xRatio of [0.2, 0.35, 0.5, 0.65, 0.8]) {
        for (const yRatio of [0.2, 0.35, 0.5, 0.65, 0.8]) {
          const x = cr.left + cr.width * xRatio;
          const y = cr.top + cr.height * yRatio;
          const target = document.elementFromPoint(x, y);
          if (target && !target.closest(interactiveSelector)) return { x, y };
        }
      }
      return { x: cr.left + 10, y: cr.top + 10 };
    });
    const beforeMousePan = await canvas.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
    await page.mouse.move(panTarget.x, panTarget.y);
    await page.mouse.down();
    await page.mouse.move(panTarget.x + 90, panTarget.y + 70, { steps: 6 });
    await page.mouse.up();
    const afterMousePan = await canvas.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
    assert(afterMousePan.left < beforeMousePan.left - 60 && afterMousePan.top < beforeMousePan.top - 40, 'Mouse pointer drag must pan both axes', { beforeMousePan, afterMousePan, panTarget });

    const cdp = await context.newCDPSession(page);
    const touchPoint = { x: panTarget.x, y: panTarget.y };
    const beforeTouchPan = await canvas.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchPoint.x, y: touchPoint.y, id: 1, radiusX: 2, radiusY: 2, force: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchPoint.x - 80, y: touchPoint.y - 60, id: 1, radiusX: 2, radiusY: 2, force: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(100);
    const afterTouchPan = await canvas.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
    assert(afterTouchPan.left > beforeTouchPan.left + 50 && afterTouchPan.top > beforeTouchPan.top + 35, 'Touch pointer drag must pan both axes', { beforeTouchPan, afterTouchPan, touchPoint });

    await actions.nth(1).click();
    await page.waitForTimeout(50);
    const fitted = await canvas.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
    assert(fitted.left === 0 && fitted.top === 0, 'Fit must reset pan to origin', fitted);
    assert(await actions.nth(0).isDisabled(), 'Fit must restore the clear minimum/fitted state');
    const fittedStageWidth = await stage.evaluate((element) => element.getBoundingClientRect().width);
    approximately(fittedStageWidth, initial.stage.width, 1, 'Fit must restore initial fitted size');
    await page.screenshot({ path: path.join(outputDir, 'DZV-BR-002-fit.png'), fullPage: false });
    await closeViewerWithButton(page);

    return { initial, beforeFocal, afterFocal, zoomInAttempts, maximumZoomAttempts, maximum, nativeEdges, beforeMousePan, afterMousePan, beforeTouchPan, afterTouchPan, fitted };
  }, page);

  await runScenario('DZV-BR-003', 'Dismissal, focus, exact body/background isolation, source replacement, and context return', async () => {
    await gotoReady(page, baseUrl);
    await page.evaluate(() => {
      document.querySelector('[data-test="conversation-scroll-owner"]').scrollTop = 120;
      document.body.style.overflow = 'clip';
    });
    const component = page.locator('[data-test="conversation-surface"] .mermaid-diagram-component').first();
    const opener = component.locator('.mermaid-expand-button');
    const background = page.locator('[data-test="background-action"]');
    const backgroundRect = await background.boundingBox();
    const initialScrollY = await page.evaluate(() => window.scrollY);
    const initialSourceScrollTop = await page.locator('[data-test="conversation-scroll-owner"]').evaluate((element) => element.scrollTop);
    assert(initialSourceScrollTop === 120, 'Fixture must start from a non-zero source-container scroll position', { initialSourceScrollTop });
    const previewBox = await component.locator('.diagram-content').boundingBox();
    assert(previewBox, 'Scrolled conversation preview must remain visible for pointer reveal');
    await page.mouse.move(previewBox.x + previewBox.width / 2, previewBox.y + previewBox.height / 2);
    await waitFor('scrolled-source expand reveal without locator auto-scroll', () => opener.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.pointerEvents === 'auto' && Number.parseFloat(style.opacity) > 0.9;
    }));
    const openerBox = await opener.boundingBox();
    assert(openerBox, 'Revealed scrolled-source expand action must remain physically reachable');
    await page.mouse.click(openerBox.x + openerBox.width / 2, openerBox.y + openerBox.height / 2);
    const dialog = page.locator('.mermaid-viewer-dialog');
    await dialog.waitFor({ state: 'visible' });
    assert(await page.evaluate(() => document.body.style.overflow) === 'hidden', 'Open viewer must lock body scrolling');
    assert(await page.evaluate(() => window.scrollY) === initialScrollY, 'Opening must preserve document scroll position');
    assert(await page.locator('[data-test="conversation-scroll-owner"]').evaluate((element) => element.scrollTop) === initialSourceScrollTop, 'Opening must preserve source-container scroll position');
    assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Close diagram viewer', 'Focus must enter viewer at close control');

    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press(index % 4 === 3 ? 'Shift+Tab' : 'Tab');
      const focusInside = await page.evaluate(() => Boolean(document.querySelector('.mermaid-viewer-dialog')?.contains(document.activeElement)));
      assert(focusInside, 'Tab/Shift+Tab focus must remain inside modal', { index });
    }
    await background.evaluate((element) => element.focus());
    assert(await page.evaluate(() => document.querySelector('.mermaid-viewer-dialog')?.contains(document.activeElement)), 'Programmatic background focus must be contained');

    const beforeActivation = await background.textContent();
    if (backgroundRect) await page.mouse.click(backgroundRect.x + backgroundRect.width / 2, backgroundRect.y + backgroundRect.height / 2);
    assert(await background.textContent() === beforeActivation, 'Backdrop/dialog coverage must block physical background activation');
    assert(await dialog.isVisible(), 'Background activation attempt must not dismiss through dialog content');

    await closeViewerWithButton(page);
    assert(await page.evaluate(() => document.body.style.overflow) === 'clip', 'Close must restore exact prior body overflow value');
    assert(await page.evaluate(() => window.scrollY) === initialScrollY, 'Close must preserve document scroll position');
    assert(await page.locator('[data-test="conversation-scroll-owner"]').evaluate((element) => element.scrollTop) === initialSourceScrollTop, 'Close must preserve source-container scroll position');
    await waitFor('close focus return', () => opener.evaluate((element) => document.activeElement === element));

    await opener.click();
    await dialog.waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    await waitFor('Escape focus return', () => opener.evaluate((element) => document.activeElement === element));
    assert(await page.evaluate(() => document.body.style.overflow) === 'clip', 'Escape must restore exact body overflow');

    await opener.click();
    await dialog.waitFor({ state: 'visible' });
    await page.mouse.click(3, 3);
    await dialog.waitFor({ state: 'detached' });
    await waitFor('backdrop focus return', () => opener.evaluate((element) => document.activeElement === element));

    await opener.click();
    await dialog.waitFor({ state: 'visible' });
    await page.evaluate(() => window.__diagramProbe.replaceConversationSource());
    await dialog.waitFor({ state: 'detached' });
    assert(await page.evaluate(() => document.body.style.overflow) === 'clip', 'Source invalidation must restore exact body overflow');
    assert(await page.evaluate(() => !document.activeElement || document.activeElement.isConnected), 'Source invalidation must not focus a removed opener');
    await page.waitForFunction(() => document.querySelector('[data-test="conversation-surface"] .mermaid-expand-button'));
    await page.waitForFunction(() => document.querySelector('[data-test="conversation-surface"] .mermaid-svg-container')?.textContent?.includes('Revision 2 root'));
    assert(await page.locator('[data-test="conversation-surface"] .mermaid-svg-container > svg').count() === 1, 'Replacement source must commit one current SVG');
    await page.evaluate(() => { document.body.style.overflow = ''; });

    return { initialScrollY, initialSourceScrollTop, backgroundRect, bodyOverflowRestored: 'clip', sourceRevision: await page.evaluate(() => window.__diagramProbe.getSourceRevision()) };
  }, page);

  await runScenario('DZV-BR-004', 'Real Mermaid browser/Electron HTTP dispatch and non-HTTP preservation', async () => {
    await gotoReady(page, baseUrl);
    const component = page.locator('[data-test="conversation-surface"] .mermaid-diagram-component').first();
    const inlineRoot = component.locator('.mermaid-svg-container');
    const inlineInventory = await getLinkInventory(inlineRoot);
    const localInline = await getLinkLocator(inlineRoot, (item) => (item.href || item.xlink || '').startsWith('mailto:'), 'non-HTTP inline anchor');
    const localResult = await localInline.locator.evaluate((anchor) => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      const dispatched = anchor.dispatchEvent(event);
      return { dispatched, defaultPrevented: event.defaultPrevented };
    });
    assert(localResult.dispatched && !localResult.defaultPrevented, 'Inline non-HTTP Mermaid anchor must retain native unprevented behavior', { localResult, inlineInventory });
    assert(await page.locator('.mermaid-viewer-dialog').count() === 0, 'Inline non-HTTP anchor must not open viewer');

    const inlineHttp = await clickHttpAnchor(inlineRoot);
    await waitFor('browser inline window.open capture', async () => (await page.evaluate(() => window.__diagramProbeWindowOpenCalls.length)) === 1);
    assert(await page.locator('.mermaid-viewer-dialog').count() === 0, 'Inline HTTP anchor must not open viewer');

    await revealAndClickExpand(component);
    const viewer = page.locator('.mermaid-diagram-stage');
    await viewer.waitFor({ state: 'visible' });
    const expandedInventory = await getLinkInventory(viewer);
    const expandedHttp = await clickHttpAnchor(viewer);
    await waitFor('browser expanded window.open capture', async () => (await page.evaluate(() => window.__diagramProbeWindowOpenCalls.length)) === 2);
    assert(await page.locator('.mermaid-viewer-dialog').isVisible(), 'Expanded HTTP anchor must keep viewer open');
    const localExpanded = await getLinkLocator(viewer, (item) => (item.href || item.xlink || '').startsWith('mailto:'), 'non-HTTP expanded anchor');
    const expandedLocalResult = await localExpanded.locator.evaluate((anchor) => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      const dispatched = anchor.dispatchEvent(event);
      return { dispatched, defaultPrevented: event.defaultPrevented };
    });
    assert(expandedLocalResult.dispatched && !expandedLocalResult.defaultPrevented, 'Expanded non-HTTP Mermaid anchor must retain native unprevented behavior', { expandedLocalResult, expandedInventory });
    assert(await page.evaluate(() => window.__diagramProbeWindowOpenCalls.length) === 2, 'Non-HTTP anchors must not use browser external authority');
    await closeViewerWithButton(page);

    await page.evaluate(() => {
      window.__diagramProbeElectronCalls = [];
      window.electronAPI = {
        openExternalLink: async (url) => {
          window.__diagramProbeElectronCalls.push(url);
          return { success: true };
        },
      };
    });
    await clickHttpAnchor(component.locator('.mermaid-svg-container'));
    await waitFor('Electron inline bridge capture', async () => (await page.evaluate(() => window.__diagramProbeElectronCalls.length)) === 1);
    await revealAndClickExpand(component);
    await page.locator('.mermaid-diagram-stage').waitFor({ state: 'visible' });
    await clickHttpAnchor(page.locator('.mermaid-diagram-stage'));
    await waitFor('Electron expanded bridge capture', async () => (await page.evaluate(() => window.__diagramProbeElectronCalls.length)) === 2);
    const electronCalls = await page.evaluate(() => window.__diagramProbeElectronCalls);
    const browserCalls = await page.evaluate(() => window.__diagramProbeWindowOpenCalls);
    assert(electronCalls.every((url) => url === 'https://example.com/diagram-docs'), 'Electron renderer branch must receive normalized HTTP URL twice', electronCalls);
    assert(browserCalls.length === 2, 'Electron branch must not fall through to browser window.open', { browserCalls, electronCalls });
    await closeViewerWithButton(page);

    return { inlineInventory, expandedInventory, inlineHttp, expandedHttp, localResult, expandedLocalResult, browserCalls, electronCalls };
  }, page);

  await runScenario('DZV-BR-005', 'Pure coarse/no-hover at 360 CSS px and 200% text scale in English and Simplified Chinese', async () => {
    const localeResults = [];
    for (const locale of ['en', 'zh-CN']) {
      const localeContext = await browser.newContext({
        viewport: { width: 360, height: 740 },
        locale: locale === 'en' ? 'en-US' : 'zh-CN',
        timezoneId: 'Europe/Berlin',
        hasTouch: true,
        isMobile: true,
      });
      contexts.push(localeContext);
      const localePage = await localeContext.newPage();
      recordPageEvents(localePage, `narrow-${locale}`);
      await gotoReady(localePage, baseUrl);
      await localePage.evaluate(async (selectedLocale) => {
        await window.__diagramProbe.setLocale(selectedLocale);
        document.documentElement.style.fontSize = '32px';
      }, locale);
      await localePage.waitForFunction((selectedLocale) => document.querySelector('[data-test="resolved-locale"]')?.textContent?.trim() === selectedLocale, locale);
      const component = localePage.locator('[data-test="conversation-surface"] .mermaid-diagram-component').first();
      await component.scrollIntoViewIfNeeded();
      const coarseInline = await readInlineVisualState(component);
      assert(coarseInline.media.pointerCoarse && coarseInline.media.anyCoarse && coarseInline.media.noHover && !coarseInline.media.fineHover, 'Narrow touch context must expose a real pure coarse/no-hover capability', coarseInline.media);
      assert(coarseInline.buttonStyle.opacity === '1' && coarseInline.buttonStyle.pointerEvents === 'auto', 'Pure coarse/no-hover inline control must be visible and operable at rest', coarseInline);
      approximately(coarseInline.button.width, 44, 0.2, 'Pure coarse inline target width must remain touch-sized');
      approximately(coarseInline.button.height, 44, 0.2, 'Pure coarse inline target height must remain touch-sized');
      approximately(Number.parseFloat(coarseInline.surfaceStyle.top), 5, 0.1, 'Pure coarse target must retain a compact 34px painted surface');
      assert(coarseInline.text === '' && coarseInline.ariaLabel && coarseInline.title === coarseInline.ariaLabel && coarseInline.iconPaths > 0, 'Pure coarse inline action must remain icon-only and named', coarseInline);
      await localePage.screenshot({ path: path.join(outputDir, `DZV-BR-005-${locale}-inline-coarse.png`), fullPage: false });
      await component.locator('.mermaid-expand-button').tap();
      await localePage.locator('.mermaid-viewer-dialog').waitFor({ state: 'visible' });
      await localePage.waitForFunction(() => {
        const actions = Array.from(document.querySelectorAll('.mermaid-viewer-action'));
        return actions.length === 4 && actions.every((action) => {
          const icon = action.querySelector('svg');
          return icon && icon.getBoundingClientRect().width > 0 && icon.querySelector('path');
        });
      }, null, { timeout: timeoutMs });
      const layout = await localePage.evaluate(() => {
        const dialog = document.querySelector('.mermaid-viewer-dialog');
        const canvas = document.querySelector('.mermaid-viewer-canvas');
        const rectOf = (element) => {
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
        };
        return {
          locale: document.querySelector('[data-test="resolved-locale"]')?.textContent?.trim(),
          rootFontSize: getComputedStyle(document.documentElement).fontSize,
          viewport: { width: innerWidth, height: innerHeight },
          dialog: rectOf(dialog),
          canvas: rectOf(canvas),
          bodyOverflow: document.body.style.overflow,
        };
      });
      const toolbar = await readToolbarVisualState(localePage);
      const result = { ...layout, coarseInline, toolbar };
      assert(result.locale === locale, 'Requested locale must be active', result);
      assert(result.rootFontSize === '32px', 'Fixture must execute at 200% of default 16px root text size', result);
      assert(toolbar.media.pointerCoarse && toolbar.media.anyCoarse && toolbar.media.noHover, 'Viewer must retain the real pure coarse/no-hover capability', toolbar.media);
      assert(toolbar.actions.length === 4, 'All four actions must remain present at narrow/text-scaled layout', result);
      assert(result.canvas.height >= 120, 'Narrow/text-scaled dialog must retain usable canvas height', result);
      assert(result.bodyOverflow === 'hidden', 'Narrow coarse viewer must block background body scrolling', result);
      for (const action of toolbar.actions) {
        assert(action.rect.x >= 0 && action.rect.right <= 360 && action.rect.y >= 0 && action.rect.bottom <= 740, 'Every action must remain reachable within 360x740 viewport', { action, result });
        assert(action.rect.width >= 44 && action.rect.height >= 44, 'Every action must retain touch-sized target', { action, result });
        approximately(action.rect.width, 44, 0.2, 'Every narrow/coarse action must have the same width');
        approximately(action.rect.height, 44, 0.2, 'Every narrow/coarse action must have the same height');
        assert(action.text === '' && action.iconPaths > 0, 'Every persistent action, including Fit, must remain icon-only with a rendered icon', { action, result });
      }
      for (let left = 0; left < toolbar.actions.length; left += 1) {
        for (let right = left + 1; right < toolbar.actions.length; right += 1) {
          const a = toolbar.actions[left].rect;
          const b = toolbar.actions[right].rect;
          const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x));
          const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
          assert(overlapX * overlapY === 0, 'Toolbar controls must not overlap', { left, right, a, b, result });
        }
      }
      const expectedLabels = locale === 'en'
        ? ['Zoom out', 'Fit diagram', 'Zoom in', 'Close diagram viewer']
        : ['缩小', '适应窗口', '放大', '关闭图表查看器'];
      assert(JSON.stringify(toolbar.actions.map((action) => action.ariaLabel)) === JSON.stringify(expectedLabels), 'Localized toolbar labels must match approved catalog', result);
      assert(JSON.stringify(toolbar.actions.map((action) => action.title)) === JSON.stringify(expectedLabels), 'Localized native titles must match approved catalog', result);
      for (let index = 0; index < 10; index += 1) {
        await localePage.keyboard.press(index % 4 === 3 ? 'Shift+Tab' : 'Tab');
        assert(await localePage.evaluate(() => document.querySelector('.mermaid-viewer-dialog')?.contains(document.activeElement)), 'Narrow locale focus must remain in modal', { locale, index });
      }
      await localePage.screenshot({ path: path.join(outputDir, `DZV-BR-005-${locale}.png`), fullPage: false });
      await localePage.locator('.mermaid-viewer-action').nth(3).tap();
      await localePage.locator('.mermaid-viewer-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
      localeResults.push(result);
      await localeContext.close();
    }
    return localeResults;
  }, page);

  await runScenario('DZV-BR-006', 'Controlled missing/malformed-viewBox rendered bounds fallbacks', async () => {
    await gotoReady(page, baseUrl);
    const results = [];
    for (const fixture of [
      { trigger: '[data-test="open-missing-viewbox"]', expectedAspect: 700 / 340, kind: 'missing' },
      { trigger: '[data-test="open-malformed-viewbox"]', expectedAspect: 600 / 280, kind: 'malformed' },
    ]) {
      await page.locator(fixture.trigger).scrollIntoViewIfNeeded();
      await page.locator(fixture.trigger).click();
      await page.locator('.mermaid-viewer-dialog').waitFor({ state: 'visible' });
      const geometry = await page.evaluate(() => {
        const stage = document.querySelector('.mermaid-diagram-stage');
        const canvas = document.querySelector('.mermaid-viewer-canvas');
        const svg = stage.querySelector('svg');
        const stageRect = stage.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const bbox = svg.getBBox();
        return {
          stage: { width: stageRect.width, height: stageRect.height },
          canvas: { width: canvasRect.width, height: canvasRect.height },
          bbox: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
          viewBox: svg.getAttribute('viewBox'),
          width: svg.getAttribute('width'),
          height: svg.getAttribute('height'),
        };
      });
      assert(geometry.stage.width > 100 && geometry.stage.height > 100, `${fixture.kind} viewBox fallback must produce nontrivial fitted geometry`, geometry);
      approximately(geometry.stage.width / geometry.stage.height, fixture.expectedAspect, 0.06, `${fixture.kind} viewBox fallback must use measured SVG bounds aspect`);
      assert(geometry.bbox.width > 0 && geometry.bbox.height > 0, `${fixture.kind} fixture must expose real browser getBBox bounds`, geometry);

      const viewer = page.locator('.mermaid-diagram-stage');
      const inventory = await getLinkInventory(viewer);
      if (fixture.kind === 'missing') {
        const local = await getLinkLocator(viewer, (item) => (item.href || item.xlink || '').startsWith('mailto:'), 'fallback non-HTTP link');
        const localResult = await local.locator.evaluate((anchor) => {
          const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
          const dispatched = anchor.dispatchEvent(event);
          return { dispatched, defaultPrevented: event.defaultPrevented };
        });
        assert(localResult.dispatched && !localResult.defaultPrevented, 'Fallback local link must retain native unprevented behavior', { localResult, inventory });
      } else {
        await clickHttpAnchor(viewer);
        await waitFor('fallback external-link event', async () => (await page.evaluate(() => window.__diagramProbeExternalLinks.length)) === 1);
      }
      await page.screenshot({ path: path.join(outputDir, `DZV-BR-006-${fixture.kind}.png`), fullPage: false });
      await closeViewerWithButton(page);
      results.push({ fixture, geometry, inventory });
    }
    return results;
  }, page);

  await runScenario('DZV-BR-007', 'Representative dark-surface inline and wide viewer contrast', async () => {
    const darkContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
      timezoneId: 'Europe/Berlin',
      colorScheme: 'dark',
    });
    contexts.push(darkContext);
    const darkPage = await darkContext.newPage();
    recordPageEvents(darkPage, 'dark-fine');
    await gotoReady(darkPage, baseUrl);
    const component = darkPage.locator('[data-test="conversation-surface"] .mermaid-diagram-component').first();
    const rest = await readInlineVisualState(component);
    assert(rest.media.dark && rest.media.fineHover && !rest.media.anyCoarse, 'Dark inspection context must use real fine-pointer dark media', rest.media);
    assert(Number.parseFloat(rest.buttonStyle.opacity) < 0.1 && rest.buttonStyle.pointerEvents === 'none', 'Dark fine-pointer inline chrome must remain quiet at rest', rest);
    await component.locator('.diagram-content').hover();
    await waitFor('dark fine-pointer hover reveal', () => component.locator('.mermaid-expand-button').evaluate((element) => {
      const style = getComputedStyle(element);
      return style.pointerEvents === 'auto' && Number.parseFloat(style.opacity) > 0.9;
    }));
    await darkPage.waitForTimeout(180);
    const hover = await readInlineVisualState(component);
    assert(hover.buttonStyle.color === 'rgb(226, 232, 240)', 'Dark inline icon must use a light foreground', hover);
    assert(hover.surfaceStyle.background.includes('30, 41, 59') && hover.surfaceStyle.borderColor.includes('100, 116, 139'), 'Dark inline surface must use distinct dark background and lighter border tones', hover);
    assert(hover.surfaceStyle.boxShadow !== 'none', 'Dark inline surface must retain separation from the diagram', hover);
    assertRectStable(hover.svg, rest.svg, 0.1, 'Dark hover reveal must not move or resize the SVG');
    await darkPage.screenshot({ path: path.join(outputDir, 'DZV-BR-007-inline-hover-dark.png'), fullPage: false });

    await revealAndClickExpand(component);
    await darkPage.locator('.mermaid-viewer-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    await waitForToolbarIcons(darkPage);
    const toolbar = await readToolbarVisualState(darkPage);
    assert(toolbar.media.dark && toolbar.actions.length === 4, 'Dark viewer must expose all four actions under dark media', toolbar);
    for (const action of toolbar.actions) {
      assert(action.text === '' && action.iconPaths > 0, 'Dark viewer actions must remain icon-only and rendered', action);
      approximately(action.rect.width, 36, 0.2, 'Dark wide viewer action width must remain uniform');
      approximately(action.rect.height, 36, 0.2, 'Dark wide viewer action height must remain uniform');
      assert(action.style.color === 'rgb(226, 232, 240)', 'Dark viewer icons must use a light foreground', action);
      assert(action.style.background === 'rgb(30, 41, 59)' && action.style.borderColor === 'rgb(71, 85, 105)', 'Dark viewer buttons must retain distinguishable surface and border tones', action);
    }
    await darkPage.screenshot({ path: path.join(outputDir, 'DZV-BR-007-viewer-wide-dark.png'), fullPage: false });
    await closeViewerWithButton(darkPage);
    await darkContext.close();
    return { rest, hover, toolbar };
  }, page);

  await runScenario('DZV-BR-008', 'Wide pure-coarse fallback and deterministic fine-primary/coarse-secondary cascade', async () => {
    const coarseContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
      timezoneId: 'Europe/Berlin',
      hasTouch: true,
      isMobile: true,
    });
    contexts.push(coarseContext);
    const coarsePage = await coarseContext.newPage();
    recordPageEvents(coarsePage, 'wide-coarse');
    await gotoReady(coarsePage, baseUrl);
    const coarseComponent = coarsePage.locator('[data-test="conversation-surface"] .mermaid-diagram-component').first();
    const coarseInline = await readInlineVisualState(coarseComponent);
    assert(coarseInline.media.pointerCoarse && coarseInline.media.anyCoarse && coarseInline.media.noHover && !coarseInline.media.fineHover, 'Wide touch context must expose real pure coarse/no-hover capability', coarseInline.media);
    assert(coarseInline.preview.width > 480, 'Pure coarse fallback must be proven independently of the narrow-width media condition', coarseInline.preview);
    assert(coarseInline.buttonStyle.opacity === '1' && coarseInline.buttonStyle.pointerEvents === 'auto' && coarseInline.buttonStyle.transform === 'none', 'Wide pure-coarse control must be visible, operable, and untransformed at rest', coarseInline);
    approximately(coarseInline.button.width, 44, 0.2, 'Wide pure-coarse target width must be 44px');
    approximately(coarseInline.button.height, 44, 0.2, 'Wide pure-coarse target height must be 44px');
    approximately(Number.parseFloat(coarseInline.surfaceStyle.top), 5, 0.1, 'Wide pure-coarse painted surface must remain compact');
    await coarsePage.screenshot({ path: path.join(outputDir, 'DZV-BR-008-inline-wide-coarse.png'), fullPage: false });

    await coarseComponent.locator('.diagram-content').tap({ position: { x: 8, y: Math.max(8, coarseInline.preview.height - 8) } });
    await coarsePage.locator('.mermaid-viewer-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    await waitForToolbarIcons(coarsePage);
    const coarseToolbar = await readToolbarVisualState(coarsePage);
    assert(coarseToolbar.actions.length === 4 && coarseToolbar.media.anyCoarse, 'Wide pure-coarse viewer must expose all four actions', coarseToolbar);
    for (const action of coarseToolbar.actions) {
      approximately(action.rect.width, 44, 0.2, 'Any-coarse viewer action width must be uniformly touch-sized');
      approximately(action.rect.height, 44, 0.2, 'Any-coarse viewer action height must be uniformly touch-sized');
      assert(action.text === '' && action.ariaLabel && action.title === action.ariaLabel && action.iconPaths > 0, 'Any-coarse viewer actions must remain uniform icon-only named controls', action);
    }
    await coarsePage.screenshot({ path: path.join(outputDir, 'DZV-BR-008-viewer-wide-coarse.png'), fullPage: false });
    await coarsePage.locator('.mermaid-viewer-action').nth(3).tap();
    await coarsePage.locator('.mermaid-viewer-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
    await coarseContext.close();

    await gotoReady(page, baseUrl);
    const hybridComponent = page.locator('[data-test="conversation-surface"] .mermaid-diagram-component').first();
    const fineBaseline = await readInlineVisualState(hybridComponent);
    assert(fineBaseline.media.fineHover && !fineBaseline.media.anyCoarse, 'Hybrid cascade proxy must start from installed Chrome real fine-primary state', fineBaseline.media);
    assert(Number.parseFloat(fineBaseline.buttonStyle.opacity) < 0.1 && fineBaseline.buttonStyle.pointerEvents === 'none', 'Fine-primary resting rule must be active before the coarse-secondary proxy', fineBaseline);
    const hybridMethod = await applyHybridCoarseCssomOverride(page);
    assert(hybridMethod.realCapabilities.fineHover && !hybridMethod.realCapabilities.anyCoarse, 'CSSOM proxy must not overstate real browser capabilities', hybridMethod);
    const inlineRule = hybridMethod.extracted.find((rule) => rule.selector.includes('.mermaid-expand-button') && !rule.selector.includes('::before'));
    const surfaceRule = hybridMethod.extracted.find((rule) => rule.selector.includes('.mermaid-expand-button::before'));
    const viewerRule = hybridMethod.extracted.find((rule) => rule.selector.includes('.mermaid-viewer-action'));
    assert(hybridMethod.extracted.length > 0 && hybridMethod.extracted.every((rule) => rule.acceptedBySemanticPolicy && rule.hasStandaloneAnyCoarseBranch), 'Every cloned hybrid rule must satisfy the standalone any-pointer:coarse branch policy', hybridMethod.extracted);
    assert(inlineRule && inlineRule.sourceKind === 'inline' && inlineRule.isExactStandaloneAnyCoarse && inlineRule.normalizedCondition === '(any-pointer: coarse)' && inlineRule.mediaBranches.length === 1, 'Inline hybrid override must come from the exact standalone any-pointer:coarse media condition', inlineRule);
    assert(surfaceRule && surfaceRule.sourceKind === 'inline' && surfaceRule.isExactStandaloneAnyCoarse && surfaceRule.normalizedCondition === '(any-pointer: coarse)' && surfaceRule.mediaBranches.length === 1, 'Inline coarse-secondary paint override must come from the exact standalone any-pointer:coarse media condition', surfaceRule);
    assert(viewerRule && viewerRule.sourceKind === 'viewer' && viewerRule.hasStandaloneAnyCoarseBranch && viewerRule.mediaBranches.includes('(any-pointer: coarse)'), 'Viewer hybrid override must include any-pointer:coarse as an exact independent media-list branch', viewerRule);
    assert(inlineRule && /height:\s*44px/.test(inlineRule.declarations) && /opacity:\s*1/.test(inlineRule.declarations) && /pointer-events:\s*auto/.test(inlineRule.declarations) && /width:\s*44px/.test(inlineRule.declarations), 'Emitted inline any-pointer:coarse rule must contain the visible 44px override', hybridMethod.extracted);
    assert(surfaceRule && /inset:\s*5px/.test(surfaceRule.declarations), 'Emitted inline coarse-secondary paint rule must retain the compact inset', hybridMethod.extracted);
    assert(viewerRule && /height:\s*44px/.test(viewerRule.declarations) && /width:\s*44px/.test(viewerRule.declarations), 'Emitted viewer any-pointer:coarse rule must contain the uniform 44px override', hybridMethod.extracted);
    await waitFor('combined fine-primary/coarse-secondary transition', () => hybridComponent.locator('.mermaid-expand-button').evaluate((element) => {
      const style = getComputedStyle(element);
      return style.opacity === '1' && style.pointerEvents === 'auto' && style.transform === 'none';
    }));
    await page.waitForTimeout(180);
    const hybridInline = await readInlineVisualState(hybridComponent);
    assert(hybridInline.buttonStyle.opacity === '1' && hybridInline.buttonStyle.pointerEvents === 'auto' && hybridInline.buttonStyle.transform === 'none', 'Exact emitted coarse-secondary declarations must override fine-primary hiding in deterministic combined cascade', hybridInline);
    approximately(hybridInline.button.width, 44, 0.2, 'Hybrid proxy inline target width must be 44px');
    approximately(hybridInline.button.height, 44, 0.2, 'Hybrid proxy inline target height must be 44px');
    approximately(hybridInline.rightGap, 4, 0.2, 'Hybrid proxy inline target must keep the four-pixel right inset');
    approximately(hybridInline.topGap, 4, 0.2, 'Hybrid proxy inline target must keep the four-pixel top inset');
    await page.screenshot({ path: path.join(outputDir, 'DZV-BR-008-inline-hybrid-cssom.png'), fullPage: false });

    await hybridComponent.locator('.mermaid-expand-button').click();
    await page.locator('.mermaid-viewer-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    await waitForToolbarIcons(page);
    const hybridToolbar = await readToolbarVisualState(page);
    assert(hybridToolbar.actions.length === 4, 'Hybrid proxy viewer must retain four actions', hybridToolbar);
    for (const action of hybridToolbar.actions) {
      approximately(action.rect.width, 44, 0.2, 'Hybrid proxy viewer action width must be uniformly touch-sized');
      approximately(action.rect.height, 44, 0.2, 'Hybrid proxy viewer action height must be uniformly touch-sized');
      assert(action.text === '' && action.iconPaths > 0, 'Hybrid proxy viewer action must remain icon-only', action);
    }
    await page.screenshot({ path: path.join(outputDir, 'DZV-BR-008-viewer-hybrid-cssom.png'), fullPage: false });
    await closeViewerWithButton(page);
    await removeHybridCoarseCssomOverride(page);
    await page.locator('[data-test="background-action"]').focus();
    await page.mouse.move(1, 1);
    await waitFor('restored fine-primary concealment transition', () => hybridComponent.locator('.mermaid-expand-button').evaluate((element) => {
      const style = getComputedStyle(element);
      return Number.parseFloat(style.opacity) < 0.1 && style.pointerEvents === 'none';
    }));
    await page.waitForTimeout(180);
    const restoredFine = await readInlineVisualState(hybridComponent);
    assert(Number.parseFloat(restoredFine.buttonStyle.opacity) < 0.1 && restoredFine.buttonStyle.pointerEvents === 'none', 'Removing the deterministic proxy must restore real fine-primary resting behavior', restoredFine);

    return {
      realWideCoarse: { inline: coarseInline, toolbar: coarseToolbar },
      hybridLimitation: 'Installed Chrome/CDP contexts expose either fine-primary or coarse-primary, not simultaneous fine-primary/coarse-secondary capabilities.',
      hybridMethod,
      fineBaseline,
      hybridInline,
      hybridToolbar,
      restoredFine,
    };
  }, page);

  await runScenario('DZV-BR-009', 'Real maximized ArtifactContentViewer nested stacking, one-layer dismissal, focus return, and repeated cleanup', async () => {
    await gotoReady(page, baseUrl);
    const shell = page.locator('[data-testid="artifact-content-viewer-shell"]');
    const previewButton = shell.locator('button[title="Preview Mode"]');
    const hostToggle = shell.locator('[data-testid="artifact-viewer-zen-toggle"]');

    await shell.locator('[data-testid="artifact-path-display"]').waitFor({ state: 'visible', timeout: timeoutMs });
    await previewButton.waitFor({ state: 'visible', timeout: timeoutMs });
    await previewButton.click();
    const component = shell.locator('.mermaid-diagram-component').first();
    await component.locator('.mermaid-svg-container > svg').waitFor({ state: 'visible', timeout: timeoutMs });
    const opener = component.locator('.mermaid-expand-button');
    const originalSvgId = await component.locator('.mermaid-svg-container > svg').getAttribute('id');
    const bodyOverflowBefore = await page.evaluate(() => document.body.style.overflow);
    const beforeMaximize = await readNestedArtifactState(page);
    assert(beforeMaximize.path === 'docs/nested-diagram-probe.md', 'Artifact fixture must select the expected Markdown path before maximize', beforeMaximize);
    assert(beforeMaximize.previewSelected && beforeMaximize.contentPreserved, 'Artifact fixture must be in Preview Mode with its selected content rendered', beforeMaximize);
    assert(beforeMaximize.inlineSvgCount === 1 && beforeMaximize.viewerSvgCount === 0, 'Artifact fixture must start with one inline current SVG', beforeMaximize);

    await hostToggle.click();
    await waitFor('artifact host tier-120 maximize', async () => {
      const state = await readNestedArtifactState(page);
      return state.shellFixed && state.shellZIndex === '120' && state.toggleTitle === 'Restore view';
    });
    const maximized = await readNestedArtifactState(page);
    assert(maximized.path === beforeMaximize.path && maximized.previewSelected && maximized.contentPreserved, 'Host maximize must preserve path, content, and Preview Mode', { beforeMaximize, maximized });

    const dialog = page.locator('.mermaid-viewer-dialog');
    const openNestedViewer = async () => {
      await revealAndClickExpand(component);
      await dialog.waitFor({ state: 'visible', timeout: timeoutMs });
      await waitForToolbarIcons(page);
      await waitFor('nested viewer fitted layout', () => page.evaluate(() => {
        const canvas = document.querySelector('.mermaid-viewer-canvas');
        const stage = document.querySelector('.mermaid-diagram-stage');
        if (!canvas || !stage) return false;
        const canvasRect = canvas.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();
        return stageRect.width > 0
          && stageRect.height > 0
          && stageRect.left >= canvasRect.left - 1
          && stageRect.right <= canvasRect.right + 1
          && stageRect.top >= canvasRect.top - 1
          && stageRect.bottom <= canvasRect.bottom + 1;
      }));
    };

    await openNestedViewer();
    const nestedOpen = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="artifact-content-viewer-shell"]');
      const hostToggle = shell?.querySelector('[data-testid="artifact-viewer-zen-toggle"]');
      const backdrop = document.querySelector('.mermaid-viewer-backdrop');
      const dialog = document.querySelector('.mermaid-viewer-dialog');
      const canvas = document.querySelector('.mermaid-viewer-canvas');
      const stage = document.querySelector('.mermaid-diagram-stage');
      const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const centerHit = document.elementFromPoint(center.x, center.y);
      const toggleRect = hostToggle?.getBoundingClientRect();
      const hostControlPoint = toggleRect
        ? { x: toggleRect.left + toggleRect.width / 2, y: toggleRect.top + toggleRect.height / 2 }
        : null;
      const hostControlHit = hostControlPoint
        ? document.elementFromPoint(hostControlPoint.x, hostControlPoint.y)
        : null;
      const canvasRect = canvas?.getBoundingClientRect();
      const stageRect = stage?.getBoundingClientRect();
      return {
        hostZIndex: shell ? getComputedStyle(shell).zIndex : null,
        viewerZIndex: backdrop ? getComputedStyle(backdrop).zIndex : null,
        hostFixed: Boolean(shell?.classList.contains('fixed')),
        path: shell?.querySelector('[data-testid="artifact-path-display"]')?.textContent?.trim() || null,
        previewSelected: Boolean(shell?.querySelector('button[title="Preview Mode"]')?.classList.contains('bg-blue-50')),
        contentPreserved: Boolean(shell?.textContent?.includes('Nested artifact preserved heading')),
        inlineSvgCount: shell?.querySelectorAll('.mermaid-svg-container > svg').length ?? 0,
        viewerSvgCount: document.querySelectorAll('.mermaid-diagram-stage > svg').length,
        viewerSvgId: document.querySelector('.mermaid-diagram-stage > svg')?.getAttribute('id') || null,
        backdropCount: document.querySelectorAll('.mermaid-viewer-backdrop').length,
        controls: document.querySelectorAll('.mermaid-viewer-action').length,
        center,
        centerHitClass: centerHit?.className?.baseVal || centerHit?.className || null,
        centerHitInsideViewer: Boolean(dialog?.contains(centerHit)),
        centerHitInsideHost: Boolean(shell?.contains(centerHit)),
        hostControlPoint,
        hostControlHitInsideViewer: Boolean(dialog?.contains(hostControlHit) || backdrop === hostControlHit),
        hostControlHitInsideHost: Boolean(shell?.contains(hostControlHit)),
        fitted: Boolean(canvasRect && stageRect
          && stageRect.width > 0
          && stageRect.height > 0
          && stageRect.left >= canvasRect.left - 1
          && stageRect.right <= canvasRect.right + 1
          && stageRect.top >= canvasRect.top - 1
          && stageRect.bottom <= canvasRect.bottom + 1),
        activeLabel: document.activeElement?.getAttribute('aria-label') || null,
        bodyOverflow: document.body.style.overflow,
      };
    });
    assert(nestedOpen.hostZIndex === '120' && nestedOpen.viewerZIndex === '130', 'Nested viewer must compute above the real tier-120 artifact host', nestedOpen);
    assert(Number(nestedOpen.viewerZIndex) > Number(nestedOpen.hostZIndex), 'Nested viewer z-index must numerically outrank the host', nestedOpen);
    assert(nestedOpen.centerHitInsideViewer && !nestedOpen.centerHitInsideHost, 'Viewport-center hit-testing must belong to the viewer instead of the host', nestedOpen);
    assert(nestedOpen.hostControlHitInsideViewer && !nestedOpen.hostControlHitInsideHost, 'Physical hit-testing over the lower host restore control must remain owned by the top viewer', nestedOpen);
    assert(nestedOpen.hostFixed && nestedOpen.path === beforeMaximize.path && nestedOpen.previewSelected && nestedOpen.contentPreserved, 'Covered host must remain mounted, maximized, selected, and in Preview Mode', nestedOpen);
    assert(nestedOpen.inlineSvgCount === 0 && nestedOpen.viewerSvgCount === 1 && nestedOpen.viewerSvgId === originalSvgId, 'Open nested viewer must own exactly one current SVG with stable identity', { nestedOpen, originalSvgId });
    assert(nestedOpen.backdropCount === 1 && nestedOpen.controls === 4 && nestedOpen.fitted, 'Nested viewer must expose one fitted usable top layer with four controls', nestedOpen);
    assert(nestedOpen.activeLabel === 'Close diagram viewer' && nestedOpen.bodyOverflow === 'hidden', 'Nested viewer must receive focus and lock body scrolling', nestedOpen);
    await page.mouse.click(nestedOpen.center.x, nestedOpen.center.y);
    assert(await dialog.isVisible(), 'Physical center interaction must not dismiss or activate through the viewer');
    assert((await readNestedArtifactState(page)).shellFixed, 'Physical viewer interaction must not restore the lower host');
    await page.screenshot({ path: path.join(outputDir, 'DZV-BR-009-nested-open.png'), fullPage: false });

    const cycles = [];
    const assertClosedCycle = async (method) => {
      await dialog.waitFor({ state: 'detached', timeout: timeoutMs });
      await waitFor(`${method} focus return after viewer close`, () => opener.evaluate((element) => document.activeElement === element));
      const state = await readNestedArtifactState(page);
      assert(state.shellFixed && state.shellZIndex === '120' && state.toggleTitle === 'Restore view', `${method} must leave the real artifact host maximized`, state);
      assert(state.path === beforeMaximize.path && state.previewSelected && state.contentPreserved, `${method} must preserve selected content and Preview Mode`, state);
      assert(state.inlineSvgCount === 1 && state.inlineSvgId === originalSvgId && state.viewerSvgCount === 0, `${method} must restore exactly one inline SVG with stable identity`, { state, originalSvgId });
      assert(state.inlineSvgRect?.width > 0 && state.inlineSvgRect?.height > 0, `${method} must not leave a blank diagram region`, state);
      assert(state.backdropCount === 0 && state.viewerCanvasCount === 0, `${method} must remove transient viewer DOM`, state);
      assert(state.bodyOverflow === bodyOverflowBefore && state.openerFocused, `${method} must restore exact body overflow and focus after lifecycle completion`, { state, bodyOverflowBefore });
      cycles.push({ method, state });
    };

    await page.locator('button[aria-label="Close diagram viewer"]').click();
    await assertClosedCycle('Close button');

    await openNestedViewer();
    const backdropOwnsCorner = await page.locator('.mermaid-viewer-backdrop').evaluate((element) => document.elementFromPoint(3, 3) === element);
    assert(backdropOwnsCorner, 'Backdrop must physically own the corner hit target above the artifact');
    await page.mouse.click(3, 3);
    await assertClosedCycle('Backdrop');

    await openNestedViewer();
    await page.keyboard.press('Escape');
    await assertClosedCycle('First Escape');
    await page.screenshot({ path: path.join(outputDir, 'DZV-BR-009-first-escape-host-retained.png'), fullPage: false });

    await page.keyboard.press('Escape');
    await waitFor('separate later artifact host dismissal', async () => {
      const state = await readNestedArtifactState(page);
      return !state.shellFixed && state.toggleTitle === 'Maximize view';
    });
    const afterHostDismissal = await readNestedArtifactState(page);
    assert(afterHostDismissal.inlineSvgCount === 1 && afterHostDismissal.inlineSvgId === originalSvgId, 'Later host dismissal must retain the restored inline diagram', afterHostDismissal);
    assert(afterHostDismissal.path === beforeMaximize.path && afterHostDismissal.previewSelected && afterHostDismissal.contentPreserved, 'Later host dismissal must return to the same selected Preview surface', afterHostDismissal);
    assert(afterHostDismissal.backdropCount === 0 && afterHostDismissal.viewerCanvasCount === 0 && afterHostDismissal.bodyOverflow === bodyOverflowBefore, 'Repeated cycles and host dismissal must leave no overlay or body-lock residue', { afterHostDismissal, bodyOverflowBefore });
    assert(afterHostDismissal.underlayPresent, 'Separate host dismissal must reveal the fixture surface underneath');

    return {
      beforeMaximize,
      maximized,
      originalSvgId,
      bodyOverflowBefore,
      nestedOpen,
      cycles,
      afterHostDismissal,
    };
  }, page);

  const pageErrors = evidence.browserEvents.filter((event) => event.type === 'pageerror');
  if (pageErrors.length) {
    evidence.failures.push({ id: 'BROWSER-PAGE-ERRORS', message: 'Unexpected browser page errors', details: pageErrors });
  }
} catch (error) {
  evidence.failures.push({
    id: 'HARNESS',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
} finally {
  evidence.cleanup.contexts = [];
  for (const [reverseIndex, context] of [...contexts].reverse().entries()) {
    const contextIndex = contexts.length - reverseIndex - 1;
    try {
      await context.close();
      evidence.cleanup.contexts.push({ index: contextIndex, status: 'closed' });
    } catch (error) {
      const status = recordCleanupFailure(`CLEANUP-CONTEXT-${contextIndex}`, `browser context ${contextIndex}`, error);
      evidence.cleanup.contexts.push({ index: contextIndex, status });
    }
  }
  if (browser) {
    try {
      await browser.close();
      evidence.cleanup.browser = 'closed';
    } catch (error) {
      evidence.cleanup.browser = recordCleanupFailure('CLEANUP-BROWSER', 'browser', error);
    }
  } else {
    evidence.cleanup.browser = 'not-started';
  }
  try {
    evidence.cleanup.devServer = await killOwnedProcess(devServer);
  } catch (error) {
    evidence.cleanup.devServer = recordCleanupFailure('CLEANUP-DEV-SERVER', 'Nuxt dev server process group', error);
  }
  if (devLogStream) {
    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          devLogStream.off('error', onError);
          reject(error);
        };
        devLogStream.once('error', onError);
        devLogStream.end(() => {
          devLogStream.off('error', onError);
          resolve();
        });
      });
      evidence.cleanup.devLog = 'closed';
    } catch (error) {
      evidence.cleanup.devLog = recordCleanupFailure('CLEANUP-DEV-LOG', 'Nuxt dev log stream', error);
    }
  } else {
    evidence.cleanup.devLog = 'not-started';
  }
  if (pageInstalled) {
    try {
      await fs.rm(installedPagePath, { force: true });
      assert(!existsSync(installedPagePath), `Temporary fixture page still exists after removal: ${installedPagePath}`);
      evidence.cleanup.temporaryPage = 'removed';
    } catch (error) {
      evidence.cleanup.temporaryPage = recordCleanupFailure('CLEANUP-TEMPORARY-PAGE', 'temporary Nuxt fixture page', error);
    }
  } else {
    evidence.cleanup.temporaryPage = 'not-installed';
  }
  evidence.finishedAt = new Date().toISOString();
  evidence.result = evidence.failures.length ? 'Fail' : 'Pass';
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (evidence.failures.length) {
  console.error(`Diagram zoom viewer probe failed with ${evidence.failures.length} failure(s). Evidence: ${evidencePath}`);
  for (const failure of evidence.failures) console.error(`- ${failure.id}: ${failure.message}`);
  process.exitCode = 1;
} else {
  console.log(`Diagram zoom viewer probe passed. Evidence: ${evidencePath}`);
}
