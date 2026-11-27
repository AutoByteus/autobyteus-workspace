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
 * The gap and the page's recovery: arms the wire, has another window send `content`, and waits for the withheld frame and
 * then the snapshot of a new Team stream link (the replacement). `consoleLines` is the page's console (recovery failures
 * are logged as "Team stream recovery of … failed").
 */
export const teamStreamGap = async ({ wire, socketBase, teamRunId, agentRunId, content, until, consoleLines }) => {
  const path = `/ws/agent-team/${teamRunId}`;
  const from = wire.log.length;
  const consoleFrom = consoleLines.length;
  const linksBefore = new Set(wire.log.filter((f) => f.url === path).map((f) => f.link));
  wire.withholdBeforeTeamIdle = true;
  await otherWindowTeamSend({ socketBase, teamRunId, agentRunId, content, until });
  let withheld = null;
  await until('a Team frame withheld before the idle status', () => Boolean(withheld = wire.since(from).find((f) => f.note === 'withheld by the wire' && f.url === path)), 60_000);
  let replacement = null;
  await until('the page\'s replacement Team stream snapshot', () => Boolean(replacement = wire.since(from).find((f) => f.url === path && f.dir === 'down'
    && f.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT' && f.at >= withheld.at && !linksBefore.has(f.link))), 30_000);
  const lines = consoleLines.slice(consoleFrom);
  return {
    withheld: { type: withheld.type, seq: withheld.seq },
    recoveredAfterMs: replacement.at - withheld.at,
    gapSeen: lines.some((line) => line.includes('TEAM_EXECUTION_CHANGE_SEQUENCE_GAP')),
    failedAttempts: lines.filter((line) => line.includes('Team stream recovery of')).length,
    replacementLink: replacement.link,
  };
};
