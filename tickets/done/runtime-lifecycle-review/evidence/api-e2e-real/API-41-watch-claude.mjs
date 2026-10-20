const q = '{agentRuntimes{runtimeKind installedVersion updates{state latestVersion} account{state} operation{kind state command step fromVersion toVersion error} checkedAt}}';
let last = ''; const start = Date.now();
while (Date.now() - start < 600000) {
  const r = await fetch('http://127.0.0.1:56552/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) }).then(x => x.json());
  const row = r.data.agentRuntimes.find(x => x.runtimeKind === 'claude_agent_sdk');
  const s = JSON.stringify(row);
  if (s !== last) { console.log(`${new Date().toISOString()} +${Math.round((Date.now()-start)/1000)}s ${s}`); last = s; }
  if (row.operation && row.operation.state !== 'RUNNING' && row.updates.state !== 'CHECKING') break;
  await new Promise(r => setTimeout(r, 500));
}
