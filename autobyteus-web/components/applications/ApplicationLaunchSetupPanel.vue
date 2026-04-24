<template>
  <section
    data-testid="application-launch-setup-panel"
    :data-presentation="presentation"
    :class="panelClasses"
  >
    <div
      data-testid="application-launch-setup-header"
      :class="headerClasses"
    >
      <div class="min-w-0 space-y-2">
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
        :class="secondaryActionButtonClasses"
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
        :class="slotArticleClasses"
      >
        <div
          data-testid="application-launch-setup-slot-header"
          :class="slotHeaderClasses"
        >
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

          <div
            data-testid="application-launch-setup-slot-selection"
            :class="slotSelectionCardClasses"
          >
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.currentSelection') }}
            </p>
            <p :class="currentSelectionTextClasses">
              {{ describeCurrentSelectionForView(view) }}
            </p>
            <p class="mt-2 text-xs text-slate-500">
              {{ formatUpdatedAtForView(view.updatedAt) }}
            </p>
          </div>
        </div>

        <div
          data-testid="application-launch-setup-slot-body"
          :class="slotEditorGridClasses"
        >
          <ApplicationResourceSlotEditor
            v-if="drafts[view.slot.slotKey]"
            :view="view"
            :draft="drafts[view.slot.slotKey]"
            :available-resources="availableResources"
            :disabled="isSaving(view.slot.slotKey)"
            @update:selection="updateSelection(view.slot.slotKey, $event)"
            @update:launch-profile="updateLaunchProfile(view.slot.slotKey, $event)"
            @readiness-change="updateSlotReadiness(view.slot.slotKey, $event)"
          />
        </div>

        <div
          data-testid="application-launch-setup-slot-actions"
          :class="slotActionRowClasses"
        >
          <button
            type="button"
            :data-testid="`application-launch-setup-save-${view.slot.slotKey}`"
            class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            :class="primaryActionButtonClasses"
            :disabled="isSaving(view.slot.slotKey) || !slotReadinessByKey[view.slot.slotKey]?.isReady"
            @click="saveConfiguration(view)"
          >
            {{ isSaving(view.slot.slotKey)
              ? $t('applications.components.applications.ApplicationLaunchSetupPanel.saving')
              : $t('applications.components.applications.ApplicationLaunchSetupPanel.save') }}
          </button>
          <button
            type="button"
            :data-testid="`application-launch-setup-reset-${view.slot.slotKey}`"
            class="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            :class="secondaryActionButtonClasses"
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
import type {
  ApplicationResourceConfigurationView,
  ApplicationRuntimeResourceSummary,
} from '@autobyteus/application-sdk-contracts'
import ApplicationResourceSlotEditor from '~/components/applications/setup/ApplicationResourceSlotEditor.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import {
  MANIFEST_DEFAULT_SELECTION,
  buildDraftFromView,
  buildLaunchProfile,
  describeCurrentSelection,
  formatUpdatedAt,
  resolveSelectedResourceRef,
  type ApplicationSlotDraft,
  type ApplicationSlotEditorReadiness,
} from '~/utils/application/applicationLaunchProfile'
import {
  buildLaunchSetupGateState,
  type ApplicationLaunchSetupGateState,
} from '~/utils/application/applicationSetupGate'

const props = withDefaults(defineProps<{
  applicationId: string
  presentation?: 'page' | 'panel'
}>(), {
  presentation: 'page',
})
const emit = defineEmits<{
  (e: 'setup-state-change', value: ApplicationLaunchSetupGateState): void
}>()

const { t: $t } = useLocalization()
const windowNodeContextStore = useWindowNodeContextStore()

const isPanelPresentation = computed(() => props.presentation === 'panel')

const panelClasses = computed(() => (
  isPanelPresentation.value
    ? 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'
    : 'mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'
))

const headerClasses = computed(() => (
  isPanelPresentation.value
    ? 'flex flex-col gap-3'
    : 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'
))

const slotArticleClasses = computed(() => (
  isPanelPresentation.value
    ? 'rounded-2xl border border-slate-200 bg-slate-50/60 p-4'
    : 'rounded-2xl border border-slate-200 bg-slate-50/60 p-5'
))

const slotHeaderClasses = computed(() => (
  isPanelPresentation.value
    ? 'flex flex-col gap-3'
    : 'flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'
))

const slotSelectionCardClasses = computed(() => (
  isPanelPresentation.value
    ? 'w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700'
    : 'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700'
))

const currentSelectionTextClasses = computed(() => (
  isPanelPresentation.value
    ? 'mt-1 break-words'
    : 'mt-1 max-w-xs break-words'
))

const slotEditorGridClasses = computed(() => 'mt-5 grid gap-5')

const slotActionRowClasses = computed(() => (
  isPanelPresentation.value
    ? 'mt-5 flex flex-col gap-3'
    : 'mt-5 flex flex-wrap items-center gap-3'
))

const primaryActionButtonClasses = computed(() => (
  isPanelPresentation.value ? 'w-full justify-center' : ''
))

const secondaryActionButtonClasses = computed(() => (
  isPanelPresentation.value ? 'w-full justify-center' : ''
))

const loading = ref(false)
const loadError = ref<string | null>(null)
const configurationViews = ref<ApplicationResourceConfigurationView[]>([])
const availableResources = ref<ApplicationRuntimeResourceSummary[]>([])
const drafts = ref<Record<string, ApplicationSlotDraft>>({})
const slotReadinessByKey = ref<Record<string, ApplicationSlotEditorReadiness>>({})
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

const gateState = computed<ApplicationLaunchSetupGateState>(() => buildLaunchSetupGateState({
  loading: loading.value,
  loadError: loadError.value,
  configurationViews: configurationViews.value,
  drafts: drafts.value,
  slotReadinessByKey: slotReadinessByKey.value,
  savingSlotKeys: savingSlotKeys.value,
  saveErrors: saveErrors.value,
  t: $t,
}))

const loadSetup = async (): Promise<void> => {
  const normalizedApplicationId = props.applicationId.trim()
  if (!normalizedApplicationId) {
    loadError.value = $t('applications.components.applications.ApplicationLaunchSetupPanel.applicationIdMissing')
    configurationViews.value = []
    availableResources.value = []
    drafts.value = {}
    slotReadinessByKey.value = {}
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
    slotReadinessByKey.value = Object.fromEntries(
      views.map((view) => [view.slot.slotKey, {
        isReady: false,
        blockingReason: null,
        hasEffectiveResource: false,
      }]),
    )
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

const updateDraft = (slotKey: string, updater: (draft: ApplicationSlotDraft) => ApplicationSlotDraft): void => {
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

const updateLaunchProfile = (
  slotKey: string,
  launchProfile: ApplicationSlotDraft['launchProfile'],
): void => {
  updateDraft(slotKey, (draft) => ({
    ...draft,
    launchProfile,
  }))
}

const updateSlotReadiness = (slotKey: string, readiness: ApplicationSlotEditorReadiness): void => {
  slotReadinessByKey.value = {
    ...slotReadinessByKey.value,
    [slotKey]: readiness,
  }
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
          resourceRef: draft.selection === ''
            ? null
            : draft.selection === MANIFEST_DEFAULT_SELECTION
              ? null
              : resolveSelectedResourceRef(draft.selection, availableResources.value),
          launchProfile: buildLaunchProfile(draft.launchProfile),
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
