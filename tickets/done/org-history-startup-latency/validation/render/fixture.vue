<template><div class="flex h-screen bg-slate-50"><Panel class="w-96 shrink-0 border-r"/><div class="p-6"><h1 class="text-xl font-semibold">Implementation history publication fixture</h1><p class="my-3">Synthetic transport only · no backend, provider or user data</p><div class="flex gap-3"><button v-for="name in ['org','workspace','catalog']" :key="name" class="rounded border bg-white p-2" :data-test="'release-'+name" @click="release(name)">Resolve {{ name }}</button></div><pre class="mt-6">{{ state }}</pre></div></div></template>
<script setup lang="ts">
import { reactive } from 'vue'
import Panel from '~/components/workspace/history/WorkspaceAgentRunsTreePanel.vue'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { historyWorkspaceFixture, buildAgentOrgHistoryRow } from '~/test-support/historyFamilyPublicationFixture'
definePageMeta({layout:false})
const deferred=()=>{let resolve!:(x?:any)=>void;const promise=new Promise<any>(r=>resolve=r);return {promise,resolve}}
const workspace=deferred(),org=deferred(),catalog=deferred()
const state=reactive({org:false,workspace:false,catalog:false,operationComplete:false})
useWindowNodeContextStore().waitForBoundBackendReady=async()=>true
const ws=useWorkspaceStore();ws.fetchAllWorkspaces=async()=>catalog.promise
if(useRoute().query.mode==='workspace')ws.workspaces.ws={workspaceId:'ws',name:'Fixture Workspace',absolutePath:'/fixture',workspaceConfig:{root_path:'/fixture'}}
useAgentDefinitionStore().fetchAllAgentDefinitions=async()=>catalog.promise
useAgentTeamDefinitionStore().fetchAllAgentTeamDefinitions=async()=>catalog.promise
useAgentOrgDefinitionStore().fetchAll=async()=>catalog.promise
const history=useRunHistoryStore();history.refreshRunNavigationTopology('fixture-initialized')
history.$onAction(({name,after})=>{if(name==='fetchTree')after(()=>{state.operationComplete=true})})
;(useNuxtApp() as any).__boundApolloClient={query:({query}:any)=>{
 const name=query.definitions.find((d:any)=>d.name)?.name.value
 if(name==='ListWorkspaceRunHistory')return workspace.promise
 if(name==='ListCollaborationRootHistory')return org.promise
 if(name==='GetWorkspaceRunHistory')return catalog.promise.then(()=>({data:{workspaceRunHistory:historyWorkspaceFixture()}}))
 throw Error('Unexpected fixture query '+name)
}}
const release=(name:string)=>{
 if(name==='org'){state.org=true;org.resolve({data:{listCollaborationRootHistory:[buildAgentOrgHistoryRow({rootRunId:'org-history',workspaceRootPath:'/fixture',definitionName:'History Org'})]}})}
 if(name==='workspace'){state.workspace=true;workspace.resolve({data:{listWorkspaceRunHistory:[historyWorkspaceFixture()]}})}
 if(name==='catalog'){state.catalog=true;catalog.resolve()}
}
</script>
