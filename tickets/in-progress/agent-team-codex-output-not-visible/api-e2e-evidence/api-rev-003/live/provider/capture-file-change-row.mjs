import fs from 'node:fs/promises';
import path from 'node:path';
const [promptPrefix,outName]=process.argv.slice(2);
if(!promptPrefix||!outName)throw new Error('usage: promptPrefix outName');
const endpoint='http://127.0.0.1:60420/graphql';
const gql=async(query,variables={})=>{const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});const p=await r.json();if(!r.ok||p.errors?.length||!p.data)throw new Error(JSON.stringify(p));return p.data};
const history=await gql(`query($n:Int!){listWorkspaceRunHistory(limitPerAgent:$n){workspaceRootPath workspaceName teamDefinitions{teamDefinitionId teamDefinitionName runs{teamRunId summary createdAt isActive members{memberAddress agentRunId status runtimeKind workspaceRootPath}}}}}`,{n:100});
const candidates=history.listWorkspaceRunHistory.flatMap(w=>w.teamDefinitions.filter(d=>d.teamDefinitionId==='classroom-simulation-team').flatMap(d=>d.runs.map(run=>({workspace:w,definition:d,run})))).filter(x=>x.run.summary.startsWith(promptPrefix)).sort((a,b)=>b.run.createdAt.localeCompare(a.run.createdAt));
if(!candidates.length)throw new Error('row not found');
const record=candidates[0];
const projections={};
for(const m of record.run.members){
 projections[m.memberAddress]=await gql(`query($tid:String!,$rid:String!){getRunFileChanges(runId:$rid){id runId path type status sourceTool sourceInvocationId content createdAt updatedAt} getTeamMemberRunProjection(teamRunId:$tid,agentRunId:$rid){agentRunId summary lastActivityAt conversation activities hasEarlierActiveTraceEvents}}`,{tid:record.run.teamRunId,rid:m.agentRunId});
}
const details=await gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree} getTeamRunExecutionCheckpoint(teamRunId:$id){rootTeamRunId changeSequence hasOpenExecutionWork}}`,{id:record.run.teamRunId});
const out={capturedAt:new Date().toISOString(),endpoint,...record,details,projections};
const outPath=path.resolve('tickets/in-progress/agent-team-codex-output-not-visible/api-e2e-evidence/api-rev-003/live/provider',outName);
await fs.writeFile(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({outPath,teamRunId:record.run.teamRunId,members:record.run.members,fileChanges:Object.fromEntries(Object.entries(projections).map(([k,v])=>[k,v.getRunFileChanges]))},null,2));
