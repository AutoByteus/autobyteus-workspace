// TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
// AC-003 helper against an isolated instance's embedded server (temporary data root only).
//   busy <serverPort> <workspace> <marker>  creates a Claude (haiku) agent run and sends it a long foreground shell
//                                           command tagged <marker>; waits until that command is running; prints the run id
//   check <serverPort> <runId>             prints the run's notices count, its last conversation entries and isActive
// Usage (cwd = the clean checkout root, for `ws`): node API-356-busy-agent.mjs busy|check ...
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

const WebSocket = createRequire(path.join(process.cwd(), 'autobyteus-server-ts/package.json'))('ws');
const [mode, port, a, b] = process.argv.slice(2);
const gql = async (query, variables = {}) => {
  const body = await fetch(`http://127.0.0.1:${port}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }).then((r) => r.json());
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors).slice(0, 600));
  return body.data;
};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
if (mode === 'busy') {
  const [workspace, marker] = [a, b];
  const model = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier value}}}', { r: 'claude_agent_sdk' }))
    .providerModelCatalogSnapshots.flatMap((x) => x.llmModels).find((x) => /haiku/i.test(x.modelIdentifier) || /haiku/i.test(x.value ?? ''))?.modelIdentifier;
  const def = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name: `AN356 Busy ${marker}`, role: 'engineer', description: 'an356 probe', instructions: 'Follow the user instructions exactly. Use your shell tool to run commands.', category: 'api-e2e', skillNames: [] } })).createAgentDefinition.id;
  const run = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: def, runtimeKind: 'claude_agent_sdk', llmModelIdentifier: model, autoExecuteTools: true, workspaceRootPath: workspace } })).createAgentRun;
  if (!run.success) throw new Error(run.message);
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/agent/${run.runId}`);
  const frames = []; ws.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))); } catch {} });
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  for (let i = 0; i < 40 && !frames.some((f) => f.type === 'CONNECTED'); i++) await delay(250);
  const id = randomUUID();
  ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:${id}`, context_file_paths: [], image_urls: [], content: `Run exactly this shell command in the foreground and wait for it to finish. Do not run it in the background, do not add a timeout, do not change it: python3 -c "import time; time.sleep(900)" ${marker}\nWhen it finishes, reply with the single word DONE.` } }));
  let busy = null;
  for (let i = 0; i < 480 && !busy; i++) { await delay(500); busy = execFileSync('ps', ['-A', '-o', 'pid=,command='], { encoding: 'utf8' }).split('\n').find((l) => l.includes(marker) && /python/i.test(l)); }
  ws.terminate();
  console.log(JSON.stringify({ runId: run.runId, model, busy: busy?.trim().slice(0, 160) ?? null }));
} else {
  const p = await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: a }).then((d) => d.getRunProjection, (e) => ({ error: String(e).slice(0, 300) }));
  const conv = JSON.stringify(p?.conversation ?? []);
  const active = await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}', { id: a }).then((d) => d.getAgentRunResumeConfig.isActive, () => null);
  console.log(JSON.stringify({ runId: a, notices: (conv.match(/application restarted at/gi) ?? []).length, noticeText: (conv.match(/The application restarted[^"]{0,400}/i) ?? [null])[0], isActive: active, error: p?.error ?? null, last: (p?.conversation ?? []).slice(-3).map((e) => JSON.stringify(e).slice(0, 300)) }, null, 1));
}
