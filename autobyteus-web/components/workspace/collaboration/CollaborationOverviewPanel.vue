<template>
  <div class="flex h-full flex-col overflow-hidden bg-white">
    <CollaborationMessagesSection
      :messages="messages"
      :expanded="messagesExpanded"
      @toggle="toggleSection('messages')"
    />

    <div
      class="flex flex-col transition-all duration-300 ease-in-out"
      :class="delegatedTasksExpanded ? 'min-h-0 flex-1' : 'flex-none'"
    >
      <CollaborationDelegatedTasksSection
        :tasks="tasks"
        :collapsed="!delegatedTasksExpanded"
        class="h-full"
        @toggle="toggleSection('delegatedTasks')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CollaborationTasksContextView } from '~/types/workspace/collaborationTasksContextView'
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView'
import CollaborationDelegatedTasksSection from './CollaborationDelegatedTasksSection.vue'
import CollaborationMessagesSection from './CollaborationMessagesSection.vue'

type OverviewSection = 'messages' | 'delegatedTasks'
const props = defineProps<{
  messages: CollaborationMessagesContextView
  tasks: CollaborationTasksContextView
}>()
const expandedSection = ref<OverviewSection | null>('messages')
const lastAutoOpenedTaskSignatureKey = ref('')
const messagesExpanded = computed(() => expandedSection.value === 'messages')
const delegatedTasksExpanded = computed(() => expandedSection.value === 'delegatedTasks')
const taskEntries = computed(() => props.tasks.listDelegatedTaskEntries())
const taskSignature = computed(() => taskEntries.value
  .map((entry) => [entry.entryKey, entry.kind, entry.taskId, entry.runId].join(':'))
  .sort()
  .join('|'))
const scopeKey = computed(() => `${props.messages.rootKind}:${props.messages.rootRunId}:${props.messages.focusedAgentRunId}`)

watch([scopeKey, taskSignature], ([nextScope, nextSignature], previous) => {
  const scopeChanged = nextScope !== (previous?.[0] ?? '')
  const signatureKey = nextScope && nextSignature ? `${nextScope}::${nextSignature}` : ''
  if (scopeChanged) {
    expandedSection.value = nextSignature ? 'delegatedTasks' : 'messages'
    lastAutoOpenedTaskSignatureKey.value = signatureKey
    return
  }
  if (nextSignature && signatureKey !== lastAutoOpenedTaskSignatureKey.value) {
    expandedSection.value = 'delegatedTasks'
    lastAutoOpenedTaskSignatureKey.value = signatureKey
  } else if (!nextSignature) {
    lastAutoOpenedTaskSignatureKey.value = ''
  }
}, { immediate: true })

const toggleSection = (section: OverviewSection) => {
  expandedSection.value = expandedSection.value === section ? null : section
}
</script>
