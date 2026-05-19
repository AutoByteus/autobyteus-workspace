<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-white" data-testid="mobile-file-viewer">
    <header class="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
      <button type="button" class="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" @click="$emit('close')">
        Back
      </button>
      <div class="min-w-0 flex-1">
        <p class="truncate font-bold text-slate-950">{{ node.name }}</p>
        <p class="truncate text-xs text-slate-500">{{ node.path }}</p>
      </div>
      <button
        type="button"
        class="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!canAttach"
        data-testid="mobile-file-attach"
        @click="attachFile"
      >
        Attach
      </button>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-5">
      <div v-if="support.support === 'unsupported'" class="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900" data-testid="mobile-file-preview-unsupported">
        <p class="font-bold">Unsupported on mobile</p>
        <p class="mt-2 text-sm">{{ support.message }}</p>
      </div>
      <div v-else-if="previewState?.isLoading || !previewState" class="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" data-testid="mobile-file-preview-loading">
        Loading file content through the authorized workspace file API…
      </div>
      <div v-else-if="previewState.error" class="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800" data-testid="mobile-file-preview-error">
        <p class="font-bold">Could not load preview</p>
        <p class="mt-2 text-sm">{{ previewState.error }}</p>
      </div>
      <div v-else-if="isTooLarge" class="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900" data-testid="mobile-file-preview-large">
        <p class="font-bold">Preview too large for mobile</p>
        <p class="mt-2 text-sm">This file has {{ previewLength }} characters. Mobile preview is limited to {{ maxCharsLabel }} characters.</p>
      </div>
      <pre v-else class="overflow-x-auto whitespace-pre-wrap break-words rounded-3xl border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-50" data-testid="mobile-file-preview-content">{{ previewContent }}</pre>
    </div>

    <p v-if="attachNotice" class="shrink-0 border-t border-blue-100 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800" data-testid="mobile-file-attach-notice">
      {{ attachNotice }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { MOBILE_FILE_PREVIEW_MAX_CHARS, useMobileFileContextCoordinator } from '~/composables/mobile/useMobileFileContextCoordinator';
import type { MobileWorkContext } from '~/types/mobileWork';

type MobileFileNode = {
  name: string;
  path: string;
  is_file: boolean;
};

const props = defineProps<{
  node: MobileFileNode;
  workspaceId: string;
  context: MobileWorkContext | null;
}>();

defineEmits<{
  close: [];
}>();

const coordinator = useMobileFileContextCoordinator();
const attachNotice = ref<string | null>(null);
const maxCharsLabel = MOBILE_FILE_PREVIEW_MAX_CHARS.toLocaleString();
const support = computed(() => coordinator.getPreviewSupport(props.node.path));
const previewState = computed(() => coordinator.getPreviewState(props.node.path, props.workspaceId));
const previewContent = computed(() => previewState.value?.content ?? '');
const previewLength = computed(() => previewContent.value.length.toLocaleString());
const isTooLarge = computed(() => previewContent.value.length > MOBILE_FILE_PREVIEW_MAX_CHARS);
const canAttach = computed(() => props.node.is_file && support.value.support === 'supported');

async function loadPreview(): Promise<void> {
  attachNotice.value = null;
  await coordinator.openPreview(props.node.path, props.workspaceId);
}

function attachFile(): void {
  const result = coordinator.attachWorkspaceFile(props.node.path, props.context);
  if (result.target === 'none') {
    attachNotice.value = `Open this run before attaching ${result.attachment.displayName}.`;
    return;
  }
  const targetLabel = result.target === 'active-run'
    ? 'current run Chat context'
    : 'the next mobile run launch';
  attachNotice.value = result.attached
    ? `${result.attachment.displayName} added to ${targetLabel}.`
    : `${result.attachment.displayName} is already attached to ${targetLabel}.`;
}

onMounted(loadPreview);
watch(() => [props.node.path, props.workspaceId], loadPreview);
</script>
