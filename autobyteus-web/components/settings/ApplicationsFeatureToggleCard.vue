<template>
  <section
    data-testid="applications-feature-toggle-card"
    class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
  >
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <p class="text-2xl font-semibold leading-tight text-gray-900">
          {{ t('settings.components.settings.ApplicationsFeatureToggleCard.title') }}
        </p>
        <p class="mt-1 text-sm text-gray-500">
          {{ t('settings.components.settings.ApplicationsFeatureToggleCard.description') }}
        </p>
      </div>

      <span
        class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
        :class="badgeClass"
      >
        {{ badgeLabel }}
      </span>
    </div>

    <p v-if="statusMessage" class="mt-4 text-sm text-slate-600">
      {{ statusMessage }}
    </p>
    <p v-if="errorMessage" class="mt-2 text-sm text-red-600">
      {{ errorMessage }}
    </p>

    <div class="mt-5 flex flex-wrap gap-3">
      <button
        type="button"
        data-testid="applications-feature-enable"
        class="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        :class="enableButtonClass"
        :disabled="busy || applicationsCapabilityStore.status === 'loading' || applicationsCapabilityStore.isEnabled"
        @click="updateEnabled(true)"
      >
        {{ busy && targetState === true
          ? t('settings.components.settings.ApplicationsFeatureToggleCard.saving')
          : t('settings.components.settings.ApplicationsFeatureToggleCard.enable') }}
      </button>

      <button
        type="button"
        data-testid="applications-feature-disable"
        class="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        :class="disableButtonClass"
        :disabled="busy || applicationsCapabilityStore.status === 'loading' || !applicationsCapabilityStore.isEnabled"
        @click="updateEnabled(false)"
      >
        {{ busy && targetState === false
          ? t('settings.components.settings.ApplicationsFeatureToggleCard.saving')
          : t('settings.components.settings.ApplicationsFeatureToggleCard.disable') }}
      </button>
    </div>
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

const badgeClass = computed(() => {
  if (applicationsCapabilityStore.status === 'error') {
    return 'bg-red-100 text-red-700'
  }

  if (applicationsCapabilityStore.status === 'loading' || applicationsCapabilityStore.status === 'unknown') {
    return 'bg-slate-100 text-slate-700'
  }

  return applicationsCapabilityStore.isEnabled
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-amber-100 text-amber-700'
})

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

const enableButtonClass = computed(() => (
  applicationsCapabilityStore.isEnabled
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed'
))

const disableButtonClass = computed(() => (
  !applicationsCapabilityStore.isEnabled && applicationsCapabilityStore.status === 'resolved'
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed'
))

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

onMounted(() => {
  void applicationsCapabilityStore.ensureResolved()
    .then(() => syncServerSettings())
    .catch(() => undefined)
})
</script>
