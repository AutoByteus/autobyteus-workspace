<template>
  <section
    class="flex h-full flex-col overflow-hidden"
    data-testid="mobile-files"
  >
    <header class="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
      <h2 class="text-xl font-bold text-slate-950">{{ workspaceTitle }}</h2>
      <p class="mt-1 truncate text-sm text-slate-500">
        {{ workspaceSubtitle }}
      </p>
      <div
        class="mt-3 flex items-center gap-2"
        data-testid="mobile-files-primary-controls"
      >
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
      <div
        v-if="showFilters"
        class="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3"
        data-testid="mobile-files-advanced-filters"
      >
        <button
          v-for="filter in discoveryFilters"
          :key="filter.id"
          type="button"
          class="rounded-full px-3 py-1.5 text-xs font-bold"
          :class="
            activeDiscoveryFilter === filter.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600'
          "
          :data-testid="`mobile-files-filter-${filter.id}`"
          @click="activeDiscoveryFilter = filter.id"
        >
          {{ filter.label }} · {{ filter.count }}
        </button>
        <button
          type="button"
          class="col-span-2 rounded-full px-3 py-1.5 text-xs font-bold"
          :class="
            deepSearch ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'
          "
          data-testid="mobile-files-deep-search"
          @click="deepSearch = !deepSearch"
        >
          {{ deepSearch ? "Deep search on" : "Deep search workspace" }}
        </button>
      </div>
      <p
        v-if="attachNotice"
        class="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800"
        data-testid="mobile-files-attach-notice"
      >
        {{ attachNotice }}
      </p>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-5">
      <div
        v-if="activationError"
        class="rounded-3xl border border-red-200 bg-red-50 p-6 text-center"
        data-testid="mobile-files-activation-error"
      >
        <p class="font-semibold text-red-900">Unable to load workspace files</p>
        <p class="mt-2 break-words text-sm text-red-700">
          {{ activationError }}
        </p>
        <button
          type="button"
          class="mt-4 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white"
          @click="activateFileExplorer"
        >
          Retry
        </button>
      </div>

      <div
        v-else-if="isActivatingWorkspace"
        class="rounded-3xl border border-slate-200 p-6 text-center"
        data-testid="mobile-files-loading"
      >
        <p class="font-semibold text-slate-900">Loading workspace files…</p>
      </div>

      <div
        v-else-if="!activeWorkspaceId"
        class="rounded-3xl border border-dashed border-slate-300 p-6 text-center"
        data-testid="mobile-files-no-workspace"
      >
        <p class="font-semibold text-slate-900">Choose a workspace</p>
        <p class="mt-2 text-sm text-slate-500">
          Files stay focused on one workspace at a time.
        </p>
        <button
          type="button"
          class="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
          @click="$emit('chooseWork')"
        >
          Choose workspace
        </button>
      </div>

      <template v-else>
        <div
          class="sticky top-0 z-10 -mx-5 mb-3 border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur"
          data-testid="mobile-files-sticky-context"
        >
          <p class="break-words text-sm font-semibold text-slate-900">
            {{ currentFolderLabel }}
          </p>
          <div
            v-if="breadcrumb.length > 1"
            class="mt-2 flex flex-wrap gap-2 text-sm"
          >
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

        <div
          v-if="visibleChildren.length"
          class="space-y-2"
          data-testid="mobile-files-list"
        >
          <button
            v-for="node in visibleChildren"
            :key="node.id || node.path || node.name"
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            @click="openNode(node)"
          >
            <span class="text-xl">{{ node.is_file ? "📄" : "📁" }}</span>
            <span class="min-w-0 flex-1">
              <span class="block break-words font-semibold text-slate-950">{{
                node.name
              }}</span>
              <span class="block break-words text-sm text-slate-500">{{
                node.path || (node.is_file ? "File" : "Folder")
              }}</span>
            </span>
          </button>
        </div>
        <div
          v-else
          class="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"
          data-testid="mobile-files-empty"
        >
          No files match this view.
        </div>
      </template>
    </div>

    <MobileFileViewer
      v-if="previewNode && activeWorkspaceId"
      :node="previewNode"
      :workspace-id="activeWorkspaceId"
      :context="context"
      @close="previewNode = null"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import MobileFileViewer from "~/components/mobile/MobileFileViewer.vue";
import { useMobileFileContextCoordinator } from "~/composables/mobile/useMobileFileContextCoordinator";
import { useWorkspaceFileExplorer } from "~/composables/useWorkspaceFileExplorer";
import { useFileExplorerStore } from "~/stores/fileExplorer";
import { useWorkspaceStore } from "~/stores/workspace";
import type { MobileWorkContext } from "~/types/mobileWork";
import type { WorkspaceMetadata } from "~/types/workspace/WorkspaceMetadata";
import {
  createWorkspaceMetadata,
  normalizeWorkspaceRootPath,
} from "~/utils/workspaceMetadata";

type MobileFileNode = {
  name: string;
  path: string;
  is_file: boolean;
  children: MobileFileNode[];
  id: string;
  childrenLoaded?: boolean;
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
const search = ref("");
const folderStack = ref<MobileFileNode[]>([]);
const previewNode = ref<MobileFileNode | null>(null);
const lastAttachmentCount = ref(0);
const deepSearch = ref(false);
const showFilters = ref(false);
const activeDiscoveryFilter = ref<
  "all" | "recent" | "attached" | "markdown-code"
>("all");
const activeWorkspaceId = ref("");
const activeWorkspaceMetadata = ref<WorkspaceMetadata | null>(null);
const isActivatingWorkspace = ref(false);
const activationError = ref<string | null>(null);
const workspaceExplorer = useWorkspaceFileExplorer(activeWorkspaceId);
let activationSequence = 0;
let releaseLiveSession: (() => void) | null = null;
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const workspaceRootFromContext = computed(() => {
  if (
    props.context?.kind === "agent-run" ||
    props.context?.kind === "team-run"
  ) {
    return normalizeWorkspaceRootPath(props.context.workspaceRootPath);
  }
  if (props.context?.kind === "workspace") {
    return normalizeWorkspaceRootPath(props.context.rootPath);
  }
  return "";
});
const workspaceTitle = computed(
  () =>
    activeWorkspaceMetadata.value?.displayName ||
    props.context?.title ||
    "Workspace files",
);
const workspaceSubtitle = computed(
  () =>
    activeWorkspaceMetadata.value?.workspaceRootPath ||
    workspaceRootFromContext.value ||
    "Select a workspace to browse files.",
);
const rootFolder = computed<MobileFileNode | null>(
  () => workspaceExplorer.tree.value as MobileFileNode | null,
);
const currentFolder = computed(
  () => folderStack.value.at(-1) ?? rootFolder.value ?? null,
);
const currentFolderLabel = computed(
  () =>
    currentFolder.value?.path ||
    currentFolder.value?.name ||
    workspaceTitle.value,
);
const breadcrumb = computed(() => {
  const root = rootFolder.value;
  return root
    ? [root, ...folderStack.value.filter((node) => node !== root)]
    : [];
});
const allWorkspaceFiles = computed(() =>
  rootFolder.value ? flattenFiles(rootFolder.value) : [],
);
const recentFileNodes = computed<MobileFileNode[]>(() => {
  if (!activeWorkspaceId.value) return [];
  return (
    fileExplorerStore._getWorkspaceState(activeWorkspaceId.value)?.openFiles ??
    []
  )
    .slice(-8)
    .reverse()
    .map((file) => ({
      id: file.path,
      name: file.path.split(/[\\/]/).pop() || file.path,
      path: file.path,
      is_file: true,
      children: [],
      childrenLoaded: true,
    }));
});
const attachedFileNodes = computed<MobileFileNode[]>(() =>
  getVisibleContextAttachments(props.context)
    .filter((attachment) => attachment.kind === "workspace_path")
    .map((attachment) => ({
      id: attachment.id,
      name: attachment.displayName,
      path: attachment.locator,
      is_file: true,
      children: [],
      childrenLoaded: true,
    })),
);
const sourceNodes = computed<MobileFileNode[]>(() => {
  if (activeDiscoveryFilter.value === "attached")
    return attachedFileNodes.value;
  if (activeDiscoveryFilter.value === "recent") return recentFileNodes.value;
  if (deepSearch.value) {
    const query = search.value.trim();
    return query
      ? (workspaceExplorer.searchResults.value as MobileFileNode[])
      : allWorkspaceFiles.value;
  }
  return currentFolder.value?.children ?? [];
});
const visibleChildren = computed<MobileFileNode[]>(() => {
  const query = search.value.trim().toLowerCase();
  let children = sourceNodes.value;
  if (activeDiscoveryFilter.value === "markdown-code") {
    children = children.filter(
      (child) =>
        child.is_file && isMarkdownOrCodePath(child.path || child.name),
    );
  }
  if (!query || deepSearch.value) return children;
  return children.filter((child) =>
    `${child.name} ${child.path}`.toLowerCase().includes(query),
  );
});
const discoveryFilters = computed(() => [
  {
    id: "all" as const,
    label: deepSearch.value ? "All files" : "Folder",
    count: deepSearch.value
      ? allWorkspaceFiles.value.length
      : (currentFolder.value?.children ?? []).length,
  },
  {
    id: "recent" as const,
    label: "Recent",
    count: recentFileNodes.value.length,
  },
  {
    id: "attached" as const,
    label: "Attached",
    count: attachedFileNodes.value.length,
  },
  {
    id: "markdown-code" as const,
    label: "Markdown/code",
    count: sourceNodes.value.filter(
      (child) =>
        child.is_file && isMarkdownOrCodePath(child.path || child.name),
    ).length,
  },
]);
const searchPlaceholder = computed(() =>
  deepSearch.value ? "Deep search workspace files" : "Filter current folder",
);
const attachNotice = computed(() => {
  const count = getVisibleContextAttachments(props.context).length;
  if (count <= lastAttachmentCount.value) return null;
  const targetLabel =
    props.context?.kind === "agent-run" || props.context?.kind === "team-run"
      ? "Chat context"
      : "the next mobile run launch";
  return `${count} file${count === 1 ? "" : "s"} attached to ${targetLabel}.`;
});

const releaseCurrentLiveSession = () => {
  releaseLiveSession?.();
  releaseLiveSession = null;
};

const formatActivationError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const resolveContextWorkspaceMetadata =
  async (): Promise<WorkspaceMetadata | null> => {
    const rootPath = workspaceRootFromContext.value;
    if (!rootPath) return null;
    if (props.context?.kind === "workspace") {
      return createWorkspaceMetadata({
        workspaceId: props.context.workspaceId,
        workspaceRootPath: rootPath,
        displayName: props.context.title,
      });
    }
    return workspaceStore.resolveWorkspaceMetadataByRootPath(rootPath);
  };

async function activateFileExplorer(): Promise<void> {
  const sequence = ++activationSequence;
  activationError.value = null;
  const metadata = await resolveContextWorkspaceMetadata().catch((error) => {
    if (sequence === activationSequence) {
      activationError.value = formatActivationError(error);
    }
    return null;
  });
  if (sequence !== activationSequence) return;
  activeWorkspaceMetadata.value = metadata;
  if (!metadata) {
    activeWorkspaceId.value = "";
    isActivatingWorkspace.value = false;
    return;
  }

  isActivatingWorkspace.value = true;
  try {
    const workspace = await workspaceStore.ensureWorkspaceMetadata(metadata);
    if (sequence !== activationSequence) return;
    activeWorkspaceId.value = workspace.workspaceId;
    activeWorkspaceMetadata.value =
      workspaceStore.registerWorkspaceInfoMetadata(workspace) || metadata;
    await fileExplorerStore.fetchFolderChildren(workspace.workspaceId, "");
  } catch (error) {
    if (sequence === activationSequence) {
      activeWorkspaceId.value = "";
      activeWorkspaceMetadata.value = metadata;
      activationError.value = formatActivationError(error);
    }
  } finally {
    if (sequence === activationSequence) {
      isActivatingWorkspace.value = false;
    }
  }
}

async function openNode(node: MobileFileNode): Promise<void> {
  if (node.is_file) {
    lastAttachmentCount.value = getVisibleContextAttachments(
      props.context,
    ).length;
    previewNode.value = node;
    return;
  }
  if (activeWorkspaceId.value && node.childrenLoaded === false) {
    await fileExplorerStore.fetchFolderChildren(
      activeWorkspaceId.value,
      node.path || "",
    );
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
  return children.flatMap((child) =>
    child.is_file ? [child] : flattenFiles(child),
  );
}

function isMarkdownOrCodePath(path: string): boolean {
  return /\.(c|cc|cpp|cs|css|go|h|hpp|html|java|js|json|jsx|kt|less|log|lua|md|mjs|php|py|rb|rs|sass|scss|sh|sql|swift|toml|ts|tsx|txt|vue|xml|ya?ml)$/i.test(
    path,
  );
}

watch(
  () =>
    `${props.context?.kind || ""}:${workspaceRootFromContext.value}:${props.context?.kind === "workspace" ? props.context.workspaceId : ""}`,
  () => {
    releaseCurrentLiveSession();
    activeWorkspaceId.value = "";
    activeWorkspaceMetadata.value = null;
    isActivatingWorkspace.value = false;
    folderStack.value = [];
    previewNode.value = null;
    deepSearch.value = false;
    activeDiscoveryFilter.value = "all";
    void activateFileExplorer();
  },
  { immediate: true },
);

watch(activeWorkspaceId, (workspaceId) => {
  releaseCurrentLiveSession();
  if (workspaceId) {
    releaseLiveSession = workspaceStore.acquireFileExplorerLiveSession(
      workspaceId,
      `mobile-files:${workspaceId}`,
    );
  }
});

watch(
  [search, deepSearch, activeWorkspaceId],
  ([nextSearch, nextDeepSearch, nextWorkspaceId]) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
    if (!nextDeepSearch || !nextSearch.trim() || !nextWorkspaceId) {
      return;
    }
    searchDebounceTimer = setTimeout(() => {
      workspaceExplorer.searchFiles(nextSearch.trim());
    }, 300);
  },
);

onBeforeUnmount(() => {
  ++activationSequence;
  releaseCurrentLiveSession();
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
});
</script>
