import fs from 'node:fs/promises';
const here = new URL('./', import.meta.url);
const env = JSON.parse(await fs.readFile(new URL('environment.json', here)));
async function gql(query,variables={}) {
 const r=await fetch('http://127.0.0.1:3421/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});
 const j=await r.json(); if(j.errors) throw Error(JSON.stringify(j.errors)); return j.data;
}
await gql(`mutation { ensureProviderModelCatalog(providerId:"LMSTUDIO", runtimeKind:"autobyteus") { __typename } }`);
const models=await gql(`query { providerModelCatalogSnapshots(runtimeKind:"autobyteus") { llmModels { modelIdentifier activeContextTokens } } }`);
const choices=models.providerModelCatalogSnapshots.flatMap(x=>x.llmModels);
console.log('LMStudio choices', choices.filter(x=>/attachment-fixture/.test(x.modelIdentifier)));
const model=choices.find(x=>/attachment-fixture/.test(x.modelIdentifier))?.modelIdentifier;
if(!model) throw Error('Required local model unavailable');
const def=await gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,{input:{name:'API E2E Attachment Worker',role:'assistant',description:'Disposable attachment validation',instructions:'Respond briefly to the user. Do not use tools.',toolNames:[]}});
const agentDefinitionId=def.createAgentDefinition.id;
const team=await gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,{input:{name:'API E2E Attachment Team',description:'Disposable Team',instructions:'Validate attachments only.',coordinatorMemberName:'worker',nodes:[{memberName:'worker',ref:agentDefinitionId,refScope:'SHARED'}]}});
const launch={llmModelIdentifier:model,llmConfig:null,autoExecuteTools:false,skillAccessMode:'NONE',runtimeKind:'autobyteus',workspaceRootPath:env.dataRoot};
const run=await gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,{input:{teamDefinitionId:team.createAgentTeamDefinition.id,teamConfigs:[{teamAddress:'/',...launch}],memberConfigs:[{memberAddress:'/worker',agentDefinitionId,...launch}]}});
console.log(run);
if(!run.createAgentTeamRun.success) throw Error(run.createAgentTeamRun.message);
const teamRunId=run.createAgentTeamRun.teamRunId;
const resume=await gql(`query($teamRunId:String!){getTeamRunResumeConfig(teamRunId:$teamRunId){executionTree}}`,{teamRunId});
await fs.writeFile(new URL('runtime-seed.json',here),JSON.stringify({agentDefinitionId,teamDefinitionId:team.createAgentTeamDefinition.id,teamRunId,model,...resume.getTeamRunResumeConfig},null,2));
console.log('Seed saved. No messages sent.');
