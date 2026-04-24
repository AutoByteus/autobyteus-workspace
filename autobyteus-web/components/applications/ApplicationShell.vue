<template>
  <div class="flex h-full min-h-0 flex-1 flex-col">
    <div
      v-if="phase === 'setup'"
      class="h-full flex-1 overflow-auto bg-slate-50"
      data-testid="application-setup-phase"
    >
      <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            class="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            @click="goBack"
          >
            {{ $t('applications.components.applications.ApplicationShell.backToApplications') }}
          </button>
        </div>

        <div
          v-if="loading"
          class="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm"
        >
          <div class="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p class="text-slate-600">{{ $t('applications.components.applications.ApplicationShell.loadingApplication') }}</p>
        </div>

        <div
          v-else-if="loadError"
          class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p class="font-semibold">{{ $t('applications.components.applications.ApplicationShell.unableToLoadApplication') }}</p>
          <p class="mt-1">{{ loadError }}</p>
        </div>

        <div
          v-else-if="!application"
          class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p class="font-semibold">{{ $t('applications.components.applications.ApplicationShell.applicationNotFound') }}</p>
          <p class="mt-1">{{ $t('applications.components.applications.ApplicationShell.noApplicationExistsForId', { id: applicationId }) }}</p>
        </div>

        <template v-else>
          <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <span class="i-heroicons-adjustments-horizontal-20-solid h-4 w-4"></span>
              <span>{{ $t('applications.components.applications.ApplicationLaunchSetupPanel.title') }}</span>
            </div>

            <div class="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
              <div class="min-w-0">
                <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  {{ application.name }}
                </h1>
                <p class="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                  {{ application.description || $t('applications.shared.noDescriptionProvided') }}
                </p>
                <div class="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                  {{ $t('applications.components.applications.ApplicationShell.applicationReadyNotice') }}
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p class="text-sm leading-6 text-slate-600">
                  {{ $t('applications.components.applications.ApplicationShell.businessOverviewHelp') }}
                </p>
                <button
                  v-if="technicalDetailsAvailable"
                  type="button"
                  class="mt-4 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  @click="showTechnicalDetails = !showTechnicalDetails"
                >
                  {{ showTechnicalDetails
                    ? $t('applications.components.applications.ApplicationShell.hideTechnicalDetails')
                    : $t('applications.components.applications.ApplicationShell.showTechnicalDetails') }}
                </button>

                <div v-if="showTechnicalDetails" class="mt-4 grid gap-3">
                  <div v-for="item in detailItems" :key="item.label">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ item.label }}</p>
                    <p class="mt-1 break-all text-slate-900">{{ item.value }}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <ApplicationLaunchSetupPanel
            class="mt-6"
            :application-id="application.id"
            presentation="page"
            @setup-state-change="updateSetupGateState"
          />

          <div
            data-testid="application-pre-entry-gate"
            class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div class="space-y-2">
                <h2 class="text-lg font-semibold text-slate-900">
                  {{ $t('applications.components.applications.ApplicationShell.preEntryGateTitle') }}
                </h2>
                <p class="max-w-3xl text-sm leading-6 text-slate-600">
                  {{ preEntryGateDescription }}
                </p>
              </div>

              <button
                type="button"
                class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                :disabled="!canLaunchFromSetupGate"
                @click="enterApplication"
              >
                {{ $t('applications.components.applications.ApplicationShell.enterApplication') }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div
      v-else
      class="h-full min-h-0 flex-1 bg-slate-950"
      data-testid="application-immersive-phase"
    >
      <div class="relative flex h-full min-h-0 w-full">
        <ApplicationImmersiveControlPanel
          v-if="application"
          :application-name="application.name"
          :reload-disabled="isReloadDisabled"
          :reload-status-message="immersiveReloadHint"
          @reload-application="reloadApplication"
          @exit-application="exitApplication"
        >
          <template #details>
            <div class="space-y-4 text-sm text-slate-700">
              <div>
                <h3 class="text-base font-semibold text-slate-900">{{ application.name }}</h3>
                <p class="mt-2 leading-6 text-slate-600">
                  {{ application.description || $t('applications.shared.noDescriptionProvided') }}
                </p>
              </div>

              <button
                v-if="technicalDetailsAvailable"
                type="button"
                class="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                @click="showTechnicalDetails = !showTechnicalDetails"
              >
                {{ showTechnicalDetails
                  ? $t('applications.components.applications.ApplicationShell.hideTechnicalDetails')
                  : $t('applications.components.applications.ApplicationShell.showTechnicalDetails') }}
              </button>

              <div v-if="showTechnicalDetails" class="space-y-3">
                <div
                  v-for="item in detailItems"
                  :key="item.label"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                >
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ item.label }}</p>
                  <p class="mt-1 break-all text-sm text-slate-800">{{ item.value }}</p>
                </div>
              </div>
            </div>
          </template>

          <template #configure>
            <ApplicationLaunchSetupPanel
              :application-id="application.id"
              presentation="panel"
              @setup-state-change="updateSetupGateState"
            />
          </template>
        </ApplicationImmersiveControlPanel>

        <div class="flex min-h-0 flex-1">
          <div
            v-if="loading"
            class="flex min-h-0 flex-1 items-center justify-center px-6"
          >
            <div class="flex flex-col items-center gap-3 text-center text-slate-300">
              <div class="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-400"></div>
              <p class="text-sm font-medium">{{ $t('applications.components.applications.ApplicationShell.loadingApplication') }}</p>
            </div>
          </div>

          <div
            v-else-if="loadError"
            class="flex min-h-0 flex-1 items-center justify-center px-6"
          >
            <div class="w-full max-w-xl rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100 shadow-xl shadow-slate-950/30">
              <p class="text-lg font-semibold">{{ $t('applications.components.applications.ApplicationShell.unableToLoadApplication') }}</p>
              <p class="mt-3 leading-6">{{ loadError }}</p>
              <button
                type="button"
                class="mt-5 inline-flex items-center rounded-md border border-red-300/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-50 transition-colors hover:bg-red-500/20"
                @click="exitApplication"
              >
                {{ $t('applications.components.applications.ApplicationImmersiveControlPanel.exitApplication') }}
              </button>
            </div>
          </div>

          <div
            v-else-if="!application"
            class="flex min-h-0 flex-1 items-center justify-center px-6"
          >
            <div class="w-full max-w-xl rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100 shadow-xl shadow-slate-950/30">
              <p class="text-lg font-semibold">{{ $t('applications.components.applications.ApplicationShell.applicationNotFound') }}</p>
              <p class="mt-3 leading-6">{{ $t('applications.components.applications.ApplicationShell.noApplicationExistsForId', { id: applicationId }) }}</p>
              <button
                type="button"
                class="mt-5 inline-flex items-center rounded-md border border-red-300/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-50 transition-colors hover:bg-red-500/20"
                @click="exitApplication"
              >
                {{ $t('applications.components.applications.ApplicationImmersiveControlPanel.exitApplication') }}
              </button>
            </div>
          </div>

          <div
            v-else-if="hostLaunchLoading && !launchState.launchInstanceId"
            class="flex min-h-0 flex-1 items-center justify-center px-6"
            data-testid="application-immersive-loading-canvas"
          >
            <div class="flex flex-col items-center gap-4 text-center text-slate-300">
              <div class="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-400"></div>
              <div class="space-y-2">
                <p class="text-lg font-semibold text-white">{{ $t('applications.components.applications.ApplicationShell.startingApplication') }}</p>
                <p class="max-w-xl text-sm leading-6 text-slate-400">
                  {{ $t('applications.components.applications.ApplicationShell.preEntryGateDescription') }}
                </p>
              </div>
            </div>
          </div>

          <div
            v-else-if="hostLaunchError && !launchState.launchInstanceId"
            class="flex min-h-0 flex-1 items-center justify-center px-6"
            data-testid="application-immersive-error-canvas"
          >
            <div class="w-full max-w-2xl rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100 shadow-xl shadow-slate-950/30">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p class="text-lg font-semibold text-white">{{ $t('applications.components.applications.ApplicationIframeHost.initializationFailed') }}</p>
                  <p class="mt-3 leading-6 text-red-100">{{ hostLaunchError }}</p>
                </div>
                <div class="flex flex-wrap gap-3">
                  <button
                    type="button"
                    class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    :disabled="isReloadDisabled"
                    @click="reloadApplication"
                  >
                    {{ $t('applications.components.applications.ApplicationShell.retryLaunch') }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center rounded-md border border-slate-600 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-900"
                    @click="exitApplication"
                  >
                    {{ $t('applications.components.applications.ApplicationImmersiveControlPanel.exitApplication') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <ApplicationSurface
            v-else-if="launchState.launchInstanceId"
            class="flex-1"
            :application="application"
            :launch-instance-id="launchState.launchInstanceId"
          />

          <div
            v-else
            class="flex min-h-0 flex-1 items-center justify-center px-6"
            data-testid="application-immersive-loading-canvas"
          >
            <div class="flex flex-col items-center gap-4 text-center text-slate-300">
              <div class="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-400"></div>
              <p class="text-lg font-semibold text-white">{{ $t('applications.components.applications.ApplicationShell.startingApplication') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ApplicationImmersiveControlPanel from '~/components/applications/ApplicationImmersiveControlPanel.vue'
import ApplicationLaunchSetupPanel from '~/components/applications/ApplicationLaunchSetupPanel.vue'
import ApplicationSurface from '~/components/applications/ApplicationSurface.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useAppLayoutStore } from '~/stores/appLayoutStore'
import { useApplicationHostStore } from '~/stores/applicationHostStore'
import { useApplicationStore } from '~/stores/applicationStore'
import type { ApplicationLaunchSetupGateState } from '~/utils/application/applicationSetupGate'

interface ShellDetailItem {
  label: string
  value: string
}

type ApplicationShellPhase = 'setup' | 'immersive'

const createDefaultSetupGateState = (): ApplicationLaunchSetupGateState => ({
  phase: 'loading',
  isLaunchReady: false,
  blockingReason: null,
})

const route = useRoute()
const applicationStore = useApplicationStore()
const applicationHostStore = useApplicationHostStore()
const appLayoutStore = useAppLayoutStore()
const { t: $t } = useLocalization()

const phase = ref<ApplicationShellPhase>('setup')
const loading = ref(false)
const loadError = ref<string | null>(null)
const latestLoadRequestId = ref(0)
const launchSetupGateState = ref<ApplicationLaunchSetupGateState>(createDefaultSetupGateState())
const launchRequestPending = ref(false)
const launchActionError = ref<string | null>(null)
const showTechnicalDetails = ref(false)

const applicationId = computed(() => String(route.params.id || '').trim())
const application = computed(() => applicationStore.getApplicationById(applicationId.value))
const launchState = computed(() => applicationHostStore.getLaunchState(applicationId.value))
const hostLaunchLoading = computed(() => launchRequestPending.value || launchState.value.status === 'preparing')
const hostLaunchError = computed(() => (
  launchState.value.lastError
  || launchState.value.lastFailure
  || launchActionError.value
  || null
))
const canLaunchFromSetupGate = computed(() => launchSetupGateState.value.isLaunchReady)
const isReloadDisabled = computed(() => hostLaunchLoading.value || !canLaunchFromSetupGate.value)
const preEntryGateDescription = computed(() => (
  launchSetupGateState.value.blockingReason
  || $t('applications.components.applications.ApplicationShell.preEntryGateDescription')
))
const immersiveReloadHint = computed(() => (
  isReloadDisabled.value && launchSetupGateState.value.blockingReason
    ? launchSetupGateState.value.blockingReason
    : null
))
const technicalDetailsAvailable = computed(() => detailItems.value.length > 0)

const detailItems = computed<ShellDetailItem[]>(() => {
  if (!application.value?.technicalDetails) {
    return []
  }

  const items: ShellDetailItem[] = [
    {
      label: $t('applications.shared.package'),
      value: application.value.technicalDetails.packageId,
    },
    {
      label: $t('applications.shared.localApplicationId'),
      value: application.value.technicalDetails.localApplicationId,
    },
    {
      label: $t('applications.shared.bundleResources'),
      value: application.value.technicalDetails.bundleResources.length > 0
        ? application.value.technicalDetails.bundleResources.map((resource) => `${resource.localId} → ${resource.definitionId}`).join(' · ')
        : $t('applications.shared.noBundleResources'),
    },
    {
      label: $t('applications.shared.writableSource'),
      value: application.value.technicalDetails.writable ? $t('applications.shared.yes') : $t('applications.shared.no'),
    },
  ]

  if (launchState.value.engineState) {
    items.push({
      label: $t('applications.components.applications.ApplicationShell.engineStateLabel'),
      value: launchState.value.engineState,
    })
  }

  if (launchState.value.launchInstanceId) {
    items.push({
      label: $t('applications.components.applications.ApplicationShell.launchInstanceIdLabel'),
      value: launchState.value.launchInstanceId,
    })
  }

  if (launchState.value.startedAt) {
    items.push({
      label: $t('applications.components.applications.ApplicationShell.startedAtLabel'),
      value: launchState.value.startedAt,
    })
  }

  return items
})

const resetSetupGateState = (): void => {
  launchSetupGateState.value = createDefaultSetupGateState()
}

const resetVisitPresentationState = (): void => {
  phase.value = 'setup'
  launchRequestPending.value = false
  launchActionError.value = null
  showTechnicalDetails.value = false
  resetSetupGateState()
}

const cleanupRouteVisit = (targetApplicationId: string): void => {
  const normalizedApplicationId = targetApplicationId.trim()
  if (normalizedApplicationId) {
    applicationHostStore.clearLaunchState(normalizedApplicationId)
  }
  appLayoutStore.resetHostShellPresentation()
}

const loadShell = async (): Promise<void> => {
  if (!applicationId.value) {
    loadError.value = $t('applications.components.applications.ApplicationShell.applicationIdMissingFromRoute')
    return
  }

  const requestId = latestLoadRequestId.value + 1
  latestLoadRequestId.value = requestId
  loading.value = true
  loadError.value = null

  try {
    await applicationStore.fetchApplicationById(applicationId.value, true)
    if (latestLoadRequestId.value !== requestId) {
      return
    }
  } catch (error) {
    if (latestLoadRequestId.value !== requestId) {
      return
    }
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    if (latestLoadRequestId.value === requestId) {
      loading.value = false
    }
  }
}

const startFreshHostLaunch = async (): Promise<void> => {
  if (!applicationId.value || !canLaunchFromSetupGate.value) {
    return
  }

  launchActionError.value = null
  launchRequestPending.value = true

  try {
    await applicationHostStore.startLaunch(applicationId.value)
  } catch (error) {
    launchActionError.value = error instanceof Error ? error.message : String(error)
  } finally {
    launchRequestPending.value = false
  }
}

const enterApplication = async (): Promise<void> => {
  if (!application.value || !canLaunchFromSetupGate.value) {
    return
  }

  phase.value = 'immersive'
  await startFreshHostLaunch()
}

const reloadApplication = async (): Promise<void> => {
  if (!application.value || isReloadDisabled.value) {
    return
  }

  phase.value = 'immersive'
  await startFreshHostLaunch()
}

const updateSetupGateState = (value: ApplicationLaunchSetupGateState): void => {
  launchSetupGateState.value = value
}

watch(
  () => phase.value,
  (nextPhase) => {
    if (nextPhase === 'immersive') {
      appLayoutStore.setHostShellPresentation('application_immersive')
      return
    }

    appLayoutStore.resetHostShellPresentation()
  },
  { immediate: true },
)

watch(
  () => applicationId.value,
  (nextApplicationId, previousApplicationId) => {
    if (previousApplicationId && previousApplicationId !== nextApplicationId) {
      cleanupRouteVisit(previousApplicationId)
    }

    cleanupRouteVisit(nextApplicationId)
    resetVisitPresentationState()
    void loadShell()
  },
  { immediate: true },
)

const exitApplication = async (): Promise<void> => {
  const currentApplicationId = applicationId.value
  cleanupRouteVisit(currentApplicationId)
  resetVisitPresentationState()
  await navigateTo('/applications')
}

const goBack = async (): Promise<void> => {
  await navigateTo('/applications')
}

onBeforeUnmount(() => {
  cleanupRouteVisit(applicationId.value)
})
</script>
