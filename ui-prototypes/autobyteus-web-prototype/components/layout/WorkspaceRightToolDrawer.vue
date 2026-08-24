<template>
  <div
    data-test="workspace-right-tool-drawer-backdrop"
    class="fixed inset-0 z-40 bg-black/30"
    :style="{ ...props.backdropStyle, zIndex: drawerBackdropZIndex }"
    aria-hidden="true"
    @click="emit('close')"
  ></div>
  <aside
    ref="drawerRef"
    data-test="workspace-right-tool-drawer"
    role="dialog"
    :aria-modal="drawerIsTopmost ? 'true' : undefined"
    :aria-label="title"
    tabindex="-1"
    class="fixed inset-y-0 right-0 z-50 flex max-w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[92vw]"
    :style="{ width: `${width}px`, zIndex: drawerZIndex }"
  >
    <div class="min-h-0 flex-1 overflow-hidden">
      <RightSideTabs mode="drawer" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAccessibleDrawer } from '~/composables/useAccessibleDrawer';
import RightSideTabs from './RightSideTabs.vue';

const props = defineProps<{
  title: string
  width: number
  backdropStyle?: Record<string, string>
  returnFocusTarget?: (origin?: HTMLElement | null) => HTMLElement | null
}>();

const emit = defineEmits<{
  (event: 'close'): void
}>();

const drawerRef = ref<HTMLElement | null>(null);

const { drawerLayer } = useAccessibleDrawer({
  drawerRef,
  onRequestClose: () => emit('close'),
  returnFocusTarget: props.returnFocusTarget,
});
const drawerBackdropZIndex = drawerLayer.backdropZIndex;
const drawerZIndex = drawerLayer.drawerZIndex;
const drawerIsTopmost = drawerLayer.isTopmost;
</script>
