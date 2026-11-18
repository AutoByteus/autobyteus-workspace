<template>
  <!-- The runs beyond the newest five (UIS-004): a quiet fold under the list; open, it also offers the one bulk clean-up. -->
  <div class="mx-1 mt-1 flex items-center justify-between text-xs" data-test="run-list-fold">
    <button
      type="button"
      class="rounded-md px-2 py-1.5 font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      data-test="run-list-show-older"
      :aria-expanded="olderShown ? 'true' : 'false'"
      @click="emit('toggle')"
    >{{ olderShown ? t('runList.showFewer') : t('runList.showOlder', { count: olderCount }) }}</button>
    <button
      v-if="olderShown && canArchiveOlder"
      type="button"
      class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 font-medium text-gray-500 transition-colors hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      data-test="run-list-archive-older"
      :disabled="archiving"
      @click="emit('archive-older')"
    >
      <Icon icon="heroicons:archive-box-20-solid" class="h-3.5 w-3.5" aria-hidden="true" />
      {{ t('runList.archiveOlder') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'

defineProps<{
  olderCount: number
  olderShown: boolean
  canArchiveOlder: boolean
  archiving: boolean
}>()
const emit = defineEmits<{ (event: 'toggle'): void; (event: 'archive-older'): void }>()
const { t } = useLocalization()
</script>
