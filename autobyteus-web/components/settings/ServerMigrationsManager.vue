<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">{{ $t('settings.components.settings.ServerMigrationsManager.title') }}</h2>
        <p class="mt-1 text-sm text-slate-600">{{ $t('settings.components.settings.ServerMigrationsManager.description') }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        :disabled="store.isLoading"
        data-testid="app-data-migrations-refresh"
        @click="refresh"
      >
        <span v-if="store.isLoading" class="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></span>
        <span v-else class="i-heroicons-arrow-path-20-solid h-4 w-4"></span>
        {{ $t('settings.components.settings.ServerMigrationsManager.refresh') }}
      </button>
    </div>

    <div v-if="store.error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ store.error }}
    </div>

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div v-if="store.isLoading && store.migrations.length === 0" class="flex items-center justify-center py-10">
        <span class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></span>
      </div>

      <table v-else class="min-w-full divide-y divide-slate-200">
        <thead class="bg-blue-50 text-left text-xs font-semibold uppercase tracking-wide text-blue-700">
          <tr>
            <th class="px-5 py-3">{{ $t('settings.components.settings.ServerMigrationsManager.migration') }}</th>
            <th class="px-5 py-3">{{ $t('settings.components.settings.ServerMigrationsManager.status') }}</th>
            <th class="px-5 py-3">{{ $t('settings.components.settings.ServerMigrationsManager.summary') }}</th>
            <th class="px-5 py-3">{{ $t('settings.components.settings.ServerMigrationsManager.lastAttempt') }}</th>
            <th class="px-5 py-3 text-right">{{ $t('settings.components.settings.ServerMigrationsManager.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          <tr v-for="migration in store.migrations" :key="migration.migrationId" class="align-top">
            <td class="px-5 py-4">
              <div class="font-medium text-slate-900">{{ migration.displayName }}</div>
              <div class="mt-1 text-xs text-slate-500">{{ migration.migrationId }}</div>
              <p class="mt-2 text-sm text-slate-600">{{ migration.description }}</p>
              <p v-if="migration.logPath" class="mt-2 break-all text-xs text-slate-500">
                {{ $t('settings.components.settings.ServerMigrationsManager.logPath') }}: {{ migration.logPath }}
              </p>
            </td>
            <td class="px-5 py-4">
              <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(migration.status)">
                {{ statusLabel(migration.status) }}
              </span>
              <div class="mt-2 text-xs text-slate-500">
                {{ $t('settings.components.settings.ServerMigrationsManager.attempts', { count: migration.attempts }) }}
              </div>
              <div v-if="migration.errorMessage" class="mt-2 max-w-xs text-sm text-red-700">
                {{ migration.errorMessage }}
              </div>
            </td>
            <td class="px-5 py-4 text-sm text-slate-700">
              <div v-if="migration.summary">
                {{ $t('settings.components.settings.ServerMigrationsManager.counts', {
                  scanned: migration.summary.scannedCount,
                  migrated: migration.summary.migratedCount,
                  skipped: migration.summary.skippedCount,
                  failed: migration.summary.failedCount,
                }) }}
                <details v-if="migration.summary.details.length > 0" class="mt-2">
                  <summary class="cursor-pointer text-blue-700">{{ $t('settings.components.settings.ServerMigrationsManager.showDetails') }}</summary>
                  <ul class="mt-2 max-h-52 space-y-1 overflow-auto pr-2 text-xs text-slate-600">
                    <li v-for="detail in migration.summary.details" :key="`${detail.itemId}-${detail.status}`" class="rounded bg-slate-50 p-2">
                      <span class="font-semibold">{{ detail.status }}</span>
                      <span> · {{ detail.itemId }}</span>
                      <div>{{ detail.message }}</div>
                      <div v-if="detail.filePath" class="break-all text-slate-500">{{ detail.filePath }}</div>
                    </li>
                  </ul>
                </details>
              </div>
              <span v-else class="text-slate-500">{{ $t('settings.components.settings.ServerMigrationsManager.noSummary') }}</span>
            </td>
            <td class="px-5 py-4 text-sm text-slate-600">
              <div>{{ formatDate(migration.startedAt) }}</div>
              <div class="mt-1 text-xs text-slate-500">{{ formatDate(migration.completedAt) }}</div>
            </td>
            <td class="px-5 py-4 text-right">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
                :disabled="!migration.canRetry || Boolean(store.isRunningById[migration.migrationId])"
                :data-testid="`app-data-migration-run-${migration.migrationId}`"
                @click="retry(migration.migrationId)"
              >
                <span v-if="store.isRunningById[migration.migrationId]" class="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></span>
                <span v-else class="i-heroicons-play-20-solid h-4 w-4"></span>
                {{ $t('settings.components.settings.ServerMigrationsManager.retry') }}
              </button>
            </td>
          </tr>
          <tr v-if="store.migrations.length === 0">
            <td colspan="5" class="px-5 py-8 text-center text-sm text-slate-500">
              {{ $t('settings.components.settings.ServerMigrationsManager.empty') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppDataMigrationsStore, type AppDataMigrationStatus } from '~/stores/appDataMigrationsStore'

const store = useAppDataMigrationsStore()

const refresh = async () => {
  await store.fetchMigrations().catch(() => undefined)
}

const retry = async (migrationId: string) => {
  await store.runMigration(migrationId).catch(() => undefined)
}

const statusClass = (status: AppDataMigrationStatus): string => {
  if (status === 'SUCCEEDED') return 'bg-green-100 text-green-800'
  if (status === 'SUCCEEDED_WITH_WARNINGS') return 'bg-amber-100 text-amber-800'
  if (status === 'FAILED') return 'bg-red-100 text-red-800'
  if (status === 'RUNNING') return 'bg-blue-100 text-blue-800'
  return 'bg-slate-100 text-slate-700'
}

const statusLabel = (status: AppDataMigrationStatus): string => status.replace(/_/g, ' ')

const formatDate = (value: string | null): string => {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

onMounted(refresh)
</script>
