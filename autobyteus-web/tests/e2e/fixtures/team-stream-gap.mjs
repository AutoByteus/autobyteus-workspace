// A real gap in a Team stream for the probes (autobyteus-541 AC-001), desktop (`send-delivery-probe.mjs` SDD-14) and phone
// (`mobile-team-stream-recovery-cases.mjs` MSP-119). Test code only.
//
// Another window (a client of the node, not through the page's wire) sends the Team member a message the scripted runtime
// answers at once. The page's wire withholds the numbered frame right before the member's idle status
// (`withholdBeforeTeamIdle`), so the page sees the idle status past a gap when the Team has finished: the stream needs
// recovery and the page must recover it by itself. `teamStreamGap` resolves with when the frame was withheld, when the
// page's new Team stream had its snapshot, and the page's own recovery lines.
import { randomUUID } from 'node:crypto';
import { ownerSocketUrl } from './probe-node-access.mjs';
import { waitRunSocketReady } from './run-socket-ready.mjs';

/** Another window's message to a Team member, on the Team's own stream; resolves once the node took it. */
export const otherWindowTeamSend = async ({ socketBase, teamRunId, agentRunId, content, until }) => {
  const route = `agent-team/${teamRunId}`;
  const socket = new WebSocket(ownerSocketUrl(`${socketBase}/ws/${route}`));
  const frames = [];
  socket.onmessage = (event) => { try { frames.push(JSON.parse(String(event.data))); } catch { /* not JSON */ } };
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  try {
    await waitRunSocketReady(frames, route);
    const messageId = randomUUID();
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content, context_file_paths: [], image_urls: [], agent_run_id: agentRunId,
      message_id: messageId, dedupe_key: `member_input:${teamRunId}:${agentRunId}:${messageId}` } }));
    await until('the other window\'s message taken', () => frames.some((f) => f.type === 'MEMBER_INPUT_MESSAGE' && f.payload?.message_id === messageId), 30_000);
  } finally { socket.close(); }
};

/**
 * The gap: arms the wire, has another window send `content`, and waits for the withheld frame. `consoleLines` is the
 * page's console (recovery failures are logged as "Team stream recovery of … failed"). `withhold`: `'before-idle'` (the
 * frame before the idle status: the Team has finished, the page last applied Running) or `'first'` (the turn's first
 * numbered frame: the page keeps the member Idle, while the Team works on).
 */
export const makeTeamStreamGap = async ({ wire, socketBase, teamRunId, agentRunId, content, until, consoleLines, withhold = 'before-idle' }) => {
  const path = `/ws/agent-team/${teamRunId}`;
  const from = wire.log.length;
  const consoleFrom = consoleLines.length;
  const linksBefore = new Set(wire.log.filter((f) => f.url === path).map((f) => f.link));
  if (withhold === 'first') wire.withholdNextTeamEvent = true;
  else wire.withholdBeforeTeamIdle = true;
  await otherWindowTeamSend({ socketBase, teamRunId, agentRunId, content, until });
  let withheld = null;
  await until('a Team frame withheld before the idle status', () => Boolean(withheld = wire.since(from).find((f) => f.note === 'withheld by the wire' && f.url === path)), 60_000);
  return { path, from, consoleFrom, linksBefore, withheld };
};

/** The page's recovery of `gap`: the snapshot of a new Team stream link (the replacement), within `timeoutMs`. */
export const waitForTeamStreamReplacement = async (gap, { wire, until, consoleLines, timeoutMs = 30_000 }) => {
  let replacement = null;
  await until('the page\'s replacement Team stream snapshot', () => Boolean(replacement = wire.since(gap.from).find((f) => f.url === gap.path && f.dir === 'down'
    && f.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT' && f.at >= gap.withheld.at && !gap.linksBefore.has(f.link))), timeoutMs);
  const lines = consoleLines.slice(gap.consoleFrom);
  return {
    withheld: { type: gap.withheld.type, seq: gap.withheld.seq },
    recoveredAfterMs: replacement.at - gap.withheld.at,
    gapSeen: lines.some((line) => line.includes('TEAM_EXECUTION_CHANGE_SEQUENCE_GAP')),
    failedAttempts: lines.filter((line) => line.includes('Team stream recovery of')).length,
    replacementLink: replacement.link,
  };
};

/** The gap and the page's recovery (AC-001). */
export const teamStreamGap = async (input) => waitForTeamStreamReplacement(await makeTeamStreamGap(input), input);

/**
 * The node unreachable for the recovery's reads only (autobyteus-541 AC-002): the page's Team execution checkpoint
 * queries fail as a dropped request would; everything else passes. Resolves with a release that lets them through again.
 */
export const refuseTeamRecoveryReads = async (page) => {
  let refused = 0;
  const handler = (route) => {
    const body = route.request().postData() ?? '';
    if (body.includes('GetTeamRunExecutionCheckpoint')) { refused += 1; return route.abort('failed'); }
    return route.fallback();
  };
  const graphql = (url) => url.pathname.endsWith('/graphql');
  await page.route(graphql, handler);
  return { refused: () => refused, release: () => page.unroute(graphql, handler) };
};
