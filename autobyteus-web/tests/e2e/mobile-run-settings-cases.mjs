// The readable phone conversation, Text size and Settings for a run's runtime and model (autobyteus-506, autobyteus-458).
// Cases of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` on its paired phone page
// (`--cases=MSP-66,MSP-60,MSP-74,MSP-61,MSP-62,MSP-63,MSP-64,MSP-65` runs only these). Every run here is the cases' own, on alpha, on the
// scripted Antigravity runtime (one model) and the scripted Grok Build runtime (`grok-4.7`). MSP-66 was MSP-59 before the merge
// with autobyteus-483, which took MSP-59 (`mobile-background-tasks-cases.mjs`); earlier 458 records name it MSP-59.
//
//   MSP-66 AC-001  A Team lead's conversation at 412 and 360 px: each turn's body is the width minus 24 px, starting 12 px
//                  from the left; one 22 px avatar and the speaker's name per turn; 17 px text with a 1.5 line height; the
//                  composer box 8 px above the screen's bottom. The mate's conversation: the lead's message to it keeps
//                  its arrow, and a tap on the arrow shows its `agent_message` line, as on the desktop (SR-004).
//   MSP-60 autobyteus-525 AC-001…004, autobyteus-534  The run list's ⋮ opens the menu headed "Text size" (no visible
//                  "On this phone") with Standard, Large, Largest; Large and Largest scale the run list at once (root
//                  16 × step/17 px) with the menu open; Esc closes it (focus back on ⋮); the conversation at 21 px; the
//                  run's ⋮ has no Text size; after a reload the step applies from the first screen; a saved Small starts
//                  at Standard; back to Standard. Screenshots of the menu and the run list at the three steps.
//   MSP-74 autobyteus-525 AC-005  Largest at 412 and 360 px: the run list, its menu, the connection sheet, the unpair
//                  confirmation, New run and its agent sheet, the conversation, the run's ⋮, Artifacts, Files, a code file
//                  (17 px), Messages, Activity, Settings, the setup page, a pairing link's page and "Connected to …": no
//                  sideways scroll, nothing past the edge, no text cut without an ellipsis; screenshots `MSP-74-*.png`. Also
//                  the screens the merged base added: a remote run's Settings (autobyteus-522) and a run idle with a
//                  background task, its row and run screen (autobyteus-448; a plain run of the stack, 150 s task).
//   MSP-61 AC-004  The stopped Team's lead: ⋮ → Settings shows "Stopped · in <Team>"; Runtime → Grok Build clears the model;
//                  Model → grok-4.7; Save returns to the conversation; the node holds the new selection; Settings again
//                  shows it; a message from the phone continues the run on it.
//   MSP-62 AC-005  A stopped agent: a change chosen, then the run is woken by a message (live on the node) before Save:
//                  Save is refused with the node's message in the red card; the screen stays; nothing changed on the node.
//   MSP-63 AC-006  A live idle agent: the red stop icon ("Stop run"), the rows and Save disabled; one tap stops it; the rows
//                  open; a change saves.
//   MSP-64 AC-006  A working agent (a turn held open): the stop icon; one tap stops it; the rows open.
//   MSP-65 REQ-008 A live Org member (the Org's planner, a run of the case's own): the stop icon; one tap stops the Org run;
//                  the phone stays on Settings with the rows open (no desktop route, no "Unsupported on phone"). Added by
//                  API/E2E (autobyteus-458 round 1, F-1).
import { randomUUID } from 'node:crypto';

/**
 * @param probe `runCase`, `page` (the paired phone), `stack`, `alpha`, `sel`, `toList`, `openRow`, `ensureUnfolded`,
 *   `rowsOf`, `childRow`, `menuOpen`, `runScreen`, `shot`, `sendOver`, `waitFor`, `sleep`, `assert`, `selected`, `phoneNet` (the
 *   phone's GraphQL operations, as the probe records them), `openPhone`, `pairingFor`, `phoneOrigin`.
 */
export const runRunSettingsCases = async (probe) => {
  const { runCase, page, stack, alpha, sel, toList, openRow, ensureUnfolded, rowsOf, childRow, menuOpen, runScreen, shot, sendOver, waitFor, sleep, assert, phoneNet,
    openPhone, pairingFor, phoneOrigin } = probe;
  const ids = ['MSP-66', 'MSP-60', 'MSP-74', 'MSP-61', 'MSP-62', 'MSP-63', 'MSP-64', 'MSP-65'];
  if (probe.selected && !ids.some(id => probe.selected.has(id))) return;

  const gql = (query, variables) => alpha.gql(query, variables);
  const createAgentRun = async () => {
    const r = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}',
      { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
    assert(r.success, r.message);
    return r.runId;
  };
  const terminateAgent = async (id) => (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id })).terminateAgentRun;
  const agentConfig = async (id) => (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive metadataConfig{runtimeKind llmModelIdentifier}}}', { id })).getAgentRunResumeConfig;
  const say = async (runId, content) => stack.agentSay(runId, content);
  const conversationHas = async (runId, marker) => (await stack.projection(runId)).includes(marker);

  // The cases' Team run: a lead and a mate on Antigravity, with a few turns and a message from the lead to its mate, then
  // stopped.
  const team = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: {
    teamDefinitionId: stack.ids.delivery, teamConfigs: [{ teamAddress: '/', ...stack.runConfig }],
    memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: stack.ids.checker, ...stack.runConfig },
      { memberAddress: '/mate', agentDefinitionId: stack.ids.writer, ...stack.runConfig }] } })).createAgentTeamRun;
  assert(team.success, team.message);
  const teamTree = JSON.stringify((await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: team.teamRunId })).getTeamRunResumeConfig.executionTree);
  const lead = /"address":"\/lead"[^}]*"agent_run_id":"([^"]+)"/.exec(teamTree)?.[1];
  const mate = /"address":"\/mate"[^}]*"agent_run_id":"([^"]+)"/.exec(teamTree)?.[1];
  const teamWs = stack.wsUrl(`agent-team/${team.teamRunId}`);
  const teamSay = (content) => sendOver(teamWs, { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`,
    context_file_paths: [], image_urls: [], agent_run_id: lead, content });
  const memberProjection = async (agentRunId) => JSON.stringify((await gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}',
    { id: team.teamRunId, a: agentRunId })).getTeamMemberRunProjection?.conversation ?? []);
  const leadProjection = () => memberProjection(lead);
  for (const marker of ['SETTINGS-458-ONE', 'SETTINGS-458-TWO']) {
    await teamSay(`${marker} Please summarize the plan in two short paragraphs for the readable phone conversation.`);
    await waitFor(`the lead has ${marker}`, async () => (await leadProjection()).includes(marker), 60_000);
    await sleep(1_500);
  }
  await teamSay(`CALL_TOOL:${JSON.stringify({ name: 'send_message_to', arguments: { recipient_address: '/mate', content: 'SETTINGS-458-NOTE Read the plan first.' } })}`);
  await waitFor('the mate has the lead\'s message', async () => (await memberProjection(mate)).includes('SETTINGS-458-NOTE'), 60_000);
  await sleep(1_500);
  const teamConfig = async () => (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive executionTree}}', { id: team.teamRunId })).getTeamRunResumeConfig;
  const leadSelection = async () => {
    const tree = (await teamConfig()).executionTree;
    const member = (tree.root_team?.members ?? []).find((entry) => entry.address === '/lead');
    return member ? { runtimeKind: member.launch_configuration.runtime_kind, model: member.launch_configuration.llm_model_identifier } : null;
  };

  /** The run list; when the phone cannot get there, what it shows instead (a screenshot and the screen's state). */
  const backToList = async () => {
    try {
      await toList(page);
    } catch (error) {
      await shot(page, `MSP-run-settings-no-list-${Date.now()}`);
      const shows = await page.evaluate(() => ({ url: location.pathname + location.search.replace(/pairing=[^&]+/, 'pairing=…'),
        visible: [...document.querySelectorAll('[data-testid]')].filter((el) => el.getBoundingClientRect().width > 0).map((el) => el.getAttribute('data-testid')).slice(0, 40) }));
      throw Object.assign(new Error(`back to the run list: ${error.message.split('\n')[0]}`), { details: { shows, runScreen: await runScreen(page) } });
    }
  };
  /** A member of the cases' Team run, by its row under the Team (the Team row itself opens its last open member). */
  const teamKey = `team:${team.teamRunId}`;
  const openMember = async (name) => {
    await backToList();
    await waitFor('the Team run on the phone', async () => (await page.locator(sel(`mobile-run-row-${teamKey}`)).count()) > 0, 30_000);
    await ensureUnfolded(page, teamKey);
    // The Team's members are listed once its tree is read (after a fresh start, a moment after the row unfolds).
    let key = null;
    await waitFor(`the ${name}'s row under the Team run`, async () => Boolean(key = childRow(await rowsOf(page), teamKey, name, 1)?.key), 20_000).catch(() => undefined);
    assert(key, `the ${name}'s row under the Team run`, await rowsOf(page));
    await openRow(page, key);
    await page.locator(sel('mobile-run-conversation')).waitFor({ timeout: 20_000 });
  };
  const openTeam = () => openMember('lead');
  const openAgent = async (runId) => {
    await backToList();
    await waitFor(`run ${runId} on the phone`, async () => (await page.locator(sel(`mobile-run-row-agent:${runId}`)).count()) > 0, 30_000);
    await openRow(page, `agent:${runId}`);
    await page.locator(sel('mobile-run-conversation')).waitFor({ timeout: 20_000 });
  };
  const layout = () => page.evaluate(() => {
    const monitor = document.querySelector('[data-testid="mobile-run-conversation"]');
    const feed = monitor?.querySelector('.conv-feed');
    const visible = (element) => element && getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().width > 0;
    const rows = [...(monitor?.querySelectorAll('.conv-row') ?? [])].filter((row) => row.querySelector('.conv-body'));
    const box = monitor?.querySelector('textarea')?.closest('.rounded-xl.border-gray-200')?.getBoundingClientRect();
    const feedStyle = feed ? getComputedStyle(feed) : null;
    return {
      width: innerWidth, height: innerHeight, phone: monitor?.classList.contains('phone-conversation') ?? false,
      textSize: document.documentElement.getAttribute('data-phone-text-size'),
      fontSize: feedStyle ? parseFloat(feedStyle.fontSize) : null, lineHeight: feedStyle ? parseFloat(feedStyle.lineHeight) : null,
      bodies: rows.map((row) => { const r = row.querySelector('.conv-body').getBoundingClientRect(); return { left: Math.round(r.left), width: Math.round(r.width), speaker: row.getAttribute('data-speaker') }; }),
      speakers: rows.flatMap((row) => [...row.querySelectorAll('.conv-speaker')].filter(visible).map((s) => s.textContent.trim())),
      avatars: rows.flatMap((row) => [...row.querySelectorAll('.conv-avatar')].filter(visible).map((a) => Math.round(a.getBoundingClientRect().width))),
      composerGap: box ? Math.round(innerHeight - box.bottom) : null,
    };
  });
  const settings = page.locator(sel('mobile-run-settings'));
  const settingsState = () => page.evaluate(() => {
    const root = document.querySelector('[data-testid="mobile-run-settings"]');
    const text = (id) => root?.querySelector(`[data-testid="${id}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
    const stop = root?.querySelector('[data-testid="mobile-run-settings-stop"]');
    return {
      open: Boolean(root), subject: text('mobile-run-settings-subject'), status: text('mobile-run-settings-status'),
      runtime: text('mobile-run-runtime-select-value'), model: text('mobile-run-model-select-value'),
      runtimeDisabled: root?.querySelector('[data-testid="mobile-run-runtime-select-toggle"]')?.disabled ?? null,
      saveDisabled: root?.querySelector('[data-testid="mobile-run-settings-save"]')?.disabled ?? null,
      stop: stop ? { label: stop.getAttribute('aria-label'), title: stop.getAttribute('title'), text: stop.textContent.trim() } : null,
      error: text('mobile-run-settings-error'),
    };
  });
  const openSettings = async () => {
    await menuOpen(page, 'settings');
    await settings.waitFor({ timeout: 20_000 });
    // The rows load the node's runtimes when they open; the saved runtime's name shows once they are in.
    await waitFor('the run\'s settings loaded', async () => { const state = await settingsState(); return Boolean(state.model) && state.runtime !== 'Choose'; }, 30_000).catch(() => undefined);
  };
  const choose = async (row, labelPattern) => {
    await page.locator(sel(`mobile-run-${row}-select-toggle`)).click();
    const sheet = page.locator(sel(`mobile-run-${row}-select-sheet`));
    await sheet.waitFor({ timeout: 10_000 });
    const option = sheet.locator(sel(`mobile-run-${row}-select-option`)).filter({ hasText: labelPattern }).first();
    await option.waitFor({ timeout: 20_000 });
    await option.click();
    await sheet.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined);
  };

  await runCase('MSP-66', async () => {
    await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: team.teamRunId });
    const facts = {};
    for (const [width, height] of [[412, 915], [360, 780]]) {
      await page.setViewportSize({ width, height });
      await openTeam();
      await sleep(800);
      facts[width] = await layout();
      await shot(page, `MSP-66-conversation-${width}`);
    }
    // Another agent's message, on the mate (at 412 px): the desktop's segment, arrow and type line kept (SR-004).
    await page.setViewportSize({ width: 412, height: 915 });
    await openMember('mate');
    const message = page.locator(`${sel('mobile-run-conversation')} .inter-agent-message`).filter({ hasText: 'SETTINGS-458-NOTE' }).first();
    await message.waitFor({ timeout: 20_000 });
    const toggle = message.locator(sel('inter-agent-toggle'));
    const arrow = { visible: await toggle.isVisible(), box: await toggle.boundingBox() };
    const typeLineBefore = await message.locator(sel('inter-agent-details')).count();
    await toggle.click();
    const typeLine = (await message.locator(sel('inter-agent-details')).textContent({ timeout: 5_000 }).catch(() => null))?.trim() ?? null;
    const messageBox = await message.boundingBox();
    await shot(page, 'MSP-66-inter-agent-412');
    facts.interAgent = { arrow, typeLineBefore, typeLine, messageBox };
    await page.setViewportSize({ width: 390, height: 844 });
    const details = facts;
    assert(arrow.visible && arrow.box && arrow.box.x + arrow.box.width <= 412 - 12 + 1, 'SR-004 another agent\'s message keeps its arrow on the phone', details);
    assert(typeLineBefore === 0 && /agent_message/.test(typeLine ?? ''), 'SR-004 a tap on the arrow shows its agent_message line, as on the desktop', details);
    assert(messageBox && messageBox.x >= 12 - 1 && messageBox.x + messageBox.width <= 412 - 12 + 1, 'SR-004 the message inside the full-width column', details);
    for (const width of [412, 360]) {
      const at = facts[width];
      assert(at.phone && at.textSize === 'standard', `the phone layout at ${width} px`, details);
      assert(at.bodies.length >= 2 && at.bodies.every((body) => body.left === 12 && Math.abs(body.width - (width - 24)) <= 1), `AC-001 every turn's text is ${width - 24} px wide from 12 px`, details);
      assert(at.fontSize === 17 && Math.abs(at.lineHeight - 25.5) <= 0.5, 'AC-001 17 px text with a 1.5 line height', details);
      assert(at.avatars.length >= 1 && at.avatars.every((size) => size === 22) && at.speakers.length === at.avatars.length, 'AC-001 one 22 px avatar and the speaker\'s name per turn', details);
      assert(at.composerGap === 8, 'REQ-004 the composer box 8 px above the bottom', details);
    }
    return details;
  });

  // The phone's Text size on the run list (autobyteus-525): the root font size, a run name and the conversation, read at once.
  const sizes = () => page.evaluate(() => {
    const px = (element) => (element ? parseFloat(getComputedStyle(element).fontSize) : null);
    const feed = document.querySelector('[data-testid="mobile-run-conversation"] .conv-feed');
    const name = [...document.querySelectorAll('[data-testid="mobile-run-tree"] [data-testid="mobile-run-name"]')].find((element) => element.getBoundingClientRect().width > 0);
    return { step: document.documentElement.getAttribute('data-phone-text-size'), root: px(document.documentElement), runName: px(name), feed: px(feed),
      menuOpen: Boolean(document.querySelector('[data-testid="mobile-on-this-phone-menu"]')),
      pressed: document.querySelector('[data-testid="mobile-text-size"] [aria-pressed="true"]')?.getAttribute('data-testid') ?? null };
  });
  const homeMenu = async () => {
    if (!(await page.locator(sel('mobile-on-this-phone-menu')).count())) await page.locator(sel('mobile-on-this-phone-button')).click();
    await page.locator(sel('mobile-on-this-phone-menu')).waitFor({ timeout: 10_000 });
  };
  const closeHomeMenu = async () => {
    await page.keyboard.press('Escape');
    await page.locator(sel('mobile-on-this-phone-menu')).waitFor({ state: 'detached', timeout: 5_000 }).catch(() => undefined);
    if (await page.locator(sel('mobile-on-this-phone-menu')).count()) await page.mouse.click(5, 400);
  };
  /** The step chosen on the run list's "On this phone" menu; the menu is closed afterwards. */
  const chooseTextSize = async (step) => {
    await backToList();
    await homeMenu();
    await page.locator(sel(`mobile-text-size-${step}`)).click();
    await closeHomeMenu();
  };

  await runCase('MSP-60', async () => {
    // autobyteus-525 AC-001, AC-003, AC-004 and autobyteus-534 REQ-001…003: the run list's ⋮ opens the menu headed "Text
    // size" (no visible "On this phone") with three steps; each step scales the run list at once (root 16 × step/17 px)
    // with the menu still open; Esc closes it, the focus back on ⋮; the conversation is the step's px; the run's ⋮ has no
    // Text size (AC-002); the step is applied from the first screen after a reload; a phone that saved Small starts at
    // Standard.
    await backToList();
    const before = await sizes();
    await shot(page, 'MSP-60-list-standard');
    await homeMenu();
    const menuShape = () => page.evaluate(() => {
      const menu = document.querySelector('[data-testid="mobile-on-this-phone-menu"]');
      return { label: menu?.getAttribute('aria-label') ?? null, title: Boolean(document.querySelector('[data-testid="mobile-on-this-phone-title"]')),
        visibleText: menu?.innerText.replace(/\bA\b/g, '').replace(/\s+/g, ' ').trim() ?? null,
        header: menu?.querySelector('[data-testid="mobile-text-size-header"]')?.textContent?.trim() ?? null,
        group: menu?.querySelector('[data-testid="mobile-text-size"]')?.getAttribute('aria-label') ?? null,
        steps: [...(menu?.querySelectorAll('[data-testid="mobile-text-size"] button') ?? [])].map((button) => button.getAttribute('data-testid')) };
    });
    const menu = await menuShape();
    await shot(page, 'MSP-60-menu-standard');
    const steps = {};
    let focusBack = null;
    for (const step of ['large', 'largest']) {
      await homeMenu();
      await page.locator(sel(`mobile-text-size-${step}`)).click();
      steps[step] = await sizes(); // the run list behind the open menu, at once
      await shot(page, `MSP-60-menu-${step}`);
      await page.keyboard.press('Escape');
      await page.locator(sel('mobile-on-this-phone-menu')).waitFor({ state: 'detached', timeout: 5_000 }).catch(() => undefined);
      focusBack ??= await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);
      await shot(page, `MSP-60-list-${step}`);
    }
    await openTeam();
    await sleep(500);
    const conversation = await sizes();
    await menuOpen(page);
    const runMenu = await page.evaluate(() => ({ entries: [...document.querySelectorAll('[data-testid="mobile-run-menu"] [role="menuitem"]')].map((item) => item.textContent.trim()),
      textSize: document.querySelectorAll('[data-testid="mobile-run-menu"] [data-testid^="mobile-text-size"]').length }));
    await shot(page, 'MSP-60-run-menu-largest');
    await page.keyboard.press('Escape');
    // QR-001: the root size when the first phone screen appears after a reload (recorded by a script that runs before the app).
    await page.addInitScript(() => {
      const record = () => {
        if (window.__firstScreenRoot || !document.querySelector('[data-testid="mobile-run-list"], [data-testid="mobile-run-screen"], [data-testid="mobile-pairing-bootstrap"]')) return;
        window.__firstScreenRoot = { root: getComputedStyle(document.documentElement).fontSize, step: document.documentElement.getAttribute('data-phone-text-size') };
      };
      new MutationObserver(record).observe(document, { childList: true, subtree: true });
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator(sel('mobile-run-conversation')).waitFor({ timeout: 60_000 });
    await sleep(500);
    const afterReload = { ...(await sizes()), firstScreen: await page.evaluate(() => window.__firstScreenRoot ?? null) };
    // A fresh start on the run list: after a reload on a run screen, ← goes to the entry before it, here the pairing link,
    // which pairs again (existing behaviour, recorded as a follow-up of autobyteus-458).
    await page.goto(new URL('/mobile/', page.url()).href, { waitUntil: 'domcontentloaded' });
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 60_000 });
    await homeMenu();
    const reopened = await sizes();
    await closeHomeMenu();
    // autobyteus-534 REQ-003: a phone that saved Small (beta.10) starts at Standard; the stored value is left as it is.
    await page.evaluate(() => window.localStorage.setItem('autobyteus.phone.textSize', 'small'));
    await page.goto(new URL('/mobile/', page.url()).href, { waitUntil: 'domcontentloaded' });
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 60_000 });
    await sleep(500);
    const savedSmall = { ...(await sizes()), firstScreen: await page.evaluate(() => window.__firstScreenRoot ?? null),
      stored: await page.evaluate(() => window.localStorage.getItem('autobyteus.phone.textSize')) };
    await shot(page, 'MSP-60-list-saved-small');
    await homeMenu();
    const savedSmallMenu = await sizes();
    await page.locator(sel('mobile-text-size-standard')).click();
    const standard = { ...(await sizes()), stored: await page.evaluate(() => window.localStorage.getItem('autobyteus.phone.textSize')) };
    await closeHomeMenu();
    const details = { before, menu, steps, focusBack, conversation, runMenu, afterReload, reopened, savedSmall, savedSmallMenu, standard };
    const near = (value, expected) => value !== null && Math.abs(value - expected) <= 0.05;
    assert(before.step === 'standard' && near(before.root, 16) && near(before.runName, 15), 'AC-006 Standard: root 16 px, run name 15 px, as before', details);
    assert(menu.label === 'On this phone' && !menu.title && menu.visibleText === 'Text size' && menu.header === 'Text size' && menu.group === 'Text size',
      '534 REQ-002 the menu shows only the "Text size" header; "On this phone" is its accessible name only', details);
    assert(JSON.stringify(menu.steps) === JSON.stringify(['mobile-text-size-standard', 'mobile-text-size-large', 'mobile-text-size-largest']),
      '534 REQ-001 three steps: Standard, Large, Largest', details);
    assert(['large', 'largest'].every((step) => steps[step].step === step && steps[step].menuOpen && steps[step].pressed === `mobile-text-size-${step}`),
      'AC-001 each step applies at once with the menu still open, the step marked', details);
    assert(near(steps.large.root, 16 * 19 / 17) && near(steps.largest.root, 16 * 21 / 17), 'AC-003 the root is 16 × step/17 px', details);
    assert(near(steps.large.runName, 15 * 19 / 17) && near(steps.largest.runName, 15 * 21 / 17), 'AC-003 the run list scales with the step', details);
    assert(focusBack === 'mobile-on-this-phone-button', 'AC-001 Esc closes the menu and the focus goes back to ⋮', details);
    assert(near(conversation.feed, 21), 'AC-003 the conversation is 21 px at Largest', details);
    assert(runMenu.textSize === 0 && runMenu.entries.length > 0 && !runMenu.entries.includes('Text size'), 'AC-002 the run\'s ⋮ has no Text size', details);
    assert(afterReload.step === 'largest' && near(afterReload.feed, 21) && afterReload.firstScreen?.step === 'largest' && near(parseFloat(afterReload.firstScreen.root), 16 * 21 / 17),
      'AC-004, QR-001 the step survives a reload and applies from the first screen', details);
    assert(reopened.pressed === 'mobile-text-size-largest', 'AC-004 the kept step is marked', details);
    assert(savedSmall.step === 'standard' && near(savedSmall.root, 16) && savedSmall.firstScreen?.step === 'standard' && savedSmall.stored === 'small'
      && savedSmallMenu.pressed === 'mobile-text-size-standard', '534 REQ-003 a saved Small starts at Standard from the first screen, Standard marked, storage untouched', details);
    assert(standard.step === 'standard' && near(standard.root, 16) && standard.stored === 'standard', 'back to Standard', details);
    return details;
  });

  // autobyteus-525 AC-005, REQ-007: what a phone screen shows past its width. Sideways scroll of the document; elements
  // past the screen's edge (outside a box that scrolls sideways by design: code, tables, file content; an element parked
  // wholly left of the screen is hidden on purpose); text cut off without an ellipsis (a 1 px screen-reader-only label
  // is not shown text).
  const fit = (target) => target.evaluate(() => {
    const width = innerWidth;
    const shown = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const scrollsSideways = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true; } return false; };
    const name = (el) => `${el.tagName.toLowerCase()}${el.getAttribute('data-testid') ? `[${el.getAttribute('data-testid')}]` : ''} "${(el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`;
    const past = []; const cut = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!shown(el) || el.closest('svg') || el.closest('[data-testid="mobile-node-desktop-picture"]') || el.closest('.monaco-editor')) continue;
      const r = el.getBoundingClientRect();
      if ((r.right > width + 1 || r.left < -1) && r.right > 0 && !scrollsSideways(el)) past.push(`${name(el)} ${Math.round(r.left)}…${Math.round(r.right)}`);
      const s = getComputedStyle(el);
      const ownText = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim());
      if (ownText && el.clientWidth > 1 && el.scrollWidth > el.clientWidth + 1 && s.overflowX === 'hidden' && s.textOverflow !== 'ellipsis') cut.push(`${name(el)} ${el.scrollWidth}>${el.clientWidth}`);
    }
    const de = document.documentElement;
    return { sideways: de.scrollWidth > de.clientWidth, past: past.slice(0, 12), cut: cut.slice(0, 12) };
  });
  const clean = (result) => !result.sideways && result.past.length === 0 && result.cut.length === 0;

  await runCase('MSP-74', async () => {
    // autobyteus-525 AC-005: every phone screen at Largest, 412 and 360 px wide: screenshots for review and the fit check.
    // Not covered here: VNC Viewer (alpha has no node desktop; its controls are rem like every phone screen).
    await chooseTextSize('largest');
    const screens = {};
    const record = async (target, key) => {
      await sleep(400);
      screens[key] = await fit(target);
      await shot(target, `MSP-74-${key}`);
    };
    // The topmost screen's ←: an opened file's bar lies over the Files screen's bar.
    const back = async () => { await page.locator(`${sel('mobile-screen-back')}:visible`).last().click(); await sleep(400); };
    let monaco = null;
    let cleanup = null;
    try {
      for (const [width, height] of [[412, 915], [360, 780]]) {
        await page.setViewportSize({ width, height });
        await backToList();
        await record(page, `${width}-run-list`);
        await homeMenu();
        await record(page, `${width}-on-this-phone-menu`);
        await closeHomeMenu();
        await page.locator(sel('mobile-node-button')).click();
        await page.locator(sel('mobile-connection-sheet')).waitFor({ timeout: 10_000 });
        await record(page, `${width}-connection-sheet`);
        await page.locator(sel('mobile-unpair')).click();
        await page.locator(sel('mobile-unpair-confirm')).waitFor({ timeout: 10_000 });
        await record(page, `${width}-unpair-confirm`);
        await page.locator(sel('mobile-unpair-confirm')).getByRole('button', { name: 'Cancel', exact: true }).click();
        if (await page.locator(sel('mobile-connection-sheet')).count()) await page.locator(sel('mobile-sheet-close')).first().click();
        await page.locator(sel('mobile-connection-sheet')).waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined);
        await page.locator(sel('mobile-new-run-button')).click();
        await page.locator(sel('mobile-new-run')).waitFor({ timeout: 10_000 });
        await sleep(800);
        await record(page, `${width}-new-run`);
        await page.locator(sel('mobile-run-target-select-toggle')).click();
        await page.locator(sel('mobile-run-target-select-sheet')).waitFor({ timeout: 10_000 });
        await record(page, `${width}-new-run-agent-sheet`);
        await page.locator(`${sel('mobile-run-target-select-sheet')} ${sel('mobile-sheet-close')}`).click();
        await page.locator(sel('mobile-run-target-select-sheet')).waitFor({ state: 'detached', timeout: 10_000 });
        await page.locator(sel('mobile-new-run-close')).click();
        await page.locator(sel('mobile-new-run')).waitFor({ state: 'detached', timeout: 10_000 });
        await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 10_000 });
        await openTeam();
        await sleep(600);
        await record(page, `${width}-conversation`);
        await menuOpen(page);
        await record(page, `${width}-run-menu`);
        await page.keyboard.press('Escape');
        for (const [view, root] of [['artifacts', 'mobile-artifacts'], ['files', 'mobile-files'], ['messages', 'mobile-messages'], ['activity', 'mobile-activity'], ['settings', 'mobile-run-settings']]) {
          await menuOpen(page, view);
          await page.locator(sel(root)).waitFor({ timeout: 20_000 });
          await sleep(800);
          await record(page, `${width}-${view}`);
          if (view === 'files') {
            await page.locator(sel('mobile-files-row')).filter({ hasText: 'src' }).first().click();
            await page.locator(sel('mobile-files-row')).filter({ hasText: 'app.ts' }).first().click();
            await page.locator(`${sel('mobile-file-viewer')} .monaco-editor .view-line`).first().waitFor({ timeout: 30_000 });
            await record(page, `${width}-file-viewer`);
            monaco ??= await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-testid="mobile-file-viewer"] .monaco-editor .view-line')).fontSize));
            await back();
            if (!(await page.locator(`${sel('mobile-files')}:visible`).count())) await back();
          }
          await back();
          await page.locator(`${sel('mobile-run-conversation')}:visible`).waitFor({ timeout: 10_000 }).catch(() => undefined);
        }
        // The setup screens on a phone that is not paired, at Largest: the page that asks for a pairing link, the pairing
        // link's page and "Connected to …" right after the tap.
        const unpaired = await openPhone({ width, height, label: `phone-largest-${width}` });
        await unpaired.context.addInitScript(() => window.localStorage.setItem('autobyteus.phone.textSize', 'largest'));
        await unpaired.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await unpaired.page.locator(sel('mobile-pairing-bootstrap')).waitFor({ timeout: 60_000 });
        await record(unpaired.page, `${width}-setup`);
        await unpaired.page.goto(await pairingFor(phoneOrigin()), { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await unpaired.page.locator(sel('mobile-pair-button')).waitFor({ timeout: 60_000 });
        await record(unpaired.page, `${width}-pairing-link`);
        await unpaired.page.locator(sel('mobile-pair-button')).click();
        await unpaired.page.locator(sel('mobile-post-pair-checking')).waitFor({ timeout: 30_000 }).catch(() => undefined);
        if (await unpaired.page.locator(sel('mobile-post-pair-checking')).count()) await record(unpaired.page, `${width}-connected-to`);
        await unpaired.context.close();
      }
      // The screens the merged base added (autobyteus-522, autobyteus-448), at Largest, 412 and 360 px: the Settings of a run
      // on another node (the sentence naming its node, MSP-72's run) and a run idle with a background task (its row and its
      // run screen say "Background task running"; a plain run of the stack, not MSP-73's).
      const ptmKey = `agent:${stack.ptm}`;
      const showOlder = async () => {
        const fold = page.locator(sel('mobile-run-list-show-older'));
        if ((await fold.count()) && (await fold.innerText()).startsWith('Show older')) await fold.click();
      };
      const backgroundKey = `agent:${stack.plain[2]}`;
      await page.setViewportSize({ width: 412, height: 915 });
      await backToList();
      await showOlder();
      await openRow(page, backgroundKey);
      const box = page.locator(`${sel('mobile-run-conversation')} textarea`).last();
      const send = page.locator(`${sel('mobile-run-conversation')} button[aria-label="Send message"]`).last();
      await waitFor('Send enabled', async () => {
        if (!(await box.inputValue().catch(() => ''))) await box.fill('Start the docs server. BACKGROUND_STEP:{"seconds":150,"exitCode":0}').catch(() => undefined);
        return (await send.count()) > 0 && await send.isEnabled();
      }, 20_000);
      await send.click();
      await waitFor('the run screen says Background task running', async () => (await runScreen(page)).subtitle === 'Background task running', 45_000);
      for (const [width, height] of [[412, 915], [360, 780]]) {
        await page.setViewportSize({ width, height });
        await backToList();
        await showOlder();
        await page.locator(`${sel(`mobile-run-row-${backgroundKey}`)} [data-status="background"]`).waitFor({ timeout: 20_000 });
        await page.locator(sel(`mobile-run-row-${backgroundKey}`)).scrollIntoViewIfNeeded();
        await record(page, `${width}-background-row`);
        await openRow(page, backgroundKey);
        await record(page, `${width}-background-run-screen`);
        await backToList();
        await ensureUnfolded(page, ptmKey);
        const publisher = childRow(await rowsOf(page), ptmKey, 'publisher', 1);
        assert(publisher, 'the PTM\'s publisher row (a run on beta)', await rowsOf(page));
        await openRow(page, publisher.key);
        await menuOpen(page, 'settings');
        await page.locator(sel('mobile-run-settings-remote')).waitFor({ timeout: 20_000 });
        await record(page, `${width}-remote-run-settings`);
        await back();
      }
    } finally {
      await page.setViewportSize({ width: 390, height: 844 });
      await chooseTextSize('standard').catch((error) => { cleanup = error.message.split('\n')[0]; });
    }
    const details = { monacoPx: monaco, cleanup, screens };
    const unclean = Object.entries(screens).filter(([, result]) => !clean(result)).map(([key]) => key);
    assert(Object.keys(screens).length >= 36, 'AC-005 every listed phone screen was reached at both widths', details);
    assert(unclean.length === 0, `AC-005 at Largest no sideways scroll, nothing past the edge, no text cut without an ellipsis: ${unclean.join(', ')}`, details);
    assert(monaco === 17, 'REQ-006 the file viewer\'s code text is 17 px at Largest', details);
    assert(cleanup === null, 'back to Standard after the sweep', details);
    return details;
  });

  await runCase('MSP-61', async () => {
    const before = await leadSelection();
    await openTeam();
    await openSettings();
    const opened = await settingsState();
    await shot(page, 'MSP-61-settings-stopped');
    await choose('runtime', /Grok/i);
    await sleep(500);
    const runtimeChanged = await settingsState();
    await choose('model', /grok/i);
    await sleep(300);
    const modelChosen = await settingsState();
    await shot(page, 'MSP-61-settings-changed');
    await page.locator(sel('mobile-run-settings-save')).click();
    await waitFor('back in the conversation', async () => (await settings.count()) === 0 && (await runScreen(page)).state === 'open', 20_000);
    const after = await leadSelection();
    await openSettings();
    const reopened = await settingsState();
    await page.goBack();
    // "continue" from the phone composer: the run continues on the new runtime.
    await waitFor('the conversation', async () => (await settings.count()) === 0, 10_000);
    const composer = page.locator(`${sel('mobile-run-conversation')} textarea`).first();
    await composer.fill('continue SETTINGS-458-CONTINUE');
    await composer.press('Enter');
    await waitFor('the Team run continues', async () => (await teamConfig()).isActive === true, 60_000).catch(() => undefined);
    const continued = { active: (await teamConfig()).isActive, lead: await leadSelection() };
    await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: team.teamRunId }).catch(() => undefined);
    const details = { before, opened, runtimeChanged, modelChosen, after, reopened, continued };
    assert(opened.subject?.startsWith('lead') && opened.status === 'Stopped · in Delivery Team' && !opened.stop && opened.saveDisabled === true, 'REQ-005 the stopped member: its name and status line, no stop icon, Save disabled', details);
    assert(opened.runtime === 'Antigravity CLI' && /gemini/i.test(opened.model ?? ''), 'REQ-005 the member\'s saved runtime and model', details);
    assert(/Grok/i.test(runtimeChanged.runtime ?? '') && runtimeChanged.model === 'Choose' && runtimeChanged.saveDisabled === true, 'REQ-006 another runtime clears the model; Save waits for a model', details);
    assert(modelChosen.saveDisabled === false, 'REQ-006 a changed selection with a model: Save enabled', details);
    assert(after?.runtimeKind === 'grok_build' && /grok/i.test(after?.model ?? ''), 'AC-004 the node holds the new runtime and model', details);
    assert(/Grok/i.test(reopened.runtime ?? '') && /grok/i.test(reopened.model ?? ''), 'AC-004 Settings again shows the new values', details);
    assert(continued.active && continued.lead?.runtimeKind === 'grok_build', 'AC-004 the run continues on the new runtime', details);
    return details;
  });

  await runCase('MSP-62', async () => {
    const runId = await createAgentRun();
    await say(runId, 'SETTINGS-458-REFUSE first turn.');
    await waitFor('the first turn', async () => conversationHas(runId, 'SETTINGS-458-REFUSE'), 60_000);
    await sleep(1_500);
    await terminateAgent(runId);
    const before = await agentConfig(runId);
    await openAgent(runId);
    await openSettings();
    await choose('runtime', /Grok/i);
    await choose('model', /grok/i);
    // The run is woken on the node (a message from another client) before Save: the node now refuses the change.
    await say(runId, 'SETTINGS-458-WAKE HOLD_TURN');
    await waitFor('the run live on the node', async () => (await agentConfig(runId)).isActive === true, 60_000);
    await page.locator(sel('mobile-run-settings-save')).click();
    await waitFor('the refusal card', async () => Boolean((await settingsState()).error), 20_000).catch(() => undefined);
    const refused = await settingsState();
    await shot(page, 'MSP-62-settings-refused');
    const after = await agentConfig(runId);
    await page.goBack();
    await terminateAgent(runId).catch(() => undefined);
    const details = { before: before.metadataConfig?.runtimeKind, refused, after: after.metadataConfig?.runtimeKind };
    assert(refused.open && refused.error && refused.error.length > 0, 'AC-005 a refused Save shows the node\'s message; the screen stays', details);
    assert(after.metadataConfig?.runtimeKind === before.metadataConfig?.runtimeKind, 'AC-005 nothing changed on the node', details);
    return details;
  });

  const liveCase = (id, message, label) => runCase(id, async () => {
    const runId = await createAgentRun();
    await say(runId, message);
    await waitFor('the run live on the node', async () => (await agentConfig(runId)).isActive === true, 60_000);
    await openAgent(runId);
    await openSettings();
    await waitFor('the stop icon', async () => Boolean((await settingsState()).stop), 20_000).catch(() => undefined);
    const live = await settingsState();
    await shot(page, `${id}-settings-${label}`);
    const consoleLines = [];
    const onConsole = (entry) => { if (['warning', 'error'].includes(entry.type())) consoleLines.push(`${entry.type()}: ${entry.text().slice(0, 300)}`); };
    page.on('console', onConsole);
    const stopAt = Date.now();
    await page.locator(sel('mobile-run-settings-stop')).click();
    await waitFor('the run stopped and the rows open', async () => { const s = await settingsState(); return !s.stop && s.runtimeDisabled === false; }, 60_000).catch(() => undefined);
    const stopped = await settingsState();
    const nodeAfterStop = (await agentConfig(runId)).isActive;
    await shot(page, `${id}-settings-after-stop`);
    let saved = null;
    if (id === 'MSP-63' && stopped.runtimeDisabled === false) {
      await choose('runtime', /Grok/i);
      await choose('model', /grok/i);
      await page.locator(sel('mobile-run-settings-save')).click();
      await waitFor('back in the conversation', async () => (await settings.count()) === 0, 20_000).catch(() => undefined);
      saved = { left: (await settings.count()) === 0, runtimeKind: (await agentConfig(runId)).metadataConfig?.runtimeKind };
    } else {
      await page.goBack();
    }
    // The phone's reads after the tap, in order (sent and answered, ms after the tap): the run is read again after the stop.
    const afterStop = phoneNet.filter((entry) => entry.label === 'phone' && entry.sentAt >= stopAt && entry.sentAt <= stopAt + 15_000)
      .map((entry) => `${entry.op} sent+${entry.sentAt - stopAt} done+${entry.at - stopAt} ${entry.status}`);
    page.off('console', onConsole);
    const details = { runId, live, stopped, nodeAfterStop, saved, afterStop, consoleLines };
    assert(live.stop?.label === 'Stop run' && live.stop.title === 'Stop run' && live.stop.text === '', `AC-006 the ${label} run: the red stop icon, named Stop run, no text`, details);
    assert(live.runtimeDisabled === true && live.saveDisabled === true, `AC-006 the ${label} run: rows and Save disabled`, details);
    assert(nodeAfterStop === false && !stopped.stop && stopped.runtimeDisabled === false, 'AC-006 one tap stops the run; the rows open', details);
    if (saved) assert(saved.left && saved.runtimeKind === 'grok_build', 'AC-006 after the stop a change saves', details);
    return details;
  });
  await liveCase('MSP-63', 'SETTINGS-458-IDLE a short answer, please.', 'idle');
  await liveCase('MSP-64', 'SETTINGS-458-WORK HOLD_TURN', 'working');

  await runCase('MSP-65', async () => {
    // The case's own Delivery Org run (the stack's Org runs serve later cases), its planner woken to a held turn.
    const created = (await gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
      { i: { agentOrgDefinitionId: stack.ids.org, rootConfiguration: stack.runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    assert(created.success, created.message);
    const orgRunId = created.agentOrgRunId;
    const orgConfig = async () => (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){isActive executionTree}}', { id: orgRunId })).getAgentOrgRunConfig;
    const planner = (await orgConfig()).executionTree.rootOrg.members.find((member) => member.address === '/planner')?.agentRunId;
    assert(planner, 'the Org\'s planner');
    await sendOver(stack.wsUrl(`agent-org/${orgRunId}`), { root_subject_kind: 'agent_org', root_run_id: orgRunId, target_agent_run_id: planner,
      command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content: 'SETTINGS-458-ORG HOLD_TURN', context_file_paths: [], image_urls: [] });
    await waitFor('the Org run live on the node', async () => (await orgConfig()).isActive === true, 60_000);
    const orgKey = `org:${orgRunId}`;
    await backToList();
    await waitFor('the Org run on the phone', async () => (await page.locator(sel(`mobile-run-row-${orgKey}`)).count()) > 0, 30_000);
    await ensureUnfolded(page, orgKey);
    let key = null;
    await waitFor('the planner\'s row under the Org run', async () => Boolean(key = childRow(await rowsOf(page), orgKey, 'planner', 1)?.key), 20_000).catch(() => undefined);
    assert(key, 'the planner\'s row under the Org run', await rowsOf(page));
    await openRow(page, key);
    await page.locator(sel('mobile-run-conversation')).waitFor({ timeout: 20_000 });
    await openSettings();
    await waitFor('the stop icon', async () => Boolean((await settingsState()).stop), 20_000).catch(() => undefined);
    const live = await settingsState();
    await shot(page, 'MSP-65-settings-org-member-live');
    await page.locator(sel('mobile-run-settings-stop')).click();
    await waitFor('the Org run stopped on the node', async () => (await orgConfig()).isActive === false, 60_000).catch(() => undefined);
    await waitFor('the rows open', async () => { const s = await settingsState(); return !s.stop && s.runtimeDisabled === false; }, 20_000).catch(() => undefined);
    const stopped = await settingsState();
    const url = page.url().replace(/pairing=[^&]+/, 'pairing=…');
    const nodeAfterStop = (await orgConfig()).isActive;
    await shot(page, 'MSP-65-settings-org-member-after-stop');
    if (stopped.open) await page.goBack();
    const details = { orgRunId, live, stopped, url: new URL(url).pathname + new URL(url).search, nodeAfterStop };
    assert(live.stop?.label === 'Stop run' && live.subject?.startsWith('planner') && /in Delivery Org$/.test(live.status ?? ''), 'REQ-008 the live Org member: the stop icon', details);
    assert(nodeAfterStop === false, 'REQ-008 one tap stops the Org run', details);
    assert(!/unsupported=/.test(url) && stopped.open && !stopped.stop && stopped.runtimeDisabled === false, 'REQ-008 after the stop the phone stays on Settings with the rows open', details);
    return details;
  });
};
