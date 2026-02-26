import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import AgentTeamDefinitionForm from '../AgentTeamDefinitionForm.vue'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useFederatedCatalogStore } from '~/stores/federatedCatalogStore'
import { useNodeStore } from '~/stores/nodeStore'

const flushAsyncUi = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const mountComponent = async (props: Record<string, unknown> = {}) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
  })
  setActivePinia(pinia)

  const nodeStore = useNodeStore()
  nodeStore.nodes = [
    {
      id: 'node-host',
      name: 'Host Node',
      baseUrl: 'http://localhost:8000',
      nodeType: 'embedded',
      isSystem: true,
      createdAt: '2026-02-12T00:00:00.000Z',
      updatedAt: '2026-02-12T00:00:00.000Z',
    },
    {
      id: 'node-worker',
      name: 'Worker Node',
      baseUrl: 'http://localhost:8100',
      nodeType: 'remote',
      isSystem: false,
      createdAt: '2026-02-12T00:00:00.000Z',
      updatedAt: '2026-02-12T00:00:00.000Z',
    },
  ] as any

  const teamStore = useAgentTeamDefinitionStore()
  teamStore.agentTeamDefinitions = [] as any

  const federatedCatalogStore = useFederatedCatalogStore()
  federatedCatalogStore.catalogByNode = [
    {
      nodeId: 'node-host',
      nodeName: 'Host Node',
      baseUrl: 'http://localhost:8000',
      status: 'ready',
      errorMessage: null,
      agents: [
        {
          homeNodeId: 'node-host',
          definitionId: 'agent-1',
          name: 'Writer Agent',
          role: 'writer',
          description: 'Writes content',
          avatarUrl: null,
        },
      ],
      teams: [],
    },
    {
      nodeId: 'node-worker',
      nodeName: 'Worker Node',
      baseUrl: 'http://localhost:8100',
      status: 'ready',
      errorMessage: null,
      agents: [],
      teams: [],
    },
  ] as any

  const wrapper = mount(AgentTeamDefinitionForm, {
    props: {
      isSubmitting: false,
      submitButtonText: 'Save Team',
      ...props,
    },
    global: {
      plugins: [pinia],
    },
  })
  await flushAsyncUi()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('AgentTeamDefinitionForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not render required/preferred node controls and submits ownership-only nodes', async () => {
    const wrapper = await mountComponent({
      initialData: {
        id: 'team-2',
        name: 'Distributed Writers',
        description: 'Cross-node team',
        coordinatorMemberName: 'writer_agent',
        nodes: [
          {
            memberName: 'writer_agent',
            referenceId: 'agent-1',
            referenceType: 'AGENT',
            homeNodeId: 'node-host',
          },
        ],
      },
    })

    expect(wrapper.text()).not.toContain('Required Node')
    expect(wrapper.text()).not.toContain('Preferred Node')

    await wrapper.get('form').trigger('submit.prevent')

    const submitPayload = wrapper.emitted('submit')?.[0]?.[0] as any
    expect(submitPayload).toBeTruthy()
    expect(submitPayload.name).toBe('Distributed Writers')
    expect(submitPayload.nodes).toHaveLength(1)
    expect(submitPayload.nodes[0]).toMatchObject({
      referenceId: 'agent-1',
      referenceType: 'AGENT',
      memberName: 'writer_agent',
      homeNodeId: 'node-host',
    })
    expect(submitPayload.coordinatorMemberName).toBe('writer_agent')
  })

  it('keeps ownership-only node payload even with legacy hint data in initialData', async () => {
    const wrapper = await mountComponent({
      initialData: {
        id: 'team-1',
        name: 'Existing Team',
        description: 'existing description',
        coordinatorMemberName: 'writer_agent',
        nodes: [
          {
            memberName: 'writer_agent',
            referenceId: 'agent-1',
            referenceType: 'AGENT',
            homeNodeId: 'node-host',
            requiredNodeId: 'node-host',
            preferredNodeId: 'node-worker',
          },
        ],
      },
    })

    expect(wrapper.text()).not.toContain('Required Node')
    expect(wrapper.text()).not.toContain('Preferred Node')

    await wrapper.get('form').trigger('submit.prevent')
    const submitPayload = wrapper.emitted('submit')?.[0]?.[0] as any
    expect(submitPayload.nodes[0]).toEqual({
      memberName: 'writer_agent',
      referenceId: 'agent-1',
      referenceType: 'AGENT',
      homeNodeId: 'node-host',
    })
  })
})
