<template>
  <div class="flex h-full min-h-0 flex-col bg-white">
    <div class="flex items-center gap-2 border-b border-gray-200 px-2 py-2">
      <div class="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        <button
          v-for="session in sessions"
          :key="session.preview_session_id"
          class="group flex max-w-[240px] items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
          :class="session.preview_session_id === activePreviewSessionId
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'"
          @click="handleSessionSelect(session.preview_session_id)"
        >
          <span class="truncate">{{ session.title || session.url }}</span>
          <span
            class="text-xs text-gray-400 transition-colors group-hover:text-gray-600"
            @click.stop="handleSessionClose(session.preview_session_id)"
          >
            ×
          </span>
        </button>
      </div>
    </div>

    <div class="relative flex-1 min-h-0 overflow-hidden bg-slate-50">
      <div ref="hostRef" class="absolute inset-0" />

      <div
        v-if="sessions.length === 0"
        class="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-gray-500"
      >
        Preview sessions will appear here when an agent calls <code>open_preview</code>.
      </div>

      <div
        v-else-if="!activePreviewSessionId"
        class="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-gray-500"
      >
        Select a preview session tab to attach its browser view here.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { usePreviewShellStore } from '~/stores/previewShellStore';
import { useRightPanel } from '~/composables/useRightPanel';

const previewShellStore = usePreviewShellStore();
const { isRightPanelVisible, rightPanelWidth } = useRightPanel();

const hostRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

const sessions = previewShellStore.sessions;
const activePreviewSessionId = previewShellStore.activePreviewSessionId;

const syncHostBounds = async (): Promise<void> => {
  await previewShellStore.initialize();

  if (!hostRef.value || !isRightPanelVisible.value) {
    await previewShellStore.updateHostBounds(null);
    return;
  }

  const rect = hostRef.value.getBoundingClientRect();
  await previewShellStore.updateHostBounds({
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  });
};

const handleSessionSelect = async (previewSessionId: string): Promise<void> => {
  await previewShellStore.setActiveSession(previewSessionId);
  await nextTick();
  await syncHostBounds();
};

const handleSessionClose = async (previewSessionId: string): Promise<void> => {
  await previewShellStore.closeSession(previewSessionId);
  await nextTick();
  await syncHostBounds();
};

onMounted(async () => {
  await previewShellStore.initialize();
  await nextTick();

  if (typeof ResizeObserver !== 'undefined' && hostRef.value) {
    resizeObserver = new ResizeObserver(() => {
      void syncHostBounds();
    });
    resizeObserver.observe(hostRef.value);
  }

  window.addEventListener('resize', syncHostBounds);
  await syncHostBounds();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener('resize', syncHostBounds);
  void previewShellStore.updateHostBounds(null);
});

watch(
  () => [
    isRightPanelVisible.value,
    rightPanelWidth.value,
    activePreviewSessionId.value,
    sessions.value.length,
  ],
  async () => {
    await nextTick();
    await syncHostBounds();
  },
);
</script>

