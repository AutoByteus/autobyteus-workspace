import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RemoteCollaborationOfferToggle from '../RemoteCollaborationOfferToggle.vue'

/**
 * 363 (manage-nodes-professional) UIS-005, TR-902: the offer summary as the button that opens the node's panel. The names
 * that used to trail it are its tooltip; the counts and labels are the 267 copy.
 */

const agent = (name: string) => ({ name, kind: 'agent' as const })
const team = (name: string) => ({ name, kind: 'agent_team' as const })
const mountToggle = (props: Partial<{ entries: ReturnType<typeof agent | typeof team>[]; label: string; open: boolean }> = {}) =>
  mount(RemoteCollaborationOfferToggle, { props: { entries: [], testId: 'offer', open: false, ...props } })

describe('RemoteCollaborationOfferToggle', () => {
  it('summarizes the counts by kind, singular and plural, with the names sorted as its tooltip', () => {
    const wrapper = mountToggle({ entries: [agent('Code Reviewer'), agent('Build Runner'), team('Studio Team')] })
    expect(wrapper.get('[data-testid="offer-summary"]').text()).toBe('2 Agents · 1 Agent Team')
    expect(wrapper.get('[data-testid="offer-toggle"]').attributes('title')).toBe('Build Runner, Code Reviewer, Studio Team')
    expect(mountToggle({ entries: [agent('Solo')] }).get('[data-testid="offer-summary"]').text()).toBe('1 Agent')
    expect(mountToggle({ entries: [team('A'), team('B')] }).get('[data-testid="offer-summary"]').text()).toBe('2 Agent Teams')
  })

  it('a label replaces the counts ("Connection details", or an empty offer), with no empty tooltip', () => {
    const wrapper = mountToggle({ label: 'docker shares no Agents or Agent Teams.' })
    expect(wrapper.get('[data-testid="offer-summary"]').text()).toBe('docker shares no Agents or Agent Teams.')
    expect(wrapper.get('[data-testid="offer-toggle"]').attributes('title')).toBeUndefined()
  })

  it('reports the next open state and shows the current one (aria-expanded, the chevron)', async () => {
    const closed = mountToggle({ entries: [agent('Writer')] })
    const toggle = closed.get('[data-testid="offer-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.get('svg').classes()).not.toContain('rotate-90')
    await toggle.trigger('click')
    expect(closed.emitted('update:open')).toEqual([[true]])
    const open = mountToggle({ entries: [agent('Writer')], open: true })
    expect(open.get('[data-testid="offer-toggle"]').attributes('aria-expanded')).toBe('true')
    expect(open.get('[data-testid="offer-toggle"] svg').classes()).toContain('rotate-90')
    await open.get('[data-testid="offer-toggle"]').trigger('click')
    expect(open.emitted('update:open')).toEqual([[false]])
  })
})
