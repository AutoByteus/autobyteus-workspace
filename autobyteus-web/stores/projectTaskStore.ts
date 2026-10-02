import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useProjectStore } from '~/stores/projectStore'
import { GetProjectTasks } from '~/graphql/queries/projectTaskQueries'
import { CreateProjectTask, DeleteProjectTask, UpdateProjectTask } from '~/graphql/mutations/projectTaskMutations'
import type { ProjectTask, ProjectTaskContextDraft, ProjectTaskContextChanges } from '~/types/project'
import { ProjectRequestError, throwProjectGraphqlErrors, toProjectRequestError } from '~/utils/projects/projectRequestError'
export interface ProjectTaskListState {
  status: 'loading' | 'ready' | 'error'
  tasks: ProjectTask[]
  hasLoaded: boolean
  initialPending: boolean
  refreshPending: boolean
  error: ProjectRequestError | null
}
const empty = (): ProjectTaskListState => ({status: 'loading', tasks: [], hasLoaded: false, initialPending: false, refreshPending: false, error: null})
const compare = (a: ProjectTask, b: ProjectTask) => b.updatedAt.localeCompare(a.updatedAt) || a.taskId.localeCompare(b.taskId)
/** Current-node cache. Generations serve reads/local writes/route lifetimes, not a node-switch workflow. */
export const useProjectTaskStore = defineStore('projectTasks', () => {
  const listsByProjectId = ref<Record<string, ProjectTaskListState>>({})
  const searchByProjectId = ref<Record<string, string>>({})
  const node = useWindowNodeContextStore()
  const inflight = new Map<string, Promise<ProjectTask[]>>()
  const epochs = new Map<string, {read: number; write: number; deleted: number}>()
  const epoch = (id: string) => {
    if (!epochs.has(id)) epochs.set(id, {read: 0, write: 0, deleted: 0})
    return epochs.get(id)!
  }
  const getList = (id: string) => listsByProjectId.value[id] ?? null
  const setList = (id: string, state: ProjectTaskListState) => { listsByProjectId.value = {...listsByProjectId.value, [id]: state} }
  const setSearch = (id: string, search: string) => { searchByProjectId.value = {...searchByProjectId.value, [id]: search} }
  const releaseRead = (id: string) => {
    epoch(id).read++
    inflight.delete(id)
    const state = getList(id)
    if (state) setList(id, {...state, initialPending: false, refreshPending: false})
  }
  const forget = (id: string) => {
    releaseRead(id); epoch(id).deleted++
    const {[id]: _old, ...rest} = listsByProjectId.value; listsByProjectId.value = rest
    const {[id]: _search, ...search} = searchByProjectId.value; searchByProjectId.value = search
  }
  const invalidate = () => {
    for (const id of epochs.keys()) { releaseRead(id); epoch(id).deleted++ }
    listsByProjectId.value = {}; searchByProjectId.value = {}; inflight.clear()
  }
  const ready = async (revision: number) => {
    if (!await node.waitForBoundBackendReady()) throw new ProjectRequestError(node.lastReadyError || 'Bound backend is not ready', null)
    if (node.bindingRevision !== revision) throw new ProjectRequestError('Request no longer belongs to this node.', null)
  }
  const publish = (id: string, tasks: ProjectTask[]) => {
    const sorted = [...tasks].sort(compare)
    setList(id, {status: 'ready', tasks: sorted, hasLoaded: true, initialPending: false, refreshPending: false, error: null})
    useProjectStore().setTaskCounts(id, sorted.length, sorted.filter((t) => t.status !== 'DONE').length)
    return sorted
  }
  const read = async (id: string, refresh: boolean): Promise<ProjectTask[]> => {
    const state = getList(id) ?? empty()
    const owner = epoch(id)
    const token = {revision: node.bindingRevision, read: ++owner.read, write: owner.write, deleted: owner.deleted}
    const client = getApolloClient()
    const current = () => node.bindingRevision === token.revision && owner.read === token.read && owner.write === token.write && owner.deleted === token.deleted
    setList(id, {...state, status: state.hasLoaded ? 'ready' : 'loading', initialPending: !state.hasLoaded, refreshPending: refresh, error: null})
    try {
      await ready(token.revision)
      if (!current()) return []
      const {data, errors} = await client.query({query: GetProjectTasks, variables: {projectId: id}, fetchPolicy: 'network-only', context: {queryDeduplication: false}})
      if (!current()) return []
      throwProjectGraphqlErrors(errors)
      return publish(id, (data?.projectTasks ?? []) as ProjectTask[])
    } catch (cause) {
      if (!current()) return []
      const failure = toProjectRequestError(cause)
      const previous = getList(id) ?? state
      setList(id, {...previous, status: 'error', initialPending: false, refreshPending: false, error: failure})
      throw failure
    }
  }
  const startRead = (id: string, refresh: boolean) => {
    const request = read(id, refresh).finally(() => { if (inflight.get(id) === request) inflight.delete(id) })
    inflight.set(id, request); return request
  }
  const fetchTasks = (id: string, force = false): Promise<ProjectTask[]> => {
    if (force) return startRead(id, true)
    if (getList(id)?.hasLoaded) return Promise.resolve(getList(id)!.tasks)
    return inflight.get(id) ?? startRead(id, false)
  }
  const refreshTasks = (id: string): Promise<ProjectTask[]> => getList(id)?.refreshPending ? inflight.get(id)! : startRead(id, true)
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
  return {listsByProjectId, searchByProjectId, getList, setSearch, invalidate, forget, releaseRead, fetchTasks, refreshTasks, createTask, updateTask, deleteTask}
})
