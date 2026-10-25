<template>
  <!-- remote-runs-in-tree: the other node could not be reached; the rest of the tree works. Same alert as other errors. -->
  <div
    class="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-4"
    role="alert"
    data-test="remote-run-notice"
  >
    <Icon icon="heroicons:exclamation-triangle-20-solid" class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p class="font-medium">{{ t('remote.view.title', { node: nodeName }) }}</p>
      <p class="mt-0.5 text-xs text-red-700">{{ t('remote.view.detail') }}</p>
    </div>
    <button
      type="button"
      class="flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-red-800 underline hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      data-test="remote-run-notice-retry"
      :aria-label="t('remote.row.retryAria', { node: nodeName })"
      @click="$emit('retry')"
    >{{ t('remote.row.retry') }}</button>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'

defineProps<{ nodeName: string }>()
defineEmits<{ (event: 'retry'): void }>()
const { t } = useLocalization()
</script>
