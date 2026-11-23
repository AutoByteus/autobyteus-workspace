// A stopped tool call and the earlier-trace cards, on a real stack (autobyteus-609 AC-D, AC-E). A case of
// `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after the activity details cases
// (`--cases=MSP-102` runs only it).
//
// On alpha (the node of the probe's desktop window, scripted AGY `linked_skills`), one run, in the desktop window (the Nuxt
// dev frontend, 1440×1000) and on the probe's paired phone (the production bundle, 390×844):
//   MSP-102 AC-E, AC-D  1. `AGENT_TOOL_STEPS` streams four AGY tool steps while the desktop conversation is open: an own-MCP
//                  `send_message_to` (recipient), an own-MCP `get_project_task` (Task), `run_command` (`CommandLine`, with a
//                  leading `cd`) and `view_file` (`AbsolutePath`); their live cards' summaries are read.
//                  2. `HOLD_TURN` leaves a `run_command` running; the user presses Stop in the desktop composer. The desktop
//                  conversation card shows the stop icon, the desktop Activity panel's row reads "Stopped", and the phone's
//                  Activity row and its detail read "Stopped".
//                  3. Echo turns until the run's trace has more than 100 events (the node's latest window), so the conversation
//                  opened again reads its cards from the node's earlier-trace page. The desktop is reloaded, the run opened and
//                  the conversation scrolled to its top with the wheel: the cards then shown come from that page (the request is
//                  recorded). Each of the four calls' page card shows the same summary as its live card, and the stopped call's
//                  page card shows the stop icon. The page's own answer (GraphQL) is recorded: `summaryArgs` and `statusKey`.
//   MSP-103 AC-D (D-D2, a Team member)  A Team run open on the desktop on its coordinator (the Team stream live, the member
//                  `/mate` not loaded yet). `/mate` holds a running call; the phone opens `/mate` and presses Stop; the phone's
//                  Activity reads "Stopped". Then the desktop opens `/mate`: the member loads from the node while the Team's live
//                  state also has the call (the member loader's reconciliation of live and read-back state); its card shows the
//                  stop icon and its Activity "Stopped", with no conflict error. The phone app loaded again at its home and
//                  `/mate` opened again (read back only): "Stopped".
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { attachToBrowserContext } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';

const STOP = 'Stop generation';
const TOOLS = ['send_message_to', 'get_project_task', 'run_command', 'view_file'];

export const runStoppedCallTraceCases = async (probe) => {
  const { runCase, page, stack, alpha, browser, toList, openRow, menuOpen, shot, waitFor, sleep, assert, desktopRunsView, outputDir, selected, sendOver } = probe;
  if (selected && !['MSP-102', 'MSP-103'].some((id) => selected.has(id))) return;
  const wants = (id) => !selected || selected.has(id);

  if (wants('MSP-102')) await runCase('MSP-102', async () => {
    const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
    assert(created.success, created.message);
    const run = created.runId;
    await stack.agentSay(run, 'Plain start. Marker STOP-609-START.');
    await waitFor('the first reply', async () => (await stack.projection(run)).includes('STOP-609-START'), 60_000);

    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
    await attachToBrowserContext(context);
    await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const desk = await context.newPage();
    const pageRequests = [];
    desk.on('request', (request) => {
      if (request.method() === 'POST' && /GetRunEventMonitorActiveTracePage/.test(request.postData() ?? '')) pageRequests.push({ at: Date.now(), body: request.postData()?.slice(0, 300) });
    });
    try {
      await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
      const openRun = async () => {
        await desk.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
        await desktopRunsView(desk);
        const showOlder = desk.locator('[data-test="run-list-show-older"]');
        if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
        await desk.locator(`[data-test="run-list-row"][data-run-id="${run}"] [data-test="workspace-agent-run-row"]`).first().click({ timeout: 60_000 });
        await desk.locator('[data-testid="agent-conversation-feed"]').first().waitFor({ timeout: 60_000 });
      };
      const feed = () => desk.locator('[data-testid="agent-conversation-feed"]').first();
      /** Every tool card the desktop conversation shows: its name, its summary and whether it shows the stop icon. */
      const cards = () => feed().evaluate((el) => [...el.querySelectorAll('div.my-2 > div.rounded-lg')].map((card) => ({
        name: card.querySelector('span.font-medium')?.textContent.trim() ?? null,
        summary: card.querySelector('[data-test="tool-context-summary"]')?.textContent.replace(/^\s*·\s*/, '').trim() ?? null,
        stopped: Boolean(card.querySelector('[data-testid="tool-call-status-stopped"]')),
      })));
      const named = (list, tool) => list.filter((card) => card.name === tool || card.name?.endsWith(`__${tool}`));

      // 1. The live cards.
      await openRun();
      await stack.agentSay(run, 'Use the tools. AGENT_TOOL_STEPS');
      await waitFor('the four live cards', async () => (await cards()).filter((card) => TOOLS.some((tool) => card.name === tool || card.name?.endsWith(`__${tool}`))).length >= 4, 60_000).catch(() => undefined);
      const liveCards = await cards();
      await shot(desk, 'MSP-102-desktop-live-cards');
      const live = Object.fromEntries(TOOLS.map((tool) => [tool, named(liveCards, tool)[0] ?? null]));

      // 2. A running call stopped by the user in the desktop composer.
      await stack.agentSay(run, 'Keep working. HOLD_TURN');
      const stop = desk.locator(`button[aria-label="${STOP}"]`).last();
      await waitFor('the desktop Stop button', async () => (await stop.count()) > 0 && await stop.isEnabled(), 60_000);
      await waitFor('the held call\'s card', async () => named(await cards(), 'run_command').some((card) => card.summary?.includes('HOLD_TURN')), 30_000).catch(() => undefined);
      await stop.click();
      let heldCard = null;
      await waitFor('the stopped call\'s card shows the stop icon', async () => Boolean((heldCard = named(await cards(), 'run_command').find((card) => card.summary?.includes('HOLD_TURN')))?.stopped), 60_000).catch(() => undefined);
      await shot(desk, 'MSP-102-desktop-stopped-card');
      // The desktop Activity panel.
      await desk.locator('[data-test="right-side-tab-list"]').getByText('Activity', { exact: true }).first().click();
      const activityItems = () => desk.evaluate(() => [...document.querySelectorAll('[data-test="activity-feed-scroll-container"] div.border.rounded-lg')].map((item) => ({
        name: item.querySelector('span.font-bold')?.textContent.trim() ?? null,
        chip: item.querySelector('span.rounded-full')?.textContent.trim() ?? null,
      })).filter((item) => item.name));
      let deskActivity = [];
      await waitFor('the desktop Activity row reads Stopped', async () => (deskActivity = await activityItems()).some((item) => item.name === 'run_command' && /^stopped$/i.test(item.chip ?? '')), 30_000).catch(() => undefined);
      await shot(desk, 'MSP-102-desktop-activity-stopped');

      // The phone's Activity row and its detail.
      await toList(page);
      await waitFor('the run in the phone list', async () => (await page.locator(`[data-testid="mobile-run-row-agent:${run}"]`).count()) > 0, 30_000);
      await openRow(page, `agent:${run}`);
      await menuOpen(page, 'activity');
      await page.locator('[data-testid="mobile-activity"]').waitFor({ timeout: 20_000 });
      const heldRow = page.locator('[data-testid="mobile-activity"] [data-testid="mobile-run-activity-row"]').filter({ hasText: 'HOLD_TURN' }).first();
      await waitFor('the held call on the phone', async () => (await heldRow.count()) > 0, 30_000).catch(() => undefined);
      const phoneRow = await heldRow.evaluate((row) => ({ status: row.getAttribute('data-status'),
        word: row.querySelector('[data-testid="mobile-run-activity-status"]')?.textContent.trim() ?? null })).catch(() => null);
      await shot(page, 'MSP-102-phone-activity-stopped');
      await heldRow.tap().catch(() => undefined);
      await page.locator('[data-testid="mobile-activity-detail"]').waitFor({ timeout: 15_000 }).catch(() => undefined);
      const phoneDetail = (await page.locator('[data-testid="mobile-activity-detail-status"]').textContent().catch(() => null))?.trim() ?? null;
      await shot(page, 'MSP-102-phone-detail-stopped');
      await page.goBack().catch(() => undefined);

      // 3. More than 100 events, so the conversation opened again reads its cards from the earlier-trace page.
      const pageQuery = async () => (await alpha.gql(`query($id:String!){getRunEventMonitorActiveTracePage(runId:$id){hasEarlier loadedEarlierCount events{eventId visuals{
        ... on EventMonitorToolCardVisual { kind toolName statusKey summaryArgs } }}}}`, { id: run })).getRunEventMonitorActiveTracePage;
      let latest = await pageQuery();
      let fillers = 0;
      while (latest.loadedEarlierCount === 0 && fillers < 80) {
        fillers += 1;
        await stack.agentSay(run, `ECHO_INPUT FILLER-609-${fillers}`);
        await waitFor(`filler ${fillers}`, async () => (await stack.projection(run)).includes(`FILLER-609-${fillers}\\"`), 60_000);
        if (fillers % 5 === 0) latest = await pageQuery();
      }
      latest = await pageQuery();
      const pageCards = latest.events.flatMap((event) => event.visuals.filter((visual) => visual.kind === 'tool_card'));
      const apiCard = (tool, match = () => true) => pageCards.find((card) => (card.toolName === tool || card.toolName?.endsWith(`__${tool}`)) && match(card)) ?? null;
      const api = { ...Object.fromEntries(TOOLS.map((tool) => [tool, apiCard(tool, (card) => !JSON.stringify(card.summaryArgs ?? {}).includes('HOLD_TURN'))])),
        held: apiCard('run_command', (card) => JSON.stringify(card.summaryArgs ?? {}).includes('HOLD_TURN')) };

      // The desktop again (a reload), scrolled to the top of the conversation with the wheel.
      const requestsBefore = pageRequests.length;
      await openRun();
      await sleep(1_500);
      const box = await feed().boundingBox();
      for (let round = 0; round < 40 && pageRequests.length === requestsBefore; round += 1) {
        await desk.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await desk.mouse.wheel(0, -2_500);
        await sleep(250);
      }
      let browsed = [];
      await waitFor('the page cards', async () => named(browsed = await cards(), 'get_project_task').length > 0 && named(browsed, 'run_command').some((card) => card.summary?.includes('HOLD_TURN')), 30_000).catch(() => undefined);
      // Scroll on to the top, so every card of the page is in the document.
      for (let round = 0; round < 10; round += 1) { await desk.mouse.wheel(0, -2_500); await sleep(200); }
      browsed = await cards();
      await shot(desk, 'MSP-102-desktop-page-cards');
      const browse = Object.fromEntries(TOOLS.map((tool) => [tool, named(browsed, tool).find((card) => !card.summary?.includes('HOLD_TURN')) ?? null]));
      const browseHeld = named(browsed, 'run_command').find((card) => card.summary?.includes('HOLD_TURN')) ?? null;

      const details = { run, fillers, pageEvents: latest.events.length, loadedEarlierCount: latest.loadedEarlierCount, pageRequests: pageRequests.length - requestsBefore,
        live, heldCard, deskActivity: deskActivity.filter((item) => item.name === 'run_command'), phoneRow, phoneDetail, api, browse, browseHeld };
      const sameSummary = TOOLS.filter((tool) => !(live[tool]?.summary && browse[tool]?.summary === live[tool].summary));
      const failures = [
        [TOOLS.every((tool) => live[tool]?.summary), 'each of the four calls\' live card has a summary (the setup)'],
        [heldCard?.stopped === true, 'AC-D the stopped call\'s conversation card shows the stop icon (desktop, live)'],
        [deskActivity.some((item) => item.name === 'run_command' && /^stopped$/i.test(item.chip ?? '')), 'AC-D the desktop Activity panel reads "Stopped" for the stopped call'],
        [phoneRow?.status === 'interrupted' && phoneRow.word === 'Stopped' && phoneDetail === 'Stopped', 'AC-D the phone\'s Activity row and its detail read "Stopped"'],
        [latest.loadedEarlierCount > 0 && details.pageRequests > 0, 'the reopened conversation read the node\'s earlier-trace page (the setup)'],
        [sameSummary.length === 0, `AC-E each page card shows the same summary as its live card (differs: ${sameSummary.join(', ') || 'none'})`],
        [browseHeld?.stopped === true && api.held?.statusKey === 'interrupted', 'AC-D the stopped call\'s earlier-trace card shows the stop icon (the page answers statusKey interrupted)'],
      ].filter(([ok]) => !ok).map(([, text]) => text);
      assert(failures.length === 0, failures.join('; '), details);
      return details;
    } finally {
      await context.close().catch(() => undefined);
    }
  });

  if (wants('MSP-103')) await runCase('MSP-103', async () => {
    const team = (await alpha.gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: stack.ids.delivery,
      teamConfigs: [{ teamAddress: '/', ...stack.runConfig }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: stack.ids.checker, ...stack.runConfig },
        { memberAddress: '/mate', agentDefinitionId: stack.ids.writer, ...stack.runConfig }] } })).createAgentTeamRun;
    assert(team.success, team.message);
    const tree = JSON.stringify((await alpha.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: team.teamRunId })).getTeamRunResumeConfig.executionTree);
    const lead = /"address":"\/lead"[^}]*"agent_run_id":"([^"]+)"/.exec(tree)?.[1];
    const mate = /"address":"\/mate"[^}]*"agent_run_id":"([^"]+)"/.exec(tree)?.[1];
    assert(lead && mate, 'the Team\'s members', tree);
    const say = (agentRunId, content) => sendOver(stack.wsUrl(`agent-team/${team.teamRunId}`), { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`,
      context_file_paths: [], image_urls: [], agent_run_id: agentRunId, content });
    const memberProjection = async (agentRunId, field = 'conversation') => JSON.stringify((await alpha.gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){${field}}}`,
      { id: team.teamRunId, a: agentRunId })).getTeamMemberRunProjection?.[field] ?? []);
    await say(lead, 'Lead ready. Marker TEAM-STOP-609-LEAD.');
    await waitFor('the lead\'s reply', async () => (await memberProjection(lead)).includes('TEAM-STOP-609-LEAD'), 60_000);

    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
    await attachToBrowserContext(context);
    await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const desk = await context.newPage();
    const deskErrors = [];
    desk.on('console', (message) => { if (message.type() === 'error') deskErrors.push(message.text().slice(0, 300)); });
    desk.on('pageerror', (error) => deskErrors.push(`pageerror ${error.message}`.slice(0, 300)));
    try {
      // The desktop on the Team's coordinator: the Team stream is live; `/mate` is not loaded.
      await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
      await desk.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
      await desktopRunsView(desk);
      const showOlder = desk.locator('[data-test="run-list-show-older"]');
      if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
      const teamRow = desk.locator(`[data-test="workspace-team-row-${team.teamRunId}"]`).first();
      await teamRow.click({ timeout: 60_000 });
      const feed = () => desk.locator('[data-testid="agent-conversation-feed"]').first();
      await waitFor('the lead\'s conversation on the desktop', async () => (await feed().innerText().catch(() => '')).includes('TEAM-STOP-609-LEAD'), 60_000);

      // `/mate` runs a call.
      await say(mate, 'Keep working. HOLD_TURN');
      await waitFor('the member\'s running call', async () => (await memberProjection(mate)).includes('HOLD_TURN'), 60_000);
      await sleep(1_500);

      // The phone opens `/mate` and presses Stop.
      const openMateOnPhone = async () => {
        await toList(page);
        const teamRowKey = `team:${team.teamRunId}`;
        await page.locator(`[data-testid="mobile-run-row-${teamRowKey}"]`).first().waitFor({ timeout: 60_000 });
        const memberOpen = page.locator(`[data-testid^="mobile-run-row-${teamRowKey}/"]`).filter({ hasText: /mate/i }).locator('[data-testid="mobile-run-open"]').first();
        for (let round = 0; round < 5 && !(await memberOpen.count()); round += 1) {
          const row = page.locator(`[data-testid="mobile-run-row-${teamRowKey}"]`).first();
          if ((await row.getAttribute('aria-expanded')) === 'false') await row.locator('[data-testid="mobile-run-toggle"]').click({ timeout: 1_500 }).catch(() => undefined);
          await sleep(600);
        }
        await memberOpen.click({ timeout: 60_000 });
        await page.locator('[data-testid="mobile-run-conversation"]').waitFor({ timeout: 30_000 });
      };
      const phoneHeld = async () => {
        if (!(await page.locator('[data-testid="mobile-activity"]:visible').count())) await menuOpen(page, 'activity');
        await page.locator('[data-testid="mobile-activity"]').waitFor({ timeout: 20_000 });
        const row = page.locator('[data-testid="mobile-activity"] [data-testid="mobile-run-activity-row"]').filter({ hasText: 'HOLD_TURN' }).first();
        let shown = null;
        await waitFor('the held call on the phone', async () => (shown = await row.evaluate((el) => ({ status: el.getAttribute('data-status'),
          word: el.querySelector('[data-testid="mobile-run-activity-status"]')?.textContent.trim() ?? null })).catch(() => null))?.status !== 'executing' && Boolean(shown), 30_000).catch(() => undefined);
        return shown;
      };
      await openMateOnPhone();
      const stop = page.locator(`button[aria-label="${STOP}"]`).last();
      await waitFor('the phone\'s Stop for /mate', async () => (await stop.count()) > 0 && await stop.isEnabled(), 30_000);
      await stop.tap();
      await waitFor('the member stopped', async () => (await page.locator(`button[aria-label="${STOP}"]`).count()) === 0, 30_000).catch(() => undefined);
      const phoneLive = await phoneHeld();
      await shot(page, 'MSP-103-phone-live-stopped');

      // The desktop opens `/mate`: it loads from the node, reconciled with the Team's live state.
      const cards = () => feed().evaluate((el) => [...el.querySelectorAll('div.my-2 > div.rounded-lg')].map((card) => ({
        name: card.querySelector('span.font-medium')?.textContent.trim() ?? null,
        summary: card.querySelector('[data-test="tool-context-summary"]')?.textContent.replace(/^\s*·\s*/, '').trim() ?? null,
        stopped: Boolean(card.querySelector('[data-testid="tool-call-status-stopped"]')),
        error: Boolean(card.querySelector('[data-icon*="exclamation"], svg.text-red-500')),
      })));
      await desk.locator(`[data-test="workspace-team-member-${team.teamRunId}-/mate"]`).first().click({ timeout: 60_000 });
      let deskCard = null;
      await waitFor('the member\'s stopped card on the desktop', async () => Boolean((deskCard = (await cards()).find((card) => card.summary?.includes('HOLD_TURN')))?.stopped), 30_000).catch(() => undefined);
      await desk.locator('[data-test="right-side-tab-list"]').getByText('Activity', { exact: true }).first().click();
      const activityItems = () => desk.evaluate(() => [...document.querySelectorAll('[data-test="activity-feed-scroll-container"] div.border.rounded-lg')].map((item) => ({
        name: item.querySelector('span.font-bold')?.textContent.trim() ?? null,
        chip: item.querySelector('span.rounded-full')?.textContent.trim() ?? null,
      })).filter((item) => item.name));
      let deskActivity = [];
      await waitFor('the member\'s desktop Activity reads Stopped', async () => (deskActivity = await activityItems()).some((item) => item.name === 'run_command' && /^stopped$/i.test(item.chip ?? '')), 20_000).catch(() => undefined);
      await shot(desk, 'MSP-103-desktop-member-stopped');

      // The phone reloaded (a fresh page: nothing live kept; a member's screen reopens, MSP-33), `/mate`'s Activity again:
      // read back only.
      const failedRequests = [];
      const onFailed = (request) => failedRequests.push(`${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ''}`);
      page.on('requestfailed', onFailed);
      const urlBeforeReload = page.url();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitFor('the phone after the reload', async () => (await page.locator('[data-testid="mobile-run-tree"]:visible, [data-testid="mobile-run-conversation"]:visible, [data-testid="mobile-activity"]:visible').count()) > 0, 60_000)
        .catch(async (error) => {
          error.details = { urlBeforeReload, url: page.url(), failedRequests: failedRequests.slice(0, 20),
            body: (await page.evaluate(() => document.body.innerHTML.slice(0, 600)).catch(() => null)) };
          throw error;
        });
      page.off('requestfailed', onFailed);
      await shot(page, 'MSP-103-phone-reloaded');
      // The reload reopens the screen it was on (`?row=<the member>&screen=activity`); from the list, `/mate` is opened again.
      if (!(await page.locator('[data-testid="mobile-run-conversation"]:visible, [data-testid="mobile-activity"]:visible').count())) await openMateOnPhone();
      const phoneReadBack = await phoneHeld();
      await shot(page, 'MSP-103-phone-read-back-stopped');
      const stored = JSON.parse(await memberProjection(mate, 'activities')).filter((activity) => JSON.stringify(activity).includes('HOLD_TURN')).map((activity) => activity.status);

      const conflicts = deskErrors.filter((line) => /Conflicting terminal tool outcomes|changed while it was loading/.test(line));
      const details = { team: team.teamRunId, lead, mate, phoneLive, deskCard, deskActivity: deskActivity.filter((item) => item.name === 'run_command'), phoneReadBack, stored, conflicts, deskErrors: deskErrors.slice(0, 10) };
      const failures = [
        [phoneLive?.status === 'interrupted' && phoneLive.word === 'Stopped', 'AC-D the phone reads "Stopped" for the member\'s call it stopped (live)'],
        [deskCard?.stopped === true && deskCard.error === false, 'AC-D the desktop member card shows the stop icon after the member loads (live and read-back state reconciled)'],
        [deskActivity.some((item) => item.name === 'run_command' && /^stopped$/i.test(item.chip ?? '')), 'AC-D the desktop member Activity reads "Stopped"'],
        [conflicts.length === 0, 'no conflict between the live and the read-back state on the desktop'],
        [phoneReadBack?.status === 'interrupted' && phoneReadBack.word === 'Stopped' && stored.every((status) => status === 'interrupted') && stored.length > 0, 'AC-D the member\'s call read back from the node reads "Stopped" (phone after a reload; the node\'s activity status)'],
      ].filter(([ok]) => !ok).map(([, text]) => text);
      assert(failures.length === 0, failures.join('; '), details);
      return details;
    } finally {
      await context.close().catch(() => undefined);
    }
  });
};
