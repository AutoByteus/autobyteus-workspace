<template>
  <div
    class="flex flex-col bg-white"
    :class="resolvedPresentation === 'fullscreen' ? 'fixed inset-0 z-50' : 'relative min-h-0 flex-1 border-t border-slate-200'"
    data-testid="mobile-file-viewer"
  >
    <header class="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
      <button type="button" class="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" @click="$emit('close')">
        Back
      </button>
      <div class="min-w-0 flex-1">
        <p class="truncate font-bold text-slate-950">{{ node.name }}</p>
        <p class="truncate text-xs text-slate-500">{{ node.path }}</p>
      </div>
      <button
        v-if="shouldAllowAttach"
        type="button"
        class="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!canAttach"
        data-testid="mobile-file-attach"
        @click="attachFile"
      >
        Attach
      </button>
    </header>

    <div class="min-h-0 flex-1 overflow-hidden bg-slate-50 p-3">
      <div v-if="viewerError" class="h-full overflow-y-auto rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800" data-testid="mobile-file-preview-error">
        <p class="font-bold">Could not load preview</p>
        <p class="mt-2 text-sm">{{ viewerError }}</p>
      </div>
      <div v-else-if="isLoading" class="h-full rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600" data-testid="mobile-file-preview-loading" role="status" aria-live="polite">
        Loading file content through the authorized workspace file API…
      </div>
      <div v-else-if="isUnsupported" class="h-full overflow-y-auto rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900" data-testid="mobile-file-preview-unsupported">
        <p class="font-bold">Unsupported on mobile</p>
        <p class="mt-2 text-sm">This file type is not available in the mobile read-only viewer.</p>
      </div>
      <div v-else-if="isTooLarge" class="h-full overflow-y-auto rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900" data-testid="mobile-file-preview-large">
        <p class="font-bold">Preview too large for mobile</p>
        <p class="mt-2 text-sm">This file has {{ previewLengthLabel }} characters. Mobile preview is limited to {{ maxCharsLabel }} characters.</p>
      </div>
      <div v-else class="h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" data-testid="mobile-file-preview-content">
        <FileViewer
          :file="viewerFile"
          :mode="viewerMode"
          :read-only="true"
          :loading="fileState?.isLoading ?? false"
          :error="fileState?.error ?? null"
          class="h-full w-full"
        />
      </div>
    </div>

    <p v-if="attachNotice" class="shrink-0 border-t border-blue-100 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800" data-testid="mobile-file-attach-notice">
      {{ attachNotice }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import FileViewer from '~/components/fileExplorer/FileViewer.vue';
import { useMobileFileContextCoordinator } from '~/composables/mobile/useMobileFileContextCoordinator';
import type { FileDataType, FileOpenMode, OpenFileState } from '~/stores/fileExplorerState';
import type { MobileWorkContext } from '~/types/mobileWork';

const MOBILE_FILE_VIEW_MAX_CHARS = 120_000;

type MobileFileNode = {
  name: string;
  path: string;
  is_file: boolean;
};

const props = withDefaults(defineProps<{
  node: MobileFileNode;
  workspaceId: string;
  context: MobileWorkContext | null;
  fileState: OpenFileState | null;
  openError?: string | null;
  presentation?: 'fullscreen' | 'inline';
  allowAttach?: boolean;
}>(), {
  presentation: 'fullscreen',
  allowAttach: true,
});

defineEmits<{
  close: [];
}>();

const coordinator = useMobileFileContextCoordinator();
const resolvedPresentation = computed(() => props.presentation ?? 'fullscreen');
const shouldAllowAttach = computed(() => props.allowAttach ?? true);
const attachNotice = ref<string | null>(null);
const maxCharsLabel = MOBILE_FILE_VIEW_MAX_CHARS.toLocaleString();
const viewerError = computed(() => props.openError || props.fileState?.error || null);
const isLoading = computed(() => !props.fileState || Boolean(props.fileState.isLoading));
const fileType = computed<FileDataType>(() => props.fileState?.type ?? 'Text');
const isUnsupported = computed(() => fileType.value === 'Unsupported');
const previewContent = computed(() => props.fileState?.content ?? '');
const previewLengthLabel = computed(() => previewContent.value.length.toLocaleString());
const isTooLarge = computed(() => fileType.value === 'Text' && previewContent.value.length > MOBILE_FILE_VIEW_MAX_CHARS);
const canAttach = computed(() => props.node.is_file);
const viewerMode = computed<FileOpenMode>(() => {
  const lowerPath = props.node.path.toLowerCase();
  if (fileType.value === 'Text' && (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown'))) {
    return 'preview';
  }
  return 'edit';
});
const viewerFile = computed(() => ({
  path: props.node.path,
  type: fileType.value,
  content: props.fileState?.content ?? null,
  url: props.fileState?.url ?? null,
  relativeResourceContext: props.fileState?.relativeResourceContext ?? null,
}));

function attachFile(): void {
  const result = coordinator.attachWorkspaceFile(props.node.path, props.context);
  if (result.target === 'none') {
    attachNotice.value = `Open this run before attaching ${result.attachment.displayName}.`;
    return;
  }
  const targetLabel = result.target === 'active-run'
    ? 'current run Chat context'
    : result.target === 'pending-team-run'
      ? 'pending team run context'
      : 'the next mobile run launch';
  attachNotice.value = result.attached
    ? `${result.attachment.displayName} added to ${targetLabel}.`
    : `${result.attachment.displayName} is already attached to ${targetLabel}.`;
}
</script>
