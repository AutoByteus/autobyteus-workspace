import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import McpGatewayPanel from '../McpGatewayPanel.vue'
import { useToolManagementStore } from '~/stores/toolManagementStore'

vi.mock('~/utils/serverConfig', () => ({
  getServerBaseUrl: () => 'http://127.0.0.1:8000/',
}))

const flushPromises = async () => {
  await nextTick()
  await Promise.resolve()
}

describe('McpGatewayPanel', () => {
  it('renders gateway endpoint/config guidance and MCP-origin tool count/list from store data', async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
      initialState: {
        toolManagement: {
          loading: false,
          mcpGatewayTools: [
            {
              name: 'db_query',
              description: 'Query the configured database',
              origin: 'MCP',
              category: 'sqlite',
              argumentSchema: null,
            },
            {
              name: 'browser_search',
              description: 'Search through configured MCP server',
              origin: 'MCP',
              category: 'browser',
              argumentSchema: null,
            },
          ],
        },
      },
    })
    setActivePinia(pinia)

    const wrapper = mount(McpGatewayPanel, { global: { plugins: [pinia] } })
    await flushPromises()
    const store = useToolManagementStore()

    const endpoint = wrapper.get('#mcp-gateway-endpoint').element as HTMLInputElement
    expect(endpoint.value).toBe('http://127.0.0.1:8000/mcp/gateway')
    expect(wrapper.text()).toContain('2 tools currently available through /mcp/gateway.')
    expect(wrapper.text()).toContain('db_query')
    expect(wrapper.text()).toContain('Query the configured database')
    expect(wrapper.text()).toContain('browser_search')
    expect(wrapper.text()).toContain('Authorization')
    expect(wrapper.text()).toContain('Bearer <optional configured gateway token>')
    expect(store.fetchMcpGatewayTools).toHaveBeenCalledTimes(1)

    const refreshButton = wrapper.findAll('button').find(button => button.text() === 'Refresh')
    expect(refreshButton).toBeTruthy()
    await refreshButton!.trigger('click')
    expect(store.fetchMcpGatewayTools).toHaveBeenCalledTimes(2)
  })

  it('renders the empty state when no MCP-origin tools are registered', async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
      initialState: {
        toolManagement: {
          loading: false,
          mcpGatewayTools: [],
        },
      },
    })
    setActivePinia(pinia)

    const wrapper = mount(McpGatewayPanel, { global: { plugins: [pinia] } })
    await flushPromises()

    expect(wrapper.text()).toContain('0 tools currently available through /mcp/gateway.')
    expect(wrapper.text()).toContain('No MCP-origin tools are currently registered.')
  })
})
