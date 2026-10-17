// Standalone Article Writing Team run (Codex); its coordinator answers one short message and goes idle.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/autobyteus-web/package.json');
const WebSocket = require('ws');
const [base, wsRoot] = process.argv.slice(2);
const gql = async (query, variables = {}) => { const b = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
  if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };
const cfg = { workspaceRootPath: wsRoot, llmModelIdentifier: 'gpt-5.6-sol', llmConfig: null, autoExecuteTools: true, runtimeKind: 'codex_app_server' };
const r = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: {
  teamDefinitionId: 'article-writing-team', teamConfigs: [{ teamAddress: '/', ...cfg }],
  memberConfigs: [['article_writer', 'team-local-agent:article-writing-team:article-writer'], ['article_reviewer', 'team-local-agent:article-writing-team:article-reviewer']]
    .map(([m, id]) => ({ memberAddress: `/${m}`, agentDefinitionId: id, ...cfg })) } })).createAgentTeamRun;
if (!r.success) throw new Error(r.message);
const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: r.teamRunId })).getTeamRunResumeConfig.executionTree;
const coordinator = tree.root_team.members.find((m) => m.address === '/article_writer').agent_run_id;
const socket = new WebSocket(`${base.replace(/^http/, 'ws')}/ws/agent-team/${r.teamRunId}`);
await new Promise((res, rej) => { socket.once('open', res); socket.once('error', rej); });
socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: coordinator, message_id: `verify-${randomUUID()}`,
  dedupe_key: `agent_run_input:verify:${randomUUID()}`, context_file_paths: [], image_urls: [],
  content: 'Hi! This is only a quick check. Reply with one short sentence saying you are ready, and do nothing else yet.' } }));
await new Promise((res) => setTimeout(res, 1500)); socket.close();
console.log(JSON.stringify({ teamRunId: r.teamRunId, coordinatorAgentRunId: coordinator }));
