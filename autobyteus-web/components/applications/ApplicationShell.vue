<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          class="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          @click="goBack"
        >
          {{ $t('applications.components.applications.ApplicationShell.backToApplications') }}
        </button>

        <div v-if="application" class="flex flex-wrap items-center gap-3">
          <button
            v-if="launchState.launchInstanceId || hostLaunchLoading"
            type="button"
            class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            :disabled="hostLaunchLoading || !canLaunchFromSetupGate"
            @click="launchApplication"
          >
            {{ hostLaunchLoading
              ? $t('applications.components.applications.ApplicationShell.startingApplication')
              : $t('applications.components.applications.ApplicationShell.reloadApplication') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            @click="detailsOpen = !detailsOpen"
          >
            {{ detailsOpen
              ? $t('applications.components.applications.ApplicationShell.hideDetails')
              : $t('applications.components.applications.ApplicationShell.showDetails') }}
          </button>
        </div>
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
        <div class="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {{ $t('applications.components.applications.ApplicationShell.applicationReadyNotice') }}
        </div>

        <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {{ resourceBadgeLabel }}
                </span>
              </div>
              <h1 class="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {{ application.name }}
              </h1>
              <p class="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                {{ application.description || $t('applications.shared.noDescriptionProvided') }}
              </p>
            </div>

            <div class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:grid-cols-2 xl:min-w-[22rem]">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('applications.components.applications.ApplicationShell.engineStateLabel') }}</p>
                <p class="mt-1 break-all">{{ launchState.engineState || '—' }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('applications.components.applications.ApplicationShell.launchInstanceIdLabel') }}</p>
                <p class="mt-1 break-all">{{ launchState.launchInstanceId || '—' }}</p>
              </div>
            </div>
          </div>

          <div
            v-if="detailsOpen"
            class="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2"
          >
            <div v-for="item in detailItems" :key="item.label">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ item.label }}</p>
              <p class="mt-1 break-all">{{ item.value }}</p>
            </div>
          </div>
        </section>

        <ApplicationLaunchSetupPanel
          class="mt-6"
          :application-id="application.id"
          @setup-state-change="updateSetupGateState"
        />

        <div
          v-if="!launchState.launchInstanceId && !hostLaunchLoading && !hostLaunchError"
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
              @click="launchApplication"
            >
              {{ $t('applications.components.applications.ApplicationShell.enterApplication') }}
            </button>
          </div>
        </div>

        <div
          v-else-if="hostLaunchLoading && !launchState.launchInstanceId"
          class="mt-6 rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm"
        >
          <div class="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p class="text-slate-600">{{ $t('applications.components.applications.ApplicationShell.startingApplication') }}</p>
        </div>

        <div
          v-else-if="hostLaunchError"
          class="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p class="font-semibold">{{ $t('applications.components.applications.ApplicationIframeHost.initializationFailed') }}</p>
          <p class="mt-1">{{ hostLaunchError }}</p>
          <button
            type="button"
            class="mt-3 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            :disabled="!canLaunchFromSetupGate"
            @click="launchApplication"
          >
            {{ $t('applications.components.applications.ApplicationShell.retryLaunch') }}
          </button>
        </div>

        <div v-else-if="launchState.launchInstanceId" class="mt-6">
          <ApplicationSurface
            :application="application"
            :launch-instance-id="launchState.launchInstanceId"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ApplicationLaunchSetupPanel from '~/components/applications/ApplicationLaunchSetupPanel.vue'
import ApplicationSurface from '~/components/applications/ApplicationSurface.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useApplicationHostStore } from '~/stores/applicationHostStore'
import { useApplicationStore, type ApplicationRuntimeResourceKind } from '~/stores/applicationStore'
import type { ApplicationLaunchSetupGateState } from '~/utils/application/applicationLaunchSetup'

interface ShellDetailItem {
  label: string
  value: string
}

const route = useRoute()
const applicationStore = useApplicationStore()
const applicationHostStore = useApplicationHostStore()
const { t: $t } = useLocalization()

const loading = ref(false)
const loadError = ref<string | null>(null)
const detailsOpen = ref(false)
const latestLoadRequestId = ref(0)
const launchSetupGateState = ref<ApplicationLaunchSetupGateState>({
  phase: 'loading',
  isLaunchReady: false,
  blockingReason: null,
})

const applicationId = computed(() => String(route.params.id || '').trim())
const application = computed(() => applicationStore.getApplicationById(applicationId.value))
const launchState = computed(() => applicationHostStore.getLaunchState(applicationId.value))
const hostLaunchLoading = computed(() => launchState.value.status === 'preparing')
const hostLaunchError = computed(() => launchState.value.lastError || launchState.value.lastFailure || null)
const canLaunchFromSetupGate = computed(() => launchSetupGateState.value.isLaunchReady)
const preEntryGateDescription = computed(() => (
  launchSetupGateState.value.blockingReason
  || $t('applications.components.applications.ApplicationShell.preEntryGateDescription')
))

const formatKindLabel = (kind: ApplicationRuntimeResourceKind): string => (
  kind === 'AGENT'
    ? $t('applications.shared.singleAgent')
    : $t('applications.shared.agentTeam')
)

const resourceBadgeLabel = computed(() => {
  if (!application.value || application.value.bundleResources.length === 0) {
    return $t('applications.shared.noBundleResources')
  }

  const kinds = [...new Set(application.value.bundleResources.map((resource) => resource.kind))]
  if (kinds.length === 1) {
    return formatKindLabel(kinds[0]!)
  }

  return $t('applications.shared.mixedResources')
})

const detailItems = computed<ShellDetailItem[]>(() => {
  if (!application.value) {
    return []
  }

  const items: ShellDetailItem[] = [
    {
      label: $t('applications.shared.package'),
      value: application.value.packageId,
    },
    {
      label: $t('applications.shared.localApplicationId'),
      value: application.value.localApplicationId,
    },
    {
      label: $t('applications.shared.bundleResources'),
      value: application.value.bundleResources.length > 0
        ? application.value.bundleResources.map((resource) => `${resource.localId} → ${resource.definitionId}`).join(' · ')
        : $t('applications.shared.noBundleResources'),
    },
    {
      label: $t('applications.shared.writableSource'),
      value: application.value.writable ? $t('applications.shared.yes') : $t('applications.shared.no'),
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
    const resolvedApplication = await applicationStore.fetchApplicationById(applicationId.value, true)
    if (latestLoadRequestId.value !== requestId) {
      return
    }

    if (!resolvedApplication) {
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

const launchApplication = async (): Promise<void> => {
  if (!applicationId.value || !canLaunchFromSetupGate.value) {
    return
  }

  loadError.value = null
  try {
    await applicationHostStore.startLaunch(applicationId.value)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  }
}

const updateSetupGateState = (value: ApplicationLaunchSetupGateState): void => {
  launchSetupGateState.value = value
}

watch(
  () => applicationId.value,
  () => {
    launchSetupGateState.value = {
      phase: 'loading',
      isLaunchReady: false,
      blockingReason: null,
    }
    void loadShell()
  },
  { immediate: true },
)

const goBack = async (): Promise<void> => {
  await navigateTo('/applications')
}
</script>
