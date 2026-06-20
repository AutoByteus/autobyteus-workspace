import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ToolDetailsModal from '../ToolDetailsModal.vue'
import type { Tool } from '~/stores/toolManagementStore'

const { toolManagementStoreMock, addToastMock } = vi.hoisted(() => ({
  toolManagementStoreMock: {
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

const buildTool = (): Tool => ({
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
        jsonSchema: {
          type: 'object',
          properties: {
            voice: {
              type: 'string',
              description: 'Voice to use.',
              enum: ['alloy', 'coral'],
            },
            format: {
              type: 'string',
              description: 'Audio format.',
              enum: ['mp3', 'wav'],
            },
          },
        },
      },
    ],
  },
})

describe('ToolDetailsModal', () => {
  it('renders nested object parameter rows under their parent parameter', () => {
    const wrapper = mount(ToolDetailsModal, {
      props: {
        show: true,
        tool: buildTool(),
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('generation_config')
    expect(rows[1].text()).toContain('voice')
    expect(rows[1].text()).toContain('generation_config.voice')
    expect(rows[1].text()).toContain('Enum: [alloy, coral]')
    expect(rows[2].text()).toContain('format')
    expect(rows[2].text()).toContain('generation_config.format')
  })
})
