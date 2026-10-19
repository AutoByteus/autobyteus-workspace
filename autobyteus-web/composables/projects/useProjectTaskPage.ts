import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '~/stores/projectStore'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { taskPagePath } from '~/utils/projects/taskPagePath'
/**
 * The Task page's data, and the only resolver of its route parameter: `taskReference` is a Task's key (any
 * letter case) or its long ID. Consumers use the resolved `task` (its `taskId` for every request). A URL
 * that did not name the exact key is replaced by the key URL (`pageSuffix`, e.g. `/edit`, and the query kept).
 */
export function useProjectTaskPage(projectId: string, taskReference?: string, pageSuffix = '') {
  const projects = useProjectStore(), tasks = useProjectTaskStore(), node = useWindowNodeContextStore(), route = useRoute(), router = useRouter()
  const revision = node.bindingRevision
  let alive = true
  const current = () => alive && node.bindingRevision === revision
  const loading = ref(true), error = ref(''), heading = ref<HTMLElement | null>(null)
  const project = computed(() => projects.getProjectById(projectId))
  const key = taskReference?.toLowerCase()
  const task = computed(() => taskReference ? tasks.getList(projectId)?.tasks.find((t) => t.taskId === taskReference || t.taskKey === key) ?? null : null)
  const taskId = computed(() => task.value?.taskId ?? null)
  const load = async () => {
    loading.value = true; error.value = ''
    try {
      await projects.fetchProject(projectId)
      if (current() && project.value && taskReference) await tasks.fetchTasks(projectId, true)
      if (current() && task.value && taskReference !== task.value.taskKey) await router.replace({path: `${taskPagePath(projectId, task.value)}${pageSuffix}`, query: route.query})
    } catch (e) { if (current()) error.value = e instanceof Error ? e.message : 'Task load failed.' }
    finally { if (current()) {loading.value = false; await nextTick(); heading.value?.focus()} }
  }
  onMounted(load)
  onBeforeUnmount(() => {alive = false; tasks.releaseRead(projectId)})
  return {project, task, taskId, loading, error, heading, current, load}
}
