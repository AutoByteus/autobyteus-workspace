// The conversation keeps its own order whatever the phone's clock (autobyteus-628 AC-001…AC-003). A case of
// `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` (`--cases=MSP-105` runs only it).
//
// The founder's shape: a Team member's conversation on the phone, where the member's input is echoed by the node with
// the node's time (`MEMBER_INPUT_MESSAGE.received_at`) while the agent's live output takes the phone's time. On alpha
// (scripted AGY), a Team whose coordinator `/lead` uses the case's own agent; changing that agent's tools makes the node put
// a "Tools updated" notice in front of `/lead`'s next input (the input preface). Each round opens its own phone (the
// probe's pairing, a fresh page) whose `Date` reads the real time plus an offset, so its timers still run (Playwright's
// `page.clock` would hold them).
//   MSP-105 AC-001  The phone 2 s behind, then 2 s ahead, sends a message to `/lead`: live, the rows read the previous
//                  reply, the message, the "Tools updated" notice, the reply.
//           AC-002  A phone 2 s behind only watches `/lead`: the message is sent through the Team stream by another client;
//                  it shows the message before the notice and the reply.
//           AC-003  Each phone reopened (a fresh read from the node): the same order. The node's own conversation entries
//                  for `/lead` hold the notice right after the message.
import { randomUUID } from 'node:crypto';

const TOOLS = [['list_projects'], ['list_projects', 'list_project_tasks']];
const NOTICE_LABEL = 'Tools updated';

export const runConversationOrderCases = async (probe) => {
  const { runCase, page, stack, alpha, openPhone, paired, shot, waitFor, sleep, assert, selected, sendOver, ensureUnfolded, openRow, rowsOf: listRows, childRow } = probe;
  if (selected && !selected.has('MSP-105')) return;

  await runCase('MSP-105', async () => {
    const gql = (query, variables) => alpha.gql(query, variables);
    const definitionId = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: {
      name: 'Order Lead', role: 'assistant', description: 'Order Lead (phone probe, autobyteus-628)', instructions: 'Follow the request.',
      toolNames: TOOLS[0] } })).createAgentDefinition.id;
    const teamDefinitionId = (await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: {
      name: 'Order Team', description: 'Order Team (phone probe, autobyteus-628)', instructions: 'Work together.', coordinatorMemberName: 'lead',
      nodes: [{ memberName: 'lead', ref: definitionId, refScope: 'SHARED' }, { memberName: 'mate', ref: stack.ids.writer, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
    const team = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: {
      teamDefinitionId, teamConfigs: [{ teamAddress: '/', ...stack.runConfig }],
      memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: definitionId, ...stack.runConfig },
        { memberAddress: '/mate', agentDefinitionId: stack.ids.writer, ...stack.runConfig }] } })).createAgentTeamRun;
    assert(team.success, team.message);
    const tree = JSON.stringify((await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: team.teamRunId })).getTeamRunResumeConfig.executionTree);
    const lead = /"address":"\/lead"[^}]*"agent_run_id":"([^"]+)"/.exec(tree)?.[1];
    assert(lead, 'the Team\'s /lead run', tree);
    const teamKey = `team:${team.teamRunId}`;
    const teamWs = stack.wsUrl(`agent-team/${team.teamRunId}`);
    const leadEntries = async () => (await gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}',
      { id: team.teamRunId, a: lead })).getTeamMemberRunProjection?.conversation ?? [];
    /** A message to `/lead` from another client, through the Team stream. */
    const teamSay = (content) => sendOver(teamWs, { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`,
      context_file_paths: [], image_urls: [], agent_run_id: lead, content });
    const replied = (marker) => waitFor(`/lead's reply to ${marker}`, async () => {
      const entries = await leadEntries();
      const at = entries.findIndex((entry) => entry.kind === 'message' && entry.role === 'user' && entry.content?.includes(marker));
      return at >= 0 && entries.slice(at + 1).some((entry) => entry.kind === 'message' && entry.role === 'assistant');
    }, 60_000);

    await teamSay('ORDER-628-FIRST plain start.');
    await replied('ORDER-628-FIRST');
    let toolsIndex = 0;
    /** The lead's tools change, so the node puts a "Tools updated" notice in front of its next input. */
    const changeTools = async () => {
      toolsIndex = 1 - toolsIndex;
      await gql('mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id}}', { input: { id: definitionId, toolNames: TOOLS[toolsIndex] } });
      await sleep(1_500);
    };

    /** A phone of the probe's pairing whose clock reads `offsetMs` from the real time, open on `/lead`. */
    const phoneAt = async (offsetMs, label) => {
      const phone = await openPhone({ storageState: paired, label });
      await phone.context.addInitScript((offset) => {
        const RealDate = Date;
        class OffsetDate extends RealDate {
          constructor(...args) { if (args.length === 0) super(RealDate.now() + offset); else super(...args); }
          static now() { return RealDate.now() + offset; }
        }
        globalThis.Date = OffsetDate;
      }, offsetMs);
      const open = async () => {
        await phone.page.goto(new URL('/mobile/', page.url()).toString(), { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await phone.page.locator('[data-testid="mobile-run-tree"]:visible').waitFor({ timeout: 60_000 });
        await waitFor(`the Team in ${label}'s list`, async () => (await phone.page.locator(`[data-testid="mobile-run-row-${teamKey}"]`).count()) > 0, 60_000);
        await ensureUnfolded(phone.page, teamKey);
        let key = null;
        await waitFor(`/lead's row in ${label}'s list`, async () => Boolean(key = childRow(await listRows(phone.page), teamKey, 'lead', 1)?.key), 30_000);
        await openRow(phone.page, key);
        await phone.page.locator('[data-testid="mobile-run-conversation"]').waitFor({ timeout: 30_000 });
        await sleep(1_500);
      };
      await open();
      const clockOffsetMs = await phone.page.evaluate(() => Date.now()) - Date.now();
      return { ...phone, open, clockOffsetMs };
    };

    /** The phone's conversation rows, in the order drawn: who speaks, a notice's label, the text. */
    const rowsOf = (phonePage) => phonePage.evaluate(() => [...document.querySelectorAll('[data-testid="mobile-run-conversation"] .conv-row')].map((row) => ({
      speaker: row.getAttribute('data-speaker'),
      notice: row.querySelector('[data-testid="system-task-notification-segment"]')?.getAttribute('aria-label') ?? null,
      text: row.innerText.replace(/\s+/g, ' ').trim().slice(0, 120),
    })));
    /** The round's rows around its message: the message, then the "Tools updated" notice, then the agent's reply. */
    const order = (rows, marker) => {
      const message = rows.findIndex((row) => row.speaker === 'user' && row.text.includes(marker));
      const before = message > 0 ? rows[message - 1] : null;
      const next = rows[message + 1] ?? null;
      const after = rows[message + 2] ?? null;
      return { message, before, next, after,
        ok: message >= 0 && next?.notice === NOTICE_LABEL && after?.speaker === 'agent' && before?.notice !== NOTICE_LABEL };
    };

    const rounds = [];
    const phones = [];
    try {
      for (const [offsetMs, sender] of [[-2_000, 'phone'], [2_000, 'phone'], [-2_000, 'another client']]) {
        const label = `phone-order-${offsetMs > 0 ? 'ahead' : 'behind'}-${sender === 'phone' ? 'sends' : 'watches'}`;
        const marker = `ORDER-628-${randomUUID().slice(0, 8)}`;
        const phone = await phoneAt(offsetMs, label);
        phones.push(phone);
        await changeTools();
        const rowsBefore = (await rowsOf(phone.page)).length;
        if (sender === 'phone') {
          const box = phone.page.locator('[data-testid="mobile-run-conversation"] textarea').last();
          await box.fill(`${marker} Which tools do you have now?`);
          await box.press('Enter');
        } else {
          await teamSay(`${marker} Which tools do you have now?`);
        }
        await replied(marker);
        // The message, the notice and the reply drawn (three rows more), wherever they land.
        await waitFor(`${label}: the round drawn`, async () => (await rowsOf(phone.page)).length >= rowsBefore + 3, 30_000).catch(() => undefined);
        await sleep(1_000);
        const live = order(await rowsOf(phone.page), marker);
        await shot(phone.page, `MSP-105-${label}-live`);
        await phone.open();
        await waitFor(`${label}: the message after reopening`, async () => (await rowsOf(phone.page)).some((row) => row.text.includes(marker)), 30_000).catch(() => undefined);
        const reopened = order(await rowsOf(phone.page), marker);
        await shot(phone.page, `MSP-105-${label}-reopened`);
        // The node's own reload order (D-2): /lead's conversation entries around the message, with their times.
        const entries = await leadEntries();
        const at = entries.findIndex((entry) => entry.kind === 'message' && entry.role === 'user' && entry.content?.includes(marker));
        rounds.push({ label, offsetMs, clockOffsetMs: phone.clockOffsetMs, sender, marker, live, reopened,
          nodeOrder: entries.slice(Math.max(0, at - 1), at + 3).map((entry) => `${entry.kind}${entry.role ? `:${entry.role}` : ''}@${entry.ts}`),
          nodeNoticeAfterMessage: at >= 0 && entries[at + 1]?.kind === 'system_task_notification' });
      }
    } finally {
      for (const phone of phones) await phone.context.close().catch(() => undefined);
      await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: team.teamRunId }).catch(() => undefined);
    }

    const failures = rounds.flatMap((round) => [
      [Math.abs(round.clockOffsetMs - round.offsetMs) < 500, `${round.label}: the phone's clock is ${round.offsetMs} ms from the node's`],
      [round.live.ok, `${round.label}: live, the message, then the notice, then the reply (AC-001, AC-002)`],
      [round.reopened.ok, `${round.label}: reopened, the same order (AC-003)`],
      [round.nodeNoticeAfterMessage, `${round.label}: the node's conversation entries hold the notice right after the message (D-2)`],
    ].filter(([ok]) => !ok).map(([, text]) => text));
    assert(failures.length === 0, failures.join('; '), { team: team.teamRunId, lead, rounds });
    return { team: team.teamRunId, lead, rounds };
  });
};
