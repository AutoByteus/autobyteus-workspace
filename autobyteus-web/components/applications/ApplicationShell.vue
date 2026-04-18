<template>
  <div :class="shellRootClasses">
    <div v-if="!hasLiveSessionShell" :class="pageContainerClasses">
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
        <div
          v-if="bindingNotice"
          class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          {{ bindingNotice }}
        </div>

        <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {{ runtimeTargetLabel }}
                </span>
              </div>
              <h1 class="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {{ application.name }}
              </h1>
              <p class="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                {{ application.description || $t('applications.shared.noDescriptionProvided') }}
              </p>
              <p class="mt-4 text-sm text-slate-500">
                {{ $t('applications.components.applications.ApplicationShell.launchToOpenAppView') }}
              </p>
            </div>

            <div class="flex shrink-0 flex-wrap items-center gap-3">
              <button
                type="button"
                class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                @click="launchModalOpen = true"
              >
                {{ $t('applications.components.applications.ApplicationLaunchConfigModal.launch_application') }}
              </button>
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                data-testid="application-details-toggle"
                @click="detailsOpen = !detailsOpen"
              >
                {{ detailsOpen
                  ? $t('applications.components.applications.ApplicationShell.hideDetails')
                  : $t('applications.components.applications.ApplicationShell.showDetails') }}
              </button>
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
      </template>
    </div>

    <template v-else>
      <div v-if="isImmersiveApplicationView" class="relative flex-1 min-h-0 overflow-hidden">
        <div
          data-testid="application-immersive-surface-container"
          :class="immersiveSurfaceContainerClasses"
        >
          <ApplicationSurface
            :session="activeSession"
            presentation="immersive"
          />
        </div>

        <ApplicationImmersiveControls
          :application-name="application?.name || ''"
          :details-open="detailsOpen"
          @sheet-open-change="handleImmersiveControlsSheetOpenChange"
          @exit-immersive="exitImmersive"
          @switch-execution="switchToExecution"
          @toggle-details="detailsOpen = !detailsOpen"
          @relaunch="launchModalOpen = true"
          @stop-session="terminateActiveSession"
        />

        <div
          v-if="bindingNotice"
          class="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4"
        >
          <div class="pointer-events-auto max-w-3xl rounded-full border border-amber-300 bg-amber-50/95 px-4 py-2 text-sm text-amber-900 shadow-lg backdrop-blur">
            {{ bindingNotice }}
          </div>
        </div>

        <div
          v-if="detailsOpen"
          class="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-end px-4 sm:px-6 lg:px-8"
        >
          <div class="pointer-events-auto w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/85 p-4 text-sm text-slate-100 shadow-2xl backdrop-blur-md">
            <div class="grid gap-4 sm:grid-cols-2">
              <div v-for="item in detailItems" :key="item.label">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ item.label }}</p>
                <p class="mt-1 break-all text-slate-100">{{ item.value }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-1 min-h-0 flex-col">
        <ApplicationLiveSessionToolbar
          :application-name="application?.name || ''"
          :page-mode="pageMode"
          :application-presentation="applicationPresentation"
          :details-open="detailsOpen"
          :binding-notice="bindingNotice"
          :detail-items="detailItems"
          @back="goBack"
          @set-mode="pageMode = $event"
          @enter-immersive="enterImmersive"
          @toggle-details="detailsOpen = !detailsOpen"
          @relaunch="launchModalOpen = true"
          @stop-session="terminateActiveSession"
        />

        <div
          v-if="pageMode === 'application'"
          class="flex-1 min-h-0 px-4 py-4 sm:px-6 lg:px-8"
        >
          <ApplicationSurface
            :session="activeSession"
            presentation="standard"
          />
        </div>

        <ApplicationExecutionWorkspace
          v-else
          :session="activeSession"
          :selected-member-route-key="selectedMemberRouteKey"
          @update:selected-member-route-key="selectedMemberRouteKey = $event"
          @open-full-execution-monitor="openFullExecutionMonitor"
        />
      </div>
    </template>

    <ApplicationLaunchConfigModal
      :show="launchModalOpen"
      :application="application"
      @close="launchModalOpen = false"
      @launched="handleLaunched"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ApplicationImmersiveControls from '~/components/applications/ApplicationImmersiveControls.vue'
import ApplicationLaunchConfigModal from '~/components/applications/ApplicationLaunchConfigModal.vue'
import ApplicationLiveSessionToolbar from '~/components/applications/ApplicationLiveSessionToolbar.vue'
import ApplicationSurface from '~/components/applications/ApplicationSurface.vue'
import ApplicationExecutionWorkspace from '~/components/applications/execution/ApplicationExecutionWorkspace.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useAppLayoutStore } from '~/stores/appLayoutStore'
import { useApplicationPageStore } from '~/stores/applicationPageStore'
import { useApplicationSessionStore } from '~/stores/applicationSessionStore'
import { useApplicationStore } from '~/stores/applicationStore'
import type { ApplicationSurfacePresentation } from '~/types/application/ApplicationSurfacePresentation'
import type { ApplicationSessionBinding } from '~/types/application/ApplicationSession'
import type { WorkspaceExecutionLink } from '~/types/workspace/WorkspaceExecutionLink'
import { buildWorkspaceExecutionRoute } from '~/services/workspace/workspaceNavigationService'

interface ShellDetailItem {
  label: string
  value: string
}

const route = useRoute()
const router = useRouter()
const applicationStore = useApplicationStore()
const applicationSessionStore = useApplicationSessionStore()
const applicationPageStore = useApplicationPageStore()
const appLayoutStore = useAppLayoutStore()
const { t: $t } = useLocalization()

const loading = ref(false)
const loadError = ref<string | null>(null)
const launchModalOpen = ref(false)
const detailsOpen = ref(false)
const immersiveControlsSheetOpen = ref(false)
const routeBinding = ref<ApplicationSessionBinding | null>(null)
const latestLoadRequestId = ref(0)
const applicationPresentation = ref<ApplicationSurfacePresentation>('immersive')

const applicationId = computed(() => String(route.params.id || '').trim())
const application = computed(() => applicationStore.getApplicationById(applicationId.value))
const requestedSessionId = computed(() => {
  const raw = route.query.applicationSessionId
  return typeof raw === 'string' ? raw.trim() : ''
})

const activeSession = computed(() => {
  const resolvedSessionId = routeBinding.value?.resolvedSessionId?.trim() || ''
  return resolvedSessionId
    ? applicationSessionStore.getSessionById(resolvedSessionId)
    : null
})

const hasLiveSessionShell = computed(() => Boolean(application.value && activeSession.value))

const pageContainerClasses = 'mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8'

const pageMode = computed({
  get: () => applicationPageStore.getMode(applicationId.value),
  set: (mode: 'application' | 'execution') => {
    if (!applicationId.value) {
      return
    }
    applicationPageStore.setMode(applicationId.value, mode)
  },
})

const selectedMemberRouteKey = computed({
  get: () => applicationPageStore.getSelectedMemberRouteKey(applicationId.value),
  set: (memberRouteKey: string | null) => {
    if (!applicationId.value) {
      return
    }
    applicationPageStore.setSelectedMemberRouteKey(applicationId.value, memberRouteKey)
  },
})

const runtimeTargetLabel = computed(() => (
  application.value?.runtimeTarget.kind === 'AGENT'
    ? $t('applications.shared.singleAgent')
    : $t('applications.shared.agentTeam')
))

const bindingNotice = computed(() => {
  if (!requestedSessionId.value || !routeBinding.value) {
    return null
  }

  if (routeBinding.value.resolution === 'application_active') {
    return $t('applications.components.applications.ApplicationShell.requestedSessionReattachedNotice')
  }

  if (routeBinding.value.resolution === 'none') {
    return $t('applications.components.applications.ApplicationShell.requestedSessionMissingNotice')
  }

  return null
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
      label: $t('applications.shared.runtimeTargetId'),
      value: application.value.runtimeTarget.definitionId,
    },
    {
      label: $t('applications.shared.writableSource'),
      value: application.value.writable ? $t('applications.shared.yes') : $t('applications.shared.no'),
    },
  ]

  if (!activeSession.value) {
    return items
  }

  return [
    ...items,
    {
      label: $t('applications.components.applications.ApplicationShell.sessionIdLabel'),
      value: activeSession.value.applicationSessionId,
    },
    {
      label: $t('applications.components.applications.ApplicationShell.runtimeKindLabel'),
      value: activeSession.value.runtime.kind,
    },
    {
      label: $t('applications.components.applications.ApplicationShell.runIdLabel'),
      value: activeSession.value.runtime.runId,
    },
    {
      label: $t('applications.components.applications.ApplicationShell.bindingResultLabel'),
      value: routeBinding.value?.resolution || 'requested_live',
    },
  ]
})

const isImmersiveApplicationView = computed(() => (
  Boolean(activeSession.value)
  && pageMode.value === 'application'
  && applicationPresentation.value === 'immersive'
))

const shellRootClasses = computed(() => {
  if (isImmersiveApplicationView.value) {
    return 'relative flex h-full min-h-0 flex-1 overflow-hidden bg-slate-950'
  }

  if (hasLiveSessionShell.value) {
    return 'flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-50'
  }

  return 'h-full flex-1 overflow-auto bg-slate-50'
})

const immersiveSurfaceContainerClasses = computed(() => (
  immersiveControlsSheetOpen.value
    ? 'h-full min-h-0 transition-all duration-300 ease-out lg:pr-80'
    : 'h-full min-h-0 transition-all duration-300 ease-out'
))

const activeExecutionLink = computed<WorkspaceExecutionLink | null>(() => {
  const session = activeSession.value
  if (!session) {
    return null
  }

  if (session.runtime.kind === 'AGENT') {
    return {
      kind: 'agent',
      runId: session.runtime.runId,
    }
  }

  const availableMembers = session.view.members
  const focusedMemberRouteKey = selectedMemberRouteKey.value
    && availableMembers.some((member) => member.memberRouteKey === selectedMemberRouteKey.value)
    ? selectedMemberRouteKey.value
    : availableMembers[0]?.memberRouteKey ?? null

  return {
    kind: 'team',
    teamRunId: session.runtime.runId,
    memberRouteKey: focusedMemberRouteKey,
  }
})

const syncRouteToResolvedSession = async (
  resolvedSessionId: string | null | undefined,
): Promise<void> => {
  const nextSessionId = resolvedSessionId?.trim() || undefined
  const currentSessionId = requestedSessionId.value || undefined
  if (nextSessionId === currentSessionId) {
    return
  }

  const nextQuery = { ...route.query }
  if (nextSessionId) {
    nextQuery.applicationSessionId = nextSessionId
  } else {
    delete nextQuery.applicationSessionId
  }

  await router.replace({
    path: route.path,
    query: nextQuery,
  })
}

const ensureSelectedMember = (): void => {
  const members = activeSession.value?.view.members ?? []
  if (members.length === 0) {
    selectedMemberRouteKey.value = null
    return
  }

  if (
    selectedMemberRouteKey.value
    && members.some((member) => member.memberRouteKey === selectedMemberRouteKey.value)
  ) {
    return
  }

  selectedMemberRouteKey.value = members[0]?.memberRouteKey ?? null
}

const loadShell = async (): Promise<void> => {
  if (!applicationId.value) {
    loadError.value = $t('applications.components.applications.ApplicationShell.applicationIdMissingFromRoute')
    routeBinding.value = null
    return
  }

  const requestId = latestLoadRequestId.value + 1
  latestLoadRequestId.value = requestId
  loading.value = true
  loadError.value = null

  try {
    await applicationStore.fetchApplicationById(applicationId.value, true)
    const binding = await applicationSessionStore.bindApplicationRoute(
      applicationId.value,
      requestedSessionId.value || null,
    )

    if (latestLoadRequestId.value !== requestId) {
      return
    }

    routeBinding.value = binding
    ensureSelectedMember()
    await syncRouteToResolvedSession(binding.resolvedSessionId)
  } catch (error) {
    if (latestLoadRequestId.value !== requestId) {
      return
    }
    routeBinding.value = null
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    if (latestLoadRequestId.value === requestId) {
      loading.value = false
    }
  }
}

const resetImmersivePresentation = (): void => {
  applicationPresentation.value = 'immersive'
  immersiveControlsSheetOpen.value = false
  detailsOpen.value = false
}

const enterImmersive = (): void => { applicationPresentation.value = 'immersive'; immersiveControlsSheetOpen.value = false }
const exitImmersive = (): void => { applicationPresentation.value = 'standard'; immersiveControlsSheetOpen.value = false }
const switchToExecution = (): void => { immersiveControlsSheetOpen.value = false; pageMode.value = 'execution' }
const handleImmersiveControlsSheetOpenChange = (open: boolean): void => { immersiveControlsSheetOpen.value = open; if (open) detailsOpen.value = false }

watch(
  () => [applicationId.value, requestedSessionId.value] as const,
  () => {
    void loadShell()
  },
  { immediate: true },
)

watch(
  () => activeSession.value?.view.members.map((member) => member.memberRouteKey).join('|') ?? '',
  () => {
    ensureSelectedMember()
  },
)

watch(
  () => activeSession.value?.applicationSessionId ?? '',
  (sessionId, previousSessionId) => {
    if (sessionId && sessionId !== previousSessionId) {
      resetImmersivePresentation()
    }
  },
  { immediate: true },
)

watch(
  isImmersiveApplicationView,
  (immersive) => {
    appLayoutStore.setHostShellPresentation(
      immersive ? 'application_immersive' : 'standard',
    )
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  appLayoutStore.resetHostShellPresentation()
})

const handleLaunched = async (payload: {
  applicationId: string
  applicationSessionId: string
}): Promise<void> => {
  launchModalOpen.value = false
  pageMode.value = 'application'
  resetImmersivePresentation()
  await router.replace({
    path: `/applications/${encodeURIComponent(payload.applicationId)}`,
    query: {
      ...route.query,
      applicationSessionId: payload.applicationSessionId,
    },
  })
}

const terminateActiveSession = async (): Promise<void> => {
  if (!activeSession.value) {
    return
  }

  await applicationSessionStore.terminateSession(activeSession.value.applicationSessionId)
  pageMode.value = 'application'
  detailsOpen.value = false
  await loadShell()
}

const openFullExecutionMonitor = async (): Promise<void> => {
  const executionLink = activeExecutionLink.value
  if (!executionLink) {
    return
  }
  await navigateTo(buildWorkspaceExecutionRoute(executionLink))
}

const goBack = async (): Promise<void> => {
  await navigateTo('/applications')
}
</script>
