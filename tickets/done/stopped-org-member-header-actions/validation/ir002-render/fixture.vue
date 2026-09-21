<template><div class="mx-auto flex h-screen max-w-4xl flex-col bg-white"><h1 class="p-3 text-lg font-semibold">Implementation renderer · synthetic Org configuration</h1><AgentOrgRunConfigPanel v-if="ready" class="min-h-0 flex-1"/></div></template>
<script setup lang="ts">
import { ref } from 'vue'
import { useNuxtApp } from '#app'
import AgentOrgRunConfigPanel from '~/components/workspace/config/AgentOrgRunConfigPanel.vue'
import { seedFixture } from '~/services/runConfigEditing/__tests__/orgSeedFixture'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
definePageMeta({layout:false})
const ready=ref(false), fixture=seedFixture(), route=useRoute()
fixture.definition.defaultLaunchConfig!.llmModelIdentifier=''
const orgs=useAgentOrgDefinitionStore();orgs.definitions=[fixture.definition];orgs.fetchAll=async()=>undefined
useAgentDefinitionStore().fetchAllAgentDefinitions=async()=>undefined;useAgentTeamDefinitionStore().fetchAllAgentTeamDefinitions=async()=>undefined
useWorkspaceStore().fetchAllWorkspaces=async()=>undefined
;(useNuxtApp() as any).__boundApolloClient={query:async({query,variables}:any)=>{
 const name=query.definitions.find((d:any)=>d.name)?.name.value
 if(name==='GetAgentOrgRunInspection') {
  if(route.query.fail==='1')throw Error('Source inspection unavailable (synthetic)')
  return {data:{getAgentOrgRunInspection:{schema_version:1,root_subject_kind:'agent_org',root_run_id:'org-run',root_org:fixture.view}}}
 }
 if(name==='GetAgentOrgReferencedTeam')return {data:{agentTeamDefinition:fixture.references.teams[variables.id]}}
 if(name==='GetAgentOrgReferencedAgent')return {data:{agentDefinition:fixture.references.agents[variables.id]}}
 throw Error('Unexpected fixture query '+name)
}}
const llm=useLLMProviderConfigStore();llm.fetchProvidersWithModels=async()=>({} as any);llm.ensureMissingDynamicProviders=async()=>undefined
Object.defineProperty(llm,'providerSnapshots',{value:()=>[]})
Object.defineProperty(llm,'providersWithModelsForSelection',{value:()=>[{provider:{id:'OPENAI',name:'Synthetic provider',providerType:'OPENAI',isCustom:false},models:['root-model','direct-model','team-model','mounted-model'].map(id=>({modelIdentifier:id,name:id,value:id,canonicalName:id,providerId:'OPENAI',providerName:'Synthetic provider',providerType:'OPENAI',runtime:'api',configSchema:{type:'object',properties:{budget:{type:'integer',minimum:0},enabled:{type:'boolean'}}}}))}]})
const runtime=useRuntimeAvailabilityStore();runtime.availabilities=[{runtimeKind:'autobyteus',enabled:true,reason:null},{runtimeKind:'codex_app_server',enabled:true,reason:null}];runtime.fetchRuntimeAvailabilities=async()=>runtime.availabilities
ready.value=true
</script>
