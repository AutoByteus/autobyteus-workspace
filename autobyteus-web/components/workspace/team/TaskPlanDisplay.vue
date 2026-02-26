<template>
  <div class="h-full flex flex-col">
    <!-- Empty State -->
    <div
      v-if="!tasks || tasks.length === 0"
      class="flex-1 flex items-center justify-center text-center bg-white rounded-lg"
    >
      <div class="px-4 py-8">
        <span class="i-heroicons-clipboard-document-list-20-solid w-10 h-10 text-gray-300 mx-auto"></span>
        <p class="mt-3 text-sm font-semibold text-gray-700">No task plan yet</p>
        <p class="mt-1 text-xs text-gray-500 max-w-[240px]">
          The team's task plan will appear here once work begins.
        </p>
      </div>
    </div>
    <div v-else class="overflow-auto flex-grow min-h-0 px-4 py-2">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deliverables</th>
            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depends On</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr v-for="task in sortedTasks" :key="task.taskId">
            <td class="px-4 py-3 whitespace-nowrap align-top">
              <span class="flex items-center text-xs font-medium">
                <span :class="statusVisuals(task.taskId).colorClass" class="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0 mt-1"></span>
                {{ statusVisuals(task.taskId).text }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-800 font-medium align-top">{{ task.taskName }}</td>
            <td class="px-4 py-3 text-xs text-gray-500 align-top max-w-md break-words" :title="task.description">{{ task.description }}</td>
            <td class="px-4 py-3 text-sm text-gray-600 align-top">{{ task.assigneeName }}</td>
            <td class="px-4 py-3 text-sm text-gray-600 align-top">
              <div v-if="task.fileDeliverables && task.fileDeliverables.length > 0">
                <div v-for="deliverable in task.fileDeliverables" :key="deliverable.filePath" class="mb-2 last:mb-0">
                  <div class="flex items-center font-medium text-gray-800">
                    <span class="i-heroicons-document-20-solid w-4 h-4 mr-1.5 text-gray-500 flex-shrink-0"></span>
                    <span class="truncate" :title="deliverable.filePath">{{ deliverable.filePath }}</span>
                  </div>
                  <p class="pl-5 text-xs text-gray-500 italic mt-0.5" :title="deliverable.summary">{{ deliverable.summary }}</p>
                </div>
              </div>
              <span v-else class="text-gray-400">--</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 font-mono align-top">{{ task.dependencies.length > 0 ? getTaskNames(task.dependencies).join(', ') : '–' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
// file: autobyteus-web/components/workspace/team/TaskPlanDisplay.vue
import { computed } from 'vue';
import type { Task, TaskStatus } from '~/types/taskManagement';

const props = defineProps<{
  tasks: Task[] | null;
  statuses: Record<string, TaskStatus> | null;
}>();

const idToNameMap = computed(() => {
  if (!props.tasks) return {};
  return props.tasks.reduce((acc, task) => {
    acc[task.taskId] = task.taskName;
    return acc;
  }, {} as Record<string, string>);
});

const sortedTasks = computed(() => {
  if (!props.tasks) return [];
  return [...props.tasks].sort((a, b) => a.taskName.localeCompare(b.taskName));
});

const getTaskNames = (taskIds: string[]) => {
  return taskIds.map(id => idToNameMap.value[id] || id.slice(0, 8));
};

const statusVisuals = (taskId: string) => {
  const status = props.statuses?.[taskId] || 'not_started';
  switch (status) {
    case 'completed': return { text: 'Completed', colorClass: 'bg-green-500' };
    case 'in_progress': return { text: 'In Progress', colorClass: 'bg-blue-500' };
    case 'failed': return { text: 'Failed', colorClass: 'bg-red-500' };
    case 'blocked': return { text: 'Blocked', colorClass: 'bg-yellow-500' };
    case 'not_started':
    default:
      return { text: 'Not Started', colorClass: 'bg-gray-400' };
  }
};
</script>
