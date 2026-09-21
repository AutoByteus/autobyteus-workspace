import fs from 'node:fs/promises';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';

const out = new URL('./', import.meta.url);
const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('127.0.0.1:3592'));
if (!page) throw new Error('open_tab page missing');
const events = [];
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message }));
page.on('console', (message) => { if (message.type() === 'error') errors.push({ type: 'console', message: message.text() }); });
const checkpoint = async (label) => {
  const event = await page.evaluate((currentLabel) => ({
    label: currentLabel,
    at: new Date().toISOString(), viewport: { width: innerWidth, height: innerHeight }, url: location.href,
    body: document.body.innerText,
    current: [...document.querySelectorAll('[aria-current="true"]')].map((element) => ({ test: element.getAttribute('data-test'), text: (element.innerText || '').replace(/\s+/g, ' ').trim() })),
    selected: [...document.querySelectorAll('[aria-selected="true"]')].map((element) => ({ test: element.getAttribute('data-test'), text: (element.innerText || '').replace(/\s+/g, ' ').trim() })),
    tests: [...document.querySelectorAll('[data-test]')].map((element) => ({ test: element.getAttribute('data-test'), text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300), expanded: element.getAttribute('aria-expanded') })),
  }), label);
  events.push(event);
  await fs.writeFile(new URL('LIVE-004-restored-narrow-config.partial.json', out), `${JSON.stringify({ events, errors }, null, 2)}\n`);
  return event;
};
const expand = async (locator) => { if (await locator.count() && await locator.getAttribute('aria-expanded') === 'false') await locator.click(); };

await page.setViewportSize({ width: 1502, height: 844 });
await page.waitForFunction(() => new URL(location.href).searchParams.get('mode') === 'active' && document.body.innerText.includes('APIREV8-ORG-DIRECT-LIVE-001'), null, { timeout: 30_000 });
const restoredDirect = await checkpoint('restored-direct-desktop');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
const stripButton = page.getByRole('button', { name: 'Agent Orgs', exact: true }).first();
if (await stripButton.count() !== 1) throw new Error('narrow primary strip Agent Orgs button missing');
await stripButton.click();
await page.waitForTimeout(700);
const drawer = await checkpoint('narrow-strip-drawer');
await expand(page.getByRole('button', { name: 'workspace', exact: true }).first());
await expand(page.getByRole('button', { name: /APIREV8 组织 Ω/ }).first());
await expand(page.getByRole('treeitem', { name: /Return exactly APIREV8-ORG-DIRECT-LIVE-001/ }));
const mountedTeam = page.locator('[data-test^="agent-org-team-row-apirev8_team_"]').first();
await expand(mountedTeam);
const mountedAnalyst = page.locator('[data-test^="agent-org-agent-row-aorg_e2e_analyst_"]').first();
if (await mountedAnalyst.count() !== 1) throw new Error('mounted analyst row missing in narrow drawer');
await mountedAnalyst.click();
await page.waitForFunction(() => document.body.innerText.includes('aorg e2e analyst') && document.querySelectorAll('[data-test^="agent-org-agent-row-"][aria-selected="true"]').length === 1, null, { timeout: 30_000 });
const mounted = await checkpoint('narrow-mounted-exact-focus');
await page.screenshot({ path: new URL('screenshots/LIVE-004-narrow-mounted-focus.png', out).pathname, fullPage: true });

const gear = page.locator('[data-test="workspace-header-edit-config"]');
await gear.waitFor({ state: 'visible', timeout: 30_000 });
await gear.click();
const config = page.locator('[data-test="agent-org-member-run-config"]');
await config.waitFor({ state: 'visible', timeout: 30_000 });
const configIdentity = await config.evaluate((element) => ({
  orgRunId: element.getAttribute('data-org-run-id'), address: element.getAttribute('data-member-address'), agentRunId: element.getAttribute('data-agent-run-id'),
  disabledCount: [...element.querySelectorAll('input,select,textarea,button')].filter((control) => control.disabled).length,
  enabled: [...element.querySelectorAll('input,select,textarea,button')].filter((control) => !control.disabled).map((control) => ({ tag: control.tagName, text: control.textContent?.replace(/\s+/g, ' ').trim(), test: control.getAttribute('data-test') })),
}));
const configEvent = await checkpoint('narrow-mounted-locked-config');
await page.screenshot({ path: new URL('screenshots/LIVE-004-narrow-mounted-locked-config.png', out).pathname, fullPage: true });
await page.locator('[data-test="agent-org-config-back-to-events"]').click();
await gear.waitFor({ state: 'visible', timeout: 30_000 });
const back = await checkpoint('narrow-back-to-same-monitor');

const assertions = {
  restoredHistoryVisible: restoredDirect.body.includes('APIREV8-ORG-DIRECT-LIVE-001') && restoredDirect.body.includes('APIREV10-ORG-DIRECT-RESUMED-002'),
  drawerHasUnifiedFamilies: drawer.body.includes('APIREV8 本地化 Team β') && drawer.body.includes('APIREV8 组织 Ω'),
  exactMountedSelection: mounted.selected.filter((entry) => entry.test?.startsWith('agent-org-agent-row-aorg_e2e_analyst_')).length === 1,
  narrowNoHorizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth),
  exactConfigIdentity: configIdentity.address === '/apirev8_team/aorg_e2e_analyst' && configIdentity.orgRunId === 'apirev8_613529cf063144d0a9e6cd6e385d58ba' && Boolean(configIdentity.agentRunId),
  lockedConfig: configIdentity.disabledCount > 0 && configIdentity.enabled.every((entry) => entry.test === 'agent-org-config-back-to-events'),
  backSameRootAndFocus: back.url === mounted.url && back.body.includes('aorg e2e analyst') && back.selected.filter((entry) => entry.test?.startsWith('agent-org-agent-row-aorg_e2e_analyst_')).length === 1,
  noBrowserErrors: errors.length === 0,
};
await fs.writeFile(new URL('LIVE-004-restored-narrow-config.json', out), `${JSON.stringify({ events, configIdentity, assertions, errors }, null, 2)}\n`);
console.log(JSON.stringify({ assertions, configIdentity, errors }, null, 2));
if (Object.values(assertions).some((value) => value !== true)) throw new Error(`LIVE-004 assertion failure: ${JSON.stringify(assertions)}`);
await page.setViewportSize({ width: 1502, height: 844 });
await browser.close();
