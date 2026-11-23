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
import path from 'node:path';
import { attachToBrowserContext } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';

const STOP = 'Stop generation';
const TOOLS = ['send_message_to', 'get_project_task', 'run_command', 'view_file'];

export const runStoppedCallTraceCases = async (probe) => {
  const { runCase, page, stack, alpha, browser, toList, openRow, menuOpen, shot, waitFor, sleep, assert, desktopRunsView, outputDir, selected } = probe;
  if (selected && !selected.has('MSP-102')) return;

  await runCase('MSP-102', async () => {
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
};
