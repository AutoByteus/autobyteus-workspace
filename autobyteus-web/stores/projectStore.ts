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
import type { Project, ProjectErrorCode } from '~/types/project'

type DocumentNode = ReturnType<typeof gqlTag>

type GraphqlErrorLike = { message?: string; extensions?: Record<string, unknown> }

/** A failed Project request. `code` carries the server `ProjectError` code when there is one. */
export class ProjectRequestError extends Error {
  constructor(message: string, readonly code: ProjectErrorCode | string | null) {
    super(message)
    this.name = 'ProjectRequestError'
  }
}

const toRequestError = (cause: unknown): ProjectRequestError => {
  if (cause instanceof ProjectRequestError) {
    return cause
  }
  const graphqlError = (cause as { graphQLErrors?: GraphqlErrorLike[] } | null)?.graphQLErrors?.[0]
  const code = typeof graphqlError?.extensions?.code === 'string' ? graphqlError.extensions.code : null
  const message = graphqlError?.message || (cause instanceof Error ? cause.message : String(cause))
  return new ProjectRequestError(message, code)
}

const throwGraphqlErrors = (errors: readonly GraphqlErrorLike[] | null | undefined): void => {
  const first = errors?.[0]
  if (!first) {
    return
  }
  const code = typeof first.extensions?.code === 'string' ? first.extensions.code : null
  throw new ProjectRequestError(errors!.map((entry) => entry.message).join(', '), code)
}

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

    const bindingRevisionAtStart = windowNodeContextStore.bindingRevision
    loading.value = true
    error.value = null

    try {
      await ensureBackendReady()
      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return []
      }

      const { data, errors } = await getApolloClient().query({
        query: GetProjects,
        fetchPolicy: 'network-only',
      })
      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return []
      }
      throwGraphqlErrors(errors)

      projects.value = [...((data?.projects ?? []) as Project[])].sort(compareProjects)
      hasFetched.value = true
      return projects.value
    } catch (cause) {
      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return []
      }
      error.value = toRequestError(cause)
      throw error.value
    } finally {
      if (!hasBindingRevisionChanged(bindingRevisionAtStart)) {
        loading.value = false
      }
    }
  }

  /** Loads one Project into the cache. Returns `null` (and drops any cached copy) when it does not exist. */
  const fetchProject = async (projectId: string): Promise<Project | null> => {
    const bindingRevisionAtStart = windowNodeContextStore.bindingRevision
    loading.value = true
    error.value = null

    try {
      await ensureBackendReady()
      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return null
      }

      const { data, errors } = await getApolloClient().query({
        query: GetProject,
        variables: { projectId },
        fetchPolicy: 'network-only',
      })
      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return null
      }
      throwGraphqlErrors(errors)

      const project = (data?.project ?? null) as Project | null
      projects.value = project
        ? upsertProject(projects.value, project)
        : projects.value.filter((entry) => entry.projectId !== projectId)
      return project
    } catch (cause) {
      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return null
      }
      error.value = toRequestError(cause)
      throw error.value
    } finally {
      if (!hasBindingRevisionChanged(bindingRevisionAtStart)) {
        loading.value = false
      }
    }
  }

  const mutate = async <TResult>(
    mutation: DocumentNode,
    variables: Record<string, unknown>,
    field: string,
  ): Promise<{ result: TResult; isCurrentBinding: boolean }> => {
    const bindingRevisionAtStart = windowNodeContextStore.bindingRevision
    try {
      await ensureBackendReady()
      const { data, errors } = await getApolloClient().mutate({ mutation, variables })
      throwGraphqlErrors(errors)
      const result = data?.[field] as TResult | undefined
      if (result === undefined || result === null) {
        throw new ProjectRequestError(`Project request '${field}' returned no result.`, null)
      }
      return { result, isCurrentBinding: !hasBindingRevisionChanged(bindingRevisionAtStart) }
    } catch (cause) {
      throw toRequestError(cause)
    }
  }

  const mutateProject = async (
    mutation: DocumentNode,
    variables: Record<string, unknown>,
    field: string,
  ): Promise<Project> => {
    const { result, isCurrentBinding } = await mutate<Project>(mutation, variables, field)
    if (isCurrentBinding) {
      projects.value = upsertProject(projects.value, result)
    }
    return result
  }

  const createProject = (input: { name: string; description: string }): Promise<Project> =>
    mutateProject(CreateProject, { input }, 'createProject')

  const updateProject = (input: { projectId: string; name: string; description: string }): Promise<Project> =>
    mutateProject(UpdateProject, { input }, 'updateProject')

  const deleteProject = async (projectId: string): Promise<boolean> => {
    const { result, isCurrentBinding } = await mutate<boolean>(DeleteProject, { projectId }, 'deleteProject')
    if (isCurrentBinding) {
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
    createProject,
    updateProject,
    deleteProject,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
  }
})
