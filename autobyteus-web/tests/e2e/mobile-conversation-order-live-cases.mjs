// The conversation's order and the node's row times on real runtimes (autobyteus-628 AC-001…AC-003, AC-006). Gated cases
// of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after MSP-105
// (`--cases=MSP-106,MSP-107` runs only these).
//
// Gate: RUN_MOBILE_SHELL_LIVE_ORDER=1 with the test vault (AUTOBYTEUS_TEST_VAULT; `provider.anthropic.api-key` and
// `provider.openai.api-key`, TESTING.md#test-vault). Paid inference: a few short turns on the cheapest models (Claude haiku,
// gpt-5.4-mini or MOBILE_SHELL_LIVE_OPENAI_MODEL). Without the gate both cases are skipped (a skip is not a pass).
//
// A node of their own (`nu`, this worktree's built server) reads the test vault; its Claude is test-owned: the node's HOME
// and CLAUDE_CONFIG_DIR are folders of the probe, and CLAUDE_AGENT_SDK_AUTH_MODE=api-key hands the vault's key to the CLI,
// so nothing of the user's ~/.claude is read or written (TESTING.md "Claude Code"). Phones of the node's pairing (the
// production bundle, 390×844) whose `Date` reads the real time plus an offset (timers still run).
//   MSP-106 AC-001, AC-002, AC-003, AC-006 (D-2 rule (a), external)  A Team whose coordinator `/lead` runs on Claude.
//                  Its tools change before each round, so the node puts a "Tools updated" notice in front of the next input.
//                  Rounds: a phone 2 s behind sends; a phone 2 s ahead sends; a phone 2 s behind watches while another client
//                  sends. Live: the message, the notice, the reply; reopened: the same; the node's entries: the notice right
//                  after the message. The phone's own state holds the node's times for the message and the reply (within 1 s
//                  of the node's stored times, while the phone's clock is 2 s off).
//   MSP-107 AC-001, AC-003, AC-006 (D-2 rule (b), native)  A standalone native AutoByteus run (a real model) whose agent uses
//                  a skill; the skill's text changes before each round, so a "Skill updated" notice precedes the next input.
//                  A phone 2 s behind, then 2 s ahead, sends. The same checks, and the own send's time is the node's once
//                  the node confirmed it (the input state's `accepted_at`).
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const PHONE_HOST = '192.168.77.80';

export const runConversationOrderLiveCases = async (probe) => {
  const { runCase, serverAt, freePort, chromium, executablePath, root, waitFor, sleep, assert, selected, shot, sendOver, ensureUnfolded, openRow, rowsOf: listRows, childRow } = probe;
  const ids = ['MSP-106', 'MSP-107'];
  if (selected && !ids.some((id) => selected.has(id))) return;
  if (process.env.RUN_MOBILE_SHELL_LIVE_ORDER !== '1' || !process.env.AUTOBYTEUS_TEST_VAULT) {
    console.log('[mobile-shell] MSP-106, MSP-107 skipped: set RUN_MOBILE_SHELL_LIVE_ORDER=1 and AUTOBYTEUS_TEST_VAULT (real models)');
    return;
  }
  const wants = (id) => !selected || selected.has(id);
  const claudeConfig = path.join(root, 'nu', 'home', 'claude-config');
  await fs.mkdir(claudeConfig, { recursive: true });
  const node = await serverAt('nu', await freePort(), { AUTOBYTEUS_TEST_VAULT: process.env.AUTOBYTEUS_TEST_VAULT,
    CLAUDE_AGENT_SDK_AUTH_MODE: 'api-key', CLAUDE_CONFIG_DIR: claudeConfig });
  const phoneOrigin = `http://${PHONE_HOST}:${node.port}`;
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
  const contexts = [];
  try {
    const gql = (query, variables) => node.gql(query, variables);
    const workspace = path.join(root, 'nu', 'workspace');
    await fs.mkdir(workspace, { recursive: true });
    await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
    const wsUrl = (route) => `${node.baseUrl.replace(/^http/, 'ws')}/ws/${route}`;

    // The node's pairing, once; every phone of the cases opens from it (its stored session).
    const settings = await node.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
    assert(settings.status === 200, 'nu: Phone Access on', settings.status);
    const pairing = await node.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Nu Test Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'nu: a pairing session', pairing.status);
    const pairContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
    contexts.push(pairContext);
    const pairPage = await pairContext.newPage();
    await pairPage.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await pairPage.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    // The node has no runs yet: the list shows its empty state, not the tree.
    await pairPage.locator('[data-testid="mobile-run-list"]').waitFor({ timeout: 60_000 }).catch(async (error) => { await shot(pairPage, 'MSP-106-pairing'); throw error; });
    const paired = await pairContext.storageState();
    const listUrl = `${phoneOrigin}/mobile/`;

    /** A phone of the node's pairing whose clock reads `offsetMs` from the real time; `open(rowKey)` opens a run's conversation. */
    const phoneAt = async (offsetMs, rowKey) => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC', storageState: paired });
      contexts.push(context);
      await context.addInitScript((offset) => {
        const RealDate = Date;
        class OffsetDate extends RealDate {
          constructor(...args) { if (args.length === 0) super(RealDate.now() + offset); else super(...args); }
          static now() { return RealDate.now() + offset; }
        }
        globalThis.Date = OffsetDate;
      }, offsetMs);
      const phonePage = await context.newPage();
      const open = async () => {
        await phonePage.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await phonePage.locator('[data-testid="mobile-run-tree"]:visible').waitFor({ timeout: 60_000 });
        let key = rowKey.member ? null : rowKey.key;
        if (rowKey.member) {
          await waitFor('the Team in the phone\'s list', async () => (await phonePage.locator(`[data-testid="mobile-run-row-${rowKey.key}"]`).count()) > 0, 60_000);
          await ensureUnfolded(phonePage, rowKey.key);
          await waitFor(`${rowKey.member}'s row`, async () => Boolean(key = childRow(await listRows(phonePage), rowKey.key, rowKey.member, 1)?.key), 30_000);
        } else {
          await waitFor('the run in the phone\'s list', async () => (await phonePage.locator(`[data-testid="mobile-run-row-${key}"]`).count()) > 0, 60_000);
        }
        await openRow(phonePage, key);
        await phonePage.locator('[data-testid="mobile-run-conversation"]').waitFor({ timeout: 30_000 });
        await sleep(1_500);
      };
      await open();
      const clockOffsetMs = await phonePage.evaluate(() => Date.now()) - Date.now();
      return { context, page: phonePage, open, clockOffsetMs };
    };

    /** The phone's conversation rows, in the order drawn. */
    const rowsOf = (phonePage) => phonePage.evaluate(() => [...document.querySelectorAll('[data-testid="mobile-run-conversation"] .conv-row')].map((row) => ({
      speaker: row.getAttribute('data-speaker'),
      notice: row.querySelector('[data-testid="system-task-notification-segment"]')?.getAttribute('aria-label') ?? null,
      text: row.innerText.replace(/\s+/g, ' ').trim().slice(0, 120),
    })));
    const order = (rows, marker, noticeLabel) => {
      const message = rows.findIndex((row) => row.speaker === 'user' && row.text.includes(marker));
      const before = message > 0 ? rows[message - 1] : null;
      const next = rows[message + 1] ?? null;
      const after = rows[message + 2] ?? null;
      return { message, before, next, after, ok: message >= 0 && next?.notice === noticeLabel && after?.speaker === 'agent' && before?.notice !== noticeLabel };
    };
    /**
     * The times the phone's own state keeps (AC-006): the message with the marker and the message after it, read from the
     * app's stores (every run state's `conversation.messages`), as epoch ms.
     */
    const stateTimes = (phonePage, marker) => phonePage.evaluate((wanted) => {
      const pinia = document.querySelector('#__nuxt')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (!pinia) return { error: 'no pinia' };
      const seen = new WeakSet();
      const found = [];
      const walk = (value, depth) => {
        if (!value || typeof value !== 'object' || depth > 14 || seen.has(value)) return;
        seen.add(value);
        const messages = value.conversation?.messages;
        if (Array.isArray(messages)) {
          const at = messages.findIndex((message) => message?.type === 'user' && String(message.text ?? '').includes(wanted));
          if (at >= 0) found.push(messages.slice(at, at + 2).map((message) => ({ type: message.type, t: message.timestamp ? new Date(message.timestamp).getTime() : null })));
        }
        // A Team's members live behind its view's private state: read them through the view's own accessor.
        if (typeof value.listAgentContextEntries === 'function') { try { walk(value.listAgentContextEntries(), depth + 1); } catch { /* not a view */ } }
        if (value instanceof Map) { for (const item of value.values()) walk(item, depth + 1); return; }
        for (const key of Object.keys(value)) { let item; try { item = value[key]; } catch { continue; } walk(item, depth + 1); }
      };
      for (const store of pinia._s.values()) walk(store.$state, 0);
      return { found };
    }, marker);
    /** The node's entries around the marker: the message, the next two, with their stored times (ms). */
    const nodeAround = (entries, marker) => {
      const at = entries.findIndex((entry) => entry.kind === 'message' && entry.role === 'user' && entry.content?.includes(marker));
      // A projection entry's `ts` is epoch seconds (a number) or an ISO string.
      const ms = (entry) => (entry?.ts === undefined || entry?.ts === null ? null
        : typeof entry.ts === 'number' ? Math.round(entry.ts < 1e12 ? entry.ts * 1000 : entry.ts) : Date.parse(entry.ts));
      return { at, kinds: entries.slice(at, at + 3).map((entry) => `${entry.kind}${entry.role ? `:${entry.role}` : ''}`),
        user: ms(entries[at]), next: entries[at + 1]?.kind ?? null, notice: entries[at + 1]?.kind === 'system_task_notification' ? ms(entries[at + 1]) : null,
        reply: ms(entries.slice(at + 1).find((entry) => entry.kind === 'message' && entry.role === 'assistant')) };
    };
    /**
     * AC-006: the phone's state times are the node's. The message's time is the node's admission (echo or input state); the
     * agent message's time is its first frame's, the notice's (or the reply's) stored time. Each within 500 ms of the node's,
     * while the phone's own clock is 2 s off.
     */
    const timesCheck = (state, nodeSide) => {
      const pair = state?.found?.[0] ?? [];
      const user = pair[0]?.t ?? null;
      const reply = pair[1]?.t ?? null;
      const near = (a, b) => a !== null && b !== null && Math.abs(a - b) < 500;
      return { user, reply, nodeUser: nodeSide.user, nodeNotice: nodeSide.notice, nodeReply: nodeSide.reply,
        userIsNodeTime: near(user, nodeSide.user), replyIsNodeTime: near(reply, nodeSide.notice) || near(reply, nodeSide.reply) };
    };
    /** One round: change the notice's source, send (from the phone or another client), read live, reopen, read the node. */
    const runRound = async ({ phone, marker, sendFromPhone, sendOther, entries, change, noticeLabel, offsetMs, label }) => {
      await change();
      const rowsBefore = (await rowsOf(phone.page)).length;
      let afterSend = null;
      if (sendFromPhone) {
        const box = phone.page.locator('[data-testid="mobile-run-conversation"] textarea').last();
        await box.fill(`${marker} Reply with one short sentence.`);
        await box.press('Enter');
        await sleep(150);
        afterSend = await stateTimes(phone.page, marker);
      } else {
        await sendOther(`${marker} Reply with one short sentence.`);
      }
      await waitFor(`${label}: the reply`, async () => {
        const all = await entries();
        const at = all.findIndex((entry) => entry.kind === 'message' && entry.role === 'user' && entry.content?.includes(marker));
        return at >= 0 && all.slice(at + 1).some((entry) => entry.kind === 'message' && entry.role === 'assistant');
      }, 180_000);
      await waitFor(`${label}: the round drawn`, async () => (await rowsOf(phone.page)).length >= rowsBefore + 3, 60_000).catch(() => undefined);
      await sleep(1_500);
      const live = order(await rowsOf(phone.page), marker, noticeLabel);
      const liveState = await stateTimes(phone.page, marker);
      await shot(phone.page, `${label}-live`);
      await phone.open();
      await waitFor(`${label}: the message after reopening`, async () => (await rowsOf(phone.page)).some((row) => row.text.includes(marker)), 30_000).catch(() => undefined);
      const reopened = order(await rowsOf(phone.page), marker, noticeLabel);
      const reopenedState = await stateTimes(phone.page, marker);
      await shot(phone.page, `${label}-reopened`);
      const nodeSide = nodeAround(await entries(), marker);
      return { label, offsetMs, clockOffsetMs: phone.clockOffsetMs, marker, live, reopened, node: nodeSide,
        afterSend: afterSend?.found?.[0] ?? null,
        liveTimes: timesCheck(liveState, nodeSide), reopenedTimes: timesCheck(reopenedState, nodeSide) };
    };
    const verdict = (rounds, caseLabel) => rounds.flatMap((round) => [
      [Math.abs(round.clockOffsetMs - round.offsetMs) < 500, `${round.label}: the phone's clock is ${round.offsetMs} ms from the node's`],
      [round.live.ok, `${round.label}: live, the message, then the notice, then the reply (AC-001/AC-002)`],
      [round.reopened.ok, `${round.label}: reopened, the same order (AC-003)`],
      [round.node.next === 'system_task_notification', `${round.label}: the node's entries hold the notice right after the message (D-2, ${caseLabel})`],
      [round.liveTimes.userIsNodeTime && round.liveTimes.replyIsNodeTime, `${round.label}: live, the phone keeps the node's times for the message and the reply (AC-006)`],
      [round.reopenedTimes.userIsNodeTime && round.reopenedTimes.replyIsNodeTime, `${round.label}: reopened, the phone keeps the node's times (AC-006)`],
    ].filter(([ok]) => !ok).map(([, text]) => text));

    if (wants('MSP-106')) await runCase('MSP-106', async () => {
      const models = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: 'claude_agent_sdk' })).providerModelCatalogSnapshots
        .flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier));
      const model = models.find((id) => /haiku/i.test(id)) ?? models[0];
      assert(model, 'a Claude model in the catalog', models);
      const launch = { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: model, llmConfig: null };
      const TOOLS = [['list_projects'], ['list_projects', 'list_project_tasks']];
      const lead = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Live Order Lead', role: 'assistant',
        description: 'Live order lead (phone probe, autobyteus-628)', instructions: 'Answer in one short sentence. Do not use tools unless asked.', toolNames: TOOLS[0], defaultLaunchConfig: launch } })).createAgentDefinition.id;
      const mate = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Live Order Mate', role: 'assistant',
        description: 'Live order mate (phone probe)', instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: launch } })).createAgentDefinition.id;
      const teamDefinitionId = (await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: {
        name: 'Live Order Team', description: 'Live order team (phone probe, autobyteus-628)', instructions: 'Work together.', coordinatorMemberName: 'lead',
        nodes: [{ memberName: 'lead', ref: lead, refScope: 'SHARED' }, { memberName: 'mate', ref: mate, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
      const runConfig = { workspaceRootPath: workspace, autoExecuteTools: true, ...launch };
      const team = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId,
        teamConfigs: [{ teamAddress: '/', ...runConfig }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: lead, ...runConfig }, { memberAddress: '/mate', agentDefinitionId: mate, ...runConfig }] } })).createAgentTeamRun;
      assert(team.success, team.message);
      const tree = JSON.stringify((await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: team.teamRunId })).getTeamRunResumeConfig.executionTree);
      const leadRun = /"address":"\/lead"[^}]*"agent_run_id":"([^"]+)"/.exec(tree)?.[1];
      assert(leadRun, 'the Team\'s /lead run', tree);
      const entries = async () => (await gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}',
        { id: team.teamRunId, a: leadRun })).getTeamMemberRunProjection?.conversation ?? [];
      const teamSay = (content) => sendOver(wsUrl(`agent-team/${team.teamRunId}`), { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`,
        context_file_paths: [], image_urls: [], agent_run_id: leadRun, content });
      await teamSay('ORDER-628-LIVE-FIRST Say hello in one short sentence.');
      await waitFor('/lead\'s first reply', async () => (await entries()).some((entry) => entry.kind === 'message' && entry.role === 'assistant'), 180_000);
      let toolsIndex = 0;
      const change = async () => {
        toolsIndex = 1 - toolsIndex;
        await gql('mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id}}', { input: { id: lead, toolNames: TOOLS[toolsIndex] } });
        await sleep(1_500);
      };
      const rounds = [];
      try {
        for (const [offsetMs, fromPhone] of [[-2_000, true], [2_000, true], [-2_000, false]]) {
          const label = `MSP-106-${offsetMs > 0 ? 'ahead' : 'behind'}-${fromPhone ? 'sends' : 'watches'}`;
          const phone = await phoneAt(offsetMs, { key: `team:${team.teamRunId}`, member: 'lead' });
          rounds.push(await runRound({ phone, marker: `LIVE-628-${randomUUID().slice(0, 8)}`, sendFromPhone: fromPhone, sendOther: teamSay, entries, change,
            noticeLabel: 'Tools updated', offsetMs, label }));
        }
      } finally {
        await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: team.teamRunId }).catch(() => undefined);
      }
      const failures = verdict(rounds, 'rule (a)');
      const details = { model, team: team.teamRunId, lead: leadRun, rounds };
      assert(failures.length === 0, failures.join('; '), details);
      return details;
    });

    if (wants('MSP-107')) await runCase('MSP-107', async () => {
      const wanted = process.env.MOBILE_SHELL_LIVE_OPENAI_MODEL?.trim() || 'gpt-5.4-mini';
      const catalog = (await gql('mutation($p:String!,$r:String){ensureProviderModelCatalog(providerId:$p,runtimeKind:$r){llmModels{modelIdentifier value}}}', { p: 'OPENAI', r: 'autobyteus' }))
        .ensureProviderModelCatalog.llmModels;
      const found = catalog.find((entry) => entry.value === wanted) ?? catalog.find((entry) => entry.modelIdentifier === wanted);
      assert(found, `OPENAI model ${wanted} in the catalog`, catalog.map((entry) => entry.value));
      const launch = { runtimeKind: 'autobyteus', llmModelIdentifier: found.modelIdentifier, llmConfig: null };
      const SKILL = `order-628-skill-${randomUUID().slice(0, 6)}`;
      const skillText = (n) => `# Order 628 skill\n\nVersion ${n}. When asked, answer in one short sentence.\n`;
      await gql('mutation($i:CreateSkillInput!){createSkill(input:$i){name}}', { i: { name: SKILL, description: 'Order 628 live probe skill.', content: skillText(0) } });
      const definition = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Live Order Native', role: 'assistant',
        description: 'Live order native (phone probe, autobyteus-628)', instructions: 'Answer in one short sentence.', toolNames: [], skillNames: [SKILL], defaultLaunchConfig: launch } })).createAgentDefinition.id;
      const created = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: definition, workspaceRootPath: workspace, autoExecuteTools: true, ...launch } })).createAgentRun;
      assert(created.success, created.message);
      const run = created.runId;
      const entries = async () => (await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: run })).getRunProjection?.conversation ?? [];
      const agentSay = (content) => sendOver(wsUrl(`agent/${run}`), { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: run, content });
      await agentSay('ORDER-628-NATIVE-FIRST Say hello in one short sentence.');
      await waitFor('the native run\'s first reply', async () => (await entries()).some((entry) => entry.kind === 'message' && entry.role === 'assistant'), 180_000);
      let version = 0;
      const change = async () => {
        version += 1;
        await gql('mutation($i:UpdateSkillInput!){updateSkill(input:$i){name}}', { i: { name: SKILL, content: skillText(version) } });
        await sleep(2_500);
      };
      const rounds = [];
      try {
        for (const offsetMs of [-2_000, 2_000]) {
          const label = `MSP-107-${offsetMs > 0 ? 'ahead' : 'behind'}-sends`;
          const phone = await phoneAt(offsetMs, { key: `agent:${run}` });
          rounds.push(await runRound({ phone, marker: `NATIVE-628-${randomUUID().slice(0, 8)}`, sendFromPhone: true, sendOther: agentSay, entries, change,
            noticeLabel: 'Skill updated', offsetMs, label }));
        }
      } finally {
        await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: run }).catch(() => undefined);
      }
      const failures = verdict(rounds, 'rule (b)');
      const details = { model: found.value, run, skill: SKILL, rounds };
      assert(failures.length === 0, failures.join('; '), details);
      return details;
    });
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    await node.stop();
  }
};
