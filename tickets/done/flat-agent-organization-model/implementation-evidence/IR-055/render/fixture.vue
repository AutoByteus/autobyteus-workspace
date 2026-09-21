<template>
  <main class="mx-auto min-h-screen max-w-4xl bg-white p-4 text-slate-900">
    <header class="mb-6 flex flex-wrap items-center gap-2 border-b pb-4">
      <h1 class="w-full text-lg font-semibold">Attachment history · implementation inspection</h1>
      <label>Producer <select v-model="producer" data-test="producer" class="rounded border p-2"><option v-for="value in ['autobyteus','codex_app_server','claude_agent_sdk']" :key="value">{{ value }}</option></select></label>
      <label>Execution <select v-model="target" data-test="target" class="rounded border p-2"><option v-for="value in ['direct','repeat','lead','task-lead','standalone','standalone-lead']" :key="value">{{ value }}</option></select></label>
      <label>Read <select v-model="read" data-test="read" class="rounded border p-2"><option>initial/cold</option><option>active trace page</option></select></label>
      <p class="w-full text-sm text-slate-500">Read-only inspection · exact recorded owner · no provider or runtime commands</p>
    </header>
    <UserMessage v-if="message" :message="message" />
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UserMessage from '~/components/conversation/UserMessage.vue'
import { buildConversationFromProjection } from '~/services/runHydration/runProjectionConversation'
import { buildEventMonitorActiveTraceBrowsePresentation } from '~/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation'
import type { UserMessage as UserMessageType } from '~/types/conversation'
definePageMeta({layout:false})
const producer=ref('codex_app_server'), target=ref('repeat'), read=ref('initial/cold'), fixtures=ref<any[]>([])
const row=computed(()=>fixtures.value.find(r=>r.runtimeKind===producer.value&&r.target===target.value))
const message=computed<UserMessageType|null>(()=>{
 if(!row.value)return null
 if(read.value==='initial/cold')return buildConversationFromProjection(row.value.target,row.value.projection.conversation,{agentDefinitionId:'fixture',agentName:row.value.target,llmModelIdentifier:producer.value}).messages[0] as UserMessageType
 const item=buildEventMonitorActiveTraceBrowsePresentation(row.value.page.events)[0]
 return item.kind==='user'?item.message:null
})
onMounted(async()=>{
 fixtures.value=await(await fetch('/__ir055/fixtures')).json()
 ;(window as any).__ir055={state:()=>({producer:producer.value,target:target.value,read:read.value,message:message.value})}
})
</script>
