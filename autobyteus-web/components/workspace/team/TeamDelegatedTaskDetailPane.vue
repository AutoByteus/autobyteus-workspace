<template>
  <main class="min-h-0 min-w-0 flex-1 overflow-hidden" data-test="delegated-task-detail-pane">
    <div v-if="selectedEntry && selectedItem && selectedReference" class="h-full" data-test="delegated-task-reference-preview">
      <TeamTaskReferenceViewer
        :content-path="referenceContentPath"
        :reference="selectedReference"
        :refresh-signal="referenceRefreshSignal"
      />
    </div>

    <TeamDelegatedTaskItemDetail
      v-else-if="selectedEntry && selectedItem"
      :key="`${selectedEntry.entryKey}:${selectedItem.itemKey}`"
      :item="selectedItem"
      @select-participant="$emit('select-participant', $event)"
      :display-status="selectedEntry.displayStatus"
    />

    <div v-else class="flex h-full items-center justify-center p-4 text-center text-sm text-slate-400">
      {{ $t('workspace.components.workspace.team.TeamDelegatedTasksSection.select_task') }}
    </div>
  </main>
</template>

<script setup lang="ts">
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type { CollaborationTaskParticipantLink, DelegatedTaskEntry, DelegatedTaskLifecycleItem } from '~/types/workspace/collaborationTaskPresentation';
import TeamDelegatedTaskItemDetail from '~/components/workspace/team/TeamDelegatedTaskItemDetail.vue';
import TeamTaskReferenceViewer from '~/components/workspace/team/TeamTaskReferenceViewer.vue';

defineEmits<{ (e: 'select-participant', participant: CollaborationTaskParticipantLink): void }>();

withDefaults(defineProps<{
  selectedEntry: DelegatedTaskEntry | null;
  selectedItem: DelegatedTaskLifecycleItem | null;
  selectedReference?: TeamReferenceFile | null;
  referenceRefreshSignal?: number;
  referenceContentPath?: string;
}>(), {
  selectedReference: null,
  referenceRefreshSignal: 0,
  referenceContentPath: '',
});
</script>
