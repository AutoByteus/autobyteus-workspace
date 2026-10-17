const [base, runId, seconds = '240'] = process.argv.slice(2);
const gql = async (query, variables = {}) => (await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const end = Date.now() + Number(seconds) * 1000; let last = '';
while (Date.now() < end) {
  const b = await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: runId });
  const tree = b.data?.agentRunCollaboration?.root_agent?.execution_tree;
  const teams = []; const visit = (v) => { if (Array.isArray(v)) return v.forEach(visit); if (!v || typeof v !== 'object') return;
    const t = v.teamRunId ?? v.team_run_id; if (t && Array.isArray(v.members)) teams.push({ teamRunId: t, address: v.address, members: v.members.map((m) => [m.address, m.status ?? m.current_status ?? m.currentStatus ?? '?']) });
    Object.values(v).forEach(visit); };
  visit(tree);
  const line = JSON.stringify(teams); if (line !== last) { console.log(new Date().toISOString(), line); last = line; }
  if (teams.length && process.argv.includes('--once')) break;
  await new Promise((r) => setTimeout(r, 3000));
}
