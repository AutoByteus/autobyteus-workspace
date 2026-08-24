<template>
  <section class="w-full max-w-5xl" data-testid="agent-packages-manager">
    <div class="mb-4">
      <h2 class="text-xl font-semibold text-gray-900">{{ $t('settings.components.settings.AgentPackagesManager.agent_packages') }}</h2>
      <p class="mt-1 text-sm text-gray-600">
        Link a local package path or paste a public GitHub repository URL.
        GitHub packages are installed into app-managed storage, while local paths remain in place.
      </p>
    </div>

    <div v-if="error" class="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ error }}
    </div>
    <div
      v-if="successMessage"
      class="mb-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
      data-testid="agent-packages-success"
    >
      {{ successMessage }}
    </div>

    <div class="mb-4 rounded border border-gray-200 bg-white">
      <ul class="divide-y divide-gray-100">
        <li
          v-for="pkg in sortedPackages"
          :key="pkg.packageId"
          class="flex items-start justify-between px-4 py-3"
          :data-testid="`agent-package-row-${pkg.sourceKind.toLowerCase()}`"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold text-gray-900" :title="pkg.displayName">
              {{ pkg.displayName }}
            </div>
            <div class="mt-1 text-xs text-gray-500">
              {{ sourceKindLabel(pkg.sourceKind) }} | Shared Agents: {{ pkg.sharedAgentCount }} | Team-local Agents: {{ pkg.teamLocalAgentCount }} | Teams: {{ pkg.agentTeamCount }} | Applications: {{ pkg.applicationCount }}
            </div>
            <div class="mt-1 truncate font-mono text-xs text-gray-500" :title="pkg.path">
              {{ pkg.sourceKind === 'GITHUB_REPOSITORY' ? pkg.source : pkg.path }}
            </div>
            <div
              class="mt-2 text-xs"
              :class="updateStatusClass(pkg.updateInfo.status)"
              :data-testid="`agent-package-update-status-${packageActionKey(pkg.packageId)}`"
            >
              {{ updateStatusLabel(pkg) }}
            </div>
          </div>
          <div class="ml-4 flex shrink-0 flex-wrap items-center justify-end gap-2">
            <span
              class="rounded px-2 py-1 text-xs font-medium"
              :class="pkg.isDefault ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'"
            >
              {{ pkg.isDefault ? 'Default' : sourceKindLabel(pkg.sourceKind) }}
            </span>
            <button
              v-if="pkg.updateInfo.canReload"
              type="button"
              class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              :data-testid="`agent-package-reload-button-${packageActionKey(pkg.packageId)}`"
              :disabled="isRowActionDisabled(pkg.packageId)"
              @click="handleReload(pkg.packageId)"
            >
              {{ store.isPackageActionLoading(pkg.packageId) ? 'Reloading...' : 'Reload' }}
            </button>
            <button
              v-if="pkg.sourceKind === 'GITHUB_REPOSITORY' && pkg.updateInfo.canCheck"
              type="button"
              class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              :data-testid="`agent-package-check-button-${packageActionKey(pkg.packageId)}`"
              :disabled="isRowActionDisabled(pkg.packageId) || checkingUpdates"
              @click="handleCheckUpdates(pkg.packageId)"
            >
              {{ checkingUpdates ? 'Checking...' : 'Check again' }}
            </button>
            <button
              v-if="pkg.updateInfo.canUpdate"
              type="button"
              class="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              :data-testid="`agent-package-update-button-${packageActionKey(pkg.packageId)}`"
              :disabled="isRowActionDisabled(pkg.packageId)"
              @click="handleUpdate(pkg.packageId)"
            >
              {{ store.isPackageActionLoading(pkg.packageId) ? 'Updating...' : 'Update' }}
            </button>
            <button
              v-if="pkg.isRemovable"
              type="button"
              class="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isRowActionDisabled(pkg.packageId)"
              @click="handleRemove(pkg.packageId)"
            >
              Remove
            </button>
          </div>
        </li>
        <li v-if="sortedPackages.length === 0" class="px-4 py-6 text-sm text-gray-500">{{ $t('settings.components.settings.AgentPackagesManager.no_agent_packages_configured') }}</li>
      </ul>
    </div>

    <div class="rounded border border-gray-200 bg-gray-50 p-4">
      <label class="mb-2 block text-sm font-medium text-gray-700" for="agent-package-source">{{ $t('settings.components.settings.AgentPackagesManager.package_path_or_github_url') }}</label>
      <div class="flex gap-2">
        <input
          id="agent-package-source"
          v-model.trim="newSource"
          type="text"
          class="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          :placeholder="$t('settings.components.settings.AgentPackagesManager.absolute_path_to_agent_package_or')"
          data-testid="agent-package-source-input"
          :disabled="loading"
          @keyup.enter="handleImport"
        />
        <button
          type="button"
          class="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="agent-package-import-button"
          :disabled="loading || newSource.length === 0"
          @click="handleImport"
        >
          {{ loading ? 'Working...' : 'Import Package' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type {
  AgentPackage,
  AgentPackageImportSourceKind,
  AgentPackageSourceKind,
  AgentPackageUpdateStatus,
} from '~/stores/agentPackagesStore'
import { useAgentPackagesStore } from '~/stores/agentPackagesStore'

const store = useAgentPackagesStore()
const { agentPackages, loading, checkingUpdates, error } = storeToRefs(store)

const newSource = ref('')
const successMessage = ref('')

const sortedPackages = computed(() =>
  [...agentPackages.value].sort((left, right) => {
    if (left.isDefault) return -1
    if (right.isDefault) return 1
    const displayCompare = left.displayName.localeCompare(right.displayName)
    if (displayCompare !== 0) return displayCompare
    return left.path.localeCompare(right.path)
  }),
)

const sourceKindLabel = (sourceKind: AgentPackageSourceKind): string => {
  switch (sourceKind) {
    case 'BUILT_IN':
      return 'Built-in'
    case 'LOCAL_PATH':
      return 'Local Path'
    case 'GITHUB_REPOSITORY':
      return 'GitHub'
  }
}

const updateStatusLabel = (pkg: AgentPackage): string => {
  if (pkg.sourceKind === 'LOCAL_PATH') {
    return 'Local folder — reload after external changes.'
  }
  return pkg.updateInfo.message
}

const updateStatusClass = (status: AgentPackageUpdateStatus): string => {
  switch (status) {
    case 'UPDATE_AVAILABLE':
    case 'UNKNOWN':
      return 'text-amber-700'
    case 'CHECK_FAILED':
    case 'UPDATE_FAILED':
      return 'text-red-700'
    case 'UP_TO_DATE':
      return 'text-green-700'
    default:
      return 'text-gray-500'
  }
}

const packageActionKey = (packageId: string): string =>
  encodeURIComponent(packageId).replace(/%/g, '_')

const isRowActionDisabled = (packageId: string): boolean =>
  loading.value || store.isPackageActionLoading(packageId)

const normalizeImportSource = (value: string): string =>
  /^github\.com\//i.test(value) ? `https://${value}` : value

const detectSourceKind = (value: string): AgentPackageImportSourceKind =>
  /^(https?:\/\/)?(www\.)?github\.com\//i.test(value)
    ? 'GITHUB_REPOSITORY'
    : 'LOCAL_PATH'

onMounted(async () => {
  try {
    await store.fetchAgentPackages()
    if (agentPackages.value.some((pkg) => pkg.sourceKind === 'GITHUB_REPOSITORY')) {
      await store.checkAgentPackageUpdates()
    }
  } catch {
    // Store exposes error state.
  }
})

const handleImport = async (): Promise<void> => {
  if (!newSource.value) {
    return
  }

  successMessage.value = ''
  store.clearError()

  try {
    const normalizedSource = normalizeImportSource(newSource.value)
    await store.importAgentPackage({
      sourceKind: detectSourceKind(normalizedSource),
      source: normalizedSource,
    })
    successMessage.value = 'Agent package imported.'
    newSource.value = ''
  } catch {
    // Store exposes error state.
  }
}

const handleReload = async (packageId: string): Promise<void> => {
  successMessage.value = ''
  store.clearError()

  try {
    await store.reloadAgentPackage(packageId)
    successMessage.value = 'Agent package reloaded.'
  } catch {
    // Store exposes error state.
  }
}

const handleCheckUpdates = async (packageId?: string): Promise<void> => {
  successMessage.value = ''
  store.clearError()

  try {
    await store.checkAgentPackageUpdates(packageId ? [packageId] : undefined)
    successMessage.value = 'Agent package update status refreshed.'
  } catch {
    // Store exposes error state.
  }
}

const handleUpdate = async (packageId: string): Promise<void> => {
  successMessage.value = ''
  store.clearError()

  try {
    await store.updateAgentPackage(packageId)
    successMessage.value = 'Agent package updated.'
  } catch {
    // Store exposes error state.
  }
}

const handleRemove = async (packageId: string): Promise<void> => {
  successMessage.value = ''
  store.clearError()

  try {
    await store.removeAgentPackage(packageId)
    successMessage.value = 'Agent package removed.'
  } catch {
    // Store exposes error state.
  }
}
</script>
