<template>
  <div class="min-w-0 flex-1">
    <div class="flex min-w-0 items-center gap-2">
      <h4 class="truncate text-base font-medium text-gray-800" :title="`${name} · ${agentRunId}`">{{ name }} · {{ agentRunId.slice(-6) }}</h4>
      <span class="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-indigo-700">{{ t('workspace.task_monitor.task') }}</span>
      <AgentStatusDisplay :status="status" />
    </div>
    <p class="truncate text-xs text-slate-500" :title="task.description">{{ task.description }}</p>
    <p class="text-xs font-medium text-slate-600" data-test="team-workspace-task-status">{{ taskStatus }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue'
import type { CollaborationTaskHeadingPresentation } from '~/types/workspace/collaborationTaskPresentation'
import type { AgentStatus } from '~/types/agent/AgentStatus'
const props = defineProps<{ name: string; agentRunId: string; task: CollaborationTaskHeadingPresentation; status: AgentStatus }>()
const { t } = useLocalization()
const taskStatus = computed(() => t('workspace.task_monitor.combined_status', {
  lifecycle: t(`workspace.task_monitor.lifecycle.${props.task.displayStatus}`),
  execution: t(`workspace.task_monitor.execution.${props.status}`),
}))
</script>
