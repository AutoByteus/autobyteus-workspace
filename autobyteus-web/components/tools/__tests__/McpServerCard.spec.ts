import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import McpServerCard from '../McpServerCard.vue'
import type { McpServer } from '~/stores/toolManagementStore'

const mountCard = (server: McpServer) => mount(McpServerCard, {
  props: { server },
  global: { mocks: { $t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key) } },
})

describe('McpServerCard', () => {
  it('shows "needs secret" with the fields whose stored value is missing or unreadable', () => {
    const wrapper = mountCard({
      __typename: 'StreamableHttpMcpServerConfig', serverId: 'remote', transportType: 'STREAMABLE_HTTP', enabled: true, toolNamePrefix: '',
      url: 'http://127.0.0.1:9000/mcp', tokenState: 'VAULT_UNAVAILABLE',
      headers: [{ name: 'X-Api-Key', value: null, state: 'MISSING' }, { name: 'X-Toolsets', value: 'repos', state: 'PLAIN' }],
    })

    expect(wrapper.get('[data-testid="mcp-card-needs-secret"]').text())
      .toBe('tools.components.tools.McpServerCard.needs_secret {"fields":"header:X-Api-Key, token"}')
  })

  it('shows nothing extra when every secret is stored', () => {
    const wrapper = mountCard({
      __typename: 'StdioMcpServerConfig', serverId: 'local', transportType: 'STDIO', enabled: true, toolNamePrefix: '',
      command: 'node', env: [{ name: 'API_KEY', value: null, state: 'CONFIGURED' }],
    })

    expect(wrapper.find('[data-testid="mcp-card-needs-secret"]').exists()).toBe(false)
  })
})
