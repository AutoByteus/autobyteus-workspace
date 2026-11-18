import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AgentDefinitionForm from '../AgentDefinitionForm.vue'

/** package-personal-settings, design "UI (stage 1)": the note, the "Personal" marks and reset in the agent editor. */
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

describe('AgentDefinitionForm personal settings', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('a package agent shows the note and marks exactly its personal settings', () => {
    const wrapper = mountForm(packageAgent())
    expect(wrapper.get('[data-testid="personal-settings-note"]').text()).toBe('personalSettings.note.agent.package')
    const marks = wrapper.findAll('[data-testid="personal-setting-mark"]')
    expect(marks).toHaveLength(1) // tools; the runtime/model mark is in the launch section
    expect(marks[0]!.text()).toContain("personalSettings.reset.package")
    expect(wrapper.get('[data-testid="launch-section"]').attributes()).toMatchObject({ 'data-personal': 'true', 'data-base': 'PACKAGE' })
  })

  it('a built-in agent names restarts and AutoByteus updates, and resets to the built-in setting', () => {
    const wrapper = mountForm(packageAgent({ personalSettingsBase: 'BUILT_IN', personalSettings: ['AVATAR'], avatarUrl: '/mine.png' }))
    expect(wrapper.get('[data-testid="personal-settings-note"]').text()).toBe('personalSettings.note.agent.builtIn')
    expect(wrapper.get('[data-testid="personal-setting-reset"]').text()).toBe('personalSettings.reset.builtIn')
  })

  it("the user's own agent and the create form show no note and no marks", () => {
    for (const wrapper of [mountForm(packageAgent({ personalSettingsBase: null, personalSettings: [] })), mountForm(undefined, true)]) {
      expect(wrapper.find('[data-testid="personal-settings-note"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="personal-setting-mark"]').exists()).toBe(false)
    }
  })

  it("reset takes the setting's base value and keeps the user's other unsaved edits", async () => {
    const wrapper = mountForm(packageAgent())
    const afterReset = packageAgent({ toolNames: ['read_file', 'write_file'], personalSettings: ['DEFAULT_LAUNCH_CONFIG'] })
    mockAgentStore.resetAgentPersonalSetting.mockImplementation(async () => {
      await wrapper.setProps({ initialData: afterReset }) // the edit page passes the store's refreshed definition
      return afterReset
    })
    await wrapper.get('textarea#description').setValue('Designs well (not saved yet)')

    await wrapper.get('[data-testid="personal-setting-reset"]').trigger('click')
    await flushPromises()

    expect(mockAgentStore.resetAgentPersonalSetting).toHaveBeenCalledWith('solution-designer', 'TOOLS')
    expect(wrapper.find('[data-testid="personal-setting-mark"]').exists()).toBe(false)
    // The announced change reloads the list later: the same definition arrives again as a new object.
    await wrapper.setProps({ initialData: { ...afterReset } })
    expect(await submitted(wrapper)).toMatchObject({ description: 'Designs well (not saved yet)', toolNames: ['read_file', 'write_file'] })
  })

  it('a definition that really changed still refills the form', async () => {
    const wrapper = mountForm(packageAgent())
    await wrapper.get('textarea#description').setValue('Local edit')
    await wrapper.setProps({ initialData: packageAgent() }) // the same values: kept
    expect((wrapper.get('textarea#description').element as HTMLTextAreaElement).value).toBe('Local edit')
    await wrapper.setProps({ initialData: packageAgent({ description: 'Changed in the package file' }) })
    expect((wrapper.get('textarea#description').element as HTMLTextAreaElement).value).toBe('Changed in the package file')
  })

  it('a runtime/model reset applies the base launch config; a failed reset shows the error', async () => {
    const wrapper = mountForm(packageAgent())
    mockAgentStore.resetAgentPersonalSetting.mockResolvedValueOnce(packageAgent({ defaultLaunchConfig: null, personalSettings: ['TOOLS'] }))
    await wrapper.get('[data-testid="launch-reset"]').trigger('click')
    await flushPromises()
    expect(mockAgentStore.resetAgentPersonalSetting).toHaveBeenCalledWith('solution-designer', 'DEFAULT_LAUNCH_CONFIG')
    expect((await submitted(wrapper)).defaultLaunchConfig).toBeNull()

    mockAgentStore.resetAgentPersonalSetting.mockRejectedValueOnce(new Error('offline'))
    await wrapper.get('[data-testid="personal-setting-reset"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('personalSettings.reset.failed {"error":"offline"}')
  })
})
