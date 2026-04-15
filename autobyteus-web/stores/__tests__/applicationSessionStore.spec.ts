import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const {
  apolloClientMock,
  backendReadyMock,
  connectMock,
  disconnectMock,
} = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
  backendReadyMock: {
    waitForBoundBackendReady: vi.fn(),
    getBoundEndpoints: vi.fn(() => ({
      graphqlHttp: 'http://127.0.0.1:43123/graphql',
      graphqlWs: 'ws://127.0.0.1:43123/graphql',
      rest: 'http://127.0.0.1:43123/rest',
    })),
    lastReadyError: null as string | null,
  },
  connectMock: vi.fn(),
  disconnectMock: vi.fn(),
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => apolloClientMock),
}))

vi.mock('~/graphql/queries/applicationSessionQueries', () => ({
  GetApplicationSession: {},
  GetApplicationSessionBinding: {},
}))

vi.mock('~/graphql/mutations/applicationSessionMutations', () => ({
  CreateApplicationSession: {},
  TerminateApplicationSession: {},
  SendApplicationInput: {},
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => backendReadyMock,
}))

vi.mock('~/services/applicationStreaming/ApplicationSessionStreamingService', () => ({
  ApplicationSessionStreamingService: vi.fn().mockImplementation(() => ({
    connect: connectMock,
    disconnect: disconnectMock,
  })),
}))

vi.mock('~/stores/applicationStore', () => ({
  useApplicationStore: () => ({
    getApplicationById: vi.fn(),
    fetchApplicationById: vi.fn(),
  }),
}))

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({
    fetchAllAgentDefinitions: vi.fn(),
    getAgentDefinitionById: vi.fn(),
  }),
}))

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => ({
    fetchAllAgentTeamDefinitions: vi.fn(),
    getAgentTeamDefinitionById: vi.fn(),
  }),
}))

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    workspaces: {},
  }),
}))

import { useApplicationSessionStore } from '../applicationSessionStore'

const buildSessionSnapshot = (applicationSessionId: string) => ({
  applicationSessionId,
  application: {
    applicationId: 'bundle-app__pkg__sample-app',
    localApplicationId: 'sample-app',
    packageId: 'pkg',
    name: 'Sample App',
    description: 'Sample description',
    iconAssetPath: null,
    entryHtmlAssetPath: 'application-bundles/sample-app/assets/ui/index.html',
    writable: true,
  },
  runtime: {
    kind: 'AGENT_TEAM' as const,
    runId: 'team-run-1',
    definitionId: 'bundle-team__pkg__sample-app__sample-team',
  },
  view: {
    delivery: { current: null },
    members: [],
  },
  createdAt: '2026-04-13T10:00:00.000Z',
  terminatedAt: null,
})

describe('applicationSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    backendReadyMock.lastReadyError = null
    backendReadyMock.waitForBoundBackendReady.mockResolvedValue(true)
    vi.clearAllMocks()
  })

  it('binds requested_live sessions from the backend-owned route lookup', async () => {
    const store = useApplicationSessionStore()
    const session = buildSessionSnapshot('app-session-requested')
    apolloClientMock.query.mockResolvedValue({
      data: {
        applicationSessionBinding: {
          applicationId: session.application.applicationId,
          requestedSessionId: session.applicationSessionId,
          resolvedSessionId: session.applicationSessionId,
          resolution: 'requested_live',
          session,
        },
      },
    })

    const binding = await store.bindApplicationRoute(
      session.application.applicationId,
      session.applicationSessionId,
    )

    expect(binding.resolution).toBe('requested_live')
    expect(binding.resolvedSessionId).toBe(session.applicationSessionId)
    expect(store.getSessionById(session.applicationSessionId)?.applicationSessionId).toBe(
      session.applicationSessionId,
    )
    expect(store.getCachedActiveSessionByApplicationId(session.application.applicationId)?.applicationSessionId).toBe(
      session.applicationSessionId,
    )
    expect(connectMock).toHaveBeenCalledWith(
      session.applicationSessionId,
      expect.any(Function),
    )
  })

  it('binds application_active when the requested session is stale but a live active session exists', async () => {
    const store = useApplicationSessionStore()
    const session = buildSessionSnapshot('app-session-active')
    apolloClientMock.query.mockResolvedValue({
      data: {
        applicationSessionBinding: {
          applicationId: session.application.applicationId,
          requestedSessionId: 'stale-session',
          resolvedSessionId: session.applicationSessionId,
          resolution: 'application_active',
          session,
        },
      },
    })

    const binding = await store.bindApplicationRoute(
      session.application.applicationId,
      'stale-session',
    )

    expect(binding).toMatchObject({
      requestedSessionId: 'stale-session',
      resolvedSessionId: session.applicationSessionId,
      resolution: 'application_active',
    })
    expect(store.getCachedActiveSessionByApplicationId(session.application.applicationId)?.applicationSessionId).toBe(
      session.applicationSessionId,
    )
  })

  it('clears cached active binding when the backend reports none', async () => {
    const store = useApplicationSessionStore()
    ;(store as any).sessions = {
      'app-session-old': {
        ...buildSessionSnapshot('app-session-old'),
      },
    }
    ;(store as any).activeSessionIdByApplicationId = {
      'bundle-app__pkg__sample-app': 'app-session-old',
    }

    apolloClientMock.query.mockResolvedValue({
      data: {
        applicationSessionBinding: {
          applicationId: 'bundle-app__pkg__sample-app',
          requestedSessionId: 'app-session-old',
          resolvedSessionId: null,
          resolution: 'none',
          session: null,
        },
      },
    })

    const binding = await store.bindApplicationRoute(
      'bundle-app__pkg__sample-app',
      'app-session-old',
    )

    expect(binding).toEqual({
      applicationId: 'bundle-app__pkg__sample-app',
      requestedSessionId: 'app-session-old',
      resolvedSessionId: null,
      resolution: 'none',
      session: null,
    })
    expect(store.getCachedActiveSessionByApplicationId('bundle-app__pkg__sample-app')).toBeNull()
  })
})
