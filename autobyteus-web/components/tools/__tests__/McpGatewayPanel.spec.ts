import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import McpGatewayPanel from '../McpGatewayPanel.vue'
import { useToolManagementStore } from '~/stores/toolManagementStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

const flushPromises = async () => {
  await nextTick()
  await Promise.resolve()
}

describe('McpGatewayPanel', () => {
  it('renders concise gateway endpoint/config guidance without fetching duplicate tool list data', async () => {
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
    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.initialized = true
    windowNodeContextStore.nodeBaseUrl = 'http://127.0.0.1:8000/'

    const wrapper = mount(McpGatewayPanel, { global: { plugins: [pinia] } })
    await flushPromises()
    const store = useToolManagementStore()

    const endpoint = wrapper.get('[data-testid="mcp-gateway-endpoint"]')
    expect(endpoint.text()).toContain('http://127.0.0.1:8000/mcp/gateway')
    expect(wrapper.text()).toContain('Copy this Streamable HTTP endpoint or use the JSON snippet below.')
    expect(wrapper.text()).not.toContain('Configure Cursor, Antigravity, Claude Code')
    expect(wrapper.text()).not.toContain('Manage and inspect exposed tools in the MCP Servers tab.')
    expect(wrapper.text()).not.toContain('Exposed MCP-origin tools')
    expect(wrapper.text()).not.toContain('db_query')
    expect(wrapper.text()).not.toContain('Query the configured database')
    expect(wrapper.text()).not.toContain('browser_search')
    expect(wrapper.text()).toContain('Authorization')
    expect(wrapper.text()).toContain('Bearer <optional configured gateway token>')
    expect(store.fetchMcpGatewayTools).not.toHaveBeenCalled()
  })

  it('shows visible copied feedback for endpoint and JSON copy actions', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
    })
    setActivePinia(pinia)
    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.initialized = true
    windowNodeContextStore.nodeBaseUrl = 'http://127.0.0.1:8000/'

    const wrapper = mount(McpGatewayPanel, { global: { plugins: [pinia] } })
    await flushPromises()

    const endpointCopyButton = wrapper.get('[data-testid="mcp-gateway-copy-endpoint"]')
    await endpointCopyButton.trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('http://127.0.0.1:8000/mcp/gateway')
    expect(endpointCopyButton.text()).toBe('Copied')

    const jsonCopyButton = wrapper.get('[data-testid="mcp-gateway-copy-json"]')
    await jsonCopyButton.trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining('"type": "streamable-http"'))
    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining('"url": "http://127.0.0.1:8000/mcp/gateway"'))
    expect(jsonCopyButton.text()).toBe('Copied')
  })
})
