<template>
  <section class="w-full max-w-5xl" data-testid="agent-packages-manager">
    <div class="mb-4">
      <h2 class="text-xl font-semibold text-gray-900">Agent Packages</h2>
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
          class="flex items-center justify-between px-4 py-3"
          :data-testid="`agent-package-row-${pkg.sourceKind.toLowerCase()}`"
        >
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold text-gray-900" :title="pkg.displayName">
              {{ pkg.displayName }}
            </div>
            <div class="mt-1 text-xs text-gray-500">
              {{ sourceKindLabel(pkg.sourceKind) }} | Shared Agents: {{ pkg.sharedAgentCount }} | Team-local Agents: {{ pkg.teamLocalAgentCount }} | Teams: {{ pkg.agentTeamCount }}
            </div>
            <div class="mt-1 truncate font-mono text-xs text-gray-500" :title="pkg.path">
              {{ pkg.sourceKind === 'GITHUB_REPOSITORY' ? pkg.source : pkg.path }}
            </div>
          </div>
          <div class="ml-4 flex items-center gap-2">
            <span
              class="rounded px-2 py-1 text-xs font-medium"
              :class="pkg.isDefault ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'"
            >
              {{ pkg.isDefault ? 'Default' : sourceKindLabel(pkg.sourceKind) }}
            </span>
            <button
              v-if="pkg.isRemovable"
              type="button"
              class="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="loading"
              @click="handleRemove(pkg.packageId)"
            >
              Remove
            </button>
          </div>
        </li>
        <li v-if="sortedPackages.length === 0" class="px-4 py-6 text-sm text-gray-500">
          No agent packages configured.
        </li>
      </ul>
    </div>

    <div class="rounded border border-gray-200 bg-gray-50 p-4">
      <label class="mb-2 block text-sm font-medium text-gray-700" for="agent-package-source">
        Package Path Or GitHub URL
      </label>
      <div class="flex gap-2">
        <input
          id="agent-package-source"
          v-model.trim="newSource"
          type="text"
          class="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          placeholder="/absolute/path/to/agent-package or https://github.com/owner/repo"
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
  AgentPackageImportSourceKind,
  AgentPackageSourceKind,
} from '~/stores/agentPackagesStore'
import { useAgentPackagesStore } from '~/stores/agentPackagesStore'

const store = useAgentPackagesStore()
const { agentPackages, loading, error } = storeToRefs(store)

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

const normalizeImportSource = (value: string): string =>
  /^github\.com\//i.test(value) ? `https://${value}` : value

const detectSourceKind = (value: string): AgentPackageImportSourceKind =>
  /^(https?:\/\/)?(www\.)?github\.com\//i.test(value)
    ? 'GITHUB_REPOSITORY'
    : 'LOCAL_PATH'

onMounted(async () => {
  try {
    await store.fetchAgentPackages()
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
