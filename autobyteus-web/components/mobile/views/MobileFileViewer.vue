<template>
  <!-- An opened file, full screen (TR-019, VIS-029): a 48px bar (← and the name) and the file; no Attach, no card. -->
  <section class="fixed inset-0 z-30 flex h-[100dvh] flex-col bg-white" data-testid="mobile-file-viewer">
    <MobileScreenBar :title="name" @back="$emit('close')">
      <!-- autobyteus-472 REQ-004: a loaded PDF or image can be saved to the phone. -->
      <template v-if="canDownload" #actions>
        <button
          type="button"
          class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Download"
          :disabled="downloading"
          data-testid="mobile-file-download"
          @click="onDownload"
        >
          <Icon icon="heroicons:arrow-down-tray-20-solid" class="h-6 w-6" aria-hidden="true" />
        </button>
      </template>
    </MobileScreenBar>
    <div class="min-h-0 flex-1 overflow-hidden">
      <p v-if="viewerError" class="px-4 py-10 text-center text-sm text-red-700" role="alert" data-testid="mobile-file-preview-error">{{ errorMessage || 'Couldn’t open this file.' }}</p>
      <p v-else-if="isLoading" class="px-4 py-10 text-center text-sm text-slate-400" role="status" data-testid="mobile-file-preview-loading">Opening…</p>
      <p v-else-if="isUnsupported" class="px-4 py-10 text-center text-sm text-slate-500" data-testid="mobile-file-preview-unsupported">This file can’t be shown on the phone.</p>
      <FileViewer
        v-else
        :file="viewerFile"
        :mode="viewerMode"
        :read-only="true"
        :loading="false"
        :error="null"
        :touch-zoom="true"
        :zoom-memory="zoomMemory"
        class="h-full w-full"
        data-testid="mobile-file-preview-content"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import FileViewer from '~/components/fileExplorer/FileViewer.vue';
import MobileScreenBar from '~/components/mobile/MobileScreenBar.vue';
import { useViewerZoomMemory } from '~/composables/mobile/useViewerZoomMemory';
import { downloadMimeTypeOf, useMobileFileDownload } from '~/composables/mobile/useMobileFileDownload';
import type { FileDataType, FileOpenMode, OpenFileState } from '~/stores/fileExplorerState';

const props = withDefaults(defineProps<{
  path: string;
  fileState: OpenFileState | null;
  openError?: string | null;
  /** The text to show when the file could not be opened (a node file's refusal, autobyteus-436); a default otherwise. */
  errorMessage?: string | null;
}>(), { openError: null, errorMessage: null });
defineEmits<{ close: [] }>();

const name = computed(() => props.path.split('/').filter(Boolean).at(-1) || props.path);
const viewerError = computed(() => props.openError || props.fileState?.error || null);
const isLoading = computed(() => !props.fileState || Boolean(props.fileState.isLoading));
const fileType = computed<FileDataType>(() => props.fileState?.type ?? 'Text');
const isUnsupported = computed(() => fileType.value === 'Unsupported');
const viewerMode = computed<FileOpenMode>(() => {
  const lowerPath = props.path.toLowerCase();
  return fileType.value === 'Text' && (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) ? 'preview' : 'edit';
});
// How the open file is zoomed, kept while its path stays open: a reload shows it as it was (autobyteus-472 REQ-006).
const zoomMemory = useViewerZoomMemory(() => props.path);

const { download } = useMobileFileDownload();
const downloading = ref(false);
const canDownload = computed(() => !viewerError.value && !isLoading.value && Boolean(props.fileState?.url)
  && downloadMimeTypeOf({ path: props.path, type: fileType.value }) !== null);
const onDownload = async () => {
  if (downloading.value || !props.fileState) return;
  downloading.value = true;
  try {
    await download({ path: props.path, type: fileType.value, url: props.fileState.url });
  } finally {
    downloading.value = false;
  }
};

const viewerFile = computed(() => ({
  path: props.path,
  type: fileType.value,
  content: props.fileState?.content ?? null,
  url: props.fileState?.url ?? null,
  contentRevision: props.fileState?.contentRevision ?? 0,
  relativeResourceContext: props.fileState?.relativeResourceContext ?? null,
}));
</script>
