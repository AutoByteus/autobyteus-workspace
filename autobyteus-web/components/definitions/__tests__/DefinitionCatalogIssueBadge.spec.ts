import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DefinitionCatalogIssueBadge from '../DefinitionCatalogIssueBadge.vue'

const issue = (code: string) => ({
  code, reason: 'Invalid JSON: Unexpected end of JSON input',
  definitionPath: '/packages/agents/writer/agent-config.json', packageRoot: '/packages',
})

describe('DefinitionCatalogIssueBadge', () => {
  it('renders nothing for a definition without an issue', () => {
    expect(mount(DefinitionCatalogIssueBadge, { props: { issue: null } }).find('[data-testid="definition-catalog-issue"]').exists()).toBe(false)
  })

  it('marks a last-good definition and names the file and the reason', () => {
    const wrapper = mount(DefinitionCatalogIssueBadge, { props: { issue: issue('DEFINITION_CONTRACT_INVALID') } })
    const text = wrapper.get('[data-testid="definition-catalog-issue"]').text()
    expect(text).toContain('Using last working version')
    expect(text).toContain('/packages/agents/writer/agent-config.json')
    expect(text).toContain('Unexpected end of JSON input')
  })

  it('explains a missing package folder', () => {
    const wrapper = mount(DefinitionCatalogIssueBadge, { props: { issue: issue('DEFINITION_SOURCE_MISSING') } })
    expect(wrapper.text()).toContain('Package folder missing')
  })
})
