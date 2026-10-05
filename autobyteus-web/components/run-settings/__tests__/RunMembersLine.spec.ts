import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import RunMembersLine from '../RunMembersLine.vue'
import type { RunMemberNode } from '~/utils/runSettings/runMemberTree'

const values = { workspace: null, runtimeKind: 'autobyteus', llmModelIdentifier: 'm', llmConfig: null, autoExecuteTools: true }
const node = (key: string, customized = false): RunMemberNode => ({
  key, kind: 'agent', name: key.slice(1), isCoordinator: false, values, parentValues: values,
  fields: ['model', 'thinking', 'approval'], customized: { approval: customized }, customizedOptionKeys: [],
  modelRequired: false, children: [],
})

let wrapper: VueWrapper | null = null
const mountLine = (nodes: RunMemberNode[]) => {
  wrapper = mount(RunMembersLine, {
    props: { subjectKind: 'team', subjectName: 'Writers', nodes },
    attachTo: document.body,
    global: {
      stubs: { RunMembersSection: { template: '<div data-test="members-section" />' }, Icon: true },
      mocks: { $t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key) },
    },
  })
  return wrapper
}
const drawer = () => document.body.querySelector<HTMLElement>('[data-test="run-member-settings-drawer"]')

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal('innerWidth', 1440)
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('RunMembersLine + Member settings drawer (REQ-002, QR-001)', () => {
  it('reads "All N members use these settings" until someone is customized, then "n of N customized · Edit · Reset"', async () => {
    const line = mountLine([node('/lead'), node('/writer')])
    expect(line.text()).toContain('runSettings.chat.allMembers {"count":2}')
    expect(line.get('[data-test="run-members-open"]').text()).toBe('runSettings.chat.customize')

    await line.setProps({ nodes: [node('/lead'), node('/writer', true)] })
    expect(line.text()).toContain('runSettings.chat.customizedMembers {"count":1,"total":2}')
    expect(line.get('[data-test="run-members-open"]').text()).toBe('runSettings.chat.edit')
    await line.get('[data-test="run-members-reset"]').trigger('click')
    expect(line.emitted('reset-all')).toHaveLength(1)
  })

  it('opens a dialog with focus on Close; Escape closes it and returns focus to the line', async () => {
    const line = mountLine([node('/lead')])
    const trigger = line.get('[data-test="run-members-open"]')
    await trigger.trigger('click')
    await flushPromises()

    const dialog = drawer()!
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(document.activeElement).toBe(dialog.querySelector('[data-test="run-member-settings-close"]'))
    expect(line.emitted('layout')!.at(-1)![0]).toMatchObject({ open: true })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(line.emitted('layout')!.at(-1)![0]).toMatchObject({ open: false })
    expect(document.activeElement).toBe(trigger.element)
  })

  it('resizes within 400–960 px from the keyboard and remembers the width', async () => {
    const line = mountLine([node('/lead')])
    await line.get('[data-test="run-members-open"]').trigger('click')
    await flushPromises()
    const separator = drawer()!.querySelector<HTMLElement>('[role="separator"]')!
    expect(separator.getAttribute('aria-valuemin')).toBe('400')
    expect(separator.getAttribute('aria-valuemax')).toBe('960')
    expect(separator.getAttribute('aria-valuenow')).toBe('480')

    separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await flushPromises()
    expect(separator.getAttribute('aria-valuenow')).toBe('504')
    expect(window.localStorage.getItem('autobyteus.chat.memberPanelWidth')).toBe('504')
    for (let index = 0; index < 10; index += 1) separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await flushPromises()
    expect(separator.getAttribute('aria-valuenow')).toBe('400')
  })

  it('keeps the page at least 360 px wide beside the drawer', async () => {
    vi.stubGlobal('innerWidth', 900)
    window.localStorage.setItem('autobyteus.chat.memberPanelWidth', '960')
    const line = mountLine([node('/lead')])
    await line.get('[data-test="run-members-open"]').trigger('click')
    await flushPromises()
    expect(drawer()!.style.width).toBe('540px')
  })
})
