import fs from 'node:fs';
const endpoint = 'http://127.0.0.1:60235/graphql';
const stage = '/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/.tmp/api-rev-035-live-20260812-1/staged-package';
const out = new URL('./', import.meta.url).pathname;
async function gql(query, variables={}) {
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});
  const json=await response.json();
  if(!response.ok||json.errors?.length||!json.data) throw new Error(`GRAPHQL_FAILED:${response.status}:${JSON.stringify(json.errors??json)}`);
  return json.data;
}
const imported = await gql(`mutation Import($input: ImportAgentPackageInput!){ importAgentPackage(input:$input){ packageId displayName path sourceKind source sharedAgentCount teamLocalAgentCount agentTeamCount applicationCount isDefault isRemovable } }`,{input:{sourceKind:'LOCAL_PATH',source:stage}});
const refreshed = await gql(`mutation { refreshAgentTeamDefinitionCatalog }`);
const definitions = await gql(`query { agentTeamDefinitions { id name description coordinatorMemberName handoffs { from to rules } ownershipScope ownerPackageId nodes { memberName ref refType refScope } } runtimeAvailabilities { runtimeKind enabled reason } }`);
const nested = definitions.agentTeamDefinitions.find((item)=>item.id==='nested-classroom-test');
if(!nested) throw new Error('NESTED_DEFINITION_NOT_IMPORTED');
fs.writeFileSync(`${out}package-import-and-definition.json`,JSON.stringify({sourceKind:'LOCAL_PATH',source:stage,importedPackages:imported.importAgentPackage,refreshed:refreshed.refreshAgentTeamDefinitionCatalog,nestedDefinition:nested,runtimeAvailabilities:definitions.runtimeAvailabilities},null,2)+'\n');
const catalog={};
for(const runtimeKind of ['autobyteus','codex_app_server','claude_agent_sdk']) {
 catalog[runtimeKind]=(await gql(`query Catalog($runtimeKind:String){ availableLlmProvidersWithModels(runtimeKind:$runtimeKind){ provider { id name providerType isCustom status statusMessage } models { modelIdentifier name providerType runtime configSchema } } }`,{runtimeKind})).availableLlmProvidersWithModels;
}
fs.writeFileSync(`${out}runtime-model-catalog.json`,JSON.stringify(catalog,null,2)+'\n');
const has=(kind,id)=>catalog[kind].some((provider)=>provider.models.some((model)=>model.modelIdentifier===id||model.name===id));
const runtimeAvailability=Object.fromEntries(definitions.runtimeAvailabilities.map((row)=>[row.runtimeKind,row]));
const claudeModels=catalog.claude_agent_sdk.flatMap((provider)=>provider.models).map((model)=>model.modelIdentifier).filter(Boolean);
const summary={status:'PASS',required:{autobyteus:{enabled:runtimeAvailability.autobyteus?.enabled===true,model:'gpt-5.6-luna',modelPresent:has('autobyteus','gpt-5.6-luna')},codex_app_server:{enabled:runtimeAvailability.codex_app_server?.enabled===true,model:'gpt-5.6-luna',reasoningEffort:'medium',modelPresent:has('codex_app_server','gpt-5.6-luna')},claude_agent_sdk:{enabled:runtimeAvailability.claude_agent_sdk?.enabled===true,modelCandidates:claudeModels}},nestedDefinitionId:nested.id};
if(!summary.required.autobyteus.enabled||!summary.required.autobyteus.modelPresent||!summary.required.codex_app_server.enabled||!summary.required.codex_app_server.modelPresent||!summary.required.claude_agent_sdk.enabled||claudeModels.length===0) throw new Error(`REQUIRED_RUNTIME_OR_MODEL_UNAVAILABLE:${JSON.stringify(summary)}`);
fs.writeFileSync(`${out}runtime-model-preflight-summary.json`,JSON.stringify(summary,null,2)+'\n');
process.stdout.write(`${JSON.stringify(summary,null,2)}\n`);
