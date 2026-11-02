import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExistingRunConfigEditor from '../ExistingRunConfigEditor.vue'
import { createExistingTeamModelConfigDraft, updateExistingTeamScopeModelConfig } from '~/services/runConfigEditing/existingTeamModelConfigDraft'
import { createExistingAgentOrgModelConfigDraft } from '~/services/runConfigEditing/existingAgentOrgModelConfigDraft'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'

/**
 * autobyteus-366: Settings' subject follows the focus of each kind of run (a Team's focused member, an Org's selection),
 * the switch returns to the agent when the focus moves, and a Team-wide edit is named by its Team, not its followers.
 * The real editor and resolver; the view is a stub that shows what it is given.
 */
const mocks = await vi.hoisted(async () => {
  const { reactive, ref } = await import('vue')
  return {
    store: reactive({ draft: null as any, loadingCanonical: false, saving: false, reconciling: false, reconciliationRequired: false, feedback: null,
      fieldErrors: [], modelOptionsByAddress: {}, dirty: false, canSave: false, clear: vi.fn(), loadTeamCanonical: vi.fn(), loadAgentOrgCanonical: vi.fn() }),
    teamFocus: ref('lead-run'),
    orgSelection: ref<unknown>(null),
  }
})
vi.mock('pinia', async (original) => {
  const { toRefs } = await import('vue')
  const actual = await original<typeof import('pinia')>()
  return { ...actual, storeToRefs: (store: object) => ('draft' in store ? toRefs(store as any) : actual.storeToRefs(store as never)) }
})
vi.mock('~/stores/existingRunConfigStore', () => ({ useExistingRunConfigStore: () => mocks.store }))
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => ({ subject: { kind: 'team_run', rootTeamRunId: 'team-1' } }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ resumeConfigByRunId: {}, teamResumeConfigByTeamRunId: {}, agentOrgHistory: [] }) }))
vi.mock('~/stores/agentContextsStore', () => ({ useAgentContextsStore: () => ({ getConfigForRun: () => null }) }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ getAgentDefinitionById: () => null }) }))
vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: () => ({ modelConfigSchemaByIdentifier: () => null }) }))
vi.mock('~/stores/agentTeamContextsStore', () => ({ useAgentTeamContextsStore: () => ({
  getTeamContextById: () => ({ view: { getFocusedAgentRunId: () => mocks.teamFocus.value, getClosedTaskExecutions: () => [] } }),
}) }))
vi.mock('~/stores/agentOrgContextsStore', () => ({ useAgentOrgContextsStore: () => ({
  contextFor: () => ({ selection: mocks.orgSelection.value, index: { selectedAgent: () => ({ agentRunId: 'coordinator-of-selected-team' }) } }),
}) }))
vi.mock('~/stores/delegatedLaunchDraftStore', () => ({ useDelegatedLaunchDraftStore: () => ({
  edits: {}, changes: [], originals: {}, optionsByKey: {}, dirty: false, saving: false, feedback: null, stopFeedback: null, changesAllowed: true,
  bind: vi.fn(), isStopping: () => false,
}) }))
vi.mock('~/composables/runSettings/useRunStopAction', async () => {
  const { ref } = await import('vue')
  return { useRunStopAction: () => ({ pending: ref(false), error: ref(null), label: ref('Terminate team'), stop: vi.fn() }) }
})

const tree = () => buildTestTeamContext({ teamRunId: 'team-1', coordinatorAddress: '/lead', rootChildren: [
  testAgentNode('/lead', { agentRunId: 'lead-run', displayName: 'lead' }),
  testAgentNode('/reviewer', { agentRunId: 'reviewer-run', displayName: 'reviewer' }),
] }).view.getExecutionTree()
const teamDraft = () => {
  const executionTree = tree()
  return { kind: 'team', teamRunId: 'team-1', isActive: false, editability: { editable: true, reason: null }, executionTree,
    planner: createExistingTeamModelConfigDraft(executionTree) }
}
const mountEditor = (props: Record<string, unknown> = {}) => mount(ExistingRunConfigEditor, { props, global: { stubs: { ExistingRunSettings: {
  name: 'ExistingRunSettings', props: ['subject', 'showGroup', 'subjectActive', 'copiesHint', 'unsavedNames'], template: '<div />',
} }, mocks: { $t: (key: string) => key } } }).getComponent({ name: 'ExistingRunSettings' })

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.store.draft = teamDraft()
  mocks.store.dirty = false
  mocks.teamFocus.value = 'lead-run'
  mocks.orgSelection.value = null
})

describe('ExistingRunConfigEditor: the focused agent', () => {
  it('a Team shows its focused member, and follows the focus', async () => {
    const view = mountEditor()
    expect(view.props('subject')).toMatchObject({ origin: 'member', group: 'root', subject: { key: '/lead', agentRunId: 'lead-run' } })
    expect(view.props('copiesHint')).toBe(false)
    mocks.teamFocus.value = 'reviewer-run'; await flushPromises()
    expect(view.props('subject')).toMatchObject({ origin: 'member', subject: { key: '/reviewer' } })
  })

  it('the group switch returns to the agent when the focus moves', async () => {
    const view = mountEditor()
    view.vm.$emit('update:show-group', true); await flushPromises()
    expect(view.props('showGroup')).toBe(true)
    mocks.teamFocus.value = 'reviewer-run'; await flushPromises()
    expect(view.props('showGroup')).toBe(false)
  })

  it('an Org shows its selection: a member of a placed team too; with nothing selected, the group view', async () => {
    const executionTree = taskBearingView().execution_tree
    mocks.store.draft = { kind: 'agent_org', orgRunId: 'org-run', isActive: false, editability: { editable: true, reason: null }, executionTree,
      planner: createExistingAgentOrgModelConfigDraft(executionTree), workspaceDraft: {} }
    const view = mountEditor({ target: { kind: 'agent_org', orgRunId: 'org-run' } })
    expect(view.props('subject')).toMatchObject({ origin: 'none', subject: null })
    const direct = executionTree.rootOrg.members.find((member) => 'agentRunId' in member) as { agentRunId: string; address: string }
    mocks.orgSelection.value = { kind: 'agent_execution', agentRunId: direct.agentRunId }; await flushPromises()
    expect(view.props('subject')).toMatchObject({ origin: 'member', group: 'root', subject: { key: direct.address } })
    const team = executionTree.rootOrg.members.find((member) => 'teamRunId' in member) as { members: readonly { agentRunId: string; address: string }[] }
    mocks.orgSelection.value = { kind: 'agent_execution', agentRunId: team.members[0]!.agentRunId }; await flushPromises()
    expect(view.props('subject')).toMatchObject({ origin: 'member', group: 'root', subject: { key: team.members[0]!.address } })
  })

  it('a focused agent with no row falls back to the group view', () => {
    mocks.teamFocus.value = 'unknown-run'
    expect(mountEditor().props('subject')).toMatchObject({ origin: 'none', subject: null, group: 'root' })
  })

  it('a Team-wide edit is named by the Team, not the members that follow it; a member\'s edit by that member', async () => {
    const edited = (address: string) => {
      const draft = teamDraft()
      const planner = updateExistingTeamScopeModelConfig(draft.planner, address, { runtimeKind: 'autobyteus', llmModelIdentifier: 'edited-model', llmConfig: null })
      return { ...draft, planner }
    }
    mocks.store.draft = edited('/')
    const view = mountEditor()
    expect(view.props('unsavedNames')).toEqual([mocks.store.draft.executionTree.root_team.team_definition_name])
    mocks.store.draft = edited('/reviewer'); await flushPromises()
    expect(view.props('unsavedNames')).toEqual(['reviewer'])
  })
})
