#!/usr/bin/env node
// Temporary API/E2E helper: send one user message to a Team/Org member (or standalone run) over the real WebSocket
// route the UI uses, then wait for that member's generated-image FILE_CHANGE events and turn completion.
// Usage: node send.mjs <serverDir> <backendUrl> <socketPath e.g. /ws/agent-team/ID> <agentRunId> <expectedImages> [timeoutMs]
import { createRequire } from 'node:module';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const [serverDir, backendUrl, socketPath, agentRunId, expected = '3', timeout = '30000'] = process.argv.slice(2);
const WebSocket = createRequire(path.join(serverDir, 'package.json'))('ws');
const url = new URL(backendUrl);
const socket = new WebSocket(`ws://${url.host}${socketPath}`);
const seen = { fileChanges: new Map(), turnCompleted: false, errors: [] };
const isOrg = socketPath.startsWith('/ws/agent-org/');
const orgRunId = isOrg ? socketPath.split('/').pop() : null;
const samples = [];
socket.on('message', (raw) => {
  let m; try { m = JSON.parse(String(raw)); } catch { return; }
  // Org streams wrap each member event: ROOT_EXECUTION_EVENT { ..., event: { type, payload } } (shape logged below).
  if (m.type === 'ROOT_EXECUTION_EVENT') {
    // Shape: payload.event = { kind, member_address, agent_run_id, message: { type, payload } }
    const event = m.payload?.event ?? {};
    if (samples.length < 2) samples.push(JSON.stringify(m.payload).slice(0, 400));
    m = { type: event.message?.type, payload: { ...(event.message?.payload ?? {}), agent_run_id: event.agent_run_id ?? null } };
  }
  const p = m.payload || {};
  const runId = p.agent_run_id ?? p.agentRunId ?? null;
  if (m.type === 'FILE_CHANGE' && (runId === null || runId === agentRunId)) seen.fileChanges.set(p.path, p.status);
  if (m.type === 'TURN_COMPLETED' && (runId === null || runId === agentRunId)) seen.turnCompleted = true;
  if (m.type === 'ERROR') seen.errors.push(p);
  if (m.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT') globalThis.__orgReady = true;
});
await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
const id = `e2e-${randomUUID()}`;
if (isOrg) {
  // Wait for the Org root snapshot so the stream is ready, then send the same command shape the web client sends.
  const ready = Date.now() + 10000; while (Date.now() < ready && !globalThis.__orgReady) await new Promise((r) => setTimeout(r, 50));
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: 'agent_org', root_run_id: orgRunId,
    target_agent_run_id: agentRunId, command_id: randomUUID(), content: 'Generate three images.', context_file_paths: [],
    image_urls: [], message_id: id, dedupe_key: `agent_run_input:e2e:${id}` } }));
} else socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:e2e:${id}`,
  content: 'Generate three images.', agent_run_id: agentRunId, context_file_paths: [], image_urls: [] } }));
const end = Date.now() + Number(timeout);
while (Date.now() < end && !(seen.turnCompleted && seen.fileChanges.size >= Number(expected))) await new Promise((r) => setTimeout(r, 100));
socket.close();
if (process.env.CMAH_DEBUG) console.error(samples.join('\n'));
console.log(JSON.stringify({ agentRunId, turnCompleted: seen.turnCompleted, fileChanges: [...seen.fileChanges].map(([p, s]) => [path.basename(path.dirname(p)).slice(0, 8) + '/' + path.basename(p), s]), errors: seen.errors }));
process.exit(seen.turnCompleted && seen.fileChanges.size >= Number(expected) ? 0 : 1);
