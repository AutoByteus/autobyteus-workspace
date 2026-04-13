<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <button
        type="button"
        class="mb-5 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        @click="goBack"
      >
        ← Back to applications
      </button>

      <div
        v-if="loading"
        class="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm"
      >
        <div class="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p class="text-slate-600">Loading application…</p>
      </div>

      <div
        v-else-if="loadError"
        class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <p class="font-semibold">Unable to load application</p>
        <p class="mt-1">{{ loadError }}</p>
      </div>

      <div
        v-else-if="!application"
        class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <p class="font-semibold">Application not found</p>
        <p class="mt-1">No application exists for id <span class="font-mono">{{ applicationId }}</span>.</p>
      </div>

      <template v-else>
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="truncate text-3xl font-semibold text-slate-900">{{ application.name }}</h1>
                <span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {{ application.runtimeTarget.kind === 'AGENT' ? 'Single agent' : 'Agent team' }}
                </span>
                <span
                  v-if="activeSession"
                  class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                >
                  Session active
                </span>
              </div>

              <p class="mt-3 max-w-4xl text-sm text-slate-600">
                {{ application.description || 'No description provided.' }}
              </p>

              <div class="mt-5 grid gap-4 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Package</p>
                  <p class="mt-1 break-all">{{ application.packageId }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Local application id</p>
                  <p class="mt-1 break-all">{{ application.localApplicationId }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Runtime target id</p>
                  <p class="mt-1 break-all">{{ application.runtimeTarget.definitionId }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Writable source</p>
                  <p class="mt-1">{{ application.writable ? 'Yes' : 'No' }}</p>
                </div>
              </div>
            </div>

            <div class="flex shrink-0 flex-wrap items-center gap-3">
              <button
                type="button"
                class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                @click="launchModalOpen = true"
              >
                {{ activeSession ? 'Launch again' : 'Launch application' }}
              </button>
              <button
                v-if="activeSession"
                type="button"
                class="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                @click="terminateActiveSession"
              >
                Stop session
              </button>
            </div>
          </div>
        </section>

        <div
          v-if="bindingNotice"
          class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          {{ bindingNotice }}
        </div>

        <section class="mt-6 space-y-4">
          <div
            v-if="activeSession"
            class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-slate-900">Bound session</h2>
                <p class="mt-1 break-all text-sm text-slate-600">
                  Session <span class="font-mono">{{ activeSession.applicationSessionId }}</span>
                </p>
                <p class="mt-1 text-xs text-slate-500">
                  Binding result:
                  <span class="font-medium text-slate-700">{{ routeBinding?.resolution || 'requested_live' }}</span>
                  · runtime {{ activeSession.runtime.kind }}
                  · run <span class="font-mono">{{ activeSession.runtime.runId }}</span>
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  :class="pageMode === 'application'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'"
                  @click="pageMode = 'application'"
                >
                  Application
                </button>
                <button
                  type="button"
                  class="rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  :class="pageMode === 'execution'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'"
                  @click="pageMode = 'execution'"
                >
                  Execution
                </button>
              </div>
            </div>
          </div>

          <ApplicationSurface
            v-if="pageMode === 'application'"
            :session="activeSession"
          />

          <ApplicationExecutionWorkspace
            v-else
            :session="activeSession"
            :selected-member-route-key="selectedMemberRouteKey"
            @update:selected-member-route-key="selectedMemberRouteKey = $event"
          />
        </section>
      </template>
    </div>

    <ApplicationLaunchConfigModal
      :show="launchModalOpen"
      :application="application"
      @close="launchModalOpen = false"
      @launched="handleLaunched"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ApplicationLaunchConfigModal from '~/components/applications/ApplicationLaunchConfigModal.vue'
import ApplicationSurface from '~/components/applications/ApplicationSurface.vue'
import ApplicationExecutionWorkspace from '~/components/applications/execution/ApplicationExecutionWorkspace.vue'
import { useApplicationPageStore } from '~/stores/applicationPageStore'
import { useApplicationSessionStore } from '~/stores/applicationSessionStore'
import { useApplicationStore } from '~/stores/applicationStore'
import type { ApplicationSessionBinding } from '~/types/application/ApplicationSession'

const route = useRoute()
const router = useRouter()
const applicationStore = useApplicationStore()
const applicationSessionStore = useApplicationSessionStore()
const applicationPageStore = useApplicationPageStore()

const loading = ref(false)
const loadError = ref<string | null>(null)
const launchModalOpen = ref(false)
const routeBinding = ref<ApplicationSessionBinding | null>(null)
const latestLoadRequestId = ref(0)

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

const bindingNotice = computed(() => {
  if (!requestedSessionId.value || !routeBinding.value) {
    return null
  }

  if (routeBinding.value.resolution === 'application_active') {
    return 'The requested session was no longer live, so the page reattached to the current active session for this application.'
  }

  if (routeBinding.value.resolution === 'none') {
    return 'The requested session could not be restored, and there is no active session for this application right now.'
  }

  return null
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
    loadError.value = 'Application id is missing from the route.'
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

const handleLaunched = async (payload: {
  applicationId: string
  applicationSessionId: string
}): Promise<void> => {
  launchModalOpen.value = false
  pageMode.value = 'application'
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
  await loadShell()
}

const goBack = async (): Promise<void> => {
  await navigateTo('/applications')
}
</script>
