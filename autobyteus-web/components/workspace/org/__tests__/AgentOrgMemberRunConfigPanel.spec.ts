import { mount, flushPromises } from '@vue/test-utils'
import { shallowReactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AgentOrgMemberRunConfigPanel from '../AgentOrgMemberRunConfigPanel.vue'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { AgentOrgMemberModelConfig } from '~/graphql/queries/runModelOptionsQueries'
import type { AgentOrgMemberModelConfigIdentity } from '~/services/runConfigEditing/agentOrgMemberModelConfigClient'
const io=vi.hoisted(()=>({query:vi.fn(),mutate:vi.fn(),restore:vi.fn(),terminate:vi.fn()}))
vi.mock('~/utils/apolloClient',()=>({getApolloClient:()=>io}))
vi.mock('~/stores/runHistoryStore',()=>({useRunHistoryStore:()=>({applyAgentOrgActivity:vi.fn()})}))
vi.mock('~/stores/agentOrgRunStore',()=>({useAgentOrgRunStore:()=>({restore:io.restore,terminate:io.terminate})}))
vi.mock('~/stores/llmProviderConfig',()=>({useLLMProviderConfigStore:()=>({
 fetchProvidersWithModels:vi.fn().mockResolvedValue([]),refreshLocalCatalog:vi.fn().mockResolvedValue([]),ensureMissingDynamicProviders:vi.fn().mockResolvedValue(undefined),providerSnapshots:()=>[],
 providersWithModelsForSelection:()=>[{provider:{id:'OPENAI',name:'OpenAI',providerType:'OPENAI',isCustom:false},models:['gpt-5.6-sol','replacement'].map(id=>({modelIdentifier:id,name:id,value:id,canonicalName:id,providerId:'OPENAI',providerName:'OpenAI',providerType:'OPENAI',runtime:'api',configSchema:{type:'object',properties:{budget:{type:'integer',minimum:0,maximum:10},enabled:{type:'boolean'}}}}))}]
})}))
vi.mock('~/stores/runtimeAvailabilityStore',()=>({useRuntimeAvailabilityStore:()=>({availabilities:[],fetchRuntimeAvailabilities:vi.fn().mockResolvedValue([]),availabilityByKind:()=>({enabled:true}),isRuntimeEnabled:()=>true,runtimeReason:()=>null})}))
const wrappers:ReturnType<typeof mount>[]=[]
const identity={orgRunId:'org-run',memberAddress:'/director',agentRunId:'agent-director'}
const deferred=()=>{let resolve!:(v:any)=>void;const promise=new Promise<any>(r=>resolve=r);return {promise,resolve}}
let values:Record<string,any>
const canonical=(id:AgentOrgMemberModelConfigIdentity,active=false)=>({...id,launchConfiguration:{runtimeKind:'codex_app_server',llmModelIdentifier:'gpt-5.6-sol',llmConfig:{budget:1,enabled:true},autoExecuteTools:false,skillAccessMode:'PRELOADED_ONLY',workspaceRootPath:null,...values[id.agentRunId]},isActive:active,editability:{editable:!active,reason:active?'RUN_ACTIVE':null}})
const options={currentModelIdentifier:'gpt-5.6-sol',currentContextTokens:100,replacements:[{llmModelIdentifier:'replacement',contextTokens:200}],unavailableReason:null}
const result=(id=identity)=>({success:true,outcome:'UPDATED',message:'Saved',isActive:false,editability:{editable:true,reason:null},canonical:canonical(id),fieldErrors:[]})
beforeEach(()=>{
 setActivePinia(createPinia());vi.clearAllMocks();values={}
 io.query.mockImplementation(async({query,variables}:any)=>query===AgentOrgMemberModelConfig
  ?{data:{getAgentOrgMemberModelConfig:{...canonical(variables.identity),modelOptions:{...options,currentModelIdentifier:canonical(variables.identity).launchConfiguration.llmModelIdentifier}}}}
  :{data:{getAgentOrgMemberRunProjection:{...variables,conversation:[],activities:[],hasEarlierActiveTraceEvents:false}}})
 io.mutate.mockImplementation(async({variables:{input}}:any)=>{values[input.agentRunId]={llmModelIdentifier:input.llmModelIdentifier,llmConfig:input.llmConfig};return {data:{updateStoppedAgentOrgMemberModelConfig:result(input)}}})
})
afterEach(()=>{wrappers.splice(0).forEach(w=>w.unmount());vi.restoreAllMocks()})
async function setup(id=identity,active=false){
 const view=taskBearingView();view.is_active=active
 const staged=await stageAgentOrgExecutionContext({orgRunId:'org-run',view,source:'inspection'});staged.commitActivities()
 const store=useAgentOrgContextsStore();store.contexts['org-run']=shallowReactive(staged.context);store.select('org-run',{kind:'agent_execution',agentRunId:id.agentRunId})
 return {store,org:store.contextFor('org-run')!,target:store.activeTargetFor('org-run')! as any}
}
async function panel(id=identity,active=false){const h=await setup(id,active);const w=mount(AgentOrgMemberRunConfigPanel,{props:{target:h.target}});wrappers.push(w);await flushPromises();return {...h,w}}
describe('stopped Org real form/controller/context/transport path',()=>{
 it.each([identity,{...identity,memberAddress:'/team/lead',agentRunId:'agent-lead-configured'}])('saves/reopens exact $memberAddress with real schema and retained objects',async id=>{
  const {w,store,org,target}=await panel(id);const ctx=target.context
  ctx.requirement='retained draft';ctx.contextFilePaths=[{path:'attachment'}];ctx.conversation.messages.push({type:'user',text:'retained',timestamp:new Date()} as any)
  const state=ctx.state,conversation=ctx.conversation,messages=ctx.conversation.messages,files=ctx.contextFilePaths,selection=org.selection
  const activity=useAgentActivityStore();activity.activitiesByRunId.set(id.agentRunId,{activities:[{kind:'system_instruction',activityId:'system',content:'retain'} as any],hasAwaitingApproval:false,highlightedActivityId:null})
  const revision=activity.getActivityContentRevision(id.agentRunId)
  expect(w.get('[data-test="save-org-model-config"]').attributes('disabled')).toBeDefined()
  await w.get('input[type="number"]').setValue('0');await flushPromises()
  expect(w.get('[data-test="save-org-model-config"]').attributes('disabled')).toBeUndefined()
  await w.get('[data-test="save-org-model-config"]').trigger('click');await flushPromises()
  expect(io.mutate).toHaveBeenCalledTimes(1);expect(io.mutate.mock.calls[0][0].variables.input).toMatchObject({...id,llmConfig:{budget:0}})
  expect(ctx.config.llmConfig.budget).toBe(0);expect(org.index.requireAgent(id.agentRunId).source.launchConfiguration.llmConfig?.budget).toBe(0)
  expect(ctx.state).toBe(state);expect(ctx.conversation).toBe(conversation);expect(ctx.conversation.messages).toBe(messages);expect(ctx.contextFilePaths).toBe(files);expect(ctx.requirement).toBe('retained draft');expect(org.selection).toBe(selection)
  expect(activity.getActivities(id.agentRunId)[0].activityId).toBe('system');expect(activity.getActivityContentRevision(id.agentRunId)).toBe(revision)
  expect(io.restore).not.toHaveBeenCalled();expect(io.terminate).not.toHaveBeenCalled()
  w.unmount();const reopened=mount(AgentOrgMemberRunConfigPanel,{props:{target:store.activeTargetFor('org-run')! as any}});wrappers.push(reopened);await flushPromises();expect((reopened.get('input[type="number"]').element as HTMLInputElement).value).toBe('0')
 })
 it('selects an eligible replacement through the actual model dropdown and saves it',async()=>{
  const {w,target}=await panel()
  await w.get('button[aria-haspopup="listbox"]').trigger('click');await flushPromises()
  const option=Array.from(document.querySelectorAll('[role="option"]')).find(e=>e.textContent?.includes('replacement')) as HTMLElement
  expect(option).toBeTruthy();option.click();await flushPromises()
  expect(w.get('[data-test="save-org-model-config"]').attributes('disabled')).toBeUndefined()
  await w.get('[data-test="save-org-model-config"]').trigger('click');await flushPromises()
  expect(io.mutate.mock.calls[0][0].variables.input.llmModelIdentifier).toBe('replacement')
  expect(target.context.config.llmModelIdentifier).toBe('replacement')
 })
 it('retires a pending canonical read when the selected member changes',async()=>{
  const h=await setup(),held=deferred(),original=io.query.getMockImplementation()!
  io.query.mockImplementation(request=>request.query===AgentOrgMemberModelConfig && request.variables.identity.agentRunId==='agent-director' ? held.promise:original(request))
  const w=mount(AgentOrgMemberRunConfigPanel,{props:{target:h.target}});wrappers.push(w)
  h.store.select('org-run',{kind:'agent_execution',agentRunId:'agent-lead-configured'});await w.setProps({target:h.store.activeTargetFor('org-run')! as any});await flushPromises()
  held.resolve({data:{getAgentOrgMemberModelConfig:{...canonical(identity),launchConfiguration:{...canonical(identity).launchConfiguration,llmConfig:{budget:9}},modelOptions:options}}});await flushPromises()
  expect((w.get('input[type="number"]').element as HTMLInputElement).value).toBe('1')
 })
 it('locks active Org even with Offline leaf and preserves task inspection without read/save',async()=>{
  const {w,target}=await panel(identity,true);target.context.state.currentStatus=AgentStatus.Offline;await flushPromises();expect(w.get('input[type="number"]').attributes('disabled')).toBeDefined();expect(w.get('[data-test="save-org-model-config"]').attributes('disabled')).toBeDefined()
  w.unmount();io.query.mockClear();const h=await setup({...identity,memberAddress:'/worker',agentRunId:'agent-worker-task'});io.query.mockClear()
  const task=mount(AgentOrgMemberRunConfigPanel,{props:{target:h.target}});wrappers.push(task);await flushPromises();expect(task.find('[data-test="save-org-model-config"]').exists()).toBe(false);expect(io.query).not.toHaveBeenCalled()
 })
 it('keeps invalid draft/schema and rejected server fields without optimistic publication',async()=>{
  const {w,target}=await panel();await w.get('input[type="number"]').setValue('-1');await flushPromises();expect(w.get('[data-test="save-org-model-config"]').attributes('disabled')).toBeDefined()
  await w.get('input[type="number"]').setValue('2');await flushPromises()
  io.mutate.mockResolvedValue({data:{updateStoppedAgentOrgMemberModelConfig:{...result(),success:false,outcome:'VALIDATION_FAILED',fieldErrors:[{path:'llmConfig.budget',message:'Invalid budget'}]}}})
  await w.get('[data-test="save-org-model-config"]').trigger('click');await flushPromises();expect(w.text()).toContain('Invalid budget');expect((w.get('input[type="number"]').element as HTMLInputElement).value).toBe('2');expect(target.context.config.llmConfig.budget).toBe(1)
 })
 it.each(['transport','indeterminate'])('requires explicit canonical refresh after %s and never auto-replays',async mode=>{
  const {w}=await panel();await w.get('input[type="number"]').setValue('2');await flushPromises()
  if(mode==='transport')io.mutate.mockRejectedValue(Error('connection lost'));else io.mutate.mockResolvedValue({data:{updateStoppedAgentOrgMemberModelConfig:{...result(),success:false,outcome:'PERSISTENCE_INDETERMINATE',canonical:null}}})
  await w.get('[data-test="save-org-model-config"]').trigger('click');await flushPromises();expect(w.text()).toContain('must be refreshed');expect(w.get('[data-test="save-org-model-config"]').attributes('disabled')).toBeDefined()
  await w.get('[data-test="refresh-org-model-config"]').trigger('click');await flushPromises();expect(w.find('[data-test="refresh-org-model-config"]').exists()).toBe(false);expect(io.mutate).toHaveBeenCalledTimes(1)
 })
 it('excludes Stop/Send and defers disposal while accepted Save is pending',async()=>{
  const {store,org,target}=await setup();const gate=deferred();io.mutate.mockReturnValue(gate.promise)
  const pending=store.saveMemberModelConfig(identity,{llmModelIdentifier:'gpt-5.6-sol',llmConfig:{budget:0,enabled:false}})
  expect(store.operations['org-run']).toBe('configuration');expect(store.activeTargetFor('org-run')?.access).toBe('read_only')
  await expect(store.stopAndInspect('org-run')).rejects.toThrow('pending');store.disconnect('org-run');expect(store.contextFor('org-run')).toBe(org)
  gate.resolve({data:{updateStoppedAgentOrgMemberModelConfig:result()}});await pending;expect(store.contextFor('org-run')).toBeNull();expect(io.restore).not.toHaveBeenCalled();expect(io.terminate).not.toHaveBeenCalled()
 })
 it.each(['selection','owner','binding'])('ignores late read/save feedback on %s change',async mode=>{
  const {w,store,org}=await panel();await w.get('input[type="number"]').setValue('2');await flushPromises()
  const gate=deferred();io.mutate.mockReturnValue(gate.promise);await w.get('[data-test="save-org-model-config"]').trigger('click')
  if(mode==='selection'){store.select('org-run',{kind:'agent_execution',agentRunId:'agent-lead-configured'});await w.setProps({target:store.activeTargetFor('org-run')! as any})}
  if(mode==='owner')await setup()
  if(mode==='binding')useWindowNodeContextStore().bindingRevision+=1
  await flushPromises();gate.resolve({data:{updateStoppedAgentOrgMemberModelConfig:{...result(),message:'LATE SAVE FEEDBACK'}}});await flushPromises();expect(w.text()).not.toContain('LATE SAVE FEEDBACK')
  if(mode==='owner')expect(store.contextFor('org-run')).not.toBe(org)
 })
 it('ignores retired form schema and selection callbacks after switching members',async()=>{
  const {w,store}=await panel()
  const oldForm=w.findComponent({name:'AgentRunConfigForm'})
  const callbacks=oldForm.vm.$.vnode.props as any
  store.select('org-run',{kind:'agent_execution',agentRunId:'agent-lead-configured'});await w.setProps({target:store.activeTargetFor('org-run')! as any});await flushPromises()
  await w.get('input[type="number"]').setValue('-1');await flushPromises()
  callbacks.onSchemaState({status:'ready',message:null});callbacks.onSelectionChange({llmModelIdentifier:'gpt-5.6-sol',llmConfig:{budget:9,enabled:true}});await flushPromises()
  expect((w.get('input[type="number"]').element as HTMLInputElement).value).toBe('-1')
  expect(w.get('[data-test="save-org-model-config"]').attributes('disabled')).toBeDefined()
 })
 it('does not partially publish a canonical result that changes fixed fields',async()=>{
  const {store,org,target}=await setup();const view=org.view,index=org.index,config=target.context.config
  const invalid=canonical(identity);invalid.launchConfiguration.runtimeKind='autobyteus'
  expect(()=>org.applyMemberModelConfig(invalid)).toThrow('locked fields');expect(org.view).toBe(view);expect(org.index).toBe(index);expect(target.context.config).toBe(config)
  io.query.mockResolvedValue({data:{getAgentOrgMemberModelConfig:{...canonical({...identity,agentRunId:'foreign'}),modelOptions:options}}})
  await expect(store.readMemberModelConfig(identity)).rejects.toThrow('mismatch')
 })
})
