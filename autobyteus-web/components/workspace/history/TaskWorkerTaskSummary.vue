<template>
  <!-- delegated-copy-task-locator: a Task worker's Task (a Project Task's title, a Temp task's first line) under its name. It is its own control:
       click, Enter or Space shows the Task in Projects and never opens, selects or toggles the row. -->
  <button
    type="button"
    class="-mx-1 mt-0.5 block max-w-full truncate rounded px-1 text-left text-[0.6875rem] font-normal leading-4 underline-offset-2 transition-colors hover:text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    :class="selected ? 'text-indigo-700' : 'text-gray-500'"
    data-test="workspace-task-worker-task-summary"
    :data-task-id="task.taskId"
    :title="locateLabel"
    :aria-label="locateLabel"
    @click.stop="emit('locate')"
    @keydown.enter.stop
    @keydown.space.stop
  >{{ label }}</button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { TaskWorkerTask } from '~/types/project';
import { taskWorkerTaskLabel } from '~/utils/projects/taskText';

const props = withDefaults(defineProps<{ task: TaskWorkerTask; selected?: boolean }>(), { selected: false });
const emit = defineEmits<{ (e: 'locate'): void }>();
const { t } = useLocalization();
const label = computed(() => taskWorkerTaskLabel(props.task));
const locateLabel = computed(() => t('workspace.history.copyTask.locate', { title: label.value }));
</script>
