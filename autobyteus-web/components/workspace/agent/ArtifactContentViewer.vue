<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Header / Meta Info -->
    <div v-if="artifact" class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0 min-h-[45px]">
         <!-- Breadcrumb style path display -->
         <div class="flex items-center text-sm text-gray-600 space-x-1 flex-1 min-w-0">
             <!-- Root/Workspace Icon -->
             <Icon icon="heroicons:folder-open" class="w-4 h-4 text-gray-400" />
             <!-- Separator -->
             <span class="text-gray-300">/</span>
             <!-- Path -->
             <span class="font-medium text-gray-800 truncate">{{ artifact.path }}</span>
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
}>();

const fileType = ref<'Text' | 'Image' | 'Audio' | 'Video' | 'Excel' | 'PDF'>('Text');
const viewMode = ref<FileOpenMode>('edit');
const isDeterminingType = ref(false);
const isFetchingContent = ref(false);
const fetchedContent = ref<string | null>(null);
const resolvedUrl = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const isDeleted = ref(false);
let fetchToken = 0;

const agentContextsStore = useAgentContextsStore();
const workspaceStore = useWorkspaceStore();
const windowNodeContextStore = useWindowNodeContextStore();

const isLoading = computed(() => isDeterminingType.value || isFetchingContent.value);
const usesBufferedWriteContent = computed(() => {
  return props.artifact?.sourceTool === 'write_file' && props.artifact?.status !== 'available';
});

const artifactUrl = computed(() => {
  if (!props.artifact) return null;
  const normalize = (value: string) => value.replace(/\\/g, '/');

  const workspaceIdFromRoot = (() => {
    if (!props.artifact?.workspaceRoot) return null;
    const targetRoot = normalize(props.artifact.workspaceRoot).replace(/\/$/, '');
    for (const workspace of Object.values(workspaceStore.workspaces)) {
      if (!workspace.absolutePath) continue;
      const workspaceRoot = normalize(workspace.absolutePath).replace(/\/$/, '');
      if (workspaceRoot === targetRoot) {
        return workspace.workspaceId;
      }
    }
    return null;
  })();

  const context = agentContextsStore.getRun(props.artifact.runId);
  const fallbackWorkspaceId = context?.config.workspaceId || null;
  const workspaceId = workspaceIdFromRoot || fallbackWorkspaceId;
  if (!workspaceId) return null;
  const workspace = workspaceStore.workspaces[workspaceId];
  if (!workspace) return null;

  const basePath = workspace.absolutePath ? normalize(workspace.absolutePath).replace(/\/$/, '') : null;
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
    fetchedContent.value = artifact.content ?? '';
    isFetchingContent.value = false;
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

watch(() => [props.artifact?.updatedAt, artifactUrl.value, fileType.value], () => {
  refreshResolvedContent();
});

</script>
