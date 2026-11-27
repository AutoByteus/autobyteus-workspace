// A Team stream recovers by itself on the phone (autobyteus-541 AC-001). A case of `pnpm -C autobyteus-web
// test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` on its paired phone page (`--cases=MSP-119` runs only it), on
// alpha's scripted Antigravity runtime (`PLAIN` text is answered at once). The phone's sockets pass through the probe's
// wire (`fixtures/stop-generation-wire.mjs`).
//
//   MSP-119 AC-001  A Team member open on the phone; another window sends the member a message, and the wire withholds the
//                   frame before its idle status (`fixtures/team-stream-gap.mjs`): a real gap with the Team finished. With no
//                   reselect the phone replaces its Team stream within one attempt (≤ 3 s), shows the member Idle (the
//                   node's status) and the other window's message, shows no notice, and a message sent right after is
//                   answered on the new stream.
//   MSP-120 AC-002  The same gap with the node unreachable for the recovery's reads (its checkpoint queries refused): a
//                   message sent meanwhile waits 10 s and comes back with text (a); the fifth failed attempt shows "Live
//                   updates could not recover automatically…" on the phone; once the reads pass again, the next attempt
//                   recovers and the notice goes.
import { makeTeamStreamGap, refuseTeamRecoveryReads, teamStreamGap, waitForTeamStreamReplacement } from './fixtures/team-stream-gap.mjs';

const SEND = 'Send message';
const TEXT_A = 'Your message was not sent: not connected to the node. It is back in the message box; send it again.';
const EXHAUSTED = 'Live updates could not recover automatically. Select this Team member again to reload the complete conversation.';

/**
 * @param probe `runCase`, `page` (the paired phone), `stack`, `alpha`, `sel`, `toList`, `openRow`, `runScreen`, `shot`,
 *   `waitFor`, `sleep`, `assert`, `selected`, `phoneWire`.
 */
export const runTeamStreamRecoveryCases = async (probe) => {
  const { runCase, page, stack, alpha, sel, toList, openRow, runScreen, shot, waitFor, sleep, assert, phoneWire: wire } = probe;
  if (probe.selected && !['MSP-119', 'MSP-120'].some((id) => probe.selected.has(id))) return;
  const gql = (query, variables) => alpha.gql(query, variables);
  const SCOPE = sel('mobile-run-conversation');
  const textarea = () => page.locator(`${SCOPE} textarea`).last();
  const button = () => page.locator(`${SCOPE} button[aria-label="${SEND}"]`).last();
  const send = async (text) => {
    await waitFor('Send enabled', async () => { await textarea().fill(text); await sleep(150); return button().isEnabled().catch(() => false); }, 60_000);
    await button().click();
  };
  const shows = async (marker) => ((await runScreen(page)).conversation ?? '').includes(marker);
  const idle = async () => ((await runScreen(page)).subtitle ?? '').startsWith('Idle');

  /** A Team of the cases' own, open on the phone, its lead idle after a first message; `consoleLines` the page's console. */
  const openTeam = async (consoleLines) => {
    const created = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: {
      teamDefinitionId: stack.ids.delivery, teamConfigs: [{ teamAddress: '/', ...stack.runConfig }],
      memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: stack.ids.checker, ...stack.runConfig },
        { memberAddress: '/mate', agentDefinitionId: stack.ids.writer, ...stack.runConfig }] } })).createAgentTeamRun;
    assert(created.success, created.message);
    const teamRunId = created.teamRunId;
    const lead = ((await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRunId }))
      .getTeamRunResumeConfig.executionTree.root_team?.members ?? []).find((m) => m.address === '/lead')?.agent_run_id;
    const onConsole = (m) => consoleLines.push(m.text());
    page.on('console', onConsole);
    const close = async () => {
      page.off('console', onConsole);
      await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: teamRunId }).catch(() => undefined);
    };
    try {
      await toList(page);
      await waitFor(`team:${teamRunId} on the phone`, async () => (await page.locator(sel(`mobile-run-row-team:${teamRunId}`)).count()) > 0, 60_000);
      await openRow(page, `team:${teamRunId}`);
      await waitFor('the composer', async () => (await textarea().count()) > 0, 30_000);
      // The first message starts the member's runtime.
      const tag = Math.random().toString(36).slice(2, 6);
      await send(`PLAIN hello-${tag}`);
      await waitFor('the member idle', async () => (await shows(`hello-${tag}`)) && idle(), 60_000);
      await sleep(1_500);
      return { teamRunId, lead, tag, close };
    } catch (error) {
      await close();
      throw error;
    }
  };

  await runCase('MSP-119', async () => {
    const consoleLines = [];
    const { teamRunId, lead, tag, close } = await openTeam(consoleLines);
    try {
      const marker = `gap-${tag}`;
      const gap = await teamStreamGap({ wire, socketBase: alpha.baseUrl.replace(/^http/, 'ws'), teamRunId, agentRunId: lead,
        content: `PLAIN ${marker}`, until: waitFor, consoleLines });
      await waitFor('the other window\'s message on the phone', () => shows(marker), 30_000).catch(() => undefined);
      const screen = await runScreen(page);
      const after = { subtitle: screen.subtitle, shown: (screen.conversation ?? '').includes(marker),
        recoveryNotice: await page.locator(sel('mobile-run-recovery-notice')).count(),
        notDelivered: await page.locator('[data-test="message-not-delivered"]').count() };
      await shot(page, 'MSP-119-team-recovered');

      const from = wire.log.length;
      await send(`PLAIN after-${marker}`);
      await waitFor('the reply after the gap', async () => (await shows(`after-${marker}`)) && idle(), 30_000).catch(() => undefined);
      const sends = wire.since(from).filter((f) => f.dir === 'up' && f.type === 'SEND_MESSAGE' && f.url === `/ws/agent-team/${teamRunId}`);
      const sentAfter = { shown: await shows(`after-${marker}`), subtitle: (await runScreen(page)).subtitle,
        notDelivered: await page.locator('[data-test="message-not-delivered"]').count() };
      const details = { teamRunId, gap, after, sentAfter, sends: sends.map((f) => f.link) };
      assert(gap.gapSeen, 'the phone saw the gap', details);
      assert(gap.failedAttempts === 0 && gap.recoveredAfterMs <= 3_000, 'recovered by itself within one attempt (≤ 3 s), with no reselect', details);
      assert(after.subtitle?.startsWith('Idle') && after.shown && after.recoveryNotice === 0 && after.notDelivered === 0,
        'the node\'s status (Idle) and the other window\'s message; no notice', details);
      assert(sends.length === 1 && sends[0].link === gap.replacementLink && sentAfter.shown && sentAfter.notDelivered === 0,
        'a message right after went on the new stream and was answered', details);
      return details;
    } finally {
      await close();
    }
  });

  await runCase('MSP-120', async () => {
    const consoleLines = [];
    const { teamRunId, lead, tag, close } = await openTeam(consoleLines);
    const exhausted = () => page.locator(sel('mobile-run-recovery-notice'), { hasText: EXHAUSTED }).count();
    const notDelivered = () => page.evaluate(() => {
      const notice = document.querySelector('[data-test="message-not-delivered"]');
      return notice ? { certainty: notice.querySelector('[data-certainty]')?.getAttribute('data-certainty') ?? null,
        text: notice.querySelector('[data-test="message-not-delivered-text"]')?.textContent?.trim() ?? null } : null;
    });
    const reads = await refuseTeamRecoveryReads(page);
    let released = false;
    try {
      const marker = `exhausted-${tag}`;
      const gap = await makeTeamStreamGap({ wire, socketBase: alpha.baseUrl.replace(/^http/, 'ws'), teamRunId, agentRunId: lead,
        content: `PLAIN ${marker}`, until: waitFor, consoleLines, withhold: 'first' });
      // A message while the stream recovers (the member still shows Idle, its last status): it waits for the recovered stream (10 s), then comes back with text (a).
      await sleep(1_000);
      await textarea().fill(`PLAIN during-${marker}`);
      await sleep(300);
      const sendable = await button().isEnabled().catch(() => false);
      await button().click();
      const sentAt = Date.now();
      await waitFor('the not-delivered notice', async () => Boolean(await notDelivered()), 30_000);
      const noticeAfterMs = Date.now() - sentAt;
      const during = { notice: await notDelivered(), draft: await textarea().inputValue().catch(() => null), shown: await shows(`during-${marker}`) };
      await waitFor('the recovery notice', async () => (await exhausted()) > 0, 45_000).catch(() => undefined);
      const noticeAfterGapMs = Date.now() - gap.withheld.at;
      const failuresAtNotice = consoleLines.slice(gap.consoleFrom).filter((line) => line.includes('Team stream recovery of')).length;
      const subtitle = (await runScreen(page)).subtitle;
      await shot(page, 'MSP-120-team-recovery-exhausted');
      // The node answers the reads again: the next attempt recovers, and the notice goes.
      await reads.release();
      released = true;
      const recovery = await waitForTeamStreamReplacement(gap, { wire, until: waitFor, consoleLines, timeoutMs: 60_000 });
      await waitFor('the notice gone', async () => (await exhausted()) === 0, 10_000).catch(() => undefined);
      const details = { teamRunId, refusedReads: reads.refused(), sendable, noticeAfterMs, during, failuresAtNotice, noticeAfterGapMs, subtitle,
        recovery, noticeAfterRecovery: await exhausted(), after: { subtitle: (await runScreen(page)).subtitle, shown: await shows(marker) } };
      assert(sendable && during.notice?.certainty === 'not_sent' && during.notice.text === TEXT_A && noticeAfterMs >= 9_000
        && during.draft === `PLAIN during-${marker}`, 'a message while recovering: text (a) after the 10 s wait, the text back', details);
      assert(failuresAtNotice === 5 && noticeAfterGapMs >= 13_000, 'the notice after the fifth failed attempt (not before)', details);
      // REQ-002: while it recovers, the member keeps its last known status (Idle: the withheld frame was the turn's first).
      assert(subtitle?.startsWith('Idle'), 'the member keeps its last known status while the stream recovers', details);
      assert(details.noticeAfterRecovery === 0 && details.after.subtitle?.startsWith('Idle') && details.after.shown,
        'once the reads pass, the recovery succeeds and the notice goes', details);
      return details;
    } finally {
      if (!released) await reads.release();
      await close();
    }
  });
};
