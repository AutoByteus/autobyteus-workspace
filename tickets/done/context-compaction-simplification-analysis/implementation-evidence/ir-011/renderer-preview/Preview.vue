<script setup lang="ts">
import { ref } from 'vue';
import UserMessage from '~/components/conversation/UserMessage.vue';
import { buildConversationFromProjection } from '~/services/runHydration/runProjectionConversation';
import { handleAgentInputState } from '~/services/agentStreaming/handlers/agentInputStateHandler';
import agent from '../native-captures/agent.json';
import team from '../native-captures/agent_team.json';
const narrow=ref(false), generation=ref(0), contexts=ref([]);
function reconstruct() {
 contexts.value=[agent,team].map(capture=>{
   const context={state:{},conversation:buildConversationFromProjection('preview',capture.conversation.filter(e=>e.messageId==='A'),{agentDefinitionId:'native',agentName:'Native',llmModelIdentifier:'controlled'})};
   handleAgentInputState(capture.pending,context);
   return context;
 }); generation.value++;
}
function clearBadges(){ contexts.value.forEach((context,i)=>handleAgentInputState({...[agent,team][i].pending,revision:999,entries:[],recoverableBlock:null},context)); }
reconstruct();
</script>
<template><main class="min-h-screen bg-white p-6 text-gray-900"><h1 class="mb-2 text-xl font-semibold">Accepted input · saved history + live state</h1>
<p class="mb-4 text-sm text-gray-600">IR011 component check. Fresh native-generated Agent/Team history and Held/Queued snapshots. No packaged reload claim.</p>
<div class="mb-6 flex flex-wrap gap-4"><button id="reconstruct" class="rounded border px-3 py-1" @click="reconstruct">Reconstruct saved + live</button>
<button id="clear" class="rounded border px-3 py-1" @click="clearBadges">Clear badges (presentation control)</button><label><input id="narrow" v-model="narrow" type="checkbox"/> Narrow</label><span>Generation {{generation}}</span></div>
<div :style="{width:narrow?'360px':'900px',maxWidth:'100%'}" class="space-y-8"><section v-for="(context,i) in contexts" :key="i" :data-scope="i?'team':'agent'"><h2 class="mb-4 font-semibold">{{i?'Hosted Team lead':'Hosted Agent'}}</h2>
<div class="space-y-5"><UserMessage v-for="message in context.conversation.messages" :key="message.messageId" :message="message"/></div></section></div></main></template>