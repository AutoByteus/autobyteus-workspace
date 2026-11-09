<template>
  <!-- An opened file, full screen (TR-019, VIS-029): a 48px bar (← and the name) and the file; no Attach, no card. -->
  <section class="fixed inset-0 z-30 flex h-[100dvh] flex-col bg-white" data-testid="mobile-file-viewer">
    <MobileScreenBar :title="name" @back="$emit('close')" />
    <div class="min-h-0 flex-1 overflow-hidden">
      <p v-if="viewerError" class="px-4 py-10 text-center text-sm text-red-700" role="alert" data-testid="mobile-file-preview-error">{{ errorMessage || 'Couldn’t open this file.' }}</p>
      <p v-else-if="isLoading" class="px-4 py-10 text-center text-sm text-slate-400" role="status" data-testid="mobile-file-preview-loading">Opening…</p>
      <p v-else-if="isUnsupported" class="px-4 py-10 text-center text-sm text-slate-500" data-testid="mobile-file-preview-unsupported">This file can’t be shown on the phone.</p>
      <p v-else-if="isTooLarge" class="px-4 py-10 text-center text-sm text-slate-500" data-testid="mobile-file-preview-large">This file is too large to show on the phone.</p>
      <FileViewer
        v-else
        :file="viewerFile"
        :mode="viewerMode"
        :read-only="true"
        :loading="false"
        :error="null"
        class="h-full w-full"
        data-testid="mobile-file-preview-content"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FileViewer from '~/components/fileExplorer/FileViewer.vue';
import MobileScreenBar from '~/components/mobile/MobileScreenBar.vue';
import type { FileDataType, FileOpenMode, OpenFileState } from '~/stores/fileExplorerState';

const MOBILE_FILE_VIEW_MAX_CHARS = 120_000;

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
const isTooLarge = computed(() => fileType.value === 'Text' && (props.fileState?.content ?? '').length > MOBILE_FILE_VIEW_MAX_CHARS);
const viewerMode = computed<FileOpenMode>(() => {
  const lowerPath = props.path.toLowerCase();
  return fileType.value === 'Text' && (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) ? 'preview' : 'edit';
});
const viewerFile = computed(() => ({
  path: props.path,
  type: fileType.value,
  content: props.fileState?.content ?? null,
  url: props.fileState?.url ?? null,
  relativeResourceContext: props.fileState?.relativeResourceContext ?? null,
}));
</script>
