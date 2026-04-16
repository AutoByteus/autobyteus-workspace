import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentTeamDefinitionForm from '../AgentTeamDefinitionForm.vue'

const mockTranslations: Record<string, string> = {
  'agentTeams.components.agentTeams.AgentTeamDefinitionForm.instructionsPlaceholder': "Enter the team coordinator's instructions...",
  'agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.localAgent': 'Local Agent (reviewer)',
  'agentTeams.components.agentTeams.AgentTeamCard.teamBadge': 'Team-local',
}

const { mockFileUploadStore, mockAgentDefinitionStore, mockAgentTeamDefinitionStore } = vi.hoisted(() => ({
  mockFileUploadStore: {
    isUploading: false,
    error: null as string | null,
    uploadFile: vi.fn().mockResolvedValue(''),
  },
  mockAgentDefinitionStore: {
    agentDefinitions: [
      {
        id: 'agent-1',
        name: 'Agent One',
      },
    ],
    sharedAgentDefinitions: [
      {
        id: 'agent-1',
        name: 'Agent One',
      },
    ],
    fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
    getAgentDefinitionById: vi.fn((id: string) => (id === 'agent-1' ? { id: 'agent-1', name: 'Agent One' } : null)),
    getApplicationOwnedAgentDefinitionsByOwnerApplicationId: vi.fn(() => []),
  },
  mockAgentTeamDefinitionStore: {
    agentTeamDefinitions: [],
    sharedAgentTeamDefinitions: [],
    fetchAllAgentTeamDefinitions: vi.fn().mockResolvedValue(undefined),
    getAgentTeamDefinitionById: vi.fn(() => null),
    getApplicationOwnedTeamDefinitionsByOwnerApplicationId: vi.fn(() => []),
  },
}))

vi.mock('~/stores/fileUploadStore', () => ({
  useFileUploadStore: () => mockFileUploadStore,
}))

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => mockAgentDefinitionStore,
}))

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => mockAgentTeamDefinitionStore,
}))

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === 'agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.localAgent') {
        return `Local Agent (${params?.id ?? 'reviewer'})`
      }
      return mockTranslations[key] ?? key
    },
  }),
}))

const createWrapper = (initialData?: Record<string, unknown>) => mount(AgentTeamDefinitionForm, {
  props: {
    isSubmitting: false,
    submitButtonText: initialData ? 'Save Team' : 'Create Team',
    initialData,
  },
  global: {
    stubs: {
      DefinitionLaunchPreferencesSection: {
        template: `
          <div>
            <button id="set-team-launch-defaults" type="button" @click="emitDefaults">set defaults</button>
            <button id="clear-team-launch-defaults" type="button" @click="emitClear">clear defaults</button>
          </div>
        `,
        methods: {
          emitDefaults() {
            this.$emit('update:runtimeKind', 'codex')
            this.$emit('update:llmModelIdentifier', 'gpt-5.4')
            this.$emit('update:llmConfig', { reasoning_effort: 'high' })
          },
          emitClear() {
            this.$emit('update:runtimeKind', '')
            this.$emit('update:llmModelIdentifier', '')
            this.$emit('update:llmConfig', null)
          },
        },
      },
    },
    mocks: {
      $t: (key: string, params?: Record<string, string>) => {
        if (key === 'agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.localAgent') {
          return `Local Agent (${params?.id ?? 'reviewer'})`
        }
        return mockTranslations[key] ?? key
      },
    },
  },
})

describe('AgentTeamDefinitionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders required instructions input with expected placeholder', () => {
    const wrapper = createWrapper()

    const instructions = wrapper.get('textarea#team-instructions')
    expect(instructions.attributes('required')).toBeDefined()
    expect(instructions.attributes('placeholder')).toBe("Enter the team coordinator's instructions...")
  })

  it('emits submit payload containing instructions', async () => {
    const wrapper = createWrapper()

    await wrapper.get('input#team-name').setValue('Ops Team')
    await wrapper.get('textarea#team-description').setValue('Handles deployment and operations')
    await wrapper.get('textarea#team-instructions').setValue('Coordinate and delegate operations tasks.')

    const agentButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Agent One'))
    expect(agentButton).toBeDefined()
    await agentButton!.trigger('click')

    await wrapper.get('form').trigger('submit.prevent')

    const submitEvents = wrapper.emitted('submit') || []
    expect(submitEvents.length).toBe(1)

    const payload = submitEvents[0]?.[0] as any
    expect(payload.instructions).toBe('Coordinate and delegate operations tasks.')
    expect(payload.defaultLaunchConfig).toBeNull()
    expect(payload.nodes).toHaveLength(1)
    expect(payload.nodes[0]).toMatchObject({
      refType: 'AGENT',
      ref: 'agent-1',
    })
  })

  it('emits defaultLaunchConfig when launch preferences are provided', async () => {
    const wrapper = createWrapper()

    await wrapper.get('input#team-name').setValue('Ops Team')
    await wrapper.get('textarea#team-description').setValue('Handles deployment and operations')
    await wrapper.get('textarea#team-instructions').setValue('Coordinate and delegate operations tasks.')

    const agentButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Agent One'))
    expect(agentButton).toBeDefined()
    await agentButton!.trigger('click')
    await wrapper.get('#set-team-launch-defaults').trigger('click')

    await wrapper.get('form').trigger('submit.prevent')

    const payload = (wrapper.emitted('submit') || [])[0]?.[0] as any
    expect(payload.defaultLaunchConfig).toEqual({
      runtimeKind: 'codex',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: {
        reasoning_effort: 'high',
      },
    })
  })

  it('preserves TEAM_LOCAL members when editing an existing file-authored team', async () => {
    const wrapper = createWrapper({
      id: 'team-local-1',
      name: 'Local Review Team',
      description: 'Uses a file-authored local reviewer',
      instructions: 'Coordinate local review tasks.',
      coordinatorMemberName: 'local_reviewer',
      defaultLaunchConfig: {
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5.4-mini',
        llmConfig: {
          reasoning_effort: 'medium',
        },
      },
      nodes: [
        {
          memberName: 'local_reviewer',
          refType: 'AGENT',
          ref: 'reviewer',
          refScope: 'TEAM_LOCAL',
        },
      ],
    })

    expect(wrapper.text()).toContain('Local Agent (reviewer)')
    expect(wrapper.text()).toContain('Team-local')

    await wrapper.get('input#team-name').setValue('Local Review Team Updated')
    await wrapper.get('#clear-team-launch-defaults').trigger('click')
    await wrapper.get('form').trigger('submit.prevent')

    const submitEvents = wrapper.emitted('submit') || []
    expect(submitEvents.length).toBe(1)

    const payload = submitEvents[0]?.[0] as any
    expect(payload.name).toBe('Local Review Team Updated')
    expect(payload.coordinatorMemberName).toBe('local_reviewer')
    expect(payload.defaultLaunchConfig).toBeNull()
    expect(payload.nodes).toEqual([
      {
        memberName: 'local_reviewer',
        refType: 'AGENT',
        ref: 'reviewer',
        refScope: 'TEAM_LOCAL',
      },
    ])
  })
})
