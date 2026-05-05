<template>
  <Teleport to="body" :disabled="!isMaximized">
    <div
      data-test="team-reference-viewer-shell"
      class="flex min-h-0 flex-col overflow-hidden bg-white"
      :class="isMaximized ? 'fixed inset-0 z-[120] min-h-screen shadow-md' : 'h-full'"
    >
      <div class="flex min-h-[45px] flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-3 py-2">
        <div class="min-w-0">
          <div class="truncate text-xs font-semibold text-gray-800">{{ fileName }}</div>
          <div class="truncate text-[0.6875rem] text-gray-500">{{ reference.path }}</div>
        </div>

        <div class="ml-2 flex items-center gap-1">
          <div v-if="supportsPreview && !isDeleted" class="flex items-center gap-1 border-l border-gray-200 pl-2">
            <button
              class="rounded-md p-1.5 transition-all duration-200 focus:outline-none"
              :class="viewMode === 'edit' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'"
              :title="$t('workspace.components.workspace.team.TeamCommunicationPanel.raw')"
              @click="viewMode = 'edit'"
            >
              <Icon icon="heroicons:pencil-square" class="h-4 w-4" />
            </button>
            <button
              class="rounded-md p-1.5 transition-all duration-200 focus:outline-none"
              :class="viewMode === 'preview' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'"
              :title="$t('workspace.components.workspace.team.TeamCommunicationPanel.preview')"
              @click="viewMode = 'preview'"
            >
              <Icon icon="heroicons:eye" class="h-4 w-4" />
            </button>
          </div>

          <div class="flex items-center gap-1 border-l border-gray-200 pl-2">
            <button
              data-test="team-reference-viewer-maximize-toggle"
              class="rounded-md p-1.5 text-gray-400 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 focus:outline-none"
              :title="isMaximized ? $t('workspace.components.workspace.team.TeamCommunicationPanel.restore_view') : $t('workspace.components.workspace.team.TeamCommunicationPanel.maximize_view')"
              @click="toggleMaximized"
            >
              <Icon
                :icon="isMaximized ? 'heroicons:arrows-pointing-in' : 'heroicons:arrows-pointing-out'"
                class="h-4 w-4"
              />
            </button>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="flex flex-1 items-center justify-center text-xs text-gray-400">
        {{ $t('workspace.components.workspace.team.TeamCommunicationPanel.loading_reference') }}
      </div>
      <div v-else-if="isDeleted" class="flex flex-1 flex-col items-center justify-center p-4 text-center text-gray-400">
        <Icon icon="heroicons:trash" class="mb-2 h-8 w-8 text-gray-300" />
        <p class="text-sm font-medium text-gray-500">{{ $t('workspace.components.workspace.team.TeamCommunicationPanel.reference_unavailable') }}</p>
        <p class="mt-1 text-xs">{{ $t('workspace.components.workspace.team.TeamCommunicationPanel.reference_unavailable_detail') }}</p>
      </div>
      <FileViewer
        v-else
        :file="{
          path: reference.path,
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
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import type { FileDataType, FileOpenMode } from '~/stores/fileExplorer';
import type { TeamCommunicationReferenceFile } from '~/stores/teamCommunicationStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { determineFileType } from '~/utils/fileExplorer/fileUtils';
import FileViewer from '~/components/fileExplorer/FileViewer.vue';

const props = defineProps<{
  teamRunId: string;
  messageId: string;
  reference: TeamCommunicationReferenceFile;
  refreshSignal?: number;
}>();

const windowNodeContextStore = useWindowNodeContextStore();
const fileType = ref<FileDataType>('Text');
const viewMode = ref<FileOpenMode>('edit');
const isMaximized = ref(false);
const isDeterminingType = ref(false);
const isFetchingContent = ref(false);
const fetchedContent = ref<string | null>(null);
const resolvedUrl = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const isDeleted = ref(false);
const activeObjectUrl = ref<string | null>(null);
let fetchToken = 0;

const fileName = computed(() => props.reference.path.split('/').pop() || props.reference.path);
const isLoading = computed(() => isDeterminingType.value || isFetchingContent.value);
const supportsPreview = computed(() => {
  if (fileType.value !== 'Text') return false;
  const lower = props.reference.path.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.html') || lower.endsWith('.htm');
});
const contentUrl = computed(() => {
  const restBaseUrl = windowNodeContextStore.getBoundEndpoints().rest.replace(/\/$/, '');
  return `${restBaseUrl}/team-runs/${encodeURIComponent(props.teamRunId)}/team-communication/messages/${encodeURIComponent(props.messageId)}/references/${encodeURIComponent(props.reference.referenceId)}/content`;
});
const displayContent = computed(() => fileType.value === 'Text' ? (fetchedContent.value ?? '') : null);
const displayUrl = computed(() => fileType.value === 'Text' ? null : resolvedUrl.value);

const toggleMaximized = () => {
  isMaximized.value = !isMaximized.value;
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
};

const mapReferenceTypeToFileType = (): FileDataType | null => {
  switch (props.reference.type) {
    case 'image': return 'Image';
    case 'audio': return 'Audio';
    case 'video': return 'Video';
    case 'pdf': return 'PDF';
    case 'csv':
    case 'excel': return 'Excel';
    default: return null;
  }
};

const updateFileType = async () => {
  const mapped = mapReferenceTypeToFileType();
  if (mapped) {
    fileType.value = mapped;
    return;
  }
  isDeterminingType.value = true;
  try {
    fileType.value = await determineFileType(props.reference.path);
  } finally {
    isDeterminingType.value = false;
  }
};

const fetchContent = async () => {
  resetResolvedState();
  const currentToken = ++fetchToken;
  isFetchingContent.value = true;
  try {
    const response = await fetch(contentUrl.value, { cache: 'no-store' });
    if (response.status === 404) {
      if (currentToken !== fetchToken) return;
      isDeleted.value = true;
      return;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch reference content (${response.status})`);
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
    errorMessage.value = error instanceof Error ? error.message : 'Failed to fetch reference content';
  } finally {
    if (currentToken === fetchToken) {
      isFetchingContent.value = false;
    }
  }
};

const syncReferenceView = async () => {
  await updateFileType();
  viewMode.value = supportsPreview.value ? 'preview' : 'edit';
  await fetchContent();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isMaximized.value) {
    isMaximized.value = false;
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  isMaximized.value = false;
  clearResolvedObjectUrl();
});

watch(
  () => [props.teamRunId, props.messageId, props.reference.referenceId, props.reference.path, props.reference.type, props.reference.updatedAt, props.refreshSignal ?? 0],
  () => { void syncReferenceView(); },
  { immediate: true },
);
</script>
