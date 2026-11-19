// Stop generation on the phone, for every run kind (autobyteus-533 AC-003, AC-004, AC-006, AC-007, AC-009, AC-010,
// QR-001, QR-003). Cases of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` on its
// paired phone page (`--cases=MSP-80,MSP-81,MSP-82,MSP-83,MSP-84` runs only these). Every run here is the cases' own, on
// alpha's scripted Antigravity runtime (`HOLD_TURN` keeps a turn running; a Stop takes the AGY run offline and the next
// message restores it), except MSP-84's run on beta. The phone's sockets pass through the probe's wire
// (`fixtures/stop-generation-wire.mjs`), which logs the Stops the phone sends and the node's answers, and can slow the
// phone's downlink, drop its path or turn the node's answer into a refusal (no scripted runtime refuses a Stop).
//
// For each kind, on the phone's run screen, with taps on the composer's button:
//   - a double tap (gaps 0 and 150 ms): one Stop sent, answered `accepted`, the spinner and "Stopping…" (aria-busy,
//     disabled) seen, then not Running; no toast;
//   - Stop after the turn ended: another window's Stop ends the turn while the phone, on a slower downlink, still shows
//     Running; the phone's Stop finds nothing to stop: `accepted`, no toast, "Stopping…" until the status arrives;
//   - a refusal: one message "Could not stop <name>. Please try again.", the name as the phone shows the agent, no run id
//     or internal words; Stop offered again;
//   - (MSP-80, MSP-81, MSP-82, MSP-84) not connected: the phone's path drops while the run works; where the screen still
//     offers Stop, the tap sends nothing and shows one message "Stop was not sent: not connected to the node. …" (an Org
//     member's Stop is disabled while its Org stream is not ready: nothing to tap, nothing shown).
//   MSP-80 AC-010  A standalone agent run.
//   MSP-81 AC-010  A Team member (a Team run's coordinator, which the Team row opens).
//   MSP-82 AC-004  An Org member (the Org's first member, an agent) and a member of the Org's own Team (squad's reviewer).
//   MSP-83 AC-004  A delegated agent (a task agent of an agent run) and a delegated Team's member.
//   MSP-84 AC-004  A run on beta (a peer run, delegated by an alpha run); then beta stops while the run works: if the phone
//                  still offers Stop, a tap shows at most one plain message (naming the agent when it names anyone); the
//                  phone may instead show the run "Not reachable" with nothing to tap. Beta is started again.
import { randomUUID } from 'node:crypto';
import { ownerSocketUrl } from './fixtures/probe-node-access.mjs';
import { waitRunSocketReady } from './fixtures/run-socket-ready.mjs';
import { internalWords, readStopTrace, startStopTrace } from './fixtures/stop-generation-wire.mjs';
import { readRunTree } from './fixtures/run-tree.mjs';

const STOP = 'Stop generation';
const STOPPING = 'Stopping…';
const NOT_SENT = 'Stop was not sent: not connected to the node. Check the connection and try again.';
const couldNotStop = (name) => `Could not stop ${name}. Please try again.`;

/**
 * @param probe `runCase`, `page` (the paired phone), `stack`, `alpha`, `beta`, `sel`, `toList`, `openRow`, `ensureUnfolded`,
 *   `rowsOf`, `runScreen`, `shot`, `waitFor`, `sleep`, `assert`, `selected`, `phoneWire`, `peer` (beta's name on alpha).
 */
export const runStopGenerationCases = async (probe) => {
  const { runCase, page, stack, alpha, beta, sel, toList, openRow, ensureUnfolded, rowsOf, runScreen, shot, waitFor, sleep, assert, phoneWire: wire } = probe;
  const ids = ['MSP-80', 'MSP-81', 'MSP-82', 'MSP-83', 'MSP-84'];
  if (probe.selected && !ids.some((id) => probe.selected.has(id))) return;
  const gql = (query, variables) => alpha.gql(query, variables);
  const pickId = (text, key) => new RegExp(`${key}\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)`).exec(text ?? '')?.[1] ?? null;
  const SCOPE = sel('mobile-run-conversation');
  const textarea = () => page.locator(`${SCOPE} textarea`).last();
  const button = () => page.locator(`${SCOPE} button[aria-label="Send message"], ${SCOPE} button[aria-label="${STOP}"], ${SCOPE} button[aria-label="${STOPPING}"]`).last();
  const label = () => button().getAttribute('aria-label').catch(() => null);
  const offered = async () => (await label()) === STOP && await button().isEnabled().catch(() => false);
  const tapButton = async () => { const box = await button().boundingBox(); const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }; await page.touchscreen.tap(point.x, point.y); return point; };

  // ---- the case's own runs ----
  const createAgentRun = async (agentDefinitionId) => {
    const r = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId, ...stack.runConfig } })).createAgentRun;
    assert(r.success, r.message);
    return r.runId;
  };
  const teamMembers = async (teamRunId) => Object.fromEntries(((await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRunId }))
    .getTeamRunResumeConfig.executionTree.root_team?.members ?? []).map((m) => [m.address, m.agent_run_id]));
  const orgMembers = async (orgRunId) => {
    const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: orgRunId })).getAgentOrgRunConfig.executionTree;
    const members = {};
    for (const node of tree.rootOrg.members) {
      if (node.agentRunId) members[node.address] = node.agentRunId;
      for (const member of node.members ?? []) members[member.address] = member.agentRunId;
    }
    return members;
  };
  const terminate = {
    agent: (id) => gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id }).catch(() => undefined),
    team: (id) => gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id }).catch(() => undefined),
    org: (id) => gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id }).catch(() => undefined),
  };

  // ---- the phone ----
  const rowsUnder = (rows, parentKey) => {
    const start = rows.findIndex((row) => row.key === parentKey);
    if (start < 0) return [];
    const under = [];
    for (let index = start + 1; index < rows.length && rows[index].depth > rows[start].depth; index += 1) under.push(rows[index]);
    return under;
  };
  /** The run list, then the row `rootKey`, or the row reached from it by `steps` (name patterns, each under the previous). */
  const openOnPhone = async (rootKey, steps = []) => {
    await toList(page);
    await waitFor(`${rootKey} on the phone`, async () => {
      if (await page.locator(sel(`mobile-run-row-${rootKey}`)).count()) return true;
      const fold = page.locator(sel('mobile-run-list-show-older'));
      if ((await fold.count()) && (await fold.innerText()).startsWith('Show older')) await fold.click();
      return false;
    }, 60_000);
    let key = rootKey;
    for (const step of steps) {
      await ensureUnfolded(page, key);
      let next = null;
      await waitFor(`${step} under ${key}`, async () => Boolean(next = rowsUnder(await rowsOf(page), key).find((row) => step.test(row.name))?.key), 60_000).catch(() => undefined);
      assert(next, `the row ${step} under ${key}`, rowsUnder(await rowsOf(page), rootKey).map((row) => ({ key: row.key, name: row.name, depth: row.depth })));
      key = next;
    }
    await openRow(page, key);
    await page.locator(SCOPE).waitFor({ timeout: 30_000 });
    await waitFor('the composer', async () => (await textarea().count()) > 0, 30_000);
    await startStopTrace(page, SCOPE);
    await sleep(1_000);
    return runScreen(page);
  };
  /**
   * The user's message; resolves once the node holds the turn (its held step reached the phone) and Stop is offered. A
   * message that does not start its turn fails the case at once (autobyteus-540 D-7); the stall is recorded.
   */
  const sends = { count: 0, stalls: [] };
  const holdTurn = async (marker) => {
    sends.count += 1;
    const holdsBefore = wire.holds.length; const from = wire.log.length; const at = Date.now();
    await waitFor('Send enabled', async () => { if (!(await textarea().inputValue().catch(() => ''))) await textarea().fill(`HOLD_TURN ${marker}`); return (await label()) === 'Send message' && await button().isEnabled(); }, 60_000);
    await button().click();
    try {
      await waitFor('the held turn and Stop', async () => wire.holds.length > holdsBefore && await offered(), 60_000);
      await sleep(500);
    } catch {
      sends.stalls.push({ marker, at: new Date(at).toISOString(), button: await label(), draft: await textarea().inputValue().catch(() => null),
        frames: wire.since(from).map((f) => ({ ...f, at: f.at - at })) });
      await shot(page, `stall-${marker}`);
      throw Object.assign(new Error(`The message "${marker}" did not start a turn (a lost send)`), { details: sends.stalls.at(-1) });
    }
  };
  const settle = async () => {
    for (let i = 0; i < 3 && await offered(); i += 1) { await button().click().catch(() => undefined); await sleep(1_500); }
    await waitFor('Stop gone', async () => ![STOP, STOPPING].includes(await label()), 30_000).catch(() => undefined);
    await sleep(800);
  };
  const observed = async (from, since) => {
    const frames = wire.since(from);
    const trace = await readStopTrace(page, since);
    const answer = (a) => [a.state, a.code].filter(Boolean).join(':');
    const ofStop = (f) => f.type === 'AGENT_COMMAND_ACK' && f.commandType === 'INTERRUPT_GENERATION';
    return {
      stops: frames.filter((f) => f.dir === 'up' && f.type === 'INTERRUPT_GENERATION').length,
      // What the phone received, and what the node answered (before any delay; the phone may never receive it).
      acks: frames.filter((f) => f.dir === 'down' && ofStop(f)).map(answer),
      nodeAnswers: frames.filter((f) => f.dir === 'node' && ofStop(f)).map(answer),
      toasts: trace.toasts.map(([, t]) => t),
      button: trace.button.map(([at, l, busy, enabled]) => [at - since, l, busy, enabled]),
    };
  };
  const sawStopping = (button) => button.some(([, l, busy, enabled]) => l === STOPPING && busy && !enabled);
  const endsOff = (button) => { const last = button.at(-1); return Boolean(last) && ![STOP, STOPPING].includes(last[1]); };
  const leftRunning = () => waitFor('the status left Running', async () => ![STOP, STOPPING].includes(await label()), 30_000).catch(() => undefined);

  /** Another window's Stop on the run's own stream (`route` on `node`), as a second client sends it. */
  const otherWindowStop = async (node, route, payload) => {
    const socket = new WebSocket(ownerSocketUrl(`${node.baseUrl.replace(/^http/, 'ws')}/ws/${route}`));
    const frames = [];
    socket.onmessage = (event) => { try { frames.push(JSON.parse(String(event.data))); } catch { /* not JSON */ } };
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    try {
      await waitRunSocketReady(frames, route);
      const commandId = randomUUID();
      socket.send(JSON.stringify({ type: 'INTERRUPT_GENERATION', payload: { ...payload, command_id: commandId } }));
      let ack = null;
      await waitFor('the other window\'s Stop answered', async () => Boolean(ack = frames.find((f) => f.type === 'AGENT_COMMAND_ACK' && f.payload?.command_id === commandId)), 30_000);
      return { state: ack.payload.state, code: ack.payload.code ?? null };
    } finally { socket.close(); }
  };

  /**
   * The journey on the open run: double taps, Stop after the turn ended, a refusal and (optionally) not connected.
   * `kind.other` is the other window's Stop; `kind.runIds` the ids no message may show.
   */
  const journey = async (label_, kind) => {
    const screen = await runScreen(page);
    const shownText = `${screen.name ?? ''} ${screen.subtitle ?? ''} ${screen.conversation ?? ''}`;
    const result = { screen: { name: screen.name, subtitle: screen.subtitle }, rounds: {} };
    // The first message (re)starts the runtime.
    await holdTurn(`${label_}-start`);
    await settle();
    for (const gap of [0, 150]) {
      await holdTurn(`${label_}-gap${gap}`);
      const from = wire.log.length; const since = Date.now();
      const point = await tapButton();
      await sleep(Math.max(0, gap - (Date.now() - since)));
      await page.touchscreen.tap(point.x, point.y);
      const secondAt = Date.now() - since;
      await sleep(2_500);
      await leftRunning();
      await sleep(300);
      const seen = await observed(from, since);
      result.rounds[`gap${gap}`] = { ...seen, secondAt, secondLabel: [...seen.button].reverse().find(([at]) => at <= secondAt)?.[1] ?? null };
      await shot(page, `${label_}-double-tap-gap${gap}`);
    }
    // Stop after the turn ended.
    await holdTurn(`${label_}-stale`);
    wire.extraToPageMs = 1_500;
    const other = await kind.other();
    let from = wire.log.length; let since = Date.now();
    const labelWhenTapped = await label();
    await tapButton();
    await sleep(4_000);
    await leftRunning();
    wire.extraToPageMs = 0;
    await sleep(300);
    result.stale = { other, labelWhenTapped, ...(await observed(from, since)) };
    await shot(page, `${label_}-stop-after-turn-ended`);
    // A refusal.
    await holdTurn(`${label_}-refused`);
    wire.refuseStops = true;
    from = wire.log.length; since = Date.now();
    await tapButton();
    await sleep(2_000);
    wire.refuseStops = false;
    result.refused = { ...(await observed(from, since)), after: { label: await label(), enabled: await button().isEnabled().catch(() => false) } };
    await shot(page, `${label_}-refused`);
    await settle();
    // Not connected.
    if (kind.notConnected) {
      await holdTurn(`${label_}-not-connected`);
      from = wire.log.length; since = Date.now();
      wire.cut('the phone\'s path is down');
      await sleep(250);
      const offeredWhenDown = { label: await label(), enabled: await button().isEnabled().catch(() => false) };
      if (offeredWhenDown.label === STOP && offeredWhenDown.enabled) await tapButton();
      await sleep(1_500);
      result.notConnected = { offeredWhenDown, ...(await observed(from, since)) };
      await shot(page, `${label_}-not-sent`);
      const upAt = Date.now();
      wire.up();
      // The phone's stream of this run back, with its status (every stream the screen uses reconnects on its own backoff).
      await waitFor('the phone\'s streams back', async () => wire.log.some((f) => f.at >= upAt && f.dir === 'down' && /STATUS|SNAPSHOT/.test(f.type)), 60_000).catch(() => undefined);
      await sleep(3_000);
      await settle();
    }

    // The assertions, after the whole journey (its evidence is complete either way).
    const bad = Object.entries(result.rounds).filter(([, r]) => r.stops !== 1 || r.acks.join() !== 'accepted' || r.toasts.length || !sawStopping(r.button) || !endsOff(r.button));
    assert(!bad.length, `${label_}: every double tap sends one Stop, answered accepted; "Stopping…" seen; then not Running; no toast`, result);
    assert(result.stale.other.state === 'accepted' && result.stale.labelWhenTapped === STOP, `${label_}: the other window stopped the turn while the phone still showed Stop`, result);
    assert(result.stale.stops === 1 && result.stale.nodeAnswers.join() === 'accepted' && !result.stale.toasts.length && sawStopping(result.stale.button) && endsOff(result.stale.button),
      `${label_}: Stop after the turn ended: accepted, no toast, "Stopping…" until the status`, result);
    const refusal = result.refused.toasts;
    const named = refusal.length === 1 ? /^Could not stop (.+)\. Please try again\.$/.exec(refusal[0])?.[1] ?? null : null;
    result.refusedName = named;
    assert(result.refused.stops === 1 && refusal.length === 1 && named && refusal[0] === couldNotStop(named), `${label_}: a refusal shows one plain message naming the agent`, result);
    assert(shownText.includes(named), `${label_}: the message names the agent as the phone shows it`, { named, shownText: shownText.slice(0, 400), result });
    assert(result.refused.after.label === STOP && result.refused.after.enabled, `${label_}: the refusal ends Stopping; the run still works: Stop offered again`, result);
    if (kind.notConnected) {
      // Where the screen still offers Stop, the tap sends nothing and shows the one plain message; where it does not (an
      // Org member's Stop is disabled while its Org stream is not ready), there is nothing to tap and nothing is shown.
      const n = result.notConnected;
      const pressable = n.offeredWhenDown.label === STOP && n.offeredWhenDown.enabled;
      n.pressable = pressable;
      assert(n.stops === 0 && (pressable ? n.toasts.length === 1 && n.toasts[0] === NOT_SENT : n.toasts.length === 0),
        `${label_}: not connected: nothing sent; one plain message when Stop could be tapped, else nothing to tap`, result);
    }
    const words = [...refusal, ...(result.notConnected?.toasts ?? [])].flatMap((t) => internalWords(t, kind.runIds));
    assert(!words.length, `${label_}: no run id or internal words`, { words, result });
    return result;
  };

  /** A case body with the sends it made and their stalls (CG-07) in its evidence; the wire plain again afterwards. */
  const stopCase = (fn) => async () => {
    sends.count = 0; sends.stalls = [];
    try {
      const details = await fn();
      return { ...details, sends: sends.count, sendStalls: sends.stalls };
    } catch (error) {
      error.details = { ...(error.details ?? {}), sends: sends.count, sendStalls: sends.stalls };
      throw error;
    } finally { wire.reset(); }
  };

  await runCase('MSP-80', stopCase(async () => {
    const runId = await createAgentRun(stack.ids.checker);
    await openOnPhone(`agent:${runId}`);
    const details = await journey('MSP-80-standalone', { runIds: [runId], notConnected: true,
      other: () => otherWindowStop(alpha, `agent/${runId}`, {}) });
    await terminate.agent(runId);
    return { runId, ...details };
  }));

  await runCase('MSP-81', stopCase(async () => {
    const created = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: {
      teamDefinitionId: stack.ids.delivery, teamConfigs: [{ teamAddress: '/', ...stack.runConfig }],
      memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: stack.ids.checker, ...stack.runConfig },
        { memberAddress: '/mate', agentDefinitionId: stack.ids.writer, ...stack.runConfig }] } })).createAgentTeamRun;
    assert(created.success, created.message);
    const teamRunId = created.teamRunId;
    const lead = (await teamMembers(teamRunId))['/lead'];
    await openOnPhone(`team:${teamRunId}`);
    const details = await journey('MSP-81-team-member', { runIds: [teamRunId, lead], notConnected: true,
      other: () => otherWindowStop(alpha, `agent-team/${teamRunId}`, { agent_run_id: lead }) });
    await terminate.team(teamRunId);
    return { teamRunId, lead, ...details };
  }));

  await runCase('MSP-82', stopCase(async () => {
    const r = (await gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
      { i: { agentOrgDefinitionId: stack.ids.org, rootConfiguration: stack.runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    assert(r.success, r.message);
    const orgRunId = r.agentOrgRunId;
    const members = await orgMembers(orgRunId);
    const planner = members['/planner'];
    const squadReviewer = Object.entries(members).find(([address]) => /\/reviewer$/.test(address) && address !== '/reviewer')?.[1];
    const orgStop = (agentRunId) => () => otherWindowStop(alpha, `agent-org/${orgRunId}`, { root_subject_kind: 'agent_org', root_run_id: orgRunId, target_agent_run_id: agentRunId });
    await openOnPhone(`org:${orgRunId}`);
    const member = await journey('MSP-82-org-member', { runIds: [orgRunId, planner], notConnected: true, other: orgStop(planner) });
    await openOnPhone(`org:${orgRunId}`, [/squad/i, /^reviewer$/i]);
    const orgTeamMember = await journey('MSP-82-org-team-member', { runIds: [orgRunId, squadReviewer], other: orgStop(squadReviewer) });
    await terminate.org(orgRunId);
    return { orgRunId, planner, squadReviewer, member, orgTeamMember };
  }));

  // An agent run that delegates: a task agent, a task team and (MSP-84) a run on beta.
  const delegator = { runId: null };
  const delegatorRun = async () => {
    if (delegator.runId) return delegator;
    delegator.runId = await createAgentRun(stack.ids.ptm);
    delegator.agent = pickId(await stack.agentCall(delegator.runId, 'delegate_task', { recipient_address: '/release_notes_writer', description: 'Stop probe task agent. Marker 533-TASK-AGENT.' }), 'target_agent_run_id');
    delegator.team = pickId(await stack.agentCall(delegator.runId, 'delegate_task', { recipient_address: '/docs_review_team', description: 'Stop probe task team. Marker 533-TASK-TEAM.' }), 'target_team_run_id');
    delegator.remote = pickId(await stack.agentCall(delegator.runId, 'delegate_task', { node: probe.peer, recipient_address: '/publisher', description: 'Stop probe remote run. Marker 533-REMOTE.' }), 'target_agent_run_id');
    assert(delegator.agent && delegator.team && delegator.remote, 'the delegator delegated a task agent, a task team and a run on beta', delegator);
    return delegator;
  };

  await runCase('MSP-83', stopCase(async () => {
    const { runId, agent, team } = await delegatorRun();
    await waitFor('the delegated runs in the tree', async () => ((await readRunTree(gql, 'agent', runId)).rows ?? []).length >= 2, 60_000).catch(() => undefined);
    const reviewer = (await teamMembers(team))['/reviewer'];
    await openOnPhone(`agent:${runId}`, [/release notes writer/i]);
    const taskAgent = await journey('MSP-83-task-agent', { runIds: [runId, agent], other: () => otherWindowStop(alpha, `agent/${agent}`, {}) });
    await openOnPhone(`agent:${runId}`, [/docs review team/i, /^reviewer$/i]);
    const taskTeamMember = await journey('MSP-83-task-team-member', { runIds: [runId, team, reviewer], other: () => otherWindowStop(alpha, `agent-team/${team}`, { agent_run_id: reviewer }) });
    await terminate.team(team);
    await terminate.agent(agent);
    return { delegator: runId, agent, team, reviewer, taskAgent, taskTeamMember };
  }));

  await runCase('MSP-84', stopCase(async () => {
    const { runId, remote } = await delegatorRun();
    await openOnPhone(`agent:${runId}`, [/publisher/i]);
    const peer = await journey('MSP-84-peer-run', { runIds: [runId, remote], notConnected: true, other: () => otherWindowStop(beta, `agent/${remote}`, {}) });

    // Beta stops while the phone shows the run working: a real failure path.
    await holdTurn('MSP-84-beta-down');
    const from = wire.log.length; const since = Date.now();
    await beta.stop();
    const afterStop = { label: await label(), enabled: await button().isEnabled().catch(() => false) };
    let tapped = false;
    await waitFor('the phone still offers Stop, or not', async () => { const l = await label(); return l !== STOP || Date.now() - since > 1_500; }, 5_000).catch(() => undefined);
    if (await offered()) { await tapButton(); tapped = true; }
    await sleep(6_000);
    const betaDown = { afterStop, tapped, stopPressableAfterBetaStopped: tapped, ...(await observed(from, since)), screen: await runScreen(page),
      frames: wire.since(from).map((f) => `${f.at - since} ${f.dir} ${f.url} ${f.type}${f.state ? ` ${f.state}` : ''}${f.code ? ` ${f.code}` : ''}${f.message ? ` "${f.message}"` : ''}`) };
    await shot(page, 'MSP-84-beta-down');
    await beta.start();
    await probe.waitPeerBack?.();
    await terminate.agent(runId);
    const named = betaDown.toasts.map((t) => /^Could not stop (.+)\. Please try again\.$/.exec(t)?.[1] ?? null);
    const details = { delegator: runId, remote, peer, betaDown };
    assert(betaDown.toasts.length <= 1, 'beta down: at most one message', details);
    assert(betaDown.toasts.every((t) => t === NOT_SENT || named[0]), 'beta down: the message is one of the two plain ones', details);
    assert(!betaDown.toasts.flatMap((t) => internalWords(t, [runId, remote])).length, 'beta down: no run id or internal words', details);
    if (named[0]) assert(`${betaDown.screen.name} ${betaDown.screen.conversation ?? ''}`.includes(named[0]), 'beta down: the message names the agent as the phone shows it', details);
    return details;
  }));
};
