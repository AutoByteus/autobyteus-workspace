import fs from 'node:fs/promises';
import path from 'node:path';
const serverUrl = 'http://127.0.0.1:60420';
const root = path.resolve('tickets/in-progress/agent-team-codex-output-not-visible/api-e2e-evidence/api-rev-003/live/provider');
const gql = async (query, variables={}) => {
  const r = await fetch(`${serverUrl}/graphql`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});
  const p = await r.json(); if(!r.ok||p.errors?.length||!p.data) throw new Error(JSON.stringify(p)); return p.data;
};
const before = await gql(`query Catalog { runtimeAvailabilities { runtimeKind enabled reason } agentDefinitions { id name ownershipScope ownerPackageId defaultLaunchConfig { llmModelIdentifier runtimeKind } } agentTeamDefinitions { id name coordinatorMemberName ownershipScope ownerPackageId defaultLaunchConfig { llmModelIdentifier runtimeKind } nodes { memberName ref refType refScope } } providerSettings { provider { id name providerType apiKeyConfigured status statusMessage } llmModels { modelIdentifier name providerType } } }`);
await fs.writeFile(path.join(root,'catalog-before-import.json'), JSON.stringify(before,null,2)+'\n');
const imported = await gql(`mutation ImportAgentPackage($input: ImportAgentPackageInput!) { importAgentPackage(input:$input) { packageId displayName path sourceKind source sharedAgentCount teamLocalAgentCount agentTeamCount applicationCount isDefault isRemovable } }`, {input:{sourceKind:'LOCAL_PATH',source:'/Users/normy/autobyteus_org/autobyteus-agents'}});
await fs.writeFile(path.join(root,'agent-package-import-result.json'), JSON.stringify(imported,null,2)+'\n');
const after = await gql(`query Catalog { runtimeAvailabilities { runtimeKind enabled reason } agentDefinitions { id name ownershipScope ownerPackageId defaultLaunchConfig { llmModelIdentifier runtimeKind } } agentTeamDefinitions { id name coordinatorMemberName ownershipScope ownerPackageId defaultLaunchConfig { llmModelIdentifier runtimeKind } nodes { memberName ref refType refScope } } providerSettings { provider { id name providerType apiKeyConfigured status statusMessage } llmModels { modelIdentifier name providerType } } }`);
await fs.writeFile(path.join(root,'catalog-after-import.json'), JSON.stringify(after,null,2)+'\n');
const target = {
  runtimeAvailabilities: after.runtimeAvailabilities,
  agents: after.agentDefinitions.filter(x => /daily assistant/i.test(x.name)),
  teams: after.agentTeamDefinitions.filter(x => /classroom/i.test(x.name)),
  models: after.providerSettings.flatMap(x=>x.llmModels.map(m=>({...m,providerId:x.provider.id,providerStatus:x.provider.status,apiKeyConfigured:x.provider.apiKeyConfigured}))).filter(m=>['gpt-5.6-luna','deepseek-v4-flash'].includes(m.modelIdentifier)),
  importedPackage: imported.importAgentPackage.find(x=>x.source==='/Users/normy/autobyteus_org/autobyteus-agents'),
};
await fs.writeFile(path.join(root,'target-catalog-summary.json'), JSON.stringify(target,null,2)+'\n');
console.log(JSON.stringify(target,null,2));
