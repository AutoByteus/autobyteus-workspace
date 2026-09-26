import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

const { apolloClientMock } = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => apolloClientMock),
}))

import { ProjectRequestError, useProjectStore } from '../projectStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'
import type { Project } from '~/types/project'

const project = (projectId: string, name: string, overrides: Partial<Project> = {}): Project => ({
  projectId,
  name,
  description: '',
  createdAt: '2026-09-26T00:00:00.000Z',
  updatedAt: '2026-09-26T00:00:00.000Z',
  workspaces: [],
  ...overrides,
})

describe('projectStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.spyOn(useWindowNodeContextStore(), 'waitForBoundBackendReady').mockResolvedValue(true)
  })

  it('fetches projects sorted by name case-insensitively and caches them', async () => {
    apolloClientMock.query.mockResolvedValue({
      data: { projects: [project('p2', 'zeta'), project('p1', 'Alpha')] },
    })

    const store = useProjectStore()
    await store.fetchProjects()
    await store.fetchProjects()

    expect(apolloClientMock.query).toHaveBeenCalledOnce()
    expect(store.projects.map((entry) => entry.name)).toEqual(['Alpha', 'zeta'])
    expect(store.hasFetched).toBe(true)
  })

  it('records a load error', async () => {
    apolloClientMock.query.mockRejectedValue(new Error('network down'))

    const store = useProjectStore()
    await expect(store.fetchProjects()).rejects.toThrow('network down')
    expect(store.error?.message).toBe('network down')
    expect(store.loading).toBe(false)
  })

  it('reports the backend-not-ready state as an error', async () => {
    vi.spyOn(useWindowNodeContextStore(), 'waitForBoundBackendReady').mockResolvedValue(false)

    const store = useProjectStore()
    await expect(store.fetchProjects()).rejects.toBeInstanceOf(ProjectRequestError)
    expect(apolloClientMock.query).not.toHaveBeenCalled()
  })

  it('creates a project and inserts it into the sorted cache', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { projects: [project('p2', 'zeta')] } })
    apolloClientMock.mutate.mockResolvedValue({ data: { createProject: project('p1', 'autobyteus', { description: 'd' }) } })

    const store = useProjectStore()
    await store.fetchProjects()
    const created = await store.createProject({ name: 'autobyteus', description: 'd' })

    expect(apolloClientMock.mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: { input: { name: 'autobyteus', description: 'd' } },
    }))
    expect(created.projectId).toBe('p1')
    expect(store.projects.map((entry) => entry.projectId)).toEqual(['p1', 'p2'])
  })

  it('surfaces the server error code from a thrown GraphQL error', async () => {
    apolloClientMock.mutate.mockRejectedValue(Object.assign(new Error('GraphQL error'), {
      graphQLErrors: [{ message: 'taken', extensions: { code: 'PROJECT_NAME_TAKEN' } }],
    }))

    const store = useProjectStore()
    const failure = await store.createProject({ name: 'x', description: '' }).catch((error) => error)

    expect(failure).toBeInstanceOf(ProjectRequestError)
    expect(failure.code).toBe('PROJECT_NAME_TAKEN')
    expect(store.projects).toEqual([])
  })

  it('surfaces the server error code from returned GraphQL errors', async () => {
    apolloClientMock.mutate.mockResolvedValue({
      data: null,
      errors: [{ message: 'not registered', extensions: { code: 'WORKSPACE_NOT_REGISTERED' } }],
    })

    const store = useProjectStore()
    await expect(store.addWorkspace('p1', 'agent_ws_x', '')).rejects.toMatchObject({ code: 'WORKSPACE_NOT_REGISTERED' })
  })

  it('links a workspace by explicit id and replaces the cached project', async () => {
    const linked = project('p1', 'autobyteus', {
      workspaces: [{
        workspaceId: 'agent_ws_a',
        workspaceRootPath: '/work/a',
        displayName: 'a',
        description: 'UI',
        addedAt: '2026-09-26T00:00:00.000Z',
        availability: 'AVAILABLE',
      }],
    })
    apolloClientMock.mutate.mockResolvedValue({ data: { addProjectWorkspace: linked } })

    const store = useProjectStore()
    await store.addWorkspace('p1', 'agent_ws_a', 'UI')

    expect(apolloClientMock.mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: { input: { projectId: 'p1', workspaceId: 'agent_ws_a', description: 'UI' } },
    }))
    expect(store.getProjectById('p1')?.workspaces).toHaveLength(1)
  })

  it('removes a deleted project from the cache', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { projects: [project('p1', 'a'), project('p2', 'b')] } })
    apolloClientMock.mutate.mockResolvedValue({ data: { deleteProject: true } })

    const store = useProjectStore()
    await store.fetchProjects()
    await expect(store.deleteProject('p1')).resolves.toBe(true)

    expect(store.projects.map((entry) => entry.projectId)).toEqual(['p2'])
  })

  it('drops a missing project from the cache when fetching it by id', async () => {
    apolloClientMock.query
      .mockResolvedValueOnce({ data: { projects: [project('p1', 'a')] } })
      .mockResolvedValueOnce({ data: { project: null } })

    const store = useProjectStore()
    await store.fetchProjects()
    await expect(store.fetchProject('p1')).resolves.toBeNull()
    expect(store.getProjectById('p1')).toBeNull()
  })

  it('clears the cache when the bound node changes and ignores late responses', async () => {
    let resolveQuery!: (value: unknown) => void
    apolloClientMock.query
      .mockResolvedValueOnce({ data: { projects: [project('p1', 'node A project')] } })
      .mockReturnValueOnce(new Promise((resolve) => { resolveQuery = resolve }))

    const store = useProjectStore()
    await store.fetchProjects()
    const pending = store.fetchProjects(true)
    await vi.waitFor(() => expect(apolloClientMock.query).toHaveBeenCalledTimes(2))

    useWindowNodeContextStore().bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()
    expect(store.projects).toEqual([])
    expect(store.hasFetched).toBe(false)

    resolveQuery({ data: { projects: [project('p1', 'node A project')] } })
    await expect(pending).resolves.toEqual([])
    expect(store.projects).toEqual([])
  })
})
