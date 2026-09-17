// Temporary reviewer diagnostic for independently observed SCN-004 / F-003, not acceptance coverage.
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { markRaw } from 'vue'
import { teamRunExecutionTreeDtoSchema } from '@autobyteus/team-stream-contracts'
import { useExistingRunModelConfigStore } from '../existingRunModelConfigStore'
import { useAgentTeamContextsStore } from '../agentTeamContextsStore'
import { useAgentSelectionStore } from '../agentSelectionStore'
import { useRunHistoryStore } from '../runHistoryStore'
import { useTeamRunConfigStore } from '../teamRunConfigStore'
import { createTeamConfigurationView, createTeamAgentContext } from '~/services/teamExecution/teamExecutionContextFactory'
import { createTeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState'
import { buildEditableTeamRunSeed } from '~/composables/useDefinitionLaunchDefaults'
const wire = vi.hoisted(() => ({ update: vi.fn() }))
vi.mock('~/services/runConfigEditing/existingRunModelConfigMutationClient', () => ({
  updateStoppedTeamModelConfigs: wire.update, updateStoppedAgentModelConfig: vi.fn(),
}))
vi.mock('~/services/runConfigEditing/existingRunModelOptionsClient', () => ({ loadExistingRunModelOptions: vi.fn().mockResolvedValue({}) }))
const evidence = JSON.parse(readFileSync('../tickets/in-progress/stopped-org-member-header-actions/validation/api-r2/f003-team-transport.json', 'utf8'))
const result = JSON.parse(evidence.find((x: any) => x.id === 670 && x.type === 'response').body).data.updateStoppedTeamRunModelConfigs
const canonical = teamRunExecutionTreeDtoSchema.parse(result.canonicalExecutionTree)
function setup() {
  setActivePinia(createPinia())
  const original = structuredClone(canonical)
  original.root_team.default_launch_configuration.llm_config = null
  original.root_team.members.forEach(m => { if(m.kind === 'configured_agent') m.launch_configuration.llm_config = null })
  const member = original.root_team.members[0]; if(member.kind !== 'configured_agent') throw Error('Fixture expected configured Agent')
  const context = createTeamAgentContext({ tree: original, agentRunId: member.agent_run_id, address: member.address as never, workspaceMetadata: null })!
  const view = createTeamExecutionViewState({ rootTeamRunId: original.root_team.team_run_id, rootActive: false, executionTree: original,
    configuration: createTeamConfigurationView({ tree: original, workspaceMetadataByAddress: new Map() }),
    initialFocusedAgentRunId: member.agent_run_id, agentContexts: [{ agentRunId: member.agent_run_id, memberAddress: member.address as never, agentContext: context }],
    createAgentContext: () => { throw Error('No runtime/materialization needed') },
  })
  useAgentTeamContextsStore().teams.set(original.root_team.team_run_id, markRaw({ view }))
  useAgentSelectionStore().selectRunWithoutShellNavigation(original.root_team.team_run_id, 'team')
  const store = useExistingRunModelConfigStore()
  store.syncTeamCanonical({ teamRunId: original.root_team.team_run_id, isActive: false, executionTree: original, modelConfigEditability: { editable: true, reason: null } })
  store.updateTeamScopeModelConfig('/', { llmModelIdentifier: 'gpt-5.4-mini', llmConfig: { reasoning_effort: 'low' } })
  for(const address of ['/', '/lead']) store.setSchemaState(address, { status: 'ready', message: null })
  wire.update.mockResolvedValue(structuredClone(result))
  return { store, view, id: original.root_team.team_run_id }
}
describe('F-003 owner boundary diagnostic', () => {
  it('proves successful canonical Save leaves the same retained view/Plus seed stale before any shared field mounts', async () => {
    const { store, view, id } = setup()
    expect(store.canSave).toBe(true)
    expect(await store.save()).toBe(true)
    expect(wire.update).toHaveBeenCalledTimes(1)
    expect(useRunHistoryStore().teamResumeConfigByTeamRunId[id].executionTree.root_team.default_launch_configuration.llm_config).toEqual({ reasoning_effort: 'low' })
    expect(store.draft?.kind).toBe('team')
    expect(store.draft!.kind === 'team' && store.draft.executionTree.root_team.default_launch_configuration.llm_config).toEqual({ reasoning_effort: 'low' })
    expect(useAgentTeamContextsStore().activeTeamContext!.view).toBe(view)
    expect(view.getConfigurationView().root.effectiveConfig.llmConfig).toBeNull()
    expect(view.getConfigurationView().agentsByAddress['/lead'].effectiveConfig.llmConfig).toBeNull()
    expect(view.getExecutionTree().root_team.default_launch_configuration.llm_config).toBeNull()
    const drafts = useTeamRunConfigStore()
    drafts.setConfig(buildEditableTeamRunSeed(view.getConfigurationView()))
    expect(drafts.selectedDraft!.config.rootConfig.llmConfig).toBeNull()
    expect(drafts.selectedDraft!.config.agentOverrides).toEqual({})
    console.log('F003_DIAGNOSTIC: saved history/draft low; retained view root/member null; actual Plus seed/store root null; no form mounted')
  })
  it('control: seed and draft store retain low when given the canonical view, without source mutation', () => {
    setActivePinia(createPinia())
    const currentView = createTeamConfigurationView({ tree: canonical, workspaceMetadataByAddress: new Map() })
    const seed = buildEditableTeamRunSeed(currentView)
    expect(seed.rootConfig.llmConfig).toEqual({ reasoning_effort: 'low' })
    const drafts = useTeamRunConfigStore(); drafts.setConfig(seed)
    expect(drafts.selectedDraft!.config.rootConfig.llmConfig).toEqual({ reasoning_effort: 'low' })
    expect(currentView.agentsByAddress['/lead'].effectiveConfig.llmConfig).toEqual({ reasoning_effort: 'low' })
  })
})
