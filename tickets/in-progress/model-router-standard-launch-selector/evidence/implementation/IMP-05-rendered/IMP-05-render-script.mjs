// autobyteus-313 IMP-05: the Model Routing page on the development stack (own data root, scrubbed AUTOBYTEUS_* env),
// driven in a fresh headless Chromium: Configuration with the app's launch controls (a real model choice and a thinking
// change, each read back from the server), the composer's model menu for comparison, the app's names on the other tabs
// (synthesized decision records), zh-CN and a narrow window. Asserts DOM and server state; saves screenshots.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const [webDir, outDir] = process.argv.slice(2);
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core');
const web = 'http://127.0.0.1:3000';
const gql = async (query, variables = {}) => (await (await fetch('http://127.0.0.1:8000/graphql', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }),
})).json());
await fs.mkdir(outDir, { recursive: true });
const result = { cases: {}, observations: {}, browserErrors: [], failures: [] };
const check = (name, ok, detail) => { result.cases[name] = { ok, detail }; if (!ok) result.failures.push(name); };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('pageerror', (e) => result.browserErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') result.browserErrors.push(m.text()); });
const tid = (id) => page.locator(`[data-testid="${id}"]`).first();
const dt = (id) => page.locator(`[data-test="${id}"]`).first();
const shot = (name) => page.screenshot({ path: path.join(outDir, `${name}.png`) });
const settle = (ms = 1200) => page.waitForTimeout(ms);
const open = async (tab) => {
  await page.goto(`${web}/settings?section=model-routing&tab=${tab}`, { waitUntil: 'domcontentloaded' });
  await tid('settings-model-routing-panel').waitFor({ timeout: 120000 });
  await page.waitForFunction(() => !document.querySelector('[data-testid="model-routing-switch"]')?.disabled, null, { timeout: 60000 });
  await settle(1500);
};
const status = async () => (await gql('{ modelRoutingStatus }')).data.modelRoutingStatus;
const row = '[data-testid="model-routing-router-row"]';

try {
  // Warm-up: a cold Nuxt dev server re-optimizes dependencies and reloads pages once (TESTING.md).
  for (const url of [`${web}/settings?section=model-routing&tab=setup`, `${web}/chat`]) { await page.goto(url, { waitUntil: 'domcontentloaded' }); await settle(8000) }
  result.browserErrors.length = 0
  await open('setup');
  // Off on a fresh data root: the controls are inert; the switch turns Model Routing on.
  check('off-inert', (await tid('model-routing-switch').getAttribute('aria-checked')) === 'false' && (await page.locator(`${row}[inert]`).count()) === 1,
    { trigger: (await page.locator(`${row} [data-test="chat-model-trigger"]`).innerText()).replace(/\s+/g, ' ').trim() });
  await shot('IMP-05-00-configuration-off-1440');
  await tid('model-routing-switch').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="model-routing-switch"]')?.getAttribute('aria-checked') === 'true', null, { timeout: 30000 });
  await settle(1500);
  const before = await status();
  check('not-set-on', before.enabled === true && before.routerLaunch === null && /choose a runtime and model/.test(await tid('model-routing-status').innerText())
    && (await page.locator(`${row}[inert]`).count()) === 0 && (await tid('model-routing-setup').locator('select').count()) === 0,
  { status: before, trigger: await page.locator(`${row} [data-test="chat-model-trigger"]`).innerText() });
  await shot('IMP-05-01-configuration-not-set-1440');

  // AC-001: the app's model menu: runtimes grouped with model counts, a runtime's models in its submenu.
  await page.locator(`${row} [data-test="chat-model-trigger"]`).click();
  await dt('chat-model-menu').waitFor();
  const runtimeNames = () => page.locator('[data-test^="chat-runtime-"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-test')));
  await page.waitForFunction(() => document.querySelectorAll('[data-test^="chat-runtime-"]').length >= 5, null, { timeout: 30000 }).catch(() => undefined);
  const runtimes = await runtimeNames();
  result.observations.menuRuntimes = runtimes;
  await shot('IMP-05-02-configuration-model-menu-1440');
  let chosenRuntime = null;
  for (const runtime of ['claude_agent_sdk', 'codex_app_server']) {
    const entry = dt(`chat-runtime-${runtime}`);
    if (!(await entry.count())) continue;
    await entry.click(); await settle(800);
    const list = dt(`chat-model-list-${runtime}`);
    try { await list.waitFor({ timeout: 45000 }); } catch { continue; }
    const option = list.locator('[data-test^="chat-model-option-"]').first();
    if (!(await option.count())) continue;
    result.observations.submenuModels = (await list.innerText()).replace(/\s+/g, ' ').slice(0, 300);
    await shot('IMP-05-03-configuration-runtime-submenu-1440');
    await option.click(); chosenRuntime = runtime; break;
  }
  await page.waitForFunction(() => !/Choose a model/.test(document.querySelector('[data-testid="model-routing-router-row"] [data-test="chat-model-trigger"]')?.innerText ?? ''), null, { timeout: 30000 });
  await settle(1500);
  const chosen = await status();
  const trigger = (await page.locator(`${row} [data-test="chat-model-trigger"]`).innerText()).replace(/\s+/g, ' ').trim();
  check('model-chosen', chosenRuntime !== null && chosen.routerLaunch?.runtimeKind === chosenRuntime && chosen.active !== undefined,
    { chosenRuntime, routerLaunch: chosen.routerLaunch, trigger });
  await shot('IMP-05-04-configuration-launch-set-1440');

  // AC-002: a thinking change saves the launch with the new settings (read back from the server).
  const thinking = page.locator(`${row} [data-test="chat-thinking-trigger"]`);
  if (await thinking.count()) {
    await thinking.click(); await dt('chat-thinking-menu').waitFor();
    await shot('IMP-05-05-configuration-thinking-menu-1440');
    const options = page.locator('[data-test="chat-thinking-menu"] [data-test^="chat-thinking-option-primary-"]');
    const ids = await options.evaluateAll((els) => els.map((el) => ({ id: el.getAttribute('data-test'), checked: el.getAttribute('aria-checked') })));
    const target = ids.find((item) => item.checked !== 'true' && !/off|none/i.test(item.id)) ?? ids.find((item) => item.checked !== 'true');
    await page.locator(`[data-test="${target.id}"]`).click();
    await page.waitForFunction((prev) => true, null); await settle(2500);
    const after = await status();
    check('thinking-saved', JSON.stringify(after.routerLaunch?.llmConfig) !== JSON.stringify(chosen.routerLaunch?.llmConfig) && after.routerLaunch?.llmModelIdentifier === chosen.routerLaunch?.llmModelIdentifier,
      { options: ids, picked: target.id, before: chosen.routerLaunch?.llmConfig, after: after.routerLaunch?.llmConfig });
    await shot('IMP-05-06-configuration-thinking-saved-1440');
  } else {
    check('thinking-saved', false, 'no thinking control for the chosen model');
  }
  // Reload: the stored launch (with its settings) shows again.
  await open('setup');
  const reloaded = (await page.locator(`${row} [data-test="chat-model-trigger"]`).innerText()).replace(/\s+/g, ' ').trim();
  check('reload-shows-launch', reloaded === trigger, { reloaded, trigger });

  // The composer's model menu for the same model, for comparison (screenshot).
  await page.goto(`${web}/chat`, { waitUntil: 'domcontentloaded' });
  const composerTrigger = page.locator('[data-test="chat-model-trigger"]').first();
  await composerTrigger.waitFor({ timeout: 60000 }); await settle(2000);
  result.observations.composerTrigger = (await composerTrigger.innerText()).replace(/\s+/g, ' ').trim();
  await composerTrigger.click(); await dt('chat-model-menu').waitFor(); await settle(800);
  await page.waitForFunction(() => document.querySelectorAll('[data-test^="chat-runtime-"]').length >= 5, null, { timeout: 30000 }).catch(() => undefined);
  result.observations.composerMenuRuntimes = await runtimeNames();
  check('same-menu', JSON.stringify(result.observations.composerMenuRuntimes) === JSON.stringify(runtimes), { configuration: runtimes, composer: result.observations.composerMenuRuntimes });
  await shot('IMP-05-07-composer-model-menu-1440');

  // AC-004: names on Decisions and Overview (synthesized records), and Runtimes.
  await open('decisions');
  for (let i = 0; i < 20 && await page.locator('[role="tabpanel"] button[aria-expanded="false"]').count(); i++) await page.locator('[role="tabpanel"] button[aria-expanded="false"]').first().click();
  await settle(800);
  const launches = await page.locator('[data-testid="model-routing-decision-launch"]').allInnerTexts();
  const decisionsText = await page.locator('[role="tabpanel"]').innerText();
  check('decisions-names', launches.length > 0 && launches.every((text) => /(Codex|Claude SDK|AutoByteus|Antigravity|Grok Build)$/.test(text.replace(/\s+/g, ' ').trim()))
    && !/\bClaude ·|\bCodex ·/.test(decisionsText), { launches });
  await shot('IMP-05-08-decisions-names-1440');
  await open('overview');
  await tid('model-routing-overview-details-implementation').click().catch(() => undefined); await settle(800);
  const legend = await tid('model-routing-overview-runtime-legend').innerText();
  check('overview-names', /Codex App Server/.test(legend) && /Claude Agent SDK/.test(legend), { legend });
  await shot('IMP-05-09-overview-names-1440');
  await open('runtimes');
  await page.locator('[data-testid="agent-runtimes-now-list"] > li h4').first().waitFor({ timeout: 90000 }).catch(() => undefined);
  const headings = await page.locator('[data-testid="agent-runtimes-now-list"] > li h4').allInnerTexts();
  check('runtimes-names', headings.length > 0 && headings.every((name) => ['AutoByteus', 'Codex App Server', 'Claude Agent SDK', 'Antigravity CLI', 'Grok Build'].includes(name.trim())), { headings });
  await shot('IMP-05-10-runtimes-names-1440');

  // zh-CN and a narrow window.
  await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
  await open('setup');
  check('zh-CN', (await tid('model-routing-tab-setup').innerText()).trim() === '配置', await tid('model-routing-tab-setup').innerText());
  await shot('IMP-05-11-configuration-zh-CN-1440');
  await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  await page.setViewportSize({ width: 390, height: 844 });
  await open('setup');
  const overflow = await page.evaluate(() => [...document.querySelectorAll('[data-testid="settings-model-routing-panel"], [role="tabpanel"]')].some((el) => el.scrollWidth > el.clientWidth + 1));
  check('narrow-390', !overflow, 'no horizontal overflow');
  await shot('IMP-05-12-configuration-390');
} catch (error) {
  result.failures.push(`error: ${error?.stack ?? error}`);
} finally {
  await browser.close();
  await fs.writeFile(path.join(outDir, 'IMP-05-rendered-checks.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ failures: result.failures, browserErrors: result.browserErrors.length }, null, 1));
}
