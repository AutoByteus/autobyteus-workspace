<template>
  <main class="min-h-0 min-w-0 flex-1 overflow-hidden" data-test="delegated-task-detail-pane">
    <div v-if="selectedEntry && selectedItem && selectedReference" class="h-full" data-test="delegated-task-reference-preview">
      <TeamTaskReferenceViewer
        :team-run-id="selectedEntry.teamRunId"
        :task-id="selectedEntry.taskId"
        :reference="selectedReference"
        :refresh-signal="referenceRefreshSignal"
      />
    </div>

    <TeamDelegatedTaskItemDetail
      v-else-if="selectedEntry && selectedItem"
      :item="selectedItem"
      :display-status="selectedEntry.displayStatus"
    />

    <div v-else class="flex h-full items-center justify-center p-4 text-center text-sm text-slate-400">
      {{ $t('workspace.components.workspace.team.TeamDelegatedTasksSection.select_task') }}
    </div>
  </main>
</template>

<script setup lang="ts">
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type { DelegatedTaskEntry, DelegatedTaskLifecycleItem } from '~/utils/teamDelegatedTaskEntries';
import TeamDelegatedTaskItemDetail from '~/components/workspace/team/TeamDelegatedTaskItemDetail.vue';
import TeamTaskReferenceViewer from '~/components/workspace/team/TeamTaskReferenceViewer.vue';

withDefaults(defineProps<{
  selectedEntry: DelegatedTaskEntry | null;
  selectedItem: DelegatedTaskLifecycleItem | null;
  selectedReference?: TeamReferenceFile | null;
  referenceRefreshSignal?: number;
}>(), {
  selectedReference: null,
  referenceRefreshSignal: 0,
});
</script>
