// Provider-free, test-owned Codex app-server JSON-RPC child. No Codex binary, model or credentials.
// Purpose: let a test drive the real CodexAppServerClient/router/thread/backend path with an exact
// notification sequence, as Codex sends it over stdio.
// - thread/start -> `scripted-thread-<n>`
// - turn/start   -> distinct turn id `<threadId>-turn-<n>`; `turn/started` is notified before the response
// - turn/interrupt -> response, then `thread/status/changed` idle, then `turn/completed` (interrupted),
//   the order Codex 0.160 uses for a user Stop
// - test/notify  { notifications: [{ method, params }] } -> notifies each in order, then responds
//   (awaiting the response is a barrier: stdout keeps the order)
// - test/requests -> every request received so far
// - test/exit    -> exits the process (app-server crash/close)
// Used by: tests/integration/agent-execution/codex-segment-turn-rejection-logging.integration.test.ts
import readline from 'node:readline';
let nextThread = 1;
let nextTurn = 1;
const requests = [];
const send = value => process.stdout.write(`${JSON.stringify(value)}\n`);
const notify = (method, params) => send({ method, params });
for await (const line of readline.createInterface({ input: process.stdin })) {
  const { id, method, params = {} } = JSON.parse(line);
  if (id === undefined) continue;
  requests.push({ method, params });
  if (method === 'test/exit') process.exit(0);
  let result = {};
  if (method === 'thread/start') result = { thread: { id: `scripted-thread-${nextThread++}` } };
  if (method === 'turn/start') {
    result = { turn: { id: `${params.threadId}-turn-${nextTurn++}` } };
    notify('turn/started', { threadId: params.threadId, turn: result.turn });
  }
  if (method === 'test/notify') {
    for (const notification of params.notifications ?? []) notify(notification.method, notification.params);
  }
  if (method === 'test/requests') result = requests;
  send({ id, result });
  if (method === 'turn/interrupt') {
    notify('thread/status/changed', { threadId: params.threadId, status: { type: 'idle' } });
    notify('turn/completed', {
      threadId: params.threadId,
      turn: { id: params.turnId, status: 'interrupted', error: null },
    });
  }
}
