import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type gqlTag from 'graphql-tag'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { GetProject, GetProjects } from '~/graphql/queries/projectQueries'
import {
  AddProjectWorkspace,
  CreateProject,
  DeleteProject,
  RemoveProjectWorkspace,
  UpdateProject,
  UpdateProjectWorkspace,
} from '~/graphql/mutations/projectMutations'
import type { Project, ProjectChangeMessage, ProjectWorkspaceInput } from '~/types/project'
import {
  ProjectRequestError,
  throwProjectGraphqlErrors as throwGraphqlErrors,
  toProjectRequestError as toRequestError,
} from '~/utils/projects/projectRequestError'

type DocumentNode = ReturnType<typeof gqlTag>

const compareProjects = (left: Project, right: Project): number => {
  const byName = left.name.toLocaleLowerCase().localeCompare(right.name.toLocaleLowerCase())
  return byName !== 0 ? byName : left.projectId.localeCompare(right.projectId)
}

const upsertProject = (projects: Project[], project: Project): Project[] =>
  [...projects.filter((entry) => entry.projectId !== project.projectId), project].sort(compareProjects)

/**
 * Client cache and request owner for the bound node's Projects. The cache is
 * dropped whenever the window is rebound to another node, and responses that
 * arrive after a rebinding are discarded.
 */
export const useProjectStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const error = ref<ProjectRequestError | null>(null)
  const hasFetched = ref(false)
  let mutationEpoch = 0, listRead = 0, countGeneration = 0
  const projectReads = new Map<string, number>()
  const counts = new Map<string, {generation: number; taskCount: number; openTaskCount: number}>()
  const mergeCounts = (project: Project, atStart: number): Project => {
    const newer = counts.get(project.projectId)
    return newer && newer.generation > atStart ? {...project, taskCount: newer.taskCount, openTaskCount: newer.openTaskCount} : project
  }
  const windowNodeContextStore = useWindowNodeContextStore()

  const hasBindingRevisionChanged = (bindingRevisionAtStart: number): boolean => (
    windowNodeContextStore.bindingRevision !== bindingRevisionAtStart
  )

  const ensureBackendReady = async (): Promise<void> => {
    const isReady = await windowNodeContextStore.waitForBoundBackendReady()
    if (!isReady) {
      throw new ProjectRequestError(windowNodeContextStore.lastReadyError || 'Bound backend is not ready', null)
    }
  }

  const invalidate = (): void => {
    mutationEpoch++; listRead++; projectReads.clear(); counts.clear()
    projects.value = []
    loading.value = false
    error.value = null
    hasFetched.value = false
  }

  const getProjectById = (projectId: string): Project | null =>
    projects.value.find((project) => project.projectId === projectId) ?? null

  const fetchProjects = async (force = false): Promise<Project[]> => {
    if (hasFetched.value && !force) {
      return projects.value
    }

    const client = getApolloClient()
    const bindingRevisionAtStart = windowNodeContextStore.bindingRevision
    const readToken = ++listRead, epoch = mutationEpoch, countAtStart = countGeneration
    const current = () => !hasBindingRevisionChanged(bindingRevisionAtStart) && readToken === listRead && epoch === mutationEpoch
    loading.value = true
    error.value = null

    try {
      await ensureBackendReady()
      if (!current()) {
        return []
      }

      const { data, errors } = await client.query({
        query: GetProjects,
        fetchPolicy: 'network-only', context: {queryDeduplication: false},
      })
      if (!current()) {
        return []
      }
      throwGraphqlErrors(errors)

      projects.value = [...((data?.projects ?? []) as Project[])].map((p) => mergeCounts(p, countAtStart)).sort(compareProjects)
      hasFetched.value = true
      return projects.value
    } catch (cause) {
      if (!current()) {
        return []
      }
      error.value = toRequestError(cause)
      throw error.value
    } finally {
      if (readToken === listRead && !hasBindingRevisionChanged(bindingRevisionAtStart)) {
        loading.value = false
      }
    }
  }

  /**
   * Loads one Project into the cache. Returns `null` (and drops any cached copy) when it does not exist.
   * It does not touch the list's `loading`/`error`: the caller owns the detail load state, so a
   * detail load or failure never blanks or flags the Project list shown beside it.
   */
  const fetchProject = async (projectId: string): Promise<Project | null> => {
    const client = getApolloClient()
    const bindingRevisionAtStart = windowNodeContextStore.bindingRevision

    const readToken = (projectReads.get(projectId) ?? 0) + 1, epoch = mutationEpoch, countAtStart = countGeneration
    projectReads.set(projectId, readToken)
    const current = () => !hasBindingRevisionChanged(bindingRevisionAtStart) && epoch === mutationEpoch && projectReads.get(projectId) === readToken
    try {
      await ensureBackendReady()
      if (!current()) {
        return null
      }

      const { data, errors } = await client.query({
        query: GetProject,
        variables: { projectId },
        fetchPolicy: 'network-only', context: {queryDeduplication: false},
      })
      if (!current()) {
        return null
      }
      throwGraphqlErrors(errors)

      const result = (data?.project ?? null) as Project | null
      const project = result ? mergeCounts(result, countAtStart) : null
      projects.value = project
        ? upsertProject(projects.value, project)
        : projects.value.filter((entry) => entry.projectId !== projectId)
      return project
    } catch (cause) {
      if (!current()) {
        return null
      }
      throw toRequestError(cause)
    }
  }

  /** Counts originate only in complete Task snapshots or computed Project responses. */
  const setTaskCounts = (projectId: string, taskCount: number, openTaskCount: number): void => {
    counts.set(projectId, {generation: ++countGeneration, taskCount, openTaskCount})
    projects.value = projects.value.map((project) => project.projectId === projectId ? {...project, taskCount, openTaskCount} : project)
  }

  const mutate = async <TResult>(
    mutation: DocumentNode,
    variables: Record<string, unknown>,
    field: string,
    eligible: () => boolean = () => true,
  ): Promise<{ result: TResult; isCurrentBinding: boolean }> => {
    const client = getApolloClient()
    const bindingRevisionAtStart = windowNodeContextStore.bindingRevision
    mutationEpoch++
    try {
      await ensureBackendReady()
      if (hasBindingRevisionChanged(bindingRevisionAtStart) || !eligible()) throw new ProjectRequestError('Request no longer belongs to this node.', null)
      const { data, errors } = await client.mutate({ mutation, variables })
      mutationEpoch++
      throwGraphqlErrors(errors)
      const result = data?.[field] as TResult | undefined
      if (result === undefined || result === null) {
        throw new ProjectRequestError(`Project request '${field}' returned no result.`, null)
      }
      return { result, isCurrentBinding: !hasBindingRevisionChanged(bindingRevisionAtStart) && eligible() }
    } catch (cause) {
      throw toRequestError(cause)
    }
  }

  const mutateProject = async (
    mutation: DocumentNode,
    variables: Record<string, unknown>,
    field: string,
    eligible: () => boolean = () => true,
  ): Promise<Project> => {
    const countAtStart = countGeneration
    const { result, isCurrentBinding } = await mutate<Project>(mutation, variables, field, eligible)
    if (isCurrentBinding) {
      projects.value = upsertProject(projects.value, mergeCounts(result, countAtStart))
    }
    return result
  }

  const createProject = (input: { name: string; description: string; workspaces?: ProjectWorkspaceInput[] }, eligible?: () => boolean): Promise<Project> =>
    mutateProject(CreateProject, { input }, 'createProject', eligible)

  const updateProject = (input: { projectId: string; name: string; description: string; workspaces?: ProjectWorkspaceInput[] }, eligible?: () => boolean): Promise<Project> =>
    mutateProject(UpdateProject, { input }, 'updateProject', eligible)

  const deleteProject = async (projectId: string, eligible?: () => boolean): Promise<boolean> => {
    const { result, isCurrentBinding } = await mutate<boolean>(DeleteProject, { projectId }, 'deleteProject', eligible)
    if (isCurrentBinding) {
      counts.delete(projectId)
      projects.value = projects.value.filter((project) => project.projectId !== projectId)
    }
    return result
  }

  const addWorkspace = (projectId: string, workspaceId: string, description: string): Promise<Project> =>
    mutateProject(AddProjectWorkspace, { input: { projectId, workspaceId, description } }, 'addProjectWorkspace')

  const updateWorkspace = (projectId: string, workspaceId: string, description: string): Promise<Project> =>
    mutateProject(UpdateProjectWorkspace, { input: { projectId, workspaceId, description } }, 'updateProjectWorkspace')

  const removeWorkspace = (projectId: string, workspaceId: string): Promise<Project> =>
    mutateProject(RemoveProjectWorkspace, { input: { projectId, workspaceId } }, 'removeProjectWorkspace')

  /**
   * One `/ws/projects` Project change: the server view (with its counts) replaces the cached one;
   * a removed Project leaves. `connected` (first connection or reconnect) re-reads a fetched list.
   */
  const applyChange = (message: ProjectChangeMessage): void => {
    if (message.type === 'connected') {
      if (hasFetched.value) void fetchProjects(true).catch(() => undefined)
      return
    }
    if (message.type === 'project_upserted') {
      const { project } = message
      if (!hasFetched.value && !getProjectById(project.projectId)) return
      counts.set(project.projectId, { generation: ++countGeneration, taskCount: project.taskCount, openTaskCount: project.openTaskCount })
      projects.value = upsertProject(projects.value, project)
    } else if (message.type === 'project_removed') {
      counts.delete(message.projectId)
      projects.value = projects.value.filter((project) => project.projectId !== message.projectId)
    }
  }

  watch(
    () => windowNodeContextStore.bindingRevision,
    () => invalidate(),
    { flush: 'sync' },
  )

  return {
    projects,
    loading,
    error,
    hasFetched,
    getProjectById,
    invalidate,
    fetchProjects,
    fetchProject,
    setTaskCounts,
    applyChange,
    createProject,
    updateProject,
    deleteProject,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
  }
})
