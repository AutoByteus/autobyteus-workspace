import { mkdir, writeFile } from 'node:fs/promises';
const outputPath=process.argv[2]; if(!outputPath) throw new Error('usage');
const graphqlUrl=process.env.GRAPHQL_URL ?? 'http://127.0.0.1:60311/graphql';
const gql=async(q,v={})=>{const r=await fetch(graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(!r.ok||j.errors?.length)throw new Error(JSON.stringify(j.errors??j));return j.data};
const workspaceRootPath=new URL('../workspaces/classroom-api-rev-006/', import.meta.url).pathname; await mkdir(workspaceRootPath,{recursive:true});
const request={teamDefinitionId:'classroom-simulation-team',memberConfigs:[
{memberAddress:'/professor',agentDefinitionId:'team-local-agent:classroom-simulation-team:professor',llmModelIdentifier:'gpt-5.6-luna',autoExecuteTools:true,skillAccessMode:'NONE',workspaceRootPath,runtimeKind:'autobyteus'},
{memberAddress:'/student',agentDefinitionId:'team-local-agent:classroom-simulation-team:student',llmModelIdentifier:'gpt-5.6-luna',autoExecuteTools:true,skillAccessMode:'NONE',workspaceRootPath,runtimeKind:'autobyteus'}]};
const response=await gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,{input:request});
const teamRunId=response.createAgentTeamRun.teamRunId;
const resume=await gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree}}`,{id:teamRunId});
const coordinator=resume.getTeamRunResumeConfig.executionTree.root_team.members.find(m=>m.address==='/professor');
const out={request,response:{data:response},resume:{data:resume},teamRunId,coordinatorAgentRunId:coordinator.agent_run_id,workspaceRootPath};
await writeFile(outputPath,JSON.stringify(out,null,2)+'\n'); console.log(JSON.stringify({teamRunId,coordinatorAgentRunId:coordinator.agent_run_id,workspaceRootPath},null,2));
