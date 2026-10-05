import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {RootExecutionViewDtoSchema,CollaborationStreamServerMessageSchema} from '../../../../autobyteus-collaboration-stream-contracts/dist/index.js';
const E='tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence';
const i=JSON.parse(await fs.readFile(E+'/api-017-history-restart.json')).result,j=JSON.parse(await fs.readFile(E+'/api-017-claude-concrete-agent_org.json'));
assert(i.ownsDataRoot&&i.instanceId===j.instanceId&&!j.error);
async function gql(query,variables={}){const r=await fetch(i.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});const v=await r.json();assert.equal(r.status,200);assert(!v.errors,JSON.stringify(v.errors));return v.data;}
const inspection=(await gql('query($id:String!){getAgentOrgRunInspection(orgRunId:$id)}',{id:j.rootId})).getAgentOrgRunInspection;RootExecutionViewDtoSchema.parse(inspection);
const ids=[j.lifetimes.A.executions[0].ingressAgentRunId,...j.childIds,...j.newIds];
assert.equal(new Set(ids).size,5);
for(const id of ids){assert.equal(inspection.root_org.agent_statuses.find(r=>r.agent_run_id===id)?.status,'offline',id);const input=inspection.root_org.agent_input_states.find(r=>r.agent_run_id===id)?.state;if(input){assert.equal(input.entries.length,0);assert.equal(input.recoverableBlock,null);}else{assert.equal(inspection.root_org.agent_statuses.find(r=>r.agent_run_id===id)?.status,'offline','Only retired offline actors may omit live input state');}}
assert.equal(inspection.root_org.agent_statuses.find(r=>r.agent_run_id===j.managerRunId)?.status,'idle');assert(inspection.root_org.is_active);
for(const f of j.frames)CollaborationStreamServerMessageSchema.parse(f);
const resumed=JSON.parse(await fs.readFile(E+'/api-017-claude-resume.json'));assert(resumed.rendererRetainedConversationAndNewReply&&!resumed.error);for(const f of resumed.frames)CollaborationStreamServerMessageSchema.parse(f);
const a=JSON.parse(await fs.readFile(E+'/api-017-claude-final-a.json'));assert(a.result&&!a.error);for(const f of a.frames)CollaborationStreamServerMessageSchema.parse(f);
const host=JSON.parse(await fs.readFile(E+'/api-017-ambiguity.json'));RootExecutionViewDtoSchema.parse(host.view);assert.equal(host.view.root_agent.execution_tree.taskExecutions.length,0);
assert(!JSON.stringify([inspection,j.frames,resumed.frames,a.frames,host.view]).includes('taskLifetime'));
const st=JSON.parse(await fs.readFile(path.join(i.dataRoot,'server-data/projects/projects.json')));const p=st.find(p=>p.projectId===j.project.projectId);assert(p);assert(p.tasks.every(t=>t.status==='DONE'));assert.equal(p.taskLifetimes.length,3);assert(p.taskLifetimes.every(l=>l.completedAt&&l.executions.every(e=>e.cleanup==='released')));
const result={at:new Date().toISOString(),instanceId:i.instanceId,rootId:j.rootId,exactWorkerIds:ids,inspection,project:p,currentFullStrictFrames:j.frames.length+resumed.frames.length+a.frames.length,chatView:host.view,canonicalAllFiveOfflineRetiredOrEmpty:true,protectedManagerIdleRootActive:true,scope:'Observational current full recursive public forest and five canonical worker status snapshots; current live input records empty when present, retired offline handles absent; no private lifetime keys. Not paid SDK PID/IO proof or universal privacy certificate.'};
await fs.writeFile(E+'/api-017-final-public-proof.json',JSON.stringify(result,null,2)+'\n');console.log('Scoped Pass five original/reopened/current workers offline; existing live inputs empty, retired input handles absent, Manager idle/root active; all full public frames/forests strict, private stamps absent; three lifetimes closed/all released without business recreation.');
