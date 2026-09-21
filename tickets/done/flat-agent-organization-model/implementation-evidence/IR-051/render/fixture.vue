<template><div class="h-screen"><template v-if="ready"><AgentTeamDetail v-if="route.query.view === 'team-detail'" :team-definition-id="String(route.query.id)" :return-to-org-id="String(route.query.returnToOrg)" @navigate="to => router.push({ path: '/agent-orgs', query: { view: to.view, id: to.id } })" /><AgentOrgExperience v-else /></template></div></template>
<script setup lang="ts">
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core'
import AgentTeamDetail from '~/components/agentTeams/AgentTeamDetail.vue'
import AgentOrgExperience from '~/components/agentOrgs/AgentOrgExperience.vue'
import { BOUND_APOLLO_CLIENT_KEY } from '~/plugins/30.apollo.client'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
definePageMeta({ layout: false })
const ready = ref(false)
const app = useNuxtApp(); const router = useRouter(); const route = useRoute()
const push = router.push.bind(router)
router.push = (to: any) => push(typeof to === 'object' && ['/agent-orgs', '/agent-teams'].includes(to.path) ? { ...to, path: '/ir051-orgs' } : to)
const agent = (id: string, name: string, scope = 'SHARED', extra = {}) => ({__typename:'AgentDefinition', id,name,description:'Agent description',instructions:'Instructions',role:null,category:null,avatarUrl:null,toolNames:[],inputProcessorNames:[],llmResponseProcessorNames:[],toolExecutionResultProcessorNames:[],toolInvocationPreprocessorNames:[],lifecycleProcessorNames:[],skillNames:[],ownershipScope:scope,ownerOrgId:null,ownerOrgName:null,ownerTeamId:null,ownerTeamName:null,ownerApplicationId:null,ownerApplicationName:null,ownerPackageId:null,ownerLocalApplicationId:null,defaultLaunchConfig:null,...extra})
let org:any={__typename:'AgentOrgDefinition',id:'owned-org',name:'Local Research Org',description:'An Org with an exact bundled research Team.',instructions:'Hidden instructions retained.',category:'Research',avatarUrl:null,revision:'revision-1',defaultLaunchConfig:null,members:[{__typename:'AgentOrgMember',memberName:'direct',ref:'owned-direct',refType:'AGENT',refScope:'AGENT_ORG_OWNED'},{__typename:'AgentOrgMember',memberName:'team',ref:'owned-team',refType:'AGENT_TEAM',refScope:'AGENT_ORG_OWNED'}],handoffs:[{from:'/direct',to:'/team',rules:['Prepare a complete research request.','Keep the original context.']},{from:'/team/worker',to:'/direct',rules:['Return the verified result.']}]}
const team:any={__typename:'AgentTeamDefinition',id:'owned-team',name:'Bundled Research Team',description:'The exact mounted Team, absent from shared lists.',instructions:'Team instructions',category:null,avatarUrl:null,coordinatorMemberName:'lead',revision:'team-rev',handoffs:[],ownershipScope:'AGENT_ORG_OWNED',ownerOrgId:'owned-org',ownerOrgName:'Local Research Org',ownerTeamId:null,ownerTeamName:null,ownerApplicationId:null,ownerApplicationName:null,ownerPackageId:null,ownerLocalApplicationId:null,defaultLaunchConfig:null,nodes:[{memberName:'lead',ref:'lead',refScope:'TEAM_LOCAL'},{memberName:'worker',ref:'worker',refScope:'SHARED'}]}
const state:any={calls:[],org,missing:false,hold:false,release:null}; if(import.meta.client)(window as any).__ir051=state
;(app as any)[BOUND_APOLLO_CLIENT_KEY]=new ApolloClient({cache:new InMemoryCache(),link:new ApolloLink(op=>new Observable(obs=>{
 const field:any=(op.query.definitions.find((d:any)=>d.kind==='OperationDefinition') as any).selectionSet.selections[0].name.value
 state.calls.push({field,variables:JSON.parse(JSON.stringify(op.variables))})
 const finish=()=>{let value:any
 if(field==='agentOrgDefinitions')value=[org]
 else if(field==='agentTeamDefinitions')value=[]
 else if(field==='agentDefinitions')value=[agent('worker','Research Worker')]
 else if(field==='agentTeamDefinition')value=state.missing?null:team
 else if(field==='agentDefinition')value=op.variables.id==='owned-direct'?agent('owned-direct','Local Direct Agent','AGENT_ORG_OWNED',{ownerOrgId:'owned-org'}):agent('team-local-agent:owned-team:lead','Research Coordinator','TEAM_LOCAL',{ownerTeamId:'owned-team'})
 else if(field==='updateAgentOrgDefinition'){const{id,expectedRevision,...input}=op.variables.input;if(id!==org.id||expectedRevision!==org.revision)throw Error('Revision mismatch');org={...org,...input,revision:'revision-'+(Number(org.revision.split('-')[1])+1)};state.org=org;value=org}
 else throw Error('Unexpected '+field)
 obs.next({data:{[field]:JSON.parse(JSON.stringify(value))}});obs.complete()}
 if(state.hold&&field==='agentTeamDefinition')state.release=finish;else finish()
}))})
useWindowNodeContextStore().waitForBoundBackendReady=async()=>true
onMounted(()=>{ready.value=true})
</script>
