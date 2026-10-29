import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RemoteCollaborationOfferDisclosure from '../RemoteCollaborationOfferDisclosure.vue'

// The real English strings through the localization runtime, so the texts below are the spec's (UI/UX spec § Content).
vi.mock('~/composables/useLocalization', async () => {
  const { localizationRuntime } = await import('~/localization/runtime/localizationRuntime')
  return {
    useLocalization: () => ({
      t: (key: string, params?: Record<string, string | number>) => localizationRuntime.translate(key, params),
      resolvedLocale: { value: 'en' },
    }),
  }
})

const agent = (name: string, description?: string) => ({ name, kind: 'agent' as const, ...(description ? { description } : {}) })
const team = (name: string, description?: string) => ({ name, kind: 'agent_team' as const, ...(description ? { description } : {}) })
const mountOffer = (entries: ReturnType<typeof agent>[]) =>
  mount(RemoteCollaborationOfferDisclosure, { props: { entries, testId: 'offer' } })
const many = (count: number, kind: typeof agent) => Array.from({ length: count }, (_value, index) => kind(`${kind === agent ? 'Agent' : 'Team'} ${String(index + 1).padStart(2, '0')}`))

/** autobyteus-267 REQ-507, AC-504, ST-01, ST-08, ST-09, ST-11: one line by default; open groups; search over 6. */
describe('RemoteCollaborationOfferDisclosure', () => {
  it('ST-01: closed, one line: the counts, then the names in order; Enter or click opens it', async () => {
    const wrapper = mountOffer([agent('Code Reviewer'), agent('Build Runner'), team('Studio Team', 'Writes and checks articles')])
    const toggle = wrapper.get('[data-testid="offer-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('[data-testid="offer-summary"]').text()).toBe('2 Agents · 1 Agent Team')
    expect(wrapper.get('[data-testid="offer-preview"]').text()).toBe('Build Runner, Code Reviewer, Studio Team')
    expect(wrapper.get('[data-testid="offer-preview"]').classes()).toContain('truncate')
    expect(wrapper.find('[data-testid="offer-list"]').exists()).toBe(false)
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-testid="offer-preview"]').exists()).toBe(false)
  })

  it('one-nodes-tab: a label replaces the counts, the slot shows below the list, and the page can open it', async () => {
    const wrapper = mount(RemoteCollaborationOfferDisclosure, {
      props: { entries: [], testId: 'offer', label: 'Connection details', modelValue: false },
      slots: { default: '<p data-testid="details">This node → 8003 ✓ Working</p>' },
    })
    expect(wrapper.get('[data-testid="offer-summary"]').text()).toBe('Connection details')
    expect(wrapper.find('[data-testid="details"]').exists()).toBe(false)
    await wrapper.setProps({ modelValue: true })
    expect(wrapper.find('[data-testid="offer-list"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="details"]').text()).toContain('Working')
    await wrapper.get('[data-testid="offer-toggle"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })

  it('ST-08: open, two groups with headings and counts, sorted by name, descriptions only where present; no search at 6 or fewer', async () => {
    const wrapper = mountOffer([agent('Code Reviewer'), agent('Build Runner', 'Runs builds'), team('Studio Team', 'Writes and checks articles')])
    await wrapper.get('[data-testid="offer-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="offer-list-search"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="offer-list-agents"]').get('h4').text().replace(/\s+/g, ' ')).toBe('Agents 2')
    expect(wrapper.get('[data-testid="offer-list-teams"]').get('h4').text().replace(/\s+/g, ' ')).toBe('Agent Teams 1')
    const agents = wrapper.get('[data-testid="offer-list-agents"]').findAll('[data-testid="offer-list-entry"]')
    expect(agents.map((row) => row.findAll('p').map((line) => line.text()))).toEqual([['Build Runner', 'Runs builds'], ['Code Reviewer']])
    expect(wrapper.get('[data-testid="offer-list"]').find('.md\\:grid-cols-2').exists()).toBe(true)
  })

  it('ST-11: a peer with only one kind shows only that group, in one column; the counts name only that kind', async () => {
    const wrapper = mountOffer([team('Studio Team')])
    expect(wrapper.get('[data-testid="offer-summary"]').text()).toBe('1 Agent Team')
    await wrapper.get('[data-testid="offer-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="offer-list-agents"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="offer-list-teams"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="offer-list"]').find('.md\\:grid-cols-2').exists()).toBe(false)
  })

  it('AC-504 / ST-09: with more than 6 of a kind, search narrows both groups by name ("n of m", "No match."); clearing shows all', async () => {
    const wrapper = mountOffer([...many(24, agent), team('Copy Team'), team('Studio Team')])
    expect(wrapper.get('[data-testid="offer-summary"]').text()).toBe('24 Agents · 2 Agent Teams')
    await wrapper.get('[data-testid="offer-toggle"]').trigger('click')
    const search = wrapper.get('[data-testid="offer-list-search"]')
    expect(search.attributes('type')).toBe('search')
    expect(search.attributes('aria-label')).toBe('Search by name')
    await search.setValue('  agent 1 ')
    expect(wrapper.get('[data-testid="offer-list-agents-count"]').text()).toBe('10 of 24')
    expect(wrapper.get('[data-testid="offer-list-teams-count"]').text()).toBe('0 of 2')
    expect(wrapper.get('[data-testid="offer-list-teams"]').text()).toContain('No match.')
    await search.setValue('COPY')
    expect(wrapper.get('[data-testid="offer-list-teams"]').findAll('[data-testid="offer-list-entry"]').map((row) => row.text())).toEqual(['Copy Team'])
    await search.setValue('zzz')
    expect(wrapper.get('[data-testid="offer-list-no-match"]').text()).toContain('No Agents or Agent Teams match “zzz”.')
    await wrapper.get('[data-testid="offer-list-no-match"]').get('button').trigger('click')
    expect(wrapper.get('[data-testid="offer-list-agents-count"]').text()).toBe('24')
    expect(wrapper.findAll('[data-testid="offer-list-entry"]')).toHaveLength(26)
  })

  it('closing clears the search text', async () => {
    const wrapper = mountOffer(many(7, agent))
    const toggle = wrapper.get('[data-testid="offer-toggle"]')
    await toggle.trigger('click')
    await wrapper.get('[data-testid="offer-list-search"]').setValue('01')
    await toggle.trigger('click')
    await toggle.trigger('click')
    expect((wrapper.get('[data-testid="offer-list-search"]').element as HTMLInputElement).value).toBe('')
  })
})
