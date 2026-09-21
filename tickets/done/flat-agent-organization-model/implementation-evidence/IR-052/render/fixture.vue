<template><div class="h-screen"><component v-if="ready" :is="page" :key="section" /></div></template>
<script setup lang="ts">
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core'
import OrgPage from '~/pages/agent-orgs.vue'
import TeamPage from '~/pages/agent-teams.vue'
import AgentsPage from '~/pages/agents.vue'
import { BOUND_APOLLO_CLIENT_KEY } from '~/plugins/30.apollo.client'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
definePageMeta({ layout: false })
const ready=ref(false); const app=useNuxtApp(); const route=useRoute(); const router=useRouter()
const section=computed(()=>String(route.query.view||'org-list').split('-')[0])
const page=computed(()=>section.value==='org'?OrgPage:section.value==='team'?TeamPage:AgentsPage)
const state:any={navigation:[],calls:[],ownedInCatalog:()=>useAgentTeamDefinitionStore().getAgentTeamDefinitionById(ownedTeamId)}
if(import.meta.client)(window as any).__ir052=state
const push=router.push.bind(router)
router.push=(to:any)=>{state.navigation.push(JSON.parse(JSON.stringify(to)));return push(typeof to==='object'&&['/agent-orgs','/agent-teams','/agents'].includes(to.path)?{...to,path:'/ir052-navigation'}:to)}
const orgId = 'local-owned-org'
const ownedTeamId = 'agent-org-owned-team:local-owned-org:local-team'
const sharedTeamId = 'shared-team'
const workerId = 'shared-worker'
const agent = {
  __typename: 'AgentDefinition', id: workerId, name: 'Research Worker', description: 'Shared member description',
  role: null, instructions: 'Actual shared Agent instructions', category: null, avatarUrl: null,
  toolNames: [], inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [],
  toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], skillNames: [], defaultLaunchConfig: null,
  ownershipScope: 'SHARED', ownerOrgId: null, ownerOrgName: null, ownerTeamId: null, ownerTeamName: null,
  ownerApplicationId: null, ownerApplicationName: null, ownerPackageId: null, ownerLocalApplicationId: null,
}
const team = {
  __typename: 'AgentTeamDefinition', id: ownedTeamId, name: 'Research Team', description: 'Exact bundled Team',
  instructions: 'Team instructions', category: null, avatarUrl: null, revision: 'team-rev', handoffs: [],
  coordinatorMemberName: 'worker', nodes: [{ __typename: 'TeamMember', memberName: 'worker', ref: workerId, refScope: 'SHARED' }],
  ownershipScope: 'AGENT_ORG_OWNED', ownerOrgId: orgId, ownerOrgName: 'Research Org',
  ownerTeamId: null, ownerTeamName: null, ownerApplicationId: null, ownerApplicationName: null,
  ownerPackageId: null, ownerLocalApplicationId: null, defaultLaunchConfig: null,
}
const org = {
  __typename: 'AgentOrgDefinition', id: orgId, name: 'Research Org', description: 'Org description',
  instructions: 'Org instructions', category: null, avatarUrl: null, revision: 'org-rev', defaultLaunchConfig: null,
  members: [{ __typename: 'AgentOrgMember', memberName: 'research', ref: ownedTeamId, refType: 'AGENT_TEAM', refScope: 'AGENT_ORG_OWNED' }],
  handoffs: [],
}

;(app as any)[BOUND_APOLLO_CLIENT_KEY]=new ApolloClient({cache:new InMemoryCache(),link:new ApolloLink(operation=>new Observable(observer=>{
 const field=(operation.query.definitions.find((d:any)=>d.kind==='OperationDefinition') as any).selectionSet.selections[0].name.value
 state.calls.push({field,variables:JSON.parse(JSON.stringify(operation.variables))})
 if(field==='getServerSettings'){observer.next({data:{getServerSettings:[],getEffectiveWorkingContextCompactionStrategyId:'default',getEffectiveStreamingContentFlushIntervalMs:0}});observer.complete();return}
 let value:any
 if(field==='agentOrgDefinitions')value=[org]
 else if(field==='agentDefinitions')value=[agent]
 else if(field==='agentTeamDefinitions')value=[{...team,id:sharedTeamId,ownershipScope:'SHARED',ownerOrgId:null,ownerOrgName:null}]
 else if(field==='agentTeamDefinition'&&operation.variables.id===ownedTeamId)value=team
 else throw Error('Unexpected I/O '+field)
 observer.next({data:{[field]:JSON.parse(JSON.stringify(value))}});observer.complete()
}))})
useWindowNodeContextStore().waitForBoundBackendReady=async()=>true
useWorkspaceStore().fetchAllWorkspaces=async()=>{}
onMounted(()=>{ready.value=true})
</script>
