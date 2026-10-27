<template>
  <!-- "Depends on" on the New task / Edit task page. Only Tasks of this Project; a Task that (in)directly
       depends on this one cannot be chosen (no loops). It informs and never stops work. -->
  <div class="mt-6 border-t border-slate-100 pt-5" data-testid="task-dependency-picker">
    <label :for="inputId" class="block text-sm font-medium text-slate-700">{{ t('projects.deps.dependsOn') }} <span class="font-normal text-slate-400">{{ t('projects.ui.optional') }}</span></label>
    <p :id="helpId" class="mt-1 text-xs leading-5 text-slate-500">{{ t('projects.deps.editorHelp', { project: projectName }) }}</p>

    <ul v-if="selected.length" class="mt-3 space-y-1.5" data-testid="task-dependency-selected">
      <li v-for="item in selected" :key="item.taskId" class="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1.5 text-sm" :data-testid="`task-dependency-selected-${item.taskId}`">
        <span class="max-w-[45%] flex-shrink-0 font-medium text-slate-700"><TaskKey :task-key="item.taskKey" /></span>
        <span class="min-w-0 flex-1 truncate text-slate-600">{{ taskTitleLabel(item.title) }}</span>
        <span class="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset" :class="taskStatusPillClass(item.status)">{{ t(TASK_STATUS_LABEL_KEYS[item.status]) }}</span>
        <button
          type="button"
          class="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
          :disabled="disabled"
          :aria-label="t('projects.deps.remove', { key: item.taskKey })"
          :title="t('projects.deps.remove', { key: item.taskKey })"
          data-testid="task-dependency-remove"
          @click="remove(item.taskId)"
        ><Icon icon="heroicons:x-mark-20-solid" class="h-4 w-4" aria-hidden="true" /></button>
      </li>
    </ul>

    <div class="relative mt-3">
      <Icon icon="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        :id="inputId"
        ref="input"
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        :aria-expanded="open"
        :aria-controls="listId"
        :aria-activedescendant="open && options[active] ? optionId(active) : undefined"
        :aria-describedby="helpId"
        :disabled="disabled"
        class="block min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
        :placeholder="t('projects.deps.add') + ' · ' + t('projects.deps.searchPlaceholder')"
        data-testid="task-dependency-input"
        @input="open = true"
        @click="open = true"
        @blur="onBlur"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="choose(options[active])"
        @keydown.esc.prevent="open = false"
      >
      <ul
        v-if="open"
        :id="listId"
        role="listbox"
        class="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        data-testid="task-dependency-options"
      >
        <li v-if="!options.length" class="px-3 py-2 text-sm text-slate-500" role="presentation">{{ t('projects.deps.noMatch') }}</li>
        <li
          v-for="(item, index) in options"
          :id="optionId(index)"
          :key="item.task.taskId"
          role="option"
          :aria-selected="index === active"
          :aria-disabled="item.cycle || undefined"
          class="flex min-w-0 items-center gap-2 px-3 py-2 text-sm"
          :class="[item.cycle ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-700', index === active && !item.cycle ? 'bg-slate-100' : '']"
          :data-testid="`task-dependency-option-${item.task.taskId}`"
          @mousedown.prevent="choose(item)"
          @mousemove="active = index"
        >
          <span class="max-w-[40%] flex-shrink-0 font-medium" :class="item.cycle ? '' : 'text-slate-700'"><TaskKey :task-key="item.task.taskKey" /></span>
          <span class="min-w-0 flex-1 truncate" :class="item.cycle ? '' : 'text-slate-600'">{{ taskTitleLabel(item.task.title) }}</span>
          <span v-if="item.cycle" class="flex-shrink-0 text-xs">{{ t('projects.deps.cycle') }}</span>
          <span v-else class="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset" :class="taskStatusPillClass(item.task.status)">{{ t(TASK_STATUS_LABEL_KEYS[item.task.status]) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { ProjectTask } from '~/types/project'
import { dependencyCycleIds, taskKeyNumber } from '~/utils/projects/taskDependencies'
import { TASK_STATUS_LABEL_KEYS, taskStatusPillClass } from '~/utils/projects/taskStatusPresentation'
import { taskTitleLabel } from '~/utils/projects/taskText'
import TaskKey from './TaskKey.vue'

const props = defineProps<{ projectId: string; projectName: string; taskId?: string; disabled?: boolean }>()
const model = defineModel<string[]>({ required: true })
const { t } = useLocalization()
const store = useProjectTaskStore()
const uid = Math.random().toString(36).slice(2, 8)
const inputId = `task-dependency-input-${uid}`, helpId = `task-dependency-help-${uid}`, listId = `task-dependency-list-${uid}`
const optionId = (index: number) => `task-dependency-option-${uid}-${index}`

const input = ref<HTMLInputElement | null>(null)
const query = ref(''), open = ref(false), active = ref(0)
const tasks = computed<ProjectTask[]>(() => store.getList(props.projectId)?.tasks ?? [])
const byId = computed(() => new Map(tasks.value.map((item) => [item.taskId, item])))
const selected = computed(() => model.value.map((id) => byId.value.get(id)).filter((item): item is ProjectTask => Boolean(item))
  .sort((a, b) => taskKeyNumber(a) - taskKeyNumber(b)))
const cycle = computed(() => dependencyCycleIds(props.taskId, tasks.value))
/** Matching Tasks of this Project, newest key first; Tasks that would make a loop are shown but cannot be chosen. */
const options = computed(() => {
  const words = query.value.trim().toLocaleLowerCase()
  return tasks.value
    .filter((item) => item.taskId !== props.taskId && !model.value.includes(item.taskId))
    .filter((item) => !words || `${item.taskKey} ${item.title} ${item.description}`.toLocaleLowerCase().includes(words))
    .sort((a, b) => taskKeyNumber(b) - taskKeyNumber(a))
    .slice(0, 8)
    .map((task) => ({ task, cycle: cycle.value.has(task.taskId) }))
})
watch(options, () => { active.value = Math.max(0, options.value.findIndex((item) => !item.cycle)) })

const move = (step: number) => {
  open.value = true
  if (!options.value.length) return
  let next = active.value
  for (let i = 0; i < options.value.length; i += 1) {
    next = (next + step + options.value.length) % options.value.length
    if (!options.value[next]!.cycle) { active.value = next; return }
  }
}
const choose = (item?: { task: ProjectTask; cycle: boolean }) => {
  if (!item || item.cycle || props.disabled) return
  model.value = [...model.value, item.task.taskId]
  query.value = ''
  // Close the list after a choice so it never covers Save; typing, a click or an arrow key reopens it.
  open.value = false
  input.value?.focus()
}
const remove = (taskId: string) => { model.value = model.value.filter((id) => id !== taskId); input.value?.focus() }
const onBlur = () => { setTimeout(() => { if (document.activeElement !== input.value) open.value = false }, 0) }

onMounted(() => { void store.fetchTasks(props.projectId).catch(() => undefined) })
onBeforeUnmount(() => store.releaseRead(props.projectId))
</script>
