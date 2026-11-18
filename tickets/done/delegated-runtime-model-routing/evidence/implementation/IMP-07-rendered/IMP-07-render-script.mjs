// autobyteus-32 IMP-07: render Settings -> Model Routing on the development stack (synthesized decision records),
// assert DOM facts per state and save screenshots. Fresh headless Chromium profile; nothing else is touched.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const [webDir, outDir] = process.argv.slice(2);
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core');
const base = 'http://127.0.0.1:3000/settings?section=model-routing';
await fs.mkdir(outDir, { recursive: true });
const result = { cases: {}, browserErrors: [], failures: [] };
const check = (name, ok, detail) => { result.cases[name] = { ok, detail }; if (!ok) result.failures.push(name); };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('pageerror', (e) => result.browserErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') result.browserErrors.push(m.text()); });
const tid = (id) => page.locator(`[data-testid="${id}"]`).first();
const shot = (name) => page.screenshot({ path: path.join(outDir, `${name}.png`) });
const settle = (ms = 1200) => page.waitForTimeout(ms);
const open = async (query = '') => { await page.goto(base + query, { waitUntil: 'domcontentloaded' }); await tid('settings-model-routing-panel').waitFor({ timeout: 120000 }); await settle(2500); };
const panelText = async () => (await page.locator('[role="tabpanel"]').innerText()).replace(/\s+/g, ' ');
const overflowX = () => page.evaluate(() => [...document.querySelectorAll('[data-testid="settings-model-routing-panel"], [role="tabpanel"]')].some((el) => el.scrollWidth > el.clientWidth + 1));

try {
  // Warm-up (a cold Nuxt dev server reloads once).
  await open(); await settle(5000);

  await open();
  check('setup-off', (await tid('model-routing-switch').getAttribute('aria-checked')) === 'false'
    && await tid('model-routing-open-conversation').isDisabled() && !(await tid('model-routing-status').count()), 'switch off, Talk disabled without a launch, no problem line');
  await shot('IMP-07-01-setup-off-1440');

  await tid('model-routing-tab-decisions').click(); await settle();
  const groups = await page.locator('[data-testid^="model-routing-task-"]:not([data-testid="model-routing-task-link"])').count();
  check('decisions-off-history', groups === 3 && await tid('model-routing-decisions-off-note').isVisible() && (await panelText()).includes('Showing 3 of 3 Tasks'), { groups });
  await shot('IMP-07-02-decisions-off-history-1440');
  for (let i = 0; i < 20 && await page.locator('[role="tabpanel"] button[aria-expanded="false"]').count(); i++) await page.locator('[role="tabpanel"] button[aria-expanded="false"]').first().click();
  await settle(600);
  const text = await panelText();
  check('decisions-open', text.includes('The Model Router could not choose: no valid answer within 40 seconds')
    && text.includes('Inherited from the run') && text.includes('Agent default Codex · gpt-5 was not used')
    && (await tid('model-routing-decision-open-run').count()) >= 1 && !(await overflowX()), 'failure note, inherited row, skipped default, Open run, no overflow');
  await shot('IMP-07-03-decisions-teams-open-1440');

  await tid('model-routing-filter-router').click(); await settle();
  const routed = (await panelText());
  check('decisions-filter-router', !routed.includes('Team default') && !routed.includes('Inherited from the run') && routed.includes('Writing goes to Antigravity.'), 'only router rows');
  await shot('IMP-07-04-decisions-filter-router-1440');

  // "View decision" focus link from run Settings.
  await open('&tab=decisions&decisionRun=pm-run-1&decisionCopy=%2Fsoftware_engineering_team&decisionAgent=%2Fsoftware_engineering_team%2Fcode_reviewer');
  const focused = await page.locator('.ring-blue-200').count();
  const focusText = focused ? (await page.locator('.ring-blue-200').first().innerText()).replace(/\s+/g, ' ') : '';
  check('decisions-focus', focused === 1 && focusText.includes('Add CSV export to reports') && focusText.includes('Reviews go to Claude'), { focused, focusText: focusText.slice(0, 200) });
  await shot('IMP-07-05-decisions-focus-from-view-decision-1440');

  await tid('model-routing-tab-overview').click(); await settle(2000);
  const ov = await panelText();
  check('overview', /7\s/.test(await tid('model-routing-overview-sources').innerText()) && ov.includes('Implementation') && ov.includes('Not routed'), ov.slice(0, 300));
  await tid('model-routing-overview-details-implementation').click(); await settle(600);
  check('overview-details', (await tid('model-routing-overview-models-implementation').innerText()).includes('gpt-5-codex'), 'models of a kind');
  await shot('IMP-07-06-overview-details-1440');

  // Switch on with no router launch: the problem line with "Go to Configuration".
  await tid('model-routing-switch').click(); await settle(2500);
  const strip = await tid('model-routing-status').innerText().catch(() => '');
  check('switch-on-not-set', (await tid('model-routing-switch').getAttribute('aria-checked')) === 'true' && strip.length > 0, strip);
  await shot('IMP-07-07-on-router-not-set-1440');
  await tid('model-routing-switch').click(); await settle(2000);
  check('switch-off-again', (await tid('model-routing-switch').getAttribute('aria-checked')) === 'false', 'restored');

  await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
  await open('&tab=overview');
  check('zh-CN', (await tid('model-routing-tab-overview').innerText()).trim() === '概览', await tid('model-routing-tab-overview').innerText());
  await shot('IMP-07-08-overview-zh-CN-1440');
  await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));

  await page.setViewportSize({ width: 390, height: 844 });
  await open('&tab=decisions');
  for (let i = 0; i < 20 && await page.locator('[role="tabpanel"] button[aria-expanded="false"]').count(); i++) await page.locator('[role="tabpanel"] button[aria-expanded="false"]').first().click();
  await settle(600);
  check('narrow-390', !(await overflowX()), 'no horizontal overflow at 390');
  await shot('IMP-07-09-decisions-open-390');
} catch (error) {
  result.failures.push(`error: ${error?.stack ?? error}`);
} finally {
  await browser.close();
  await fs.writeFile(path.join(outDir, 'IMP-07-rendered-checks.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ failures: result.failures, browserErrors: result.browserErrors.length }, null, 1));
}
