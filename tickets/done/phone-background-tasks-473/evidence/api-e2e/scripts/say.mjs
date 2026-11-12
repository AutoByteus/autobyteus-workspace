// autobyteus-473 API/E2E (temporary): sends one message to the Claude run as another client of the run would (the run's
// websocket with the probe's credential from /tmp/abtest473/state.json, never printed), and reads the node's background-task
// view of the run (GraphQL, the same query family the web uses).
//   node say.mjs send "<message>"     node say.mjs tasks     node say.mjs conversation
import fs from 'node:fs'; import { randomUUID } from 'node:crypto';
const s = JSON.parse(fs.readFileSync('/tmp/abtest473/state.json', 'utf8')); const [cmd, text] = process.argv.slice(2);
const gql = async (q, v) => { const r = await (await fetch(`${s.base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${s.owner}` }, body: JSON.stringify({ query: q, variables: v }) })).json(); return r; };
if (cmd === 'send') {
  const ws = new WebSocket(`ws://127.0.0.1:${s.port}/ws/agent/${s.run}?access_token=${encodeURIComponent(s.owner)}`);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); await new Promise(r => setTimeout(r, 400));
  ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: s.run, content: text } }));
  await new Promise(r => setTimeout(r, 800)); ws.close(); console.log(JSON.stringify({ sent: text }));
} else if (cmd === 'tasks') {
  const q = `query($id:String!){ agentBackgroundTaskView(agentRunId:$id){ __typename ... on AgentBackgroundTaskEventStream { tasks { taskId kind description command status summary startedAt } } ... on AgentBackgroundTaskUnsupported { reason } ... on AgentBackgroundTaskUnavailable { reason } } }`;
  const r = await gql(q, { id: s.run }); console.log(JSON.stringify(r.errors ? { errors: JSON.stringify(r.errors).slice(0, 300) } : r.data));
} else if (cmd === 'conversation') {
  const r = await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: s.run });
  const c = r.data?.getRunProjection?.conversation ?? []; console.log(JSON.stringify(c.slice(-4).map(m => ({ role: m.role, kind: m.kind, text: String(m.content ?? '').slice(0, 160) }))));
}
