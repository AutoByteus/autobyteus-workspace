import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HandoffManager from '../HandoffManager.vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import type { EditableHandoff, HandoffEndpointOption } from '~/types/collaboration/handoffs'

const from: HandoffEndpointOption[] = [
  { id: 'requirements', kind: 'agent', label: 'Requirements Engineer', address: '/requirements', group: 'Direct Agents' },
  { id: 'architect', kind: 'agent', label: 'Architecture Designer', address: '/software/architect', group: 'Team · Software' },
]
const to: HandoffEndpointOption[] = [
  ...from,
  { id: 'software', kind: 'team', label: 'Software Engineering', address: '/software', coordinatorAddress: '/software/architect', group: 'Teams' },
]
const handoffs: EditableHandoff[] = [
  { id: 'first', fromAddress: '/requirements', toAddress: '/software', when: ['Requirements are approved.', 'A design is needed.'] },
  { id: 'second', fromAddress: '/software/architect', toAddress: '/requirements', when: ['Requirements need clarification.'] },
]

const mountManager = (modelValue: EditableHandoff[] = handoffs, fromOptions = from) => mount(HandoffManager, {
  props: { modelValue, fromOptions, toOptions: to, mode: 'edit', scope: 'org' },
})

describe('HandoffManager', () => {
  it('preserves card and When order while exposing position-aware reorder controls', async () => {
    const wrapper = mountManager()
    expect(wrapper.text().indexOf('Requirements are approved.')).toBeLessThan(wrapper.text().indexOf('Requirements need clarification.'))

    await wrapper.get('button[aria-label="Move handoff 2 up"]').trigger('click')
    const emitted = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as EditableHandoff[]
    expect(emitted.map((handoff) => handoff.id)).toEqual(['second', 'first'])
  })

  it('supports inline add/apply without an overlay and rejects self-resolving Team delivery', async () => {
    const wrapper = mountManager([])
    await wrapper.get('[data-test="add-handoff"]').trigger('click')
    expect(wrapper.get('[data-test="handoff-editor"]').exists()).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.get('[data-test="handoff-from"]').setValue('/software/architect')
    await wrapper.get('[data-test="handoff-to"]').setValue('/software')
    await wrapper.get('[data-test="when-condition-0"]').setValue('Implementation is ready.')
    await wrapper.get('[data-test="apply-handoff-draft"]').trigger('click')

    expect(wrapper.text()).toContain('This delivery resolves back to the source Agent.')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('keeps a stale endpoint visible and blocks atomic definition save', async () => {
    const wrapper = mountManager(handoffs, from.filter((option) => option.address !== '/requirements'))

    expect(wrapper.text()).toContain('Unavailable · /requirements')
    expect((wrapper.vm as unknown as { validateAll(): boolean }).validateAll()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Resolve 1 affected handoff before saving.')
  })

  it('localizes view, edit, and validation chrome in Simplified Chinese without translating user-authored rules', async () => {
    await localizationRuntime.setPreference('zh-CN')
    try {
      const view = mount(HandoffManager, {
        props: { modelValue: handoffs, fromOptions: from, toOptions: to, mode: 'view', scope: 'org' },
      })
      expect(view.text()).toContain('交接规则')
      expect(view.text()).toContain('来源')
      expect(view.text()).toContain('目标')
      expect(view.text()).toContain('条件')
      expect(view.text()).toContain('Requirements are approved.')
      expect(view.text()).not.toContain('Edit')

      const edit = mountManager()
      expect(edit.text()).toContain('编辑')
      expect(edit.text()).toContain('删除')
      await edit.get('[data-test="edit-handoff-first"]').trigger('click')
      expect(edit.text()).toContain('编辑交接规则')
      await edit.get('[data-test="handoff-from"]').setValue('')
      await edit.get('[data-test="apply-handoff-draft"]').trigger('click')
      expect(edit.text()).toContain('请选择来源智能体。')
      expect(edit.text()).toContain('Requirements are approved.')
    } finally {
      await localizationRuntime.setPreference('en')
    }
  })
})
