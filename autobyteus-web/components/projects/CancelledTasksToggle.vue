<template>
  <!-- A board's on-demand view of its Cancelled Tasks (dropped as not needed): "Cancelled (N)" beside Refresh.
       The board owns whether the Cancelled lane is shown and omits this button when it has none. -->
  <button
    type="button"
    :aria-pressed="pressed"
    :title="t(pressed ? 'projects.board.hideCancelled' : 'projects.board.showCancelled')"
    class="inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    :class="pressed ? 'bg-slate-100' : 'bg-white'"
    @click="emit('toggle')"
  >
    <Icon icon="heroicons:archive-box" class="h-4 w-4" aria-hidden="true" />{{ t('projects.board.cancelledToggle', { count }) }}
  </button>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'

defineProps<{ count: number; pressed: boolean }>()
const emit = defineEmits<{ (event: 'toggle'): void }>()
const { t } = useLocalization()
</script>
