import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import FileExplorerLayout from '../FileExplorerLayout.vue'

for (const layout of ['split', 'stacked'] as const) {
  describe(`FileExplorerLayout ${layout} target availability`, () => {
    it('gates both children at null, restores explicit B, and preserves omitted defaults', async () => {
      const wrapper = shallowMount(FileExplorerLayout, { props: { layout, workspaceId: 'C' } })
      const children = () => [wrapper.findComponent({ name: 'FileExplorer' }), wrapper.findComponent({ name: 'FileExplorerTabs' })]
      expect(children().every(child => child.props('workspaceId') === 'C')).toBe(true)
      await wrapper.setProps({ workspaceId: null })
      expect(children().every(child => !child.exists())).toBe(true)
      expect(wrapper.find('[data-test="workspace-unavailable"]').exists()).toBe(true)
      await wrapper.setProps({ active: false }); await wrapper.setProps({ active: true })
      expect(children().every(child => !child.exists())).toBe(true)
      await wrapper.setProps({ workspaceId: 'B' })
      expect(children().every(child => child.props('workspaceId') === 'B')).toBe(true)
      await wrapper.setProps({ workspaceId: undefined })
      expect(children().every(child => child.exists() && child.props('workspaceId') === undefined)).toBe(true)
      wrapper.unmount()
      const omitted = shallowMount(FileExplorerLayout, { props: { layout } })
      expect(omitted.findComponent({ name: 'FileExplorer' }).exists()).toBe(true)
      expect(omitted.findComponent({ name: 'FileExplorerTabs' }).exists()).toBe(true)
      omitted.unmount()
    })
  })
}


it('releases an in-progress layout resize when its target becomes unavailable or the layout unmounts', async () => {
  const remove = vi.spyOn(document, 'removeEventListener')
  const wrapper = shallowMount(FileExplorerLayout, { props: { workspaceId: 'C' } })
  await wrapper.get('.cursor-col-resize').trigger('mousedown', { clientX: 100 })
  expect(document.body.style.cursor).toBe('col-resize')
  await wrapper.setProps({ workspaceId: null })
  expect(document.body.style.cursor).toBe('')
  expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function))
  expect(remove).toHaveBeenCalledWith('mouseup', expect.any(Function))
  await wrapper.setProps({ workspaceId: 'B' })
  await wrapper.get('.cursor-col-resize').trigger('mousedown', { clientX: 100 })
  wrapper.unmount()
  expect(document.body.style.cursor).toBe('')
  expect(document.body.style.userSelect).toBe('')
  remove.mockRestore()
})
