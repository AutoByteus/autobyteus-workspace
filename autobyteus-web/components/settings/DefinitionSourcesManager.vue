<template>
  <section class="w-full max-w-5xl" data-testid="definition-sources-manager">
    <div class="mb-4">
      <h2 class="text-xl font-semibold text-gray-900">Import</h2>
      <p class="mt-1 text-sm text-gray-600">
        Register external filesystem roots that contain <code>agents/</code> and/or
        <code>agent-teams/</code>. Import in v1 is registration-only, so files stay in place.
      </p>
    </div>

    <div v-if="error" class="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ error }}
    </div>
    <div
      v-if="successMessage"
      class="mb-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
      data-testid="definition-sources-success"
    >
      {{ successMessage }}
    </div>

    <div class="mb-4 rounded border border-gray-200 bg-white">
      <ul class="divide-y divide-gray-100">
        <li
          v-for="source in sortedSources"
          :key="source.path"
          class="flex items-center justify-between px-4 py-3"
          :data-testid="`definition-source-row-${source.isDefault ? 'default' : 'custom'}`"
        >
          <div class="min-w-0">
            <div class="truncate font-mono text-sm text-gray-800" :title="source.path">
              {{ source.path }}
            </div>
            <div class="mt-1 text-xs text-gray-500">
              Agents: {{ source.agentCount }} | Teams: {{ source.agentTeamCount }}
            </div>
          </div>
          <div class="ml-4 flex items-center gap-2">
            <span
              class="rounded px-2 py-1 text-xs font-medium"
              :class="source.isDefault ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'"
            >
              {{ source.isDefault ? 'Default' : 'Custom' }}
            </span>
            <button
              v-if="!source.isDefault"
              type="button"
              class="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="loading"
              @click="handleRemove(source.path)"
            >
              Remove
            </button>
          </div>
        </li>
        <li v-if="sortedSources.length === 0" class="px-4 py-6 text-sm text-gray-500">
          No import paths configured.
        </li>
      </ul>
    </div>

    <div class="rounded border border-gray-200 bg-gray-50 p-4">
      <label class="mb-2 block text-sm font-medium text-gray-700" for="definition-source-path">
        Import Path
      </label>
      <div class="flex gap-2">
        <input
          id="definition-source-path"
          v-model.trim="newPath"
          type="text"
          class="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          placeholder="/absolute/path/to/definition-package-root"
          data-testid="definition-source-input"
          :disabled="loading"
          @keyup.enter="handleAdd"
        />
        <button
          type="button"
          class="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="definition-source-add-button"
          :disabled="loading || newPath.length === 0"
          @click="handleAdd"
        >
          {{ loading ? 'Working...' : 'Import' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDefinitionSourcesStore } from '~/stores/definitionSourcesStore'

const store = useDefinitionSourcesStore()
const { definitionSources, loading, error } = storeToRefs(store)

const newPath = ref('')
const successMessage = ref('')

const sortedSources = computed(() =>
  [...definitionSources.value].sort((left, right) => {
    if (left.isDefault) return -1
    if (right.isDefault) return 1
    return left.path.localeCompare(right.path)
  }),
)

onMounted(async () => {
  try {
    await store.fetchDefinitionSources()
  } catch {
    // Store exposes error state.
  }
})

const handleAdd = async (): Promise<void> => {
  if (!newPath.value) {
    return
  }

  successMessage.value = ''
  store.clearError()

  try {
    await store.addDefinitionSource(newPath.value)
    successMessage.value = 'Import path added.'
    newPath.value = ''
  } catch {
    // Store exposes error state.
  }
}

const handleRemove = async (pathValue: string): Promise<void> => {
  successMessage.value = ''
  store.clearError()

  try {
    await store.removeDefinitionSource(pathValue)
    successMessage.value = 'Import path removed.'
  } catch {
    // Store exposes error state.
  }
}
</script>
