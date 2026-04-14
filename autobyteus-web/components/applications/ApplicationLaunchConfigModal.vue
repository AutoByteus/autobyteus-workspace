<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div class="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div class="border-b border-slate-200 px-6 py-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-slate-900">
                {{ application
                  ? $t('applications.components.applications.ApplicationLaunchConfigModal.launch_title', { name: application.name })
                  : $t('applications.components.applications.ApplicationLaunchConfigModal.launch_application') }}
              </h2>
              <p class="mt-1 text-sm text-slate-600">
                {{ $t('applications.components.applications.ApplicationLaunchConfigModal.description') }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              @click="closeModal"
            >
              <span class="sr-only">{{ $t('applications.components.applications.ApplicationLaunchConfigModal.close') }}</span>
              ✕
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto bg-slate-50 px-6 py-5">
          <div v-if="isLoading" class="flex min-h-[20rem] flex-col items-center justify-center gap-3 text-slate-500">
            <div class="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p class="text-sm font-medium">{{ $t('applications.components.applications.ApplicationLaunchConfigModal.preparingLaunchDefaults') }}</p>
          </div>

          <div
            v-else-if="loadError"
            class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p class="font-semibold">{{ $t('applications.components.applications.ApplicationLaunchConfigModal.unableToPrepareLaunch') }}</p>
            <p class="mt-1">{{ loadError }}</p>
          </div>

          <div v-else-if="preparedLaunch" class="space-y-5">
            <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="grid gap-4 md:grid-cols-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('applications.components.applications.ApplicationLaunchConfigModal.runtimeKind') }}</p>
                  <p class="mt-1 text-sm text-slate-900">{{ runtimeKindLabel }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('applications.shared.package') }}</p>
                  <p class="mt-1 break-all text-sm text-slate-900">{{ preparedLaunch.application.packageId }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('applications.shared.writableSource') }}</p>
                  <p class="mt-1 text-sm text-slate-900">{{ preparedLaunch.application.writable ? $t('applications.shared.yes') : $t('applications.shared.no') }}</p>
                </div>
              </div>
            </section>

            <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 class="text-base font-semibold text-slate-900">{{ $t('applications.components.applications.ApplicationLaunchConfigModal.boundRuntimeTarget') }}</h3>
              <p class="mt-1 text-sm text-slate-600">
                {{ boundDefinitionSummary }}
              </p>
            </section>

            <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <AgentRunConfigForm
                v-if="preparedLaunch.kind === 'AGENT'"
                :config="preparedLaunch.config"
                :agent-definition="preparedLaunch.agentDefinition"
                :workspace-loading-state="effectiveWorkspaceLoadingState"
                @select-existing="handleSelectExisting"
                @load-new="handleLoadNew"
              />
              <TeamRunConfigForm
                v-else
                :config="preparedLaunch.config"
                :team-definition="preparedLaunch.teamDefinition"
                :workspace-loading-state="effectiveWorkspaceLoadingState"
                @select-existing="handleSelectExisting"
                @load-new="handleLoadNew"
              />
            </section>

            <div
              v-if="sessionStore.launchError"
              class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {{ sessionStore.launchError }}
            </div>
          </div>
        </div>

        <div class="border-t border-slate-200 bg-white px-6 py-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs text-slate-500">
              {{ $t('applications.components.applications.ApplicationLaunchConfigModal.handshakeNote') }}
            </p>

            <div class="flex items-center justify-end gap-3">
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                :disabled="sessionStore.launching"
                @click="closeModal"
              >
                {{ $t('applications.components.applications.ApplicationLaunchConfigModal.cancel') }}
              </button>
              <button
                type="button"
                class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="launchDisabled"
                @click="launch"
              >
                <span
                  v-if="sessionStore.launching"
                  class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"
                ></span>
                {{ sessionStore.launching
                  ? $t('applications.components.applications.ApplicationLaunchConfigModal.launching')
                  : $t('applications.components.applications.ApplicationLaunchConfigModal.launch_application') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AgentRunConfigForm from '~/components/workspace/config/AgentRunConfigForm.vue'
import TeamRunConfigForm from '~/components/workspace/config/TeamRunConfigForm.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useApplicationSessionStore, type PreparedApplicationLaunch } from '~/stores/applicationSessionStore'
import type { ApplicationCatalogEntry } from '~/stores/applicationStore'
import { useWorkspaceStore } from '~/stores/workspace'

interface WorkspaceLoadingState {
  isLoading: boolean
  error: string | null
  loadedPath: string | null
}

const props = defineProps<{
  show: boolean
  application: ApplicationCatalogEntry | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'launched', payload: { applicationId: string; applicationSessionId: string }): void
}>()

const sessionStore = useApplicationSessionStore()
const workspaceStore = useWorkspaceStore()
const { t: $t } = useLocalization()

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const preparedLaunch = ref<PreparedApplicationLaunch | null>(null)
const workspaceLoadingState = reactive<WorkspaceLoadingState>({
  isLoading: false,
  error: null,
  loadedPath: null,
})

const resolveWorkspacePath = (workspaceId: string | null | undefined): string | null => {
  const normalizedWorkspaceId = (workspaceId || '').trim()
  if (!normalizedWorkspaceId) {
    return null
  }

  const workspace = workspaceStore.workspaces[normalizedWorkspaceId]
  return workspace?.absolutePath
    || workspace?.workspaceConfig?.root_path
    || workspace?.workspaceConfig?.rootPath
    || null
}

const resetWorkspaceLoadingState = (): void => {
  workspaceLoadingState.isLoading = false
  workspaceLoadingState.error = null
  workspaceLoadingState.loadedPath = null
}

const effectiveWorkspaceLoadingState = computed(() => ({
  ...workspaceLoadingState,
  loadedPath:
    workspaceLoadingState.loadedPath
    || resolveWorkspacePath(preparedLaunch.value?.config.workspaceId)
    || null,
}))

const runtimeKindLabel = computed(() => {
  if (!preparedLaunch.value) {
    return ''
  }
  return preparedLaunch.value.kind === 'AGENT'
    ? $t('applications.shared.singleAgent')
    : $t('applications.shared.agentTeam')
})

const boundDefinitionSummary = computed(() => {
  if (!preparedLaunch.value) {
    return ''
  }

  if (preparedLaunch.value.kind === 'AGENT') {
    return `${preparedLaunch.value.agentDefinition.name} (${preparedLaunch.value.agentDefinition.id})`
  }

  return `${preparedLaunch.value.teamDefinition.name} (${preparedLaunch.value.teamDefinition.id})`
})

const launchDisabled = computed(() => {
  if (!preparedLaunch.value || isLoading.value || sessionStore.launching) {
    return true
  }

  if (preparedLaunch.value.kind === 'AGENT') {
    return !preparedLaunch.value.config.workspaceId || !preparedLaunch.value.config.llmModelIdentifier
  }

  return !preparedLaunch.value.config.llmModelIdentifier
})

const prepareDraft = async (): Promise<void> => {
  if (!props.show || !props.application) {
    preparedLaunch.value = null
    resetWorkspaceLoadingState()
    return
  }

  isLoading.value = true
  loadError.value = null
  preparedLaunch.value = null
  sessionStore.clearLaunchError()
  resetWorkspaceLoadingState()

  try {
    await workspaceStore.fetchAllWorkspaces()
    preparedLaunch.value = await sessionStore.prepareLaunchDraft(props.application.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    loadError.value = message
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [props.show, props.application?.id] as const,
  ([show, applicationId], previousValue) => {
    const [previousShow, previousApplicationId] = previousValue ?? [false, undefined]
    if (!show) {
      sessionStore.clearLaunchError()
      loadError.value = null
      preparedLaunch.value = null
      resetWorkspaceLoadingState()
      return
    }

    if (!applicationId) {
      loadError.value = $t('applications.components.applications.ApplicationLaunchConfigModal.applicationMetadataUnavailable')
      preparedLaunch.value = null
      return
    }

    if (show !== previousShow || applicationId !== previousApplicationId) {
      void prepareDraft()
    }
  },
  { immediate: true },
)

const handleSelectExisting = (workspaceId: string): void => {
  if (!preparedLaunch.value) {
    return
  }

  preparedLaunch.value.config.workspaceId = workspaceId
  workspaceLoadingState.error = null
  workspaceLoadingState.loadedPath = resolveWorkspacePath(workspaceId)
}

const handleLoadNew = async (path: string): Promise<void> => {
  if (!preparedLaunch.value) {
    return
  }

  workspaceLoadingState.isLoading = true
  workspaceLoadingState.error = null

  try {
    const workspaceId = await workspaceStore.createWorkspace({ root_path: path })
    preparedLaunch.value.config.workspaceId = workspaceId
    workspaceLoadingState.loadedPath = path
  } catch (error) {
    workspaceLoadingState.error = error instanceof Error ? error.message : String(error)
  } finally {
    workspaceLoadingState.isLoading = false
  }
}

const closeModal = (): void => {
  if (sessionStore.launching) {
    return
  }
  emit('close')
}

const launch = async (): Promise<void> => {
  if (!preparedLaunch.value) {
    return
  }

  sessionStore.clearLaunchError()

  if (preparedLaunch.value.kind === 'AGENT') {
    if (!preparedLaunch.value.config.workspaceId) {
      loadError.value = $t('applications.components.applications.ApplicationLaunchConfigModal.selectWorkspaceBeforeLaunch')
      return
    }
    if (!preparedLaunch.value.config.llmModelIdentifier) {
      loadError.value = $t('applications.components.applications.ApplicationLaunchConfigModal.selectModelBeforeLaunch')
      return
    }
  } else if (!preparedLaunch.value.config.llmModelIdentifier) {
    loadError.value = $t('applications.components.applications.ApplicationLaunchConfigModal.selectDefaultModelBeforeLaunch')
    return
  }

  loadError.value = null

  try {
    const session = await sessionStore.createApplicationSession(preparedLaunch.value)
    emit('launched', {
      applicationId: preparedLaunch.value.application.id,
      applicationSessionId: session.applicationSessionId,
    })
  } catch {
    // Store-owned launchError already contains the surfaced message.
  }
}
</script>
