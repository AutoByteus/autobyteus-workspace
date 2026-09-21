import fs from 'node:fs/promises';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const out = new URL('./', import.meta.url);
const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('127.0.0.1:3592'));
if (!page) throw new Error('open_tab page missing');
await page.setViewportSize({ width: 1502, height: 844 });
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message }));
page.on('console', (message) => { if (message.type() === 'error') errors.push({ type: 'console', message: message.text() }); });
const expand = async (locator) => { if (await locator.count() && await locator.getAttribute('aria-expanded') === 'false') await locator.click(); };
await expand(page.getByRole('button', { name: 'workspace', exact: true }).first());
await expand(page.getByRole('button', { name: /APIREV8 组织 Ω/ }).first());
const root = page.getByRole('treeitem', { name: /Return exactly APIREV8-ORG-DIRECT-LIVE-001/ });
await root.click();
await page.waitForFunction(() => new URL(location.href).searchParams.get('mode') === 'history' && document.body.innerText.includes('Stopped Agent Org'), null, { timeout: 30_000 });
await expand(page.locator('[data-test="workspace-team-definition-row-apirev8-team"]'));
await expand(page.locator('[data-test="workspace-team-row-apirev8_team_ccf2b4b3a83e49bbb05b522969e61e89"]'));
const result = await page.evaluate(() => ({
  at: new Date().toISOString(), url: location.href, body: document.body.innerText,
  teamRunText: document.querySelector('[data-test="workspace-team-row-apirev8_team_ccf2b4b3a83e49bbb05b522969e61e89"]')?.textContent?.replace(/\s+/g, ' ').trim(),
  teamActivity: document.querySelector('[data-test="workspace-team-row-apirev8_team_ccf2b4b3a83e49bbb05b522969e61e89"] [data-test="team-activity-dot"]')?.getAttribute('data-active'),
  memberAria: [...document.querySelectorAll('[data-test^="workspace-team-member-apirev8_team_ccf2b4b3a83e49bbb05b522969e61e89-"]')].map((element) => element.getAttribute('aria-label')),
  buttons: [...document.querySelectorAll('button')].map((element) => ({ aria: element.getAttribute('aria-label'), title: element.getAttribute('title'), text: (element.innerText || '').trim() })),
}));
result.errors = errors;
result.assertions = {
  exactHistoricalRoute: result.url.includes('orgRunId=apirev8_613529cf063144d0a9e6cd6e385d58ba') && result.url.includes('mode=history'),
  exactTerminalCopy: result.body.includes('Stopped Agent Org') && result.body.includes('Select a member from the historical run in the sidebar to continue from its saved state.'),
  rootSummaryRetained: result.body.includes('Return exactly APIREV8-ORG-DIRECT-LIVE-001'),
  standaloneTeamInactive: result.teamActivity === 'false' && !result.buttons.some((button) => button.aria === 'Terminate team'),
  noOrgStopOrReconnect: !result.buttons.some((button) => button.aria === 'Stop Agent Org') && !result.buttons.some((button) => /reconnect/i.test(`${button.aria} ${button.title} ${button.text}`)),
  noBrowserErrors: errors.length === 0,
};
await fs.writeFile(new URL('LIVE-005-post-stop-history.json', out), `${JSON.stringify(result, null, 2)}\n`);
await page.screenshot({ path: new URL('screenshots/LIVE-005-org-stopped-terminal.png', out).pathname, fullPage: true });
console.log(JSON.stringify({ assertions: result.assertions, errors }, null, 2));
if (Object.values(result.assertions).some((value) => value !== true)) throw new Error(`assertion failure: ${JSON.stringify(result.assertions)}`);
await browser.close();
