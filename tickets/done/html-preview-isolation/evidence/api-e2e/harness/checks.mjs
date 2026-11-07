// api417: node-side state after a hostile page ran: markers, definitions created by the page, terminal attach and refusal lines.
import fs from 'node:fs';
const [nodeBase, root, logFile, sinceIso, label] = process.argv.slice(2);
const defs = (await (await fetch(`${nodeBase}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{agentDefinitions{name}}' }) })).json());
const names = (defs.data?.agentDefinitions ?? []).map(d => d.name);
const since = Date.parse(sinceIso);
const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(l => { const m = /^\[([^\]]+)\]/.exec(l); return m && Date.parse(m[1]) >= since; });
const pick = re => lines.filter(l => re.test(l)).map(l => l.replace(/^.*\] (Remote Access|Terminal)/, '$1').slice(0, 220));
console.log(JSON.stringify({
  label, checkedAt: new Date().toISOString(), since: sinceIso,
  markers: fs.readdirSync(`${root}/markers`),
  hostileDefinitions: names.filter(n => n.startsWith('HOSTILE')), allDefinitions: names,
  refusals: pick(/REMOTE_ACCESS_ORIGIN_REFUSED/), terminalAttached: pick(/Terminal websocket attached/),
}, null, 1));
