import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import TeamRunConfigForm from '../TeamRunConfigForm.vue'
import TeamMemberConfigTree from '../TeamMemberConfigTree.vue'
import TeamScopeConfigEditor from '../TeamScopeConfigEditor.vue'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { EditableRuntimeCatalogOperationState } from '~/types/agent/EditableTeamRunFormModel'
import { projectEditableTeamRunFormModel } from '~/utils/editableTeamRunFormModel'
import { projectStoredTeamRunFormModel } from '~/services/teamExecution/storedTeamRunFormModel'
import { buildTestTeamContext, testAgentNode, testSubTeamNode } from '~/test-support/currentTeamTestFixtures'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, unknown>) => params
      ? `${key} ${Object.values(params).join(' ')}`
      : key,
  }),
}))

const nestedDefinition: AgentTeamDefinition = {
  id: 'study-def', name: 'Student Study Group', description: '', instructions: '',
  coordinatorMemberName: 'student_one',
  nodes: [
    { memberName: 'student_one', ref: 'student-one-def', refType: 'AGENT' },
    { memberName: 'student_two', ref: 'student-two-def', refType: 'AGENT' },
  ],
}
const rootDefinition: AgentTeamDefinition = {
  id: 'classroom-def', name: 'Nested Classroom', description: '', instructions: '',
  coordinatorMemberName: 'teacher',
  nodes: [
    { memberName: 'teacher', ref: 'teacher-def', refType: 'AGENT' },
    { memberName: 'StudentStudyGroup', ref: 'study-def', refType: 'AGENT_TEAM' },
  ],
}
const config = (changes: Partial<TeamRunConfig> = {}): TeamRunConfig => ({
  teamDefinitionId: 'classroom-def',
  teamDefinitionName: 'Nested Classroom',
  rootConfig: {
    runtimeKind: 'codex_app_server',
    workspace: {
      workspaceId: 'root-ws',
      workspaceMetadata: {
        workspaceId: 'root-ws', workspaceRootPath: '/workspace/root',
        displayName: 'root', kind: 'filesystem',
      },
    },
    llmModelIdentifier: 'gpt-5.6-luna',
    llmConfig: { reasoning_effort: 'medium' },
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
  },
  teamOverrides: {}, agentOverrides: {}, isLocked: false,
  ...changes,
})
const definitions = new Map([
  [rootDefinition.id, rootDefinition],
  [nestedDefinition.id, nestedDefinition],
])
const idleCatalog: EditableRuntimeCatalogOperationState = { status: 'idle', error: null }
const editableModel = (input: {
  config?: TeamRunConfig
  definition?: AgentTeamDefinition
  repairs?: string[]
  forceReadOnly?: boolean
  selections?: Record<string, { mode: 'existing' | 'new'; existingWorkspaceId: string | null; newWorkspacePath: string }>
} = {}) => projectEditableTeamRunFormModel({
  config: input.config ?? config(),
  teamDefinition: input.definition ?? rootDefinition,
  getTeamDefinitionById: (id) => definitions.get(id) ?? null,
  repairAddresses: input.repairs ?? [],
  workspaceOperationFor: () => ({ status: 'idle', error: null }),
  workspaceSelectionFor: (address) => input.selections?.[address] ?? {
    mode: 'existing', existingWorkspaceId: 'root-ws', newWorkspacePath: '/workspace/root',
  },
  runtimeCatalogStateFor: () => idleCatalog,
  forceReadOnly: input.forceReadOnly,
})
const storedModel = () => projectStoredTeamRunFormModel(buildTestTeamContext({
  teamRunId: 'stored-root-run',
  teamDefinitionId: 'classroom-def',
  teamDefinitionName: 'Nested Classroom',
  coordinatorAddress: '/teacher',
  rootChildren: [
    testAgentNode('/teacher', {
      runtimeKind: 'codex_app_server', llmModelIdentifier: 'historical-root-model',
      llmConfig: { reasoning_effort: 'high' }, autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY', workspaceRootPath: '/workspace/root',
    }),
    testSubTeamNode('/StudentStudyGroup', [
      testAgentNode('/StudentStudyGroup/student_one', {
        runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'historical-student-model',
        llmConfig: { temperature: 0.2 }, workspaceRootPath: '/workspace/student',
      }),
      testAgentNode('/StudentStudyGroup/student_two'),
    ], { teamDefinitionId: 'study-def', displayName: 'StudentStudyGroup' }),
  ],
  workspaceRootPath: '/workspace/root',
}).view.getConfigurationView())
const mountForm = (model = editableModel()) => shallowMount(TeamRunConfigForm, { props: { model } })

describe('TeamRunConfigForm shared editable/stored presentation', () => {
  it('preserves the personal-baseline root order and projects inherited nested Team/Agent values', () => {
    const wrapper = mountForm()
    const root = wrapper.findComponent(TeamScopeConfigEditor)
    const tree = wrapper.findComponent(TeamMemberConfigTree)
    const directChildren = Array.from(wrapper.element.children)

    expect(directChildren[0]?.querySelector('label')?.textContent).toContain('team_definition')
    expect(directChildren[1]?.tagName.toLowerCase()).toBe('team-scope-config-editor-stub')
    expect(directChildren[2]?.querySelector('[data-test="team-member-overrides-toggle"]')).not.toBeNull()
    expect(root.props()).toEqual(expect.objectContaining({
      isRoot: true, disabled: false,
      scope: expect.objectContaining({
        address: '/',
        workspaceSelection: { mode: 'existing', existingWorkspaceId: 'root-ws', newWorkspacePath: '/workspace/root' },
        effectiveConfig: expect.objectContaining({
          runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.6-luna', skillAccessMode: 'PRELOADED_ONLY',
        }),
      }),
    }))
    const members = tree.props('memberNodes') as any[]
    expect(members[1].scope).toEqual(expect.objectContaining({
      address: '/StudentStudyGroup', isCustomized: false,
      effectiveConfig: expect.objectContaining({ llmModelIdentifier: 'gpt-5.6-luna' }),
    }))
    expect(members[1].children[1]).toEqual(expect.objectContaining({
      address: '/StudentStudyGroup/student_two',
      effectiveConfig: expect.objectContaining({ runtimeKind: 'codex_app_server', skillAccessMode: 'PRELOADED_ONLY' }),
    }))
  })

  it('emits exact typed editable Team/reset/Agent/root/workspace commands', async () => {
    const nestedSelection = { mode: 'new' as const, existingWorkspaceId: 'root-ws', newWorkspacePath: '/workspace/study' }
    const wrapper = mountForm(editableModel({
      config: config({
        teamOverrides: {
          '/StudentStudyGroup': { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-sonnet', llmConfig: null },
        },
      }),
      selections: { '/StudentStudyGroup': nestedSelection },
    }))
    const root = wrapper.findComponent(TeamScopeConfigEditor)
    const tree = wrapper.findComponent(TeamMemberConfigTree)
    const members = tree.props('memberNodes') as any[]
    expect(members[1].scope.isCustomized).toBe(true)
    expect(members[1].scope.workspaceSelection).toEqual(nestedSelection)

    root.vm.$emit('update-root', 'model', 'gpt-5.5')
    root.vm.$emit('update:workspace-selection', '/', { mode: 'existing', existingWorkspaceId: 'ws-next', newWorkspacePath: '' })
    tree.vm.$emit('update-team', '/StudentStudyGroup', { autoExecuteTools: true })
    tree.vm.$emit('reset-team', '/StudentStudyGroup')
    tree.vm.$emit('update-agent', '/StudentStudyGroup/student_two', { llmModelIdentifier: 'claude-haiku' })
    tree.vm.$emit('update:workspace-selection', '/StudentStudyGroup', nestedSelection)
    tree.vm.$emit('retry-runtime-catalog', 'claude_agent_sdk')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('edit-config')).toEqual([
      [{ kind: 'set_root_model', llmModelIdentifier: 'gpt-5.5' }],
      [{ kind: 'set_team_override', teamAddress: '/StudentStudyGroup', override: { autoExecuteTools: true } }],
      [{ kind: 'reset_team_override', teamAddress: '/StudentStudyGroup' }],
      [{ kind: 'set_agent_override', agentAddress: '/StudentStudyGroup/student_two', override: { llmModelIdentifier: 'claude-haiku' } }],
    ])
    expect(wrapper.emitted('update:workspaceSelection')).toEqual([
      ['/', { mode: 'existing', existingWorkspaceId: 'ws-next', newWorkspacePath: '' }],
      ['/StudentStudyGroup', nestedSelection],
    ])
    expect(wrapper.emitted('retry-runtime-catalog')).toEqual([['claude_agent_sdk']])
  })

  it('shows sorted topology repairs and exposes an operable members disclosure', async () => {
    const wrapper = mountForm(editableModel({ repairs: ['/Removed', '/StudentStudyGroup/old'] }))
    expect(wrapper.get('[data-test="team-topology-repair-notice"]').text()).toContain('/Removed, /StudentStudyGroup/old')
    const disclosure = wrapper.get('button[aria-controls="team-member-overrides-panel"]')
    expect(disclosure.text()).toContain('team_members_override (3)')
    expect(disclosure.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#team-member-overrides-panel').attributes('style')).toContain('display: none')
    await disclosure.trigger('click')
    expect(disclosure.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('#team-member-overrides-panel').attributes('style')).toBeUndefined()
  })

  it('renders no hierarchy placeholder for a root-only Team definition', () => {
    const wrapper = mountForm(editableModel({ definition: { ...rootDefinition, nodes: [] } }))
    expect(wrapper.find('[data-test="team-member-overrides-toggle"]').exists()).toBe(false)
    expect(wrapper.findComponent(TeamMemberConfigTree).exists()).toBe(false)
  })

  it('disables the complete editable form while a launch is pending', () => {
    const wrapper = mountForm(editableModel({ forceReadOnly: true }))
    expect(wrapper.findComponent(TeamScopeConfigEditor).props('disabled')).toBe(true)
    expect(wrapper.findComponent(TeamMemberConfigTree).props()).toEqual(expect.objectContaining({ disabled: true }))
    expect(wrapper.text()).toContain('configuration_locked_because_execution_has_start')
  })

  it('renders an immutable stored snapshot through the same form with exact values and no commands', async () => {
    const model = storedModel()
    const wrapper = mountForm(model)
    const root = wrapper.findComponent(TeamScopeConfigEditor)
    const tree = wrapper.findComponent(TeamMemberConfigTree)

    expect(wrapper.attributes('data-mode')).toBe('stored')
    expect(root.props()).toEqual(expect.objectContaining({
      disabled: true,
      scope: expect.objectContaining({
        mode: 'stored',
        effectiveConfig: expect.objectContaining({
          runtimeKind: 'codex_app_server', llmModelIdentifier: 'historical-root-model',
          llmConfig: { reasoning_effort: 'high' }, workspaceRootPath: '/workspace/root',
        }),
      }),
    }))
    const members = tree.props('memberNodes') as any[]
    expect(members.map((node) => node.address)).toEqual(['/teacher', '/StudentStudyGroup'])
    expect(members[1].children[0]).toEqual(expect.objectContaining({
      mode: 'stored', address: '/StudentStudyGroup/student_one',
      effectiveConfig: expect.objectContaining({
        runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'historical-student-model',
        llmConfig: { temperature: 0.2 }, workspaceRootPath: '/workspace/student',
      }),
    }))
    expect(tree.props()).toEqual(expect.objectContaining({ disabled: true }))
    expect(wrapper.text()).toContain('selected_team_run_configuration_read_only')
    expect(wrapper.text()).not.toContain('Stored root Team defaults')
    expect(wrapper.find('[data-test="reset-team-scope"]').exists()).toBe(false)
    const disclosure = wrapper.get('button[aria-controls="team-member-overrides-panel"]')
    expect(disclosure.attributes('aria-expanded')).toBe('false')
    expect(disclosure.attributes('disabled')).toBeUndefined()
    await disclosure.trigger('click')
    expect(disclosure.attributes('aria-expanded')).toBe('true')

    root.vm.$emit('update-root', 'model', 'replacement')
    root.vm.$emit('update:workspace-selection', '/', { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/other' })
    tree.vm.$emit('update-team', '/StudentStudyGroup', { autoExecuteTools: false })
    tree.vm.$emit('reset-team', '/StudentStudyGroup')
    tree.vm.$emit('update-agent', '/teacher', { autoExecuteTools: true })
    tree.vm.$emit('retry-runtime-catalog', 'codex_app_server')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('edit-config')).toBeUndefined()
    expect(wrapper.emitted('update:workspaceSelection')).toBeUndefined()
    expect(wrapper.emitted('retry-runtime-catalog')).toBeUndefined()
  })
})
