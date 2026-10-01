import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useProjectStore } from '~/stores/projectStore'
import { GetProjectTasks } from '~/graphql/queries/projectTaskQueries'
import { CreateProjectTask, DeleteProjectTask, UpdateProjectTask } from '~/graphql/mutations/projectTaskMutations'
import type { ProjectTask } from '~/types/project'
import {
  ProjectRequestError,
  throwProjectGraphqlErrors,
  toProjectRequestError,
} from '~/utils/projects/projectRequestError'

export type ProjectTaskListStatus = 'loading' | 'ready' | 'error'

export interface ProjectTaskListState {
  status: ProjectTaskListStatus
  tasks: ProjectTask[]
  error: ProjectRequestError | null
}

/** Most recently updated first; `taskId` breaks ties (same order as the server). */
const compareTasks = (left: ProjectTask, right: ProjectTask): number => {
  const byUpdated = right.updatedAt.localeCompare(left.updatedAt)
  return byUpdated !== 0 ? byUpdated : left.taskId.localeCompare(right.taskId)
}

const openCount = (tasks: ProjectTask[]): number => tasks.filter((task) => task.status !== 'DONE').length

/**
 * Client cache and request owner for Project Tasks on the bound node, one list per Project.
 * Lists are dropped when the window is rebound to another node, and responses that arrive
 * after a rebinding are discarded. After each successful write the Project's open-Task
 * count is pushed to `projectStore`.
 */
export const useProjectTaskStore = defineStore('projectTasks', () => {
  const listsByProjectId = ref<Record<string, ProjectTaskListState>>({})
  const windowNodeContextStore = useWindowNodeContextStore()
  const inflight = new Map<string, Promise<ProjectTask[]>>()

  const hasBindingRevisionChanged = (bindingRevisionAtStart: number): boolean => (
    windowNodeContextStore.bindingRevision !== bindingRevisionAtStart
  )

  const ensureBackendReady = async (): Promise<void> => {
    const isReady = await windowNodeContextStore.waitForBoundBackendReady()
    if (!isReady) {
      throw new ProjectRequestError(windowNodeContextStore.lastReadyError || 'Bound backend is not ready', null)
    }
  }

  const getList = (projectId: string): ProjectTaskListState | null => listsByProjectId.value[projectId] ?? null

  const setList = (projectId: string, state: ProjectTaskListState): void => {
    listsByProjectId.value = { ...listsByProjectId.value, [projectId]: state }
  }

  const invalidate = (): void => {
    listsByProjectId.value = {}
    inflight.clear()
  }

  /** Drops the cached Tasks of one Project (e.g. after the Project was deleted). */
  const forget = (projectId: string): void => {
    const { [projectId]: _removed, ...rest } = listsByProjectId.value
    listsByProjectId.value = rest
    inflight.delete(projectId)
  }

  const fetchTasks = async (projectId: string, force = false): Promise<ProjectTask[]> => {
    const existing = getList(projectId)
    if (!force && existing?.status === 'ready') {
      return existing.tasks
    }
    const pending = inflight.get(projectId)
    if (pending) {
      return pending
    }

    const bindingRevisionAtStart = windowNodeContextStore.bindingRevision
    setList(projectId, { status: 'loading', tasks: existing?.tasks ?? [], error: null })

    const load = async (): Promise<ProjectTask[]> => {
      try {
        await ensureBackendReady()
        if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
          return []
        }
        const { data, errors } = await getApolloClient().query({
          query: GetProjectTasks,
          variables: { projectId },
          fetchPolicy: 'network-only',
        })
        if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
          return []
        }
        throwProjectGraphqlErrors(errors)
        const tasks = [...((data?.projectTasks ?? []) as ProjectTask[])].sort(compareTasks)
        setList(projectId, { status: 'ready', tasks, error: null })
        return tasks
      } catch (cause) {
        if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
          return []
        }
        const failure = toProjectRequestError(cause)
        setList(projectId, { status: 'error', tasks: [], error: failure })
        throw failure
      }
    }
    const request: Promise<ProjectTask[]> = load().finally(() => {
      if (inflight.get(projectId) === request) {
        inflight.delete(projectId)
      }
    })
    inflight.set(projectId, request)
    return request
  }

  const mutate = async <TResult>(
    mutation: unknown,
    variables: Record<string, unknown>,
    field: string,
  ): Promise<{ result: TResult; isCurrentBinding: boolean }> => {
    const bindingRevisionAtStart = windowNodeContextStore.bindingRevision
    try {
      await ensureBackendReady()
      const { data, errors } = await getApolloClient().mutate({ mutation, variables })
      throwProjectGraphqlErrors(errors)
      const result = data?.[field] as TResult | undefined
      if (result === undefined || result === null) {
        throw new ProjectRequestError(`Project Task request '${field}' returned no result.`, null)
      }
      return { result, isCurrentBinding: !hasBindingRevisionChanged(bindingRevisionAtStart) }
    } catch (cause) {
      throw toProjectRequestError(cause)
    }
  }

  /** Applies a change to a Project's loaded list and pushes the new open count. */
  const applyChange = async (projectId: string, change: (tasks: ProjectTask[]) => ProjectTask[]): Promise<void> => {
    const current = getList(projectId)?.status === 'ready' ? getList(projectId)!.tasks : await fetchTasks(projectId, true)
    const tasks = change(current).sort(compareTasks)
    setList(projectId, { status: 'ready', tasks, error: null })
    useProjectStore().setOpenTaskCount(projectId, openCount(tasks))
  }

  const createTask = async (projectId: string, description: string): Promise<ProjectTask> => {
    const { result, isCurrentBinding } = await mutate<ProjectTask>(
      CreateProjectTask,
      { input: { projectId, description } },
      'createProjectTask',
    )
    if (isCurrentBinding) {
      await applyChange(projectId, (tasks) => [...tasks.filter((task) => task.taskId !== result.taskId), result])
    }
    return result
  }

  const updateTaskDescription = async (projectId: string, taskId: string, description: string): Promise<ProjectTask> => {
    const { result, isCurrentBinding } = await mutate<ProjectTask>(
      UpdateProjectTask,
      { input: { projectId, taskId, description } },
      'updateProjectTask',
    )
    if (isCurrentBinding) {
      await applyChange(projectId, (tasks) => [...tasks.filter((task) => task.taskId !== taskId), result])
    }
    return result
  }

  const deleteTask = async (projectId: string, taskId: string): Promise<boolean> => {
    const { result, isCurrentBinding } = await mutate<boolean>(
      DeleteProjectTask,
      { input: { projectId, taskId } },
      'deleteProjectTask',
    )
    if (isCurrentBinding) {
      await applyChange(projectId, (tasks) => tasks.filter((task) => task.taskId !== taskId))
    }
    return result
  }

  watch(
    () => windowNodeContextStore.bindingRevision,
    () => invalidate(),
    { flush: 'sync' },
  )

  return {
    listsByProjectId,
    getList,
    invalidate,
    forget,
    fetchTasks,
    createTask,
    updateTaskDescription,
    deleteTask,
  }
})
