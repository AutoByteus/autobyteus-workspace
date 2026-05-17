import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppDataMigrationsStore } from '~/stores/appDataMigrationsStore'

const { apolloClientMock, windowNodeContextStoreMock } = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
  windowNodeContextStoreMock: {
    waitForBoundBackendReady: vi.fn(),
    lastReadyError: null as string | null,
  },
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => apolloClientMock,
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}))

describe('appDataMigrationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    windowNodeContextStoreMock.waitForBoundBackendReady.mockResolvedValue(true)
    windowNodeContextStoreMock.lastReadyError = null
  })

  it('fetches registered migration statuses', async () => {
    apolloClientMock.query.mockResolvedValue({
      data: {
        getAppDataMigrations: [
          {
            migrationId: '20260517_team_run_metadata_member_tree',
            displayName: 'Team run metadata member tree migration',
            description: 'Converts metadata',
            status: 'FAILED',
            requiredOnStartup: true,
            canRetry: true,
            attempts: 1,
            startedAt: null,
            completedAt: null,
            summary: null,
            errorMessage: 'failed',
            logPath: '/tmp/log',
          },
        ],
      },
    })

    const store = useAppDataMigrationsStore()
    await store.fetchMigrations()

    expect(store.migrations).toHaveLength(1)
    expect(store.migrations[0]?.canRetry).toBe(true)
    expect(apolloClientMock.query).toHaveBeenCalledWith(expect.objectContaining({ fetchPolicy: 'network-only' }))
  })

  it('runs a migration and refreshes status', async () => {
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        runAppDataMigration: {
          success: true,
          message: 'ok',
          migration: null,
        },
      },
    })
    apolloClientMock.query.mockResolvedValue({ data: { getAppDataMigrations: [] } })

    const store = useAppDataMigrationsStore()
    await store.runMigration('m1')

    expect(apolloClientMock.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { migrationId: 'm1' } }))
    expect(store.isRunningById.m1).toBeUndefined()
  })
})
