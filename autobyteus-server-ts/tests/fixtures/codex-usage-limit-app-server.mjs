#!/usr/bin/env node
// Provider-free, test-owned Codex app-server (autobyteus-646 E2E). No Codex binary, model or credentials.
// `--version` prints a Codex version; `app-server` speaks the JSON-RPC the server uses:
// - initialize, account/read (signed in), model/list (CODEX_FAKE_MODEL), skills/list, thread/start, thread/resume,
//   thread/unsubscribe, turn/interrupt;
// - account/rateLimits/read: while the state says `limit`, the 5-hour window is used up until CODEX_FAKE_RESET_AT
//   (an ISO time), so the runtime's limits read shows the model blocked; otherwise 10 % used;
// - turn/start: `turn/started`, then, by the state file CODEX_FAKE_STATE ({"mode":"ok"|"limit"}, read per turn):
//   ok    -> one agent message "CODEX_OK <n>" and `turn/completed` (completed);
//   limit -> the three terminal errors of one turn, as Codex sends them for a used-up limit: the `error` notification
//            (codexErrorInfo usageLimitExceeded, willRetry false), `thread/status/changed` to failed, and
//            `turn/completed` (failed, the same codexErrorInfo); `HOLD_LIMIT:<ms>` in a turn's text holds them that long.
// Each turn/start is logged to CODEX_FAKE_LOG ({threadId, turnId, model, text, mode}), one JSON line.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import readline from 'node:readline';

const MODEL = process.env.CODEX_FAKE_MODEL || 'gpt-e2e';
if (process.argv[2] === '--version') {
  process.stdout.write('codex-cli 0.163.0\n');
  process.exit(0);
}
const state = () => {
  const file = process.env.CODEX_FAKE_STATE;
  try { return file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { mode: 'ok' }; } catch { return { mode: 'ok' }; }
};
const resetSeconds = () => Math.floor(Date.parse(process.env.CODEX_FAKE_RESET_AT || '2026-11-27T09:00:00.000Z') / 1000);
let nextThread = 1;
let nextTurn = 1;
const threadModels = new Map();
const send = value => process.stdout.write(`${JSON.stringify(value)}\n`);
const notify = (method, params) => send({ method, params });
const textOf = (input) => (Array.isArray(input) ? input : []).map((part) => typeof part?.text === 'string' ? part.text : '').join('\n');

for await (const line of readline.createInterface({ input: process.stdin })) {
  let message;
  try { message = JSON.parse(line); } catch { continue; }
  const { id, method, params = {} } = message;
  if (id === undefined) continue;
  let result = {};
  if (method === 'initialize') result = { userAgent: 'codex-fake/0.163.0' };
  if (method === 'account/read') result = { account: { type: 'chatgpt', email: 'e2e@example.invalid', planType: 'plus' }, requiresOpenaiAuth: true };
  if (method === 'account/rateLimits/read') {
    const used = state().mode === 'limit' ? 100 : 10;
    result = { rateLimits: { limitId: 'codex', primary: { usedPercent: used, windowDurationMins: 300, resetsAt: resetSeconds() },
      secondary: { usedPercent: 20, windowDurationMins: 10080, resetsAt: resetSeconds() + 86400 }, credits: { hasCredits: false, unlimited: false } } };
  }
  if (method === 'model/list') {
    result = { data: [{ id: MODEL, model: MODEL, displayName: 'GPT E2E', isDefault: true, defaultReasoningEffort: 'medium',
      supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'medium' }, { reasoningEffort: 'high' }] }], nextCursor: null };
  }
  if (method === 'skills/list') result = { data: [] };
  if (method === 'thread/start') {
    const threadId = `fake-thread-${process.pid}-${nextThread++}`;
    threadModels.set(threadId, params.model ?? MODEL);
    result = { thread: { id: threadId }, model: params.model ?? MODEL };
  }
  if (method === 'thread/resume') result = { thread: { id: params.threadId }, model: params.model ?? MODEL };
  if (method === 'turn/start') {
    const turn = { id: `${params.threadId}-turn-${nextTurn++}` };
    const mode = state().mode === 'limit' ? 'limit' : 'ok';
    if (process.env.CODEX_FAKE_LOG) {
      appendFileSync(process.env.CODEX_FAKE_LOG, `${JSON.stringify({ threadId: params.threadId, turnId: turn.id,
        model: params.model ?? threadModels.get(params.threadId) ?? null, text: textOf(params.input), mode })}\n`);
    }
    send({ id, result: { turn } });
    notify('turn/started', { threadId: params.threadId, turn });
    if (mode === 'ok') {
      const item = { type: 'agentMessage', id: `${turn.id}-msg`, text: `CODEX_OK ${turn.id}` };
      notify('item/started', { threadId: params.threadId, turnId: turn.id, item: { ...item, text: '' } });
      notify('item/agentMessage/delta', { threadId: params.threadId, turnId: turn.id, itemId: item.id, delta: item.text });
      notify('item/completed', { threadId: params.threadId, turnId: turn.id, item });
      notify('turn/completed', { threadId: params.threadId, turn: { ...turn, status: 'completed', error: null } });
    } else {
      const error = { message: "You've hit your usage limit. Try again later.", codexErrorInfo: 'usageLimitExceeded', additionalDetails: null };
      const fail = () => {
        notify('error', { threadId: params.threadId, turnId: turn.id, error, willRetry: false });
        notify('thread/status/changed', { threadId: params.threadId, turnId: turn.id, status: { type: 'failed' } });
        notify('turn/completed', { threadId: params.threadId, turn: { ...turn, status: 'failed', error } });
        if (process.env.CODEX_FAKE_LOG) appendFileSync(`${process.env.CODEX_FAKE_LOG}.ends.jsonl`, `${JSON.stringify({ turnId: turn.id, endedAt: new Date().toISOString() })}\n`);
      };
      // `HOLD_LIMIT:<ms>` in the turn's text keeps the turn running that long before it fails (a turn still at work when
      // a switch arrives); the end's time goes to CODEX_FAKE_LOG.ends.jsonl ({turnId, endedAt}).
      const holdMs = Number(/HOLD_LIMIT:(\d+)/.exec(textOf(params.input))?.[1] ?? 0);
      if (holdMs > 0) setTimeout(fail, holdMs); else fail();
    }
    continue;
  }
  send({ id, result });
}
