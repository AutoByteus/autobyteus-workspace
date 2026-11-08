import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import type { NodeRow as Row, RowView } from '~/stores/nodeRowStatus'

const h = vi.hoisted(() => ({ list: null as any, dialog: null as any }))
vi.mock('~/stores/nodeListStore', () => ({ useNodeListStore: () => h.list }))
vi.mock('~/stores/nodeChangeDialogStore', () => ({ useNodeChangeDialogStore: () => h.dialog }))

import NodeRow from '../NodeRow.vue'

/**
 * one-nodes-tab UIS-002 (VIS-013, VIS-015, VIS-019, VIS-024, VIS-027): one row per node, one line, one fixing button.
 * 363 (manage-nodes-professional): the row's cells, the capsule, notices with tone icons instead of text marks, the offer
 * toggle and its panel, the server cell and notice.
 */

const B = 'srv_studioBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const peer = { nodeId: B, name: 'studio', baseUrl: 'http://192.168.2.31:29695', addedAt: 'x', paired: true }
const row = (overrides: Partial<Row> = {}): Row => ({
  key: B, nodeId: B, entryIds: ['remote-1'], windowAddress: 'http://192.168.2.31:29695', peer, name: 'studio', isEmbedded: false, ...overrides,
})
const settled = (overrides: Partial<RowView> = {}): RowView => ({
  checking: false, reachable: true, different: false, out: { state: 'working' }, in: { state: 'working' }, line: null, offers: [], ...overrides,
})
const mountRow = (current: Row, view: RowView) => {
  h.list.views[current.key] = view
  // The server version line has its own tests (NodeServerUpdate.spec.ts).
  return mount(NodeRow, { props: { row: current }, global: { stubs: { NodeServerUpdate: true } } })
}
const get = (wrapper: ReturnType<typeof mountRow>, id: string) => wrapper.get(`[data-testid="${id}-${B}"]`)
/** The line's text as it reads (HTML collapses whitespace). */
const line = (wrapper: ReturnType<typeof mountRow>) => get(wrapper, 'node-line').text().replace(/\s+/g, ' ')
const summary = (wrapper: ReturnType<typeof mountRow>) => wrapper.get(`[data-testid="node-offer-${B}-summary"]`).text()
/** The tone icon of the row's notice: the warn triangle, or the circle of the other tones. */
const noticeIcon = (wrapper: ReturnType<typeof mountRow>) => get(wrapper, 'node-line').find('svg[aria-hidden="true"]')

describe('NodeRow', () => {
  beforeEach(() => {
    h.list = reactive({
      views: {} as Record<string, RowView>, facts: {}, expanded: {}, flashKey: null, switchOn: true, thisName: 'Embedded Node', thisNodeId: 'srv_a',
      canOpen: vi.fn(() => true), openNode: vi.fn(), askAgain: vi.fn(), renameNode: vi.fn(), changeAddress: vi.fn(), unfinishedStepOf: vi.fn(() => null),
    })
    h.dialog = reactive({ preparing: null, request: vi.fn() })
  })

  it('working: green dot, green icon, switch on, Open and Remove icons, the address without scheme, the offer summary', () => {
    const wrapper = mountRow(row(), settled({ offers: [{ name: 'Writer', kind: 'agent' }] }))
    expect(get(wrapper, 'node-dot').attributes('aria-label')).toBe('Reachable now')
    expect(get(wrapper, 'node-url').text()).toBe('192.168.2.31:29695')
    expect(get(wrapper, 'node-agents-switch').attributes('aria-checked')).toBe('true')
    expect(get(wrapper, 'node-agents-switch').attributes('aria-label')).toBe('Let agents work with studio')
    expect(get(wrapper, 'node-open').attributes('aria-label')).toBe('Open studio in its own window')
    expect(get(wrapper, 'node-remove').attributes('aria-label')).toBe('Remove studio')
    expect(wrapper.find(`[data-testid="node-line-${B}"]`).exists()).toBe(false)
    expect(summary(wrapper)).toBe('1 Agent')
  })

  it('shows the server version line for a remote node only', () => {
    expect(mountRow(row(), settled()).findComponent({ name: 'NodeServerUpdate' }).exists()).toBe(true)
    expect(mountRow(row({ isEmbedded: true }), settled()).findComponent({ name: 'NodeServerUpdate' }).exists()).toBe(false)
  })

  it('checking: spinner dot, "Checking … up to 20 seconds.", switch disabled', () => {
    const wrapper = mountRow(row(), settled({ checking: true }))
    expect(get(wrapper, 'node-line').text()).toBe('Checking studio… up to 20 seconds.')
    expect(get(wrapper, 'node-agents-switch').attributes('disabled')).toBeDefined()
  })

  it('off there: amber line; Turn on there opens the finish confirmation; connection details instead of the counts', async () => {
    const wrapper = mountRow(row(), settled({ out: { state: 'offThere' }, offers: null, line: { kind: 'offThere', tone: 'warn', fix: 'turnOnThere' } }))
    expect(line(wrapper)).toBe('Remote collaboration is off on studio.Turn on there')
    expect(noticeIcon(wrapper).find('path').attributes('d')).toBe('M10 3.4 17.6 16.6H2.4L10 3.4Z')
    expect(get(wrapper, 'node-line').classes()).toContain('bg-amber-50')
    expect(summary(wrapper)).toBe('Connection details')
    await get(wrapper, 'node-fix').trigger('click')
    expect(h.dialog.request).toHaveBeenCalledWith('finish', B)
  })

  it('a different node: red dot and line; Change address opens the details with the address editor', async () => {
    const wrapper = mountRow(row(), settled({ different: true, out: { state: 'different' }, offers: null, line: { kind: 'different', tone: 'error', fix: 'changeAddress' } }))
    expect(get(wrapper, 'node-dot').find('span').classes()).toContain('bg-red-500')
    expect(get(wrapper, 'node-line').text()).toContain('A different node answers at this address.')
    await get(wrapper, 'node-fix').trigger('click')
    await flushPromises()
    expect(h.list.expanded[B]).toBe(true)
    expect((get(wrapper, 'node-address-input').element as HTMLInputElement).value).toBe('http://192.168.2.31:29695')
  })

  it('VIS-013: not reachable and not collaborating: hollow dot, the cause, Check again; the switch is off and disabled with its tooltip', async () => {
    const wrapper = mountRow(row({ peer: null }), settled({ reachable: false, out: { state: 'notRegisteredHere' }, line: { kind: 'unreachable', tone: 'info', fix: 'checkAgain', cause: 'refused', host: 'localhost:8005' } }))
    expect(get(wrapper, 'node-dot').attributes('aria-label')).toBe('Not reachable now')
    expect(line(wrapper)).toBe('Not reachable. Nothing answers at that address and port.Check again')
    expect(get(wrapper, 'node-line').classes()).toEqual(expect.arrayContaining(['border-slate-200', 'bg-slate-50']))
    expect(noticeIcon(wrapper).find('circle').exists()).toBe(true)
    const toggle = get(wrapper, 'node-agents-switch')
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(toggle.attributes('disabled')).toBeDefined()
    expect(toggle.element.parentElement!.getAttribute('title')).toBe('studio is not reachable, so agents cannot start working with it yet.')
    await get(wrapper, 'node-fix').trigger('click')
    expect(h.list.askAgain).toHaveBeenCalledWith(B)
  })

  it('VIS-015: a step not finished: amber line with its cause and Try again', async () => {
    const wrapper = mountRow(row(), settled({ out: { state: 'offThere' }, offers: null,
      line: { kind: 'partial', tone: 'warn', fix: 'tryAgain', error: { code: 'PEER_UNREACHABLE', message: 'x', reason: 'refused' } } }))
    expect(line(wrapper)).toContain('Turned on here, but not finished on studio. Nothing answers at that address and port.')
    await get(wrapper, 'node-fix').trigger('click')
    expect(h.dialog.request).toHaveBeenCalledWith('finish', B)
  })

  it('VIS-015 / § Naming Rule 4: a name taken there between plan and run names the name on the row\'s line', () => {
    const wrapper = mountRow(row({ name: 'mu' }), settled({ out: { state: 'working' }, in: { state: 'notRegisteredThere' }, offers: null,
      line: { kind: 'partial', tone: 'warn', fix: 'tryAgain', error: { code: 'PEER_NAME_TAKEN', message: 'x' }, stepName: 'Embedded Node' } }))
    expect(line(wrapper)).toContain('Turned on here, but not finished on mu. mu already has a node named Embedded Node.')
    expect(line(wrapper)).toContain('Try again')
  })

  it('not collaborating: grey icon, the line with Turn on; the switch and Turn on open the confirmation', async () => {
    const wrapper = mountRow(row({ peer: null }), settled({ out: { state: 'notRegisteredHere' }, line: { kind: 'agentsOff', tone: 'info', fix: 'turnOn' } }))
    expect(get(wrapper, 'node-collab-icon').classes()).toContain('text-slate-400')
    expect(get(wrapper, 'node-line').text()).toContain("Agents here can't work with studio yet.")
    await get(wrapper, 'node-fix').trigger('click')
    await get(wrapper, 'node-agents-switch').trigger('click')
    expect(h.dialog.request.mock.calls).toEqual([['connect', B], ['connect', B]])
  })

  it('switching a working row off opens "stop"; the trash icon opens remove', async () => {
    const wrapper = mountRow(row(), settled())
    await get(wrapper, 'node-agents-switch').trigger('click')
    await get(wrapper, 'node-remove').trigger('click')
    expect(h.dialog.request.mock.calls).toEqual([['disconnect', B], ['remove', B]])
  })

  it('VIS-005: this node off: a collaborating row\'s capsule is dimmed', () => {
    h.list.switchOn = false
    const wrapper = mountRow(row(), settled({ out: { state: 'offHere' }, in: { state: 'offHere' }, offers: null }))
    expect(get(wrapper, 'node-agents-switch').element.parentElement!.classList).toContain('opacity-60')
  })

  it('363 capsule: green when collaborating, grey when not; the icon keeps its role and the hint as its label', () => {
    const on = mountRow(row(), settled())
    const capsule = get(on, 'node-agents-switch').element.parentElement!
    expect([...capsule.classList]).toEqual(expect.arrayContaining(['rounded-full', 'border-emerald-200', 'bg-emerald-50', 'h-9']))
    expect(get(on, 'node-collab-icon').attributes()).toMatchObject({ role: 'img', 'aria-label': 'Remote collaboration: let agents on this node and on that node work together' })
    const off = mountRow(row({ peer: null }), settled({ out: { state: 'notRegisteredHere' }, line: { kind: 'agentsOff', tone: 'info', fix: 'turnOn' } }))
    expect([...get(off, 'node-agents-switch').element.parentElement!.classList]).toEqual(expect.arrayContaining(['border-slate-200', 'bg-white']))
  })

  it('363 TR-902: the offer toggle opens one framed panel with the list and the connection details; the names are its tooltip', async () => {
    const wrapper = mountRow(row(), settled({ offers: [{ name: 'Writer', kind: 'agent' }, { name: 'Editor', kind: 'agent' }] }))
    const toggle = wrapper.get(`[data-testid="node-offer-${B}-toggle"]`)
    expect(summary(wrapper)).toBe('2 Agents')
    expect(toggle.attributes()).toMatchObject({ title: 'Editor, Writer', 'aria-expanded': 'false' })
    expect(wrapper.find(`[data-testid="node-details-${B}"]`).exists()).toBe(false)
    await toggle.trigger('click')
    expect(h.list.expanded[B]).toBe(true)
    const panel = get(wrapper, 'node-details')
    expect(panel.find('.rounded-xl.border-slate-200').exists()).toBe(true)
    expect(panel.find(`[data-testid="node-offer-${B}-list"]`).exists()).toBe(true)
    expect(panel.find(`[data-testid="node-directions-${B}"]`).exists()).toBe(true)
  })

  it('363: a remote row renders the server cell and the server notice; only the embedded node has neither', () => {
    const parts = mountRow(row(), settled()).findAllComponents({ name: 'NodeServerUpdate' }).map((part) => part.props('part'))
    expect(parts).toEqual(['cell', 'notice'])
  })

  it('VIS-010: rename by clicking the name; a name used by another node keeps the field with its message; Esc cancels', async () => {
    h.list.renameNode.mockResolvedValueOnce({ ok: false, error: 'taken' })
    const wrapper = mountRow(row(), settled())
    await get(wrapper, 'node-name').trigger('click')
    const input = get(wrapper, 'node-rename-input')
    await input.setValue('docker')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(h.list.renameNode).toHaveBeenCalledWith(B, 'docker')
    expect(get(wrapper, 'node-rename-error').text()).toBe('Another node is already named docker.')
    await get(wrapper, 'node-rename-input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find(`[data-testid="node-rename-input-${B}"]`).exists()).toBe(false)
  })

  it('the embedded node: name not editable, no Remove (its slot is kept); in a browser, no Open and no Open slot (DC-912)', () => {
    h.list.canOpen.mockReturnValue(false)
    h.list.hasOpen = false
    const wrapper = mountRow(row({ isEmbedded: true, name: 'Embedded Node' }), settled())
    expect(get(wrapper, 'node-name').element.tagName).toBe('P')
    expect(wrapper.find(`[data-testid="node-remove-${B}"]`).exists()).toBe(false)
    expect(wrapper.find(`[data-testid="node-open-${B}"]`).exists()).toBe(false)
    expect(wrapper.findAll('.nr-actions span.h-8.w-8')).toHaveLength(1)
  })

  it('a desktop window that cannot open this node keeps the Open slot so the icons line up', () => {
    h.list.canOpen.mockReturnValue(false)
    h.list.hasOpen = true
    const wrapper = mountRow(row(), settled())
    expect(wrapper.find(`[data-testid="node-open-${B}"]`).exists()).toBe(false)
    expect(wrapper.findAll('.nr-actions span.h-8.w-8')).toHaveLength(1)
    expect(wrapper.find(`[data-testid="node-remove-${B}"]`).exists()).toBe(true)
  })
})
