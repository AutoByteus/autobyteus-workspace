import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ToolCard from '../ToolCard.vue'

describe('ToolCard', () => {
  it.each(['LOCAL', 'MCP'])('shows a %s tool name without an icon or its tinted box (autobyteus-320, AC-002)', (category) => {
    const wrapper = mount(ToolCard, {
      props: { tool: { name: 'read_file', description: 'Reads a file.', category } as never, source: 'local' },
    })

    expect(wrapper.get('h3').text()).toBe('read_file')
    expect(wrapper.text()).toContain('Reads a file.')
    expect(wrapper.findAll('svg, [class*="iconify"]')).toHaveLength(0)
    expect(wrapper.html()).not.toMatch(/bg-(indigo|purple)-100/)
  })

  it('emits details with the tool when clicked', async () => {
    const tool = { name: 'read_file', description: '', category: 'LOCAL' } as never
    const wrapper = mount(ToolCard, { props: { tool, source: 'local' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('details')?.[0]).toEqual([tool])
  })
})
