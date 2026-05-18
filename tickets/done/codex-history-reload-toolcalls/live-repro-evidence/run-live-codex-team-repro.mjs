const GRAPHQL_URL = 'http://127.0.0.1:8123/graphql';
const TEAM_WS_URL = 'ws://127.0.0.1:8123/ws/agent-team';
const workspaceRoot = '/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls';
const model = process.env.REPRO_CODEX_MODEL || 'gpt-5.3-codex-spark';
const runtimeKind = 'codex_app_server';
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const teamName = `Codex History Toolcall Repro Team ${stamp}`;
const prompt = `This is a history reload reproduction. Please use bash tool calls, not just prose. Run these commands in order: pwd; ls -la | head -20; git status --short. Then answer with a concise summary. Do not modify files.`;

async function gql(query, variables = {}) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (err) { throw new Error(`Invalid JSON (${res.status}): ${text}`); }
  if (!res.ok || json.errors) {
    throw new Error(`GraphQL error ${res.status}: ${JSON.stringify(json.errors || json, null, 2)}`);
  }
  return json.data;
}

const createTeamMutation = `mutation CreateTeam($input: CreateAgentTeamDefinitionInput!) {
  createAgentTeamDefinition(input: $input) {
    id name coordinatorMemberName nodes { memberName ref refType refScope }
  }
}`;

const createRunMutation = `mutation CreateTeamRun($input: CreateAgentTeamRunInput!) {
  createAgentTeamRun(input: $input) { success message teamRunId }
}`;

const historyQuery = `query History { listWorkspaceRunHistory(limitPerAgent: 20) { workspaceRootPath teamRuns { teamRunId teamDefinitionId summary status memberRunIdsByRouteKey createdAt updatedAt } agentRuns { runId agentDefinitionId summary status createdAt updatedAt } } }`;

const team = await gql(createTeamMutation, {
  input: {
    name: teamName,
    description: 'Temporary live Codex history reload reproduction team.',
    instructions: 'Route user work to the worker member. Keep responses concise.',
    category: 'repro',
    coordinatorMemberName: 'worker',
    nodes: [{ memberName: 'worker', ref: 'daily-assistant', refType: 'AGENT', refScope: 'SHARED' }],
    defaultLaunchConfig: { runtimeKind, llmModelIdentifier: model, llmConfig: { reasoningEffort: 'low' } },
  },
});
console.log('CREATED_TEAM', JSON.stringify(team.createAgentTeamDefinition));

const run = await gql(createRunMutation, {
  input: {
    teamDefinitionId: team.createAgentTeamDefinition.id,
    memberConfigs: [{
      memberName: 'worker',
      memberRouteKey: 'worker',
      agentDefinitionId: 'daily-assistant',
      llmModelIdentifier: model,
      autoExecuteTools: true,
      skillAccessMode: 'NONE',
      workspaceRootPath: workspaceRoot,
      runtimeKind,
      llmConfig: { reasoningEffort: 'low' },
    }],
  },
});
console.log('CREATED_RUN', JSON.stringify(run.createAgentTeamRun));
if (!run.createAgentTeamRun.success || !run.createAgentTeamRun.teamRunId) {
  process.exitCode = 2;
  throw new Error('createAgentTeamRun failed');
}
const teamRunId = run.createAgentTeamRun.teamRunId;
const wsMessages = [];
const start = Date.now();
let sawTool = false;
let sawCompleted = false;
let finalError = null;

await new Promise((resolve, reject) => {
  const ws = new WebSocket(`${TEAM_WS_URL}/${teamRunId}`);
  const timeout = setTimeout(() => {
    finalError = 'timeout waiting for TURN_COMPLETED';
    try { ws.close(); } catch {}
    resolve();
  }, 240000);
  ws.addEventListener('open', () => {
    console.log('WS_OPEN');
  });
  ws.addEventListener('message', (event) => {
    const raw = String(event.data);
    let msg;
    try { msg = JSON.parse(raw); } catch { msg = { type: 'UNPARSEABLE', raw }; }
    wsMessages.push({ atMs: Date.now() - start, msg });
    const type = msg.type;
    const payload = msg.payload || {};
    const compact = { type, agent_id: payload.agent_id, agent_name: payload.agent_name, segment_type: payload.segment_type, tool_name: payload.tool_name, invocation_id: payload.invocation_id, status: payload.status, code: payload.code, message: payload.message };
    console.log('WS_MSG', JSON.stringify(compact));
    if (type === 'CONNECTED') {
      ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content: prompt, target_member_name: 'worker', context_file_paths: [], image_urls: [] } }));
      console.log('WS_SENT_PROMPT');
    }
    if (type && String(type).startsWith('TOOL_')) sawTool = true;
    if (type === 'TOOL_APPROVAL_REQUESTED') {
      ws.send(JSON.stringify({
        type: 'APPROVE_TOOL',
        payload: {
          invocation_id: payload.invocation_id,
          agent_name: payload.agent_name || 'worker',
          reason: 'Live history reload reproduction auto-approval.',
          approval_token: payload.approval_token,
        },
      }));
      console.log('WS_APPROVED_TOOL', payload.invocation_id);
    }
    if (type === 'ERROR') {
      finalError = payload.message || payload.code || 'unknown websocket error';
    }
    if (type === 'TURN_COMPLETED') {
      sawCompleted = true;
      clearTimeout(timeout);
      setTimeout(() => { try { ws.close(); } catch {}; resolve(); }, 1000);
    }
  });
  ws.addEventListener('error', (event) => {
    finalError = 'websocket error';
    console.error('WS_ERROR', event.message || event.type || event);
  });
  ws.addEventListener('close', () => {
    console.log('WS_CLOSE');
    clearTimeout(timeout);
    resolve();
  });
});

const history = await gql(historyQuery);
console.log('RUN_RESULT', JSON.stringify({ teamRunId, teamDefinitionId: team.createAgentTeamDefinition.id, model, runtimeKind, sawTool, sawCompleted, finalError, wsMessageCount: wsMessages.length }));
console.log('HISTORY_AFTER_RUN', JSON.stringify(history, null, 2));
console.log('WS_MESSAGES_JSON_START');
console.log(JSON.stringify(wsMessages, null, 2));
console.log('WS_MESSAGES_JSON_END');
if (!sawCompleted || finalError) process.exitCode = 3;
