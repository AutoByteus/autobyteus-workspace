// api417 API-12: positive control. The same terminal WebSocket input and GraphQL mutation the hostile page tried, sent
// from an allowed client (Node, no Origin header: a loopback client the node trusts), must succeed and be seen by the
// same detectors (marker file, agent definition list).
import fs from 'node:fs';
const [nodeBase, root] = process.argv.slice(2);
const markers = `${root}/markers`;
const out = { at: new Date().toISOString() };
const ws = new WebSocket(`${nodeBase.replace('http', 'ws')}/ws/terminal/control-api12?cwd=${encodeURIComponent(markers)}`);
out.ws = await new Promise((resolve) => {
  ws.onopen = () => { ws.send(JSON.stringify({ type: 'input', data: Buffer.from(`touch ${markers}/control-api12.marker\r`).toString('base64') })); resolve('opened'); };
  ws.onclose = (e) => resolve('closed ' + e.code);
});
for (let i = 0; i < 50 && !fs.existsSync(`${markers}/control-api12.marker`); i++) await new Promise(r => setTimeout(r, 200));
out.markerCreated = fs.existsSync(`${markers}/control-api12.marker`);
ws.close();
const mutation = 'mutation{createAgentDefinition(input:{name:"CONTROL-api12",role:"assistant",description:"api417 control",instructions:"x",toolNames:[]}){id}}';
const r = await fetch(`${nodeBase}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: mutation }) });
out.graphqlStatus = r.status; out.graphqlBody = (await r.text()).slice(0, 120);
const defs = await (await fetch(`${nodeBase}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{agentDefinitions{name}}' }) })).json();
out.definitions = defs.data.agentDefinitions.map(d => d.name);
out.markers = fs.readdirSync(markers);
console.log(JSON.stringify(out, null, 1));
