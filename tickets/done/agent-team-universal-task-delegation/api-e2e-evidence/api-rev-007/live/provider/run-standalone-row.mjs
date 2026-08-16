import { mkdir, writeFile } from 'node:fs/promises';

const [runtimeKind, model, outputPath, workspaceRoot] = process.argv.slice(2);
if (!runtimeKind || !model || !outputPath || !workspaceRoot) throw new Error('missing standalone row args');
await mkdir(workspaceRoot, { recursive: true });
const graphqlUrl = process.env.GRAPHQL_URL ?? 'http://127.0.0.1:60312/graphql';
const wsBase = process.env.AGENT_WS_URL ?? 'ws://127.0.0.1:60312/ws/agent';
const gql = async (query, variables = {}) => {
  const response = await fetch(graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const json = await response.json();
  if (!response.ok || json.errors?.length) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data;
};
const input = { agentDefinitionId: 'daily-assistant', workspaceRootPath: workspaceRoot, llmModelIdentifier: model, autoExecuteTools: true, skillAccessMode: 'NONE', runtimeKind };
const created = await gql(`mutation C($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input });
const runId = created.createAgentRun.runId;
if (!created.createAgentRun.success || !runId) throw new Error(JSON.stringify(created));
const startedAt = Date.now();
const messages = [];
let sent = false;
let terminal = null;
let error = null;
await new Promise((resolve) => {
  const ws = new WebSocket(`${wsBase}/${runId}`);
  const timeout = setTimeout(() => { error = 'timeout'; try { ws.close(); } catch {} resolve(); }, 300000);
  ws.addEventListener('message', (event) => {
    const raw = String(event.data);
    let message;
    try { message = JSON.parse(raw); } catch { message = { type: 'UNPARSEABLE', raw }; }
    messages.push({ atMs: Date.now() - startedAt, message });
    if (message.type === 'CONNECTED' && !sent) {
      sent = true;
      ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content: `Reply with exactly STANDALONE_${runtimeKind}_OK and do not call tools.`, context_file_paths: [], image_urls: [], message_id: `standalone-${crypto.randomUUID()}`, dedupe_key: `standalone-${crypto.randomUUID()}` } }));
    }
    if (['TURN_COMPLETED','TURN_FAILED','TURN_CANCELLED'].includes(message.type)) {
      terminal = message.type;
      setTimeout(() => { clearTimeout(timeout); try { ws.close(); } catch {} resolve(); }, 1500);
    }
  });
  ws.addEventListener('error', (event) => { error = event.message ?? 'websocket error'; });
  ws.addEventListener('close', () => { clearTimeout(timeout); resolve(); });
});
const resume = await gql(`query Q($id:String!){getAgentRunResumeConfig(runId:$id){runId isActive metadataConfig{agentDefinitionId workspaceRootPath llmModelIdentifier llmConfig autoExecuteTools skillAccessMode runtimeKind runtimeReference{runtimeKind sessionId threadId metadata}} editableFields{llmModelIdentifier llmConfig autoExecuteTools skillAccessMode workspaceRootPath runtimeKind}} getRunProjection(runId:$id){runId summary lastActivityAt conversation activities hasEarlierActiveTraceEvents}}`, { id: runId });
const result = { runtimeKind, model, input, created, runId, sent, terminal, error, messages, resume };
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ runtimeKind, model, runId, sent, terminal, error, typeCounts: messages.reduce((a,e)=>(a[e.message.type]=(a[e.message.type]??0)+1,a),{}), conversation: resume.getRunProjection.conversation }, null, 2));
