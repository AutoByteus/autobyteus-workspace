import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppDataMigrationRecoveryAction } from '~/generated/graphql'
import { getCatalog } from '~/localization/runtime/catalogRegistry'
import ServerMigrationsManager from '../ServerMigrationsManager.vue'
import { useAppDataMigrationsStore, type AppDataMigrationRecord } from '~/stores/appDataMigrationsStore'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const createRecord = (
  migrationId: string,
  recoveryAction: AppDataMigrationRecoveryAction,
): AppDataMigrationRecord => ({
  migrationId,
  displayName: migrationId,
  description: 'Migration description',
  status: recoveryAction === AppDataMigrationRecoveryAction.None ? 'SUCCEEDED' : 'FAILED',
  requiredOnStartup: recoveryAction === AppDataMigrationRecoveryAction.RestartToRetry,
  recoveryAction,
  canRetry: recoveryAction === AppDataMigrationRecoveryAction.ManualRetry,
  attempts: 1,
  startedAt: '2026-08-20T12:00:00.000Z',
  completedAt: '2026-08-20T12:01:00.000Z',
  summary: null,
  errorMessage: null,
  logPath: null,
})

const mountManager = (
  migrations: AppDataMigrationRecord[],
  messages: Record<string, string>,
) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      appDataMigrations: {
        migrations,
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
        $t: (key: string) => messages[key] ?? key,
      },
    },
  })
  return { store, wrapper }
}

describe('ServerMigrationsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows exact restart guidance without dispatching and retains manual retry', async () => {
    const { store, wrapper } = mountManager([
      createRecord('startup-only-failed', AppDataMigrationRecoveryAction.RestartToRetry),
      createRecord('manual-failed', AppDataMigrationRecoveryAction.ManualRetry),
      createRecord('terminal', AppDataMigrationRecoveryAction.None),
    ], getCatalog('en'))
    await flushPromises()

    const restartButton = wrapper.get(
      '[data-testid="app-data-migration-run-startup-only-failed"]',
    )
    const manualButton = wrapper.get(
      '[data-testid="app-data-migration-run-manual-failed"]',
    )
    expect(restartButton.attributes('disabled')).toBeDefined()
    expect(manualButton.attributes('disabled')).toBeUndefined()
    expect(wrapper.get(
      '[data-testid="app-data-migration-restart-guidance-startup-only-failed"]',
    ).text()).toBe(
      'This migration can only be retried during startup. Restart AutoByteus to try again.',
    )
    expect(wrapper.find(
      '[data-testid="app-data-migration-restart-guidance-manual-failed"]',
    ).exists()).toBe(false)
    expect(wrapper.find(
      '[data-testid="app-data-migration-restart-guidance-terminal"]',
    ).exists()).toBe(false)

    await restartButton.trigger('click')
    await manualButton.trigger('click')
    await flushPromises()

    expect(store.runMigration).toHaveBeenCalledOnce()
    expect(store.runMigration).toHaveBeenCalledWith('manual-failed')
  })

  it('renders the exact Simplified Chinese restart guidance', async () => {
    const { wrapper } = mountManager([
      createRecord('startup-only-failed', AppDataMigrationRecoveryAction.RestartToRetry),
    ], getCatalog('zh-CN'))
    await flushPromises()

    expect(wrapper.get(
      '[data-testid="app-data-migration-restart-guidance-startup-only-failed"]',
    ).text()).toBe('此迁移只能在启动时重试。请重启 AutoByteus 后再试。')
  })

  it('renders the stored summary string without detail expansion', async () => {
    const record = createRecord('completed', AppDataMigrationRecoveryAction.None)
    record.summary = 'Scanned 158025; migrated 1283; skipped 17; failed 2.'
    const { wrapper } = mountManager([record], getCatalog('en'))
    await flushPromises()

    expect(wrapper.text()).toContain(record.summary)
    expect(wrapper.find('details').exists()).toBe(false)
  })
})
