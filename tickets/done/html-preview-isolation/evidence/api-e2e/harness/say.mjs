// api417: one user message to an agent run over its WebSocket (as the app's composer sends it), then wait for the reply.
import { randomUUID } from 'node:crypto';
const [nodeBase, runId, content, expect] = process.argv.slice(2);
const socket = new WebSocket(`${nodeBase.replace('http', 'ws')}/ws/agent/${runId}`);
await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
await new Promise(r => setTimeout(r, 400));
socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:api417:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: runId, content } }));
const gql = async (query, variables) => (await (await fetch(`${nodeBase}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()).data;
const deadline = Date.now() + 60000; let conv = '';
while (Date.now() < deadline) { conv = JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []); if (!expect || conv.split(expect).length - 1 >= Number(process.argv[6] ?? 1)) break; await new Promise(r => setTimeout(r, 300)); }
socket.close();
console.log(expect ? `${expect} count=${conv.split(expect).length - 1}` : 'sent');
