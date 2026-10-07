<template>
  <!-- project-manager-ux round 2: the entry to Temp tasks (Tasks with no Project), beside "New project",
       with the number of Temp tasks that are not Done (hidden at 0). It follows live. -->
  <NuxtLink
    to="/projects/temp-tasks"
    class="inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    :aria-label="open ? `${t('projects.temp.title')}, ${t('projects.temp.openCount', { count: open })}` : t('projects.temp.title')"
    data-testid="temp-tasks-link"
  >
    <Icon icon="heroicons:queue-list" class="h-4 w-4 text-slate-500" aria-hidden="true" />
    {{ t('projects.temp.title') }}
    <span v-if="open" class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600" data-testid="temp-tasks-link-count">{{ t('projects.temp.openCount', { count: open }) }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { TEMP_TASKS_LIST_ID, useProjectTaskStore } from '~/stores/projectTaskStore'

const { t } = useLocalization()
const store = useProjectTaskStore()
const open = computed(() => (store.getTempList()?.tasks ?? []).filter((task) => task.status !== 'DONE').length)
onMounted(() => { void store.fetchTasks(TEMP_TASKS_LIST_ID, true).catch(() => undefined) })
onBeforeUnmount(() => store.releaseRead(TEMP_TASKS_LIST_ID))
</script>
