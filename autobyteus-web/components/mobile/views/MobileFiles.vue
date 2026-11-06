<template>
  <!-- Files (UIS-005, VIS-008, 009, 029): the open agent's folder. One bar (←, "Files", search), the path line, the rows;
       one search over the workspace, no filters. A file opens full screen (a history entry, so Back closes it first). -->
  <section class="fixed inset-0 z-20 flex h-[100dvh] flex-col bg-white text-slate-900" data-testid="mobile-files">
    <MobileScreenBar title="Files" @back="$emit('back')">
      <template v-if="searching" #title>
        <input
          ref="searchInput"
          v-model="search"
          type="search"
          class="h-10 min-w-0 flex-1 rounded-lg bg-slate-100 px-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Search files"
          aria-label="Search files"
          data-testid="mobile-files-search"
        />
      </template>
      <template #actions>
        <button v-if="searching" type="button" class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-500 active:bg-slate-100" aria-label="Close search" data-testid="mobile-files-search-close" @click="closeSearch">
          <Icon icon="heroicons:x-mark-20-solid" class="h-6 w-6" aria-hidden="true" />
        </button>
        <button v-else-if="workspace" type="button" class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100" aria-label="Search files" data-testid="mobile-files-search-open" @click="openSearch">
          <Icon icon="heroicons:magnifying-glass-20-solid" class="h-6 w-6" aria-hidden="true" />
        </button>
      </template>
    </MobileScreenBar>

    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
      <p v-if="remote" class="px-4 py-10 text-center text-sm text-slate-500" data-testid="mobile-files-remote">{{ t('remote.panel.files', { node: remote.nodeName }) }}</p>
      <p v-else-if="!workspace" class="px-4 py-10 text-center text-sm text-slate-500" data-testid="mobile-files-no-workspace">
        {{ unavailableText }}
        <button v-if="explorer.resolutionStatus.value === 'unresolved'" type="button" class="ml-1 h-11 font-semibold text-blue-700 underline" data-testid="mobile-files-retry-workspace" @click="explorer.resolveWorkspaceForContext">Retry</button>
      </p>
      <template v-else>
        <nav v-if="!searching" class="sticky top-0 z-10 flex h-11 items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-slate-100 bg-white px-4 text-sm" aria-label="Folder" data-testid="mobile-files-path">
          <template v-for="(crumb, index) in breadcrumb" :key="crumb.path || 'root'">
            <Icon v-if="index > 0" icon="heroicons:chevron-right-20-solid" class="h-4 w-4 flex-shrink-0 text-slate-300" aria-hidden="true" />
            <button type="button" class="h-11 flex-shrink-0 px-1" :class="index === breadcrumb.length - 1 ? 'font-semibold text-slate-900' : 'text-slate-500'" @click="openCrumb(index)">
              {{ index === 0 ? workspace.name : crumb.name }}
            </button>
          </template>
        </nav>
        <p v-if="searching && explorer.isSearchLoading.value" class="px-4 py-2 text-xs text-blue-700" data-testid="mobile-files-search-loading">Searching…</p>
        <p v-else-if="searching && explorer.searchError.value" class="px-4 py-2 text-xs text-red-700" data-testid="mobile-files-search-error">{{ explorer.searchError.value }}</p>

        <ul v-if="rows.length" data-testid="mobile-files-list">
          <li v-for="node in rows" :key="node.id || node.path || node.name">
            <button
              type="button"
              class="flex min-h-[3.5rem] w-full items-center gap-3 border-b border-slate-100 px-4 py-2 text-left active:bg-slate-50 disabled:opacity-60"
              :disabled="!node.is_file && explorer.isFolderLoading(node.path)"
              data-testid="mobile-files-row"
              @click="openNode(node)"
            >
              <Icon :icon="node.is_file ? 'heroicons:document-20-solid' : 'heroicons:folder-20-solid'" class="h-6 w-6 flex-shrink-0" :class="node.is_file ? 'text-slate-400' : 'text-amber-400'" aria-hidden="true" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[0.9375rem] font-medium text-slate-900">{{ node.name }}</span>
                <span v-if="searching && node.path && node.path !== node.name" class="block truncate text-xs text-slate-500">{{ node.path }}</span>
                <span v-if="!node.is_file && explorer.isFolderLoading(node.path)" class="block text-xs text-blue-700">Loading…</span>
                <span v-else-if="!node.is_file && explorer.getFolderError(node.path)" class="block text-xs text-red-700">{{ explorer.getFolderError(node.path) }}</span>
              </span>
              <Icon v-if="!node.is_file" icon="heroicons:chevron-right-20-solid" class="h-5 w-5 flex-shrink-0 text-slate-300" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <p v-else class="px-4 py-10 text-center text-sm text-slate-500" data-testid="mobile-files-empty">{{ searching ? 'No files matched the workspace search.' : 'This folder is empty.' }}</p>
      </template>
    </div>

    <MobileFileViewer
      v-if="openPath"
      :path="openPath"
      :file-state="openFileMatches ? explorer.getOpenFileState(openPath) : null"
      :open-error="openFileError"
      @close="navigation.back()"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import MobileScreenBar from '~/components/mobile/MobileScreenBar.vue';
import MobileFileViewer from '~/components/mobile/views/MobileFileViewer.vue';
import { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import { useMobileWorkspaceFileExplorer, type MobileWorkspaceFileNode } from '~/composables/mobile/useMobileWorkspaceFileExplorer';
import { useRemoteRun } from '~/composables/remoteRuns/useRemoteRun';
import { useLocalization } from '~/composables/useLocalization';
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';

const props = defineProps<{ target: ActiveAgentWorkspaceTarget }>();
defineEmits<{ (event: 'back'): void }>();

const { t } = useLocalization();
const navigation = useMobileNavigation();
const remote = useRemoteRun(() => props.target.context.state.runId);
const explorer = useMobileWorkspaceFileExplorer(computed(() => props.target.workspaceRootPath));
const workspace = explorer.workspace;

const folderStack = ref<MobileWorkspaceFileNode[]>([]);
const searching = ref(false);
const search = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
let debounce: ReturnType<typeof setTimeout> | null = null;

const breadcrumb = computed(() => {
  const root = explorer.tree.value;
  return root ? [root, ...folderStack.value.filter((node) => node !== root)] : [];
});
const currentFolder = computed(() => folderStack.value.at(-1) ?? explorer.tree.value ?? null);
const rows = computed<MobileWorkspaceFileNode[]>(() => (searching.value && search.value.trim()
  ? explorer.searchResults.value
  : currentFolder.value?.children ?? []));
const unavailableText = computed(() => (explorer.resolutionStatus.value === 'resolving'
  ? 'Loading workspace files'
  : explorer.workspaceResolutionError.value || 'Workspace unavailable'));

/** The file the route opens; it is read in the open agent's folder. */
const openPath = navigation.openFilePath;
const openFileMatches = computed(() => Boolean(workspace.value && navigation.openFileWorkspaceId.value === workspace.value.workspaceId));
/** A file of another folder than the open agent's cannot be read here; while the folder resolves it is opening. */
const openFileError = computed(() => {
  if (!openPath.value || !workspace.value) return null;
  return openFileMatches.value ? explorer.getFileOpenError(openPath.value) : 'unavailable';
});
watch([openPath, openFileMatches], ([path, matches]) => { if (path && matches) void explorer.openFileReadOnly(path); }, { immediate: true });

const openNode = async (node: MobileWorkspaceFileNode): Promise<void> => {
  if (node.is_file) {
    if (workspace.value) await navigation.openFile({ workspaceId: workspace.value.workspaceId, path: node.path });
    return;
  }
  if (await explorer.ensureFolderChildren(node)) {
    folderStack.value = [...folderStack.value, node];
    if (searching.value) closeSearch();
  }
};
const openCrumb = (index: number): void => { folderStack.value = index <= 0 ? [] : folderStack.value.slice(0, index); };

const openSearch = (): void => {
  searching.value = true;
  void nextTick(() => searchInput.value?.focus());
};
const closeSearch = (): void => {
  searching.value = false;
  search.value = '';
};
watch(search, (query) => {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => { void explorer.searchFiles(query.trim()); }, 250);
});
watch(() => workspace.value?.workspaceId, () => { folderStack.value = []; closeSearch(); });
onBeforeUnmount(() => { if (debounce) clearTimeout(debounce); });
</script>
