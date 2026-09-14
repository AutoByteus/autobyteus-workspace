<template>
  <main class="h-screen bg-slate-100 p-5 flex flex-col gap-3">
    <div class="flex items-center gap-4"><button class="rounded border bg-white px-3 py-2" @click="restart">Observe isolated inactive root</button><span>{{ phase }} · {{ target?.access }}</span></div>
    <p>Implementation-only transport fixture. No backend or provider is connected.</p>
    <textarea v-if="target" v-model="target.context.requirement" aria-label="Retained draft" class="border rounded p-2" />
    <section v-if="target" class="min-h-0 flex-1 border rounded overflow-hidden bg-white"><TeamWorkspaceSurface :target="target as any" /></section>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { BOUND_APOLLO_CLIENT_KEY } from '~/plugins/30.apollo.client'
const app = useNuxtApp()
const store = useAgentOrgContextsStore()
const target = computed(() => store.activeTargetFor('org-run'))
const phase = computed(() => store.contextFor('org-run')?.phase)
let active = true
const envelope = () => { const view = taskBearingView(); view.is_active = active; if (!active) {view.agent_statuses=[];view.base_change_sequence=0} return {schema_version:1,root_subject_kind:'agent_org',root_run_id:'org-run',root_org:view} }
class FixtureSocket {
 static OPEN=1; static CONNECTING=0; static latest: FixtureSocket
 readyState=1; onmessage:any; onclose:any; onerror:any
 constructor() { FixtureSocket.latest=this; setTimeout(() => {this.emit({type:'CONNECTED',payload:{root_subject_kind:'agent_org',root_run_id:'org-run',session_id:'preview'}});this.emit({type:'ROOT_EXECUTION_VIEW_SNAPSHOT',payload:envelope()})},100) }
 emit(m:any) {this.onmessage?.({data:JSON.stringify(m)})}
 send() {throw new Error('Preview forbids input')}
 close() {this.readyState=3;this.onclose?.()}
}
const originalSocket = globalThis.WebSocket
const originalApollo = (app as any)[BOUND_APOLLO_CLIENT_KEY]
const history = useRunHistoryStore()
const originalActivity = history.applyAgentOrgActivity
const restart = () => { active=false;FixtureSocket.latest.close() }
onMounted(async () => {
 globalThis.WebSocket=FixtureSocket as any
 history.applyAgentOrgActivity=() => undefined
 ;(app as any)[BOUND_APOLLO_CLIENT_KEY] = {query: async ({query,variables}:any) => {
 const name=query.definitions.find((d:any)=>d.kind==='OperationDefinition')?.name?.value
 if(name==='GetAgentOrgRunInspection') return {data:{getAgentOrgRunInspection:envelope()}}
 if(name==='GetAgentOrgMemberRunProjection') return {data:{getAgentOrgMemberRunProjection:{...variables,conversation:[{kind:'message',role:'assistant',content:'Retained worker conversation. Recovery must not change this identity.',ts:1700000001}],activities:[],hasEarlierActiveTraceEvents:false}}}
 throw new Error(`Preview boundary rejects ${name}`)
 }}
 await store.openForInspection('org-run');store.select('org-run','/team/worker')
 if(target.value) target.value.context.requirement='Keep this draft across recovery'
})
onBeforeUnmount(() => {store.disconnect('org-run');globalThis.WebSocket=originalSocket;(app as any)[BOUND_APOLLO_CLIENT_KEY]=originalApollo;history.applyAgentOrgActivity=originalActivity})
</script>
