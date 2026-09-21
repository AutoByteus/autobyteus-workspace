<template><div class="flex h-screen flex-col bg-white"><h1 class="border-b p-3 text-lg font-semibold">Implementation renderer · synthetic Team copy</h1><div class="flex min-h-0 flex-1"><RunningPanel class="w-72 shrink-0 border-r"/><main class="min-w-0 flex-1"><TeamView v-if="selection.selectedRunId"/><RunPanel v-else/></main></div></div></template>
<script setup lang="ts">
import { markRaw } from 'vue'
import TeamView from '~/components/workspace/team/TeamWorkspaceView.vue'
import RunningPanel from '~/components/workspace/running/RunningAgentsPanel.vue'
import RunPanel from '~/components/workspace/config/RunConfigPanel.vue'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
definePageMeta({layout:false})
const source=buildTestTeamContext({teamRunId:'source',teamDefinitionId:'definition',teamDefinitionName:'Source Team',coordinatorAddress:'/lead',workspaceRootPath:'/source',rootChildren:[testAgentNode('/lead',{agentRunId:'old-agent',agentDefinitionId:'agent',llmModelIdentifier:'model',workspaceRootPath:'/source'})]})
const canonical=JSON.parse(JSON.stringify(source.view.getExecutionTree()))
canonical.root_team.default_launch_configuration.llm_config={budget:0}
canonical.root_team.members[0].launch_configuration.llm_config={budget:0}
useAgentTeamContextsStore().teams.set('source',markRaw(source))
const selection=useAgentSelectionStore();selection.selectRun('source','team')
const defs=useAgentTeamDefinitionStore();defs.agentTeamDefinitions=[{id:'definition',name:'Source Team',description:'Synthetic only',instructions:'',coordinatorMemberName:'lead',nodes:[{memberName:'lead',ref:'agent',refScope:'SHARED'}]}];defs.fetchAllAgentTeamDefinitions=async()=>undefined
const agents=useAgentDefinitionStore();agents.agentDefinitions=[{id:'agent',name:'Lead'}] as any;agents.fetchAllAgentDefinitions=async()=>undefined
const ws=useWorkspaceStore();ws.workspacesFetched=true;ws.workspaceMetadataById.ws={workspaceId:'ws',workspaceRootPath:'/source',displayName:'Source',kind:'filesystem'};ws.fetchAllWorkspaces=async()=>undefined
ws.workspaces.ws={workspaceId:'ws',name:'Source',absolutePath:'/source',rootPath:'/source',fileExplorer:null,isTemp:false} as any
let count=0
;(useNuxtApp() as any).__boundApolloClient={query:async({query}:any)=>{
 const name=query.definitions.find((d:any)=>d.name)?.name.value
 if(name==='GetTeamRunResumeConfig'){await new Promise(r=>setTimeout(r,1500));if(++count===1)throw Error('Source read unavailable (synthetic)');return {data:{getTeamRunResumeConfig:{teamRunId:'source',isActive:false,executionTree:canonical}}}}
 return {data:{}}
}}
const llm=useLLMProviderConfigStore();llm.fetchProvidersWithModels=async()=>({} as any);llm.ensureMissingDynamicProviders=async()=>undefined
Object.defineProperty(llm,'providerSnapshots',{value:()=>[]})
Object.defineProperty(llm,'providersWithModelsForSelection',{value:()=>[{provider:{id:'OPENAI',name:'Synthetic',providerType:'OPENAI',isCustom:false},models:[{modelIdentifier:'model',name:'model',value:'model',canonicalName:'model',providerId:'OPENAI',providerName:'Synthetic',providerType:'OPENAI',runtime:'api',configSchema:{type:'object',properties:{budget:{type:'integer',minimum:0}}}}]}]})
const runtime=useRuntimeAvailabilityStore();runtime.availabilities=[{runtimeKind:'autobyteus',enabled:true,reason:null}];runtime.fetchRuntimeAvailabilities=async()=>runtime.availabilities
</script>
