<template>
  <section
    class="flex min-h-0 flex-col transition-all duration-300 ease-in-out"
    :class="expanded ? 'flex-1' : 'flex-none'"
    data-test="collaboration-messages-section"
  >
    <button
      type="button"
      class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      data-test="collaboration-messages-header"
      :aria-expanded="expanded"
      @click="$emit('toggle')"
    >
      <div class="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="transform text-gray-500 transition-transform duration-300"
          :class="expanded ? '' : '-rotate-90'"
          data-test="collaboration-messages-disclosure"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <h3 class="text-xs font-bold leading-none tracking-wider text-gray-900">
          {{ $t('workspace.components.workspace.team.TeamOverviewPanel.messages') }}
        </h3>
      </div>
      <span class="text-xs font-medium text-gray-600">
        {{ messageCount }} {{ $t('workspace.components.workspace.team.TeamOverviewPanel.messages_count') }}
      </span>
    </button>

    <CollaborationMessagesPanel
      v-show="expanded"
      :messages="messages"
      class="min-h-0 flex-1"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView'
import CollaborationMessagesPanel from './CollaborationMessagesPanel.vue'

const props = defineProps<{
  messages: CollaborationMessagesContextView
  expanded: boolean
}>()
defineEmits<{ (event: 'toggle'): void }>()

const messageCount = computed(() => props.messages.listMessages().length)
</script>
