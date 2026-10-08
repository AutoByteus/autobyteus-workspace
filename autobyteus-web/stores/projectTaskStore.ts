import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useProjectStore } from '~/stores/projectStore'
import { GetProjectTasks, GetTasksWithoutProject } from '~/graphql/queries/projectTaskQueries'
import { CreateProjectTask, DeleteProjectTask, UpdateProjectTask } from '~/graphql/mutations/projectTaskMutations'
import type { ProjectChangeMessage, ProjectTask, ProjectTaskContextDraft, ProjectTaskContextChanges, TaskScope, TaskWithoutProject } from '~/types/project'
import { ProjectRequestError, throwProjectGraphqlErrors, toProjectRequestError } from '~/utils/projects/projectRequestError'
import { isOpenTaskStatus, tempTaskLaneOf } from '~/utils/projects/taskStatusPresentation'
export interface TaskListState<T> {
  status: 'loading' | 'ready' | 'error'
  tasks: T[]
  hasLoaded: boolean
  initialPending: boolean
  refreshPending: boolean
  error: ProjectRequestError | null
}
export type ProjectTaskListState = TaskListState<ProjectTask>
export type TempTaskListState = TaskListState<TaskWithoutProject>
type AnyTask = ProjectTask | TaskWithoutProject
type TaskChange = Extract<ProjectChangeMessage, {type: 'task_upserted' | 'task_removed' | 'task_worker_status'}>
/** The list id of the Tasks with no Project ("Temp tasks"); Project lists use their projectId. */
export const TEMP_TASKS_LIST_ID = 'no_project'
/** How long a Task that arrived or moved live stays highlighted (the approved 2.4 s). */
export const LIVE_HIGHLIGHT_MS = 2400
export const listIdOf = (scope: TaskScope): string => scope.kind === 'project' ? scope.projectId : TEMP_TASKS_LIST_ID
const empty = (): TaskListState<AnyTask> => ({status: 'loading', tasks: [], hasLoaded: false, initialPending: false, refreshPending: false, error: null})
const compare = (a: AnyTask, b: AnyTask) => b.updatedAt.localeCompare(a.updatedAt) || a.taskId.localeCompare(b.taskId)
/** The board lane a Task is shown in: Project boards by status; Temp tasks Open, Done or Cancelled. */
const laneOf = (id: string, task: AnyTask) => id === TEMP_TASKS_LIST_ID ? tempTaskLaneOf(task.status) : task.status
/**
 * Current-node cache of Task lists: one per Project, and one for the Tasks with no Project.
 * Snapshots come from reads (load, Refresh, reconnect); the `/ws/projects` feed applies changes in
 * arrival order. While a list's read is in flight its changes are queued and replayed onto the
 * arriving snapshot. Generations serve reads/local writes/route lifetimes, not a node-switch workflow.
 */
export const useProjectTaskStore = defineStore('projectTasks', () => {
  const listsByProjectId = ref<Record<string, TaskListState<AnyTask>>>({})
  const searchByProjectId = ref<Record<string, string>>({})
  /** Tasks that just arrived or moved live, by taskId, for the board highlight. */
  const liveChanges = ref<Record<string, 'arrived' | 'moved'>>({})
  const node = useWindowNodeContextStore()
  const inflight = new Map<string, Promise<AnyTask[]>>()
  const queued = new Map<string, TaskChange[]>()
  const highlightTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const epochs = new Map<string, {read: number; write: number; deleted: number}>()
  const epoch = (id: string) => {
    if (!epochs.has(id)) epochs.set(id, {read: 0, write: 0, deleted: 0})
    return epochs.get(id)!
  }
  const getList = (id: string) => (listsByProjectId.value[id] ?? null) as ProjectTaskListState | null
  const getTempList = () => (listsByProjectId.value[TEMP_TASKS_LIST_ID] ?? null) as TempTaskListState | null
  const setList = (id: string, state: TaskListState<AnyTask>) => { listsByProjectId.value = {...listsByProjectId.value, [id]: state} }
  const setSearch = (id: string, search: string) => { searchByProjectId.value = {...searchByProjectId.value, [id]: search} }
  const releaseRead = (id: string) => {
    epoch(id).read++
    inflight.delete(id)
    const state = listsByProjectId.value[id]
    if (state) setList(id, {...state, initialPending: false, refreshPending: false})
  }
  const forget = (id: string) => {
    releaseRead(id); epoch(id).deleted++; queued.delete(id)
    const {[id]: _old, ...rest} = listsByProjectId.value; listsByProjectId.value = rest
    const {[id]: _search, ...search} = searchByProjectId.value; searchByProjectId.value = search
  }
  const clearHighlights = () => { highlightTimers.forEach((timer) => clearTimeout(timer)); highlightTimers.clear(); liveChanges.value = {} }
  const invalidate = () => {
    for (const id of epochs.keys()) { releaseRead(id); epoch(id).deleted++ }
    listsByProjectId.value = {}; searchByProjectId.value = {}; inflight.clear(); queued.clear(); clearHighlights()
  }
  const ready = async (revision: number) => {
    if (!await node.waitForBoundBackendReady()) throw new ProjectRequestError(node.lastReadyError || 'Bound backend is not ready', null)
    if (node.bindingRevision !== revision) throw new ProjectRequestError('Request no longer belongs to this node.', null)
  }
  const publish = (id: string, tasks: AnyTask[]) => {
    const sorted = [...tasks].sort(compare)
    setList(id, {status: 'ready', tasks: sorted, hasLoaded: true, initialPending: false, refreshPending: false, error: null})
    if (id !== TEMP_TASKS_LIST_ID) useProjectStore().setTaskCounts(id, sorted.length, sorted.filter((t) => isOpenTaskStatus(t.status)).length)
    return sorted
  }
  const highlight = (taskId: string, change: 'arrived' | 'moved') => {
    clearTimeout(highlightTimers.get(taskId))
    liveChanges.value = {...liveChanges.value, [taskId]: change}
    highlightTimers.set(taskId, setTimeout(() => {
      highlightTimers.delete(taskId)
      const {[taskId]: _done, ...rest} = liveChanges.value; liveChanges.value = rest
    }, LIVE_HIGHLIGHT_MS))
  }
  /** Applies one Task change to a loaded list; a list not loaded yet reads it fresh when it is opened. */
  const applyToList = (id: string, message: TaskChange) => {
    const state = listsByProjectId.value[id]
    if (!state?.hasLoaded) return
    if (message.type === 'task_upserted') {
      const before = state.tasks.find((task) => task.taskId === message.task.taskId)
      if (!before) highlight(message.task.taskId, 'arrived')
      else if (laneOf(id, before) !== laneOf(id, message.task)) highlight(message.task.taskId, 'moved')
      publish(id, [...state.tasks.filter((task) => task.taskId !== message.task.taskId), message.task])
    } else if (message.type === 'task_removed') {
      if (state.tasks.some((task) => task.taskId === message.taskId)) publish(id, state.tasks.filter((task) => task.taskId !== message.taskId))
    } else if (state.tasks.some((task) => task.taskId === message.taskId && task.root)) {
      publish(id, state.tasks.map((task) => task.taskId === message.taskId && task.root ? {...task, root: {...task.root, status: message.status}} : task))
    }
  }
  const replayQueued = (id: string) => {
    const pending = queued.get(id) ?? []
    queued.delete(id)
    for (const message of pending) applyToList(id, message)
  }
  const read = async (id: string, refresh: boolean): Promise<AnyTask[]> => {
    const state = listsByProjectId.value[id] ?? empty()
    const owner = epoch(id)
    const token = {revision: node.bindingRevision, read: ++owner.read, write: owner.write, deleted: owner.deleted}
    const client = getApolloClient()
    const current = () => node.bindingRevision === token.revision && owner.read === token.read && owner.write === token.write && owner.deleted === token.deleted
    setList(id, {...state, status: state.hasLoaded ? 'ready' : 'loading', initialPending: !state.hasLoaded, refreshPending: refresh, error: null})
    try {
      await ready(token.revision)
      if (!current()) return []
      const temp = id === TEMP_TASKS_LIST_ID
      const {data, errors} = await client.query({query: temp ? GetTasksWithoutProject : GetProjectTasks, variables: temp ? {} : {projectId: id},
        fetchPolicy: 'network-only', context: {queryDeduplication: false}})
      if (!current()) return []
      throwProjectGraphqlErrors(errors)
      const published = publish(id, ((temp ? data?.tasksWithoutProject : data?.projectTasks) ?? []) as AnyTask[])
      replayQueued(id)
      return published
    } catch (cause) {
      if (!current()) return []
      const failure = toProjectRequestError(cause)
      const previous = listsByProjectId.value[id] ?? state
      setList(id, {...previous, status: 'error', initialPending: false, refreshPending: false, error: failure})
      replayQueued(id)
      throw failure
    }
  }
  const startRead = (id: string, refresh: boolean) => {
    const request = read(id, refresh).finally(() => { if (inflight.get(id) === request) inflight.delete(id) })
    inflight.set(id, request); return request
  }
  const fetchTasks = (id: string, force = false): Promise<AnyTask[]> => {
    if (force) return startRead(id, true)
    if (listsByProjectId.value[id]?.hasLoaded) return Promise.resolve(listsByProjectId.value[id]!.tasks)
    return inflight.get(id) ?? startRead(id, false)
  }
  const refreshTasks = (id: string): Promise<AnyTask[]> => listsByProjectId.value[id]?.refreshPending ? inflight.get(id)! : startRead(id, true)
  /**
   * One `/ws/projects` change. `connected` (the first connection or a reconnect) re-reads every
   * loaded list, because changes may have been missed while disconnected. A removed Project's list goes.
   */
  const applyChange = (message: ProjectChangeMessage) => {
    if (message.type === 'connected') {
      for (const [id, state] of Object.entries(listsByProjectId.value)) if (state.hasLoaded) void startRead(id, false).catch(() => undefined)
      return
    }
    if (message.type === 'project_upserted') return
    if (message.type === 'project_removed') { forget(message.projectId); return }
    const id = listIdOf(message.scope)
    if (inflight.has(id)) queued.set(id, [...(queued.get(id) ?? []), message])
    else applyToList(id, message)
  }
  const mutate = async <T>(id: string, mutation: unknown, input: Record<string, unknown>, field: string, change: (tasks: ProjectTask[], result: T) => ProjectTask[], eligible: () => boolean = () => true): Promise<T> => {
    const revision = node.bindingRevision
    const client = getApolloClient()
    const owner = epoch(id), deleted = owner.deleted
    owner.write++; releaseRead(id)
    const current = () => node.bindingRevision === revision && owner.deleted === deleted && eligible()
    try {
      await ready(revision)
      if (!current()) throw new ProjectRequestError('Task draft is no longer current.', null)
      const {data, errors} = await client.mutate({mutation, variables: {input}})
      throwProjectGraphqlErrors(errors)
      const result = data?.[field] as T | undefined
      if (result == null) throw new ProjectRequestError('Task mutation returned no result.', null)
      owner.write++; releaseRead(id)
      if (current()) {
        const loaded = getList(id)
        if (loaded?.hasLoaded) publish(id, change(loaded.tasks, result))
        else await startRead(id, false).catch(() => undefined) // A returned Task is not a complete count snapshot.
      }
      return result
    } catch (cause) { throw toProjectRequestError(cause) }
    finally { owner.write++; if (current()) releaseRead(id) }
  }
  const createTask = (projectId: string, description: string, contextDraft?: ProjectTaskContextDraft, eligible?: () => boolean) => mutate<ProjectTask>(projectId, CreateProjectTask,
    {projectId, description, ...(contextDraft ? {contextDraft} : {})}, 'createProjectTask', (tasks, result) => [...tasks.filter((t) => t.taskId !== result.taskId), result], eligible)
  const updateTask = (projectId: string, taskId: string, description: string, contextChanges?: ProjectTaskContextChanges, eligible?: () => boolean) => mutate<ProjectTask>(projectId, UpdateProjectTask,
    {projectId, taskId, description, ...(contextChanges ? {contextChanges} : {})}, 'updateProjectTask', (tasks, result) => [...tasks.filter((t) => t.taskId !== taskId), result], eligible)
  const deleteTask = (projectId: string, taskId: string, eligible?: () => boolean) => mutate<boolean>(projectId, DeleteProjectTask, {projectId, taskId}, 'deleteProjectTask', (tasks) => tasks.filter((t) => t.taskId !== taskId), eligible)
  watch(() => node.bindingRevision, invalidate, {flush: 'sync'})
  return {listsByProjectId, searchByProjectId, liveChanges, getList, getTempList, setSearch, invalidate, forget, releaseRead, fetchTasks, refreshTasks,
    applyChange, createTask, updateTask, deleteTask}
})
