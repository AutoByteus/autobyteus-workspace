<template>
  <!-- remote-runs-in-tree: a tool of the right panel that reads the other node's disk or processes. -->
  <div class="flex h-full flex-col items-center justify-center px-6 text-center" role="note" :data-test="`remote-panel-note-${panel}`">
    <Icon icon="heroicons:computer-desktop" class="mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
    <p class="text-sm font-medium text-gray-700">{{ t('remote.panel.title', { node: nodeName }) }}</p>
    <p class="mt-1 max-w-xs text-sm text-gray-500">{{ t(`remote.panel.${panel}`, { node: nodeName }) }}</p>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'

defineProps<{ nodeName: string; panel: 'files' | 'terminal' | 'artifacts' | 'vnc' }>()
const { t } = useLocalization()
</script>
