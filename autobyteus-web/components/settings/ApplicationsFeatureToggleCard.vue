<template>
  <section
    data-testid="applications-feature-toggle-card"
    class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
  >
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">
          {{ t('settings.components.settings.ApplicationsFeatureToggleCard.title') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ t('settings.components.settings.ApplicationsFeatureToggleCard.description') }}
        </p>
      </div>

      <div class="inline-flex items-center gap-3 self-start">
        <span
          class="text-sm font-medium"
          :class="statusTextClass"
          data-testid="applications-feature-status"
        >
          {{ statusLabel }}
        </span>

        <button
          type="button"
          role="switch"
          data-testid="applications-feature-toggle"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
          :class="switchTrackClass"
          :aria-checked="applicationsCapabilityStore.isEnabled"
          :aria-label="t('settings.components.settings.ApplicationsFeatureToggleCard.title')"
          :disabled="toggleDisabled"
          @click="toggleEnabled"
        >
          <span class="sr-only">{{ t('settings.components.settings.ApplicationsFeatureToggleCard.title') }}</span>
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
import { useApplicationsCapabilityStore } from '~/stores/applicationsCapabilityStore'
import { useServerSettingsStore } from '~/stores/serverSettings'

const { t } = useLocalization()
const applicationsCapabilityStore = useApplicationsCapabilityStore()
const serverSettingsStore = useServerSettingsStore()

const busy = ref(false)
const targetState = ref<boolean | null>(null)

const badgeLabel = computed(() => {
  if (applicationsCapabilityStore.status === 'loading' || applicationsCapabilityStore.status === 'unknown') {
    return t('settings.components.settings.ApplicationsFeatureToggleCard.status.loading')
  }

  if (applicationsCapabilityStore.status === 'error') {
    return t('settings.components.settings.ApplicationsFeatureToggleCard.status.error')
  }

  return applicationsCapabilityStore.isEnabled
    ? t('settings.components.settings.ApplicationsFeatureToggleCard.status.enabled')
    : t('settings.components.settings.ApplicationsFeatureToggleCard.status.disabled')
})

const statusLabel = computed(() => (
  busy.value
    ? t('settings.components.settings.ApplicationsFeatureToggleCard.saving')
    : badgeLabel.value
))

const statusTextClass = computed(() => {
  if (applicationsCapabilityStore.status === 'error') {
    return 'text-red-700'
  }

  if (applicationsCapabilityStore.status === 'loading' || applicationsCapabilityStore.status === 'unknown' || busy.value) {
    return 'text-slate-600'
  }

  return applicationsCapabilityStore.isEnabled
    ? 'text-emerald-700'
    : 'text-amber-700'
})

const toggleDisabled = computed(() => (
  busy.value ||
  applicationsCapabilityStore.status === 'loading' ||
  applicationsCapabilityStore.status === 'unknown' ||
  applicationsCapabilityStore.status === 'error'
))

const switchTrackClass = computed(() => {
  if (applicationsCapabilityStore.status === 'error') {
    return 'bg-red-200'
  }

  if (applicationsCapabilityStore.status === 'loading' || applicationsCapabilityStore.status === 'unknown' || busy.value) {
    return 'bg-slate-300'
  }

  return applicationsCapabilityStore.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
})

const switchThumbClass = computed(() => (
  applicationsCapabilityStore.isEnabled ? 'translate-x-5' : 'translate-x-0.5'
))

const statusMessage = computed(() => {
  const source = applicationsCapabilityStore.capability?.source
  if (!source) {
    return null
  }

  if (source === 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS') {
    return t('settings.components.settings.ApplicationsFeatureToggleCard.source.initializedFromDiscoveredApplications')
  }

  if (source === 'INITIALIZED_EMPTY_CATALOG') {
    return t('settings.components.settings.ApplicationsFeatureToggleCard.source.initializedEmptyCatalog')
  }

  return t('settings.components.settings.ApplicationsFeatureToggleCard.source.serverSetting')
})

const errorMessage = computed(() => applicationsCapabilityStore.error?.message ?? null)

const syncServerSettings = async (): Promise<void> => {
  try {
    await serverSettingsStore.reloadServerSettings()
  } catch {
    // Best-effort sync only. The typed capability card remains authoritative.
  }
}

const updateEnabled = async (enabled: boolean): Promise<void> => {
  busy.value = true
  targetState.value = enabled

  try {
    await applicationsCapabilityStore.setEnabled(enabled)
    await syncServerSettings()
  } finally {
    busy.value = false
    targetState.value = null
  }
}

const toggleEnabled = async (): Promise<void> => {
  if (toggleDisabled.value || applicationsCapabilityStore.status !== 'resolved') {
    return
  }

  await updateEnabled(!applicationsCapabilityStore.isEnabled)
}

onMounted(() => {
  void applicationsCapabilityStore.ensureResolved()
    .catch(() => undefined)
})
</script>
