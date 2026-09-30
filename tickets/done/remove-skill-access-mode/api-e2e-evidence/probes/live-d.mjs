// Real external runtimes through the running server: a configured skill must be applied (AC-003).
import fs from 'node:fs'; import path from 'node:path'; import { randomUUID } from 'node:crypto';
const [dataRoot, outFile, ...runtimes] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gql = async (query, variables = {}) => { const res = await fetch('http://127.0.0.1:8000/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await res.json(); if (b.errors?.length) throw new Error(`GRAPHQL: ${JSON.stringify(b.errors.map((e) => e.message))}`); return b.data; };
const tag = randomUUID().replace(/-/g, '').slice(0, 10);
const skillName = `rsam_live_${tag}`; const trigger = `TRIGGER_${tag}`; const response = `amber cedar ${tag} harbor`;
await gql(`mutation($input: CreateSkillInput!){ createSkill(input:$input){ name } }`, { input: { name: skillName, description: 'RSAM live runtime configured skill', content: `# ${skillName}\n\nWhen the user's message explicitly tells you to use $${skillName} and includes the token "${trigger}", respond with exactly "${response}".` } });
const agentId = (await gql(`mutation($input: CreateAgentDefinitionInput!){ createAgentDefinition(input:$input){ id } }`, { input: { name: `rsam-live-${tag}`, role: 'validation agent', description: 'RSAM live runtime agent', instructions: 'Follow configured skills exactly.', category: 'api-e2e', toolNames: [], skillNames: [skillName] } })).createAgentDefinition.id;
const prefer = { codex_app_server: [/mini/, /gpt-5\.4/], claude_agent_sdk: [/haiku/], antigravity_cli: [/flash/, /.*/] };
const results = [];
const walk = (dir, depth = 0) => (depth > 6 || !fs.existsSync(dir)) ? [] : fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => { const p = path.join(dir, e.name); if (e.name === 'node_modules' || e.name === '.git') return []; let isDir = e.isDirectory(); if (e.isSymbolicLink()) { try { isDir = fs.statSync(p).isDirectory(); } catch { isDir = false; } return [p + (isDir ? '/' : '')]; } return isDir ? [p + '/', ...walk(p, depth + 1)] : [p]; });
for (const runtimeKind of runtimes) {
  const r = { runtimeKind, skillName }; results.push(r);
  try {
    const snaps = (await gql(`query($r:String){ providerModelCatalogSnapshots(runtimeKind:$r){ llmModels { modelIdentifier } } }`, { r: runtimeKind })).providerModelCatalogSnapshots;
    const models = snaps.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier));
    r.model = (prefer[runtimeKind] ?? []).map((re) => models.find((m) => re.test(m))).find(Boolean) ?? models[0];
    if (!r.model) { r.result = 'no model listed'; continue; }
    const ws = path.join(dataRoot, 'rsam-workspaces', `live-${runtimeKind}-${tag}`); fs.mkdirSync(ws, { recursive: true }); r.workspace = ws;
    const created = (await gql(`mutation CreateAgentRun($input: CreateAgentRunInput!){ createAgentRun(input:$input){ success message runId } }`, { input: { agentDefinitionId: agentId, workspaceRootPath: ws, llmModelIdentifier: r.model, autoExecuteTools: true, runtimeKind } })).createAgentRun;
    r.created = created; if (!created.success) { r.result = 'create failed'; continue; }
    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/agent/${created.runId}`); const messages = [];
    socket.addEventListener('message', (e) => messages.push(String(e.data)));
    await new Promise((res, rej) => { socket.addEventListener('open', res); socket.addEventListener('error', () => rej(new Error('WS_ERROR'))); });
    for (let i = 0; i < 80; i += 1) { const cfg = (await gql(`query($runId:String!){ getAgentRunResumeConfig(runId:$runId){ isActive metadataConfig { runtimeKind runtimeReference { threadId sessionId } } } }`, { runId: created.runId })).getAgentRunResumeConfig; r.bootstrap = cfg; if (cfg.metadataConfig?.runtimeKind) break; await sleep(500); }
    await sleep(2000);
    r.materializedBeforeTurn = walk(ws).map((p) => path.relative(ws, p)).filter((p) => p.includes(skillName));
    const id = `rsam-${randomUUID()}`;
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:e2e:${id}`, context_file_paths: [], image_urls: [], content: [`Use the configured skill $${skillName} for this request.`, `The trigger token is: ${trigger}`, 'Follow the skill instructions exactly.'].join('\n') } }));
    let ok = false;
    for (let i = 0; i < 360 && !ok; i += 1) { await sleep(500); ok = messages.some((m) => m.includes(response)); if (i % 20 === 0) r.materializedDuringTurn = walk(ws).map((p) => path.relative(ws, p)).filter((p) => p.includes(skillName)); }
    r.replied = ok; r.streamErrors = messages.filter((m) => /"type":"ERROR"/.test(m)).map((m) => m.slice(0, 300)); r.messageCount = messages.length;
    if (!ok) r.lastMessages = messages.slice(-6).map((m) => m.slice(0, 300));
    await sleep(2000); socket.close();
    r.terminated = (await gql(`mutation($id:String!){ terminateAgentRun(agentRunId:$id){ success message } }`, { id: created.runId })).terminateAgentRun;
    await sleep(1500);
    r.workspaceAfterTerminate = walk(ws).map((p) => path.relative(ws, p)).filter((p) => p.includes(skillName));
    const metaPath = path.join(dataRoot, 'memory', 'agents', created.runId, 'run_metadata.json');
    r.metadataHasField = fs.existsSync(metaPath) ? /skill_?access/i.test(fs.readFileSync(metaPath, 'utf8')) : 'no metadata file';
    r.result = ok ? 'skill applied' : 'no expected reply';
  } catch (error) { r.result = `error: ${String(error.message ?? error).slice(0, 400)}`; }
  console.log(JSON.stringify(r, null, 1));
}
fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
