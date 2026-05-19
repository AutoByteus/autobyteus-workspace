<template>
  <section class="flex h-full flex-col overflow-hidden" data-testid="mobile-files">
    <header class="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Files</p>
      <h2 class="text-xl font-bold text-slate-950">{{ workspaceTitle }}</h2>
      <p class="mt-1 truncate text-sm text-slate-500">{{ workspaceSubtitle }}</p>
      <input
        v-model="search"
        class="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        :placeholder="searchPlaceholder"
        data-testid="mobile-files-search"
      />
      <div class="mt-3 flex gap-2 overflow-x-auto pb-1" data-testid="mobile-files-discovery-controls">
        <button
          v-for="filter in discoveryFilters"
          :key="filter.id"
          type="button"
          class="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
          :class="activeDiscoveryFilter === filter.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'"
          :data-testid="`mobile-files-filter-${filter.id}`"
          @click="activeDiscoveryFilter = filter.id"
        >
          {{ filter.label }} · {{ filter.count }}
        </button>
        <button
          type="button"
          class="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
          :class="deepSearch ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'"
          data-testid="mobile-files-deep-search"
          @click="deepSearch = !deepSearch"
        >
          {{ deepSearch ? 'Deep search on' : 'Deep search workspace' }}
        </button>
      </div>
      <p v-if="attachNotice" class="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800" data-testid="mobile-files-attach-notice">
        {{ attachNotice }}
      </p>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-5">
      <div v-if="!activeWorkspace" class="rounded-3xl border border-dashed border-slate-300 p-6 text-center" data-testid="mobile-files-no-workspace">
        <p class="font-semibold text-slate-900">Choose a workspace</p>
        <p class="mt-2 text-sm text-slate-500">Files stay focused on one workspace at a time.</p>
        <button type="button" class="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white" @click="$emit('chooseWork')">
          Choose workspace
        </button>
      </div>

      <template v-else>
        <div class="sticky top-0 z-10 -mx-5 mb-3 border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur" data-testid="mobile-files-sticky-context">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{{ deepSearch ? 'Workspace-wide search' : 'Current folder' }}</p>
          <p class="mt-1 break-words text-sm font-semibold text-slate-900">{{ currentFolderLabel }}</p>
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
        </div>

        <div v-if="visibleChildren.length" class="space-y-2" data-testid="mobile-files-list">
          <button
            v-for="node in visibleChildren"
            :key="node.id || node.path || node.name"
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            @click="openNode(node)"
          >
            <span class="text-xl">{{ node.is_file ? '📄' : '📁' }}</span>
            <span class="min-w-0 flex-1">
              <span class="block break-words font-semibold text-slate-950">{{ node.name }}</span>
              <span class="block break-words text-sm text-slate-500">{{ node.path || (node.is_file ? 'File' : 'Folder') }}</span>
            </span>
          </button>
        </div>
        <div v-else class="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500" data-testid="mobile-files-empty">
          No files match this view.
        </div>
      </template>
    </div>

    <MobileFileViewer
      v-if="previewNode && activeWorkspace"
      :node="previewNode"
      :workspace-id="activeWorkspace.workspaceId"
      :context="context"
      @close="previewNode = null"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import MobileFileViewer from '~/components/mobile/MobileFileViewer.vue';
import { useMobileFileContextCoordinator } from '~/composables/mobile/useMobileFileContextCoordinator';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useWorkspaceStore, type WorkspaceInfo } from '~/stores/workspace';
import type { MobileWorkContext } from '~/types/mobileWork';

type MobileFileNode = {
  name: string;
  path: string;
  is_file: boolean;
  children: MobileFileNode[];
  id: string;
};

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

defineEmits<{
  chooseWork: [];
}>();

const workspaceStore = useWorkspaceStore();
const fileExplorerStore = useFileExplorerStore();
const { getVisibleContextAttachments } = useMobileFileContextCoordinator();
const search = ref('');
const folderStack = ref<MobileFileNode[]>([]);
const previewNode = ref<MobileFileNode | null>(null);
const lastAttachmentCount = ref(0);
const deepSearch = ref(false);
const activeDiscoveryFilter = ref<'all' | 'recent' | 'attached' | 'markdown-code'>('all');

const workspaceRootFromContext = computed(() => {
  if (props.context?.kind === 'agent-run' || props.context?.kind === 'team-run') {
    return props.context.workspaceRootPath;
  }
  if (props.context?.kind === 'workspace') {
    return props.context.rootPath;
  }
  return '';
});
const workspaceByContextRoot = computed(() => {
  const root = workspaceRootFromContext.value.trim();
  if (!root) return null;
  return workspaceStore.allWorkspaces.find((workspace) => {
    const candidate = workspace.absolutePath || workspace.workspaceConfig?.root_path || workspace.workspaceConfig?.rootPath || '';
    return candidate === root;
  }) ?? null;
});
const activeWorkspace = computed<WorkspaceInfo | null>(() => {
  if (props.context?.kind === 'workspace') {
    return workspaceStore.workspaces[props.context.workspaceId] ?? workspaceByContextRoot.value;
  }
  return workspaceByContextRoot.value ?? workspaceStore.activeWorkspace ?? workspaceStore.allWorkspaces[0] ?? null;
});
const workspaceTitle = computed(() => activeWorkspace.value?.name || props.context?.title || 'Workspace files');
const workspaceSubtitle = computed(() => activeWorkspace.value?.absolutePath || 'Select a workspace to browse files.');
const currentFolder = computed(() => folderStack.value.at(-1) ?? activeWorkspace.value?.fileExplorer ?? null);
const currentFolderLabel = computed(() => currentFolder.value?.path || currentFolder.value?.name || workspaceTitle.value);
const breadcrumb = computed(() => {
  const root = activeWorkspace.value?.fileExplorer;
  return root ? [root, ...folderStack.value.filter((node) => node !== root)] : [];
});
const allWorkspaceFiles = computed(() => activeWorkspace.value?.fileExplorer ? flattenFiles(activeWorkspace.value.fileExplorer) : []);
const recentFileNodes = computed<MobileFileNode[]>(() => {
  const workspaceId = activeWorkspace.value?.workspaceId;
  if (!workspaceId) return [];
  return (fileExplorerStore._getWorkspaceState(workspaceId)?.openFiles ?? [])
    .slice(-8)
    .reverse()
    .map((file) => ({
      id: file.path,
      name: file.path.split(/[\\/]/).pop() || file.path,
      path: file.path,
      is_file: true,
      children: [],
    }));
});
const attachedFileNodes = computed<MobileFileNode[]>(() => getVisibleContextAttachments(props.context)
  .filter((attachment) => attachment.kind === 'workspace_path')
  .map((attachment) => ({
    id: attachment.id,
    name: attachment.displayName,
    path: attachment.locator,
    is_file: true,
    children: [],
  })));
const sourceNodes = computed<MobileFileNode[]>(() => {
  if (activeDiscoveryFilter.value === 'attached') {
    return attachedFileNodes.value;
  }
  if (activeDiscoveryFilter.value === 'recent') {
    return recentFileNodes.value;
  }
  if (deepSearch.value) {
    return allWorkspaceFiles.value;
  }
  return currentFolder.value?.children ?? [];
});
const visibleChildren = computed<MobileFileNode[]>(() => {
  const query = search.value.trim().toLowerCase();
  let children = sourceNodes.value;
  if (activeDiscoveryFilter.value === 'markdown-code') {
    children = children.filter((child) => child.is_file && isMarkdownOrCodePath(child.path || child.name));
  }
  if (!query) return children;
  return children.filter((child) => `${child.name} ${child.path}`.toLowerCase().includes(query));
});
const discoveryFilters = computed(() => [
  { id: 'all' as const, label: deepSearch.value ? 'All files' : 'Folder', count: deepSearch.value ? allWorkspaceFiles.value.length : (currentFolder.value?.children ?? []).length },
  { id: 'recent' as const, label: 'Recent', count: recentFileNodes.value.length },
  { id: 'attached' as const, label: 'Attached', count: attachedFileNodes.value.length },
  { id: 'markdown-code' as const, label: 'Markdown/code', count: sourceNodes.value.filter((child) => child.is_file && isMarkdownOrCodePath(child.path || child.name)).length },
]);
const searchPlaceholder = computed(() => deepSearch.value
  ? 'Deep search workspace files'
  : 'Filter current folder');
const attachNotice = computed(() => {
  const count = getVisibleContextAttachments(props.context).length;
  if (count <= lastAttachmentCount.value) return null;
  const targetLabel = props.context?.kind === 'agent-run' || props.context?.kind === 'team-run'
    ? 'Chat context'
    : 'the next mobile run launch';
  return `${count} file${count === 1 ? '' : 's'} attached to ${targetLabel}.`;
});

function openNode(node: MobileFileNode): void {
  if (node.is_file) {
    lastAttachmentCount.value = getVisibleContextAttachments(props.context).length;
    previewNode.value = node;
    return;
  }
  folderStack.value = [...folderStack.value, node];
}

function openCrumb(index: number): void {
  if (index <= 0) {
    folderStack.value = [];
    return;
  }
  folderStack.value = folderStack.value.slice(0, index);
}

function flattenFiles(node: MobileFileNode): MobileFileNode[] {
  const children = node.children ?? [];
  return children.flatMap((child) => child.is_file ? [child] : flattenFiles(child));
}

function isMarkdownOrCodePath(path: string): boolean {
  return /\.(c|cc|cpp|cs|css|go|h|hpp|html|java|js|json|jsx|kt|less|log|lua|md|mjs|php|py|rb|rs|sass|scss|sh|sql|swift|toml|ts|tsx|txt|vue|xml|ya?ml)$/i.test(path);
}

watch(() => activeWorkspace.value?.workspaceId, () => {
  folderStack.value = [];
  previewNode.value = null;
  deepSearch.value = false;
  activeDiscoveryFilter.value = 'all';
});
</script>
