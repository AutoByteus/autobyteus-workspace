<template>
  <div class="flex h-full flex-col bg-white" data-test="agent-org-run-config">
    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div v-if="org" class="mx-auto max-w-3xl space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('workspace.agentOrg.runConfig.orgLabel') }}</label>
          <div class="block w-full select-none rounded-md bg-slate-50 px-3 py-2 text-sm text-gray-500">{{ org.name }}</div>
        </div>

        <RuntimeModelConfigFields
          :runtime-kind="runtimeKind"
          :llm-model-identifier="llmModelIdentifier"
          :llm-config="llmConfig"
          :runtime-help-text="t('workspace.agentOrg.runConfig.runtimeHelp')"
          :model-label="t('workspace.agentOrg.runConfig.modelLabel')"
          :model-help-text="t('workspace.agentOrg.runConfig.modelHelp')"
          id-prefix="org-run"
          control-variant="quiet"
          @update:runtime-kind="configStore.setRootRuntimeKind"
          @update:llm-model-identifier="configStore.setRootLlmModelIdentifier"
          @update:llm-config="configStore.setRootLlmConfig"
          @schema-state="configStore.setModelSchemaState('/', $event)"
        />

        <div class="pt-4">
          <WorkspaceSelector
            :model="{ mode: 'editable', selection: workspaceSelection, isLoading: workspaceLoading, error: workspaceError }"
            control-variant="quiet"
            :auto-select-default="false"
            @update:model-value="handleWorkspaceSelection"
          />
        </div>

        <div class="flex items-center justify-between gap-4 py-2" data-test="org-auto-approve-row">
          <div class="min-w-0">
            <label class="block text-base text-gray-900">{{ t('workspace.agentOrg.runConfig.autoApprove') }}</label>
            <p class="mt-1 text-xs text-gray-500">{{ t('workspace.agentOrg.runConfig.autoApproveHelp') }}</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="autoExecuteTools"
            class="relative inline-flex h-6 w-11 flex-none rounded-full border-2 border-transparent transition-colors focus:ring-2 focus:ring-blue-500"
            :class="autoExecuteTools ? 'bg-blue-600' : 'bg-gray-200'"
            @click="configStore.setRootAutoExecuteTools(!autoExecuteTools)"
          >
            <span class="sr-only">{{ t('workspace.agentOrg.runConfig.autoApprove') }}</span>
            <span class="inline-block h-5 w-5 rounded-full bg-white shadow transition" :class="autoExecuteTools ? 'translate-x-5' : 'translate-x-0'" />
          </button>
        </div>

        <MemberOverridesDisclosure
          v-if="formModel"
          :key="org.id"
          :label="t('workspace.agentOrg.runConfig.memberOverrides')"
          :count="formModel.configurableAgentCount"
          test-prefix="org-member-overrides"
        >
          <div v-if="formModel.directAgents.length" class="mb-3 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
            <AgentOrgDirectAgentOverrideRow
              v-for="agent in formModel.directAgents"
              :key="agent.address"
              :node="agent"
              :expanded="editingDirectAgent === agent.address"
              @toggle="toggleDirectAgent(agent.address)"
              @update:override="configStore.setAgentOverride(agent.address, $event)"
              @schema-state="handleModelSchemaState"
            />
          </div>
          <TeamMemberConfigTree
            v-if="formModel.mountedTeams.length"
            :member-nodes="formModel.mountedTeams"
            :disabled="false"
            :team-model-help-text="t('workspace.components.workspace.config.TeamScopeConfigEditor.flat_model_help')"
            @update-team="configStore.setTeamOverride"
            @reset-team="configStore.resetTeamOverride"
            @update-agent="configStore.setAgentOverride"
            @update:workspace-selection="handleTeamWorkspaceSelection"
            @schema-state="handleModelSchemaState"
          />
        </MemberOverridesDisclosure>

        <p
          v-if="referenceDiagnostic"
          :role="referenceDiagnostic.unavailable ? 'alert' : 'status'"
          class="rounded-md border p-3 text-sm"
          :class="referenceDiagnostic.unavailable ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-100 bg-blue-50 text-blue-700'"
          data-test="org-config-reference-diagnostic"
        >
          {{ referenceDiagnostic.message }}
        </p>
        <p v-if="projectionError" role="alert" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-test="org-config-projection-error">
          {{ projectionError }}
        </p>
        <p v-if="launchError" role="alert" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ launchError }}
        </p>
        <p
          v-if="modelSchemaBlockingDiagnostic"
          id="org-model-schema-status"
          :role="modelSchemaBlockingDiagnostic.status === 'loading' ? 'status' : 'alert'"
          class="rounded-md border p-3 text-sm"
          :class="modelSchemaBlockingDiagnostic.status === 'loading'
            ? 'border-blue-100 bg-blue-50 text-blue-700'
            : 'border-red-200 bg-red-50 text-red-700'"
          data-test="org-config-schema-diagnostic"
        >
          {{ modelSchemaBlockingDiagnostic.message }}
        </p>
      </div>
      <div v-else class="flex h-full items-center justify-center text-gray-500">{{ t('workspace.agentOrg.runConfig.loading') }}</div>
    </div>
    <div class="border-t border-gray-200 bg-gray-50 px-4 py-3">
      <button
        type="button"
        data-test="run-agent-org"
        class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!canRun || orgRunStore.launching"
        :aria-describedby="modelSchemaBlockingDiagnostic ? 'org-model-schema-status' : undefined"
        @click="runOrg"
      >
        {{ orgRunStore.launching ? t('workspace.agentOrg.runConfig.starting') : t('workspace.agentOrg.runConfig.run') }}
      </button>
      <p v-if="!workspaceReady" class="mt-2 text-xs text-amber-700">{{ t('workspace.agentOrg.runConfig.workspaceRequired') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import AgentOrgDirectAgentOverrideRow from './AgentOrgDirectAgentOverrideRow.vue'
import MemberOverridesDisclosure from './MemberOverridesDisclosure.vue'
import TeamMemberConfigTree from './TeamMemberConfigTree.vue'
import WorkspaceSelector from './WorkspaceSelector.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useRightSideTabs } from '~/composables/useRightSideTabs'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { useAgentOrgRunConfigStore } from '~/stores/agentOrgRunConfigStore'
import { useAgentOrgRunStore } from '~/stores/agentOrgRunStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { ResolvedTeamRunLaunchConfig, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { RuntimeModelConfigSchemaState } from '~/types/agent/RuntimeModelConfigSchemaState'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import { projectEditableAgentOrgRunFormModel } from '~/utils/editableAgentOrgRunFormModel'
import { hasMeaningfulLaunchOverride } from '~/utils/teamRunConfigUtils'
import { loadAgentOrgDefinitionReferences, type AgentOrgDefinitionReferences } from '~/services/agentOrgDefinition/agentOrgDefinitionReferences'
import { toAgentOrgPlacementLaunchConfiguration } from '~/utils/agentOrgLaunchPatch'

const route = useRoute()
const router = useRouter()
const orgStore = useAgentOrgDefinitionStore()
const agentStore = useAgentDefinitionStore()
const teamStore = useAgentTeamDefinitionStore()
const orgRunStore = useAgentOrgRunStore()
const runHistoryStore = useRunHistoryStore()
const configStore = useAgentOrgRunConfigStore()
const workspaceStore = useWorkspaceStore()
const { setActiveTab } = useRightSideTabs()
const { t } = useLocalization()
const {
  runtimeKind, llmModelIdentifier, llmConfig, autoExecuteTools, workspaceSelection,
  teamOverrides, agentOverrides, projectionError, launchError,
  firstModelSchemaBlock, allModelSchemaScopesReady,
} = storeToRefs(configStore)

const definitionId = computed(() => String(route.query.definitionId || ''))
const org = computed(() => orgStore.byId(definitionId.value))
const workspaceLoading = ref(false)
const workspaceError = ref<string | null>(null)
const editingDirectAgent = ref<AgentTeamAddress | null>(null)
const initializedDefinitionId = ref<string | null>(null)

watch(org, (value) => {
  if (!value || initializedDefinitionId.value === value.id) return
  initializedDefinitionId.value = value.id
  editingDirectAgent.value = null
  configStore.begin({
    definitionId: value.id,
    runtimeKind: value.defaultLaunchConfig?.runtimeKind,
    llmModelIdentifier: value.defaultLaunchConfig?.llmModelIdentifier,
    llmConfig: value.defaultLaunchConfig?.llmConfig ?? null,
  })
}, { immediate: true })

// A public catalog is not an inventory of the selected Org's owned definitions.
const referenceKey = computed(() => org.value ? JSON.stringify([
  org.value.id, org.value.revision,
  org.value.members.map(({ memberName, ref, refType, refScope }) => [memberName, ref, refType, refScope]),
]) : null)
const references = ref<{
  key: string | null
  status: 'loading' | 'ready' | 'unavailable'
  snapshot: AgentOrgDefinitionReferences | null
}>({ key: null, status: 'loading', snapshot: null })
const referencesReady = computed(() => Boolean(referenceKey.value
  && references.value.key === referenceKey.value && references.value.status === 'ready'))
const referenceDiagnostic = computed(() => {
  if (!org.value || referencesReady.value) return null
  const unavailable = references.value.key === referenceKey.value && references.value.status === 'unavailable'
  return {
    unavailable,
    message: unavailable
      ? t('workspace.agentOrg.runConfig.referencesUnavailable', {
          references: references.value.snapshot?.unavailable.join(', ') || org.value.name,
        })
      : t('workspace.agentOrg.runConfig.referencesLoading'),
  }
})
watch(referenceKey, async (key, _previous, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  references.value = { key, status: 'loading', snapshot: null }
  if (!key || !org.value) return
  const selected = { id: org.value.id, members: org.value.members.map(member => ({ ...member })) }
  try {
    const snapshot = await loadAgentOrgDefinitionReferences(selected.id, selected.members, {
      getCatalogAgentById: agentStore.getAgentDefinitionById,
      getCatalogTeamById: teamStore.getCatalogAgentTeamDefinitionById,
    })
    if (!current || referenceKey.value !== key) return
    references.value = { key, status: snapshot.unavailable.length ? 'unavailable' : 'ready', snapshot }
  } catch {
    if (current && referenceKey.value === key) {
      references.value = { key, status: 'unavailable', snapshot: null }
    }
  }
}, { immediate: true })

const workspaceMetadata = (workspaceId: string | null): WorkspaceMetadata | null => {
  if (!workspaceId) return null
  const workspace = workspaceStore.workspaces[workspaceId]
  return workspaceStore.workspaceMetadataById[workspaceId]
    ?? (workspace ? workspaceStore.registerWorkspaceInfoMetadata(workspace) : null)
    ?? null
}
const rootWorkspacePath = computed(() => {
  if (workspaceSelection.value.mode === 'new') return workspaceSelection.value.newWorkspacePath.trim() || null
  const metadata = workspaceMetadata(workspaceSelection.value.existingWorkspaceId)
  return metadata?.workspaceRootPath?.trim() || null
})
const rootConfig = computed<Readonly<ResolvedTeamRunLaunchConfig>>(() => Object.freeze({
  runtimeKind: runtimeKind.value,
  workspaceId: workspaceSelection.value.mode === 'existing' ? workspaceSelection.value.existingWorkspaceId : null,
  workspaceMetadata: workspaceSelection.value.mode === 'existing' ? workspaceMetadata(workspaceSelection.value.existingWorkspaceId) : null,
  workspaceRootPath: rootWorkspacePath.value,
  llmModelIdentifier: llmModelIdentifier.value,
  llmConfig: llmConfig.value,
  autoExecuteTools: autoExecuteTools.value,
  skillAccessMode: 'PRELOADED_ONLY',
}))
const projection = computed(() => {
  if (!org.value || !referencesReady.value) return null
  return projectEditableAgentOrgRunFormModel({
    orgDefinition: org.value,
    rootConfig: rootConfig.value,
    teamOverrides: teamOverrides.value,
    agentOverrides: agentOverrides.value,
    getTeamDefinitionById: (id) => references.value.snapshot?.teams[id] ?? null,
    getAgentDisplayNameById: (id) => references.value.snapshot?.agents[id]?.name ?? null,
    workspaceSelectionFor: (address, effective) => configStore.teamWorkspaceSelectionFor(address) ?? {
      mode: effective.workspaceId ? 'existing' : 'new',
      existingWorkspaceId: effective.workspaceId,
      newWorkspacePath: effective.workspaceRootPath ?? '',
    },
    workspaceOperationFor: configStore.teamWorkspaceOperationFor,
    runtimeCatalogStateFor: (address) => configStore.modelSchemaStateFor(address).status === 'loading'
      ? { status: 'loading', error: null }
      : { status: 'ready', error: null },
  })
})
watch(projection, (result) => {
  configStore.setProjectionError(result?.status === 'blocked' ? result.diagnostic.message : null)
}, { immediate: true })
const formModel = computed(() => projection.value?.status === 'ready' ? projection.value.model : null)
watch(formModel, (model) => {
  if (!model) return
  configStore.reconcileModelSchemaScopes([
    '/',
    ...model.directAgents.map((agent) => agent.address),
    ...model.mountedTeams.flatMap((team) => [team.address, ...team.children.map((agent) => agent.address)]),
  ])
}, { immediate: true })
const modelSchemaBlockingDiagnostic = computed(() => {
  const blocked = firstModelSchemaBlock.value
  if (!blocked) return null
  const message = blocked.state.status === 'loading'
    ? t('workspace.agentOrg.runConfig.schemaLoading', { address: blocked.address })
    : t('workspace.agentOrg.runConfig.schemaBlocked', {
        address: blocked.address,
        error: blocked.state.message || t('workspace.agentOrg.runConfig.schemaUnavailable'),
      })
  return Object.freeze({ status: blocked.state.status, message })
})
const workspaceReady = computed(() => Boolean(rootWorkspacePath.value))
const teamWorkspacesReady = computed(() => Object.entries(configStore.teamWorkspaceSelections).every(
  ([address, selection]) => {
    if (configStore.teamWorkspaceOperationFor(address).status === 'error') return false
    return selection.mode === 'existing' ? Boolean(selection.existingWorkspaceId) : Boolean(selection.newWorkspacePath.trim())
  },
))
const canRun = computed(() => Boolean(
  org.value && referencesReady.value && formModel.value && runtimeKind.value && llmModelIdentifier.value && workspaceReady.value
    && teamWorkspacesReady.value && allModelSchemaScopesReady.value,
))

const handleWorkspaceSelection = (selection: WorkspaceSelectionState) => {
  configStore.setWorkspaceSelection(selection, 'explicit')
  workspaceError.value = null
  if (selection.mode === 'existing' && selection.existingWorkspaceId) setActiveTab('files')
}
const toggleDirectAgent = (address: AgentTeamAddress) => {
  editingDirectAgent.value = editingDirectAgent.value === address ? null : address
}
const handleModelSchemaState = (address: string, state: RuntimeModelConfigSchemaState) => {
  configStore.setModelSchemaState(address as AgentTeamAddress, state)
}
const withoutWorkspace = (override: TeamScopeConfigOverride | undefined): TeamScopeConfigOverride | null => {
  const next = { ...(override ?? {}) }
  delete next.workspace
  return hasMeaningfulLaunchOverride(next) ? next : null
}
const handleTeamWorkspaceSelection = (address: AgentTeamAddress, selection: WorkspaceSelectionState) => {
  configStore.setTeamWorkspaceSelection(address, selection)
  const current = teamOverrides.value[address]
  if (selection.mode === 'existing' && selection.existingWorkspaceId) {
    const metadata = workspaceMetadata(selection.existingWorkspaceId)
    if (!metadata) {
      configStore.setTeamWorkspaceOperation(address, {
        status: 'error',
        error: t('workspace.agentOrg.runConfig.workspaceUnavailable', { workspaceId: selection.existingWorkspaceId }),
      })
      return
    }
    const matchesRoot = rootConfig.value.workspaceId === selection.existingWorkspaceId
      && rootConfig.value.workspaceRootPath === metadata.workspaceRootPath
    configStore.setTeamOverride(address, matchesRoot ? withoutWorkspace(current) : {
      ...(current ?? {}), workspace: { workspaceId: selection.existingWorkspaceId, workspaceMetadata: metadata },
    })
    setActiveTab('files')
    return
  }
  const path = selection.newWorkspacePath.trim()
  configStore.setTeamOverride(address, path && path !== rootConfig.value.workspaceRootPath ? {
    ...(withoutWorkspace(current) ?? {}),
    workspace: { workspaceId: null, workspaceMetadata: null },
  } : withoutWorkspace(current))
}
const resolveRootWorkspacePath = async (): Promise<string> => {
  if (workspaceSelection.value.mode === 'new') {
    const path = workspaceSelection.value.newWorkspacePath.trim()
    if (!path) throw new Error(t('workspace.agentOrg.runConfig.workspacePathRequired'))
    workspaceLoading.value = true
    try {
      await workspaceStore.createWorkspace({ root_path: path })
      setActiveTab('files')
      return path
    } finally {
      workspaceLoading.value = false
    }
  }
  const path = rootWorkspacePath.value
  if (!path) throw new Error(t('workspace.agentOrg.runConfig.workspacePathUnavailable'))
  return path
}
const prepareTeamWorkspacePaths = async (): Promise<Record<AgentTeamAddress, string>> => {
  const paths: Record<AgentTeamAddress, string> = {}
  const created = new Map<string, Promise<string>>()
  for (const [address, override] of Object.entries(teamOverrides.value)) {
    const selection = configStore.teamWorkspaceSelectionFor(address)
    const path = selection?.mode === 'new'
      ? selection.newWorkspacePath.trim()
      : override.workspace?.workspaceMetadata?.workspaceRootPath?.trim() || ''
    if (!path) continue
    if (selection?.mode === 'new') {
      configStore.setTeamWorkspaceOperation(address, { status: 'loading', error: null })
      try {
        const request = created.get(path) ?? workspaceStore.createWorkspace({ root_path: path }).then(() => path)
        created.set(path, request)
        paths[address] = await request
        configStore.setTeamWorkspaceOperation(address, { status: 'idle', error: null })
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause)
        configStore.setTeamWorkspaceOperation(address, { status: 'error', error: detail })
        throw cause
      }
    } else paths[address] = path
  }
  return paths
}
const runOrg = async () => {
  if (!org.value || !formModel.value || !canRun.value || orgRunStore.launching) return
  configStore.setLaunchError(null)
  try {
    const workspaceRootPath = await resolveRootWorkspacePath()
    const teamWorkspacePaths = await prepareTeamWorkspacePaths()
    const serializedTeams = Object.entries(teamOverrides.value).map(([address, override]) => ({
      address,
      configuration: toAgentOrgPlacementLaunchConfiguration(override, teamWorkspacePaths[address]),
    })).filter((item) => Object.keys(item.configuration).length)
    const serializedAgents = Object.entries(agentOverrides.value).map(([address, override]) => ({
      address,
      configuration: toAgentOrgPlacementLaunchConfiguration(override),
    })).filter((item) => Object.keys(item.configuration).length)
    const orgRunId = await orgRunStore.launch({
      agentOrgDefinitionId: org.value.id,
      rootConfiguration: {
        runtimeKind: runtimeKind.value,
        llmModelIdentifier: llmModelIdentifier.value,
        llmConfig: llmConfig.value,
        autoExecuteTools: autoExecuteTools.value,
        skillAccessMode: 'PRELOADED_ONLY',
        workspaceRootPath,
      },
      teamOverrides: serializedTeams,
      agentOverrides: serializedAgents,
    })
    void runHistoryStore.refreshTreeQuietly()
    await router.replace({
      path: '/workspace',
      query: { rootSubjectKind: 'agent_org', definitionId: org.value.id, orgRunId, mode: 'active' },
    })
  } catch (cause) {
    configStore.setLaunchError(cause instanceof Error ? cause.message : String(cause))
  }
}

const applyAvailableRootDefault = (): void => {
  configStore.selectDefaultRootWorkspace(workspaceStore.tempWorkspaceId)
}

watch(() => workspaceStore.tempWorkspaceId, applyAvailableRootDefault)

onMounted(async () => {
  await Promise.all([
    orgStore.fetchAll(),
    agentStore.fetchAllAgentDefinitions(),
    teamStore.fetchAllAgentTeamDefinitions(),
    workspaceStore.fetchAllWorkspaces(),
  ])
  applyAvailableRootDefault()
})
</script>
