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
const snap = async (label) => page.evaluate((currentLabel) => ({
  label: currentLabel, at: new Date().toISOString(), url: location.href, body: document.body.innerText,
  selected: [...document.querySelectorAll('[aria-selected="true"],[aria-current="true"]')].map((element) => ({ test: element.getAttribute('data-test'), text: (element.innerText || '').replace(/\s+/g, ' ').trim() })),
  buttons: [...document.querySelectorAll('button')].map((element) => ({ text: (element.innerText || '').replace(/\s+/g, ' ').trim(), aria: element.getAttribute('aria-label'), title: element.getAttribute('title'), disabled: element.disabled, test: element.getAttribute('data-test') })).filter((entry) => entry.text || entry.aria || entry.title || entry.test),
}), label);
const beforeTeamStop = await snap('before-team-stop');
const terminate = page.getByRole('button', { name: 'Terminate team' });
if (await terminate.count() !== 1) throw new Error(`expected one Terminate team, got ${await terminate.count()}`);
await terminate.click();
await page.waitForFunction(() => document.body.innerText.includes('Offline') && [...document.querySelectorAll('button')].every((button) => button.getAttribute('aria-label') !== 'Terminate team'), null, { timeout: 60_000 });
const teamStopped = await snap('team-stopped');
await page.screenshot({ path: new URL('screenshots/LIVE-005-team-stopped.png', out).pathname, fullPage: true });

const expand = async (locator) => { if (await locator.count() && await locator.getAttribute('aria-expanded') === 'false') await locator.click(); };
await expand(page.getByRole('button', { name: /APIREV8 组织 Ω/ }).first());
await expand(page.getByRole('treeitem', { name: /Return exactly APIREV8-ORG-DIRECT-LIVE-001/ }));
await page.locator('[data-test^="agent-org-agent-row-aorg_e2e_concierge_"]').first().click();
await page.waitForFunction(() => new URL(location.href).searchParams.get('mode') === 'active' && document.body.innerText.includes('APIREV13-ORG-DIRECT-CONTINUE-001'), null, { timeout: 30_000 });
const beforeOrgStop = await snap('before-org-stop');
const stopOrg = page.getByRole('button', { name: 'Stop Agent Org' });
if (await stopOrg.count() !== 1) throw new Error(`expected one Stop Agent Org, got ${await stopOrg.count()}`);
await stopOrg.click();
await page.waitForFunction(() => new URL(location.href).searchParams.get('mode') === 'history' && document.body.innerText.includes('Stopped Agent Org'), null, { timeout: 60_000 });
const orgStopped = await snap('org-stopped-terminal');
await page.screenshot({ path: new URL('screenshots/LIVE-005-org-stopped-terminal.png', out).pathname, fullPage: true });
const assertions = {
  teamHadContinuationBeforeStop: beforeTeamStop.body.includes('APIREV13-TEAM-RESUMED-001'),
  teamStoppedWithoutHistoryLoss: teamStopped.body.includes('Offline') && teamStopped.body.includes('APIREV8-TEAM-LIVE-001') && teamStopped.body.includes('APIREV13-TEAM-RESUMED-001'),
  orgHadContinuationBeforeStop: beforeOrgStop.body.includes('APIREV8-ORG-DIRECT-LIVE-001') && beforeOrgStop.body.includes('APIREV13-ORG-DIRECT-CONTINUE-001'),
  orgTerminalExact: orgStopped.url.includes('mode=history') && orgStopped.body.includes('Stopped Agent Org') && orgStopped.body.includes('Select a member from the historical run in the sidebar to continue from its saved state.'),
  noActiveStopOrComposer: !orgStopped.buttons.some((entry) => entry.aria === 'Stop Agent Org') && !orgStopped.buttons.some((entry) => entry.title === 'Send message'),
  noManualReconnect: !orgStopped.buttons.some((entry) => /reconnect/i.test(`${entry.text} ${entry.aria} ${entry.title}`)),
  noBrowserErrors: errors.length === 0,
};
await fs.writeFile(new URL('LIVE-005-stop-terminal.json', out), `${JSON.stringify({ beforeTeamStop, teamStopped, beforeOrgStop, orgStopped, assertions, errors }, null, 2)}\n`);
console.log(JSON.stringify({ assertions, errors }, null, 2));
if (Object.values(assertions).some((value) => value !== true)) throw new Error(`assertion failure: ${JSON.stringify(assertions)}`);
await browser.close();
