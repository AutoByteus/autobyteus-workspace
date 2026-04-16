<template>
  <section class="w-full max-w-5xl" data-testid="application-packages-manager">
    <div class="mb-4">
      <h2 class="text-xl font-semibold text-gray-900">{{ $t('settings.components.settings.ApplicationPackagesManager.title') }}</h2>
      <p class="mt-1 text-sm text-gray-600">
        {{ $t('settings.components.settings.ApplicationPackagesManager.description') }}
      </p>
    </div>

    <div v-if="error" class="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ error }}
    </div>
    <div
      v-if="successMessage"
      class="mb-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
      data-testid="application-packages-success"
    >
      {{ successMessage }}
    </div>

    <div class="mb-4 rounded border border-gray-200 bg-white">
      <ul class="divide-y divide-gray-100">
        <li
          v-for="pkg in sortedPackages"
          :key="pkg.packageId"
          class="px-4 py-3"
          :data-testid="`application-package-row-${pkg.sourceKind.toLowerCase()}`"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <div class="truncate text-sm font-semibold text-gray-900" :title="pkg.displayName">
                  {{ pkg.displayName }}
                </div>
                <span
                  class="rounded px-2 py-0.5 text-[11px] font-medium"
                  :class="pkg.isPlatformOwned ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'"
                >
                  {{ pkg.isPlatformOwned ? $t('settings.components.settings.ApplicationPackagesManager.platformOwned') : sourceKindLabel(pkg.sourceKind) }}
                </span>
              </div>
              <div class="mt-1 text-xs text-gray-500">
                {{ sourceKindLabel(pkg.sourceKind) }} · {{ $t('settings.components.settings.ApplicationPackagesManager.applicationsCount', { count: pkg.applicationCount }) }}
              </div>
              <div v-if="pkg.sourceSummary" class="mt-1 break-all text-xs text-gray-600">
                {{ pkg.sourceSummary }}
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button
                type="button"
                class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="loading"
                @click="toggleDetails(pkg.packageId)"
              >
                {{ isExpanded(pkg.packageId)
                  ? $t('settings.components.settings.ApplicationPackagesManager.hideDetails')
                  : $t('settings.components.settings.ApplicationPackagesManager.showDetails') }}
              </button>
              <button
                v-if="pkg.isRemovable"
                type="button"
                class="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="loading"
                @click="handleRemove(pkg.packageId)"
              >
                {{ $t('settings.components.settings.ApplicationPackagesManager.remove') }}
              </button>
            </div>
          </div>

          <div v-if="isExpanded(pkg.packageId)" class="mt-3 rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
            <div v-if="detailsLoadingPackageId === pkg.packageId" class="text-gray-500">
              {{ $t('settings.components.settings.ApplicationPackagesManager.loadingDetails') }}
            </div>
            <dl v-else-if="detailsForPackage(pkg.packageId)" class="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
              <div>
                <dt class="font-semibold text-gray-500">{{ $t('settings.components.settings.ApplicationPackagesManager.details.rootPath') }}</dt>
                <dd class="break-all">{{ detailsForPackage(pkg.packageId)?.rootPath }}</dd>
              </div>
              <div>
                <dt class="font-semibold text-gray-500">{{ $t('settings.components.settings.ApplicationPackagesManager.details.source') }}</dt>
                <dd class="break-all">{{ detailsForPackage(pkg.packageId)?.source }}</dd>
              </div>
              <div v-if="detailsForPackage(pkg.packageId)?.managedInstallPath">
                <dt class="font-semibold text-gray-500">{{ $t('settings.components.settings.ApplicationPackagesManager.details.managedInstallPath') }}</dt>
                <dd class="break-all">{{ detailsForPackage(pkg.packageId)?.managedInstallPath }}</dd>
              </div>
              <div v-if="detailsForPackage(pkg.packageId)?.bundledSourceRootPath">
                <dt class="font-semibold text-gray-500">{{ $t('settings.components.settings.ApplicationPackagesManager.details.bundledSourceRootPath') }}</dt>
                <dd class="break-all">{{ detailsForPackage(pkg.packageId)?.bundledSourceRootPath }}</dd>
              </div>
            </dl>
            <div v-else class="text-gray-500">
              {{ $t('settings.components.settings.ApplicationPackagesManager.noDetails') }}
            </div>
          </div>
        </li>
        <li v-if="sortedPackages.length === 0" class="px-4 py-6 text-sm text-gray-500">{{ $t('settings.components.settings.ApplicationPackagesManager.emptyState') }}</li>
      </ul>
    </div>

    <div class="rounded border border-gray-200 bg-gray-50 p-4">
      <label class="mb-2 block text-sm font-medium text-gray-700" for="application-package-source">{{ $t('settings.components.settings.ApplicationPackagesManager.packagePathOrGithubUrl') }}</label>
      <div class="flex gap-2">
        <input
          id="application-package-source"
          v-model.trim="newSource"
          type="text"
          class="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          :placeholder="$t('settings.components.settings.ApplicationPackagesManager.importPlaceholder')"
          data-testid="application-package-source-input"
          :disabled="loading"
          @keyup.enter="handleImport"
        />
        <button
          type="button"
          class="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="application-package-import-button"
          :disabled="loading || newSource.length === 0"
          @click="handleImport"
        >
          {{ loading
            ? $t('settings.components.settings.ApplicationPackagesManager.working')
            : $t('settings.components.settings.ApplicationPackagesManager.importPackage') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type {
  ApplicationPackageImportSourceKind,
  ApplicationPackageSourceKind,
} from '~/stores/applicationPackagesStore'
import { useApplicationPackagesStore } from '~/stores/applicationPackagesStore'

const store = useApplicationPackagesStore()
const { applicationPackages, loading, error } = storeToRefs(store)

const newSource = ref('')
const successMessage = ref('')
const expandedPackageIds = ref<string[]>([])
const detailsLoadingPackageId = ref<string | null>(null)

const sortedPackages = computed(() =>
  [...applicationPackages.value].sort((left, right) => {
    if (left.isPlatformOwned) return -1
    if (right.isPlatformOwned) return 1
    const displayCompare = left.displayName.localeCompare(right.displayName)
    if (displayCompare !== 0) return displayCompare
    return (left.sourceSummary || '').localeCompare(right.sourceSummary || '')
  }),
)

const sourceKindLabel = (sourceKind: ApplicationPackageSourceKind): string => {
  switch (sourceKind) {
    case 'BUILT_IN':
      return 'Platform Applications'
    case 'LOCAL_PATH':
      return 'Local Path'
    case 'GITHUB_REPOSITORY':
      return 'GitHub'
  }
}

const normalizeImportSource = (value: string): string =>
  /^github\.com\//i.test(value) ? `https://${value}` : value

const detectSourceKind = (value: string): ApplicationPackageImportSourceKind =>
  /^(https?:\/\/)?(www\.)?github\.com\//i.test(value)
    ? 'GITHUB_REPOSITORY'
    : 'LOCAL_PATH'

const isExpanded = (packageId: string): boolean => expandedPackageIds.value.includes(packageId)
const detailsForPackage = (packageId: string) => store.getApplicationPackageDetails(packageId)

onMounted(async () => {
  try {
    await store.fetchApplicationPackages()
  } catch {
    // Store exposes error state.
  }
})

const toggleDetails = async (packageId: string): Promise<void> => {
  if (isExpanded(packageId)) {
    expandedPackageIds.value = expandedPackageIds.value.filter((entry) => entry !== packageId)
    return
  }

  expandedPackageIds.value = [...expandedPackageIds.value, packageId]
  if (detailsForPackage(packageId)) {
    return
  }

  detailsLoadingPackageId.value = packageId
  try {
    await store.fetchApplicationPackageDetails(packageId)
  } catch {
    // Store exposes error state.
  } finally {
    if (detailsLoadingPackageId.value === packageId) {
      detailsLoadingPackageId.value = null
    }
  }
}

const handleImport = async (): Promise<void> => {
  if (!newSource.value) {
    return
  }

  successMessage.value = ''
  store.clearError()

  try {
    const normalizedSource = normalizeImportSource(newSource.value)
    await store.importApplicationPackage({
      sourceKind: detectSourceKind(normalizedSource),
      source: normalizedSource,
    })
    expandedPackageIds.value = []
    successMessage.value = 'Application package imported.'
    newSource.value = ''
  } catch {
    // Store exposes error state.
  }
}

const handleRemove = async (packageId: string): Promise<void> => {
  successMessage.value = ''
  store.clearError()

  try {
    await store.removeApplicationPackage(packageId)
    expandedPackageIds.value = expandedPackageIds.value.filter((entry) => entry !== packageId)
    successMessage.value = 'Application package removed.'
  } catch {
    // Store exposes error state.
  }
}
</script>
