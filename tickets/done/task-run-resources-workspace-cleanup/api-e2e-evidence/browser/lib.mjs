// Shared helpers for the owned real-stack browser journeys (temporary API/E2E evidence tooling).
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../autobyteus-web/package.json'));
export const { chromium } = require('playwright-core');
export const WebSocket = require('ws');
export const state = () => JSON.parse(fs.readFileSync(path.join(here, 'stack-state.json'), 'utf8'));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const until = async (label, predicate, ms = 30000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(100); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
export const gql = async (query, variables = {}) => {
  const response = await fetch(`${state().backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
export const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
export const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
export const PROJECT_TOOLS = ['list_projects', 'list_project_tasks', 'create_or_update_project', 'create_or_update_task'];

export const config = () => ({ workspaceRootPath: state().workspace, llmModelIdentifier: 'gemini-3.8-flash-low',
  llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' });

/** Definitions shaped like a real Project Task Manager setup; names are illustrative. */
export const createDefinitions = async (label) => {
  const s = `${label} ${randomUUID().slice(0, 4)}`;
  const agent = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
  const names = { manager: `Manager ${s}`, worker: `Release Notes Writer ${s}`, helper: `Fact Checker ${s}`, assistant: `Researcher ${s}`,
    squad: `Docs Review Team ${s}`, team: `Delivery Team ${s}`, org: `Delivery Org ${s}` };
  const ids = {};
  ids.manager = await agent(names.manager, PROJECT_TOOLS);
  ids.worker = await agent(names.worker, []);
  ids.helper = await agent(names.helper, []);
  ids.assistant = await agent(names.assistant, []);
  ids.squad = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
    { input: { name: names.squad, description: 'Docs review', instructions: 'Review docs.', coordinatorMemberName: 'reviewer',
      nodes: [{ memberName: 'reviewer', ref: ids.worker, refScope: 'SHARED' }, { memberName: 'editor', ref: ids.helper, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  ids.team = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
    { input: { name: names.team, description: 'Team root', instructions: 'Deliver.', coordinatorMemberName: 'manager',
      nodes: [{ memberName: 'manager', ref: ids.manager, refScope: 'SHARED' }, { memberName: 'worker', ref: ids.worker, refScope: 'SHARED' },
        { memberName: 'helper', ref: ids.helper, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  ids.org = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}',
    { input: { name: names.org, description: 'Org root', instructions: 'Deliver.', handoffs: [], members: [
      { memberName: 'manager', ref: ids.manager, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'worker', ref: ids.worker, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'helper', ref: ids.helper, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'squad', ref: ids.squad, refType: 'AGENT_TEAM', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  return { ids, names };
};

export const ensureWorkspace = async () => {
  const existing = (await gql('query{workspaces{workspaceId absolutePath}}').catch(() => ({ workspaces: [] }))).workspaces ?? [];
  if (existing.some((w) => w.absolutePath === state().workspace)) return;
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: state().workspace } });
};

export const createProject = async (label) => {
  const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}',
    { input: { name: `Prototype Launch ${label} ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
  const task = async (description) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
    { input: { projectId, description } })).createProjectTask.taskId;
  return { projectId, task };
};
export const taskStatus = async (projectId, taskId) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId status}}', { id: projectId }))
  .projectTasks.find((t) => t.taskId === taskId)?.status;

/** Every task execution node in a stored tree (camelCase or snake_case). */
export const taskNodes = (tree) => {
  const found = [];
  const visit = (v) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== 'object') return;
    const startedAt = v.startedAt ?? v.started_at; const agentRunId = v.agentRunId ?? v.agent_run_id; const teamRunId = v.teamRunId ?? v.team_run_id;
    if (typeof startedAt === 'string' && (agentRunId || teamRunId)) found.push({ agentRunId: teamRunId ? undefined : agentRunId, teamRunId, address: v.address,
      delegatorAgentRunId: v.delegatorAgentRunId ?? v.delegator_agent_run_id, members: (v.members ?? []).map((m) => m.agentRunId ?? m.agent_run_id).filter(Boolean) });
    Object.values(v).forEach(visit);
  };
  visit(tree); return found;
};

export const createRoot = async (kind, ids) => {
  if (kind === 'agent') {
    const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',
      { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
    if (!r.success) throw new Error(r.message);
    return { kind, rootId: r.runId, managerRunId: r.runId };
  }
  if (kind === 'team') {
    const r = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',
      { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: '/', ...config() }], memberConfigs: [
        { memberAddress: '/manager', agentDefinitionId: ids.manager, ...config() },
        { memberAddress: '/worker', agentDefinitionId: ids.worker, ...config() },
        { memberAddress: '/helper', agentDefinitionId: ids.helper, ...config() }] } })).createAgentTeamRun;
    if (!r.success) throw new Error(r.message);
    const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: r.teamRunId })).getTeamRunResumeConfig.executionTree;
    const manager = tree.root_team.members.find((m) => m.address === '/manager');
    return { kind, rootId: r.teamRunId, managerRunId: manager.agent_run_id };
  }
  const r = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',
    { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  if (!r.success) throw new Error(r.message);
  const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: r.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  return { kind, rootId: r.agentOrgRunId, managerRunId: tree.rootOrg.members.find((m) => m.address === '/manager').agentRunId };
};

export const storedTree = async (root) => {
  if (root.kind === 'agent') return (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: root.rootId })).agentRunCollaboration?.root_agent?.execution_tree;
  if (root.kind === 'team') return (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: root.rootId })).getTeamRunResumeConfig.executionTree;
  return (await gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}', { id: root.rootId })).getAgentOrgRootHistory.org;
};

export const terminate = async (root) => {
  const q = root.kind === 'agent' ? 'mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}'
    : root.kind === 'team' ? 'mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}'
      : 'mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}';
  return Object.values(await gql(q, { id: root.rootId }))[0];
};

/** Server-side input channel for the Manager: what the composer sends, used for setup steps only. */
export const managerInput = async (root) => {
  const route = root.kind === 'agent' ? `agent/${root.rootId}` : root.kind === 'team' ? `agent-team/${root.rootId}` : `agent-org/${root.rootId}`;
  const socket = new WebSocket(`${state().backendUrl.replace(/^http/, 'ws')}/ws/${route}`);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  const send = (content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: root.kind === 'org'
    ? { root_subject_kind: 'agent_org', root_run_id: root.rootId, target_agent_run_id: root.managerRunId, command_id: randomUUID(),
      message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] }
    : { agent_run_id: root.managerRunId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`,
      content, context_file_paths: [], image_urls: [] } }));
  return { socket, send, close: () => socket.close() };
};
