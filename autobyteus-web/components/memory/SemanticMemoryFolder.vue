<template>
  <div class="flex flex-col" data-test="semantic-memory-folder">
    <!-- An imported source: semantic memory is not synced (REQ-008); nothing is asked of the node. -->
    <div v-if="imported" class="py-12 text-center" data-test="semantic-memory-not-synced">
      <h2 class="text-sm font-medium text-gray-700">{{ $t('memory.semantic.not_synced_title') }}</h2>
      <p class="mx-auto mt-1 max-w-lg text-sm text-gray-500">{{ $t('memory.semantic.not_synced_body_detail') }}</p>
    </div>

    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ error }}
      <button class="ml-2 font-semibold underline" @click="open">{{ $t('memory.results.retry') }}</button>
    </div>
    <div v-else-if="!folder" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.semantic.loading_folder') }}</div>

    <!-- A missing folder is never created by the view; it appears when the agent next runs. An empty one says so too. -->
    <div v-else-if="!folder.exists || folder.isEmpty" class="py-12 text-center" data-test="semantic-memory-empty">
      <h2 class="text-sm font-medium text-gray-700">{{ isGlobal ? $t('memory.global.missing_title') : $t('memory.semantic.missing_title') }}</h2>
      <p class="mx-auto mt-1 max-w-lg text-sm text-gray-500">{{ emptyBody }}</p>
    </div>

    <template v-else>
      <p class="mb-3 break-all font-mono text-xs text-gray-500" data-test="semantic-memory-path"><span class="select-all">{{ folder.folderPath }}</span></p>
      <div v-if="!workspaceId" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.semantic.loading_folder') }}</div>
      <!-- The folder as the Skills page shows a skill's folder, read only: the file explorer and the Files panel's tabs.
           Below 768 px the file list sits above the open file. -->
      <div v-else class="flex h-[64vh] min-h-[420px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white md:flex-row" data-test="semantic-memory-explorer">
        <div class="flex max-h-[38vh] w-full flex-shrink-0 flex-col border-b border-gray-200 bg-gray-50 md:max-h-none md:w-[260px] md:border-b-0 md:border-r">
          <FileExplorer :workspace-id="workspaceId" read-only />
        </div>
        <div class="flex min-h-[320px] min-w-0 flex-1 flex-col">
          <FileExplorerTabs :workspace-id="workspaceId" read-only />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import FileExplorer from '~/components/fileExplorer/FileExplorer.vue';
import FileExplorerTabs from '~/components/fileExplorer/FileExplorerTabs.vue';
import { useLocalization } from '~/composables/useLocalization';
import { semanticMemoryWorkspaceId, useSemanticMemoryFolderStore } from '~/stores/semanticMemoryFolderStore';
import { useWorkspaceStore } from '~/stores/workspace';

/**
 * A semantic memory folder, read only (autobyteus-554, REQ-005…REQ-008, REQ-012): an agent's (its page's Semantic
 * memory tab) or the node's global one (`agentDefinitionId` null). While a folder with files is shown, the node's
 * read-only semantic memory workspace for it is registered (never listed in the Workspaces sidebar or a picker), and
 * the file explorer and the Files panel's tabs show it in their read-only mode: no context menu, rename, drag and drop
 * or upload, preview only, links listed as "Link · not opened", and the search box finds file names in this folder.
 * Leaving releases the workspace. Nothing here creates the folder.
 */
const props = defineProps<{ agentDefinitionId: string | null; agentName: string; imported: boolean }>();

const { t } = useLocalization();
const store = useSemanticMemoryFolderStore();
const workspaceStore = useWorkspaceStore();

const isGlobal = computed(() => props.agentDefinitionId === null);
const folder = computed(() => store.folderOf(props.agentDefinitionId));
const workspaceError = ref<string | null>(null);
const error = computed(() => workspaceError.value || (folder.value || store.loading ? null : store.error));
const emptyBody = computed(() => {
  if (isGlobal.value) return folder.value?.exists ? t('memory.global.empty_body') : t('memory.global.missing_body');
  return folder.value?.exists ? t('memory.semantic.empty_body', { name: props.agentName }) : t('memory.semantic.missing_body', { name: props.agentName });
});

const workspaceId = ref<string | null>(null);
const release = () => {
  if (workspaceId.value) workspaceStore.unregisterTransientWorkspace(workspaceId.value);
  workspaceId.value = null;
};

const open = () => {
  workspaceError.value = null;
  void store.open(props.agentDefinitionId);
};

watch(() => [props.agentDefinitionId, props.imported] as const, () => {
  if (props.imported) store.clear();
  else open();
}, { immediate: true });

/** The workspace exists only while a folder with files is shown. */
watch(() => [props.imported, folder.value?.folderPath, folder.value?.exists, folder.value?.isEmpty] as const, async () => {
  release();
  const current = folder.value;
  if (props.imported || !current?.exists || current.isEmpty) return;
  const id = workspaceStore.registerSemanticMemoryWorkspace(semanticMemoryWorkspaceId(props.agentDefinitionId), props.agentName, current.folderPath);
  try {
    await workspaceStore.fetchFolderChildren(id, '');
    workspaceId.value = id;
  } catch (cause: any) {
    workspaceStore.unregisterTransientWorkspace(id);
    workspaceError.value = cause?.message || 'Failed to read the folder.';
  }
}, { immediate: true });

onBeforeUnmount(release);
</script>
