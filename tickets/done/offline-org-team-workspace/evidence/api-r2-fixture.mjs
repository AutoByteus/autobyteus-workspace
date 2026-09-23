import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gql,info} from './api-r2-utils.mjs';
export async function createFixture(runtimeKind,model) {
 const label=`api-r2-workspace-${runtimeKind}-${Date.now()}`;
 const a=path.join(info.runtimeRoot,label,'A'),b=path.join(info.runtimeRoot,label,'B');
 await fs.mkdir(a,{recursive:true}); await fs.mkdir(b,{recursive:true});
 await fs.writeFile(path.join(a,'original.txt'),'Original project file stays at A.\n');
 const agent=(await gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,{input:{name:label,role:'Workspace continuation validator',description:'Owned temporary API/E2E fixture',instructions:'Follow the user validation steps exactly. Keep replies very brief. Use run_bash for requested cwd/file actions. Do not change directories or act on any unrelated paths. No autonomous work.',toolNames:['run_bash'],category:'api-e2e'}})).createAgentDefinition.id;
 const team=(await gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,{input:{name:label,description:'Owned Team',instructions:'Follow user validation steps.',coordinatorMemberName:'lead',nodes:['lead','unused'].map(memberName=>({memberName,ref:agent,refScope:'SHARED'}))}})).createAgentTeamDefinition.id;
 const org=(await gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,{input:{name:label,description:'Owned Org',instructions:'Follow user validation steps.',members:[{memberName:'direct',ref:agent,refType:'AGENT',refScope:'SHARED'},...['team','sibling'].map(memberName=>({memberName,ref:team,refType:'AGENT_TEAM',refScope:'SHARED'}))],handoffs:[]}})).createAgentOrgDefinition.id;
 const result=(await gql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,{input:{agentOrgDefinitionId:org,rootConfiguration:{runtimeKind,llmModelIdentifier:model,llmConfig:null,autoExecuteTools:true,skillAccessMode:'PRELOADED_ONLY',workspaceRootPath:a}}})).createAgentOrgRun;
 assert(result.success,result.message);
 return {runtimeKind,model,a,b,orgRunId:result.agentOrgRunId,label};
}
