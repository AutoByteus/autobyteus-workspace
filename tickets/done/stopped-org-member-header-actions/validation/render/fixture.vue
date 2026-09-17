<template><div class="mx-auto flex h-screen max-w-4xl flex-col bg-white p-3"><h1 class="text-xl font-bold">Isolated implementation renderer — synthetic stopped Org</h1><div class="flex gap-3 py-3"><button class="rounded border px-3 py-2" @click="select('agent-director')">Direct member</button><button class="rounded border px-3 py-2" @click="select('agent-lead-configured')">Mounted member</button><button class="rounded border px-3 py-2" @click="open=true">Reopen settings</button><button class="rounded border px-3 py-2" @click="uncertain=true">Next save uncertain</button></div><AgentOrgMemberRunConfigPanel v-if="target && open" :key="target.context.state.runId" :target="target" @back="open=false"/><p v-else>Retained conversation: synthetic draft and attachment remain.</p></div></template>
<script setup lang="ts">
import { ref, computed, shallowReactive } from 'vue'
import { useNuxtApp } from '#app'
import AgentOrgMemberRunConfigPanel from '~/components/workspace/org/AgentOrgMemberRunConfigPanel.vue'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import { stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
definePageMeta({layout:false})
const values:Record<string,any>={},open=ref(true),uncertain=ref(false)
const launch=(id:string)=>({runtimeKind:'codex_app_server',llmModelIdentifier:'gpt-5.6-sol',llmConfig:{budget:1,enabled:true},autoExecuteTools:false,skillAccessMode:'PRELOADED_ONLY',workspaceRootPath:null,...values[id]})
const canonical=(id:any)=>({...id,launchConfiguration:launch(id.agentRunId),isActive:false,editability:{editable:true,reason:null}})
;(useNuxtApp() as any).__boundApolloClient={query:async({query,variables}:any)=>query.definitions.some((d:any)=>d.name?.value==='AgentOrgMemberModelConfig')?{data:{getAgentOrgMemberModelConfig:{...canonical(variables.identity),modelOptions:{currentModelIdentifier:launch(variables.identity.agentRunId).llmModelIdentifier,currentContextTokens:100,replacements:[{llmModelIdentifier:'replacement',contextTokens:200}],unavailableReason:null}}}}:{data:{getAgentOrgMemberRunProjection:{...variables,conversation:[],activities:[],hasEarlierActiveTraceEvents:false}}},mutate:async({variables:{input}}:any)=>{values[input.agentRunId]={llmModelIdentifier:input.llmModelIdentifier,llmConfig:input.llmConfig};const unknown=uncertain.value;uncertain.value=false;return {data:{updateStoppedAgentOrgMemberModelConfig:{success:!unknown,outcome:unknown?'PERSISTENCE_INDETERMINATE':'UPDATED',message:unknown?'Verify saved values':'Model configuration saved.',isActive:false,editability:{editable:true,reason:null},canonical:unknown?null:canonical(input),fieldErrors:[]}}}}}
const llm=useLLMProviderConfigStore()
llm.fetchProvidersWithModels=async()=>({} as any);llm.ensureMissingDynamicProviders=async()=>undefined;llm.refreshLocalCatalog=async()=>({} as any)
Object.defineProperty(llm,'providerSnapshots',{value:()=>[]})
Object.defineProperty(llm,'providersWithModelsForSelection',{value:()=>[{provider:{id:'OPENAI',name:'Synthetic provider',providerType:'OPENAI',isCustom:false},models:['gpt-5.6-sol','replacement'].map(id=>({modelIdentifier:id,name:id,value:id,canonicalName:id,providerId:'OPENAI',providerName:'Synthetic provider',providerType:'OPENAI',runtime:'api',configSchema:{type:'object',properties:{budget:{type:'integer',minimum:0,maximum:10},enabled:{type:'boolean'}}}}))}]})
const runtime=useRuntimeAvailabilityStore();runtime.availabilities=[{runtimeKind:'codex_app_server',enabled:true,reason:null}];runtime.fetchRuntimeAvailabilities=async()=>runtime.availabilities
const store=useAgentOrgContextsStore(),view=taskBearingView();view.is_active=false
const staged=await stageAgentOrgExecutionContext({orgRunId:'org-run',view,source:'inspection'});staged.commitActivities();store.contexts['org-run']=shallowReactive(staged.context)
const select=(id:string)=>{store.select('org-run',{kind:'agent_execution',agentRunId:id});open.value=true};select('agent-director')
const target=computed(()=>store.activeTargetFor('org-run') as any)
</script>
