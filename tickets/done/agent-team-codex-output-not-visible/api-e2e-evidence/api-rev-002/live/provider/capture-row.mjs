import fs from 'node:fs/promises';
import path from 'node:path';
const [kind, definitionId, promptPrefix, outName] = process.argv.slice(2);
if(!['team','agent'].includes(kind)||!definitionId||!promptPrefix||!outName) throw new Error('usage: capture-row.mjs <team|agent> <definitionId> <promptPrefix> <outName>');
const endpoint='http://127.0.0.1:60419/graphql';
const gql=async(query,variables={})=>{const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});const p=await r.json();if(!r.ok||p.errors?.length||!p.data)throw new Error(JSON.stringify(p));return p.data};
const history=await gql(`query($n:Int!){listWorkspaceRunHistory(limitPerAgent:$n){workspaceRootPath workspaceName agentDefinitions{agentDefinitionId agentName runs{runId summary createdAt archivedAt terminatedAt status isActive shouldConnectStream statusSource}} teamDefinitions{teamDefinitionId teamDefinitionName runs{teamRunId teamDefinitionId teamDefinitionName coordinatorAddress workspaceRootPath summary createdAt archivedAt terminatedAt isActive rootTeam members{memberAddress displayName agentRunId status runtimeKind workspaceRootPath}}}}}`,{n:100});
let record;
if(kind==='team'){
  const candidates=history.listWorkspaceRunHistory.flatMap(w=>w.teamDefinitions.filter(d=>d.teamDefinitionId===definitionId).flatMap(d=>d.runs.map(run=>({workspace:w,definition:d,run})))).filter(x=>x.run.summary.startsWith(promptPrefix)).sort((a,b)=>b.run.createdAt.localeCompare(a.run.createdAt));
  if(!candidates.length)throw new Error('team row not found');
  record=candidates[0];
  const teamRunId=record.run.teamRunId;
  const details=await gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree} getTeamRunExecutionCheckpoint(teamRunId:$id){rootTeamRunId changeSequence hasOpenExecutionWork} getTeamCommunicationMessages(teamRunId:$id){messageId senderAgentRunId receiverAgentRunId content messageType createdAt referenceFiles{referenceId path type createdAt updatedAt}}}`,{id:teamRunId});
  const projections={};
  for(const m of record.run.members){projections[m.memberAddress]=await gql(`query($tid:String!,$rid:String!){getTeamMemberRunProjection(teamRunId:$tid,agentRunId:$rid){agentRunId summary lastActivityAt conversation activities hasEarlierActiveTraceEvents}}`,{tid:teamRunId,rid:m.agentRunId});}
  record={capturedAt:new Date().toISOString(),kind,definitionId,...record,details,projections,communicationAddressMap:Object.fromEntries(record.run.members.map(m=>[m.agentRunId,m.memberAddress]))};
}else{
  const candidates=history.listWorkspaceRunHistory.flatMap(w=>w.agentDefinitions.filter(d=>d.agentDefinitionId===definitionId).flatMap(d=>d.runs.map(run=>({workspace:w,definition:d,run})))).filter(x=>x.run.summary.startsWith(promptPrefix)).sort((a,b)=>b.run.createdAt.localeCompare(a.run.createdAt));
  if(!candidates.length)throw new Error('agent row not found');
  record=candidates[0];
  const projection=await gql(`query($id:String!){getRunProjection(runId:$id){runId summary lastActivityAt conversation activities hasEarlierActiveTraceEvents}}`,{id:record.run.runId});
  record={capturedAt:new Date().toISOString(),kind,definitionId,...record,projection};
}
const out=path.resolve('tickets/in-progress/agent-team-codex-output-not-visible/api-e2e-evidence/api-rev-002/live/provider',outName);
await fs.writeFile(out,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({out,kind,definitionId,id:kind==='team'?record.run.teamRunId:record.run.runId,summary:record.run.summary},null,2));
