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
    at: new Date().toISOString(),
    viewport: { width: innerWidth, height: innerHeight },
    url: location.href,
    body: document.body.innerText,
    current: [...document.querySelectorAll('[aria-current="true"]')].map((element) => ({ test: element.getAttribute('data-test'), text: (element.innerText || '').replace(/\s+/g, ' ').trim() })),
    selected: [...document.querySelectorAll('[aria-selected="true"]')].map((element) => ({ test: element.getAttribute('data-test'), text: (element.innerText || '').replace(/\s+/g, ' ').trim() })),
    buttons: [...document.querySelectorAll('button')].map((element) => ({ text: (element.innerText || '').replace(/\s+/g, ' ').trim(), aria: element.getAttribute('aria-label'), title: element.getAttribute('title'), test: element.getAttribute('data-test'), expanded: element.getAttribute('aria-expanded'), disabled: element.disabled })).filter((entry) => entry.text || entry.aria || entry.title || entry.test),
  }), label);
  events.push(event);
  await fs.writeFile(new URL('LIVE-004-history-restore-switch.partial.json', out), `${JSON.stringify({ events, errors }, null, 2)}\n`);
  return event;
};
const expand = async (locator) => { if (await locator.count() && await locator.getAttribute('aria-expanded') === 'false') await locator.click(); };
const clickTest = async (test) => {
  const target = page.locator(`[data-test="${test}"]`);
  if (await target.count() !== 1) throw new Error(`expected one ${test}, got ${await target.count()}`);
  await target.click();
};

await page.setViewportSize({ width: 1502, height: 844 });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await expand(page.getByRole('button', { name: 'workspace', exact: true }).first());
await expand(page.getByRole('button', { name: /APIREV8 组织 Ω/ }).first());
const orgRoot = page.getByRole('treeitem', { name: /Return exactly APIREV8-ORG-DIRECT-LIVE-001/ });
if (await orgRoot.count() !== 1) throw new Error(`expected one retained Org root, got ${await orgRoot.count()}`);
await orgRoot.click();
await page.waitForFunction(() => new URL(location.href).searchParams.get('mode') === 'history' && document.body.innerText.includes('Stopped Agent Org'), null, { timeout: 30_000 });
const inactiveOrg = await checkpoint('inactive-org-history');
await page.screenshot({ path: new URL('screenshots/LIVE-004-inactive-org-history.png', out).pathname, fullPage: true });

const teamDefinition = page.locator('[data-test="workspace-team-definition-row-apirev8-team"]');
await expand(teamDefinition);
const teamRun = page.locator('[data-test="workspace-team-row-apirev8_team_ccf2b4b3a83e49bbb05b522969e61e89"]');
await expand(teamRun);
await clickTest('workspace-team-member-apirev8_team_ccf2b4b3a83e49bbb05b522969e61e89-/aorg_e2e_analyst');
await page.waitForFunction(() => location.pathname.replace(/\/$/, '') === '/workspace' && location.search === '' && document.body.innerText.includes('aorg_e2e_analyst'), null, { timeout: 30_000 });
const standaloneTeam = await checkpoint('standalone-team-from-inactive-org');

await expand(page.getByRole('button', { name: /APIREV8 组织 Ω/ }).first());
await page.getByRole('treeitem', { name: /Return exactly APIREV8-ORG-DIRECT-LIVE-001/ }).click();
await page.waitForFunction(() => new URL(location.href).searchParams.get('mode') === 'history' && document.body.innerText.includes('Stopped Agent Org'), null, { timeout: 30_000 });
const returnedOrg = await checkpoint('inactive-org-return');

const stoppedConcierge = page.locator('[data-test^="agent-org-agent-row-aorg_e2e_concierge_"]').first();
if (await stoppedConcierge.count() !== 1) throw new Error('stopped concierge row missing');
await stoppedConcierge.click();
await page.waitForFunction(() => new URL(location.href).searchParams.get('memberAddress') === '/aorg_e2e_concierge', null, { timeout: 30_000 });
const stoppedMember = await checkpoint('stopped-member-before-restore');
const restoreButton = page.getByRole('button', { name: /Restore/ }).first();
if (await restoreButton.count() !== 1) throw new Error(`restore button missing; candidates=${JSON.stringify(stoppedMember.buttons.filter((entry) => /restor/i.test(`${entry.text} ${entry.aria} ${entry.title}`)))}`);
await restoreButton.click();
await page.waitForFunction(() => new URL(location.href).searchParams.get('mode') === 'active' && [...document.querySelectorAll('button')].some((button) => button.getAttribute('aria-label') === 'Stop Agent Org'), null, { timeout: 120_000 });
const restoredRoot = await checkpoint('restored-org-root');

const rootRow = page.getByRole('treeitem', { name: /Return exactly APIREV8-ORG-DIRECT-LIVE-001/ });
await expand(rootRow);
const concierge = page.locator('[data-test^="agent-org-agent-row-aorg_e2e_concierge_"]').first();
if (await concierge.count() !== 1) throw new Error('restored concierge row missing');
await concierge.click();
await page.waitForFunction(() => document.body.innerText.includes('APIREV8-ORG-DIRECT-LIVE-001'), null, { timeout: 30_000 });
const restoredDirect = await checkpoint('restored-direct-history');
await page.screenshot({ path: new URL('screenshots/LIVE-004-restored-direct-history.png', out).pathname, fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(700);
const stripButton = page.getByRole('button', { name: 'Agent Orgs', exact: true }).first();
if (await stripButton.count() !== 1) throw new Error('narrow primary strip Agent Orgs button missing');
await stripButton.click();
await page.waitForTimeout(700);
const narrowDrawer = await checkpoint('narrow-strip-drawer');
await expand(page.getByRole('button', { name: /APIREV8 组织 Ω/ }).first());
await expand(page.getByRole('treeitem', { name: /Return exactly APIREV8-ORG-DIRECT-LIVE-001/ }));
const mountedTeam = page.locator('[data-test^="agent-org-team-row-apirev8_team_"]').first();
await expand(mountedTeam);
const mountedAnalyst = page.locator('[data-test^="agent-org-agent-row-aorg_e2e_analyst_"]').first();
if (await mountedAnalyst.count() !== 1) throw new Error('mounted analyst row missing in narrow drawer');
await mountedAnalyst.click();
await page.waitForFunction(() => new URL(location.href).searchParams.get('rootSubjectKind') === 'agent_org' && new URL(location.href).searchParams.get('memberAddress') === '/apirev8_team/aorg_e2e_analyst', null, { timeout: 30_000 });
const narrowMounted = await checkpoint('narrow-mounted-exact-focus');
await page.screenshot({ path: new URL('screenshots/LIVE-004-narrow-mounted-focus.png', out).pathname, fullPage: true });

await clickTest('workspace-header-edit-config');
await page.locator('[data-test="agent-org-member-run-config"]').waitFor({ state: 'visible', timeout: 30_000 });
const narrowConfig = await checkpoint('narrow-mounted-locked-config');
const configIdentity = await page.locator('[data-test="agent-org-member-run-config"]').evaluate((element) => ({
  orgRunId: element.getAttribute('data-org-run-id'),
  address: element.getAttribute('data-member-address'),
  agentRunId: element.getAttribute('data-agent-run-id'),
  enabledControls: [...element.querySelectorAll('input,select,textarea,button')].filter((control) => !control.disabled).map((control) => ({ tag: control.tagName, text: control.textContent?.trim(), test: control.getAttribute('data-test') })),
  disabledControls: [...element.querySelectorAll('input,select,textarea,button')].filter((control) => control.disabled).length,
}));
await page.screenshot({ path: new URL('screenshots/LIVE-004-narrow-mounted-locked-config.png', out).pathname, fullPage: true });
await clickTest('agent-org-config-back-to-events');
await page.locator('[data-test="workspace-header-edit-config"]').waitFor({ state: 'visible', timeout: 30_000 });
const narrowBack = await checkpoint('narrow-back-to-same-monitor');

const assertions = {
  inactiveOrgWasTerminal: inactiveOrg.url.includes('mode=history') && inactiveOrg.body.includes('Stopped Agent Org'),
  retainedSummaryAndConversationVisible: inactiveOrg.body.includes('Return exactly APIREV8-ORG-DIRECT-LIVE-001') && restoredDirect.body.includes('APIREV8-ORG-DIRECT-LIVE-001'),
  standaloneTeamClearedOrgRoute: !new URL(standaloneTeam.url).search && standaloneTeam.body.includes('aorg_e2e_analyst'),
  returnedToExactInactiveOrg: returnedOrg.url.includes('orgRunId=apirev8_613529cf063144d0a9e6cd6e385d58ba') && returnedOrg.url.includes('mode=history'),
  restoreActivatedWholeOrg: restoredRoot.url.includes('mode=active') && restoredRoot.buttons.some((entry) => entry.aria === 'Stop Agent Org'),
  narrowDrawerHasUnifiedHistory: narrowDrawer.body.includes('APIREV8 组织 Ω') && narrowDrawer.body.includes('APIREV8 本地化 Team β'),
  narrowExactMountedFocus: narrowMounted.url.includes('memberAddress=%2Fapirev8_team%2Faorg_e2e_analyst') && narrowMounted.selected.filter((entry) => entry.test?.startsWith('agent-org-agent-row-')).length === 1,
  exactLockedConfig: configIdentity.address === '/apirev8_team/aorg_e2e_analyst' && configIdentity.disabledControls > 0 && configIdentity.enabledControls.every((entry) => entry.test === 'agent-org-config-back-to-events'),
  backPreservedExactMonitor: narrowBack.url === narrowMounted.url && narrowBack.body.includes('aorg e2e analyst'),
  noBrowserErrors: errors.length === 0,
};
await fs.writeFile(new URL('LIVE-004-history-restore-switch.json', out), `${JSON.stringify({ events, configIdentity, assertions, errors }, null, 2)}\n`);
console.log(JSON.stringify({ assertions, configIdentity, errors, urls: events.map((event) => ({ label: event.label, url: event.url })) }, null, 2));
if (Object.values(assertions).some((value) => value !== true)) throw new Error(`LIVE-004 assertion failure: ${JSON.stringify(assertions)}`);
await browser.close();
