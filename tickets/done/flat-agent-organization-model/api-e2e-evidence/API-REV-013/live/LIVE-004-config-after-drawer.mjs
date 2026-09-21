import fs from 'node:fs/promises';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const out = new URL('./', import.meta.url);
const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('127.0.0.1:3592'));
if (!page) throw new Error('open_tab page missing');
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message }));
page.on('console', (message) => { if (message.type() === 'error') errors.push({ type: 'console', message: message.text() }); });
const snap = async (label) => page.evaluate((currentLabel) => ({
  label: currentLabel, at: new Date().toISOString(), viewport: { width: innerWidth, height: innerHeight }, url: location.href,
  body: document.body.innerText,
  dialogs: [...document.querySelectorAll('[role="dialog"]')].map((element) => ({ aria: element.getAttribute('aria-label'), test: element.getAttribute('data-test') })),
  selected: [...document.querySelectorAll('[aria-selected="true"]')].map((element) => ({ test: element.getAttribute('data-test'), text: (element.innerText || '').replace(/\s+/g, ' ').trim() })),
}), label);
await page.setViewportSize({ width: 390, height: 844 });
if (!await page.locator('[data-test="app-left-navigation-drawer"]').count()) {
  await page.getByRole('button', { name: 'Agent Orgs', exact: true }).first().click();
  await page.waitForTimeout(500);
}
const expand = async (locator) => { if (await locator.count() && await locator.getAttribute('aria-expanded') === 'false') await locator.click(); };
await expand(page.getByRole('button', { name: 'workspace', exact: true }).first());
await expand(page.getByRole('button', { name: /APIREV8 组织 Ω/ }).first());
await expand(page.getByRole('treeitem', { name: /Return exactly APIREV8-ORG-DIRECT-LIVE-001/ }));
await expand(page.locator('[data-test^="agent-org-team-row-apirev8_team_"]').first());
await page.locator('[data-test^="agent-org-agent-row-aorg_e2e_analyst_"]').first().click();
await page.waitForFunction(() => document.body.innerText.includes('aorg e2e analyst'), null, { timeout: 30_000 });
const before = await snap('mounted-focus-drawer-open');
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('[data-test="app-left-navigation-drawer"]'), null, { timeout: 10_000 });
const closed = await snap('drawer-closed');
const gear = page.locator('[data-test="workspace-header-edit-config"]');
await gear.click();
const config = page.locator('[data-test="agent-org-member-run-config"]');
await config.waitFor({ state: 'visible', timeout: 30_000 });
const identity = await config.evaluate((element) => ({
  orgRunId: element.getAttribute('data-org-run-id'), address: element.getAttribute('data-member-address'), agentRunId: element.getAttribute('data-agent-run-id'),
  disabledCount: [...element.querySelectorAll('input,select,textarea,button')].filter((control) => control.disabled).length,
  enabled: [...element.querySelectorAll('input,select,textarea,button')].filter((control) => !control.disabled).map((control) => ({ tag: control.tagName, test: control.getAttribute('data-test'), text: control.textContent?.replace(/\s+/g, ' ').trim() })),
}));
const configState = await snap('locked-config');
await page.screenshot({ path: new URL('screenshots/LIVE-004-narrow-mounted-locked-config.png', out).pathname, fullPage: true });
await page.locator('[data-test="agent-org-config-back-to-events"]').click();
await gear.waitFor({ state: 'visible', timeout: 30_000 });
const after = await snap('back-to-monitor');
const assertions = {
  drawerWasOpen: before.dialogs.some((dialog) => dialog.test === 'app-left-navigation-drawer'),
  escapeClosedDrawer: closed.dialogs.length === 0,
  exactMountedIdentity: identity.orgRunId === 'apirev8_613529cf063144d0a9e6cd6e385d58ba' && identity.address === '/apirev8_team/aorg_e2e_analyst' && Boolean(identity.agentRunId),
  formLocked: identity.disabledCount > 0 && identity.enabled.every((entry) => entry.tag === 'BUTTON' && (entry.test === 'agent-org-config-back-to-events' || entry.text === 'Advanced')),
  backPreservedRootAndFocus: after.url === before.url && before.selected.filter((entry) => entry.test?.startsWith('agent-org-agent-row-aorg_e2e_analyst_')).length === 1 && after.body.includes('aorg e2e analyst'),
  narrowNoHorizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth),
  noBrowserErrors: errors.length === 0,
};
const result = { before, closed, configState, identity, after, assertions, errors };
await fs.writeFile(new URL('LIVE-004-config-after-drawer.json', out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ identity, assertions, errors }, null, 2));
if (Object.values(assertions).some((value) => value !== true)) throw new Error(`assertion failure: ${JSON.stringify(assertions)}`);
await page.setViewportSize({ width: 1502, height: 844 });
await browser.close();
