// Temporary AC-118 probe: create an agent run on a runtime, send a nonce request over the agent websocket,
// and wait for the MCP tool result + assistant reply. usage: node mcp-runtime-probe.mjs <base> <runtimeKind> <model>
import WebSocket from '/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/node_modules/.pnpm/ws@8.19.0/node_modules/ws/wrapper.mjs';
import { randomUUID } from 'node:crypto';
const [base, runtimeKind, model] = process.argv.slice(2);
const gql = async (query, variables) => (await (await fetch(base + '/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const created = await gql('mutation($i:CreateAgentRunInput!){ createAgentRun(input:$i){ success message runId } }', { i: {
  agentDefinitionId: 'mcp-token-probe', workspaceRootPath: '/private/tmp/emr-e2e/ws-mcp', llmModelIdentifier: model,
  autoExecuteTools: true, llmConfig: null, skillAccessMode: 'NONE', runtimeKind } });
const runId = created?.data?.createAgentRun?.runId;
if (!runId) { console.log(JSON.stringify({ runtimeKind, error: created })); process.exit(2); }
const nonce = 'N-' + runtimeKind + '-' + randomUUID().slice(0, 8);
const u = new URL(base);
const ws = new WebSocket('ws://' + u.host + '/ws/agent/' + runId);
const events = []; let done = false; const types = {};
const summary = () => ({ runtimeKind, model, runId, nonce, eventTypes: types,
  toolEvents: events.filter((e) => /TOOL/.test(e.type)).map((e) => ({ type: e.type, snippet: JSON.stringify(e.payload).slice(0, 300) })).slice(0, 12),
  assistantTextContainsNonce: events.some((e) => JSON.stringify(e.payload ?? {}).includes('TOKEN_SHA8=abf32337 NONCE=' + nonce) && !/TOOL/.test(e.type)),
  anyEventContainsToolResult: events.some((e) => JSON.stringify(e.payload ?? {}).includes('TOKEN_PRESENT=true TOKEN_SHA8=abf32337 NONCE=' + nonce)),
  errors: events.filter((e) => /ERROR/.test(e.type)).map((e) => JSON.stringify(e.payload).slice(0, 300)) });
const finish = (code) => { if (done) return; done = true; console.log(JSON.stringify(summary(), null, 2)); try { ws.close(); } catch {} setTimeout(() => process.exit(code), 300); };
setTimeout(() => finish(3), 240000);
let sawRunning = false;
ws.on('message', (raw) => {
  let m; try { m = JSON.parse(String(raw)); } catch { return; }
  events.push(m); types[m.type] = (types[m.type] ?? 0) + 1;
  if (m.type === 'CONNECTED') {
    ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: 'e2e-' + randomUUID(), dedupe_key: 'agent_run_input:e2e:' + randomUUID(), context_file_paths: [], image_urls: [],
      content: 'The nonce is ' + nonce + '. Call verify_e2e_token with this nonce and reply with the exact tool output.' } }));
  }
  if (m.type === 'AGENT_STATUS' && m.payload?.status === 'running') sawRunning = true;
  if (m.type === 'AGENT_STATUS' && m.payload?.status === 'idle' && sawRunning) setTimeout(() => finish(0), 1500);
  if (m.type === 'TOOL_APPROVAL_REQUESTED' || m.type === 'TOOL_INVOCATION_APPROVAL_REQUESTED') {
    const id = m.payload?.invocation_id ?? m.payload?.invocationId;
    ws.send(JSON.stringify({ type: 'APPROVE_TOOL', payload: { invocation_id: id } }));
  }
});
ws.on('error', (e) => { events.push({ type: 'WS_ERROR', payload: String(e) }); finish(4); });
