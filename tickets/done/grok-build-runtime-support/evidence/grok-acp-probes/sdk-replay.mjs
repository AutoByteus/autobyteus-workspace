import * as acp from '@agentclientprotocol/sdk';
import fs from 'node:fs';
const EV = '/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/evidence/grok-acp-probes';
async function replay(file) {
  const lines = fs.readFileSync(`${EV}/${file}`, 'utf8').split('\n').filter(Boolean)
    .map((l) => l.split(' ')).filter((p) => p[1] === '<<').map((p) => JSON.parse(p.slice(2).join(' ')))
    .filter((m) => m.method); // agent->client notifications and requests only
  const enc = new TextEncoder();
  let feed;
  const input = new ReadableStream({ start(c) { feed = c; } });
  const written = [];
  const output = new WritableStream({ write(chunk) { written.push(new TextDecoder().decode(chunk)); } });
  const stats = { sessionUpdate: {}, ext: {}, permission: 0, errors: [] };
  const client = {
    async sessionUpdate(p) { const k = p.update.sessionUpdate; stats.sessionUpdate[k] = (stats.sessionUpdate[k] ?? 0) + 1; },
    async requestPermission(p) { stats.permission++; const o = p.options.find((x) => x.kind === 'allow_once'); return { outcome: { outcome: 'selected', optionId: o.optionId } }; },
    async extNotification(method) { stats.ext[method] = (stats.ext[method] ?? 0) + 1; },
    async extMethod(method) { stats.ext['REQ ' + method] = (stats.ext['REQ ' + method] ?? 0) + 1; return {}; },
  };
  const origErr = console.error; console.error = (...a) => { stats.errors.push(a.map(String).join(' ').slice(0, 300)); };
  new acp.ClientSideConnection(() => client, acp.ndJsonStream(output, input));
  for (const m of lines) feed.enqueue(enc.encode(JSON.stringify(m) + '\n'));
  await new Promise((r) => setTimeout(r, 800));
  console.error = origErr;
  const replies = written.join('').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const errReplies = replies.filter((r) => r.error).map((r) => `${r.id}: ${r.error.code} ${r.error.message} ${JSON.stringify(r.error.data ?? '').slice(0, 200)}`);
  console.log(`\n=== ${file}: fed ${lines.length} agent->client messages`);
  console.log('sessionUpdate kinds:', JSON.stringify(stats.sessionUpdate));
  console.log('ext methods:', JSON.stringify(stats.ext));
  console.log('permission handled:', stats.permission, '| replies:', replies.length, '| error replies:', errReplies.length);
  errReplies.slice(0, 5).forEach((e) => console.log('  ERR', e));
  stats.errors.slice(0, 5).forEach((e) => console.log('  LOG', e));
}
for (const f of ['prompt.log.jsonl', 'permission.log.jsonl', 'mcp2.log.jsonl', 'load.log.jsonl', 'cancel.log.jsonl']) await replay(f);
