import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SkillNameConflictDialog from './SkillNameConflictDialog.vue'
import { useSkillNamesStore } from '~/stores/skillNamesStore'

const conflicts = [
  { name: 'desk-alpha', existingPath: '/Users/me/.autobyteus/skills/desk-alpha', incomingPath: '/Users/me/pkg/agents/desk-helper/skills/desk-alpha' },
  { name: 'desk-beta', existingPath: '/Users/me/skills/desk-beta', incomingPath: '/Users/me/pkg/agents/desk-helper/skills/desk-beta' },
]

const mountDialog = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useSkillNamesStore()
  const wrapper = mount(SkillNameConflictDialog, {
    attachTo: document.body,
    global: { plugins: [pinia], stubs: { Icon: true } },
  })
  store.showConflicts(conflicts)
  await flushPromises()
  return { wrapper, store }
}

describe('SkillNameConflictDialog (D-19, REQ-023)', () => {
  let unmount: (() => void) | null = null
  afterEach(() => { unmount?.(); unmount = null })

  it('lists every duplicate with its existing and incoming path, full paths in tooltips', async () => {
    const { wrapper } = await mountDialog()
    unmount = () => wrapper.unmount()

    expect(wrapper.find('[data-testid="skill-name-conflict-dialog"]').exists()).toBe(true)
    const row = wrapper.get('[data-testid="skill-name-conflict-desk-alpha"]')
    expect(row.text()).toContain('desk-alpha')
    expect(row.find(`[title="${conflicts[0].existingPath}"]`).exists()).toBe(true)
    expect(row.find(`[title="${conflicts[0].incomingPath}"]`).exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="skill-name-conflict-desk-"]')).toHaveLength(2)
  })

  it('closes with OK, Esc and a backdrop click, but not a click inside the dialog', async () => {
    const { wrapper, store } = await mountDialog()
    unmount = () => wrapper.unmount()

    await wrapper.get('[role="dialog"] h3').trigger('click')
    expect(store.conflicts).toHaveLength(2)
    await wrapper.get('[data-testid="skill-name-conflict-ok"]').trigger('click')
    expect(store.conflicts).toHaveLength(0)

    store.showConflicts(conflicts)
    await flushPromises()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(store.conflicts).toHaveLength(0)

    store.showConflicts(conflicts)
    await flushPromises()
    await wrapper.get('[data-testid="skill-name-conflict-dialog"]').trigger('click')
    expect(store.conflicts).toHaveLength(0)
    await flushPromises()
    expect(wrapper.find('[data-testid="skill-name-conflict-dialog"]').exists()).toBe(false)
  })

  it('focuses OK when it opens', async () => {
    const { wrapper } = await mountDialog()
    unmount = () => wrapper.unmount()
    expect(document.activeElement?.getAttribute('data-testid')).toBe('skill-name-conflict-ok')
  })
})
