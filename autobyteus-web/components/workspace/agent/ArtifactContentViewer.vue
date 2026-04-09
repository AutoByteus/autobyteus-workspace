<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Header / Meta Info -->
    <div v-if="artifact" class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0 min-h-[45px]">
         <!-- Breadcrumb style path display -->
         <div class="flex items-center text-sm text-gray-600 flex-1 min-w-0">
             <!-- Path -->
             <span data-testid="artifact-path-display" class="font-medium text-gray-800 truncate">{{ displayPath }}</span>
         </div>

         <!-- Edit/Preview Toggle -->
         <div v-if="supportsPreview && !isDeleted" class="flex items-center gap-1 border-l border-gray-200 pl-2 ml-2">
           <button
             class="p-1.5 rounded-md transition-all duration-200 focus:outline-none"
             :class="viewMode === 'edit' 
               ? 'bg-blue-50 text-blue-600' 
               : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'"
             @click="viewMode = 'edit'"
             title="Edit Mode"
           >
             <Icon icon="heroicons:pencil-square" class="h-4 w-4" />
           </button>
           <button
             class="p-1.5 rounded-md transition-all duration-200 focus:outline-none"
             :class="viewMode === 'preview' 
               ? 'bg-blue-50 text-blue-600' 
               : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'"
             @click="viewMode = 'preview'"
             title="Preview Mode"
           >
             <Icon icon="heroicons:eye" class="h-4 w-4" />
           </button>
         </div>
    </div>

    <!-- Empty State -->
    <div v-if="!artifact" class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
         <Icon icon="heroicons:cursor-arrow-rays" class="w-16 h-16 mb-4 text-gray-300" />
         <h3 class="text-lg font-medium text-gray-500 mb-1">No artifact selected</h3>
         <p class="text-sm">Select an artifact to view its content.</p>
    </div>

    <div v-else class="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <div v-if="isLoading" class="flex-1 flex items-center justify-center text-gray-400">
            Loading content...
        </div>

        <div v-else-if="isDeleted" class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
             <Icon icon="heroicons:trash" class="w-16 h-16 mb-4 text-gray-300" />
             <h3 class="text-lg font-medium text-gray-500 mb-1">File not found</h3>
             <p class="text-sm text-center max-w-sm">
               This file has been deleted from the workspace or moved to a different location.
             </p>
        </div>
        
        <FileViewer
            v-else
            :file="{
                path: artifact.path,
                type: fileType,
                content: displayContent,
                url: displayUrl
            }"
            :mode="viewMode" 
            :read-only="true"
            :error="errorMessage"
            class="h-full w-full"
        />
        

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import type { AgentArtifact } from '~/stores/agentArtifactsStore';
import type { FileOpenMode } from '~/stores/fileExplorer';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { determineFileType } from '~/utils/fileExplorer/fileUtils';

// Import Viewers
import FileViewer from '~/components/fileExplorer/FileViewer.vue';

const props = defineProps<{
  artifact: AgentArtifact | null;
  refreshSignal?: number;
}>();

const fileType = ref<'Text' | 'Image' | 'Audio' | 'Video' | 'Excel' | 'PDF'>('Text');
const viewMode = ref<FileOpenMode>('edit');
const isDeterminingType = ref(false);
const isFetchingContent = ref(false);
const fetchedContent = ref<string | null>(null);
const resolvedUrl = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const isDeleted = ref(false);
const workspaceCatalogRefreshKey = ref<string | null>(null);
let fetchToken = 0;

const agentContextsStore = useAgentContextsStore();
const workspaceStore = useWorkspaceStore();
const windowNodeContextStore = useWindowNodeContextStore();

const isLoading = computed(() => isDeterminingType.value || isFetchingContent.value);
const usesBufferedWriteContent = computed(() => {
  return props.artifact?.sourceTool === 'write_file' && props.artifact?.status !== 'available';
});
const usesWorkspaceBackedEditContent = computed(() => props.artifact?.sourceTool === 'edit_file');
const normalizedArtifactPath = computed(() => props.artifact?.path?.replace(/\\/g, '/') ?? '');
const displayPath = computed(() => normalizedArtifactPath.value || props.artifact?.path || '');
const workspaceResolutionAttemptKey = computed(() => {
  if (!props.artifact) {
    return null;
  }
  return `${props.artifact.id}:${props.artifact.updatedAt}:${props.refreshSignal ?? 0}`;
});

const normalizeRootPath = (value: string | null | undefined): string | null => {
  const source = (value || '').trim();
  if (!source) {
    return null;
  }
  const normalized = source.replace(/\\/g, '/');
  if (normalized === '/') {
    return normalized;
  }
  return normalized.replace(/\/+$/, '');
};

const isAbsolutePath = (value: string): boolean => value.startsWith('/') || /^[A-Za-z]:\//.test(value);

const isPathWithinRoot = (candidatePath: string, rootPath: string): boolean =>
  candidatePath === rootPath || candidatePath.startsWith(`${rootPath}/`);

const getWorkspaceRootPath = (workspace: { absolutePath?: string | null; workspaceConfig?: Record<string, any> }): string | null =>
  normalizeRootPath(
    workspace.absolutePath
      || workspace.workspaceConfig?.root_path
      || workspace.workspaceConfig?.rootPath
      || null,
  );

const resolvedArtifactWorkspace = computed(() => {
  if (!props.artifact) {
    return null;
  }

  const workspaces = Object.values(workspaceStore.workspaces).map((workspace) => ({
    workspace,
    rootPath: getWorkspaceRootPath(workspace),
  }));
  const artifactPath = normalizedArtifactPath.value;
  const artifactWorkspaceRoot = normalizeRootPath(props.artifact.workspaceRoot);

  if (isAbsolutePath(artifactPath)) {
    const bestPrefixMatch = workspaces
      .filter(
        (candidate): candidate is { workspace: typeof candidate.workspace; rootPath: string } =>
          Boolean(candidate.rootPath) && isPathWithinRoot(artifactPath, candidate.rootPath),
      )
      .sort((left, right) => right.rootPath.length - left.rootPath.length)[0];

    if (bestPrefixMatch) {
      return bestPrefixMatch;
    }
  }

  if (artifactWorkspaceRoot) {
    const exactWorkspaceMatch = workspaces.find(({ rootPath }) => rootPath === artifactWorkspaceRoot);
    if (exactWorkspaceMatch) {
      return exactWorkspaceMatch;
    }
  }

  const context = agentContextsStore.getRun(props.artifact.runId);
  const fallbackWorkspaceId = context?.config.workspaceId || null;
  if (!fallbackWorkspaceId) {
    return null;
  }

  const fallbackWorkspace = workspaceStore.workspaces[fallbackWorkspaceId];
  if (!fallbackWorkspace) {
    return null;
  }

  return {
    workspace: fallbackWorkspace,
    rootPath: getWorkspaceRootPath(fallbackWorkspace),
  };
});

const artifactUrl = computed(() => {
  if (!props.artifact) return null;
  const normalize = (value: string) => value.replace(/\\/g, '/');
  const resolvedWorkspace = resolvedArtifactWorkspace.value;
  if (!resolvedWorkspace) return null;

  const workspaceId = resolvedWorkspace.workspace.workspaceId;
  const basePath = resolvedWorkspace.rootPath ? normalize(resolvedWorkspace.rootPath) : null;
  const artifactPath = normalize(props.artifact.path);

  let relativePath = artifactPath;
  if (basePath && artifactPath.startsWith(`${basePath}/`)) {
    relativePath = artifactPath.slice(basePath.length + 1);
  } else if (basePath && artifactPath === basePath) {
    relativePath = '';
  } else {
    const isAbsolute = artifactPath.startsWith('/') || /^[A-Za-z]:\//.test(artifactPath);
    if (isAbsolute) {
      return null;
    }
  }

  const restBaseUrl = windowNodeContextStore.getBoundEndpoints().rest.replace(/\/$/, '');
  return `${restBaseUrl}/workspaces/${workspaceId}/content?path=${encodeURIComponent(relativePath)}`;
});

const displayContent = computed(() => {
  if (!props.artifact) return null;
  if (usesBufferedWriteContent.value) {
    return props.artifact.content ?? '';
  }
  if (usesWorkspaceBackedEditContent.value) {
    return fetchedContent.value ?? '';
  }
  return fetchedContent.value ?? props.artifact.content ?? '';
});
const displayUrl = computed(() => {
  if (!props.artifact) return null;
  return resolvedUrl.value ?? props.artifact.url ?? artifactUrl.value ?? null;
});

const supportsPreview = computed(() => {
  if (fileType.value !== 'Text') return false;
  const path = props.artifact?.path?.toLowerCase() ?? '';
  // Check against supported preview extensions (Markdown, HTML)
  // This list should match what FileViewer supports for preview
  return path.endsWith('.md') || 
         path.endsWith('.markdown') || 
         path.endsWith('.html') || 
         path.endsWith('.htm');
});

const updateFileType = async () => {
    if (!props.artifact) return;
    isDeterminingType.value = true;
    try {
        fileType.value = await determineFileType(props.artifact.path);
    } finally {
        isDeterminingType.value = false;
    }
};

const refreshResolvedContent = async () => {
  const artifact = props.artifact;
  resolvedUrl.value = null;
  errorMessage.value = null;
  isDeleted.value = false;

  if (!artifact) {
    fetchedContent.value = null;
    isFetchingContent.value = false;
    return;
  }

  if (usesBufferedWriteContent.value) {
    fetchedContent.value = null;
    isFetchingContent.value = false;
    return;
  }

  if (fileType.value !== 'Text') {
    resolvedUrl.value = artifact.url || artifactUrl.value || null;
    isFetchingContent.value = false;
    return;
  }

  if (!artifactUrl.value) {
    fetchedContent.value = usesWorkspaceBackedEditContent.value ? null : (artifact.content ?? '');
    isFetchingContent.value = false;

    if (
      usesWorkspaceBackedEditContent.value &&
      isAbsolutePath(normalizedArtifactPath.value) &&
      !workspaceStore.workspacesFetched &&
      workspaceResolutionAttemptKey.value &&
      workspaceCatalogRefreshKey.value !== workspaceResolutionAttemptKey.value
    ) {
      workspaceCatalogRefreshKey.value = workspaceResolutionAttemptKey.value;
      try {
        await workspaceStore.fetchAllWorkspaces();
      } catch {
        // Leave edit_file blank when no workspace-backed path can be resolved.
      }
    }
    return;
  }

  const currentToken = ++fetchToken;
  isFetchingContent.value = true;
  try {
    const response = await fetch(artifactUrl.value, { cache: 'no-store' });
    
    if (response.status === 404) {
      if (currentToken !== fetchToken) return;
      isDeleted.value = true;
      fetchedContent.value = null;
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch content (${response.status})`);
    }
    const text = await response.text();
    if (currentToken !== fetchToken) return;
    fetchedContent.value = text;
  } catch (error) {
    if (currentToken !== fetchToken) return;
    errorMessage.value = error instanceof Error ? error.message : 'Failed to fetch artifact content';
  } finally {
    if (currentToken === fetchToken) {
      isFetchingContent.value = false;
    }
  }
};

watch(() => props.artifact, async () => {
  resolvedUrl.value = null;
  errorMessage.value = null;
  isDeleted.value = false; // Reset deleted state on change
  await updateFileType();
  
  // Default to preview mode for supported types ONLY when the artifact is persisted
  if (supportsPreview.value && !usesBufferedWriteContent.value) {
      viewMode.value = 'preview';
  } else {
      viewMode.value = 'edit';
  }
  
  await refreshResolvedContent();
}, { immediate: true });

watch(() => [props.artifact?.updatedAt, artifactUrl.value, fileType.value, props.refreshSignal ?? 0], () => {
  refreshResolvedContent();
});

</script>
