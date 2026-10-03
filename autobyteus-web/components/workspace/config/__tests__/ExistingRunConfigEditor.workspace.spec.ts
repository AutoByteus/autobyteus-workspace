import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ExistingRunConfigEditor from '../ExistingRunConfigEditor.vue'

// A stopped agent run reopened from history carries a history-derived workspace id. The run
// settings show the known workspace with the same root (VIS-017), not an empty selector.
const mocks = vi.hoisted(() => ({ hydratedWorkspaceId: '' as string | null }))
vi.mock('pinia', async (original) => {
  const { toRefs } = await import('vue')
  return { ...await original<typeof import('pinia')>(), storeToRefs: (store: object) => toRefs(store as any) }
})
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => ({ subject: { kind: 'agent_run', runId: 'run-1' } }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ resumeConfigByRunId: {}, teamResumeConfigByTeamRunId: {} }) }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ getAgentDefinitionById: () => ({ name: 'General Agent' }) }) }))
vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => ({ getConfigForRun: () => ({ agentDefinitionName: 'General Agent', workspaceId: mocks.hydratedWorkspaceId, workspaceMetadata: null }) }),
}))
vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    workspaces: { temp_ws_default: { workspaceId: 'temp_ws_default' } },
    findWorkspaceInfoByRootPath: (rootPath: string) => (rootPath === '/data/temp_workspace' ? { workspaceId: 'temp_ws_default' } : null),
  }),
}))
vi.mock('~/stores/existingRunConfigStore', async () => {
  const { reactive: r } = await import('vue')
  const store = r({
    draft: {
      kind: 'agent', runId: 'run-1', isActive: false, editability: { editable: true, reason: null },
      metadata: { agentDefinitionId: 'autobyteus-daily-assistant', runtimeKind: 'codex_app_server', autoExecuteTools: true, llmModelIdentifier: 'gpt-5.5', workspaceRootPath: '/data/temp_workspace' },
      draftSelection: { llmModelIdentifier: 'gpt-5.5', llmConfig: null },
    },
    loadingCanonical: false, saving: false, reconciling: false, reconciliationRequired: false,
    feedback: null, fieldErrors: [], modelOptionsByAddress: {}, dirty: false, canSave: false,
    loadAgentCanonical: () => undefined, clear: () => undefined, applyCachedAgentLifecycle: () => undefined,
  })
  return { useExistingRunConfigStore: () => store }
})

const mountEditor = () => mount(ExistingRunConfigEditor, {
  global: {
    stubs: { AgentRunConfigForm: { name: 'AgentRunConfigForm', props: { workspaceSelection: Object }, template: '<div />' }, TeamRunConfigForm: true, AgentOrgRunConfigForm: true },
    mocks: { $t: (key: string) => key },
  },
})

describe('ExistingRunConfigEditor workspace display', () => {
  beforeEach(() => { mocks.hydratedWorkspaceId = null })

  it('resolves a history-derived workspace id to the known workspace with the same root', () => {
    mocks.hydratedWorkspaceId = 'agent_ws_from_history'
    const form = mountEditor().getComponent({ name: 'AgentRunConfigForm' })
    expect(form.props('workspaceSelection')).toEqual({ mode: 'existing', existingWorkspaceId: 'temp_ws_default', newWorkspacePath: '/data/temp_workspace' })
  })

  it('keeps a workspace id the store already knows', () => {
    mocks.hydratedWorkspaceId = 'temp_ws_default'
    const form = mountEditor().getComponent({ name: 'AgentRunConfigForm' })
    expect(form.props('workspaceSelection')).toMatchObject({ existingWorkspaceId: 'temp_ws_default' })
  })
})
