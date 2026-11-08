import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { nextTick } from 'vue'
const { apiMock } = vi.hoisted(() => ({ apiMock: { get: vi.fn(), post: vi.fn() } }))
vi.mock('~/services/api', () => ({ default: apiMock }))

import McpGatewayPanel from '../McpGatewayPanel.vue'
import { useToolManagementStore } from '~/stores/toolManagementStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

const flushPromises = async () => {
  await nextTick()
  await Promise.resolve()
}

describe('McpGatewayPanel', () => {
  beforeEach(() => {
    apiMock.get.mockReset().mockResolvedValue({ data: { token: 'mcpg_secretvalue1234567890', source: 'node' } })
    apiMock.post.mockReset().mockResolvedValue({ data: { token: 'mcpg_regenerated0987654321', source: 'node' } })
  })

  it('NAS-25 shows the node\'s gateway token masked, with Show, Copy and Regenerate (autobyteus-437 M-5)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
    setActivePinia(pinia)
    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.initialized = true
    windowNodeContextStore.nodeBaseUrl = 'http://127.0.0.1:8000/'
    const wrapper = mount(McpGatewayPanel, { global: { plugins: [pinia] } })
    await flushPromises()
    await flushPromises()

    expect(apiMock.get).toHaveBeenCalledWith('/mcp-gateway/token')
    const value = wrapper.get('[data-testid="mcp-gateway-token-value"]')
    expect(value.text()).toMatch(/^mcpg_•+$/)
    await wrapper.get('[data-testid="mcp-gateway-token-show"]').trigger('click')
    expect(value.text()).toBe('mcpg_secretvalue1234567890')
    await wrapper.get('[data-testid="mcp-gateway-token-copy"]').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('mcpg_secretvalue1234567890')
    await wrapper.get('[data-testid="mcp-gateway-token-regenerate"]').trigger('click')
    await flushPromises()
    expect(apiMock.post).toHaveBeenCalledWith('/mcp-gateway/token/regenerate')
    expect(wrapper.get('[data-testid="mcp-gateway-token-value"]').text()).toBe('mcpg_regenerated0987654321')
  })

  it('a token from the node\'s environment has no Regenerate and says where to change it', async () => {
    apiMock.get.mockResolvedValue({ data: { token: 'from-env-token', source: 'environment' } })
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
    setActivePinia(pinia)
    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.initialized = true
    windowNodeContextStore.nodeBaseUrl = 'http://127.0.0.1:8000/'
    const wrapper = mount(McpGatewayPanel, { global: { plugins: [pinia] } })
    await flushPromises()
    await flushPromises()
    expect(wrapper.find('[data-testid="mcp-gateway-token-regenerate"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="mcp-gateway-token"]').text()).toContain('AUTOBYTEUS_MCP_GATEWAY_TOKEN')
  })

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
    expect(wrapper.text()).toContain('Bearer <the gateway token>')
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
