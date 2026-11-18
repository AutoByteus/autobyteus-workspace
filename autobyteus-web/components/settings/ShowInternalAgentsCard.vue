<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="show-internal-agents-card">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">
          {{ t('settings.components.settings.ShowInternalAgentsCard.title') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ t('settings.components.settings.ShowInternalAgentsCard.description') }}
        </p>
      </div>
    </div>

    <div
      class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
      data-testid="show-internal-agents-row"
    >
      <span class="min-w-0">
        <span class="block text-sm font-semibold text-gray-900">
          {{ t('settings.components.settings.ShowInternalAgentsCard.toggleLabel') }}
        </span>
        <span class="mt-1 block text-sm text-gray-600">
          {{ t('settings.components.settings.ShowInternalAgentsCard.explanation') }}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        class="relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        :class="shown ? 'bg-blue-600' : 'bg-slate-300'"
        :aria-checked="shown"
        :aria-label="t('settings.components.settings.ShowInternalAgentsCard.toggleLabel')"
        :disabled="isSaving"
        data-testid="show-internal-agents-toggle"
        @click="toggle"
      >
        <span class="sr-only">{{ t('settings.components.settings.ShowInternalAgentsCard.toggleLabel') }}</span>
        <span
          aria-hidden="true"
          class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform"
          :class="shown ? 'translate-x-5' : 'translate-x-0.5'"
        />
      </button>
    </div>

    <p v-if="errorMessage" class="mt-4 text-sm text-red-600" data-testid="show-internal-agents-error">
      {{ errorMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useServerSettingsStore } from '~/stores/serverSettings'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'

/** Server setting "Show internal agents" (autobyteus-308): the system's own helper agents, hidden by default. */
const SHOW_INTERNAL_AGENTS_SETTING_KEY = 'AUTOBYTEUS_SHOW_INTERNAL_AGENTS'

const store = useServerSettingsStore()
const { t } = useLocalization()

const shown = ref(false)
const original = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const isDirty = computed(() => shown.value !== original.value)

// Absent (never saved) means off, matching the server default.
const isSettingOn = (value: unknown): boolean => typeof value === 'string' && value.trim().toLowerCase() === 'true'

const syncFromStore = (): void => {
  const current = isSettingOn(store.getSettingByKey(SHOW_INTERNAL_AGENTS_SETTING_KEY)?.value)
  if (!isDirty.value) shown.value = current
  original.value = current
}

watch(() => store.settings, syncFromStore, { deep: true, immediate: true })

/** The agent list and run history are read from the server, which applies the setting on the next read. */
const refreshListings = async (): Promise<void> => {
  await Promise.allSettled([
    useAgentDefinitionStore().reloadAllAgentDefinitions(),
    useRunHistoryStore().refreshTreeQuietly(),
  ])
}

const persist = async (next: boolean): Promise<void> => {
  const previous = original.value
  shown.value = next
  isSaving.value = true
  errorMessage.value = ''
  try {
    await store.updateServerSetting(SHOW_INTERNAL_AGENTS_SETTING_KEY, next ? 'true' : 'false')
    original.value = next
    await refreshListings()
  } catch (error: any) {
    shown.value = previous
    errorMessage.value = error?.message || t('settings.components.settings.ShowInternalAgentsCard.saveFailed')
  } finally {
    isSaving.value = false
  }
}

const toggle = (): void => {
  if (isSaving.value) return
  void persist(!shown.value)
}
</script>
