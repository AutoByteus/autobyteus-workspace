<template>
  <main class="min-h-0 min-w-0 flex-1 overflow-hidden" data-test="delegated-task-detail-pane">
    <div v-if="selectedEntry && selectedReference && selectedEntry.taskId" class="h-full" data-test="delegated-task-reference-preview">
      <TeamTaskReferenceViewer
        :team-run-id="selectedEntry.teamRunId"
        :task-id="selectedEntry.taskId"
        :reference="selectedReference"
        :refresh-signal="referenceRefreshSignal"
      />
    </div>

    <div v-else-if="selectedEntry" class="h-full overflow-y-auto p-4" data-test="delegated-task-task-detail">
      <MarkdownRenderer
        :content="selectedEntry.taskDescription || $t('workspace.components.workspace.team.TeamDelegatedTasksSection.description_unavailable')"
        class="team-delegated-task-markdown text-[0.9375rem] leading-6 text-slate-700"
        data-test="delegated-task-task-body"
      />
    </div>

    <div v-else class="flex h-full items-center justify-center p-4 text-center text-sm text-slate-400">
      {{ $t('workspace.components.workspace.team.TeamDelegatedTasksSection.select_task') }}
    </div>
  </main>
</template>

<script setup lang="ts">
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type { DelegatedTaskEntry } from '~/utils/teamDelegatedTaskEntries';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import TeamTaskReferenceViewer from '~/components/workspace/team/TeamTaskReferenceViewer.vue';

withDefaults(defineProps<{
  selectedEntry: DelegatedTaskEntry | null;
  selectedReference?: TeamReferenceFile | null;
  referenceRefreshSignal?: number;
}>(), {
  selectedReference: null,
  referenceRefreshSignal: 0,
});
</script>
