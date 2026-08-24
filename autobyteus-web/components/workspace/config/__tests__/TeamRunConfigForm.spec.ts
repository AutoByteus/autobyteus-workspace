import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'
import TeamRunConfigForm from '../TeamRunConfigForm.vue'
import TeamMemberConfigTree from '../TeamMemberConfigTree.vue'
import TeamScopeConfigEditor from '../TeamScopeConfigEditor.vue'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'

const reloadRuntimeKind = vi.fn()
vi.mock('~/composables/useTeamRunRuntimeCatalogSync', () => ({
  useTeamRunRuntimeCatalogSync: () => ({ reloadRuntimeKind }),
}))
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, unknown>) => params
      ? `${key} ${Object.values(params).join(' ')}`
      : key,
  }),
}))

const nestedDefinition: AgentTeamDefinition = {
  id: 'study-def',
  name: 'Student Study Group',
  description: '',
  instructions: '',
  coordinatorMemberName: 'student_one',
  nodes: [
    { memberName: 'student_one', ref: 'student-one-def', refType: 'AGENT' },
    { memberName: 'student_two', ref: 'student-two-def', refType: 'AGENT' },
  ],
}

const rootDefinition: AgentTeamDefinition = {
  id: 'classroom-def',
  name: 'Nested Classroom',
  description: '',
  instructions: '',
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
        workspaceId: 'root-ws',
        workspaceRootPath: '/workspace/root',
        displayName: 'root',
        kind: 'filesystem',
      },
    },
    llmModelIdentifier: 'gpt-5.6-luna',
    llmConfig: { reasoning_effort: 'medium' },
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
  },
  teamOverrides: {},
  agentOverrides: {},
  isLocked: false,
  ...changes,
})

const mountForm = (props: Record<string, unknown> = {}) => shallowMount(TeamRunConfigForm, {
  props: {
    config: config(),
    teamDefinition: rootDefinition,
    ...props,
  },
})

describe('TeamRunConfigForm hierarchical scopes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAgentTeamDefinitionStore().agentTeamDefinitions = [rootDefinition, nestedDefinition]
    const configStore = useTeamRunConfigStore()
    configStore.runtimeModelCatalogStates = {
      codex_app_server: { status: 'ready', error: null },
      claude_agent_sdk: { status: 'error', error: 'catalog offline' },
    }
    reloadRuntimeKind.mockReset()
  })

  it('renders the root defaults and derives inherited nested Team/Agent values', () => {
    const wrapper = mountForm()
    const root = wrapper.findComponent(TeamScopeConfigEditor)
    const tree = wrapper.findComponent(TeamMemberConfigTree)

    expect(root.props()).toEqual(expect.objectContaining({
      address: '/',
      isRoot: true,
      disabled: false,
      workspaceSelection: {
        mode: 'existing',
        existingWorkspaceId: 'root-ws',
        newWorkspacePath: '/workspace/root',
      },
      effectiveConfig: expect.objectContaining({
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: 'gpt-5.6-luna',
        skillAccessMode: 'PRELOADED_ONLY',
      }),
    }))
    expect(tree.props('view').teamsByAddress['/StudentStudyGroup']).toEqual(expect.objectContaining({
      parentAddress: '/',
      isCustomized: false,
      effectiveConfig: expect.objectContaining({
        llmModelIdentifier: 'gpt-5.6-luna',
      }),
    }))
    expect(tree.props('view').agentsByAddress['/StudentStudyGroup/student_two']).toEqual(expect.objectContaining({
      containingTeamAddress: '/StudentStudyGroup',
      effectiveConfig: expect.objectContaining({
        runtimeKind: 'codex_app_server',
        skillAccessMode: 'PRELOADED_ONLY',
      }),
    }))
  })

  it('passes customized Team state and emits exact typed Team/reset/Agent commands', async () => {
    const wrapper = mountForm({
      config: config({
        teamOverrides: {
          '/StudentStudyGroup': {
            runtimeKind: 'claude_agent_sdk',
            llmModelIdentifier: 'claude-sonnet',
            llmConfig: null,
          },
        },
        agentOverrides: {
          '/StudentStudyGroup/student_two': { llmModelIdentifier: 'claude-opus' },
        },
      }),
    })
    const tree = wrapper.findComponent(TeamMemberConfigTree)

    expect(tree.props('view').teamsByAddress['/StudentStudyGroup']).toEqual(expect.objectContaining({
      isCustomized: true,
      effectiveConfig: expect.objectContaining({
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'claude-sonnet',
        llmConfig: null,
      }),
    }))

    tree.vm.$emit('update-team', '/StudentStudyGroup', { autoExecuteTools: true })
    tree.vm.$emit('reset-team', '/StudentStudyGroup')
    tree.vm.$emit('update-agent', '/StudentStudyGroup/student_two', { llmModelIdentifier: 'claude-haiku' })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('edit-config')).toEqual([
      [{ kind: 'set_team_override', teamAddress: '/StudentStudyGroup', override: { autoExecuteTools: true } }],
      [{ kind: 'reset_team_override', teamAddress: '/StudentStudyGroup' }],
      [{ kind: 'set_agent_override', agentAddress: '/StudentStudyGroup/student_two', override: { llmModelIdentifier: 'claude-haiku' } }],
    ])
  })

  it('emits root edits and complete address-qualified workspace selections without local policy merging', async () => {
    const nestedSelection = {
      mode: 'new' as const,
      existingWorkspaceId: 'root-ws',
      newWorkspacePath: '/workspace/study',
    }
    const wrapper = mountForm({ workspaceSelections: { '/StudentStudyGroup': nestedSelection } })
    const root = wrapper.findComponent(TeamScopeConfigEditor)
    const tree = wrapper.findComponent(TeamMemberConfigTree)

    expect(tree.props('workspaceSelectionFor')('/StudentStudyGroup')).toEqual(nestedSelection)
    root.vm.$emit('update-root', 'model', 'gpt-5.5')
    const rootSelection = { mode: 'existing', existingWorkspaceId: 'ws-next', newWorkspacePath: '' }
    root.vm.$emit('update:workspace-selection', '/', rootSelection)
    tree.vm.$emit('update:workspace-selection', '/StudentStudyGroup', nestedSelection)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('edit-config')).toEqual([
      [{ kind: 'set_root_model', llmModelIdentifier: 'gpt-5.5' }],
    ])
    expect(wrapper.emitted('update:workspaceSelection')).toEqual([
      ['/', rootSelection],
      ['/StudentStudyGroup', nestedSelection],
    ])
  })

  it('shows sorted topology repairs and exposes an operable members disclosure', async () => {
    const wrapper = mountForm({ repairAddresses: ['/Removed', '/StudentStudyGroup/old'] })

    expect(wrapper.get('[data-test="team-topology-repair-notice"]').text()).toContain('/Removed, /StudentStudyGroup/old')
    const disclosure = wrapper.get('button[aria-controls="team-scope-members"]')
    expect(disclosure.attributes('aria-expanded')).toBe('true')
    await disclosure.trigger('click')
    expect(disclosure.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#team-scope-members').attributes('style')).toContain('display: none')
  })

  it.each([
    { readOnly: true, locked: false, message: 'selected_team_run_configuration_read_only' },
    { readOnly: false, locked: true, message: 'configuration_locked_because_execution_has_start' },
  ])('disables all root, Team, reset, and Agent paths for $message', ({ readOnly, locked, message }) => {
    const wrapper = mountForm({ readOnly, config: config({ isLocked: locked }) })

    expect(wrapper.findComponent(TeamScopeConfigEditor).props('disabled')).toBe(true)
    expect(wrapper.findComponent(TeamMemberConfigTree).props()).toEqual(expect.objectContaining({
      disabled: true,
      readOnlyMode: readOnly,
    }))
    expect(wrapper.text()).toContain(message)
  })

  it('associates scoped runtime catalog retry with the effective runtime', async () => {
    const wrapper = mountForm({
      config: config({
        teamOverrides: {
          '/StudentStudyGroup': {
            runtimeKind: 'claude_agent_sdk',
            llmModelIdentifier: 'claude-sonnet',
          },
        },
      }),
    })
    wrapper.findComponent(TeamMemberConfigTree).vm.$emit('retry-runtime-catalog', 'claude_agent_sdk')
    await wrapper.vm.$nextTick()

    expect(reloadRuntimeKind).toHaveBeenCalledWith('claude_agent_sdk')
  })
})
