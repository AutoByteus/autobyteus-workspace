<template>
  <section data-testid="application-launch-setup-panel" class="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <span class="i-heroicons-adjustments-horizontal-20-solid h-4 w-4"></span>
          <span>{{ $t('applications.components.applications.ApplicationLaunchSetupPanel.title') }}</span>
        </div>
        <h2 class="text-xl font-semibold text-slate-900">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.heading') }}
        </h2>
        <p class="max-w-3xl text-sm leading-6 text-slate-600">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.description') }}
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        :disabled="loading"
        @click="loadSetup"
      >
        {{ loading
          ? $t('applications.components.applications.ApplicationLaunchSetupPanel.refreshing')
          : $t('applications.components.applications.ApplicationLaunchSetupPanel.refresh') }}
      </button>
    </div>

    <div
      v-if="loading"
      class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 py-16 text-center"
    >
      <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      <p class="text-sm text-slate-600">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.loading') }}
      </p>
    </div>

    <div
      v-else-if="loadError"
      class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <p class="font-semibold">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.unableToLoad') }}
      </p>
      <p class="mt-1">{{ loadError }}</p>
    </div>

    <div
      v-else-if="configurationViews.length === 0"
      class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600"
    >
      <p class="font-semibold text-slate-900">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.noSlotsTitle') }}
      </p>
      <p class="mt-2">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.noSlotsDescription') }}
      </p>
    </div>

    <div v-else class="mt-6 space-y-5">
      <article
        v-for="view in configurationViews"
        :key="view.slot.slotKey"
        class="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
      >
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-semibold text-slate-900">{{ view.slot.name }}</h3>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="view.slot.required ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'"
              >
                {{ view.slot.required
                  ? $t('applications.components.applications.ApplicationLaunchSetupPanel.requiredSlot')
                  : $t('applications.components.applications.ApplicationLaunchSetupPanel.optionalSlot') }}
              </span>
            </div>
            <p v-if="view.slot.description" class="mt-2 text-sm leading-6 text-slate-600">
              {{ view.slot.description }}
            </p>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.currentSelection') }}
            </p>
            <p class="mt-1 max-w-xs break-words">
              {{ describeCurrentSelectionForView(view) }}
            </p>
            <p class="mt-2 text-xs text-slate-500">
              {{ formatUpdatedAtForView(view.updatedAt) }}
            </p>
          </div>
        </div>

        <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div class="space-y-4">
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700">
                {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.resourceLabel') }}
              </span>
              <select
                :value="drafts[view.slot.slotKey]?.selection ?? ''"
                class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :disabled="isSaving(view.slot.slotKey)"
                @change="updateSelection(view.slot.slotKey, ($event.target as HTMLSelectElement).value)"
              >
                <option
                  v-if="view.slot.defaultResourceRef"
                  :value="MANIFEST_DEFAULT_SELECTION"
                >
                  {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.useManifestDefault', {
                    resource: describeResourceRefForView(view.slot.defaultResourceRef),
                  }) }}
                </option>
                <option
                  v-if="!view.slot.required"
                  value=""
                >
                  {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.noResourceSelected') }}
                </option>
                <option
                  v-for="resource in resourcesForSlot(view.slot, availableResources)"
                  :key="buildResourceRefKey(summaryToResourceRef(resource))"
                  :value="buildResourceRefKey(summaryToResourceRef(resource))"
                >
                  {{ describeResourceSummaryForView(resource) }}
                </option>
              </select>
            </label>

          </div>

          <ApplicationLaunchDefaultsFields
            v-if="drafts[view.slot.slotKey]"
            :slot="view.slot"
            :draft="drafts[view.slot.slotKey]"
            :disabled="isSaving(view.slot.slotKey) || !hasEffectiveResource(view)"
            :has-effective-resource="hasEffectiveResource(view)"
            @update:runtime-kind="updateRuntimeKind(view.slot.slotKey, $event)"
            @update:llm-model-identifier="updateModelIdentifier(view.slot.slotKey, $event)"
            @update:workspace-root-path="updateWorkspaceRootPath(view.slot.slotKey, $event)"
          />
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            :disabled="isSaving(view.slot.slotKey)"
            @click="saveConfiguration(view)"
          >
            {{ isSaving(view.slot.slotKey)
              ? $t('applications.components.applications.ApplicationLaunchSetupPanel.saving')
              : $t('applications.components.applications.ApplicationLaunchSetupPanel.save') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            :disabled="isSaving(view.slot.slotKey)"
            @click="resetDraft(view.slot.slotKey)"
          >
            {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.reset') }}
          </button>
          <p
            v-if="saveMessages[view.slot.slotKey]"
            class="text-sm text-emerald-700"
          >
            {{ saveMessages[view.slot.slotKey] }}
          </p>
          <p
            v-else-if="saveErrors[view.slot.slotKey]"
            class="text-sm text-red-700"
          >
            {{ saveErrors[view.slot.slotKey] }}
          </p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ApplicationLaunchDefaultsFields from '~/components/applications/ApplicationLaunchDefaultsFields.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import {
  MANIFEST_DEFAULT_SELECTION,
  buildDraftFromView,
  buildLaunchSetupGateState,
  buildLaunchDefaults,
  buildResourceRefKey,
  describeCurrentSelection,
  describeResourceRef,
  describeResourceSummary,
  formatUpdatedAt,
  hasEffectiveResourceSelection,
  resolveSelectedResourceRef,
  resourcesForSlot,
  summaryToResourceRef,
  type ApplicationLaunchSetupGateState,
  type ApplicationResourceConfigurationView,
  type ApplicationRuntimeResourceRef,
  type ApplicationRuntimeResourceSummary,
  type SlotDraft,
} from '~/utils/application/applicationLaunchSetup'

const props = defineProps<{
  applicationId: string
}>()
const emit = defineEmits<{
  (e: 'setup-state-change', value: ApplicationLaunchSetupGateState): void
}>()

const { t: $t } = useLocalization()
const windowNodeContextStore = useWindowNodeContextStore()

const loading = ref(false)
const loadError = ref<string | null>(null)
const configurationViews = ref<ApplicationResourceConfigurationView[]>([])
const availableResources = ref<ApplicationRuntimeResourceSummary[]>([])
const drafts = ref<Record<string, SlotDraft>>({})
const savingSlotKeys = ref<string[]>([])
const saveMessages = ref<Record<string, string | null>>({})
const saveErrors = ref<Record<string, string | null>>({})

const restBaseUrl = computed(() => windowNodeContextStore.getBoundEndpoints().rest.replace(/\/+$/, ''))

const readErrorMessage = async (response: Response): Promise<string> => {
  const payload = await response.json().catch(() => null) as { detail?: string; message?: string } | null
  return payload?.detail || payload?.message || `Request failed with status ${response.status}.`
}

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await globalThis.fetch(`${restBaseUrl.value}${path}`, init)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return await response.json() as T
}

const resetTransientMessages = (): void => {
  saveMessages.value = {}
  saveErrors.value = {}
}

const gateState = computed<ApplicationLaunchSetupGateState>(() => {
  return buildLaunchSetupGateState({
    loading: loading.value,
    loadError: loadError.value,
    configurationViews: configurationViews.value,
    drafts: drafts.value,
    savingSlotKeys: savingSlotKeys.value,
    saveErrors: saveErrors.value,
    t: $t,
  })
})

const loadSetup = async (): Promise<void> => {
  const normalizedApplicationId = props.applicationId.trim()
  if (!normalizedApplicationId) {
    loadError.value = $t('applications.components.applications.ApplicationLaunchSetupPanel.applicationIdMissing')
    configurationViews.value = []
    availableResources.value = []
    drafts.value = {}
    return
  }

  loading.value = true
  loadError.value = null
  resetTransientMessages()

  try {
    const [views, resources] = await Promise.all([
      fetchJson<ApplicationResourceConfigurationView[]>(
        `/applications/${encodeURIComponent(normalizedApplicationId)}/resource-configurations`,
      ),
      fetchJson<ApplicationRuntimeResourceSummary[]>(
        `/applications/${encodeURIComponent(normalizedApplicationId)}/available-resources`,
      ),
    ])

    configurationViews.value = views
    availableResources.value = resources
    drafts.value = Object.fromEntries(
      views.map((view) => [view.slot.slotKey, buildDraftFromView(view)]),
    )
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

const updateDraft = (slotKey: string, updater: (draft: SlotDraft) => SlotDraft): void => {
  const currentDraft = drafts.value[slotKey]
  if (!currentDraft) {
    return
  }
  drafts.value = {
    ...drafts.value,
    [slotKey]: updater(currentDraft),
  }
  saveMessages.value = {
    ...saveMessages.value,
    [slotKey]: null,
  }
  saveErrors.value = {
    ...saveErrors.value,
    [slotKey]: null,
  }
}

const updateSelection = (slotKey: string, selection: string): void => {
  updateDraft(slotKey, (draft) => ({
    ...draft,
    selection,
  }))
}

const updateRuntimeKind = (slotKey: string, runtimeKind: string): void => {
  updateDraft(slotKey, (draft) => ({
    ...draft,
    runtimeKind,
  }))
}

const updateModelIdentifier = (slotKey: string, llmModelIdentifier: string): void => {
  updateDraft(slotKey, (draft) => ({
    ...draft,
    llmModelIdentifier,
  }))
}

const updateWorkspaceRootPath = (slotKey: string, workspaceRootPath: string): void => {
  updateDraft(slotKey, (draft) => ({
    ...draft,
    workspaceRootPath,
  }))
}

const saveConfiguration = async (view: ApplicationResourceConfigurationView): Promise<void> => {
  const draft = drafts.value[view.slot.slotKey]
  if (!draft) {
    return
  }

  savingSlotKeys.value = [...savingSlotKeys.value, view.slot.slotKey]
  saveMessages.value = {
    ...saveMessages.value,
    [view.slot.slotKey]: null,
  }
  saveErrors.value = {
    ...saveErrors.value,
    [view.slot.slotKey]: null,
  }

  try {
    const nextView = await fetchJson<ApplicationResourceConfigurationView>(
      `/applications/${encodeURIComponent(props.applicationId)}/resource-configurations/${encodeURIComponent(view.slot.slotKey)}`,
      {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          resourceRef: resolveSelectedResourceRef(draft.selection, availableResources.value),
          launchDefaults: buildLaunchDefaults(draft, view.slot),
        }),
      },
    )

    configurationViews.value = configurationViews.value.map((candidate) => (
      candidate.slot.slotKey === nextView.slot.slotKey ? nextView : candidate
    ))
    drafts.value = {
      ...drafts.value,
      [nextView.slot.slotKey]: buildDraftFromView(nextView),
    }
    saveMessages.value = {
      ...saveMessages.value,
      [nextView.slot.slotKey]: $t('applications.components.applications.ApplicationLaunchSetupPanel.saved'),
    }
  } catch (error) {
    saveErrors.value = {
      ...saveErrors.value,
      [view.slot.slotKey]: error instanceof Error ? error.message : String(error),
    }
  } finally {
    savingSlotKeys.value = savingSlotKeys.value.filter((slotKey) => slotKey !== view.slot.slotKey)
  }
}

const resetDraft = (slotKey: string): void => {
  const view = configurationViews.value.find((candidate) => candidate.slot.slotKey === slotKey)
  if (!view) {
    return
  }
  drafts.value = {
    ...drafts.value,
    [slotKey]: buildDraftFromView(view),
  }
  saveMessages.value = {
    ...saveMessages.value,
    [slotKey]: null,
  }
  saveErrors.value = {
    ...saveErrors.value,
    [slotKey]: null,
  }
}

const isSaving = (slotKey: string): boolean => savingSlotKeys.value.includes(slotKey)

const hasEffectiveResource = (view: ApplicationResourceConfigurationView): boolean => {
  return hasEffectiveResourceSelection(view, drafts.value[view.slot.slotKey], availableResources.value)
}

const describeResourceRefForView = (resourceRef: ApplicationRuntimeResourceRef): string => (
  describeResourceRef(resourceRef, availableResources.value, $t)
)

const describeResourceSummaryForView = (resource: ApplicationRuntimeResourceSummary): string => (
  describeResourceSummary(resource, $t)
)

const describeCurrentSelectionForView = (view: ApplicationResourceConfigurationView): string => (
  describeCurrentSelection(view, availableResources.value, $t)
)

const formatUpdatedAtForView = (updatedAt: string | null): string => (
  formatUpdatedAt(updatedAt, $t)
)

watch(
  () => props.applicationId,
  () => {
    void loadSetup()
  },
  { immediate: true },
)

watch(
  gateState,
  (value) => {
    emit('setup-state-change', value)
  },
  { immediate: true, deep: true },
)
</script>
