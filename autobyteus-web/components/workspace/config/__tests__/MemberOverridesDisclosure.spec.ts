import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MemberOverridesDisclosure from '../MemberOverridesDisclosure.vue'

const StatefulDraft = defineComponent({
  setup() {
    const value = ref(0)
    return { value }
  },
  template: '<button data-test="draft-value" @click="value += 1">{{ value }}</button>',
})

describe('MemberOverridesDisclosure', () => {
  it('keeps its adjacent accessible control collapsed by default and preserves slotted draft state', async () => {
    const wrapper = mount(MemberOverridesDisclosure, {
      props: { label: 'Member overrides', count: 3, testPrefix: 'org-member-overrides' },
      slots: { default: StatefulDraft },
    })
    const toggle = wrapper.get('[data-test="org-member-overrides-toggle"]')
    const panel = wrapper.get('#org-member-overrides-panel')

    expect(toggle.text()).toContain('Member overrides (3)')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-controls')).toBe('org-member-overrides-panel')
    expect(panel.attributes('style')).toContain('display: none')

    await toggle.trigger('click')
    await wrapper.get('[data-test="draft-value"]').trigger('click')
    await toggle.trigger('click')
    await toggle.trigger('click')

    expect(wrapper.get('[data-test="draft-value"]').text()).toBe('1')
  })

  it('omits the disclosure when there are no configurable Agents', () => {
    const wrapper = mount(MemberOverridesDisclosure, {
      props: { label: 'Member overrides', count: 0, testPrefix: 'org-member-overrides' },
    })
    expect(wrapper.find('[data-test="member-overrides-disclosure"]').exists()).toBe(false)
  })
})
