import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({ list: { addNode: vi.fn() }, dialog: { request: vi.fn() } }))
vi.mock('~/stores/nodeListStore', () => ({ useNodeListStore: () => h.list }))
vi.mock('~/stores/nodeChangeDialogStore', () => ({ useNodeChangeDialogStore: () => h.dialog }))

import AddNodePanel from '../AddNodePanel.vue'

/** one-nodes-tab UIS-003 (VIS-002, VIS-011, VIS-012; TR-702, TR-703): the always-open add form. */

const fill = async (wrapper: ReturnType<typeof mount>, address: string, name: string) => {
  await wrapper.get('[data-testid="add-node-address"]').setValue(address)
  await wrapper.get('[data-testid="add-node-name"]').setValue(name)
  await wrapper.get('[data-testid="add-node-panel"]').trigger('submit')
  await flushPromises()
}

describe('AddNodePanel', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('adds with the switch on by default, clears the form, and opens the confirmation when the list says so', async () => {
    h.list.addNode.mockResolvedValueOnce({ ok: true, key: 'srv_8003', confirm: true })
    const wrapper = mount(AddNodePanel)
    expect(wrapper.get('[data-testid="add-node-collaborate"]').attributes('aria-checked')).toBe('true')
    await fill(wrapper, 'http://localhost:8003', '8003')
    expect(h.list.addNode).toHaveBeenCalledWith({ address: 'http://localhost:8003', name: '8003', collaborate: true })
    expect(h.dialog.request).toHaveBeenCalledWith('connect', 'srv_8003')
    expect((wrapper.get('[data-testid="add-node-address"]').element as HTMLInputElement).value).toBe('')
  })

  it('no confirmation for a node that did not answer or with the switch off; success shows no notice', async () => {
    h.list.addNode.mockResolvedValueOnce({ ok: true, key: 'd:remote-1', confirm: false })
    const wrapper = mount(AddNodePanel)
    await wrapper.get('[data-testid="add-node-collaborate"]').trigger('click')
    await fill(wrapper, 'http://localhost:8005', '8005')
    expect(h.list.addNode).toHaveBeenCalledWith(expect.objectContaining({ collaborate: false }))
    expect(h.dialog.request).not.toHaveBeenCalled()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('VIS-012 / VIS-011: field messages, and "This is X, already in your list."', async () => {
    h.list.addNode.mockResolvedValueOnce({ ok: false, error: 'invalid', address: true, name: true })
    const wrapper = mount(AddNodePanel)
    await fill(wrapper, 'a b', '/bad')
    expect(wrapper.get('[data-testid="add-node-address-error"]').text()).toBe('Enter an address like http://host:port.')
    expect(wrapper.get('[data-testid="add-node-name-error"]').text()).toBe('Use 1–64 letters, digits, spaces, _ . or - (start with a letter or digit).')
    h.list.addNode.mockResolvedValueOnce({ ok: false, error: 'duplicate', existing: 'docker' })
    await fill(wrapper, 'localhost:8001', 'again')
    expect(wrapper.get('[data-testid="add-node-duplicate"]').text()).toBe('ⓘ This is docker, already in your list.')
    expect(h.dialog.request).not.toHaveBeenCalled()
  })
})
