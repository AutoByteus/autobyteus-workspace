// Provider-free, test-owned JSON-RPC child. No Codex binary, model, profile or credentials.
// 0.160.0 interruption order: interrupt response -> idle status -> turn/completed.
// SD017 contrast: native typed terminal emitted automatically, without latch or sleep.
import readline from 'node:readline';
let nextThread = 1;
const requests = [];
let holdStart = false;
let heldStart = null;
const send = value => process.stdout.write(`${JSON.stringify(value)}\n`);
const notify = (method, params) => send({ method, params });
for await (const line of readline.createInterface({ input: process.stdin })) {
  const request = JSON.parse(line);
  const { id, method, params = {} } = request;
  if (id === undefined) continue;
  requests.push({ method, params });
  let result = {};
  if (method === 'thread/start') result = { thread: { id: `owned-thread-${nextThread++}` } };
  if (method === 'turn/start') {
    result = { turn: { id: `${params.threadId}-turn` } };
    notify('turn/started', { threadId: params.threadId, turn: result.turn });
    if (holdStart) { holdStart = false; heldStart = { id, result }; continue; }
  }
  if (method === 'test/holdStart') holdStart = true;
  if (method === 'test/releaseStart' && heldStart) { send(heldStart); heldStart = null; }
  if (method === 'test/requests') result = requests;
  send({ id, result });
  if (method === 'turn/interrupt') {
    notify('thread/status/changed', { threadId: params.threadId, status: { type: 'idle' } });
    notify('turn/completed', { threadId: params.threadId, turn: { id: params.turnId, status: 'interrupted', error: null } });
  }
  if (method === 'test/terminal') {
    notify('turn/completed', {
      threadId: params.threadId,
      turn: { id: params.turnId, status: params.status ?? 'interrupted', error: params.error ?? null },
    });
  }
}
