import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AgentDefinitionForm from '../AgentDefinitionForm.vue'

/** agent-semantic-memory (REQ-002, AC-007): the semantic memory switch in the agent editor, its payload and its personal-setting reset. */
const { mockAgentStore } = vi.hoisted(() => ({ mockAgentStore: { resetAgentPersonalSetting: vi.fn() } }))

vi.mock('~/stores/agentDefinitionOptionsStore', () => ({
  useAgentDefinitionOptionsStore: () => ({
    fetchAllAvailableOptions: vi.fn(), inputProcessors: [], llmResponseProcessors: [], toolExecutionResultProcessors: [],
    toolInvocationPreprocessors: [], lifecycleProcessors: [],
  }),
}))
vi.mock('~/stores/toolManagementStore', () => ({
  useToolManagementStore: () => ({
    getLocalToolsByCategory: [], fetchLocalToolsGroupedByCategory: vi.fn(), getMcpServers: [],
    fetchMcpServers: vi.fn().mockResolvedValue(undefined), getToolsForServer: vi.fn(() => []),
  }),
}))
vi.mock('~/stores/skillStore', () => ({ useSkillStore: () => ({ skills: [], fetchAllSkills: vi.fn() }) }))
vi.mock('~/stores/fileUploadStore', () => ({ useFileUploadStore: () => ({ isUploading: false, error: null, uploadFile: vi.fn() }) }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => mockAgentStore }))
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: (key: string, params?: Record<string, string>) => (params ? `${key} ${JSON.stringify(params)}` : key) }),
}))

const launch = { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5', llmConfig: null }
const packageAgent = (overrides: Record<string, unknown> = {}) => ({
  id: 'solution-designer', name: 'Solution Designer', role: 'Designer', description: 'Designs', instructions: 'Work.',
  avatarUrl: null, toolNames: ['read_file', 'write_file', 'mcp_x'], skillNames: ['design'], skillScope: 'CONFIGURED',
  inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [],
  lifecycleProcessorNames: [], defaultLaunchConfig: launch, personalSettings: ['TOOLS', 'DEFAULT_LAUNCH_CONFIG'], personalSettingsBase: 'PACKAGE',
  ...overrides,
})

const mountForm = (initialData: Record<string, unknown> | undefined, isCreateMode = false) => mount(AgentDefinitionForm, {
  props: { initialData, isSubmitting: false, submitButtonText: 'Save', isCreateMode },
  global: {
    stubs: {
      GroupableTagInput: true,
      DefinitionLaunchPreferencesSection: {
        props: ['personalSettingsBase', 'personal', 'resettingPersonal'],
        emits: ['resetPersonal'],
        template: '<div data-testid="launch-section" :data-personal="String(personal)" :data-base="personalSettingsBase"><button data-testid="launch-reset" type="button" @click="$emit(\'resetPersonal\')">reset</button></div>',
      },
    },
    mocks: { $t: (key: string) => key },
  },
})
const submitted = async (wrapper: ReturnType<typeof mountForm>) => {
  await wrapper.get('form').trigger('submit')
  return (wrapper.emitted('submit')?.at(-1)?.[0] ?? {}) as Record<string, unknown>
}

describe('AgentDefinitionForm semantic memory switch', () => {
  beforeEach(() => { vi.clearAllMocks() })
  const checkbox = (wrapper: ReturnType<typeof mountForm>) => wrapper.get('[data-testid="semantic-memory-enabled"]')

  it('shows the current state and sends it with the save', async () => {
    const off = mountForm(packageAgent({ personalSettings: [] }))
    expect((checkbox(off).element as HTMLInputElement).checked).toBe(false)
    expect(off.text()).toContain('agents.components.agents.AgentSemanticMemoryField.label')
    expect(off.text()).toContain('agents.components.agents.AgentSemanticMemoryField.help')
    expect((await submitted(off)).semanticMemoryEnabled).toBe(false)
    await checkbox(off).setValue(true)
    expect((await submitted(off)).semanticMemoryEnabled).toBe(true)

    const on = mountForm(packageAgent({ semanticMemoryEnabled: true, personalSettings: [] }))
    expect((checkbox(on).element as HTMLInputElement).checked).toBe(true)
    await checkbox(on).setValue(false)
    expect((await submitted(on)).semanticMemoryEnabled).toBe(false)
  })

  it('the create form starts off', async () => {
    const wrapper = mountForm(undefined, true)
    expect((checkbox(wrapper).element as HTMLInputElement).checked).toBe(false)
    expect((await submitted(wrapper)).semanticMemoryEnabled).toBe(false)
  })

  it("a package agent's personal switch is marked; reset applies the package's value", async () => {
    const wrapper = mountForm(packageAgent({ semanticMemoryEnabled: true, personalSettings: ['SEMANTIC_MEMORY'] }))
    const marks = wrapper.findAll('[data-testid="personal-setting-mark"]')
    expect(marks).toHaveLength(1)
    mockAgentStore.resetAgentPersonalSetting.mockResolvedValueOnce(packageAgent({ semanticMemoryEnabled: false, personalSettings: [] }))
    await marks[0]!.get('[data-testid="personal-setting-reset"]').trigger('click')
    await flushPromises()
    expect(mockAgentStore.resetAgentPersonalSetting).toHaveBeenCalledWith('solution-designer', 'SEMANTIC_MEMORY')
    expect((checkbox(wrapper).element as HTMLInputElement).checked).toBe(false)
    expect((await submitted(wrapper)).semanticMemoryEnabled).toBe(false)
  })
})
