import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const repoRoot = '/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause';
const artifactDir = path.join(repoRoot, 'tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts');
const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:3000';
const workspacePath = process.env.TEST_WORKSPACE_PATH || path.join(artifactDir, 'api-e2e-round14-browser-workspace-20260529');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const requireFromWeb = createRequire(path.join(repoRoot, 'autobyteus-web/package.json'));
const { chromium } = requireFromWeb('playwright-core');

const screenshots = {
  agentsList: path.join(artifactDir, 'api-e2e-round14-playwright-01-agents-list-20260529.png'),
  initialWorkspace: path.join(artifactDir, 'api-e2e-round14-playwright-02-initial-workspace-20260529.png'),
  runtimeModelWorkspace: path.join(artifactDir, 'api-e2e-round14-playwright-03-codex-gpt55-workspace-20260529.png'),
  filesBeforeRun: path.join(artifactDir, 'api-e2e-round14-playwright-04-files-before-run-20260529.png'),
  afterRun: path.join(artifactDir, 'api-e2e-round14-playwright-05-after-run-20260529.png'),
  filesAfterRun: path.join(artifactDir, 'api-e2e-round14-playwright-06-files-after-run-20260529.png'),
};
const summaryPath = path.join(artifactDir, 'api-e2e-round14-browser-codex-gpt55-files-validation-20260529.json');
const eventLogPath = path.join(artifactDir, 'api-e2e-round14-browser-codex-gpt55-files-validation-20260529.log');

const events = [];
const consoleEntries = [];
const networkFailures = [];
let browser;

function log(event, data = {}) {
  const entry = { at: new Date().toISOString(), event, ...data };
  events.push(entry);
  console.log(JSON.stringify(entry));
}

async function ensureWorkspaceFixture() {
  await fs.mkdir(path.join(workspacePath, 'src', 'nested'), { recursive: true });
  await fs.mkdir(path.join(workspacePath, 'docs'), { recursive: true });
  await fs.writeFile(path.join(workspacePath, 'README.md'), '# Browser Round 14 Workspace\n\nThis README confirms that browser-level FileExplorer validation can open file content after the TDZ fix.\n');
  await fs.writeFile(path.join(workspacePath, 'src', 'main.ts'), 'export const browserRound14 = "codex-gpt55-files";\n');
  await fs.writeFile(path.join(workspacePath, 'src', 'nested', 'deep-note.md'), '# Deep Note\n\nNested file used by the browser FileExplorer validation.\n');
  await fs.writeFile(path.join(workspacePath, 'docs', 'search-target.md'), '# Search Target\n\nBrowser Round 14 search target document.\n');
}

async function bodyText(page) {
  return await page.locator('body').innerText({ timeout: 15000 });
}

function classifyFailures(text) {
  const patterns = [
    /Error\s+500/i,
    /Cannot access ['"]handleKeydown['"] before initialization/i,
    /Cannot access ['"]ee['"] before initialization/i,
    /Cannot access .* before initialization/i,
    /ReferenceError:.*handleKeydown/i,
    /ReferenceError:.*\bee\b/i,
  ];
  return patterns.map((pattern) => pattern.source).filter((_, index) => patterns[index].test(text));
}

async function assertNoFrontendFailure(page, stage) {
  await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => undefined);
  await page.waitForTimeout(350);
  const text = await bodyText(page);
  const bodyFailures = classifyFailures(text);
  const consoleFailures = consoleEntries.filter((entry) => /Cannot access .* before initialization|ReferenceError:.*handleKeydown|ReferenceError:.*\bee\b/i.test(entry.text));
  const pageErrors = consoleEntries.filter((entry) => entry.type === 'pageerror');
  log('assert_frontend_health', {
    stage,
    url: page.url(),
    bodyFailures,
    consoleFailureCount: consoleFailures.length,
    pageErrorCount: pageErrors.length,
    bodyExcerpt: text.slice(0, 500),
  });
  if (bodyFailures.length || consoleFailures.length || pageErrors.length) {
    throw new Error(`Frontend failure at ${stage}: body=${bodyFailures.join(',')} console=${consoleFailures.map((e) => e.text).join(' | ')} pageErrors=${pageErrors.map((e) => e.text).join(' | ')}`);
  }
  return text;
}

async function waitForText(page, pattern, stage, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const text = await bodyText(page).catch(() => '');
    if (typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text)) {
      log('wait_for_text_passed', { stage, pattern: String(pattern), elapsedMs: Date.now() - started });
      return text;
    }
    await page.waitForTimeout(500);
  }
  const text = await bodyText(page).catch(() => '');
  throw new Error(`Timed out waiting for text at ${stage}: ${String(pattern)}. Body excerpt: ${text.slice(0, 1200)}`);
}

async function screenshot(page, name) {
  const filePath = screenshots[name];
  await page.screenshot({ path: filePath, fullPage: false });
  log('screenshot', { name, filePath });
}

async function clickExactTextButton(page, exactText, stage) {
  const clicked = await page.evaluate((text) => {
    const candidates = Array.from(document.querySelectorAll('button'));
    const button = candidates.find((candidate) => (candidate.innerText || candidate.textContent || '').trim() === text);
    if (!button) return false;
    button.click();
    return true;
  }, exactText);
  if (!clicked) {
    const labels = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((button) => (button.innerText || button.getAttribute('aria-label') || '').trim()).filter(Boolean));
    throw new Error(`Button ${exactText} not found at ${stage}. Buttons: ${labels.slice(0, 60).join(' | ')}`);
  }
  log('click', { stage, label: exactText });
}


async function clickFileExplorerItem(page, name, stage) {
  const clicked = await page.evaluate((targetName) => {
    const items = Array.from(document.querySelectorAll('.file-item'));
    const item = items.find((candidate) => {
      const header = candidate.querySelector('.file-header');
      if (!header) return false;
      return Array.from(header.querySelectorAll('span')).some((span) => (span.textContent || '').trim() === targetName);
    });
    if (!item) return false;
    item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  }, name);
  log('file_item_click', { stage, name, clicked });
  return clicked;
}

async function selectRuntimeCodex(page) {
  const runtime = page.locator('#agent-run-runtime-kind');
  await runtime.waitFor({ state: 'attached', timeout: 30000 });
  await runtime.selectOption('codex_app_server');
  await page.waitForTimeout(750);
  const runtimeState = await runtime.evaluate((element) => ({
    value: element.value,
    text: element.selectedOptions?.[0]?.textContent?.trim() || '',
  }));
  log('runtime_selected', runtimeState);
  if (runtimeState.value !== 'codex_app_server' || !/Codex App Server/i.test(runtimeState.text)) {
    throw new Error(`Failed to select Codex App Server runtime: ${JSON.stringify(runtimeState)}`);
  }
}

async function selectModelGpt55(page) {
  // The model selector is the SearchableGroupedSelect immediately under the LLM Model/Model label.
  const opened = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const label = labels.find((candidate) => /\b(LLM\s+)?Model\b/i.test((candidate.textContent || '').trim()));
    const button = label?.parentElement?.querySelector('button');
    if (button) {
      button.click();
      return { clicked: true, buttonText: (button.textContent || '').trim() };
    }
    const fallback = Array.from(document.querySelectorAll('button')).find((candidate) => /Select a model|OpenAI|GPT|Model/i.test((candidate.textContent || '').trim()));
    if (fallback) {
      fallback.click();
      return { clicked: true, buttonText: (fallback.textContent || '').trim(), fallback: true };
    }
    return { clicked: false };
  });
  log('model_dropdown_open_attempt', opened);
  if (!opened.clicked) throw new Error('Could not open model selector dropdown');

  const searchInput = page.locator('input[placeholder="Search models..."]').last();
  await searchInput.waitFor({ state: 'visible', timeout: 15000 });
  await searchInput.fill('GPT-5.5');
  await page.waitForTimeout(500);
  const option = page.locator('li').filter({ hasText: /GPT-5\.5/i }).first();
  await option.waitFor({ state: 'visible', timeout: 15000 });
  const optionText = await option.innerText();
  await option.click();
  log('model_selected', { optionText });

  await page.waitForTimeout(750);
  const modelState = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const label = labels.find((candidate) => /\b(LLM\s+)?Model\b/i.test((candidate.textContent || '').trim()));
    const button = label?.parentElement?.querySelector('button');
    return { buttonText: (button?.textContent || '').trim() };
  });
  log('model_button_state', modelState);
  if (!/GPT-5\.5/i.test(modelState.buttonText) || !/OpenAI/i.test(modelState.buttonText)) {
    throw new Error(`Failed to select OpenAI / GPT-5.5 model: ${JSON.stringify(modelState)}`);
  }
}

async function loadWorkspace(page) {
  const newTabs = page.getByRole('tab', { name: /^New$/ });
  const tabCount = await newTabs.count();
  if (tabCount > 0) {
    await newTabs.last().click();
    log('click', { stage: 'workspace selector', label: 'New tab', tabCount });
  } else {
    await clickExactTextButton(page, 'New', 'workspace selector fallback');
  }
  const workspaceInput = page.locator('input[placeholder="/absolute/path/to/workspace"]').first();
  await workspaceInput.waitFor({ state: 'visible', timeout: 15000 });
  const inputSnapshot = await page.evaluate(() => Array.from(document.querySelectorAll('input[type="text"]')).map((input) => ({
    placeholder: input.getAttribute('placeholder'),
    value: input.value,
    visible: !!(input.offsetWidth || input.offsetHeight || input.getClientRects().length),
  })));
  log('workspace_text_inputs_seen', { inputSnapshot });
  await workspaceInput.fill(workspacePath);
  const loadButton = page.locator('button[title="Load workspace"]').first();
  await loadButton.waitFor({ state: 'visible', timeout: 15000 });
  await loadButton.click();
  log('workspace_load_requested', { workspacePath });
  const text = await waitForText(page, /Workspace loaded:|README\.md|search-target\.md|Browser Round 14 Workspace/, 'workspace load', 60000);
  if (!text.includes('README.md') && !text.includes('Workspace loaded:') && !text.includes('Browser Round 14 Workspace')) {
    throw new Error(`Workspace load did not expose expected workspace signals. Body excerpt: ${text.slice(0, 1200)}`);
  }
}

async function openFilesAndAssert(page, stage) {
  await clickExactTextButton(page, 'Files', stage);
  await page.waitForTimeout(1000);
  let text = await assertNoFrontendFailure(page, `${stage}: after Files tab click`);
  const topLevelExpected = ['README.md', 'docs', 'src'];
  const topLevelMissing = topLevelExpected.filter((item) => !text.includes(item));
  if (topLevelMissing.length) {
    throw new Error(`Files tab missing expected top-level tree at ${stage}: ${topLevelMissing.join(', ')}. Body excerpt: ${text.slice(0, 1600)}`);
  }
  // Expand folders to prove browser-driven FileExplorer child loading, not just root rendering.
  if (!text.includes('search-target.md')) {
    await clickFileExplorerItem(page, 'docs', `${stage}: expand docs`);
    await page.waitForTimeout(800);
    text = await assertNoFrontendFailure(page, `${stage}: after docs expand`);
  }
  if (!text.includes('main.ts')) {
    await clickFileExplorerItem(page, 'src', `${stage}: expand src`);
    await page.waitForTimeout(800);
    text = await assertNoFrontendFailure(page, `${stage}: after src expand`);
  }
  if (text.includes('nested') && !text.includes('deep-note.md')) {
    await clickFileExplorerItem(page, 'nested', `${stage}: expand nested`);
    await page.waitForTimeout(800);
    text = await assertNoFrontendFailure(page, `${stage}: after nested expand`);
  }
  const expected = ['README.md', 'search-target.md', 'main.ts', 'deep-note.md'];
  const missing = expected.filter((item) => !text.includes(item));
  if (missing.length) {
    throw new Error(`Files tab missing expected expanded tree/content at ${stage}: ${missing.join(', ')}. Body excerpt: ${text.slice(0, 1600)}`);
  }
  // Open README explicitly if it is visible in the file tree; this also proves content loading/read path from the browser.
  await clickFileExplorerItem(page, 'README.md', `${stage}: open README`);
  await page.waitForTimeout(800);
  const afterReadme = await assertNoFrontendFailure(page, `${stage}: after README click`);
  if (!afterReadme.includes('Browser Round 14 Workspace')) {
    throw new Error(`README content did not render at ${stage}. Body excerpt: ${afterReadme.slice(0, 1600)}`);
  }
  log('files_assertion_passed', { stage, expected });
  return afterReadme;
}

async function runAgent(page) {
  const runButton = page.getByRole('button', { name: /^Run Agent$/ }).first();
  await runButton.waitFor({ state: 'visible', timeout: 30000 });
  const disabled = await runButton.isDisabled();
  if (disabled) throw new Error('Run Agent button is disabled after selecting Codex App Server / GPT-5.5 and loading workspace');
  await runButton.click();
  log('click', { label: 'Run Agent' });
  await page.waitForTimeout(4000);
  const text = await assertNoFrontendFailure(page, 'after Run Agent');
  if (!/Daily Assistant/i.test(text) || !/Offline|Online|Connected|New - Daily Assistant/i.test(text)) {
    throw new Error(`Run Agent did not reach expected workspace run UI. Body excerpt: ${text.slice(0, 1600)}`);
  }
}

async function main() {
  await fs.mkdir(artifactDir, { recursive: true });
  await ensureWorkspaceFixture();
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'en-US' });
  const page = await context.newPage();

  page.on('console', (message) => {
    const entry = { at: new Date().toISOString(), type: message.type(), text: message.text() };
    consoleEntries.push(entry);
    if (message.type() === 'error' || /Cannot access|ReferenceError|FileExplorerTabs|Error 500/i.test(entry.text)) {
      log('browser_console', entry);
    }
  });
  page.on('pageerror', (error) => {
    const entry = { at: new Date().toISOString(), type: 'pageerror', text: String(error), stack: error?.stack };
    consoleEntries.push(entry);
    log('page_error', entry);
  });
  page.on('requestfailed', (request) => {
    const entry = { at: new Date().toISOString(), url: request.url(), failure: request.failure()?.errorText || '' };
    networkFailures.push(entry);
    if (/graphql|rest|workspace|file|ws/i.test(request.url())) log('request_failed', entry);
  });

  await page.goto(`${frontendUrl}/agents?view=list`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText('Daily Assistant', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  await screenshot(page, 'agentsList');
  await assertNoFrontendFailure(page, 'agents list');

  const dailyAssistantCard = page.locator('.group.h-full').filter({ hasText: 'Daily Assistant' }).first();
  await dailyAssistantCard.waitFor({ state: 'visible', timeout: 30000 });
  await dailyAssistantCard.getByRole('button', { name: 'Run' }).click();
  log('click', { label: 'Daily Assistant Run' });
  await page.waitForURL('**/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  await screenshot(page, 'initialWorkspace');
  await assertNoFrontendFailure(page, 'initial workspace');

  await selectRuntimeCodex(page);
  await selectModelGpt55(page);
  await assertNoFrontendFailure(page, 'after Codex/GPT-5.5 selection');
  await screenshot(page, 'runtimeModelWorkspace');

  await loadWorkspace(page);
  await openFilesAndAssert(page, 'before run');
  await screenshot(page, 'filesBeforeRun');

  await runAgent(page);
  await screenshot(page, 'afterRun');
  await openFilesAndAssert(page, 'after run');
  await screenshot(page, 'filesAfterRun');

  const finalText = await bodyText(page);
  const result = {
    result: 'passed',
    frontendUrl,
    finalUrl: page.url(),
    runtime: 'codex_app_server',
    runtimeLabel: 'Codex App Server',
    model: 'OpenAI / GPT-5.5 (default reasoning: medium)',
    workspacePath,
    hasNuxt500: /Error\s+500/i.test(finalText),
    hasTdzError: /Cannot access .* before initialization/i.test(finalText) || consoleEntries.some((entry) => /Cannot access .* before initialization/i.test(entry.text)),
    pageErrors: consoleEntries.filter((entry) => entry.type === 'pageerror'),
    relevantConsoleErrors: consoleEntries.filter((entry) => entry.type === 'error' || /Cannot access|ReferenceError|Error 500/i.test(entry.text)),
    networkFailures,
    finalBodyExcerpt: finalText.slice(0, 5000),
    screenshots,
    events,
  };
  await fs.writeFile(summaryPath, JSON.stringify(result, null, 2));
  log('result', { result: 'passed', summaryPath });
}

try {
  await main();
} catch (error) {
  const fallback = {
    result: 'failed',
    error: String(error),
    stack: error?.stack,
    frontendUrl,
    workspacePath,
    consoleEntries,
    networkFailures,
    screenshots,
    events,
  };
  await fs.writeFile(summaryPath, JSON.stringify(fallback, null, 2)).catch(() => undefined);
  log('result', { result: 'failed', error: String(error), summaryPath });
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  await fs.writeFile(eventLogPath, events.map((entry) => JSON.stringify(entry)).join('\n') + '\n').catch(() => undefined);
}
