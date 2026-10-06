<template>
  <main class="min-h-screen bg-slate-100 p-4" :data-ready="ready ? 'true' : 'false'">
    <button data-test="probe-chat" @click="newChat">New Chat</button>
    <button data-test="probe-team-chat" @click="newTeamChat">Team chat</button>
    <button data-test="probe-mobile" @click="mobile = true; chat = false">Mobile setup</button>
    <ChatNewSurface v-if="chat" />
    <MobileRunSetup v-else-if="mobile" :context="null" />
  </main>
</template>
<script setup lang="ts">
// run-settings-ui-unification: Agents and Teams start only from New chat (the old launch forms are
// gone). The fixture opens New chat the way Run does, through the chat draft store.
import { onMounted, ref } from 'vue'
import ChatNewSurface from '~/components/chat/ChatNewSurface.vue'
import MobileRunSetup from '~/components/mobile/MobileRunSetup.vue'
import { useChatDraftStore } from '~/stores/chatDraftStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
definePageMeta({ layout: false })
const chat = ref(false)
const mobile = ref(false)
const drafts = useChatDraftStore()
// The app shell loads the definitions (the removed library panel used to do it here).
const agents = useAgentDefinitionStore()
const teams = useAgentTeamDefinitionStore()
const ready = ref(false)
onMounted(async () => { await Promise.all([agents.fetchAllAgentDefinitions(), teams.fetchAllAgentTeamDefinitions()]); ready.value = true })
const newChat = () => { drafts.startNewChat({ agentDefinitionId: 'approval-agent' }); chat.value = true; mobile.value = false }
const newTeamChat = () => { drafts.startForDefinition({ kind: 'team', teamDefinitionId: 'approval-team' }, {}); chat.value = true; mobile.value = false }
</script>
