<template>
  <section class="flex h-full flex-col overflow-hidden" data-testid="mobile-files">
    <header class="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
      <h2 class="text-xl font-bold text-slate-950">{{ workspaceTitle }}</h2>
      <p class="mt-1 truncate text-sm text-slate-500">{{ workspaceSubtitle }}</p>
      <div v-if="activeWorkspace" class="mt-3 flex items-center gap-2" data-testid="mobile-files-primary-controls">
        <input
          v-model="search"
          class="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          :placeholder="searchPlaceholder"
          data-testid="mobile-files-search"
        />
        <button
          type="button"
          class="shrink-0 rounded-2xl border border-slate-300 px-3 py-3 text-sm font-bold text-slate-700"
          data-testid="mobile-files-filters-toggle"
          @click="showFilters = !showFilters"
        >
          Filters
        </button>
      </div>
      <div v-if="activeWorkspace && showFilters" class="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3" data-testid="mobile-files-advanced-filters">
        <button
          v-for="filter in discoveryFilters"
          :key="filter.id"
          type="button"
          class="rounded-full px-3 py-1.5 text-xs font-bold"
          :class="activeDiscoveryFilter === filter.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'"
          :data-testid="`mobile-files-filter-${filter.id}`"
          @click="activeDiscoveryFilter = filter.id"
        >
          {{ filter.label }} · {{ filter.count }}
        </button>
        <button
          type="button"
          class="col-span-2 rounded-full px-3 py-1.5 text-xs font-bold"
          :class="deepSearch ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'"
          data-testid="mobile-files-deep-search"
          @click="deepSearch = !deepSearch"
        >
          {{ deepSearch ? 'Workspace search on' : 'Search full workspace' }}
        </button>
      </div>
      <p v-if="activeWorkspace && attachNotice" class="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800" data-testid="mobile-files-attach-notice">
        {{ attachNotice }}
      </p>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-5">
      <div v-if="!activeWorkspace" class="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm" data-testid="mobile-files-no-workspace">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl" aria-hidden="true">
          {{ unavailableIcon }}
        </div>
        <p class="mt-4 font-semibold text-slate-900">{{ unavailableTitle }}</p>
        <p class="mt-2 break-words text-sm text-slate-500">{{ unavailableDetail }}</p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <button
            v-if="canChooseWorkspace"
            type="button"
            class="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
            @click="$emit('chooseWork')"
          >
            Choose workspace
          </button>
          <button
            v-if="canRetryWorkspaceResolution"
            type="button"
            class="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            data-testid="mobile-files-retry-workspace"
            @click="resolveWorkspaceForContext"
          >
            Retry
          </button>
        </div>
      </div>

      <template v-else>
        <div class="sticky top-0 z-10 -mx-5 mb-3 border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur" data-testid="mobile-files-sticky-context">
          <p class="break-words text-sm font-semibold text-slate-900">{{ currentFolderLabel }}</p>
          <div v-if="breadcrumb.length > 1" class="mt-2 flex flex-wrap gap-2 text-sm">
            <button
              v-for="(crumb, index) in breadcrumb"
              :key="crumb.path || 'root'"
              type="button"
              class="rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-600"
              @click="openCrumb(index)"
            >
              {{ crumb.name }}
            </button>
          </div>
          <p v-if="isSearchLoading" class="mt-2 text-xs font-semibold text-blue-700" data-testid="mobile-files-search-loading">
            Searching the full workspace…
          </p>
          <p v-else-if="searchError" class="mt-2 text-xs font-semibold text-red-700" data-testid="mobile-files-search-error">
            {{ searchError }}
          </p>
        </div>

        <div v-if="visibleChildren.length" class="space-y-2" data-testid="mobile-files-list">
          <button
            v-for="node in visibleChildren"
            :key="node.id || node.path || node.name"
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70"
            :disabled="isNodeBusy(node)"
            @click="openNode(node)"
          >
            <span class="text-xl">{{ node.is_file ? '📄' : '📁' }}</span>
            <span class="min-w-0 flex-1">
              <span class="block break-words font-semibold text-slate-950">{{ node.name }}</span>
              <span class="block break-words text-sm text-slate-500">{{ node.path || (node.is_file ? 'File' : 'Folder') }}</span>
              <span v-if="!node.is_file && isFolderLoading(node.path)" class="mt-1 block text-xs font-semibold text-blue-700">
                Loading folder…
              </span>
              <span v-else-if="!node.is_file && getFolderError(node.path)" class="mt-1 block text-xs font-semibold text-red-700">
                {{ getFolderError(node.path) }}
              </span>
              <span v-else-if="!node.is_file && !node.childrenLoaded" class="mt-1 block text-xs font-semibold text-slate-500">
                Tap to load folder contents
              </span>
            </span>
          </button>
        </div>
        <div v-else class="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm" data-testid="mobile-files-empty">
          {{ emptyMessage }}
        </div>
      </template>
    </div>

    <MobileFileViewer
      v-if="previewNode && activeWorkspace"
      :node="previewNode"
      :workspace-id="activeWorkspace.workspaceId"
      :context="context"
      :file-state="previewFileState"
      :open-error="previewOpenError"
      :presentation="previewPresentation"
      :allow-attach="previewAllowAttach"
      @close="previewNode = null"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue';
import MobileFileViewer from '~/components/mobile/MobileFileViewer.vue';
import { useMobileFileContextCoordinator } from '~/composables/mobile/useMobileFileContextCoordinator';
import {
  useMobileWorkspaceFileExplorer,
  type MobileWorkspaceFileNode,
} from '~/composables/mobile/useMobileWorkspaceFileExplorer';
import type { MobileWorkContext } from '~/types/mobileWork';
import { mobileWorkContextKey } from '~/types/mobileWork';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

defineEmits<{
  chooseWork: [];
}>();

const mobileExplorer = useMobileWorkspaceFileExplorer(toRef(props, 'context'));
const { getVisibleContextAttachments } = useMobileFileContextCoordinator();
const search = ref('');
const folderStack = ref<MobileWorkspaceFileNode[]>([]);
const previewNode = ref<MobileWorkspaceFileNode | null>(null);
const previewPresentation = ref<'fullscreen' | 'inline'>('fullscreen');
const previewAllowAttach = ref(true);
const previewRequestInFlightRevision = ref<number | null>(null);
const lastAttachmentCount = ref(0);
const deepSearch = ref(false);
const showFilters = ref(false);
const activeDiscoveryFilter = ref<'all' | 'recent' | 'attached' | 'markdown-code'>('all');
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

const activeWorkspace = mobileExplorer.workspace;
const workspaceTitle = computed(() => activeWorkspace.value?.name || props.context?.title || 'Workspace files');
const workspaceSubtitle = computed(() => {
  if (activeWorkspace.value?.absolutePath) return activeWorkspace.value.absolutePath;
  if (mobileExplorer.requestedRootPath.value) return mobileExplorer.requestedRootPath.value;
  return 'Select a workspace to browse files.';
});
const currentFolder = computed<MobileWorkspaceFileNode | null>(() => folderStack.value.at(-1) ?? mobileExplorer.tree.value ?? null);
const currentFolderLabel = computed(() => currentFolder.value?.path || currentFolder.value?.name || workspaceTitle.value);
const breadcrumb = computed(() => {
  const root = mobileExplorer.tree.value;
  return root ? [root, ...folderStack.value.filter((node) => node !== root)] : [];
});
const loadedWorkspaceFiles = computed(() => mobileExplorer.tree.value ? flattenFiles(mobileExplorer.tree.value) : []);
const attachedFileNodes = computed<MobileWorkspaceFileNode[]>(() => getVisibleContextAttachments(props.context)
  .filter((attachment) => attachment.kind === 'workspace_path')
  .map((attachment) => ({
    id: attachment.id,
    name: attachment.displayName,
    path: attachment.locator,
    is_file: true,
    children: [],
    childrenLoaded: true,
  })));
const workspaceSearchMode = computed(() => (
  deepSearch.value
  && search.value.trim().length > 0
  && activeDiscoveryFilter.value !== 'recent'
  && activeDiscoveryFilter.value !== 'attached'
));
const sourceNodes = computed<MobileWorkspaceFileNode[]>(() => {
  if (activeDiscoveryFilter.value === 'attached') {
    return attachedFileNodes.value;
  }
  if (activeDiscoveryFilter.value === 'recent') {
    return mobileExplorer.recentFiles.value;
  }
  if (workspaceSearchMode.value) {
    return mobileExplorer.searchResults.value;
  }
  if (deepSearch.value) {
    return loadedWorkspaceFiles.value;
  }
  return currentFolder.value?.children ?? [];
});
const visibleChildren = computed<MobileWorkspaceFileNode[]>(() => {
  const query = search.value.trim().toLowerCase();
  let children = sourceNodes.value;
  if (activeDiscoveryFilter.value === 'markdown-code') {
    children = children.filter((child) => child.is_file && isMarkdownOrCodePath(child.path || child.name));
  }
  if (!query || workspaceSearchMode.value) return children;
  return children.filter((child) => `${child.name} ${child.path}`.toLowerCase().includes(query));
});
const discoveryFilters = computed(() => {
  const base = workspaceSearchMode.value ? mobileExplorer.searchResults.value : (deepSearch.value ? loadedWorkspaceFiles.value : (currentFolder.value?.children ?? []));
  return [
    { id: 'all' as const, label: deepSearch.value ? 'All files' : 'Folder', count: base.length },
    { id: 'recent' as const, label: 'Recent', count: mobileExplorer.recentFiles.value.length },
    { id: 'attached' as const, label: 'Attached', count: attachedFileNodes.value.length },
    { id: 'markdown-code' as const, label: 'Markdown/code', count: base.filter((child) => child.is_file && isMarkdownOrCodePath(child.path || child.name)).length },
  ];
});
const searchPlaceholder = computed(() => deepSearch.value
  ? 'Search full workspace files'
  : 'Filter current folder');
const attachNotice = computed(() => {
  const count = getVisibleContextAttachments(props.context).length;
  if (count <= lastAttachmentCount.value) return null;
  const targetLabel = props.context?.kind === 'agent-run' || props.context?.kind === 'team-run'
    ? 'Chat context'
    : 'the next mobile run launch';
  return `${count} file${count === 1 ? '' : 's'} attached to ${targetLabel}.`;
});
const unavailableTitle = computed(() => {
  if (mobileExplorer.resolutionStatus.value === 'resolving') return 'Loading workspace files';
  if (mobileExplorer.resolutionStatus.value === 'unresolved') return 'Workspace unavailable';
  if (mobileExplorer.resolutionStatus.value === 'no-workspace-context') return 'Choose a workspace';
  return 'Choose a workspace';
});
const unavailableIcon = computed(() => mobileExplorer.resolutionStatus.value === 'resolving' ? '⏳' : '📁');
const unavailableDetail = computed(() => {
  if (mobileExplorer.resolutionStatus.value === 'resolving') {
    return 'Resolving the selected context workspace before showing files.';
  }
  if (mobileExplorer.workspaceResolutionError.value) {
    return mobileExplorer.workspaceResolutionError.value;
  }
  if (mobileExplorer.requestedRootPath.value) {
    return `Files for ${mobileExplorer.requestedRootPath.value} are not available yet.`;
  }
  return 'Files stay focused on one selected workspace, run, or team run at a time.';
});
const canChooseWorkspace = computed(() => mobileExplorer.resolutionStatus.value !== 'resolving');
const canRetryWorkspaceResolution = computed(() => mobileExplorer.resolutionStatus.value === 'unresolved');
const emptyMessage = computed(() => {
  if (workspaceSearchMode.value) return 'No files matched the workspace search.';
  if (search.value.trim() || activeDiscoveryFilter.value !== 'all') return 'No files match this view.';
  return 'This folder is empty.';
});
const previewFileState = computed(() => previewNode.value ? mobileExplorer.getOpenFileState(previewNode.value.path) : null);
const previewOpenError = computed(() => previewNode.value ? mobileExplorer.getFileOpenError(previewNode.value.path) : null);
const mobileWorkStore = useMobileWorkStore();
const isSearchLoading = mobileExplorer.isSearchLoading;
const searchError = mobileExplorer.searchError;
const resolveWorkspaceForContext = mobileExplorer.resolveWorkspaceForContext;
const isFolderLoading = mobileExplorer.isFolderLoading;
const getFolderError = mobileExplorer.getFolderError;

async function openNode(node: MobileWorkspaceFileNode): Promise<void> {
  if (node.is_file) {
    lastAttachmentCount.value = getVisibleContextAttachments(props.context).length;
    previewPresentation.value = 'fullscreen';
    previewAllowAttach.value = true;
    previewNode.value = node;
    await mobileExplorer.openFileReadOnly(node.path);
    return;
  }
  const loaded = await mobileExplorer.ensureFolderChildren(node);
  if (loaded) {
    folderStack.value = [...folderStack.value, node];
  }
}

async function consumeEventMonitorPreviewRequest(): Promise<void> {
  const request = mobileWorkStore.pendingFilePreviewRequest;
  const currentContext = props.context;
  const resolvedWorkspaceId = activeWorkspace.value?.workspaceId || '';
  const clearRequest = (revision: number): void => {
    mobileWorkStore.consumeFilePreviewRequest(revision);
    if (previewRequestInFlightRevision.value === revision) {
      previewRequestInFlightRevision.value = null;
    }
  };
  if (
    !request
  ) {
    previewRequestInFlightRevision.value = null;
    return;
  }

  if (!currentContext || mobileWorkContextKey(currentContext) !== request.contextKey) {
    clearRequest(request.revision);
    return;
  }
  if (!resolvedWorkspaceId) {
    if (mobileExplorer.resolutionStatus.value === 'resolving') return;
    clearRequest(request.revision);
    return;
  }
  if (resolvedWorkspaceId !== request.workspaceId || previewRequestInFlightRevision.value === request.revision) {
    if (resolvedWorkspaceId !== request.workspaceId) {
      clearRequest(request.revision);
    }
    return;
  }

  const requestRevision = request.revision;
  previewRequestInFlightRevision.value = requestRevision;
  try {
    await mobileExplorer.openFileReadOnly(request.relativePath);
  } finally {
    const latestRequest = mobileWorkStore.pendingFilePreviewRequest;
    const latestContext = props.context;
    const latestWorkspaceId = activeWorkspace.value?.workspaceId || '';
    const stillCurrent = latestRequest?.revision === requestRevision
      && latestContext
      && mobileWorkContextKey(latestContext) === request.contextKey
      && latestWorkspaceId === request.workspaceId;

    if (stillCurrent) {
      previewPresentation.value = request.presentation;
      previewAllowAttach.value = false;
      previewNode.value = {
        id: `event-monitor-${requestRevision}`,
        name: request.relativePath.split('/').filter(Boolean).at(-1) || request.relativePath,
        path: request.relativePath,
        is_file: true,
        children: [],
        childrenLoaded: true,
      };
    }
    clearRequest(requestRevision);
  }
}

function openCrumb(index: number): void {
  if (index <= 0) {
    folderStack.value = [];
    return;
  }
  folderStack.value = folderStack.value.slice(0, index);
}

function isNodeBusy(node: MobileWorkspaceFileNode): boolean {
  return !node.is_file && mobileExplorer.isFolderLoading(node.path);
}

function flattenFiles(node: MobileWorkspaceFileNode): MobileWorkspaceFileNode[] {
  const children = node.children ?? [];
  return children.flatMap((child) => child.is_file ? [child] : flattenFiles(child));
}

function isMarkdownOrCodePath(path: string): boolean {
  return /\.(c|cc|cpp|cs|css|go|h|hpp|html|java|js|json|jsx|kt|less|log|lua|md|mjs|php|py|rb|rs|sass|scss|sh|sql|swift|toml|ts|tsx|txt|vue|xml|ya?ml)$/i.test(path);
}

function clearSearchDebounce(): void {
  if (searchDebounce) {
    clearTimeout(searchDebounce);
    searchDebounce = null;
  }
}

watch(
  () => [search.value, deepSearch.value, mobileExplorer.workspaceId.value ?? ''] as const,
  ([query, deep, workspaceId]) => {
    clearSearchDebounce();
    if (!workspaceId) return;
    if (!deep) {
      void mobileExplorer.searchFiles('');
      return;
    }
    searchDebounce = setTimeout(() => {
      void mobileExplorer.searchFiles(query.trim());
    }, 250);
  },
  { immediate: true },
);

watch(() => activeWorkspace.value?.workspaceId, () => {
  folderStack.value = [];
  previewNode.value = null;
  deepSearch.value = false;
  activeDiscoveryFilter.value = 'all';
});

watch(
  [
    () => mobileWorkStore.pendingFilePreviewRequest,
    () => activeWorkspace.value?.workspaceId || '',
    () => props.context ? mobileWorkContextKey(props.context) : '',
  ],
  () => { void consumeEventMonitorPreviewRequest(); },
  { immediate: true, deep: true },
);

onBeforeUnmount(clearSearchDebounce);
</script>
