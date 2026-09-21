import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import TeamRunConfigForm from '../TeamRunConfigForm.vue'
import TeamMemberConfigTree from '../TeamMemberConfigTree.vue'
import TeamScopeConfigEditor from '../TeamScopeConfigEditor.vue'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { TeamRunFormModel } from '~/types/agent/TeamRunFormModel'
import type { EditableRuntimeCatalogOperationState } from '~/types/agent/EditableTeamRunFormModel'
import { projectEditableTeamRunFormModel } from '~/utils/editableTeamRunFormModel'
import { projectExistingTeamRunFormModel } from '~/services/runConfigEditing/existingTeamRunFormModel'
import { createExistingTeamModelConfigDraft } from '~/services/runConfigEditing/existingTeamModelConfigDraft'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, unknown>) => params
      ? `${key} ${Object.values(params).join(' ')}`
      : key,
  }),
}))

const rootDefinition: AgentTeamDefinition = {
  id: 'classroom-def', name: 'Flat Classroom', description: '', instructions: '',
  coordinatorMemberName: 'teacher',
  nodes: [
    { memberName: 'teacher', ref: 'teacher-def' },
    { memberName: 'student_one', ref: 'student-one-def' },
    { memberName: 'student_two', ref: 'student-two-def' },
  ],
}
const config = (changes: Partial<TeamRunConfig> = {}): TeamRunConfig => ({
  teamDefinitionId: 'classroom-def',
  teamDefinitionName: 'Flat Classroom',
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
const definitions = new Map([[rootDefinition.id, rootDefinition]])
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
const existingModel = () => {
  const tree = buildTestTeamContext({
  teamRunId: 'stored-root-run',
  teamDefinitionId: 'classroom-def',
  teamDefinitionName: 'Classroom',
  coordinatorAddress: '/teacher',
  rootChildren: [
    testAgentNode('/teacher', {
      runtimeKind: 'codex_app_server', llmModelIdentifier: 'historical-root-model',
      llmConfig: { reasoning_effort: 'high' }, autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY', workspaceRootPath: '/workspace/root',
    }),
    testAgentNode('/student_one', {
      runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'historical-student-model',
      llmConfig: { temperature: 0.2 }, workspaceRootPath: '/workspace/student',
    }),
    testAgentNode('/student_two'),
  ],
  workspaceRootPath: '/workspace/root',
  }).view.getExecutionTree()
  return projectExistingTeamRunFormModel({
    tree,
    planner: createExistingTeamModelConfigDraft(tree),
    isActive: false,
    modelConfigEditable: true,
    modelConfigReason: null,
    saving: false,
  })
}
const mountForm = (model: TeamRunFormModel = editableModel()) => shallowMount(TeamRunConfigForm, {
  props: { model },
  global: { stubs: { MemberOverridesDisclosure: false } },
})

describe('TeamRunConfigForm launch and existing-run presentation', () => {
  it('preserves the personal-baseline root order and projects inherited direct-Agent values', () => {
    const wrapper = mountForm()
    const root = wrapper.findComponent(TeamScopeConfigEditor)
    const tree = wrapper.findComponent(TeamMemberConfigTree)
    const directChildren = Array.from(wrapper.element.children) as HTMLElement[]

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
    expect(members.map((member) => member.address)).toEqual(['/teacher', '/student_one', '/student_two'])
    expect(members[1]).toEqual(expect.objectContaining({
      kind: 'agent', address: '/student_one', isCustomized: false,
      effectiveConfig: expect.objectContaining({ runtimeKind: 'codex_app_server', skillAccessMode: 'PRELOADED_ONLY' }),
    }))
  })

  it('emits exact typed editable root, direct-Agent, and root-workspace commands', async () => {
    const wrapper = mountForm(editableModel({
      config: config({
        agentOverrides: {
          '/student_one': { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-sonnet', llmConfig: null },
        },
      }),
    }))
    const root = wrapper.findComponent(TeamScopeConfigEditor)
    const tree = wrapper.findComponent(TeamMemberConfigTree)
    const members = tree.props('memberNodes') as any[]
    expect(members[1].isCustomized).toBe(true)

    root.vm.$emit('update-root', 'model', 'gpt-5.5')
    root.vm.$emit('update:workspace-selection', '/', { mode: 'existing', existingWorkspaceId: 'ws-next', newWorkspacePath: '' })
    tree.vm.$emit('update-agent', '/student_two', { llmModelIdentifier: 'claude-haiku' })
    tree.vm.$emit('retry-runtime-catalog', 'claude_agent_sdk')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('edit-config')).toEqual([
      [{ kind: 'set_root_model', llmModelIdentifier: 'gpt-5.5' }],
      [{ kind: 'set_agent_override', agentAddress: '/student_two', override: { llmModelIdentifier: 'claude-haiku' } }],
    ])
    expect(wrapper.emitted('update:workspaceSelection')).toEqual([
      ['/', { mode: 'existing', existingWorkspaceId: 'ws-next', newWorkspacePath: '' }],
    ])
    expect(wrapper.emitted('retry-runtime-catalog')).toEqual([['claude_agent_sdk']])
  })

  it('shows sorted topology repairs and exposes an operable members disclosure', async () => {
    const wrapper = mountForm(editableModel({ repairs: ['/removed', '/student_old'] }))
    expect(wrapper.get('[data-test="team-topology-repair-notice"]').text()).toContain('/removed, /student_old')
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

  it('keeps fixed Team facts locked while emitting only existing-run model-config edits', async () => {
    const model = existingModel()
    const wrapper = mountForm(model)
    const root = wrapper.findComponent(TeamScopeConfigEditor)
    const tree = wrapper.findComponent(TeamMemberConfigTree)

    expect(wrapper.attributes('data-mode')).toBe('existing')
    expect(root.props()).toEqual(expect.objectContaining({
      disabled: false,
      scope: expect.objectContaining({
        mode: 'existing',
        effectiveConfig: expect.objectContaining({
          runtimeKind: 'codex_app_server', llmModelIdentifier: 'historical-root-model',
          llmConfig: { reasoning_effort: 'high' }, workspaceRootPath: '/workspace/root',
        }),
      }),
    }))
    const members = tree.props('memberNodes') as any[]
    expect(members.map((node) => node.address)).toEqual(['/teacher', '/student_one', '/student_two'])
    expect(members[1]).toEqual(expect.objectContaining({
      mode: 'existing', address: '/student_one',
      effectiveConfig: expect.objectContaining({
        runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'historical-student-model',
        llmConfig: { temperature: 0.2 }, workspaceRootPath: '/workspace/student',
      }),
    }))
    expect(tree.props()).toEqual(expect.objectContaining({ disabled: false }))
    expect(wrapper.text()).toContain('workspace.runModelConfig.teamStopped')
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
    root.vm.$emit('update-existing-model-config', '/', { llmModelIdentifier: 'model', llmConfig: { reasoning_effort: 'low' } }, true)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('edit-config')).toBeUndefined()
    expect(wrapper.emitted('update:workspaceSelection')).toBeUndefined()
    expect(wrapper.emitted('retry-runtime-catalog')).toBeUndefined()
    expect(wrapper.emitted('update-existing-model-config')).toEqual([["/", { llmModelIdentifier: 'model', llmConfig: { reasoning_effort: 'low' } }, true]])
  })
})
