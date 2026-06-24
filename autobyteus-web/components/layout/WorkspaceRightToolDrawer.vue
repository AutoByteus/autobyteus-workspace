<template>
  <div
    data-test="workspace-right-tool-drawer-backdrop"
    class="fixed bottom-0 left-0 right-0 top-14 z-40 bg-gray-900/50 md:inset-0"
    @click="emit('close')"
  ></div>
  <aside
    data-test="workspace-right-tool-drawer"
    class="fixed bottom-0 right-0 top-14 z-50 flex max-w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[92vw] md:inset-y-0"
    :style="{ width: `${width}px` }"
  >
    <div class="flex items-center justify-between border-b border-gray-200 px-3 py-2">
      <h2 class="text-sm font-semibold text-gray-800">{{ title }}</h2>
      <button
        type="button"
        class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        :title="$t('shell.workspaceSurfaces.closeTools')"
        @click="emit('close')"
      >
        <span class="sr-only">{{ $t('shell.workspaceSurfaces.closeTools') }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <RightSideTabs mode="drawer" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import RightSideTabs from './RightSideTabs.vue';

defineProps<{
  title: string
  width: number
}>();

const emit = defineEmits<{
  (event: 'close'): void
}>();
</script>
