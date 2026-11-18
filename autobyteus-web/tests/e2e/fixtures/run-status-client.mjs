// A probe's own `/ws/run-status` client (autobyteus-461 SR-082, SR-083): each run's statuses read by run ID from the run
// itself, and a notice when a run's rows changed. It is the server's answer the window renders, read without the window.
//
//   const feed = await openRunStatus(backendUrl)            // one connection, as a window holds one
//   await feed.subscribe([{ kind: 'agent', runId }])         // RUN_STATUS_SNAPSHOT for these runs
//   feed.statusOf('agent', runId, agentRunId)                // the latest status of one agent of a subscribed run
//   await feed.waitStatus('agent', runId, agentRunId, (s) => s === 'idle')
//   await feed.waitTreeChanged('agent', runId, sinceIndex)   // RUN_TREE_CHANGED after `feed.messages.length` was read
//   feed.close()
//
// The socket carries the probe's owner credential (fixtures/probe-node-access.mjs) as the other probe sockets do.
import { ownerSocketUrl } from './probe-node-access.mjs';

const key = (kind, runId) => `${kind}:${runId}`;

export const openRunStatus = async (backendUrl, { timeoutMs = 30_000 } = {}) => {
  const socket = new WebSocket(ownerSocketUrl(`${backendUrl.replace(/^http/, 'ws')}/ws/run-status`));
  const messages = [];
  /** `kind:runId` → Map(agentRunId → status). */
  const statuses = new Map();
  const waiters = new Set();
  socket.addEventListener('message', (event) => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    message.at = Date.now();
    messages.push(message);
    if (message.type === 'RUN_STATUS_SNAPSHOT') {
      for (const run of message.payload.runs) statuses.set(key(run.kind, run.runId), new Map(run.agents.map((a) => [a.agentRunId, a.status])));
    } else if (message.type === 'RUN_STATUS_CHANGED') {
      const p = message.payload;
      const map = statuses.get(key(p.kind, p.runId)) ?? new Map();
      map.set(p.agentRunId, p.status);
      statuses.set(key(p.kind, p.runId), map);
    }
    for (const waiter of [...waiters]) waiter();
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('run-status socket did not open')), timeoutMs);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('run-status socket error')); }, { once: true });
  });
  const until = (label, predicate, ms) => new Promise((resolve, reject) => {
    const check = () => { const value = predicate(); if (value) { waiters.delete(check); clearTimeout(timer); resolve(value); } };
    const timer = setTimeout(() => { waiters.delete(check); reject(Object.assign(new Error(`Timed out waiting for run-status: ${label}`), { details: { recent: messages.slice(-12) } })); }, ms);
    waiters.add(check);
    check();
  });
  const send = (type, runs) => socket.send(JSON.stringify({ type, payload: { runs } }));
  return {
    messages,
    /** Subscribes and waits until every run has its snapshot. */
    subscribe: async (runs, ms = 30_000) => {
      send('SUBSCRIBE', runs);
      await until(`snapshot of ${runs.map((r) => r.runId).join(', ')}`, () => runs.every((r) => statuses.has(key(r.kind, r.runId))), ms);
    },
    unsubscribe: (runs) => send('UNSUBSCRIBE', runs),
    /** The run's agents and their latest statuses (`{}` when not subscribed). */
    agentsOf: (kind, runId) => Object.fromEntries(statuses.get(key(kind, runId)) ?? []),
    statusOf: (kind, runId, agentRunId) => statuses.get(key(kind, runId))?.get(agentRunId) ?? null,
    waitStatus: (kind, runId, agentRunId, predicate, ms = 60_000) =>
      until(`${runId}/${agentRunId}`, () => { const s = statuses.get(key(kind, runId))?.get(agentRunId); return s && predicate(s) ? s : null; }, ms),
    /** A RUN_TREE_CHANGED for the run received after message index `since`. */
    waitTreeChanged: (kind, runId, since = 0, ms = 60_000) =>
      until(`tree change of ${runId}`, () => messages.slice(since).find((m) => m.type === 'RUN_TREE_CHANGED' && m.payload.kind === kind && m.payload.runId === runId), ms),
    close: () => { try { socket.close(); } catch { /* closed */ } },
  };
};
