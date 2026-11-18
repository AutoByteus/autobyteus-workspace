<template>
  <section
    class="flex min-h-0 flex-1 flex-col"
    data-test="collaboration-messages-section"
  >
    <div
      class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2"
      data-test="collaboration-messages-header"
    >
      <h3 class="text-xs font-bold leading-none tracking-wider text-gray-900">
        {{ $t('workspace.components.workspace.team.TeamOverviewPanel.messages') }}
      </h3>
      <span class="text-xs font-medium text-gray-600">
        {{ messageCount }} {{ $t('workspace.components.workspace.team.TeamOverviewPanel.messages_count') }}
      </span>
    </div>

    <CollaborationMessagesPanel
      :messages="messages"
      :rows="rows"
      :status="status"
      class="min-h-0 flex-1"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView'
import CollaborationMessagesPanel from './CollaborationMessagesPanel.vue'

const props = defineProps<{
  messages: CollaborationMessagesContextView
}>()

// The messages are loaded when this section shows them, for each root and member it shows (autobyteus-358).
watch([() => props.messages.rootKind, () => props.messages.rootRunId, () => props.messages.focusedAgentRunId],
  () => props.messages.loadMessages(), { immediate: true })

// The single perspective computation for this view; the Panel renders these rows.
const rows = computed(() => props.messages.listMessages())
const status = computed(() => props.messages.messagesStatus())
const messageCount = computed(() => rows.value.length)
</script>
