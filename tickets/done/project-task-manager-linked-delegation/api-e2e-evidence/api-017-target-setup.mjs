// API17 temporary current-build probe: fresh exact own instance only; prior input reused as reviewed executable recipe, NOT prior IDs/results.
// Temporary public catalog/setup probe. Exact new owned instance only; no secret values.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const E='tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence';
const original=JSON.parse(await fs.readFile(E+'/api-017-instance.json')).result;
const i=JSON.parse(await fs.readFile(E+'/api-017-instance.json')).result;
assert(i.ownsDataRoot&&i.instanceId===original.instanceId&&i.dataRoot===original.dataRoot);
async function gql(query,variables={}){const r=await fetch(i.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(90000)});const j=await r.json();assert.equal(r.status,200);assert(!j.errors,JSON.stringify(j.errors));return j.data;}
const runtimes={native:{runtimeKind:'autobyteus',model:'deepseek-v4-flash',llmConfig:{thinking_type:'disabled'}},codex:{runtimeKind:'codex_app_server',model:'gpt-6.1-sol',llmConfig:{reasoning_effort:'low'}},claude:{runtimeKind:'claude_agent_sdk',model:'sonnet',llmConfig:{thinking_enabled:false,reasoning_effort:'medium'}}};
const mode=process.argv[2];
if(mode==='catalog'){
 const out={instanceId:i.instanceId,at:new Date().toISOString(),catalogs:{},targets:{},credentialStates:{}};
 const fields='ownerProvider{id name} sources{modelKind state modelCount safeMessage} llmModels{modelIdentifier name canonicalName configSchema}';
 for(const [key,c] of Object.entries(runtimes).filter(([key])=>key==='claude')){
  out.catalogs[key]=(await gql(`query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){${fields}}}`,{r:c.runtimeKind})).providerModelCatalogSnapshots;
  // Fresh SDK catalog query owns discovery; native dynamic-provider reload is inapplicable.
  const matches=out.catalogs[key].flatMap(p=>p.llmModels).filter(m=>m.modelIdentifier===c.model&&(key!=='claude'||m.canonicalName==='claude-sonnet-5'));
  assert(matches.length<=1,'Ambiguous exact target');
  out.targets[key]={...c,ready:matches.length===1,selected:matches[0]??null};
  out.credentialStates[key]=(await gql('query($r:String){providerCredentialSettings(runtimeKind:$r){provider{id} apiKeyConfigured}}',{r:c.runtimeKind})).providerCredentialSettings;
 }
 out.settings=(await gql('{getServerSettings{key value}}')).getServerSettings.filter(s=>['CLAUDE_AGENT_SDK_AUTH_MODE','AUTOBYTEUS_LLM_SERVER_HOSTS'].includes(s.key));
 await fs.writeFile(E+'/api-017-runtime-catalog.json',JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify({instanceId:i.instanceId,targets:out.targets,claudeOffered:out.catalogs.claude.flatMap(p=>p.llmModels),settings:out.settings}));
}else{
 const target=process.argv[3];assert(mode==='setup'&&runtimes[target]);
 const catalog=JSON.parse(await fs.readFile(E+'/api-017-runtime-catalog.json'));assert(catalog.instanceId===i.instanceId);const t=catalog.targets[target];assert(t.ready,'EXACT_AUTHORIZED_TARGET_NOT_OFFERED');
 const prefix='API017_'+target.toUpperCase(),config={runtimeKind:t.runtimeKind,llmModelIdentifier:t.selected.modelIdentifier,llmConfig:t.llmConfig};
 const out={target,instanceId:i.instanceId,started:new Date().toISOString(),catalogTarget:t,prefix,config,workspaces:{}};
 for(const role of ['manager','agent-a','team-b']){const p=path.join(i.dataRoot,'validation-workspace',target,role);await fs.mkdir(p,{recursive:true});await fs.writeFile(path.join(p,'protected-sentinel.txt'),'PRESERVE_'+prefix+'_'+role+'\n');out.workspaces[role]=p;}
 const guard='Never inspect credentials, HOME or unrelated paths; do not modify files, create copies, or change Task status. Complete only supplied work. ';
 const make=async(name,instructions)=>(await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id name defaultLaunchConfig{runtimeKind llmModelIdentifier llmConfig}}}',{i:{name,description:'Owned exact-runtime API017 lifecycle validation',instructions,toolNames:['read_file','send_message_to'],skillNames:[],defaultLaunchConfig:config}})).createAgentDefinition;
 out.agent=await make(prefix+' Packet Agent',guard+'Read supplied saved Task context with read_file or runtime-native read-only cat, report exact actual bytes to requester with send_message_to, then final answer.');
 out.coordinator=await make(prefix+' Team Coordinator',guard+`Read supplied saved Task attachment yourself. Send one work message with its exact readable path to configured Team reader at /${prefix.toLowerCase()}_packet_team/reader (not the catalog Agent) with send_message_to. Ask for exact read marker; report your own actual marker to requester, then final answer. No particular notification guarantee is needed.`);
 out.reader=await make(prefix+' Team Reader',guard+'Read only the provided attachment and report actual marker through send_message_to, then final answer.');
 out.team=(await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id name}}',{i:{name:prefix+' Packet Team',description:'Two-member saved-context reader Team',instructions:'Read only supplied saved context; do not create copies or change status.',nodes:[{memberName:'coordinator',ref:out.coordinator.id,refScope:'SHARED'},{memberName:'reader',ref:out.reader.id,refScope:'SHARED'}],coordinatorMemberName:'coordinator',defaultLaunchConfig:config}})).createAgentTeamDefinition;
 await fs.writeFile(E+'/api-017-'+target+'-setup.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
}
