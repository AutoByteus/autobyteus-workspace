<template>
  <Teleport to="body" :disabled="!isZenMode">
    <div
      data-testid="artifact-content-viewer-shell"
      class="flex min-h-0 flex-col bg-white"
      :class="isZenMode ? 'fixed inset-0 z-[120] min-h-screen shadow-md' : 'h-full'"
    >
      <div v-if="artifact" class="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3 min-h-[45px] flex-shrink-0">
        <div class="flex items-center text-sm text-gray-600 flex-1 min-w-0">
          <span data-testid="artifact-path-display" class="font-medium text-gray-800 truncate">{{ displayPath }}</span>
        </div>

        <div v-if="supportsPreview && !isDeleted" class="flex items-center gap-1 border-l border-gray-200 pl-2 ml-2">
          <button
            class="p-1.5 rounded-md transition-all duration-200 focus:outline-none"
            :class="viewMode === 'edit' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'"
            @click="viewMode = 'edit'"
            :title="$t('workspace.components.workspace.agent.ArtifactContentViewer.edit_mode')"
          >
            <Icon icon="heroicons:pencil-square" class="h-4 w-4" />
          </button>
          <button
            class="p-1.5 rounded-md transition-all duration-200 focus:outline-none"
            :class="viewMode === 'preview' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'"
            @click="viewMode = 'preview'"
            :title="$t('workspace.components.workspace.agent.ArtifactContentViewer.preview_mode')"
          >
            <Icon icon="heroicons:eye" class="h-4 w-4" />
          </button>
        </div>

        <div class="flex items-center gap-1 border-l border-gray-200 pl-2 ml-2">
          <button
            data-testid="artifact-viewer-zen-toggle"
            class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200 focus:outline-none"
            @click="toggleZenMode"
            :title="isZenMode ? 'Restore view' : 'Maximize view'"
          >
            <Icon
              :icon="isZenMode ? 'heroicons:arrows-pointing-in' : 'heroicons:arrows-pointing-out'"
              class="h-4 w-4"
            />
          </button>
        </div>
      </div>

      <div v-if="!artifact" class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
        <Icon icon="heroicons:cursor-arrow-rays" class="w-16 h-16 mb-4 text-gray-300" />
        <h3 class="text-lg font-medium text-gray-500 mb-1">{{ $t('workspace.components.workspace.agent.ArtifactContentViewer.no_artifact_selected') }}</h3>
        <p class="text-sm">{{ $t('workspace.components.workspace.agent.ArtifactContentViewer.select_an_artifact_to_view_its') }}</p>
      </div>

      <div v-else class="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <div v-if="isLoading" class="flex-1 flex items-center justify-center text-gray-400">{{ $t('workspace.components.workspace.agent.ArtifactContentViewer.loading_content') }}</div>

        <div v-else-if="isDeleted" class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
          <Icon icon="heroicons:trash" class="w-16 h-16 mb-4 text-gray-300" />
          <h3 class="text-lg font-medium text-gray-500 mb-1">{{ $t('workspace.components.workspace.agent.ArtifactContentViewer.file_not_found') }}</h3>
          <p class="text-sm text-center max-w-sm">{{ $t('workspace.components.workspace.agent.ArtifactContentViewer.this_file_has_been_deleted_from') }}</p>
        </div>

        <div v-else-if="pendingMessage" class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
          <Icon icon="heroicons:clock" class="w-16 h-16 mb-4 text-gray-300" />
          <h3 class="text-lg font-medium text-gray-500 mb-1">
            {{ t('workspace.components.workspace.agent.ArtifactContentViewer.content_not_available_yet') }}
          </h3>
          <p class="text-sm text-center max-w-sm">
            {{ pendingMessage }}
          </p>
        </div>

        <FileViewer
          v-else
          :file="{
            path: artifact.path,
            type: fileType,
            content: displayContent,
            url: displayUrl,
          }"
          :mode="viewMode"
          :read-only="true"
          :error="errorMessage"
          class="h-full w-full"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, Teleport, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { Icon } from '@iconify/vue';
import type { FileDataType, FileOpenMode } from '~/stores/fileExplorer';
import type { ArtifactViewerItem } from './artifactViewerItem';
import { useLocalization } from '~/composables/useLocalization';
import { useArtifactContentDisplayModeStore } from '~/stores/artifactContentDisplayMode';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { determineFileType } from '~/utils/fileExplorer/fileUtils';
import FileViewer from '~/components/fileExplorer/FileViewer.vue';

const props = defineProps<{
  artifact: ArtifactViewerItem | null;
  refreshSignal?: number;
}>();

const artifactContentDisplayModeStore = useArtifactContentDisplayModeStore();
const { isZenMode } = storeToRefs(artifactContentDisplayModeStore);
const windowNodeContextStore = useWindowNodeContextStore();
const { t } = useLocalization();

const fileType = ref<FileDataType>('Text');
const viewMode = ref<FileOpenMode>('edit');
const isDeterminingType = ref(false);
const isFetchingContent = ref(false);
const fetchedContent = ref<string | null>(null);
const resolvedUrl = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const isDeleted = ref(false);
const pendingMessage = ref<string | null>(null);
const activeObjectUrl = ref<string | null>(null);
let fetchToken = 0;

const toggleZenMode = () => artifactContentDisplayModeStore.toggleZenMode();
const isLoading = computed(() => isDeterminingType.value || isFetchingContent.value);
const usesBufferedWriteContent = computed(() => {
  return (
    props.artifact?.kind === 'agent'
    && props.artifact.sourceTool === 'write_file'
    && (props.artifact?.status === 'streaming' || props.artifact?.status === 'pending')
    && Object.prototype.hasOwnProperty.call(props.artifact, 'content')
  );
});
const normalizedArtifactPath = computed(() => props.artifact?.path?.replace(/\\/g, '/') ?? '');
const displayPath = computed(() => normalizedArtifactPath.value || props.artifact?.path || '');
const artifactContentUrl = computed(() => {
  const artifact = props.artifact;
  if (!artifact || !artifact.path) return null;
  const restBaseUrl = windowNodeContextStore.getBoundEndpoints().rest.replace(/\/$/, '');
  if (artifact.kind === 'message_reference') {
    return `${restBaseUrl}/team-runs/${encodeURIComponent(artifact.teamRunId)}/message-file-references/${encodeURIComponent(artifact.referenceId)}/content`;
  }
  if (!artifact.runId) return null;
  return `${restBaseUrl}/runs/${encodeURIComponent(artifact.runId)}/file-change-content?path=${encodeURIComponent(displayPath.value)}`;
});
const displayContent = computed(() => {
  if (!props.artifact) return null;
  if (usesBufferedWriteContent.value) {
    return props.artifact.content ?? '';
  }
  return fileType.value === 'Text' ? (fetchedContent.value ?? '') : null;
});
const displayUrl = computed(() => {
  if (!props.artifact || fileType.value === 'Text') {
    return null;
  }
  return resolvedUrl.value;
});
const supportsPreview = computed(() => {
  if (fileType.value !== 'Text') return false;
  const path = props.artifact?.path?.toLowerCase() ?? '';
  return path.endsWith('.md') || path.endsWith('.markdown') || path.endsWith('.html') || path.endsWith('.htm');
});

const mapArtifactTypeToFileType = (artifact: ArtifactViewerItem | null): FileDataType | null => {
  switch (artifact?.type) {
    case 'image':
      return 'Image';
    case 'audio':
      return 'Audio';
    case 'video':
      return 'Video';
    case 'pdf':
      return 'PDF';
    case 'csv':
    case 'excel':
      return 'Excel';
    default:
      return null;
  }
};

const clearResolvedObjectUrl = () => {
  if (activeObjectUrl.value) {
    URL.revokeObjectURL(activeObjectUrl.value);
    activeObjectUrl.value = null;
  }
};

const resetResolvedState = () => {
  clearResolvedObjectUrl();
  fetchedContent.value = null;
  resolvedUrl.value = null;
  errorMessage.value = null;
  isDeleted.value = false;
  pendingMessage.value = null;
};

const updateFileType = async () => {
  const mappedType = mapArtifactTypeToFileType(props.artifact);
  if (mappedType) {
    fileType.value = mappedType;
    return;
  }

  if (!props.artifact) {
    fileType.value = 'Text';
    return;
  }

  isDeterminingType.value = true;
  try {
    fileType.value = await determineFileType(props.artifact.path);
  } finally {
    isDeterminingType.value = false;
  }
};

const refreshResolvedContent = async () => {
  const artifact = props.artifact;
  resetResolvedState();

  if (!artifact) {
    isFetchingContent.value = false;
    return;
  }

  if (usesBufferedWriteContent.value) {
    isFetchingContent.value = false;
    return;
  }

  if (artifact.kind === 'agent' && artifact.status === 'failed') {
    errorMessage.value = t('workspace.components.workspace.agent.ArtifactContentViewer.failed_before_final_content_could_be_captured');
    isFetchingContent.value = false;
    return;
  }

  if (artifact.kind === 'agent' && artifact.status !== 'available') {
    pendingMessage.value = t('workspace.components.workspace.agent.ArtifactContentViewer.file_change_will_become_viewable_after_the_edit_completes');
    isFetchingContent.value = false;
    return;
  }

  const fetchUrl = artifactContentUrl.value;
  if (!fetchUrl) {
    isFetchingContent.value = false;
    return;
  }

  const currentToken = ++fetchToken;
  isFetchingContent.value = true;
  try {
    const response = await fetch(fetchUrl, { cache: 'no-store' });

    if (response.status === 404) {
      if (currentToken !== fetchToken) return;
      isDeleted.value = true;
      return;
    }

    if (response.status === 409) {
      if (currentToken !== fetchToken) return;
      pendingMessage.value = t('workspace.components.workspace.agent.ArtifactContentViewer.file_change_is_still_pending_server_side_capture');
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch content (${response.status})`);
    }

    if (fileType.value === 'Text') {
      const text = await response.text();
      if (currentToken !== fetchToken) return;
      fetchedContent.value = text;
      return;
    }

    const blob = await response.blob();
    if (currentToken !== fetchToken) return;
    const objectUrl = URL.createObjectURL(blob);
    activeObjectUrl.value = objectUrl;
    resolvedUrl.value = objectUrl;
  } catch (error) {
    if (currentToken !== fetchToken) return;
    errorMessage.value = error instanceof Error
      ? error.message
      : t('workspace.components.workspace.agent.ArtifactContentViewer.failed_to_fetch_artifact_content');
  } finally {
    if (currentToken === fetchToken) {
      isFetchingContent.value = false;
    }
  }
};

const syncArtifactView = async () => {
  if (!props.artifact) {
    artifactContentDisplayModeStore.exitZenMode();
    resetResolvedState();
    return;
  }

  await updateFileType();
  viewMode.value = supportsPreview.value && !usesBufferedWriteContent.value ? 'preview' : 'edit';
  await refreshResolvedContent();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isZenMode.value) {
    artifactContentDisplayModeStore.exitZenMode();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  artifactContentDisplayModeStore.exitZenMode();
  clearResolvedObjectUrl();
});

watch(
  () => [props.artifact?.itemId, props.artifact?.path, props.artifact?.type, props.artifact?.kind, props.artifact?.status, props.artifact?.updatedAt, props.refreshSignal ?? 0],
  () => {
    void syncArtifactView();
  },
  { immediate: true },
);
</script>
