<template>
  <main class="min-h-screen bg-slate-100 p-4">
    <button data-test="probe-library" @click="chat = false; mobile = false">Library</button>
    <button data-test="probe-chat" @click="newChat">New Chat</button>
    <button data-test="probe-mobile" @click="mobile = true; chat = false">Mobile setup</button>
    <div v-if="!chat && !mobile" class="grid gap-4 md:grid-cols-[240px_1fr]">
      <aside data-test="probe-library-host"><AgentLibraryPanel /></aside>
      <section class="bg-white" data-test="probe-config-host"><RunConfigPanel /></section>
      <section class="md:col-span-2" data-test="probe-input-host"><AgentUserInputForm /></section>
      <aside class="md:col-span-2" data-test="probe-running-host"><RunningAgentsPanel /></aside>
    </div>
    <ChatNewSurface v-else-if="chat" />
    <MobileRunSetup v-else :context="null" />
  </main>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import AgentLibraryPanel from '~/components/workspace/running/AgentLibraryPanel.vue'
import RunningAgentsPanel from '~/components/workspace/running/RunningAgentsPanel.vue'
import RunConfigPanel from '~/components/workspace/config/RunConfigPanel.vue'
import AgentUserInputForm from '~/components/agentInput/AgentUserInputForm.vue'
import ChatNewSurface from '~/components/chat/ChatNewSurface.vue'
import MobileRunSetup from '~/components/mobile/MobileRunSetup.vue'
import { useChatDraftStore } from '~/stores/chatDraftStore'
definePageMeta({ layout: false })
const chat = ref(false)
const mobile = ref(false)
const drafts = useChatDraftStore()
const newChat = () => { drafts.startNewChat({ agentDefinitionId: 'approval-agent' }); chat.value = true; mobile.value = false }
</script>
