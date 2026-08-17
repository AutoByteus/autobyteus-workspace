import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [phase = 'pre-reopen'] = process.argv.slice(2);
const teamRunId = 'classroom_simulation_team_aadbe5a3b3b444d8bbe0ca0cbcddb51c';
const agentRunId = 'professor_7a62e8cb6ed2495291386e2df0b2d1f7';
const marker = 'CODEX_TEAM_VISIBLE_API_REV_001_FINAL_20260817';
const followupMarker = 'CODEX_TEAM_RESTORED_FOLLOWUP_API_REV_001_20260817';
const query = `query PersistedState($teamRunId:String!,$agentRunId:String!){
  getTeamRunResumeConfig(teamRunId:$teamRunId){teamRunId isActive executionTree}
  getTeamMemberRunProjection(teamRunId:$teamRunId,agentRunId:$agentRunId){
    agentRunId summary lastActivityAt conversation activities hasEarlierActiveTraceEvents
  }
}`;
const response = await fetch('http://127.0.0.1:60418/graphql', {
  method: 'POST',
  headers: {'content-type':'application/json'},
  body: JSON.stringify({query,variables:{teamRunId,agentRunId}}),
});
const payload = await response.json();
if (!response.ok || payload.errors?.length || !payload.data) throw new Error(JSON.stringify(payload));
const checkpointQuery = `query Checkpoint($teamRunId:String!){
  getTeamRunExecutionCheckpoint(teamRunId:$teamRunId){rootTeamRunId changeSequence hasOpenExecutionWork}
}`;
const checkpointResponse = await fetch('http://127.0.0.1:60418/graphql', {
  method: 'POST',
  headers: {'content-type':'application/json'},
  body: JSON.stringify({query:checkpointQuery,variables:{teamRunId}}),
});
const checkpointPayload = await checkpointResponse.json();
const resume = payload.data.getTeamRunResumeConfig;
const checkpoint = checkpointPayload.data?.getTeamRunExecutionCheckpoint ?? null;
const projection = payload.data.getTeamMemberRunProjection;
const root = resume.executionTree.root_team;
const professor = root.members.find((member) => member.address === '/professor');
const assistants = projection.conversation.filter((entry) => entry.role === 'assistant');
const markerEntries = assistants.filter((entry) => entry.content === marker);
const followupMarkerEntries = assistants.filter((entry) => entry.content === followupMarker);
const canonicalState = {
  teamRunId: resume.teamRunId,
  executionTree: resume.executionTree,
  agentRunId: projection.agentRunId,
  conversation: projection.conversation,
  activities: projection.activities,
};
const summary = {
  phase,
  teamRunId: resume.teamRunId,
  professorAgentRunId: professor?.agent_run_id ?? null,
  projectionAgentRunId: projection.agentRunId,
  runtimeKind: professor?.launch_configuration?.runtime_kind ?? null,
  modelIdentifier: professor?.launch_configuration?.llm_model_identifier ?? null,
  checkpoint,
  assistantMarkerCount: markerEntries.length,
  assistantFollowupMarkerCount: followupMarkerEntries.length,
  exactIdentity: resume.teamRunId === teamRunId
    && (checkpoint === null || checkpoint.rootTeamRunId === teamRunId)
    && professor?.agent_run_id === agentRunId
    && projection.agentRunId === agentRunId,
  canonicalStateSha256: crypto.createHash('sha256').update(JSON.stringify(canonicalState)).digest('hex'),
};
if (!summary.exactIdentity) throw new Error('PERSISTED_IDENTITY_MISMATCH');
if (summary.assistantMarkerCount !== 1) throw new Error('PERSISTED_MARKER_COUNT_MISMATCH');
if (summary.runtimeKind !== 'CODEX' || summary.modelIdentifier !== 'gpt-5.6-luna') {
  throw new Error('PERSISTED_LAUNCH_CONFIG_MISMATCH');
}
const out = path.resolve('tickets/in-progress/agent-team-codex-output-not-visible/api-e2e-evidence/api-rev-001/live/provider');
await fs.writeFile(path.join(out, `classroom-codex-persisted-${phase}.json`), JSON.stringify({summary,payload,checkpointPayload},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
