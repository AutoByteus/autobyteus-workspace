<template>
  <div class="flex items-center justify-between gap-2" :class="touch ? 'text-sm' : 'px-2 py-1.5 text-xs'" data-test="model-list-refresh">
    <span v-if="failed" role="alert" class="whitespace-nowrap text-red-600" data-test="model-list-refresh-error">{{ $t('chat.model.refreshError') }}</span>
    <span v-else-if="refreshing" role="status" class="flex items-center gap-1.5 whitespace-nowrap text-gray-400" data-test="model-list-refreshing">
      <span class="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400 motion-reduce:animate-none" aria-hidden="true"></span>
      {{ $t('chat.model.refreshing') }}
    </span>
    <span v-else></span>
    <button
      type="button"
      data-row
      data-test="model-list-refresh-button"
      class="whitespace-nowrap rounded font-medium text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:cursor-wait disabled:text-gray-400 disabled:hover:bg-transparent"
      :class="touch ? 'h-11 min-w-[2.75rem] px-3 active:bg-slate-100' : 'px-1.5 py-0.5'"
      :disabled="refreshing"
      @click="emit('refresh')"
    >{{ failed ? $t('chat.model.retry') : $t('chat.model.refresh') }}</button>
  </div>
</template>

<script setup lang="ts">
/**
 * The one "Refresh models" control of every model picker (REQ-011): a busy state while the list is read again,
 * and, when that read failed, the error with Retry. The list shown stays usable in both states.
 */
withDefaults(defineProps<{
  refreshing: boolean
  /** The last refresh failed; the picker keeps the last list. */
  failed: boolean
  /** The phone's touch size (a 44px target). */
  touch?: boolean
}>(), { touch: false })
const emit = defineEmits<{ (event: 'refresh'): void }>()
</script>
