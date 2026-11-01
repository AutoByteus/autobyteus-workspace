import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SkillCard from './SkillCard.vue'
import { useIntegrationsStore } from '~/stores/integrationsStore'

const skill = (integrationId: string | null) => ({
  name: 'github-integration', description: 'GitHub.', content: '', rootPath: '/x', fileCount: 3, isReadonly: true,
  isDisabled: false, integrationId,
})
const mountCard = (integrationId: string | null) => mount(SkillCard, {
  props: { skill: skill(integrationId) },
  global: {
    stubs: { NuxtLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' } },
    mocks: { $t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key) },
  },
})

// UIS-007: an integration's skill is labelled and links to its card; other skills are not.
describe('SkillCard integration label', () => {
  it('links an integration skill to its card on the Integrations page, named by the integration', () => {
    setActivePinia(createPinia())
    useIntegrationsStore().items = [{ id: 'github', name: 'GitHub' } as never]
    const label = mountCard('github').get('[data-testid="skill-integration-label"]')
    expect(label.text()).toBe('integrations.skillLabel.text')
    expect(JSON.parse(label.attributes('data-to')!)).toEqual({ path: '/integrations', hash: '#integration-github' })
    expect(label.attributes('aria-label')).toBe('integrations.skillLabel.title {"name":"GitHub"}')
  })

  it('shows no label on a plain skill', () => {
    setActivePinia(createPinia())
    expect(mountCard(null).find('[data-testid="skill-integration-label"]').exists()).toBe(false)
  })
})
