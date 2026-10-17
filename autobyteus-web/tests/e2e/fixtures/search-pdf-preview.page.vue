<template>
  <main class="h-screen bg-white" data-test="search-pdf-probe">
    <h1 class="px-4 py-2">Files — synthetic workspace PDF validation</h1>
    <p v-if="failure" role="alert">{{ failure }}</p>
    <div v-if="ready" class="h-[calc(100vh-44px)]">
      <FileExplorerLayout :workspace-id="workspaceId" />
    </div>
  </main>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import FileExplorerLayout from '~/components/fileExplorer/FileExplorerLayout.vue';
import { useWorkspaceStore } from '~/stores/workspace';
definePageMeta({ layout: false });
const workspaceId = String(useRoute().query.workspaceId || '');
const ready = ref(false);
const failure = ref('');
onMounted(async () => {
  try {
    // Public store API queries the real registered backend workspace; no state writes,
    // GraphQL/REST/WebSocket fixtures, viewer substitutions or identity adapters.
    const store = useWorkspaceStore();
    await store.fetchAllWorkspaces();
    if (!store.workspaces[workspaceId]) throw new Error('Owned workspace not registered');
    ready.value = true;
  } catch (error) { failure.value = String(error); }
});
</script>
