import { defineComponent } from 'vue'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ToolsManagementWorkspace from '../ToolsManagementWorkspace.vue'
import type { Tool } from '~/stores/toolManagementStore'

const staleTool: Tool = {
  name: 'generate_speech',
  description: 'Generate speech from text.',
  origin: 'LOCAL',
  category: 'Media',
  argumentSchema: {
    parameters: [
      {
        name: 'generation_config',
        paramType: 'OBJECT',
        description: 'Model-specific generation options.',
        required: false,
        defaultValue: null,
        enumValues: null,
        jsonSchema: { type: 'object', properties: {} },
      },
    ],
  },
}

const updatedTool: Tool = {
  ...staleTool,
  argumentSchema: {
    parameters: [
      {
        name: 'generation_config',
        paramType: 'OBJECT',
        description: 'Model-specific generation options.',
        required: false,
        defaultValue: null,
        enumValues: null,
        jsonSchema: {
          type: 'object',
          properties: {
            voice: {
              type: 'string',
              description: 'Voice to use.',
              enum: ['alloy', 'coral'],
            },
          },
        },
      },
    ],
  },
}

const { toolManagementStoreMock, addToastMock } = vi.hoisted(() => ({
  toolManagementStoreMock: {
    getLoading: false,
    getLocalToolsByCategory: [] as Array<{ categoryName: string; tools: Tool[] }>,
    getMcpServers: [],
    getMcpGatewayTools: [],
    getToolsForServer: vi.fn(() => []),
    fetchLocalToolsGroupedByCategory: vi.fn(),
    fetchMcpServers: vi.fn(),
    fetchMcpGatewayTools: vi.fn(),
    fetchToolsForServer: vi.fn(),
    deleteMcpServer: vi.fn(),
    discoverAndRegisterMcpServerTools: vi.fn(),
    reloadToolSchema: vi.fn(),
  },
  addToastMock: vi.fn(),
}))

vi.mock('~/stores/toolManagementStore', () => ({
  useToolManagementStore: () => toolManagementStoreMock,
}))

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({ addToast: addToastMock }),
}))

const ToolListStub = defineComponent({
  props: {
    tools: {
      type: Array,
      required: true,
    },
  },
  emits: ['details'],
  template: '<button data-testid="open-tool-details" @click="$emit(\'details\', tools[0])">Open details</button>',
})

const stubs = {
  ToolsFilter: true,
  ToolList: ToolListStub,
  McpManagementTabs: true,
  McpServerList: true,
  McpGatewayPanel: true,
  McpServerFormModal: true,
  McpBulkImportView: true,
  ToastContainer: true,
  ToolsConfirmationModal: true,
}

describe('ToolsManagementWorkspace reload schema synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toolManagementStoreMock.getLocalToolsByCategory = [
      { categoryName: 'Media', tools: [staleTool] },
    ]
    toolManagementStoreMock.reloadToolSchema.mockResolvedValue({
      success: true,
      message: 'Reloaded schema.',
      tool: updatedTool,
    })
  })

  it('replaces the selected modal tool after reload so the already-open modal rerenders', async () => {
    const wrapper = mount(ToolsManagementWorkspace, {
      global: {
        stubs,
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    await wrapper.get('[data-testid="open-tool-details"]').trigger('click')
    expect(wrapper.text()).toContain('generation_config')
    expect(wrapper.text()).not.toContain('generation_config.voice')

    const reloadButton = wrapper.findAll('button').find((button) => button.text().includes('Reload Schema'))
    expect(reloadButton).toBeTruthy()
    await reloadButton!.trigger('click')
    await flushPromises()

    expect(toolManagementStoreMock.reloadToolSchema).toHaveBeenCalledWith('generate_speech')
    expect(wrapper.text()).toContain('generation_config.voice')
    expect(wrapper.text()).toContain('Enum: [alloy, coral]')
  })
})
