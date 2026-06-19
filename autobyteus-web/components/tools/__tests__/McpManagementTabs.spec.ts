import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import McpManagementTabs from '../McpManagementTabs.vue'

describe('McpManagementTabs', () => {
  it('renders accessible MCP Servers and MCP Gateway tabs and emits tab changes', async () => {
    const wrapper = mount(McpManagementTabs, {
      props: { modelValue: 'servers' },
    })

    const tablist = wrapper.get('[role="tablist"]')
    expect(tablist.attributes('aria-label')).toBe('MCP management sections')

    const serverTab = wrapper.get('[data-testid="mcp-management-tab-servers"]')
    const gatewayTab = wrapper.get('[data-testid="mcp-management-tab-gateway"]')

    expect(serverTab.text()).toBe('MCP Servers')
    expect(serverTab.attributes('aria-selected')).toBe('true')
    expect(serverTab.attributes('aria-controls')).toBe('mcp-management-panel-servers')
    expect(gatewayTab.text()).toBe('MCP Gateway')
    expect(gatewayTab.attributes('aria-selected')).toBe('false')
    expect(gatewayTab.attributes('aria-controls')).toBe('mcp-management-panel-gateway')

    await gatewayTab.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[ 'gateway' ]])
  })
})
