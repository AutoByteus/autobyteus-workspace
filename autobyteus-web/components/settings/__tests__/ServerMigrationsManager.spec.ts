import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ServerMigrationsManager from '../ServerMigrationsManager.vue'
import { useAppDataMigrationsStore, type AppDataMigrationRecord } from '~/stores/appDataMigrationsStore'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const createRecord = (
  migrationId: string,
  canRetry: boolean,
): AppDataMigrationRecord => ({
  migrationId,
  displayName: migrationId,
  description: 'Migration description',
  status: 'SUCCEEDED_WITH_WARNINGS',
  requiredOnStartup: true,
  canRetry,
  attempts: 1,
  startedAt: '2026-08-19T12:00:00.000Z',
  completedAt: '2026-08-19T12:01:00.000Z',
  summary: {
    scannedCount: 1,
    migratedCount: 0,
    skippedCount: 1,
    failedCount: 0,
    details: [],
  },
  errorMessage: null,
  logPath: null,
})

describe('ServerMigrationsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps unavailable terminal-warning retry disabled and dispatches only an available retry', async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
      initialState: {
        appDataMigrations: {
          migrations: [
            createRecord('startup-only-warning', false),
            createRecord('manual-warning', true),
          ],
          isLoading: false,
          isRunningById: {},
          error: null,
        },
      },
    })
    setActivePinia(pinia)
    const store = useAppDataMigrationsStore()
    store.fetchMigrations = vi.fn().mockResolvedValue(store.migrations)
    store.runMigration = vi.fn().mockResolvedValue(undefined)

    const wrapper = mount(ServerMigrationsManager, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
    await flushPromises()

    const startupOnlyRetry = wrapper.get(
      '[data-testid="app-data-migration-run-startup-only-warning"]',
    )
    const manualRetry = wrapper.get(
      '[data-testid="app-data-migration-run-manual-warning"]',
    )
    expect(startupOnlyRetry.attributes('disabled')).toBeDefined()
    expect(manualRetry.attributes('disabled')).toBeUndefined()

    await startupOnlyRetry.trigger('click')
    await manualRetry.trigger('click')
    await flushPromises()

    expect(store.runMigration).toHaveBeenCalledOnce()
    expect(store.runMigration).toHaveBeenCalledWith('manual-warning')
  })
})
