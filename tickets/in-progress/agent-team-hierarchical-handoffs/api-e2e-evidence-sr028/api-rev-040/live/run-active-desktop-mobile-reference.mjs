import fs from 'node:fs';
import { chromium } from '../../../../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const base = 'http://127.0.0.1:31240';
const serverBase = 'http://127.0.0.1:60240';
const gqlEndpoint = `${serverBase}/graphql`;
const outDir = new URL('./browser/', import.meta.url).pathname;
const referencePath = new URL('./api40-mobile-desktop-reference.txt', import.meta.url).pathname;
const expectedReply = 'API40_REFERENCE_REPLY_AUTOBYTEUS';
const expectedContent = 'API40_REFERENCE_CONTENT_AUTOBYTEUS';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(referencePath, `${expectedContent}\n`);

async function gql(query, variables = {}) {
  const response = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors) {
    throw new Error(`GRAPHQL_FAILED:${response.status}:${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data;
}

async function rest(pathname, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(`${serverBase}${pathname}`, { ...init, headers });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(`REST_FAILED:${pathname}:${response.status}:${text}`);
  return json;
}

const historyQuery = `query {
  listWorkspaceRunHistory(limitPerAgent:200) {
    teamDefinitions {
      teamDefinitionId
      runs { teamRunId createdAt isActive coordinatorAddress members { memberAddress agentRunId status runtimeKind } }
    }
  }
}`;
const communicationQuery = `query($id:String!){
  getTeamCommunicationMessages(teamRunId:$id) {
    messageId content
    senderAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
    receiverAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
    referenceFiles { referenceId path type }
  }
}`;

function nestedRuns(data) {
  return data.listWorkspaceRunHistory
    .flatMap((workspace) => workspace.teamDefinitions)
    .filter((team) => team.teamDefinitionId === 'nested-classroom-test')
    .flatMap((team) => team.runs);
}

async function selectRestoredTeam(page, rootTeamRunId) {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1500);
  const workspaceRow = page.locator('[data-test="workspace-row"]').first();
  await workspaceRow.waitFor({ state: 'visible', timeout: 120000 });
  if ((await workspaceRow.getAttribute('aria-expanded')) !== 'true') {
    await workspaceRow.locator('button').first().click();
  }
  const definitionRow = page
    .locator('[data-test^="workspace-team-definition-row-"]')
    .filter({ hasText: 'Nested Classroom Test Team' })
    .first();
  await definitionRow.waitFor({ state: 'visible', timeout: 120000 });
  if ((await definitionRow.getAttribute('aria-expanded')) !== 'true') await definitionRow.click();
  const teamRow = page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`);
  await teamRow.waitFor({ state: 'visible', timeout: 120000 });
  await teamRow.click();
  await page.getByPlaceholder('Type a message...').waitFor({ state: 'visible', timeout: 120000 });
}

async function verifyDesktopReference(page, screenshotPrefix) {
  const header = page.locator('[data-test="team-messages-header"]:visible').first();
  await header.waitFor({ state: 'visible', timeout: 120000 });
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  const list = page.locator('[data-test="team-communication-message-list"]:visible').first();
  await list.waitFor({ state: 'visible', timeout: 120000 });
  const rows = page.locator('[data-test="team-communication-message-row"]:visible');
  const referenceRow = page
    .locator('[data-test="team-communication-reference-row"]:visible')
    .filter({ hasText: 'api40-mobile-desktop-reference.txt' })
    .first();
  await referenceRow.waitFor({ state: 'visible', timeout: 120000 });
  await referenceRow.click();
  const viewer = page.locator('[data-test="team-reference-viewer-shell"]:visible').first();
  await viewer.waitFor({ state: 'visible', timeout: 120000 });
  await viewer.getByText(expectedContent, { exact: false }).waitFor({ state: 'visible', timeout: 120000 });
  const viewerText = await viewer.innerText();
  await page.screenshot({ path: `${outDir}/${screenshotPrefix}-desktop-reference.png`, fullPage: true });
  await page.locator('[data-test="team-communication-message-summary"]:visible').first().click();
  await viewer.waitFor({ state: 'hidden', timeout: 120000 });
  return {
    messageCount: await rows.count(),
    exactReferencePathVisible: viewerText.includes('api40-mobile-desktop-reference.txt'),
    exactReferenceContentVisible: viewerText.includes(expectedContent),
    messageDetailRestoredAfterReference: await page.locator('[data-test="team-communication-message-markdown"]:visible').first().isVisible(),
  };
}

async function createMobileSession(deviceName) {
  const settings = await rest('/rest/remote-access/settings', {
    method: 'PUT',
    body: JSON.stringify({ phoneAccessEnabled: true }),
  });
  const advertisedServerBaseUrl = 'http://192.168.2.158:60240';
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
      deviceName,
      serverBaseUrl: advertisedServerBaseUrl,
    }),
  });
  return {
    settings,
    exchange,
    session: {
      version: 1,
      nodeId: 'api40-mobile-paired-node',
      serverBaseUrl: serverBase,
      credential: exchange.credential,
      device: exchange.device,
      pairedAt: new Date().toISOString(),
    },
  };
}

async function verifyMobileReference(context, deviceName, screenshotPrefix) {
  const pairing = await createMobileSession(deviceName);
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: 'autobyteus.remote_access.mobile_session.v1', value: pairing.session },
  );
  await page.goto(`${base}/mobile`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-testid="mobile-home"]').waitFor({ state: 'visible', timeout: 120000 });
  const recent = page
    .locator('[data-testid="mobile-readable-work-row"]')
    .filter({ hasText: 'Nested Classroom Test Team' })
    .first();
  await recent.waitFor({ state: 'visible', timeout: 120000 });
  await recent.click();
  await page.locator('[data-testid="mobile-work-shell"]').waitFor({ state: 'visible', timeout: 120000 });
  await page.locator('[data-testid="mobile-tab-activity"]').click();
  const messagesButton = page.locator('[data-testid="mobile-open-team-messages"]');
  await messagesButton.waitFor({ state: 'visible', timeout: 120000 });
  await messagesButton.click();
  const messageRows = page.locator('[data-testid="mobile-team-message-row"]');
  const referenceRow = page
    .locator('[data-testid="mobile-team-reference-row"]')
    .filter({ hasText: 'api40-mobile-desktop-reference.txt' })
    .first();
  await referenceRow.waitFor({ state: 'visible', timeout: 120000 });
  await referenceRow.click();
  const viewer = page.locator('[data-testid="mobile-team-reference-viewer"]');
  await viewer.waitFor({ state: 'visible', timeout: 120000 });
  await viewer.getByText(expectedContent, { exact: false }).waitFor({ state: 'visible', timeout: 120000 });
  const viewerText = await viewer.innerText();
  await page.screenshot({ path: `${outDir}/${screenshotPrefix}-mobile-reference.png`, fullPage: true });
  await page.locator('[data-testid="mobile-team-reference-back"]').click();
  await viewer.waitFor({ state: 'hidden', timeout: 120000 });
  const messageSummary = await page
    .locator('[data-testid="mobile-activity-team-messages"]')
    .locator('p')
    .first()
    .innerText();
  const result = {
    phoneAccessEnabled: pairing.settings.settings?.phoneAccessEnabled === true,
    pairedCredentialIssued: typeof pairing.exchange.credential === 'string' && pairing.exchange.credential.startsWith('mra_'),
    messageSummary,
    messageCount: await messageRows.count(),
    exactReferencePathVisible: viewerText.includes('api40-mobile-desktop-reference.txt'),
    exactReferenceContentVisible: viewerText.includes(expectedContent),
    referenceRowRestoredAfterBack: await referenceRow.isVisible(),
  };
  await page.screenshot({ path: `${outDir}/${screenshotPrefix}-mobile-back.png`, fullPage: true });
  await page.close();
  return result;
}

const beforeIds = new Set(nestedRuns(await gql(historyQuery)).map((run) => run.teamRunId));
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1800, height: 1200 } });
const page = await context.newPage();
const consoleEvents = [];
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) {
    consoleEvents.push({ type: message.type(), text: message.text().slice(0, 1000) });
  }
});

let rootTeamRunId = null;
let communications = [];
let termination = null;
let result = null;
try {
  await page.goto(`${base}/agent-teams?view=team-list`, { waitUntil: 'networkidle', timeout: 120000 });
  const card = page.locator('div.group').filter({ hasText: 'Nested Classroom Test Team' }).first();
  await card.waitFor({ state: 'visible', timeout: 120000 });
  await card.getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForURL('**/workspace**', { timeout: 120000 });
  await page.locator('#team-run-runtime-kind').selectOption('autobyteus');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Select a model', exact: true }).click();
  await page.getByPlaceholder('Search models...').fill('gpt-5.6-luna');
  await page.locator('li').filter({ hasText: /gpt-5\.6-luna/i }).first().click();
  const autoApprove = page.locator('#team-auto-execute');
  if ((await autoApprove.getAttribute('class'))?.includes('bg-gray')) await autoApprove.click();
  await page.getByRole('button', { name: 'Run Team', exact: true }).click();
  const input = page.getByPlaceholder('Type a message...');
  await input.waitFor({ state: 'visible', timeout: 180000 });
  await input.fill(
    `Use send_message_to exactly once to send an ordinary message to ./StudentStudyGroup with reference_files:["${referencePath}"] asking its coordinator to reply to /Teacher with exactly ${expectedReply}. Wait for the reply, then briefly confirm completion.`,
  );
  await input.press('Enter');

  for (let index = 0; index < 120; index += 1) {
    const fresh = nestedRuns(await gql(historyQuery)).filter((run) => !beforeIds.has(run.teamRunId));
    if (fresh.length) {
      rootTeamRunId = fresh.at(-1).teamRunId;
      break;
    }
    await page.waitForTimeout(500);
  }
  if (!rootTeamRunId) throw new Error('FRESH_TEAM_RUN_NOT_FOUND');

  for (let index = 0; index < 360; index += 1) {
    await page.waitForTimeout(500);
    communications = (await gql(communicationQuery, { id: rootTeamRunId })).getTeamCommunicationMessages;
    const reference = communications.find((message) =>
      message.referenceFiles.some((referenceFile) => referenceFile.path === referencePath));
    const reply = communications.find((message) =>
      message.content.trim() === expectedReply && message.receiverAddress.memberAddress === '/Teacher');
    if (reference && reply) break;
  }
  communications = (await gql(communicationQuery, { id: rootTeamRunId })).getTeamCommunicationMessages;
  const referenceMessages = communications.filter((message) =>
    message.referenceFiles.some((referenceFile) => referenceFile.path === referencePath));
  const exactReplies = communications.filter((message) =>
    message.content.trim() === expectedReply && message.receiverAddress.memberAddress === '/Teacher');

  await selectRestoredTeam(page, rootTeamRunId);
  const desktopActive = await verifyDesktopReference(page, 'active');

  await page.locator('[data-test="workspace-header-edit-config"]').click();
  const back = page.locator('[data-test="run-config-back-to-events"]');
  await back.waitFor({ state: 'visible', timeout: 120000 });
  const configBody = await page.locator('body').innerText();
  const selectedTeamConfig = {
    titleVisible: configBody.includes('Team Configuration'),
    readOnlyNoticeVisible: configBody.includes('Selected team run configuration is read-only.'),
    runtimeMatches: (await page.locator('#team-run-runtime-kind').inputValue()) === 'autobyteus',
    runtimeDisabled: await page.locator('#team-run-runtime-kind').isDisabled(),
    autoApproveDisabled: await page.locator('#team-auto-execute').isDisabled(),
    runButtonAbsent: (await page.getByRole('button', { name: 'Run Team', exact: true }).count()) === 0,
  };
  await page.screenshot({ path: `${outDir}/selected-team-config-read-only.png`, fullPage: true });
  await back.click();

  const mobileActive = await verifyMobileReference(context, 'API REV 040 Active Mobile Browser', 'active');
  const conditions = {
    freshActiveTeam: Boolean(rootTeamRunId),
    referencedMessagePresent: referenceMessages.length >= 1,
    exactReplyReceivedOnce: exactReplies.length === 1,
    exactRootOnAllRecords: communications.length >= 2 && communications.every((message) =>
      message.senderAddress.rootTeamRunId === rootTeamRunId
      && message.receiverAddress.rootTeamRunId === rootTeamRunId),
    desktopActiveReference: Object.values(desktopActive).every((value) => typeof value === 'number' ? value >= 2 : Boolean(value)),
    selectedTeamConfigReadOnly: Object.values(selectedTeamConfig).every(Boolean),
    mobileActiveReference: Object.entries(mobileActive).every(([key, value]) =>
      key === 'messageSummary'
        ? /^[1-9][0-9]* messages?; open details for full text\.$/.test(value)
        : typeof value === 'number' ? value >= 2 : Boolean(value)),
    noBrowserConsoleErrors: consoleEvents.filter((event) => event.type === 'error').length === 0,
  };
  result = {
    schemaVersion: 1,
    passed: Object.values(conditions).every(Boolean),
    rootTeamRunId,
    conditions,
    desktopActive,
    mobileActive,
    selectedTeamConfig,
    communications,
    consoleEvents,
  };
} catch (error) {
  result = {
    schemaVersion: 1,
    passed: false,
    rootTeamRunId,
    communications,
    fatalError: error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error),
    consoleEvents,
  };
  try { await page.screenshot({ path: `${outDir}/active-desktop-mobile-failure.png`, fullPage: true }); } catch {}
} finally {
  if (rootTeamRunId) {
    try {
      termination = (await gql(
        `mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`,
        { id: rootTeamRunId },
      )).terminateAgentTeamRun;
    } catch (error) {
      termination = { success: false, message: String(error) };
    }
  }
  result = { ...result, termination };
  fs.writeFileSync(
    `${outDir}/active-desktop-mobile-reference.json`,
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(JSON.stringify({
    passed: result.passed,
    rootTeamRunId,
    conditions: result.conditions,
    fatalError: result.fatalError ?? null,
    termination,
  }, null, 2));
  await browser.close();
}
if (!result.passed || !termination?.success) process.exitCode = 2;
