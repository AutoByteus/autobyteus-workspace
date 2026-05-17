import { defineStore } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { GetAppDataMigrations } from '~/graphql/queries/app_data_migrations_queries'
import { RunAppDataMigration } from '~/graphql/mutations/app_data_migrations_mutations'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

export type AppDataMigrationStatus =
  | 'NOT_RUN'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'SUCCEEDED_WITH_WARNINGS'

export interface AppDataMigrationSummary {
  scannedCount: number
  migratedCount: number
  skippedCount: number
  failedCount: number
  details: Array<{
    itemId: string
    filePath?: string | null
    status: string
    message: string
    backupPath?: string | null
  }>
}

export interface AppDataMigrationRecord {
  migrationId: string
  displayName: string
  description: string
  status: AppDataMigrationStatus
  requiredOnStartup: boolean
  canRetry: boolean
  attempts: number
  startedAt: string | null
  completedAt: string | null
  summary: AppDataMigrationSummary | null
  errorMessage: string | null
  logPath: string | null
}

type AppDataMigrationsQueryData = {
  getAppDataMigrations: AppDataMigrationRecord[]
}

type RunAppDataMigrationMutationData = {
  runAppDataMigration: {
    success: boolean
    message: string
    migration: AppDataMigrationRecord | null
  }
}

const ensureBoundBackendReady = async (): Promise<void> => {
  const windowNodeContextStore = useWindowNodeContextStore()
  const isReady = await windowNodeContextStore.waitForBoundBackendReady()
  if (!isReady) {
    throw new Error(windowNodeContextStore.lastReadyError || 'Bound backend is not ready')
  }
}

const normalizeRecord = (record: AppDataMigrationRecord): AppDataMigrationRecord => ({
  ...record,
  startedAt: record.startedAt ?? null,
  completedAt: record.completedAt ?? null,
  summary: record.summary ?? null,
  errorMessage: record.errorMessage ?? null,
  logPath: record.logPath ?? null,
})

export const useAppDataMigrationsStore = defineStore('appDataMigrations', {
  state: () => ({
    migrations: [] as AppDataMigrationRecord[],
    isLoading: false,
    isRunningById: {} as Record<string, boolean>,
    error: null as string | null,
  }),
  actions: {
    async fetchMigrations(): Promise<AppDataMigrationRecord[]> {
      this.isLoading = true
      this.error = null
      try {
        await ensureBoundBackendReady()
        const { data, errors } = await getApolloClient().query<AppDataMigrationsQueryData>({
          query: GetAppDataMigrations,
          fetchPolicy: 'network-only',
        })
        if (errors?.length) {
          throw new Error(errors.map((error) => error.message).join(', '))
        }
        this.migrations = (data?.getAppDataMigrations ?? []).map(normalizeRecord)
        return this.migrations
      } catch (error: any) {
        this.error = error?.message || 'Failed to load app data migrations.'
        this.migrations = []
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async runMigration(migrationId: string): Promise<void> {
      const normalizedMigrationId = migrationId.trim()
      if (!normalizedMigrationId) {
        throw new Error('Migration ID is required.')
      }
      this.isRunningById = { ...this.isRunningById, [normalizedMigrationId]: true }
      this.error = null
      try {
        await ensureBoundBackendReady()
        const { data, errors } = await getApolloClient().mutate<RunAppDataMigrationMutationData>({
          mutation: RunAppDataMigration,
          variables: { migrationId: normalizedMigrationId },
        })
        if (errors?.length) {
          throw new Error(errors.map((error) => error.message).join(', '))
        }
        const result = data?.runAppDataMigration
        if (!result) {
          throw new Error('Migration retry returned no result.')
        }
        if (!result.success) {
          throw new Error(result.message || 'Migration retry failed.')
        }
        await this.fetchMigrations()
      } catch (error: any) {
        this.error = error?.message || 'Migration retry failed.'
        await this.fetchMigrations().catch(() => undefined)
        throw error
      } finally {
        const next = { ...this.isRunningById }
        delete next[normalizedMigrationId]
        this.isRunningById = next
      }
    },
  },
})
