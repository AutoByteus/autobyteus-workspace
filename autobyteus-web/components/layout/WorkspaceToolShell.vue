<template>
  <div class="flex flex-1 flex-col relative min-h-0 min-w-0 overflow-hidden bg-gray-100">
    <div
      ref="workspaceFlowRef"
      class="flex flex-1 min-h-0 min-w-0 overflow-hidden"
      data-test="workspace-center-right-flow"
    >
      <!-- Center content (owned by the caller) -->
      <div
        data-test="workspace-center-pane"
        class="bg-white p-0 flex flex-col min-h-0 flex-1 min-w-0"
        :style="centerPaneStyle"
      >
        <slot />
      </div>

      <div
        v-if="showDockedRightPanel"
        class="drag-handle"
        data-test="workspace-right-resize-handle"
        @mousedown="initDragRightPanel"
      ></div>

      <!-- Right Panel -->
      <div
        v-if="showDockedRightPanel"
        :style="{ width: responsiveWorkspaceShellState.rightPanel.preferredWidth + 'px' }"
        class="bg-white p-0 shadow flex flex-col flex-none min-h-0 min-w-0 overflow-hidden relative"
        data-test="workspace-right-panel"
      >
        <RightSideTabs mode="desktop" />
      </div>

      <RightSidebarStrip
        v-else-if="!isRightDrawerOpen && responsiveWorkspaceShellState.showRightStrip"
        data-test="workspace-right-tool-strip"
        :strip-behavior="responsiveWorkspaceShellState.rightPanel.stripBehavior ?? 'consuming'"
        :strip-activation="responsiveWorkspaceShellState.rightPanel.stripActivation!"
        @request-open="openRightDrawer"
        @request-redock="redockRightPanel"
      />
    </div>

    <WorkspaceRightToolDrawer
      v-if="isRightDrawerOpen"
      :title="rightDrawerTitle"
      :width="rightDrawerWidth"
      :backdrop-style="rightDrawerBackdropStyle"
      :return-focus-target="getRightStripFocusTarget"
      @close="closeRightDrawer"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { setActiveRightPanelScope, useRightPanel, type RightPanelScope } from '~/composables/useRightPanel';
import { useRightSideTabs } from '~/composables/useRightSideTabs';
import { useResponsiveWorkspaceShellState } from '~/composables/layout/useResponsiveWorkspaceShell';
import RightSideTabs from './RightSideTabs.vue';
import RightSidebarStrip from './RightSidebarStrip.vue';
import WorkspaceRightToolDrawer from './WorkspaceRightToolDrawer.vue';
import { LEFT_PANEL_RESIZE_HANDLE_WIDTH_PX } from '~/utils/layout/responsiveLayoutPolicy';

/**
 * The right tool shell (dock, strip, drawer, resize) around a center slot.
 * It owns no center-view selection; the caller renders the center content.
 */
const props = defineProps<{
  scope: RightPanelScope
}>();

const { t } = useLocalization();
const {
  isRightPanelVisible,
  initDragRightPanel,
  setRightPanelVisible,
  setRightPanelWorkspaceWidth,
} = useRightPanel();
const { activeTab } = useRightSideTabs();
const responsiveWorkspaceShellState = useResponsiveWorkspaceShellState();
const isRightDrawerOpen = ref(false);
const workspaceFlowRef = ref<HTMLElement | null>(null);
let workspaceFlowResizeObserver: ResizeObserver | null = null;

// The mounted shell decides which visibility preference the right panel uses.
setActiveRightPanelScope(props.scope);
watch(() => props.scope, (scope) => setActiveRightPanelScope(scope));

const registerWorkspaceFlowWidth = (width: number): void => {
  const effectiveLeftHandleOverlap = LEFT_PANEL_RESIZE_HANDLE_WIDTH_PX / 2;
  if (width > effectiveLeftHandleOverlap) {
    // The shell's 6px left handle overlaps the row by 3px (`margin-left: -3px`).
    // Compensate before handing the capacity boundary to the resolver, which
    // accounts for the full logical left resize handle in viewport space.
    setRightPanelWorkspaceWidth(width - effectiveLeftHandleOverlap);
  }
};

onMounted(() => {
  const workspaceFlow = workspaceFlowRef.value;
  if (!workspaceFlow) {
    return;
  }

  registerWorkspaceFlowWidth(workspaceFlow.getBoundingClientRect().width);

  if (typeof ResizeObserver !== 'undefined') {
    workspaceFlowResizeObserver = new ResizeObserver(([entry]) => {
      registerWorkspaceFlowWidth(entry?.contentRect.width ?? workspaceFlow.getBoundingClientRect().width);
    });
    workspaceFlowResizeObserver.observe(workspaceFlow);
  }
});

onBeforeUnmount(() => {
  workspaceFlowResizeObserver?.disconnect();
  workspaceFlowResizeObserver = null;
  setRightPanelWorkspaceWidth(null);
});

const showDockedRightPanel = computed(() =>
  isRightPanelVisible.value && responsiveWorkspaceShellState.value.rightPanel.presentation === 'docked',
);

const centerPaneStyle = computed(() => ({
  minWidth: responsiveWorkspaceShellState.value.isNarrow
    ? `min(100%, ${responsiveWorkspaceShellState.value.rightPanel.effectiveCenterMinWidth}px)`
    : `${responsiveWorkspaceShellState.value.rightPanel.effectiveCenterMinWidth}px`,
}));

const rightDrawerWidth = computed(() => Math.min(
  Math.max(responsiveWorkspaceShellState.value.rightPanel.preferredWidth, 400),
  520,
));

const rightDrawerTitle = computed(() => {
  if (activeTab.value === 'files') {
    return t('shell.workspaceSurfaces.files');
  }

  return t('shell.workspaceSurfaces.tools');
});

const rightDrawerBackdropStyle = computed(() => ({
  // The left strip remains a normal 50px flow item while right tools are
  // transient. Keep it outside the right drawer backdrop's hit-test region
  // so the opposite side can be opened with a real pointer interaction.
  ...(responsiveWorkspaceShellState.value.showLeftStrip
    ? { left: `${responsiveWorkspaceShellState.value.leftPanel.consumedWidth}px` }
    : {}),
}));

const closeRightDrawer = (): void => {
  isRightDrawerOpen.value = false;
};

const getRightStripFocusTarget = (origin?: HTMLElement | null): HTMLElement | null => {
  const tabName = origin?.dataset.tabName;
  if (!tabName) {
    return null;
  }

  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-test="workspace-right-tool-strip"] button'));
  return buttons.find((button) => button.dataset.tabName === tabName) ?? null;
};

const openRightDrawer = (): void => {
  if (isRightDrawerOpen.value) {
    closeRightDrawer();
    return;
  }

  isRightDrawerOpen.value = true;
};

const redockRightPanel = (): void => {
  setRightPanelVisible(true);
  closeRightDrawer();
};

watch(
  () => responsiveWorkspaceShellState.value.rightPanel.presentation,
  (presentation) => {
    if (presentation === 'docked') {
      closeRightDrawer();
    }
  },
);
</script>

<style scoped>
.drag-handle {
  width: 4px;
  flex: 0 0 4px;
  background-color: transparent;
  cursor: col-resize;
  transition: background-color 0.2s ease;
  position: relative;
  z-index: 10;
  margin-left: -2px;
}

.drag-handle:hover {
  background-color: #9ca3af;
}

.drag-handle:active {
  background-color: #6b7280;
}
</style>
