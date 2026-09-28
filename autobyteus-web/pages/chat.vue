<template>
  <div class="flex h-full min-h-0 min-w-0 bg-white font-sans text-gray-800" data-test="chat-page">
    <ChatNewSurface v-if="!routeRunId" />
    <div
      v-else-if="openState === 'missing'"
      class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
      data-test="chat-missing"
    >
      <p class="text-base font-semibold text-gray-800">{{ $t('chat.missing.title') }}</p>
      <button
        type="button"
        class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        data-test="chat-missing-new-chat"
        @click="startNewChat"
      >{{ $t('chat.missing.newChat') }}</button>
    </div>
    <ChatRunView v-else-if="displayedContext" :context="displayedContext" />
    <div v-else class="flex flex-1 items-center justify-center" data-test="chat-opening">
      <span class="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600 motion-reduce:animate-none" :aria-label="$t('chat.run.opening')"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatNewSurface from '~/components/chat/ChatNewSurface.vue'
import ChatRunView from '~/components/chat/ChatRunView.vue'
import { useChatRouteRunSync } from '~/composables/chat/useChatRouteRunSync'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useChatDraftStore } from '~/stores/chatDraftStore'
import { buildAgentRunChatRoute, openWorkspaceExecutionLink } from '~/services/workspace/workspaceNavigationService'
import { isTemporaryRunId } from '~/utils/chat/chatDefaults'

/**
 * `/chat` shows the New chat surface; `/chat?id=<runId>` shows that single-agent run in the chat
 * view, opening it first when it is not mounted. An id that is neither registered nor openable
 * shows the missing-chat state; a `temp-*` id that is no longer registered returns to New chat.
 */
const route = useRoute()
const router = useRouter()
const agentContextsStore = useAgentContextsStore()
const selectionStore = useAgentSelectionStore()
const chatDraftStore = useChatDraftStore()

const routeRunId = computed(() => {
  const value = route.query.id
  const id = Array.isArray(value) ? value[0] : value
  return typeof id === 'string' && id.trim() ? id.trim() : null
})
const displayedContext = computed(() => (routeRunId.value ? agentContextsStore.getRun(routeRunId.value) ?? null : null))
const openState = ref<'idle' | 'opening' | 'missing'>('idle')
let openGeneration = 0

const ensureRunOpen = async (runId: string | null) => {
  const generation = ++openGeneration
  openState.value = 'idle'
  if (!runId) return
  if (agentContextsStore.getRun(runId)) {
    if (selectionStore.selectedType !== 'agent' || selectionStore.selectedRunId !== runId) {
      selectionStore.selectRunWithoutShellNavigation(runId, 'agent')
    }
    return
  }
  if (isTemporaryRunId(runId)) {
    // Temporary contexts do not survive a reload.
    await router.replace('/chat')
    return
  }
  openState.value = 'opening'
  try {
    await openWorkspaceExecutionLink({ kind: 'agent', runId })
    if (generation !== openGeneration) return
    openState.value = agentContextsStore.getRun(runId) ? 'idle' : 'missing'
  } catch (error) {
    if (generation !== openGeneration) return
    console.warn(`Chat '${runId}' could not be opened:`, error)
    openState.value = 'missing'
  }
}

watch(routeRunId, (runId) => { void ensureRunOpen(runId) }, { immediate: true })

// A displayed run that disappears (for example, deleted from the Workspaces tree) is re-resolved.
// A promoted context keeps its object but carries the new id; useChatRouteRunSync moves the route.
watch(displayedContext, (context, previous) => {
  if (context || !previous || !routeRunId.value) return
  if (previous.state.runId !== routeRunId.value) return
  if (!agentContextsStore.getRun(routeRunId.value)) void ensureRunOpen(routeRunId.value)
})

useChatRouteRunSync({
  routeRunId,
  replaceRouteRunId: (runId) => router.replace(buildAgentRunChatRoute(runId)),
})

const startNewChat = async () => {
  chatDraftStore.startNewChat()
  await router.push('/chat')
}
</script>
