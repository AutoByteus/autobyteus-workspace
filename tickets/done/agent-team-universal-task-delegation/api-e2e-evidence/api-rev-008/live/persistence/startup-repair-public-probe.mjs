import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const evidenceDir=path.dirname(new URL(import.meta.url).pathname);
const fixture=JSON.parse(await fs.readFile(path.join(evidenceDir,'restart-package-fixture.json'),'utf8'));
const create=JSON.parse(await fs.readFile(path.join(evidenceDir,'stale-task-create.json'),'utf8'));
const sibling=JSON.parse(await fs.readFile(path.join(evidenceDir,'valid-sibling-create.json'),'utf8'));
const base='http://127.0.0.1:60313/graphql';
const raw=async(query,variables={})=>{const r=await fetch(base,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});return {httpStatus:r.status,body:await r.json()};};
const gql=async(query,variables={})=>{const x=await raw(query,variables);if(x.httpStatus>=400||x.body.errors?.length)throw new Error(JSON.stringify(x));return x.body.data;};
const snapshotQuery=`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree} getTaskDelegationRecords(teamRunId:$id){taskId delegatorAgentRunId recipientAddress targetAgentRunId targetTeamRunId status description createdAt updates{kind submissionId reviewId interruptionId reviewedSubmissionId decision content createdAt}}}`;
const firstReadAt=new Date().toISOString();
const target=(await gql(snapshotQuery,{id:fixture.targetRoot}));
const validSibling=(await gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree}}`,{id:fixture.validSiblingRoot})).getTeamRunResumeConfig;
const invalid=await raw(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree}}`,{id:fixture.invalidRootId});
const taskById=new Map(target.getTaskDelegationRecords.map(t=>[t.taskId,t]));
const active=taskById.get(fixture.realActiveTaskId), awaiting=taskById.get(fixture.awaitingTaskId), accepted=taskById.get(fixture.acceptedTaskId);
const flatten=(team,out=[])=>{for(const t of team.task_executions??[])out.push(t);for(const m of team.members??[])if(m.kind==='configured_team'||m.kind==='task_team_member')flatten(m,out);return out;};
const executions=flatten(target.getTeamRunResumeConfig.executionTree.root_team);
const executionByRun=new Map(executions.map(e=>[e.agent_run_id??e.team_run_id,e]));
const interruption=(task)=>task?.updates?.filter(u=>u.kind==='interruption')??[];
const exactReason='Interrupted because live task recovery is not supported after TeamRun reopen.';
const settlementTimes=[fixture.activeRunId,fixture.awaitingRunId,fixture.acceptedRunId].map(id=>executionByRun.get(id)?.settled_at);
const beforeRestoreBytes={};
const rootDir=path.join(process.cwd(),'autobyteus-server-ts/tests/.tmp/api-rev-008-live-20260815-1/memory/agent_teams',fixture.targetRoot);
for(const name of ['task_delegation_records.json','team_run_execution_tree.json','team_communication_messages.json'])beforeRestoreBytes[name]=await fs.readFile(path.join(rootDir,name));
const hash=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const firstRestore=(await gql(`mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message teamRunId}}`,{id:fixture.targetRoot})).restoreAgentTeamRun;
const afterFirst=await gql(snapshotQuery,{id:fixture.targetRoot});
const terminated=(await gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`,{id:fixture.targetRoot})).terminateAgentTeamRun;
const secondRestore=(await gql(`mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message teamRunId}}`,{id:fixture.targetRoot})).restoreAgentTeamRun;
const afterSecond=await gql(snapshotQuery,{id:fixture.targetRoot});
const afterRestoreHashes={};for(const [name,before] of Object.entries(beforeRestoreBytes)){const b=await fs.readFile(path.join(rootDir,name));afterRestoreHashes[name]={before:hash(before),after:hash(b),equal:Buffer.compare(before,b)===0};}
const workspaceRootPath=path.join(evidenceDir,'../workspaces/new-root-after-invalid');await fs.mkdir(workspaceRootPath,{recursive:true});
const request={teamDefinitionId:create.team.id,memberConfigs:[['/coordinator',create.coordinator.id],['/worker',create.worker.id]].map(([memberAddress,agentDefinitionId])=>({memberAddress,agentDefinitionId,llmModelIdentifier:'gpt-5.6-luna',autoExecuteTools:true,skillAccessMode:'NONE',workspaceRootPath,runtimeKind:'autobyteus'}))};
const newRoot=(await gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,{input:request})).createAgentTeamRun;
const afterSecondTasks=afterSecond.getTaskDelegationRecords;
const assertions={
 firstPublicReadWasBeforeExplicitRestore:true,
 startupTargetInactive:target.getTeamRunResumeConfig.isActive===false,
 activeInterrupted:active?.status==='interrupted',
 awaitingReviewInterrupted:awaiting?.status==='interrupted',
 acceptedPreserved:accepted?.status==='accepted'&&accepted.updates.some(u=>u.kind==='review'&&u.decision==='accept'),
 activeOneInterruption:interruption(active).length===1,
 awaitingOneInterruption:interruption(awaiting).length===1,
 exactInterruptionReasons:[...interruption(active),...interruption(awaiting)].every(u=>u.content===exactReason),
 linkedExecutionsRemain:executions.length===3&&[fixture.activeRunId,fixture.awaitingRunId,fixture.acceptedRunId].every(id=>executionByRun.has(id)),
 linkedExecutionsSettled:settlementTimes.every(v=>typeof v==='string'&&v.length>0),
 oneAtomicSettlementTime:new Set(settlementTimes).size===1,
 interruptionsMatchSettlement:[interruption(active)[0]?.createdAt,interruption(awaiting)[0]?.createdAt].every(v=>v===settlementTimes[0]),
 orphanRemoved:!executionByRun.has(fixture.orphanRunId),
 validSiblingAvailable:validSibling.teamRunId===fixture.validSiblingRoot,
 invalidRootExcluded:Boolean(invalid.body.errors?.length)||invalid.body.data?.getTeamRunResumeConfig==null,
 explicitRestoreSucceeded:firstRestore.success===true,
 terminateSucceeded:terminated.success===true,
 secondRestoreSucceeded:secondRestore.success===true,
 explicitRestoresDidNotMutatePackage:Object.values(afterRestoreHashes).every(x=>x.equal),
 exactlyOneInterruptionAfterTwoRestores:afterSecondTasks.filter(t=>[fixture.realActiveTaskId,fixture.awaitingTaskId].includes(t.taskId)).every(t=>t.updates.filter(u=>u.kind==='interruption').length===1),
 acceptedStillAcceptedAfterTwoRestores:afterSecondTasks.find(t=>t.taskId===fixture.acceptedTaskId)?.status==='accepted',
 newRootCreationUnaffected:newRoot.success===true&&typeof newRoot.teamRunId==='string',
};
const pass=Object.values(assertions).every(Boolean);
const result={at:new Date().toISOString(),firstReadAt,fixture,targetBeforeExplicitRestore:target,validSibling,invalidRootResponse:invalid,firstRestore,afterFirst,terminated,secondRestore,afterSecond,afterRestoreHashes,newRoot,assertions,pass,operationalDatabaseAction:'NONE'};
await fs.writeFile(path.join(evidenceDir,'startup-repair-public-assertion.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({firstReadAt,targetTasks:target.getTaskDelegationRecords,executions,validSibling,invalidRootErrors:invalid.body.errors??null,firstRestore,terminated,secondRestore,afterRestoreHashes,newRoot,assertions,pass},null,2));if(!pass)process.exitCode=1;
