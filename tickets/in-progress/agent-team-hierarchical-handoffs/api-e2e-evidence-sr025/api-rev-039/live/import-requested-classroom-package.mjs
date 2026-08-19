import fs from 'node:fs';
const endpoint='http://127.0.0.1:60239/graphql';
const source='/Users/normy/autobyteus_org/autobyteus-agents';
const out=new URL('./',import.meta.url).pathname;
async function gql(query,variables={}){const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});const j=await r.json();if(!r.ok||j.errors?.length||!j.data)throw new Error(`GRAPHQL_FAILED:${r.status}:${JSON.stringify(j.errors??j)}`);return j.data;}
const imported=await gql(`mutation Import($input:ImportAgentPackageInput!){importAgentPackage(input:$input){packageId displayName path sourceKind source sharedAgentCount teamLocalAgentCount agentTeamCount applicationCount isDefault isRemovable}}`,{input:{sourceKind:'LOCAL_PATH',source}});
await gql(`mutation{refreshAgentTeamDefinitionCatalog}`);
const defs=(await gql(`query{agentTeamDefinitions{id name description coordinatorMemberName ownershipScope ownerPackageId nodes{memberName ref refType refScope}}}`)).agentTeamDefinitions;
const classroom=defs.find((x)=>x.id==='classroom-simulation-team'||x.name==='Classroom Simulation Team');
if(!classroom) throw new Error('CLASSROOM_SIMULATION_TEAM_NOT_IMPORTED');
const result={status:'PASS',source,imported:imported.importAgentPackage,classroomDefinition:classroom};
fs.writeFileSync(`${out}requested-classroom-package-import.json`,JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
