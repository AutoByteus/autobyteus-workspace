// A Contents link in rendered Markdown scrolls to its heading in the same document; links that cannot be followed here
// do nothing (autobyteus-480). Cases of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs`
// after its other cases (`--cases=MSP-44,MSP-45,MSP-46` runs only these).
//
// On alpha (the node of the probe's desktop window), with test data only:
//   - `headings-480/design-principles.md` (a copy of the unit tests' fixture: 26 Contents entries) and
//     `headings-480/links.md` (a broken anchor and four links with no scheme) in its workspace, linked from a run's
//     message;
//   - a skill `heading-links-480` with the same two files under `references/`;
//   - a delegator (a Project Task Manager run) sends its task agent two Markdown messages with the same Contents and
//     headings, plus a broken anchor, a relative link, an external `https:` link and a `mailto:` link (two
//     `send_message_to` messages after a plain `delegate_task`). The scripted runtime quotes its own answers, so the
//     Markdown comes from another agent, as a handoff with a Contents list does.
// The desktop window (`nuxt dev`) and a phone of these cases (the production bundle alpha serves at /mobile, a headless
// Chrome mapping 192.168.77.70 to 127.0.0.1, paired through Phone Access). The external address is answered by a stub
// route in each browser context, so nothing leaves this machine.
//
// Cases:
//   MSP-44 AC-002, AC-004, AC-005  The desktop Files panel and the phone viewer, each opened from the run's file-action
//                  links: every Contents entry brings its heading to the top of the viewer's scroll container (or, near the
//                  end of the document, into view), with the URL unchanged and no new tab; then the broken anchor and the
//                  links with no scheme change nothing (URL, file shown, scroll position) and open nothing.
//   MSP-45 AC-002, AC-004  The Skills page (desktop window): the skill's `references/design-principles.md`, every Contents
//                  entry; then `references/links.md`.
//   MSP-46 AC-003, AC-004, AC-005  The task agent's conversation, on the desktop and the phone: an entry in the second
//                  message scrolls to that message's heading while the first message's same heading stays out of view, and the other way
//                  round; keyboard Enter on an entry (desktop); the broken anchor and the relative link change nothing; the
//                  external link opens one new tab at that address; the renderer leaves a `mailto:` click to the browser
//                  (not prevented), as before.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachToBrowserContext } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';

const PHONE_HOST = '192.168.77.70';
const DIR = 'headings-480';
const SKILL = 'heading-links-480';
const EXTERNAL = 'https://example.com/heading-links-480';
const FIXTURE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../utils/__tests__/fixtures/design-principles.md');
const LINKS_MD = '# Links 480\n\nLINKS-480-BODY\n\n- [Missing](#no-such-heading-480)\n- [Other file](other.md)\n- [Other file anchor](other.md#x)\n- [Root path](/x.md)\n- [Dot path](./x.md)\n';
const NO_FOLLOW = ['#no-such-heading-480', 'other.md', 'other.md#x', '/x.md', './x.md'];
const filler = (label) => Array.from({ length: 30 }, (_, i) => `${label} paragraph ${i + 1}: filler text so the next heading starts well below the first screen.`).join('\n\n');
const answer = (marker) => [
  marker, '',
  '- [Setup 480](#setup-480)', '- [Notes 480](#notes-480)', '- [Missing](#no-such-heading-480)', '- [Other file](other.md)',
  `- [Outside](${EXTERNAL})`, '- [Mail](mailto:heading-links-480@example.com)', '',
  '## Setup 480', '', filler(`${marker} setup`), '', '## Notes 480', '', filler(`${marker} notes`), '',
].join('\n');

/** In the page: the scroll container of `el` (its nearest ancestor that scrolls) and where `el` sits in it. */
const placeInPage = (el) => {
  let box = el.parentElement;
  while (box && !(/(auto|scroll)/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight + 1)) box = box.parentElement;
  const container = box ?? document.scrollingElement;
  const h = el.getBoundingClientRect();
  const c = box ? box.getBoundingClientRect() : { top: 0, bottom: innerHeight };
  return {
    offsetFromContainerTop: Math.round(h.top - c.top),
    inContainer: h.top >= c.top - 2 && h.top < c.bottom - 4,
    inWindow: h.top >= -2 && h.top < innerHeight - 4,
    containerAtEnd: container.scrollTop + container.clientHeight >= container.scrollHeight - 2,
    containerScrollTop: Math.round(container.scrollTop),
  };
};

/**
 * @param probe the probe's helpers: `runCase`, `chromium`, `executablePath`, `outputDir`, `evidence`, `selected`, `sleep`,
 *   `waitFor`, `assert`, `redact`, `browser`, `alpha`, `stack`, `desktopRunsView`.
 */
export const runHeadingLinksCases = async (probe) => {
  const { runCase, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact, browser, alpha, stack, desktopRunsView } = probe;
  const ids = ['MSP-44', 'MSP-45', 'MSP-46'];
  if (selected && !ids.some(id => selected.has(id))) return;
  let currentCase = 'heading-links-setup';
  const ws = stack.workspace;
  const abs = name => path.join(ws, DIR, name);
  const doc = await fs.readFile(FIXTURE, 'utf8');
  const contents = [...new Set([...doc.matchAll(/\]\(#([^)\s]+)\)/g)].map(m => m[1]))];
  assert(contents.length >= 20, 'the fixture has its Contents', { entries: contents.length });
  await fs.mkdir(path.join(ws, DIR), { recursive: true });
  await fs.writeFile(abs('design-principles.md'), doc);
  await fs.writeFile(abs('links.md'), LINKS_MD);

  // The skill, through the node's public API.
  const skill = (await alpha.gql('mutation($i:CreateSkillInput!){createSkill(input:$i){name rootPath}}', { i: { name: SKILL, description: 'Heading links probe skill (autobyteus-480).', content: '# Heading links 480\n\nSee references/.\n' } })).createSkill;
  for (const [name, content] of [['references/design-principles.md', doc], ['references/links.md', LINKS_MD]]) {
    const ok = (await alpha.gql('mutation($s:String!,$p:String!,$c:String!){uploadSkillFile(skillName:$s,path:$p,content:$c)}', { s: SKILL, p: name, c: content })).uploadSkillFile;
    assert(ok === true, `skill file ${name}`);
  }

  // A run whose message links the two files (file-action links), and a run whose answers carry Contents and headings.
  const newRun = async () => {
    const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
    assert(created.success, created.message);
    return created.runId;
  };
  const filesRun = await newRun();
  await stack.agentSay(filesRun, `ECHO_INPUT HEADINGS-480 [design-principles.md](${abs('design-principles.md')}) [links.md](${abs('links.md')})`);
  await waitFor('the links message', async () => { const text = await stack.projection(filesRun); return text.includes('ECHO:') && text.includes('HEADINGS-480'); }, 60_000);
  // A delegator's two Markdown messages to its task agent (the scripted runtime quotes its own answers, so the Markdown
  // comes from another agent, as a handoff with a Contents list does). The task itself shows as a plain-text notice, so
  // both Markdown messages are `send_message_to` messages, shown in the task agent's conversation with the same headings.
  const host = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.ptm, ...stack.runConfig } })).createAgentRun;
  assert(host.success, host.message);
  const delegated = await stack.agentCall(host.runId, 'delegate_task', { recipient_address: '/release_notes_writer', description: 'Write the 480 notes. Marker TASK-480.' });
  const talkRun = /target_agent_run_id\W+(\w+)/.exec(JSON.stringify(delegated))?.[1];
  assert(talkRun, 'the task agent of the Markdown messages', { delegated });
  for (const marker of ['HEADINGS-480-ONE', 'HEADINGS-480-TWO']) await stack.agentCall(host.runId, 'send_message_to', { target_agent_run_id: talkRun, content: answer(marker) });
  const taskAgentConversation = async () => JSON.stringify((await alpha.gql('query($h:String!,$m:String!,$a:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$m,agentRunId:$a){conversation}}', { h: host.runId, m: '/release_notes_writer', a: talkRun })).agentRunCollaborationMemberProjection?.conversation ?? []);
  await waitFor('both Markdown messages in the task agent\'s conversation', async () => { const text = await taskAgentConversation(); return text.includes('HEADINGS-480-ONE') && text.includes('HEADINGS-480-TWO'); }, 60_000);
  evidence.headingLinks = { filesRun, host: host.runId, talkRun, skill: skill.name, contentsEntries: contents.length };

  const surfaces = [];
  /** A browser context of one surface: popups, browser lines and the stubbed external address. */
  const surfaceOf = async (context, page, label, origin) => {
    const surface = { label, page, popups: [] };
    await context.route(`${EXTERNAL}*`, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>external 480</title>EXTERNAL-480' }));
    context.on('page', (opened) => { if (opened !== page) surface.popups.push({ case: currentCase, opened }); });
    const browserLine = (text, sourceUrl = '') => {
      const line = redact(`${label} console: ${text}`);
      const favicon = /: Failed to load resource: the server responded with a status of 40[14] \((Unauthorized|Not Found)\)$/.test(line) && sourceUrl.startsWith(origin) && new URL(sourceUrl).pathname === '/favicon.ico';
      evidence.browserErrors.push({ case: currentCase, line, known: favicon, ...(favicon ? { cause: 'the browser\'s favicon request at the origin root (/favicon.ico)' } : {}) });
    };
    page.on('console', message => { if (message.type() === 'error') browserLine(message.text(), message.location()?.url ?? ''); });
    page.on('pageerror', error => browserLine(`pageerror ${error.message}`));
    page.on('requestfailed', request => evidence.failedRequests.push({ case: currentCase, label, url: redact(request.url()), error: request.failure()?.errorText ?? null }));
    surfaces.push(surface);
    return surface;
  };
  const press = async (surface, locator) => { await locator.scrollIntoViewIfNeeded(); if (surface.label === 'phone') await locator.tap(); else await locator.click(); };
  /** Scrolls every scroll container in `root` and the page back to the top, so each click starts from the same place. */
  const resetScroll = root => root.evaluate((el) => {
    for (let node = el; node; node = node.parentElement) if (node.scrollTop > 0) node.scrollTop = 0;
    el.querySelectorAll('*').forEach((node) => { if (node.scrollTop > 0) node.scrollTop = 0; });
    window.scrollTo(0, 0);
  });
  /**
   * Clicks every Contents entry of the document shown in `viewer` (a locator) and measures where its heading lands.
   * A heading counts as reached when it is at the top of its scroll container, or, when the container cannot scroll
   * further (the end of the document), anywhere in it; and in the window.
   */
  const followContents = async (surface, viewer) => {
    const results = [];
    for (const anchor of contents) {
      await resetScroll(viewer);
      const urlBefore = surface.page.url();
      const popupsBefore = surface.popups.length;
      await press(surface, viewer.locator(`a[href="#${anchor}"]`).first());
      await sleep(350);
      const place = await viewer.evaluate((el, [id, placeSource]) => {
        const matches = [...el.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(h => h.id === id);
        if (matches.length !== 1) return { headings: matches.length };
        return { headings: 1, ...new Function(`return (${placeSource})`)()(matches[0]) };
      }, [`user-content-${anchor}`, placeInPage.toString()]);
      const reached = place.headings === 1 && place.inWindow && (Math.abs(place.offsetFromContainerTop) <= 2 || (place.containerAtEnd && place.inContainer));
      results.push({ anchor, ...place, reached, urlUnchanged: surface.page.url() === urlBefore, newTabs: surface.popups.length - popupsBefore });
    }
    return results;
  };
  /** Clicks each link that cannot be followed here: nothing may change. */
  const followNothing = async (surface, root, hrefs, stillShown) => {
    const results = [];
    const totalScroll = () => surface.page.evaluate(() => [...document.querySelectorAll('*')].reduce((n, node) => n + node.scrollTop, window.scrollY));
    for (const href of hrefs) {
      const link = root.locator(`a[href="${href}"]`).first();
      await link.scrollIntoViewIfNeeded();
      await sleep(200);
      const urlBefore = surface.page.url();
      const popupsBefore = surface.popups.length;
      const scrollBefore = await totalScroll();
      await press(surface, link);
      await sleep(600);
      const text = await surface.page.locator('body').innerText();
      results.push({ href, urlUnchanged: surface.page.url() === urlBefore, newTabs: surface.popups.length - popupsBefore, stillShown: text.includes(stillShown),
        notFoundShown: /\b404\b|page not found/i.test(text), scrollUnchanged: Math.abs(scrollBefore - await totalScroll()) <= 2 });
    }
    return results;
  };
  const allReached = list => list.every(r => r.reached && r.urlUnchanged && r.newTabs === 0);
  const allStill = list => list.every(r => r.urlUnchanged && r.newTabs === 0 && r.stillShown && !r.notFoundShown && r.scrollUnchanged);
  const summary = list => ({ entries: list.length, reached: list.filter(r => r.reached).length, urlUnchanged: list.filter(r => r.urlUnchanged).length, newTabs: list.reduce((n, r) => n + r.newTabs, 0) });

  // ---- the desktop window ---------------------------------------------------------------------------------------------
  const deskContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
  await attachToBrowserContext(deskContext);
  await deskContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const deskPage = await deskContext.newPage();
  let desk = null;
  // ---- the phone ------------------------------------------------------------------------------------------------------
  const phoneBrowser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
  const phoneOrigin = `http://${PHONE_HOST}:${alpha.port}`;
  let phoneContext = null;
  try {
    await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
    await deskPage.goto(stack.frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
    await sleep(3_000);
    // Browser lines count from here: a cold `nuxt dev` re-optimizes dependencies and reloads during the warm-up above
    // (TESTING.md § Browser probes), which is the harness, not the product.
    desk = await surfaceOf(deskContext, deskPage, 'desktop', stack.frontendUrl);
    const openDesktopRun = async (run) => {
      await deskPage.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
      await desktopRunsView(deskPage);
      const showOlder = deskPage.locator('[data-test="run-list-show-older"]');
      if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
      await deskPage.locator(`[data-test="run-list-row"][data-run-id="${run}"] [data-test="workspace-agent-run-row"]`).first().click({ timeout: 60_000 });
    };
    /** The task agent's row sits under its host's row: unfold the host with its disclosure, then open the row. */
    const openDesktopTaskAgent = async (hostRun, run) => {
      await openDesktopRun(hostRun);
      const row = deskPage.locator(`[data-transient-kind="task_agent"][data-agent-run-id="${run}"]:visible`).first();
      for (let round = 0; round < 5 && !(await row.count()); round += 1) {
        await deskPage.locator(`[data-test="run-list-row"][data-run-id="${hostRun}"] [data-test="run-list-disclosure"]`).first().click().catch(() => undefined);
        await sleep(800);
      }
      await row.click({ timeout: 30_000 });
    };

    const settings = await alpha.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
    assert(settings.status === 200, 'alpha Phone Access on', settings);
    const pairing = await alpha.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Alpha Test Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'alpha pairing session for the heading-links phone', pairing.status);
    phoneContext = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
    const phonePage = await phoneContext.newPage();
    const phone = await surfaceOf(phoneContext, phonePage, 'phone', phoneOrigin);
    await phonePage.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await phonePage.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    await phonePage.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
    const phoneHome = phonePage.url();
    const openPhoneRun = async (run, hostRun = null) => {
      await phonePage.goto(phoneHome, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      // A task agent's row sits under its host's row (key `agent:<host>/<row key>`): unfold the host's folded rows first.
      const open = hostRun
        ? phonePage.locator(`[data-testid^="mobile-run-row-agent:${hostRun}/"][data-testid*="${run}"] [data-testid="mobile-run-open"]`)
        : phonePage.locator(`[data-testid="mobile-run-row-agent:${run}"] [data-testid="mobile-run-open"]`);
      for (let round = 0; hostRun && round < 5 && !(await open.count()); round += 1) {
        await phonePage.locator(`[data-testid="mobile-run-row-agent:${hostRun}"]`).first().waitFor({ timeout: 60_000 });
        for (const toggle of await phonePage.locator(`[data-test="mobile-run-row"][data-testid^="mobile-run-row-agent:${hostRun}"][aria-expanded="false"] [data-testid="mobile-run-toggle"]`).all()) await toggle.click({ timeout: 1_500 }).catch(() => undefined);
        await sleep(600);
      }
      await open.first().click({ timeout: 60_000 });
      return phonePage.locator('[data-testid="mobile-run-conversation"]');
    };

    await runCase('MSP-44', async () => {
      currentCase = 'MSP-44';
      const details = {};
      // The desktop window: the file-action links open the file in the Files panel viewer.
      await openDesktopRun(filesRun);
      const deskLink = name => deskPage.locator(`[data-event-monitor-file-action-control="true"][title="${abs(name)}"]`).last();
      const deskViewer = deskPage.locator('#contentViewer:visible').first();
      await deskLink('design-principles.md').waitFor({ timeout: 60_000 });
      await deskLink('design-principles.md').click();
      await waitFor('design-principles.md in the desktop viewer', async () => (await deskViewer.locator(`a[href="#${contents[0]}"]`).count()) > 0, 30_000);
      await sleep(1_000);
      const deskContents = await followContents(desk, deskViewer);
      await deskPage.screenshot({ path: path.join(outputDir, 'MSP-44-desktop-after-contents.png') });
      await deskLink('links.md').click();
      await waitFor('links.md in the desktop viewer', async () => (await deskViewer.innerText()).includes('LINKS-480-BODY'), 30_000);
      const deskNothing = await followNothing(desk, deskViewer, NO_FOLLOW, 'LINKS-480-BODY');
      // The phone: the same links open the phone viewer.
      const conv = await openPhoneRun(filesRun);
      const phoneLink = name => conv.locator(`[data-event-monitor-file-action-control="true"][title="${abs(name)}"]`).last();
      const phoneViewer = phonePage.locator('[data-testid="mobile-file-viewer"]');
      await phoneLink('design-principles.md').waitFor({ timeout: 60_000 });
      await press(phone, phoneLink('design-principles.md'));
      await waitFor('design-principles.md in the phone viewer', async () => (await phoneViewer.locator(`a[href="#${contents[0]}"]`).count()) > 0, 30_000);
      await sleep(1_000);
      const phoneContents = await followContents(phone, phoneViewer);
      await phonePage.screenshot({ path: path.join(outputDir, 'MSP-44-phone-after-contents.png') });
      await phonePage.goBack();
      await waitFor('the phone conversation', async () => (await phoneViewer.count()) === 0, 15_000);
      await press(phone, phoneLink('links.md'));
      await waitFor('links.md in the phone viewer', async () => (await phoneViewer.count()) > 0 && (await phoneViewer.innerText()).includes('LINKS-480-BODY'), 30_000);
      const phoneNothing = await followNothing(phone, phoneViewer, NO_FOLLOW, 'LINKS-480-BODY');
      await phonePage.screenshot({ path: path.join(outputDir, 'MSP-44-phone-links.png') });
      Object.assign(details, {
        desktop: { contents: summary(deskContents), notReached: deskContents.filter(r => !r.reached || !r.urlUnchanged || r.newTabs), sample: deskContents.slice(0, 3), nothing: deskNothing },
        phone: { contents: summary(phoneContents), notReached: phoneContents.filter(r => !r.reached || !r.urlUnchanged || r.newTabs), sample: phoneContents.slice(0, 3), nothing: phoneNothing },
      });
      assert(allReached(deskContents) && allReached(phoneContents), 'every Contents entry brings its heading into view on the desktop Files panel and the phone viewer, URL unchanged, no new tab (AC-002)', details);
      assert(allStill(deskNothing) && allStill(phoneNothing), 'a broken anchor and links with no scheme change nothing and open nothing (AC-004)', details);
      return details;
    });

    await runCase('MSP-45', async () => {
      currentCase = 'MSP-45';
      await deskPage.goto(`${stack.frontendUrl}/skills`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      const card = deskPage.locator('.skill-card').filter({ hasText: SKILL }).first();
      await card.waitFor({ timeout: 60_000 });
      await card.locator('.btn-primary').click();
      const detail = deskPage.locator('.skill-detail');
      const treeName = name => detail.locator('.file-item span.select-none').filter({ hasText: new RegExp(`^${name.replace(/[.]/g, '\\.')}$`) }).first();
      await treeName('references').waitFor({ timeout: 60_000 });
      await treeName('references').click();
      await treeName('design-principles.md').waitFor({ timeout: 30_000 });
      await treeName('design-principles.md').click();
      const viewer = detail.locator('#contentViewer:visible').first();
      await waitFor('the skill reference in the viewer', async () => (await viewer.locator(`a[href="#${contents[0]}"]`).count()) > 0, 30_000);
      await sleep(1_000);
      const skillContents = await followContents(desk, viewer);
      await deskPage.screenshot({ path: path.join(outputDir, 'MSP-45-skills-after-contents.png') });
      await treeName('links.md').click();
      await waitFor('links.md in the skill viewer', async () => (await viewer.innerText()).includes('LINKS-480-BODY'), 30_000);
      const skillNothing = await followNothing(desk, viewer, NO_FOLLOW, 'LINKS-480-BODY');
      const details = { url: deskPage.url(), contents: summary(skillContents), notReached: skillContents.filter(r => !r.reached || !r.urlUnchanged || r.newTabs), sample: skillContents.slice(0, 3), nothing: skillNothing };
      assert(allReached(skillContents), 'every Contents entry brings its heading into view in the Skills page preview, URL unchanged (AC-002)', details);
      assert(allStill(skillNothing), 'a broken anchor and links with no scheme change nothing in the Skills page (AC-004)', details);
      return details;
    });

    await runCase('MSP-46', async () => {
      currentCase = 'MSP-46';
      const details = {};
      /** One surface: two answers with the same headings. */
      const inConversation = async (surface, conversation) => {
        const answerRoot = marker => conversation.locator('.inter-agent-content .markdown-renderer-segments:visible').filter({ hasText: marker }).first();
        const one = answerRoot('HEADINGS-480-ONE'); const two = answerRoot('HEADINGS-480-TWO');
        await two.waitFor({ timeout: 60_000 });
        await sleep(1_000);
        const headingPlace = (root, anchor) => root.evaluate((el, [id, placeSource]) => {
          const heading = [...el.querySelectorAll('h2')].find(h => h.id === id);
          return heading ? new Function(`return (${placeSource})`)()(heading) : null;
        }, [`user-content-${anchor}`, placeInPage.toString()]);
        const out = {};
        for (const [name, clicked, other, anchor] of [['twoNotes', two, one, 'notes-480'], ['oneSetup', one, two, 'setup-480'], ['twoSetup', two, one, 'setup-480']]) {
          const urlBefore = surface.page.url();
          await press(surface, clicked.locator(`a[href="#${anchor}"]`).first());
          await sleep(500);
          const own = await headingPlace(clicked, anchor); const theOther = await headingPlace(other, anchor);
          out[name] = { own, otherInWindow: theOther?.inWindow ?? null, urlUnchanged: surface.page.url() === urlBefore,
            ownReached: Boolean(own && own.inWindow && (Math.abs(own.offsetFromContainerTop) <= 2 || own.containerAtEnd)) };
        }
        if (surface.label === 'desktop') {
          // Keyboard: Enter on a focused entry.
          await one.locator('a[href="#notes-480"]').first().focus();
          await deskPage.keyboard.press('Enter');
          await sleep(500);
          const own = await headingPlace(one, 'notes-480');
          out.keyboardEnter = { own, ownReached: Boolean(own && own.inWindow && (Math.abs(own.offsetFromContainerTop) <= 2 || own.containerAtEnd)) };
        }
        out.nothing = await followNothing(surface, two, ['#no-such-heading-480', 'other.md'], 'HEADINGS-480-TWO');
        // The external link: one new tab at that address; this page stays.
        const urlBefore = surface.page.url(); const popupsBefore = surface.popups.length;
        await press(surface, two.locator(`a[href="${EXTERNAL}"]`).first());
        await waitFor('the external tab', async () => surface.popups.length > popupsBefore, 10_000).catch(() => undefined);
        const opened = surface.popups.slice(popupsBefore);
        await sleep(500);
        out.external = { newTabs: opened.length, urls: opened.map(p => p.opened.url()), urlUnchanged: surface.page.url() === urlBefore };
        for (const p of opened) await p.opened.close().catch(() => undefined);
        // mailto: the renderer leaves it to the browser (a listener after the renderer records whether it was prevented,
        // then stops the navigation so the page stays).
        await surface.page.evaluate(() => { window.__mailto480 = []; window.addEventListener('click', (e) => { if (e.target instanceof Element && e.target.closest('a[href^="mailto:"]')) { window.__mailto480.push(e.defaultPrevented); e.preventDefault(); } }); });
        await press(surface, two.locator('a[href^="mailto:"]').first());
        await sleep(300);
        out.mailto = { preventedByRenderer: await surface.page.evaluate(() => window.__mailto480) };
        await surface.page.screenshot({ path: path.join(outputDir, `MSP-46-${surface.label}-conversation.png`) });
        return out;
      };
      await openDesktopTaskAgent(host.runId, talkRun);
      details.desktop = await inConversation(desk, deskPage.locator('body'));
      details.phone = await inConversation(phone, await openPhoneRun(talkRun, host.runId));
      const scrolledOwn = s => ['twoNotes', 'oneSetup', 'twoSetup'].every(k => s[k].ownReached && s[k].otherInWindow === false && s[k].urlUnchanged);
      assert(scrolledOwn(details.desktop) && scrolledOwn(details.phone), 'each entry scrolls to the heading of its own answer; the other answer\'s same heading stays out of view; URL unchanged (AC-003)', details);
      assert(details.desktop.keyboardEnter.ownReached, 'Enter on a focused entry scrolls to its heading (REQ-002)', details);
      assert(allStill(details.desktop.nothing) && allStill(details.phone.nothing), 'a broken anchor and a relative link in an answer change nothing (AC-004)', details);
      assert([details.desktop, details.phone].every(s => s.external.newTabs === 1 && s.external.urls[0]?.startsWith(EXTERNAL) && s.external.urlUnchanged), 'the external link opens one new tab at its address; the page stays (AC-005)', details);
      assert([details.desktop, details.phone].every(s => s.mailto.preventedByRenderer.length === 1 && s.mailto.preventedByRenderer[0] === false), 'the renderer leaves a mailto: link to the browser, as before (AC-005)', details);
      return details;
    });
  } finally {
    if (phoneContext) await phoneContext.close().catch(() => undefined);
    await deskContext.close().catch(() => undefined);
    await phoneBrowser.close().catch(() => undefined);
  }
};
