<template>
  <section
    :data-testid="`${testIdPrefix}-feature-toggle-card`"
    class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
  >
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">
          {{ title }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ description }}
        </p>
      </div>

      <div class="inline-flex items-center gap-3 self-start">
        <span
          class="text-sm font-medium"
          :class="statusTextClass"
          :data-testid="`${testIdPrefix}-feature-status`"
        >
          {{ statusLabel }}
        </span>

        <button
          type="button"
          role="switch"
          :data-testid="`${testIdPrefix}-feature-toggle`"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
          :class="switchTrackClass"
          :aria-checked="store.isEnabled"
          :aria-label="title"
          :disabled="toggleDisabled"
          @click="toggleEnabled"
        >
          <span class="sr-only">{{ title }}</span>
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
import type { BoundNodeCapabilityStoreApi } from '~/stores/capabilities/createBoundNodeCapabilityStore'
import { useServerSettingsStore } from '~/stores/serverSettings'

export interface FeatureCapabilityStatusLabels {
  loading: string
  error: string
  enabled: string
  disabled: string
  saving: string
}

const props = defineProps<{
  store: BoundNodeCapabilityStoreApi
  title: string
  description: string
  /** Prefix for `${prefix}-feature-toggle-card`, `-feature-status` and `-feature-toggle` test ids. */
  testIdPrefix: string
  statusLabels: FeatureCapabilityStatusLabels
  /** Feature-specific explanation of the capability source, if any. */
  statusMessage?: string | null
}>()

const serverSettingsStore = useServerSettingsStore()
const busy = ref(false)

const isPending = computed(() => props.store.status === 'loading' || props.store.status === 'unknown')

const badgeLabel = computed(() => {
  if (isPending.value) {
    return props.statusLabels.loading
  }

  if (props.store.status === 'error') {
    return props.statusLabels.error
  }

  return props.store.isEnabled ? props.statusLabels.enabled : props.statusLabels.disabled
})

const statusLabel = computed(() => (busy.value ? props.statusLabels.saving : badgeLabel.value))

const statusTextClass = computed(() => {
  if (props.store.status === 'error') {
    return 'text-red-700'
  }

  if (isPending.value || busy.value) {
    return 'text-slate-600'
  }

  return props.store.isEnabled ? 'text-emerald-700' : 'text-amber-700'
})

const toggleDisabled = computed(() => busy.value || isPending.value || props.store.status === 'error')

const switchTrackClass = computed(() => {
  if (props.store.status === 'error') {
    return 'bg-red-200'
  }

  if (isPending.value || busy.value) {
    return 'bg-slate-300'
  }

  return props.store.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
})

const switchThumbClass = computed(() => (props.store.isEnabled ? 'translate-x-5' : 'translate-x-0.5'))

const errorMessage = computed(() => props.store.error?.message ?? null)

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
    await props.store.setEnabled(enabled)
    await syncServerSettings()
  } finally {
    busy.value = false
  }
}

const toggleEnabled = async (): Promise<void> => {
  if (toggleDisabled.value || props.store.status !== 'resolved') {
    return
  }

  await updateEnabled(!props.store.isEnabled)
}

onMounted(() => {
  void props.store.ensureResolved()
    .catch(() => undefined)
})
</script>
