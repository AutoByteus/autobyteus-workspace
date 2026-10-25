<template>
  <!-- "Part of" on the New task / Edit task page: the one bigger Task of this Project this Task belongs to. Same pattern as
       "Depends on": search by key or text, a chosen row with a remove ×. Cannot be chosen: a Task that is itself a part
       (one level only). A Task that has parts cannot get a parent: the field says so instead of offering a search. -->
  <div class="mt-6 border-t border-slate-100 pt-5" data-testid="task-part-of-picker">
    <label :for="inputId" class="block text-sm font-medium text-slate-700">{{ t('projects.parts.partOf') }} <span class="font-normal text-slate-400">{{ t('projects.ui.optional') }}</span></label>

    <p v-if="hasParts" :id="helpId" class="mt-1 text-xs leading-5 text-slate-500" data-testid="task-part-of-has-parts">{{ t('projects.parts.hasParts') }}</p>
    <template v-else>
      <p :id="helpId" class="mt-1 text-xs leading-5 text-slate-500">{{ t('projects.parts.editorHelp', { project: projectName }) }}</p>

      <div v-if="selected" class="mt-3 flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1.5 text-sm" data-testid="task-part-of-selected">
        <span class="max-w-[45%] flex-shrink-0 font-medium text-slate-700"><TaskKey :task-key="selected.taskKey" /></span>
        <span class="min-w-0 flex-1 truncate text-slate-600">{{ taskTitleLabel(selected.title) }}</span>
        <span class="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset" :class="taskStatusPillClass(selected.status)">{{ t(TASK_STATUS_LABEL_KEYS[selected.status]) }}</span>
        <button
          type="button"
          class="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
          :disabled="disabled"
          :aria-label="t('projects.parts.remove', { key: selected.taskKey })"
          :title="t('projects.parts.remove', { key: selected.taskKey })"
          data-testid="task-part-of-remove"
          @click="clear"
        ><Icon icon="heroicons:x-mark-20-solid" class="h-4 w-4" aria-hidden="true" /></button>
      </div>

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
          :placeholder="t(selected ? 'projects.parts.chooseOther' : 'projects.parts.choose') + ' · ' + t('projects.deps.searchPlaceholder')"
          data-testid="task-part-of-input"
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
          data-testid="task-part-of-options"
        >
          <li v-if="!options.length" class="px-3 py-2 text-sm text-slate-500" role="presentation">{{ t('projects.parts.noMatch') }}</li>
          <li
            v-for="(item, index) in options"
            :id="optionId(index)"
            :key="item.task.taskId"
            role="option"
            :aria-selected="index === active"
            :aria-disabled="item.blocked || undefined"
            class="flex min-w-0 items-center gap-2 px-3 py-2 text-sm"
            :class="[item.blocked ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-700', index === active && !item.blocked ? 'bg-slate-100' : '']"
            :data-testid="`task-part-of-option-${item.task.taskId}`"
            @mousedown.prevent="choose(item)"
            @mousemove="active = index"
          >
            <span class="max-w-[40%] flex-shrink-0 font-medium" :class="item.blocked ? '' : 'text-slate-700'"><TaskKey :task-key="item.task.taskKey" /></span>
            <span class="min-w-0 flex-1 truncate" :class="item.blocked ? '' : 'text-slate-600'">{{ taskTitleLabel(item.task.title) }}</span>
            <span v-if="item.blocked" class="flex-shrink-0 text-xs">{{ t('projects.parts.alreadyPart') }}</span>
            <span v-else class="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset" :class="taskStatusPillClass(item.task.status)">{{ t(TASK_STATUS_LABEL_KEYS[item.task.status]) }}</span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { ProjectTask } from '~/types/project'
import { taskKeyNumber } from '~/utils/projects/taskDependencies'
import { partOfBlockedIds, partsOf } from '~/utils/projects/taskParts'
import { TASK_STATUS_LABEL_KEYS, taskStatusPillClass } from '~/utils/projects/taskStatusPresentation'
import { taskTitleLabel } from '~/utils/projects/taskText'
import TaskKey from './TaskKey.vue'

const props = defineProps<{ projectId: string; projectName: string; taskId?: string; disabled?: boolean }>()
const model = defineModel<string | null>({ required: true })
const { t } = useLocalization()
const store = useProjectTaskStore()
const uid = Math.random().toString(36).slice(2, 8)
const inputId = `task-part-of-input-${uid}`, helpId = `task-part-of-help-${uid}`, listId = `task-part-of-list-${uid}`
const optionId = (index: number) => `task-part-of-option-${uid}-${index}`

const input = ref<HTMLInputElement | null>(null)
const query = ref(''), open = ref(false), active = ref(0)
const tasks = computed<ProjectTask[]>(() => store.getList(props.projectId)?.tasks ?? [])
const selected = computed(() => tasks.value.find((item) => item.taskId === model.value) ?? null)
const self = computed(() => tasks.value.find((item) => item.taskId === props.taskId) ?? null)
// A Task that has parts cannot be a part (one level only).
const hasParts = computed(() => Boolean(self.value) && partsOf(self.value!, tasks.value).length > 0)
const blockedIds = computed(() => partOfBlockedIds(props.taskId, tasks.value))
/** Matching Tasks of this Project, newest key first; Tasks that are themselves parts are shown but cannot be chosen. */
const options = computed(() => {
  const words = query.value.trim().toLocaleLowerCase()
  return tasks.value
    .filter((item) => item.taskId !== props.taskId && item.taskId !== model.value)
    .filter((item) => !words || `${item.taskKey} ${item.title} ${item.description}`.toLocaleLowerCase().includes(words))
    .sort((a, b) => taskKeyNumber(b) - taskKeyNumber(a))
    .slice(0, 8)
    .map((task) => ({ task, blocked: blockedIds.value.has(task.taskId) }))
})
// The active option is always a choosable one, also before the options first change (Enter never lands on a part).
watch(options, () => { active.value = Math.max(0, options.value.findIndex((item) => !item.blocked)) }, { immediate: true })

const move = (step: number) => {
  open.value = true
  if (!options.value.length) return
  let next = active.value
  for (let i = 0; i < options.value.length; i += 1) {
    next = (next + step + options.value.length) % options.value.length
    if (!options.value[next]!.blocked) { active.value = next; return }
  }
}
const choose = (item?: { task: ProjectTask; blocked: boolean }) => {
  if (!item || item.blocked || props.disabled) return
  model.value = item.task.taskId // choosing replaces the current parent
  query.value = ''
  open.value = false
  input.value?.focus()
}
const clear = async () => { model.value = null; await nextTick(); input.value?.focus() }
const onBlur = () => { setTimeout(() => { if (document.activeElement !== input.value) open.value = false }, 0) }

onMounted(() => { void store.fetchTasks(props.projectId).catch(() => undefined) })
onBeforeUnmount(() => store.releaseRead(props.projectId))
</script>
