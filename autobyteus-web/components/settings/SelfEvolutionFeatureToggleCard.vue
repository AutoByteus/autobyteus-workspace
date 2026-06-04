<template>
  <section
    data-testid="self-evolution-feature-toggle-card"
    class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
  >
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">
          {{ labels.title }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ labels.description }}
        </p>
      </div>

      <div class="inline-flex items-center gap-3 self-start">
        <span
          class="text-sm font-medium"
          :class="statusTextClass"
          data-testid="self-evolution-feature-status"
        >
          {{ statusLabel }}
        </span>

        <button
          type="button"
          role="switch"
          data-testid="self-evolution-feature-toggle"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
          :class="switchTrackClass"
          :aria-checked="selfEvolutionCapabilityStore.isEnabled"
          :aria-label="labels.title"
          :disabled="toggleDisabled"
          @click="toggleEnabled"
        >
          <span class="sr-only">{{ labels.title }}</span>
          <span
            aria-hidden="true"
            class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform"
            :class="switchThumbClass"
          />
        </button>
      </div>
    </div>

    <p v-if="statusMessage" class="mt-4 text-sm text-slate-600">
      {{ statusMessage }}
    </p>
    <p v-if="errorMessage" class="mt-2 text-sm text-red-600">
      {{ errorMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSelfEvolutionCapabilityStore } from '~/stores/selfEvolutionCapabilityStore'
import { useServerSettingsStore } from '~/stores/serverSettings'

const selfEvolutionCapabilityStore = useSelfEvolutionCapabilityStore()
const serverSettingsStore = useServerSettingsStore()

const labels = {
  title: 'Self-evolution',
  description: 'Control whether manual skill self-evolution can be started on the currently bound node. Disabled by default.',
}

const busy = ref(false)

const badgeLabel = computed(() => {
  if (selfEvolutionCapabilityStore.status === 'loading' || selfEvolutionCapabilityStore.status === 'unknown') {
    return 'Loading'
  }

  if (selfEvolutionCapabilityStore.status === 'error') {
    return 'Error'
  }

  return selfEvolutionCapabilityStore.isEnabled
    ? 'Enabled'
    : 'Disabled'
})

const statusLabel = computed(() => (
  busy.value
    ? 'Saving...'
    : badgeLabel.value
))

const statusTextClass = computed(() => {
  if (selfEvolutionCapabilityStore.status === 'error') {
    return 'text-red-700'
  }

  if (selfEvolutionCapabilityStore.status === 'loading' || selfEvolutionCapabilityStore.status === 'unknown' || busy.value) {
    return 'text-slate-600'
  }

  return selfEvolutionCapabilityStore.isEnabled
    ? 'text-emerald-700'
    : 'text-amber-700'
})

const toggleDisabled = computed(() => (
  busy.value ||
  selfEvolutionCapabilityStore.status === 'loading' ||
  selfEvolutionCapabilityStore.status === 'unknown' ||
  selfEvolutionCapabilityStore.status === 'error'
))

const switchTrackClass = computed(() => {
  if (selfEvolutionCapabilityStore.status === 'error') {
    return 'bg-red-200'
  }

  if (selfEvolutionCapabilityStore.status === 'loading' || selfEvolutionCapabilityStore.status === 'unknown' || busy.value) {
    return 'bg-slate-300'
  }

  return selfEvolutionCapabilityStore.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
})

const switchThumbClass = computed(() => (
  selfEvolutionCapabilityStore.isEnabled ? 'translate-x-5' : 'translate-x-0.5'
))

const statusMessage = computed(() => {
  const source = selfEvolutionCapabilityStore.capability?.source
  if (!source) {
    return null
  }

  if (source === 'INITIALIZED_DISABLED') {
    return 'Initialized disabled for safety. Enable only when you want visible helper runs to edit configured skill files.'
  }

  return 'Persisted as an explicit runtime setting for this node.'
})

const errorMessage = computed(() => selfEvolutionCapabilityStore.error?.message ?? null)

const syncServerSettings = async (): Promise<void> => {
  try {
    await serverSettingsStore.reloadServerSettings()
  } catch {
    // Best-effort sync only. The typed capability card remains authoritative.
  }
}

const updateEnabled = async (enabled: boolean): Promise<void> => {
  busy.value = true

  try {
    await selfEvolutionCapabilityStore.setEnabled(enabled)
    await syncServerSettings()
  } finally {
    busy.value = false
  }
}

const toggleEnabled = async (): Promise<void> => {
  if (toggleDisabled.value || selfEvolutionCapabilityStore.status !== 'resolved') {
    return
  }

  await updateEnabled(!selfEvolutionCapabilityStore.isEnabled)
}

onMounted(() => {
  void selfEvolutionCapabilityStore.ensureResolved()
    .catch(() => undefined)
})
</script>
