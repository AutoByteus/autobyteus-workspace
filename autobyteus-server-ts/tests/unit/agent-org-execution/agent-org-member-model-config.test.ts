import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentOrgRunService } from '../../../src/agent-org-execution/services/agent-org-run-service.js';
import { AgentOrgRunManager } from '../../../src/agent-org-execution/services/agent-org-run-manager.js';
import { AgentOrgRunExecutionTreeStore } from '../../../src/run-history/store/agent-org-run-execution-tree-store.js';
import { AgentOrgRunFileCommitWriter } from '../../../src/run-history/store/agent-org-run-file-commit-writer.js';
import { AtomicRunPackageFileCommitWriter } from '../../../src/run-history/store/atomic-run-package-file-commit-writer.js';
import { AgentMemoryLayout } from '../../../src/agent-memory/store/agent-memory-layout.js';
import { RunModelSelectionService } from '../../../src/llm-management/services/run-model-selection-service.js';
import { ActiveCollaborationRootDirectory } from '../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js';
import { createAgentOrgRootExecutionIdentity } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { AgentOrgRunPackageCatalog } from '../../../src/run-history/services/agent-org-run-package-catalog.js';
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from '../../fixtures/current-agent-org-run-fixtures.js';
import { AgentOrgTaskDelegationRecordsV1Store } from '../../../src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js';
import { AgentOrgCommunicationMessagesV1Store } from '../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js';
const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map(p=>fs.rm(p,{recursive:true,force:true}))); });
const identity = { orgRunId:'org',memberAddress:'/worker',agentRunId:'worker' };
const selection = {llmModelIdentifier:'test-model',llmConfig:{temperature:0,enabled:false}};
const deferred = () => { let resolve!:()=>void;const promise=new Promise<void>(r=>resolve=r);return {promise,resolve}; };
async function setup() {
 const memoryDir=await fs.mkdtemp(join(tmpdir(),'org-model-config-'));roots.push(memoryDir);
 const dir=new AgentMemoryLayout(memoryDir).getOrgDirPath('org');
 const tree=testAgentOrgExecutionTree({orgRunId:'org',members:[testOrgAgentNode('/worker','worker'),testOrgTeamNode({address:'/team',teamRunId:'team',coordinatorAddress:'/team/lead',members:[testOrgAgentNode('/team/lead','lead')]})]});
 const store=new AgentOrgRunExecutionTreeStore();await store.write(dir,tree);
 await new AgentOrgTaskDelegationRecordsV1Store().write(dir,{schemaVersion:1,subjectKind:'agent_org',orgRunId:'org',records:[]});
 await new AgentOrgCommunicationMessagesV1Store().write(dir,{schemaVersion:1,subjectKind:'agent_org',orgRunId:'org',messages:[]});
 const catalog={listLlmModels:vi.fn().mockResolvedValue(['test-model','equal','larger','smaller','unknown'].map(model_identifier=>({model_identifier,config_schema:{properties:{temperature:{type:'number',minimum:0,maximum:1},enabled:{type:'boolean'}}}})))};
 const capacity={resolveMany:vi.fn().mockResolvedValue(Object.fromEntries([['test-model',100],['equal',100],['larger',200],['smaller',50]].map(([k,tokens])=>[k,{kind:'known',tokens,source:'provider'}])))};
 const validator=new RunModelSelectionService(catalog,capacity);
 let runActive=true;
 const run={orgRunId:'org',rootIdentity:createAgentOrgRootExecutionIdentity('org'),isActive:()=>runActive,deliverExactAgentMessage:vi.fn(),terminate:vi.fn(async()=>({accepted:true}))};
 const build=vi.fn().mockResolvedValue(run);
 const manager=new AgentOrgRunManager({memoryDir,executionTreeStore:store,modelSelectionValidator:validator,scopeBuilder:{build} as any,activeRootDirectory:new ActiveCollaborationRootDirectory(),tokenUsageRunStore:{assertAgentOrgRecordsReady:vi.fn()}});
 return {memoryDir,dir,tree,store,manager,validator,capacity,catalog,build,failStop:()=>{runActive=false}};
}
describe('root-owned stopped Org member model settings',()=>{
 it('public service uses injected options on canonical runtime/workspace with no workspace/provider activation',async()=>{
  const h=await setup(),activate=vi.fn(),listOptions=vi.spyOn(h.validator,'listOptions');
  const service=new AgentOrgRunService({manager:h.manager,modelSelectionOptions:h.validator,workspaces:{ensureWorkspaceByRootPath:activate}} as any);
  const read=await service.getMemberModelConfig(identity);
  expect(listOptions).toHaveBeenCalledWith({runtimeKind:'autobyteus',currentModelIdentifier:'test-model',workspaceRootPath:'/workspace'});
  expect(read.modelOptions.replacements.map(row=>row.llmModelIdentifier)).toEqual(['equal','larger']);
  expect((await service.updateStoppedMemberModelConfig({...identity,...selection})).success).toBe(true);
  expect(activate).not.toHaveBeenCalled();expect(h.build).not.toHaveBeenCalled();
 });
 it.each([identity,{...identity,memberAddress:'/team/lead',agentRunId:'lead'}])('reads/saves only exact configured $memberAddress without activation, no-op write, durable restore',async target=>{
  const h=await setup(),write=vi.spyOn(h.store,'write');
  expect((await h.manager.getMemberModelConfig(target)).editability.editable).toBe(true);
  const result=await h.manager.updateStoppedMemberModelConfig({...target,...selection});
  expect(result).toMatchObject({success:true,outcome:'UPDATED',canonical:{...target,launchConfiguration:selection}});
  expect(h.build).not.toHaveBeenCalled();expect(h.capacity.resolveMany).not.toHaveBeenCalled();
  const saved=await h.store.read(h.dir,'org');
  const normalized=structuredClone(saved!);for(const m of normalized.rootOrg.members){if('agentRunId'in m){if(m.agentRunId===target.agentRunId)(m as any).launchConfiguration.llmConfig=null;}else for(const a of m.members)if(a.agentRunId===target.agentRunId)(a as any).launchConfiguration.llmConfig=null;}
  expect(normalized).toEqual(h.tree);
  expect((await h.manager.updateStoppedMemberModelConfig({...target,...selection})).outcome).toBe('UNCHANGED');expect(write).toHaveBeenCalledTimes(1);
  await h.manager.restore('org');expect(h.build.mock.calls[0][0].state.executionTree).toEqual(saved);
 });
 it.each(['equal','larger','smaller','unknown','absent'])('uses existing replacement capacity and schema validation: %s',async model=>{
  const h=await setup();const result=await h.manager.updateStoppedMemberModelConfig({...identity,...selection,llmModelIdentifier:model});
  expect(result.success).toBe(['equal','larger'].includes(model));expect(h.build).not.toHaveBeenCalled();
  if(!result.success)expect(await h.store.read(h.dir,'org')).toEqual(h.tree);
 });
 it('rejects invalid values, preserves zero/false, and reports catalog/schema unavailability',async()=>{
  const h=await setup();expect((await h.manager.updateStoppedMemberModelConfig({...identity,...selection,llmConfig:{temperature:-1}})).outcome).toBe('VALIDATION_FAILED');
  h.catalog.listLlmModels.mockRejectedValueOnce(Error('catalog down'));expect((await h.manager.updateStoppedMemberModelConfig({...identity,...selection})).outcome).toBe('MODEL_UNAVAILABLE');
  vi.spyOn(h.validator,'validate').mockResolvedValueOnce({kind:'schema_unavailable'});expect((await h.manager.updateStoppedMemberModelConfig({...identity,...selection})).outcome).toBe('SCHEMA_UNAVAILABLE');
 });
 it.each([{memberAddress:'/'},{memberAddress:'/team',agentRunId:'team'},{agentRunId:'task-worker'},{orgRunId:'other'},{agentRunId:'foreign'}])('rejects wrong/root/Team/task identity %j',async patch=>{
  const h=await setup();expect((await h.manager.updateStoppedMemberModelConfig({...identity,...patch,...selection})).outcome).toBe('NOT_FOUND');expect(h.build).not.toHaveBeenCalled();
 });
 it('does not equate unreadable canonical storage with not-found or an editable root',async()=>{
  const h=await setup();vi.spyOn(h.store,'read').mockRejectedValue(Error('unreadable canonical file'));
  await expect(h.manager.getMemberModelConfig(identity)).rejects.toThrow('unreadable');
  expect(await h.manager.updateStoppedMemberModelConfig({...identity,...selection})).toMatchObject({outcome:'INTERNAL_ERROR',success:false,canonical:null,editability:{editable:false}});
 });
 it.each(['archived','application','unadmitted'])('locks %s packages without write',async mode=>{
  const h=await setup();
  if(mode==='archived')await h.store.write(h.dir,{...h.tree,archivedAt:'2026-09-17T00:00:00.000Z'});
  if(mode==='application')await h.store.write(h.dir,{...h.tree,applicationBinding:{applicationId:'app',bindingId:'binding'}});
  if(mode==='unadmitted'){vi.spyOn(AgentOrgRunPackageCatalog.prototype,'isInitialized').mockReturnValue(true);vi.spyOn(AgentOrgRunPackageCatalog.prototype,'isAdmitted').mockReturnValue(false);}
  const write=vi.spyOn(h.store,'write');expect((await h.manager.updateStoppedMemberModelConfig({...identity,...selection})).success).toBe(false);expect(write).not.toHaveBeenCalled();
 });
 it('excludes managed fail-stopped roots even when getActive is null',async()=>{
  const h=await setup();await h.manager.restore('org');h.failStop();expect(h.manager.getActive('org')).toBeNull();
  expect((await h.manager.getMemberModelConfig(identity)).editability.editable).toBe(false);
  expect((await h.manager.updateStoppedMemberModelConfig({...identity,...selection})).outcome).toBe('RUN_ACTIVE');
 });
 it('serializes validation/write before queued restore and rejects a save queued behind restore',async()=>{
  const h=await setup(),gate=deferred(),entered=deferred();const validate=h.validator.validate.bind(h.validator);
  vi.spyOn(h.validator,'validate').mockImplementationOnce(async input=>{entered.resolve();await gate.promise;return validate(input)});
  const save=h.manager.updateStoppedMemberModelConfig({...identity,...selection});await entered.promise;
  const restore=h.manager.restore('org');expect(h.build).not.toHaveBeenCalled();gate.resolve();expect((await save).success).toBe(true);await restore;
  expect(h.build.mock.calls[0][0].state.executionTree.rootOrg.members[0].launchConfiguration.llmConfig).toEqual(selection.llmConfig);
  expect((await h.manager.updateStoppedMemberModelConfig({...identity,...selection})).outcome).toBe('RUN_ACTIVE');
 });
 it('waits for an in-flight restore before deciding Save editability',async()=>{
  const h=await setup(),entered=deferred(),gate=deferred(),build=h.build.getMockImplementation()!;
  h.build.mockImplementationOnce(async()=>{entered.resolve();await gate.promise;return build()});
  const restore=h.manager.restore('org');await entered.promise;
  const write=vi.spyOn(h.store,'write');const save=h.manager.updateStoppedMemberModelConfig({...identity,...selection});
  expect(write).not.toHaveBeenCalled();gate.resolve();await restore;expect((await save).outcome).toBe('RUN_ACTIVE');expect(write).not.toHaveBeenCalled();
 });
 it.each(['before','after','unreadable','mismatch'])('classifies %s commit/readback failure truthfully',async failure=>{
  const h=await setup();
  if(failure==='before'||failure==='after'){
   const physical=new AtomicRunPackageFileCommitWriter({operations:{mkdir:fs.mkdir,rm:fs.rm,rename:failure==='before'?async()=>{throw Error('rename failed')}:fs.rename,
    open:async(...args:Parameters<typeof fs.open>)=>{if(failure==='after'&&args[1]==='r')throw Error('directory sync failed');return fs.open(...args)}}});
   const faulty=new AgentOrgRunExecutionTreeStore(new AgentOrgRunFileCommitWriter(physical));
   vi.spyOn(h.store,'write').mockImplementation((...args)=>faulty.write(...args));
  }else{
   const write=h.store.write.bind(h.store);vi.spyOn(h.store,'write').mockImplementation(async(...args)=>{const result=await write(...args);if(failure==='unreadable')vi.spyOn(h.store,'read').mockRejectedValue(Error('unreadable'));else vi.spyOn(h.store,'read').mockResolvedValue(h.tree);return result});
  }
  const result=await h.manager.updateStoppedMemberModelConfig({...identity,...selection});expect(result.success).toBe(false);
  expect(result.outcome).toBe(failure==='before'?'PERSISTENCE_FAILED':'PERSISTENCE_INDETERMINATE');
  if(failure==='unreadable')expect(result.canonical).toBeNull();else expect(result.canonical?.launchConfiguration.llmConfig).toEqual(failure==='after'?selection.llmConfig:null);
 });
});
