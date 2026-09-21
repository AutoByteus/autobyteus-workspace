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
  contentPath: string;
  reference: TeamReferenceFile;
  refreshSignal?: number;
}>();

const windowNodeContextStore = useWindowNodeContextStore();
const contentUrl = computed(() => {
  const restBaseUrl = windowNodeContextStore.getBoundEndpoints().rest.replace(/\/$/, '');
  return `${restBaseUrl}/${props.contentPath.replace(/^\/+/, '')}`;
});
</script>
