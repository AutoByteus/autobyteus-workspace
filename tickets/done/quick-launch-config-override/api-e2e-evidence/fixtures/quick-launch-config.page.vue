<template>
  <main class="mx-auto max-w-3xl p-6" data-test="quick-launch-api-e2e">
    <h1 class="text-xl font-semibold">Quick-launch configuration API/E2E probe</h1>
    <p data-test="probe-status">{{ status }}</p>
    <section v-if="currentConfig && teamDefinition" class="mt-6" data-test="team-config-renderer">
      <h2 data-test="scenario-name">{{ currentScenario }}</h2>
      <TeamRunConfigForm
        :config="currentConfig"
        :team-definition="teamDefinition"
        :workspace-loading-state="workspaceLoadingState"
        :initial-path="currentConfig.workspaceMetadata?.workspaceRootPath || ''"
        @edit-config="applyEdit"
      />
    </section>
    <pre data-test="probe-state">{{ JSON.stringify(publicState, null, 2) }}</pre>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import TeamRunConfigForm from '~/components/workspace/config/TeamRunConfigForm.vue'
import { useAgentTeamDefinitionStore, type AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { buildEditableTeamRunSeed } from '~/composables/useDefinitionLaunchDefaults'
import { hydrateLiveTeamRunContext } from '~/services/runHydration/teamRunContextHydrationService'
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata'
import { resolveLeafTeamMembers } from '~/utils/teamDefinitionMembers'
import { buildTeamRunMemberConfigRecords } from '~/utils/teamRunMemberConfigBuilder'
import type { TeamLaunchConfigEdit } from '~/types/agent/TeamLaunchDraft'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'

const route = useRoute()
const status = ref('initializing')
const currentScenario = ref<'uniform' | 'heterogeneous'>('uniform')
const definitionStore = useAgentTeamDefinitionStore()
const selectionStore = useAgentSelectionStore()
const configStore = useTeamRunConfigStore()
const runStore = useAgentTeamRunStore()
const teamDefinition = ref<AgentTeamDefinition | null>(null)
const sourceConfigs = new Map<string, Readonly<TeamRunConfig>>()
const sourceTrees = new Map<string, unknown>()
const publicState = reactive<Record<string, unknown>>({})
const currentConfig = computed(() => configStore.config)
const workspaceLoadingState = computed(() => configStore.workspaceLoadingState)

const requiredQuery = (name: string): string => {
  const value = route.query[name]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing query parameter '${name}'.`)
  return value.trim()
}

const workspaceMetadata = (rootPath: string) => createWorkspaceMetadata({
  workspaceId: `probe:${rootPath}`,
  workspaceRootPath: rootPath,
  displayName: rootPath.split('/').filter(Boolean).at(-1) || 'workspace',
  kind: 'filesystem',
})

const hydrate = async (teamRunId: string) => hydrateLiveTeamRunContext({
  teamRunId,
  resolveWorkspaceMetadataByRootPath: async (rootPath) => workspaceMetadata(rootPath),
  ensureWorkspaceByRootPath: async (rootPath) => workspaceMetadata(rootPath).workspaceId,
})

const leafMembers = () => {
  if (!teamDefinition.value) throw new Error('Team definition is not loaded.')
  return resolveLeafTeamMembers(teamDefinition.value, {
    getTeamDefinitionById: (id) => definitionStore.getAgentTeamDefinitionById(id),
  })
}

const materialize = (config: Readonly<TeamRunConfig>) => buildTeamRunMemberConfigRecords({
  config: { ...config, memberOverrides: { ...config.memberOverrides } },
  leafMembers: leafMembers(),
})

const selectConfig = (scenario: 'uniform' | 'heterogeneous') => {
  const source = sourceConfigs.get(scenario)
  if (!source) throw new Error(`Source config '${scenario}' is not loaded.`)
  currentScenario.value = scenario
  configStore.setConfig(buildEditableTeamRunSeed(source))
  const draft = configStore.selectedDraft
  if (!draft) throw new Error('Expected an editable draft.')
  selectionStore.selectTeamDraftWithoutShellNavigation(draft.draftId)
  publicState.currentScenario = scenario
  publicState.currentConfig = configStore.config
}

const applyEdit = (edit: TeamLaunchConfigEdit) => {
  configStore.applyConfigEdit(edit)
  publicState.currentConfig = configStore.config
}

const applyUniformRemainingEdits = () => {
  applyEdit({ kind: 'set_model', llmModelIdentifier: 'new-uniform-model' })
  applyEdit({
    kind: 'set_llm_config',
    llmConfig: { reasoning: { effort: 'xhigh', flags: { plan: false, search: true } }, service_tier: 'fast' },
  })
  publicState.uniformEditedDraft = configStore.selectedDraft
}

const applyHeterogeneousEdit = () => {
  applyEdit({
    kind: 'set_llm_config',
    llmConfig: { reasoning: { effort: 'medium', flags: { plan: false, search: true } }, response: { detail: 'concise' } },
  })
  publicState.heterogeneousEditedDraft = configStore.selectedDraft
}

const launchCurrent = async (label: 'uniform' | 'heterogeneous') => {
  const draft = configStore.selectedDraft
  if (!draft) throw new Error(`No '${label}' draft is selected.`)
  const catalogModels = new Map<string, Set<string>>()
  const addCatalogModel = (runtime: string, model: string) => {
    const models = catalogModels.get(runtime) ?? new Set<string>()
    models.add(model)
    catalogModels.set(runtime, models)
  }
  addCatalogModel(draft.config.runtimeKind, draft.config.llmModelIdentifier)
  for (const override of Object.values(draft.config.memberOverrides)) {
    addCatalogModel(
      override.runtimeKind ?? draft.config.runtimeKind,
      override.llmModelIdentifier ?? draft.config.llmModelIdentifier,
    )
  }
  for (const [runtime, models] of catalogModels.entries()) {
    configStore.setRuntimeModelCatalog(runtime, [...models])
  }
  const submittedRecords = materialize(draft.config)
  const launched = await runStore.launchDraft(draft)
  const hydratedConfig = launched.context.view.getConfigurationView()
  const hydratedRecords = materialize(hydratedConfig)
  const payload = {
    rootTeamRunId: launched.rootTeamRunId,
    focusedAgentRunId: launched.agentRunId,
    submittedRecords,
    hydratedConfig,
    hydratedRecords,
    hydratedTree: launched.context.view.getExecutionTree(),
    rootActive: launched.context.view.isRootTeamActive(),
  }
  publicState[`${label}Launch`] = payload
  return payload
}

const probeApi = {
  getState: () => JSON.parse(JSON.stringify(publicState)),
  applyUniformRemainingEdits,
  launchUniform: () => launchCurrent('uniform'),
  prepareHeterogeneous: () => {
    selectConfig('heterogeneous')
    publicState.heterogeneousNoEditRecords = materialize(configStore.selectedDraft!.config)
    return JSON.parse(JSON.stringify(publicState))
  },
  applyHeterogeneousEdit,
  launchHeterogeneous: () => launchCurrent('heterogeneous'),
}

declare global {
  interface Window { __quickLaunchProbe?: typeof probeApi }
}

onMounted(async () => {
  try {
    const definitionId = requiredQuery('definitionId')
    const uniformTeamRunId = requiredQuery('uniformTeamRunId')
    const heterogeneousTeamRunId = requiredQuery('heterogeneousTeamRunId')
    await definitionStore.reloadAllAgentTeamDefinitions()
    teamDefinition.value = definitionStore.getAgentTeamDefinitionById(definitionId)
    if (!teamDefinition.value) throw new Error(`Team definition '${definitionId}' was not loaded.`)
    const [uniform, heterogeneous] = await Promise.all([
      hydrate(uniformTeamRunId),
      hydrate(heterogeneousTeamRunId),
    ])
    sourceConfigs.set('uniform', uniform.hydratedContext.view.getConfigurationView())
    sourceConfigs.set('heterogeneous', heterogeneous.hydratedContext.view.getConfigurationView())
    sourceTrees.set('uniform', uniform.hydratedContext.view.getExecutionTree())
    sourceTrees.set('heterogeneous', heterogeneous.hydratedContext.view.getExecutionTree())
    publicState.sourceConfigs = {
      uniform: sourceConfigs.get('uniform'),
      heterogeneous: sourceConfigs.get('heterogeneous'),
    }
    publicState.sourceTrees = {
      uniform: sourceTrees.get('uniform'),
      heterogeneous: sourceTrees.get('heterogeneous'),
    }
    selectConfig('uniform')
    window.__quickLaunchProbe = probeApi
    status.value = 'ready'
  } catch (error) {
    status.value = `failed: ${error instanceof Error ? error.message : String(error)}`
    publicState.failure = error instanceof Error ? { message: error.message, stack: error.stack } : String(error)
    throw error
  }
})
</script>
