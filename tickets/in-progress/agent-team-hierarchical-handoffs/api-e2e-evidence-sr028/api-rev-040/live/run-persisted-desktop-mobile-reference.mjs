import fs from 'node:fs';
import { chromium } from '../../../../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const base = 'http://127.0.0.1:31240';
const serverBase = 'http://127.0.0.1:60240';
const gqlEndpoint = `${serverBase}/graphql`;
const outDir = new URL('./browser/', import.meta.url).pathname;
const activeEvidencePath = `${outDir}/active-desktop-mobile-reference.json`;
const expectedContent = 'API40_REFERENCE_CONTENT_AUTOBYTEUS';
const expectedFile = 'api40-mobile-desktop-reference.txt';
const activeEvidence = JSON.parse(fs.readFileSync(activeEvidencePath, 'utf8'));
const rootTeamRunId = activeEvidence.rootTeamRunId;
if (!activeEvidence.passed || !rootTeamRunId || !activeEvidence.termination?.success) {
  throw new Error('PASSING_TERMINATED_ACTIVE_EVIDENCE_REQUIRED');
}

async function gql(query, variables = {}) {
  const response = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors) throw new Error(`GRAPHQL_FAILED:${response.status}:${JSON.stringify(json.errors ?? json)}`);
  return json.data;
}

async function rest(pathname, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(`${serverBase}${pathname}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) throw new Error(`REST_FAILED:${pathname}:${response.status}:${text}`);
  return text ? JSON.parse(text) : null;
}

const history = await gql(`query {
  listWorkspaceRunHistory(limitPerAgent:200) {
    teamDefinitions { teamDefinitionId runs { teamRunId createdAt isActive terminatedAt coordinatorAddress } }
  }
}`);
const nestedRuns = history.listWorkspaceRunHistory
  .flatMap((workspace) => workspace.teamDefinitions)
  .filter((team) => team.teamDefinitionId === 'nested-classroom-test')
  .flatMap((team) => team.runs)
  .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
const exactRun = nestedRuns.find((run) => run.teamRunId === rootTeamRunId);
if (!exactRun || exactRun.isActive || !exactRun.terminatedAt) throw new Error('EXACT_RUN_NOT_PERSISTED_TERMINAL');
if (nestedRuns.at(-1)?.teamRunId !== rootTeamRunId) throw new Error('EXACT_RUN_NOT_LATEST_MOBILE_ROW');

const communications = (await gql(`query($id:String!){
  getTeamCommunicationMessages(teamRunId:$id) {
    messageId content
    senderAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
    receiverAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
    referenceFiles { referenceId path type }
  }
}`, { id: rootTeamRunId })).getTeamCommunicationMessages;
if (!communications.some((message) => message.referenceFiles.some((reference) => reference.path.endsWith(expectedFile)))) {
  throw new Error('PERSISTED_REFERENCE_RECORD_MISSING');
}

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1800, height: 1200 } });
const consoleEvents = [];
const observeConsole = (page) => page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) {
    consoleEvents.push({ type: message.type(), text: message.text().slice(0, 1000) });
  }
});
let result = null;
try {
  const desktop = await context.newPage();
  observeConsole(desktop);
  await desktop.goto(`${base}/workspace`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await desktop.waitForTimeout(2000);
  const workspaceRow = desktop.locator('[data-test="workspace-row"]').first();
  await workspaceRow.waitFor({ state: 'visible', timeout: 120000 });
  if ((await workspaceRow.getAttribute('aria-expanded')) !== 'true') await workspaceRow.locator('button').first().click();
  const definitionRow = desktop
    .locator('[data-test^="workspace-team-definition-row-"]')
    .filter({ hasText: 'Nested Classroom Test Team' })
    .first();
  await definitionRow.waitFor({ state: 'visible', timeout: 120000 });
  if ((await definitionRow.getAttribute('aria-expanded')) !== 'true') await definitionRow.click();
  const exactTeamRow = desktop.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`);
  await exactTeamRow.waitFor({ state: 'visible', timeout: 120000 });
  await exactTeamRow.click();
  await desktop.getByPlaceholder('Type a message...').waitFor({ state: 'visible', timeout: 120000 });
  const messageHeader = desktop.locator('[data-test="team-messages-header"]:visible').first();
  await messageHeader.waitFor({ state: 'visible', timeout: 120000 });
  if ((await messageHeader.getAttribute('aria-expanded')) !== 'true') await messageHeader.click();
  const desktopRows = desktop.locator('[data-test="team-communication-message-row"]:visible');
  await desktopRows.first().waitFor({ state: 'visible', timeout: 120000 });
  const desktopReference = desktop
    .locator('[data-test="team-communication-reference-row"]:visible')
    .filter({ hasText: expectedFile })
    .first();
  await desktopReference.waitFor({ state: 'visible', timeout: 120000 });
  await desktopReference.click();
  const desktopViewer = desktop.locator('[data-test="team-reference-viewer-shell"]:visible').first();
  await desktopViewer.waitFor({ state: 'visible', timeout: 120000 });
  await desktopViewer.getByText(expectedContent, { exact: false }).waitFor({ state: 'visible', timeout: 120000 });
  const desktopViewerText = await desktopViewer.innerText();
  await desktop.screenshot({ path: `${outDir}/persisted-desktop-reference.png`, fullPage: true });
  await desktop.locator('[data-test="team-communication-message-summary"]:visible').first().click();
  await desktopViewer.waitFor({ state: 'hidden', timeout: 120000 });
  const desktopEvidence = {
    exactPersistedRunSelected: await exactTeamRow.isVisible(),
    messageCount: await desktopRows.count(),
    exactReferencePathVisible: desktopViewerText.includes(expectedFile),
    exactReferenceContentVisible: desktopViewerText.includes(expectedContent),
    messageDetailRestoredAfterReference: await desktop.locator('[data-test="team-communication-message-markdown"]:visible').first().isVisible(),
  };

  const advertisedServerBaseUrl = 'http://192.168.2.158:60240';
  await rest('/rest/remote-access/settings', { method: 'PUT', body: JSON.stringify({ phoneAccessEnabled: true }) });
  const pairing = await rest('/rest/remote-access/pairing-sessions', {
    method: 'POST',
    body: JSON.stringify({
      serverBaseUrl: advertisedServerBaseUrl,
      serverName: 'API REV 040 Disposable Browser Node',
      trustedPrivateHttpAcknowledged: true,
    }),
  });
  const exchange = await rest('/rest/remote-access/pairing-exchanges', {
    method: 'POST',
    body: JSON.stringify({
      pairingCode: pairing.payload.pairingCode,
      deviceName: 'API REV 040 Persisted Mobile Browser',
      serverBaseUrl: advertisedServerBaseUrl,
    }),
  });
  const session = {
    version: 1,
    nodeId: 'api40-mobile-paired-node',
    serverBaseUrl: serverBase,
    credential: exchange.credential,
    device: exchange.device,
    pairedAt: new Date().toISOString(),
  };
  const mobile = await context.newPage();
  observeConsole(mobile);
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: 'autobyteus.remote_access.mobile_session.v1', value: session },
  );
  await mobile.goto(`${base}/mobile`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await mobile.locator('[data-testid="mobile-home"]').waitFor({ state: 'visible', timeout: 120000 });
  await mobile.waitForTimeout(2500);
  const recent = mobile
    .locator('[data-testid="mobile-readable-work-row"]')
    .filter({ hasText: 'Nested Classroom Test Team' })
    .first();
  await recent.waitFor({ state: 'visible', timeout: 120000 });
  const recentText = await recent.innerText();
  const recentMarkup = await recent.evaluate((element) => element.outerHTML);
  await recent.click();
  await mobile.locator('[data-testid="mobile-work-shell"]').waitFor({ state: 'visible', timeout: 120000 });
  await mobile.locator('[data-testid="mobile-tab-activity"]').click();
  const messageButton = mobile.locator('[data-testid="mobile-open-team-messages"]');
  await messageButton.waitFor({ state: 'visible', timeout: 120000 });
  await messageButton.click();
  const mobileRows = mobile.locator('[data-testid="mobile-team-message-row"]');
  await mobileRows.first().waitFor({ state: 'visible', timeout: 120000 });
  const mobileReference = mobile
    .locator('[data-testid="mobile-team-reference-row"]')
    .filter({ hasText: expectedFile })
    .first();
  await mobileReference.waitFor({ state: 'visible', timeout: 120000 });
  await mobileReference.click();
  const mobileViewer = mobile.locator('[data-testid="mobile-team-reference-viewer"]');
  await mobileViewer.waitFor({ state: 'visible', timeout: 120000 });
  await mobileViewer.getByText(expectedContent, { exact: false }).waitFor({ state: 'visible', timeout: 120000 });
  const mobileViewerText = await mobileViewer.innerText();
  await mobile.screenshot({ path: `${outDir}/persisted-mobile-reference.png`, fullPage: true });
  await mobile.locator('[data-testid="mobile-team-reference-back"]').click();
  await mobileViewer.waitFor({ state: 'hidden', timeout: 120000 });
  const messageSummary = await mobile
    .locator('[data-testid="mobile-activity-team-messages"]')
    .locator('p')
    .first()
    .innerText();
  const mobileEvidence = {
    latestHistoryRunMatchesExactRoot: nestedRuns.at(-1)?.teamRunId === rootTeamRunId,
    recentText,
    recentMarkup,
    messageSummary,
    messageCount: await mobileRows.count(),
    exactReferencePathVisible: mobileViewerText.includes(expectedFile),
    exactReferenceContentVisible: mobileViewerText.includes(expectedContent),
    referenceRowRestoredAfterBack: await mobileReference.isVisible(),
  };
  await mobile.screenshot({ path: `${outDir}/persisted-mobile-back.png`, fullPage: true });

  const conditions = {
    exactRunTerminalAndLatest: Boolean(exactRun.terminatedAt) && nestedRuns.at(-1)?.teamRunId === rootTeamRunId,
    exactPersistedRecords: communications.length >= 2 && communications.every((message) =>
      message.senderAddress.rootTeamRunId === rootTeamRunId
      && message.receiverAddress.rootTeamRunId === rootTeamRunId),
    desktopPersistedReference: Object.values(desktopEvidence).every((value) => typeof value === 'number' ? value >= 2 : Boolean(value)),
    mobilePersistedReference: Object.entries(mobileEvidence).every(([key, value]) => {
      if (key === 'messageSummary') return /^[1-9][0-9]* messages?; open details for full text\.$/.test(value);
      if (key === 'messageCount') return value >= 2;
      return Boolean(value);
    }),
    noBrowserConsoleErrors: consoleEvents.filter((event) => event.type === 'error').length === 0,
  };
  result = {
    schemaVersion: 1,
    passed: Object.values(conditions).every(Boolean),
    rootTeamRunId,
    conditions,
    exactRun,
    communications,
    desktopEvidence,
    mobileEvidence,
    consoleEvents,
  };
  await desktop.close();
  await mobile.close();
} catch (error) {
  result = {
    schemaVersion: 1,
    passed: false,
    rootTeamRunId,
    exactRun,
    communications,
    fatalError: error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error),
    consoleEvents,
  };
}
fs.writeFileSync(`${outDir}/persisted-desktop-mobile-reference.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  passed: result.passed,
  rootTeamRunId,
  conditions: result.conditions,
  fatalError: result.fatalError ?? null,
}, null, 2));
await browser.close();
if (!result.passed) process.exitCode = 2;
