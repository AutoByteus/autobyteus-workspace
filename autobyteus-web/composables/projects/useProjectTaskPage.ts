import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useProjectStore } from '~/stores/projectStore'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
export function useProjectTaskPage(projectId: string, taskId?: string) {
  const projects = useProjectStore(), tasks = useProjectTaskStore(), node = useWindowNodeContextStore()
  const revision = node.bindingRevision
  let alive = true
  const current = () => alive && node.bindingRevision === revision
  const loading = ref(true), error = ref(''), heading = ref<HTMLElement | null>(null)
  const project = computed(() => projects.getProjectById(projectId))
  const task = computed(() => taskId ? tasks.getList(projectId)?.tasks.find((t) => t.taskId === taskId) ?? null : null)
  const load = async () => {
    loading.value = true; error.value = ''
    try {
      await projects.fetchProject(projectId)
      if (current() && project.value && taskId) await tasks.fetchTasks(projectId, true)
    } catch (e) { if (current()) error.value = e instanceof Error ? e.message : 'Task load failed.' }
    finally { if (current()) {loading.value = false; await nextTick(); heading.value?.focus()} }
  }
  onMounted(load)
  onBeforeUnmount(() => {alive = false; tasks.releaseRead(projectId)})
  return {project, task, loading, error, heading, current, load}
}
