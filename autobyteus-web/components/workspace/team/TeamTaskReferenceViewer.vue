<template>
  <TeamReferenceFileViewer
    :reference="reference"
    :content-url="contentUrl"
    :refresh-signal="refreshSignal"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import TeamReferenceFileViewer from './TeamReferenceFileViewer.vue';

const props = defineProps<{
  teamRunId: string;
  taskId: string;
  reference: TeamReferenceFile;
  refreshSignal?: number;
}>();

const windowNodeContextStore = useWindowNodeContextStore();
const contentUrl = computed(() => {
  const restBaseUrl = windowNodeContextStore.getBoundEndpoints().rest.replace(/\/$/, '');
  return `${restBaseUrl}/team-runs/${encodeURIComponent(props.teamRunId)}/task-delegations/${encodeURIComponent(props.taskId)}/references/${encodeURIComponent(props.reference.referenceId)}/content`;
});
</script>
