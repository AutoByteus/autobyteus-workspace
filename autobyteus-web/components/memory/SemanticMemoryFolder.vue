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

    <div v-else-if="!workspaceId" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.semantic.loading_folder') }}</div>
    <!-- The folder as the Skills page shows a skill's folder, read only: the file explorer and the Files panel's tabs. It
         fills the page's remaining height (min 460 px; autobyteus-608 DC-004); a long document scrolls inside it. Below
         768 px the file list sits above the open file. No path bar: "Copy folder path" at the list's foot (TR-008). -->
    <div v-else class="flex min-h-[460px] grow basis-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:flex-row" data-test="semantic-memory-explorer">
      <div class="semantic-memory-sidebar flex max-h-[34vh] w-full flex-shrink-0 flex-col border-b border-gray-200 bg-gray-50/70 md:max-h-none md:w-[280px] md:border-b-0 md:border-r lg:w-[300px]">
        <FileExplorer class="min-h-0 flex-1" :workspace-id="workspaceId" read-only />
        <button
          type="button"
          class="mx-2 mb-2 inline-flex flex-shrink-0 items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs text-gray-500 transition hover:bg-gray-200/70 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :title="folder.folderPath"
          data-test="semantic-memory-copy-path"
          @click="copyPath"
        >
          <Icon :icon="copied ? 'heroicons:check-20-solid' : 'heroicons:clipboard-document'" class="h-3.5 w-3.5" :class="copied ? 'text-green-600' : ''" aria-hidden="true" />
          <span aria-live="polite">{{ copied ? $t('memory.semantic.copied') : $t('memory.semantic.copy_folder_path') }}</span>
        </button>
      </div>
      <div class="semantic-memory-reader flex min-h-[320px] min-w-0 flex-1 flex-col bg-white">
        <FileExplorerTabs :workspace-id="workspaceId" read-only />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import FileExplorer from '~/components/fileExplorer/FileExplorer.vue';
import FileExplorerTabs from '~/components/fileExplorer/FileExplorerTabs.vue';
import { useLocalization } from '~/composables/useLocalization';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { semanticMemoryWorkspaceId, useSemanticMemoryFolderStore } from '~/stores/semanticMemoryFolderStore';
import { useWorkspaceStore } from '~/stores/workspace';

/**
 * A semantic memory folder, read only (autobyteus-554, REQ-005…REQ-008, REQ-012): an agent's (its page's Semantic
 * memory tab) or the node's global one (`agentDefinitionId` null). While a folder with files is shown, the node's
 * read-only semantic memory workspace for it is registered (never listed in the Workspaces sidebar or a picker), and
 * the file explorer and the Files panel's tabs show it in their read-only mode: no context menu, rename, drag and drop
 * or upload, preview only, links listed as "Link · not opened", and the search box finds file names in this folder.
 * Leaving releases the workspace. Nothing here creates the folder. On arrival the first file at the folder's root, in
 * the list's order and not a link, opens (autobyteus-608 TR-004); "Copy folder path" copies the folder's real path.
 */
const props = defineProps<{ agentDefinitionId: string | null; agentName: string; imported: boolean }>();

const { t } = useLocalization();
const store = useSemanticMemoryFolderStore();
const workspaceStore = useWorkspaceStore();
const fileExplorerStore = useFileExplorerStore();

const isGlobal = computed(() => props.agentDefinitionId === null);
const folder = computed(() => store.folderOf(props.agentDefinitionId));
const workspaceError = ref<string | null>(null);
const error = computed(() => workspaceError.value || (folder.value || store.loading ? null : store.error));
const emptyBody = computed(() => {
  if (isGlobal.value) return folder.value?.exists ? t('memory.global.empty_body') : t('memory.global.missing_body');
  return folder.value?.exists ? t('memory.semantic.empty_body', { name: props.agentName }) : t('memory.semantic.missing_body', { name: props.agentName });
});

/** "Copied" for 1.5 s after the path reached the clipboard (TR-008). */
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;
const copyPath = async () => {
  const path = folder.value?.folderPath;
  if (!path) return;
  await navigator.clipboard.writeText(path);
  copied.value = true;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => { copied.value = false; }, 1500);
};

/** The first document at the folder's root, as the list shows it (folders first, then files by name), unless one is open. */
const openFirstDocument = (id: string) => {
  if (fileExplorerStore.getOpenFiles(id).length) return;
  const first = fileExplorerStore.getWorkspaceTree(id)?.children.find((node) => node.is_file && !node.isLink);
  if (first) void fileExplorerStore.openFilePreview(first.path, id);
};

/** The workspace shown, once its first listing is read. */
const workspaceId = ref<string | null>(null);
/** The workspace registered, from the moment of registration: leaving during its first listing releases it too. */
let registeredId: string | null = null;
/** Each release starts a new generation; a listing that completes after one is ignored. */
let generation = 0;
const release = () => {
  generation += 1;
  if (registeredId) workspaceStore.unregisterTransientWorkspace(registeredId);
  registeredId = null;
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
  registeredId = id;
  const mine = generation;
  try {
    await workspaceStore.fetchFolderChildren(id, '');
    if (mine !== generation) return;
    workspaceId.value = id;
    openFirstDocument(id);
  } catch (cause: any) {
    if (mine !== generation) return;
    release();
    workspaceError.value = cause?.message || 'Failed to read the folder.';
  }
}, { immediate: true });

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer);
  release();
});
</script>

<style scoped>
/* autobyteus-608 DC-004: the list's search row is 46 px, level with the reader's tab bar; denser rows. */
.semantic-memory-sidebar :deep(.file-explorer) {
  padding-top: 0;
  height: auto;
}
.semantic-memory-sidebar :deep(.file-explorer > div:first-child) {
  height: 46px;
  margin-bottom: 0;
  padding: 0 0.625rem;
  border-bottom: 1px solid #e5e7eb;
}
.semantic-memory-sidebar :deep(.file-explorer-content) {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
.semantic-memory-sidebar :deep(.file-header) {
  margin-left: 0.25rem;
  margin-right: 0.25rem;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  font-size: 0.8125rem;
}
.semantic-memory-sidebar :deep(.file-header span) {
  font-size: 0.8125rem;
}

/* No inner card chrome inside the panel. */
.semantic-memory-reader :deep(#contentViewer) {
  border-radius: 0;
  box-shadow: none;
}

/* DC-005: reader typography proportional to the pane. */
.semantic-memory-reader :deep(.markdown-renderer-segments) {
  max-width: 74ch;
  padding: 0.75rem 1.25rem 1.5rem;
}
.semantic-memory-reader :deep(.markdown-body) {
  font-size: 0.875rem;
  line-height: 1.65;
  color: #374151;
}
.semantic-memory-reader :deep(.markdown-body h1) {
  font-size: 1.375rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.015em;
  color: #111827;
  margin-top: 0;
  margin-bottom: 0.9rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid #f3f4f6;
}
.semantic-memory-reader :deep(.markdown-body h2) {
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.35;
  color: #111827;
  margin-top: 1.4rem;
  margin-bottom: 0.55rem;
}
.semantic-memory-reader :deep(.markdown-body h3) {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2937;
  margin-top: 1.15rem;
  margin-bottom: 0.4rem;
}
.semantic-memory-reader :deep(.markdown-body p) {
  margin-top: 0;
  margin-bottom: 0.75rem;
}
.semantic-memory-reader :deep(.markdown-body ul),
.semantic-memory-reader :deep(.markdown-body ol) {
  margin-top: 0.35rem;
  margin-bottom: 0.85rem;
  padding-left: 1.35rem;
}
.semantic-memory-reader :deep(.markdown-body li) {
  margin-top: 0.3rem;
  margin-bottom: 0.3rem;
}
.semantic-memory-reader :deep(.markdown-body code) {
  font-size: 0.8125rem;
  font-weight: 400;
  background-color: #f3f4f6;
  color: #1f2937;
  padding: 0.125rem 0.35rem;
  border-radius: 0.25rem;
}
.semantic-memory-reader :deep(.markdown-body code::before),
.semantic-memory-reader :deep(.markdown-body code::after) {
  content: none;
}
.semantic-memory-reader :deep(.markdown-body pre code) {
  background-color: transparent;
  padding: 0;
}
.semantic-memory-reader :deep(.markdown-body table) {
  font-size: 0.8125rem;
}
</style>
