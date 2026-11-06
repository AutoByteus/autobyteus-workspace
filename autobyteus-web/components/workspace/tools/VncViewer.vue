<template>
  <div class="vnc-viewer h-full flex flex-col bg-white">
    <div class="flex-1 overflow-auto">
      <div
        v-if="availability === 'loading'"
        class="flex items-center justify-center h-full text-sm text-gray-500"
        data-testid="node-desktop-loading"
      >
        {{ $t('workspace.components.workspace.tools.VncViewer.checking_node_desktop') }}
      </div>
      <div
        v-else-if="availability === 'unavailable'"
        class="flex items-center justify-center h-full text-sm text-gray-500"
        data-testid="node-desktop-unavailable"
      >
        {{ $t('workspace.components.workspace.tools.VncViewer.no_shared_desktop') }}
      </div>
      <div
        v-else-if="availability === 'error'"
        class="flex flex-col items-center justify-center h-full gap-2 text-sm text-gray-500"
        data-testid="node-desktop-error"
      >
        <p>{{ $t('workspace.components.workspace.tools.VncViewer.cannot_reach_node') }}</p>
        <button
          class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          @click="loadAvailability"
        >
          {{ $t('workspace.components.workspace.tools.VncViewer.retry') }}
        </button>
      </div>
      <NodeDesktopTile v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import NodeDesktopTile from '~/components/workspace/tools/NodeDesktopTile.vue';
import { useNodeDesktopAvailability } from '~/composables/useNodeDesktopAvailability';

const { availability, reload: loadAvailability } = useNodeDesktopAvailability();
</script>
