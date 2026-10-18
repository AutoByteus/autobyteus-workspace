// Reads the views the upgrade must preserve, through the public GraphQL API: each run's task agents, the Agent copy's file
// changes, the hub's Token Meter summary. Usage: node views.mjs <backendUrl> <out.json> <orgRunId>
import { writeFileSync } from "node:fs";
const [backend, out, orgRunId] = process.argv.slice(2);
const gql = async (query, variables = {}) => { const r = await fetch(new URL("/graphql", backend), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) }); return r.json(); };
const objectsIn = (v, out = []) => { if (Array.isArray(v)) v.forEach((x) => objectsIn(x, out)); else if (v && typeof v === "object") { out.push(v); Object.values(v).forEach((x) => objectsIn(x, out)); } return out; };
const tasks = (tree) => objectsIn(tree).filter((r) => r.started_at ?? r.startedAt).map((r) => `${r.address} ${r.agent_run_id ?? r.agentRunId ?? r.team_run_id ?? r.teamRunId}`).sort();
const history = await gql("{listWorkspaceRunHistory{agentDefinitions{agentName runs{runId}} teamDefinitions{teamDefinitionName runs{teamRunId}}}}");
const ids = objectsIn(history).flatMap((r) => [r.runId, r.teamRunId].filter(Boolean));
const orgs = [{ orgRunId }];
const res = { history, orgs };
for (const id of ids) {
  if (id.startsWith("hub_assistant")) res.hub = { id, tasks: tasks((await gql("query($id:String!){agentRunCollaboration(runId:$id)}", { id })).data?.agentRunCollaboration?.root_agent?.execution_tree) };
  if (id.startsWith("forest_team")) res.team = { id, tasks: tasks((await gql("query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}", { id })).data?.getTeamRunResumeConfig?.executionTree) };
}
for (const r of objectsIn(orgs)) if (r.orgRunId) res.org = { id: r.orgRunId, tasks: tasks((await gql("query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}", { id: r.orgRunId })).data?.getAgentOrgRunConfig?.executionTree) };
const reviewer = (res.hub?.tasks ?? []).find((t) => t.startsWith("/code_reviewer"))?.split(" ")[1];
if (reviewer) res.reviewerFileChanges = (await gql("query($r:String!){getRunFileChanges(runId:$r){path type}}", { r: reviewer })).data?.getRunFileChanges ?? null;
if (res.hub) res.hubTokens = (await gql("query($r:String!){getStandaloneRunTokenUsageSummary(runId:$r){runId}}", { r: res.hub.id }));
writeFileSync(out, JSON.stringify(res, null, 2) + "\n");
console.log(JSON.stringify({ hub: res.hub, team: res.team, org: res.org, reviewerFileChanges: res.reviewerFileChanges }, null, 1));
