<template>
  <!-- The Task key on a Task's detail, with a copy button. -->
  <span class="inline-flex min-w-0 max-w-full items-center gap-0.5 rounded-md border border-slate-200 bg-white py-0.5 pl-2 pr-0.5 text-sm font-medium text-slate-700" data-testid="task-key-chip">
    <TaskKey :task-key="taskKey" />
    <button
      type="button"
      class="inline-flex h-6 flex-shrink-0 items-center gap-1 rounded px-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :class="copied ? 'text-emerald-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'"
      :title="t('projects.key.copy')"
      :aria-label="t('projects.key.copyLabel', { key: taskKey })"
      data-testid="task-key-copy"
      @click.stop.prevent="copy"
    >
      <Icon :icon="copied ? 'heroicons:check-20-solid' : 'heroicons:clipboard-document'" class="h-4 w-4" aria-hidden="true" />
      <span v-if="copied" role="status" data-testid="task-key-copied">{{ t('projects.key.copied') }}</span>
    </button>
  </span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import TaskKey from './TaskKey.vue'

const props = defineProps<{ taskKey: string }>()
const { t } = useLocalization()
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
/** Copies the key and shows "Copied" for 1.5 s; a failed write is reported like the app's other copy buttons and the key stays selectable. */
const copy = async () => {
  try { await navigator.clipboard.writeText(props.taskKey) } catch (error) { console.error('Failed to copy text: ', error) }
  copied.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { copied.value = false }, 1500)
}
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>
