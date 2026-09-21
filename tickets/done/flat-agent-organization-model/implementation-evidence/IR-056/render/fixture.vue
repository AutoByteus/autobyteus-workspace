<template><main class="mx-auto min-h-screen max-w-3xl bg-white p-4 text-slate-900">
<header class="mb-6 flex flex-wrap gap-3 border-b pb-4"><h1 class="w-full text-lg font-semibold">Recorded attachment labels</h1>
<label>Case <select v-model="selected" data-test="case" class="rounded border p-2"><option v-for="row in rows" :key="row.id">{{row.id}}</option></select></label>
<label>Read <select v-model="surface" data-test="surface" class="rounded border p-2"><option>cold</option><option>page</option></select></label>
<p class="w-full text-sm text-slate-500">Read-only implementation inspection · saved file owner unchanged</p></header>
<UserMessage v-if="message" :message="message" /></main></template>
<script setup lang="ts">
import {ref,computed,onMounted} from 'vue'
import UserMessage from '~/components/conversation/UserMessage.vue'
import {buildConversationFromProjection} from '~/services/runHydration/runProjectionConversation'
import {buildEventMonitorActiveTraceBrowsePresentation} from '~/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation'
import type {UserMessage as Message} from '~/types/conversation'
definePageMeta({layout:false})
const rows=ref<any[]>([]),selected=ref('org'),surface=ref('cold')
const row=computed(()=>rows.value.find(r=>r.id===selected.value))
const message=computed<Message|null>(()=>!row.value?null:surface.value==='cold'?buildConversationFromProjection('exact',row.value.conversation,{agentDefinitionId:'d',agentName:'agent',llmModelIdentifier:'fixture'}).messages[0] as Message:(buildEventMonitorActiveTraceBrowsePresentation(row.value.page)[0] as {message:Message}).message)
onMounted(async()=>{rows.value=await(await fetch('/__ir056/data')).json();(window as any).__ir056={state:()=>({selected:selected.value,surface:surface.value,message:message.value})}})
</script>
