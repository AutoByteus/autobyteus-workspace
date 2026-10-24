import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import type { NodeChangePlan } from '~/services/nodeCollaboration/nodeChangePlan'

const h = vi.hoisted(() => ({ dialog: null as any }))
vi.mock('~/stores/nodeChangeDialogStore', () => ({ useNodeChangeDialogStore: () => h.dialog }))

import NodeChangeDialog from '../NodeChangeDialog.vue'

/** one-nodes-tab UIS-004 (VIS-003, VIS-004, VIS-008, VIS-009, VIS-014, VIS-018, VIS-021): the one confirmation. */

const target = { rowKey: 'srv_8003', name: '8003', nodeId: 'srv_8003', entryIds: ['remote-8003'], windowAddress: 'http://localhost:8003' }
const here = { name: 'Embedded Node', nodeId: 'srv_a', windowAddress: 'http://127.0.0.1:29695' }
const plan = (overrides: Partial<NodeChangePlan>): NodeChangePlan => ({
  kind: 'connect', target, here, phase: 'confirm', candidates: { here: [], there: [] },
  steps: [
    { id: 'resolveHere', status: 'todo', findsLater: false, address: 'http://localhost:8003' },
    { id: 'registerHere', status: 'todo', name: '8003', wanted: '8003' },
    { id: 'turnOnThere', status: 'todo' },
    { id: 'resolveThere', status: 'todo', findsLater: true },
    { id: 'registerThere', status: 'todo', name: 'Embedded Node', wanted: 'Embedded Node' },
  ],
  ...overrides,
})
const mountWith = (current: NodeChangePlan) => {
  h.dialog.plan = current
  return mount(NodeChangeDialog, { global: { stubs: { Teleport: true } } })
}
const text = (wrapper: ReturnType<typeof mountWith>, testId: string) => wrapper.get(`[data-testid="${testId}"]`).text()

describe('NodeChangeDialog', () => {
  beforeEach(() => {
    h.dialog = reactive({ plan: null, confirm: vi.fn(), cancel: vi.fn(), useAddress: vi.fn() })
  })

  it('VIS-003: every change on both nodes, grouped by node; DEC-709 (b) address line; trusted note; Cancel / Turn on', async () => {
    const wrapper = mountWith(plan({}))
    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(wrapper.get('h3').text()).toBe('Let agents work with 8003?')
    expect(wrapper.text()).toContain('Agents on this node and on 8003 will be able to work with each other. These changes happen:')
    expect(text(wrapper, 'node-change-group-here')).toContain('On this node (Embedded Node)')
    expect(text(wrapper, 'node-change-step-registerHere')).toBe('•Register 8003 as “8003”')
    expect(text(wrapper, 'node-change-group-there')).toContain('Turn on remote collaboration (it is off)')
    expect(text(wrapper, 'node-change-step-registerThere')).toContain('Register this node as “Embedded Node”')
    expect(text(wrapper, 'node-change-address-registerThere')).toBe("8003 finds this node's address once it is on.")
    expect(text(wrapper, 'node-change-trusted')).toBe('Trusted private network only: nodes are not authenticated.')
    expect(text(wrapper, 'node-change-confirm')).toBe('Turn on')
    await wrapper.get('[data-testid="node-change-confirm"]').trigger('click')
    expect(h.dialog.confirm).toHaveBeenCalled()
  })

  it('VIS-021: the address the other node will use, and a name made unique, when its collaboration is already on', () => {
    const wrapper = mountWith(plan({ kind: 'finish', steps: [
      { id: 'resolveThere', status: 'todo', address: 'http://192.168.2.10:29695' },
      { id: 'registerThere', status: 'todo', name: 'Embedded Node 2', wanted: 'Embedded Node' },
    ] }))
    expect(wrapper.get('h3').text()).toBe('Finish connecting 8003?')
    expect(text(wrapper, 'node-change-address-registerThere')).toBe('8003 reaches this node at http://192.168.2.10:29695.')
    expect(text(wrapper, 'node-change-name-taken-registerThere')).toBe('“Embedded Node” is already used there, so it gets a number.')
    expect(text(wrapper, 'node-change-confirm')).toBe('Make these changes')
  })

  it('VIS-004: running shows ✓ for what is done and "Working…"', () => {
    const wrapper = mountWith(plan({ phase: 'running', steps: [
      { id: 'resolveHere', status: 'done', address: 'http://localhost:8003' },
      { id: 'registerHere', status: 'done', name: '8003' },
      { id: 'turnOnThere', status: 'running' },
    ] }))
    expect(text(wrapper, 'node-change-step-registerHere')).toContain('✓')
    expect(text(wrapper, 'node-change-confirm')).toBe('Working…')
    expect(wrapper.get('[data-testid="node-change-confirm"]').attributes('disabled')).toBeDefined()
  })

  it('VIS-014: a partial result: ✓ ✗ ○, the cause, "What was done stays done", Close / Try again', async () => {
    const wrapper = mountWith(plan({ phase: 'failed', steps: [
      { id: 'resolveHere', status: 'done', address: 'http://localhost:8005' },
      { id: 'registerHere', status: 'done', name: '8005' },
      { id: 'turnOnThere', status: 'failed', error: { code: 'PEER_UNREACHABLE', message: 'x', reason: 'refused', address: 'http://localhost:8005' } },
      { id: 'resolveThere', status: 'notRun' },
      { id: 'registerThere', status: 'notRun', name: 'Embedded Node' },
    ] }))
    expect(text(wrapper, 'node-change-step-registerHere')).toContain('✓')
    expect(text(wrapper, 'node-change-step-turnOnThere')).toContain('✗')
    expect(text(wrapper, 'node-change-error-turnOnThere')).toBe('Nothing answers at that address and port.')
    expect(text(wrapper, 'node-change-step-registerThere')).toContain('○')
    expect(text(wrapper, 'node-change-partial')).toBe('Not everything could be done. What was done stays done.')
    await wrapper.get('[data-testid="node-change-retry"]').trigger('click')
    expect(h.dialog.confirm).toHaveBeenCalled()
    await wrapper.get('[data-testid="node-change-close"]').trigger('click')
    expect(h.dialog.cancel).toHaveBeenCalled()
  })

  it('VIS-018: the Docker hint under the register line; Use this looks again with that address; Docker Guide', async () => {
    const wrapper = mountWith(plan({ phase: 'failed', steps: [
      { id: 'turnOnThere', status: 'done' },
      { id: 'resolveThere', status: 'failed', error: { code: 'PEER_UNREACHABLE', message: 'x', address: 'http://127.0.0.1:29695', loopbackInContainer: true } },
      { id: 'registerThere', status: 'notRun', name: 'Embedded Node' },
    ] }))
    expect(text(wrapper, 'node-change-step-registerThere')).toContain('✗')
    const hint = text(wrapper, 'node-change-hint-registerThere')
    expect(hint).toContain("8003 can't reach http://127.0.0.1:29695.")
    expect(hint).toContain('8003 runs in Docker, where 127.0.0.1 is the container itself.')
    expect(hint).toContain('Try http://host.docker.internal:29695')
    await wrapper.get('[data-testid="node-change-hint-registerThere-use"]').trigger('click')
    expect(h.dialog.useAddress).toHaveBeenCalledWith('resolveThere', 'http://host.docker.internal:29695')
    await wrapper.get('[data-testid="node-change-hint-registerThere-guide"]').trigger('click')
    expect(wrapper.emitted('guide')).toHaveLength(1)
  })

  it('VIS-008: turning off is one plain list with the note that the other node stays on; Turn off', () => {
    const wrapper = mountWith(plan({ kind: 'disconnect', steps: [{ id: 'removeHere', status: 'todo' }, { id: 'removeThere', status: 'todo' }] }))
    expect(wrapper.get('h3').text()).toBe('Stop agents working with 8003?')
    expect(wrapper.findAll('[data-testid="node-change-group-all"] li').map((line) => line.text())).toEqual(['•Remove 8003 from this node', '•Remove this node from 8003'])
    expect(wrapper.text()).toContain('8003 stays in your list, and its own remote collaboration stays on.')
    expect(wrapper.find('[data-testid="node-change-trusted"]').exists()).toBe(false)
    expect(text(wrapper, 'node-change-confirm')).toBe('Turn off')
  })

  it('VIS-009 / UXJ-706: Remove lists what is removed; when the other node cannot be reached it says this node stays registered there', () => {
    const confirm = mountWith(plan({ kind: 'remove', steps: [{ id: 'removeHere', status: 'todo' }, { id: 'removeThere', status: 'todo' }, { id: 'removeFromList', status: 'todo' }] }))
    expect(confirm.get('h3').text()).toBe('Remove 8003?')
    expect(confirm.get('h3').classes()).toContain('text-red-700')
    expect(text(confirm, 'node-change-group-all')).toContain('Remove 8003 from your list')
    expect(confirm.text()).toContain('The node and its data are not touched.')
    const failed = mountWith(plan({ kind: 'remove', phase: 'failed', steps: [
      { id: 'removeHere', status: 'done' },
      { id: 'removeThere', status: 'failed', error: { code: 'PEER_UNREACHABLE', message: 'x', reason: 'refused' } },
      { id: 'removeFromList', status: 'done' },
    ] }))
    expect(text(failed, 'node-change-partial')).toBe('Removed here. 8003 could not be reached, so this node is still registered there.')
    expect(failed.find('[data-testid="node-change-retry"]').exists()).toBe(false)
  })
})
