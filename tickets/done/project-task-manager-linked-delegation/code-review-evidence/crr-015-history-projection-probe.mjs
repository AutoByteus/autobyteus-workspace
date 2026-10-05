// Reviewer read-only compiled-boundary check, not HTTP/renderer/provider acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CollaborationRootHistoryService} from '../../../../autobyteus-server-ts/dist/run-history/services/collaboration-root-history-service.js';
import {AgentOrgRunExecutionTreeStore} from '../../../../autobyteus-server-ts/dist/run-history/store/agent-org-run-execution-tree-store.js';
import {agentOrgExecutionTreeDtoSchema} from '../../../../autobyteus-collaboration-stream-contracts/dist/index.js';
const T=path.resolve('tickets/in-progress/project-task-manager-linked-delegation'), C=path.join(T,'code-review-evidence');
const E=path.join(T,'api-e2e-evidence'), memoryDir=path.join(E,'api-009-round9-owned-history');
const hash=x=>createHash('sha256').update(x).digest('hex');
const stampCount=x=>(JSON.stringify(x).match(/"taskLifetime"/g)||[]).length;
// Evidence comparison only: every public leaf and collection length at its exact
// position must match the internal input. This does not transform any response.
const facts=(v,loc='$',out=[])=>{
 if(Array.isArray(v)){out.push([loc,'length',v.length]);v.forEach((x,i)=>facts(x,`${loc}.${i}`,out));}
 else if(v&&typeof v==='object'){for(const k of Object.keys(v).sort())if(k!=='taskLifetime')facts(v[k],`${loc}.${k}`,out);}
 else if(v!==undefined)out.push([loc,v]);return out;
};
const witnessPath=path.join(E,'api-009-round9-fapi-009-witness.json');
const captured=JSON.parse(await fs.readFile(witnessPath,'utf8')).response.data.listCollaborationRootHistory.filter(x=>x.root_subject_kind==='agent_org');
const store=new AgentOrgRunExecutionTreeStore(), active=new Map(), before=new Map(), privateTrees=new Map();
for(const row of captured){const file=path.join(memoryDir,'agent_orgs',row.root_run_id,'agent_org_run_execution_tree.json');before.set(file,await fs.readFile(file));const tree=await store.read(path.dirname(file),row.root_run_id);assert(tree);privateTrees.set(row.root_run_id,tree);if(row.is_active)active.set(row.root_run_id,tree);}
const catalog=captured.map(row=>({orgRunId:row.root_run_id,createdAt:row.created_at,archivedAt:row.archived_at,summary:row.summary}));
const service=new CollaborationRootHistoryService({memoryDir,teams:{listTeamRunHistory:async()=>[]},orgs:{listCatalogRows:async()=>catalog},orgRuns:{getActive:id=>active.has(id)?{getExecutionTreeSnapshot:()=>active.get(id)}:null}});
const fixturePath=path.resolve('autobyteus-web/test-support/fixtures/linked-org-history-public.json'), fixture=JSON.parse(await fs.readFile(fixturePath,'utf8'));
const provenance=JSON.parse(await fs.readFile(fixturePath.replace('.json','.provenance.json'),'utf8'));
assert.equal(hash(await fs.readFile(fixturePath)),provenance.fixtureSha256);
assert.equal(hash(await fs.readFile(witnessPath)),provenance.witness.sha256);
for(const input of provenance.inputs)assert.equal(hash(await fs.readFile(path.resolve(input.file))),input.sha256);
const result=await service.list();assert.equal(result.length,3);assert.deepEqual(result,fixture);
const rows=[];
for(const row of result){const internal=privateTrees.get(row.root_run_id), raw=captured.find(x=>x.root_run_id===row.root_run_id);assert.equal(agentOrgExecutionTreeDtoSchema.safeParse(raw.org).success,false);assert.equal(agentOrgExecutionTreeDtoSchema.safeParse(internal).success,false);assert.equal(agentOrgExecutionTreeDtoSchema.safeParse(row.org).success,true);assert.equal(stampCount(row.org),0);assert(stampCount(internal)>0);assert.deepEqual(facts(row.org),facts(internal));rows.push({rootRunId:row.root_run_id,branch:row.is_active?'validated real-tree active seam':'actual archived stored-tree reader',capturedStrict:false,currentStrict:true,privateStamps:stampCount(internal),publicStamps:0,positionedPublicLeafAndArrayFacts:facts(row.org).length,fullPublicIdentitySourceIngressLaunchForestEquality:true});}
const again=await service.list();assert.deepEqual(again,result);
const bytes=[];for(const[file,original]of before){const after=await fs.readFile(file);assert.deepEqual(after,original);bytes.push({file,sha256:hash(after),unchanged:true});}
const output={result:'Pass source-local compiled facade/strict-schema/full-fact/provenance check. Not a live product closure.',rows,bytes,fixtureProvenanceExact:true,repeatedReadEqual:true,limits:['Catalog/active snapshot controlled from real captured bytes; no active runtime/restart/HTTP acceptance.','No captured response/private bytes edited; comparison is evidence, not stripping or product machinery.','No database/profile/provider/model/old isolated endpoint opened.']};
await fs.writeFile(path.join(C,'crr-015-history-projection-probe.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
