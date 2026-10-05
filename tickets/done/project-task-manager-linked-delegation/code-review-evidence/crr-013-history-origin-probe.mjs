// Read-only offline failure-origin discriminator. No product repair or live/restart acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CollaborationRootHistoryService} from '../../../../autobyteus-server-ts/dist/run-history/services/collaboration-root-history-service.js';
import {AgentOrgRunExecutionTreeStore} from '../../../../autobyteus-server-ts/dist/run-history/store/agent-org-run-execution-tree-store.js';
import {projectAgentOrgExecutionTree} from '../../../../autobyteus-server-ts/dist/services/agent-streaming/collaboration-execution-tree-dto-projection.js';
import {agentOrgExecutionTreeDtoSchema} from '../../../../autobyteus-collaboration-stream-contracts/dist/index.js';
const T=path.resolve('tickets/in-progress/project-task-manager-linked-delegation');
const E=path.join(T,'api-e2e-evidence'), C=path.join(T,'code-review-evidence');
const witness=JSON.parse(await fs.readFile(path.join(E,'api-009-round9-fapi-009-witness.json'),'utf8'));
const captured=witness.response.data.listCollaborationRootHistory.filter(x=>x.root_subject_kind==='agent_org');
const memoryDir=path.join(E,'api-009-round9-owned-history');
const hash=x=>createHash('sha256').update(x).digest('hex');
const stampCount=x=>(JSON.stringify(x).match(/"taskLifetime"/g)||[]).length;
// Same position/identity fingerprint, not merely a set; no child can be filtered or moved.
const identities=(value,loc='$',out=[])=>{if(!value||typeof value!=='object')return out;
 if(!Array.isArray(value)) for(const key of ['address','orgRunId','agentRunId','teamRunId','platformAgentRunId','delegatorAgentRunId']) if(key in value)out.push([loc,key,value[key]]);
 for(const [key,child] of Object.entries(value))if(key!=='taskLifetime')identities(child,`${loc}.${key}`,out);return out;};
const store=new AgentOrgRunExecutionTreeStore();
const active=new Map(), before=new Map();
for(const row of captured){const file=path.join(memoryDir,'agent_orgs',row.root_run_id,'agent_org_run_execution_tree.json');before.set(file,await fs.readFile(file));
 if(row.is_active){const tree=await store.read(path.dirname(file),row.root_run_id);assert(tree);active.set(row.root_run_id,tree);}}
const catalog=captured.map(row=>({orgRunId:row.root_run_id,createdAt:row.created_at,archivedAt:row.archived_at,summary:row.summary}));
const service=new CollaborationRootHistoryService({memoryDir,teams:{listTeamRunHistory:async()=>[]},orgs:{listCatalogRows:async()=>catalog},orgRuns:{getActive:id=>active.has(id)?{getExecutionTreeSnapshot:()=>active.get(id)}:null}});
const result=await service.list();assert.equal(result.length,3);
const rows=[];
for(const row of result){const raw=agentOrgExecutionTreeDtoSchema.safeParse(row.org);assert.equal(raw.success,false,'unchanged public history facade must reproduce rejection');
 const capturedRow=captured.find(x=>x.root_run_id===row.root_run_id);const capturedParse=agentOrgExecutionTreeDtoSchema.safeParse(capturedRow.org);assert.equal(capturedParse.success,false);
 const projected=projectAgentOrgExecutionTree(row.org);const check=agentOrgExecutionTreeDtoSchema.safeParse(projected);assert.equal(check.success,true,'existing public producer diagnostic control');assert.equal(stampCount(projected),0);assert(stampCount(row.org)>0);assert.deepEqual(identities(projected),identities(row.org));
 if(row.is_active)assert.equal(row.org,active.get(row.root_run_id));
 rows.push({rootRunId:row.root_run_id,path:row.is_active?'active snapshot seam (validated archived real bytes)':'real stored-tree read',rawStrictSuccess:raw.success,rawStampCount:stampCount(row.org),capturedStrictSuccess:capturedParse.success,capturedStampCount:stampCount(capturedRow.org),existingProjectionStrictSuccess:check.success,projectedStampCount:stampCount(projected),identityFacts:identities(projected).length,identicalIdentityPositions:true});}
const bytes=[];for(const [file,original]of before){const after=await fs.readFile(file);assert.deepEqual(after,original);bytes.push({file,sha256:hash(after),unchanged:true});}
const output={result:'Pass diagnostic discriminator: existing facade rejects real stamped bytes; existing public producer accepts all identities. Product FAPI-009 remains Fail.',rows,bytes,limits:['Offline unchanged current compiled owners only; captured catalog/active seam is not another live GraphQL/renderer/restart journey.','Existing typed projector exercised only as independent repair-direction control. No delivered response edited, field stripping, schema relaxation or service fix.','No database/profile/provider/model/runtime writes or old isolated IDs restored.']};
await fs.writeFile(path.join(C,'crr-013-history-origin-probe.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
