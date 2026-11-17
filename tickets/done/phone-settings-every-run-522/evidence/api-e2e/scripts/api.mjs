// autobyteus-522 API/E2E (temporary; from 458's api.mjs): the node's side of the journeys, over its public GraphQL and WebSocket APIs, as a second
// client (another window). Reads /tmp/abtest522/state.json (node-522.mjs). Prints JSON; never prints the credential.
// Usage: node api.mjs <command> [args]
//   new-agent [def]                         an agent run (default Fact Checker; `ptm`, `helper`, `writer`), AGY → { runId }
//   new-squad                               a standalone Docs Review Team run → { teamRunId, reviewer, editor }
//   call-agent <runId> <tool> <argsJSON> | call-team <teamRunId> <memberRunId> <tool> <argsJSON>   a real tool call
//   tree <agent|team|agent_org> <runId>     the run's delegated runs (the probes' `delegatedNodes` of `runTree`)
//   new-team                                a Delivery Team run → { teamRunId, lead, mate }
//   new-org                                 a Delivery Org run → { orgRunId, planner, squad: [{address, agentRunId}] }
//   say-agent <runId> <text>                a message to an agent run
//   say-team <teamRunId> <memberRunId> <text>
//   say-org <orgRunId> <memberRunId> <text>
//   agent <runId> | team <teamRunId> | org <orgRunId>   the node's state: isActive and each run's runtime and model
//   stop-agent <runId> | stop-team <teamRunId> | stop-org <orgRunId>
//   models <runId>                          the models the node offers the run's runtime (agentRunModelOptions)
//   conv <runId> | conv-team <teamRunId> <memberRunId>   the conversation's text (last 1500 chars)
import fs from 'node:fs'; import { randomUUID } from 'node:crypto';
import { readRunTree, delegatedNodes } from '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-settings-every-run-522/autobyteus-web/tests/e2e/fixtures/run-tree.mjs';
const st = JSON.parse(fs.readFileSync('/tmp/abtest522/state.json', 'utf8'));
const gql = async (q, v) => { const r = await (await fetch(`${st.base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${st.owner}` }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 600)); return r.data; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const send = async (route, payload) => {
  const u = new URL(`${st.base.replace('http', 'ws')}/ws/${route}`); u.searchParams.set('access_token', st.owner);
  const s = new WebSocket(u); await new Promise((r, j) => { s.onopen = r; s.onerror = j; }); await sleep(400);
  s.send(JSON.stringify({ type: 'SEND_MESSAGE', payload })); await sleep(800); s.close(); return { sent: true, route: route.split('/')[0] };
};
const runConfig = { workspaceRootPath: st.ws, autoExecuteTools: true, ...st.agy };
const nodes = (tree, acc = []) => { if (!tree || typeof tree !== 'object') return acc; if (Array.isArray(tree)) { tree.forEach(t => nodes(t, acc)); return acc; }
  const id = tree.agent_run_id ?? tree.agentRunId; const lc = tree.launch_configuration ?? tree.launchConfiguration;
  if (id) acc.push({ address: tree.address, agentRunId: id, runtimeKind: lc?.runtime_kind ?? lc?.runtimeKind ?? null, model: lc?.llm_model_identifier ?? lc?.llmModelIdentifier ?? null });
  for (const v of Object.values(tree)) if (v && typeof v === 'object') nodes(v, acc); return acc; };
const uniq = list => [...new Map(list.map(n => [n.agentRunId, n])).values()];
const text = conv => JSON.stringify(conv ?? []).slice(-1500);
const [cmd, ...a] = process.argv.slice(2);
const c = {
  'new-agent': async (def = 'checker') => { const r = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: st.ids[def], ...runConfig } })).createAgentRun; return r; },
  // 522: a standalone "Docs Review Team" run (reviewer, editor).
  'new-squad': async () => {
    const r = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: st.ids.squad, teamConfigs: [{ teamAddress: '/', ...runConfig }],
      memberConfigs: [{ memberAddress: '/reviewer', agentDefinitionId: st.ids.writer, ...runConfig }, { memberAddress: '/editor', agentDefinitionId: st.ids.checker, ...runConfig }] } })).createAgentTeamRun;
    const t = await c.team(r.teamRunId); return { ...r, reviewer: t.members.find(m => m.address === '/reviewer')?.agentRunId, editor: t.members.find(m => m.address === '/editor')?.agentRunId };
  },
  // 522: a real tool call by an agent (the scripted CLI's `CALL_TOOL:{…}`), e.g. delegate_task.
  'call-agent': (id, tool, args) => c['say-agent'](id, `CALL_TOOL:${JSON.stringify({ name: tool, arguments: JSON.parse(args) })}`),
  'call-team': (id, m, tool, args) => c['say-team'](id, m, `CALL_TOOL:${JSON.stringify({ name: tool, arguments: JSON.parse(args) })}`),
  // 522: the run tree the phone and the desktop read (delegated runs are its rows).
  tree: async (kind, id) => delegatedNodes(await readRunTree(gql, kind, id)).map(({ launch, ...n }) => n),
  'new-team': async () => {
    const r = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: st.ids.delivery, teamConfigs: [{ teamAddress: '/', ...runConfig }],
      memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: st.ids.checker, ...runConfig }, { memberAddress: '/mate', agentDefinitionId: st.ids.writer, ...runConfig }] } })).createAgentTeamRun;
    const t = await c.team(r.teamRunId); return { ...r, lead: t.members.find(m => m.address === '/lead')?.agentRunId, mate: t.members.find(m => m.address === '/mate')?.agentRunId };
  },
  'new-org': async () => {
    const r = (await gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}', { i: { agentOrgDefinitionId: st.ids.org, rootConfiguration: runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    const o = await c.org(r.agentOrgRunId); return { ...r, members: o.members };
  },
  'say-agent': (id, t) => send(`agent/${id}`, { message_id: randomUUID(), dedupe_key: `agent_run_input:api522:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: id, content: t }),
  'say-team': (id, m, t) => send(`agent-team/${id}`, { message_id: randomUUID(), dedupe_key: `team_member_input:api522:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: m, content: t }),
  'say-org': (id, m, t) => send(`agent-org/${id}`, { root_subject_kind: 'agent_org', root_run_id: id, target_agent_run_id: m, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content: t, context_file_paths: [], image_urls: [] }),
  agent: async (id) => { const r = (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive metadataConfig{runtimeKind llmModelIdentifier}}}', { id })).getAgentRunResumeConfig; return { isActive: r.isActive, runtimeKind: r.metadataConfig?.runtimeKind, model: r.metadataConfig?.llmModelIdentifier }; },
  team: async (id) => { const r = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive executionTree}}', { id })).getTeamRunResumeConfig; return { isActive: r.isActive, members: uniq(nodes(r.executionTree)) }; },
  org: async (id) => { const r = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){isActive executionTree}}', { id })).getAgentOrgRunConfig; return { isActive: r.isActive, members: uniq(nodes(r.executionTree)) }; },
  'stop-agent': async (id) => (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id })).terminateAgentRun,
  'stop-team': async (id) => (await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id })).terminateAgentTeamRun,
  'stop-org': async (id) => (await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id })).terminateAgentOrgRun,
  models: async (id) => { const r = (await gql('query($id:String!){agentRunModelOptions(agentRunId:$id){currentModelIdentifier modelListReadable unavailableReason replacements{llmModelIdentifier}}}', { id })).agentRunModelOptions;
    return { current: r.currentModelIdentifier, readable: r.modelListReadable, unavailableReason: r.unavailableReason, offered: r.replacements.map(m => m.llmModelIdentifier) }; },
  conv: async (id) => text((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id })).getRunProjection?.conversation),
  'conv-team': async (id, m) => text((await gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}', { id, a: m })).getTeamMemberRunProjection?.conversation),
};
if (!c[cmd]) throw new Error(`unknown ${cmd}`);
console.log(JSON.stringify(await c[cmd](...a), null, 1));
