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
  it.each(['team', 'org'] as const)('shows complete readable identities without rooted addresses in %s view mode', (scope) => {
    const longLabel = 'Editorial Platform / Long-form Accessibility Review Specialist'
    const viewFrom: HandoffEndpointOption[] = [
      { id: 'writer', kind: 'agent', label: longLabel, address: '/editorial_platform/long_form_accessibility_review_specialist', group: 'Team Agents' },
    ]
    const viewTo: HandoffEndpointOption[] = [
      { id: 'delivery', kind: 'team', label: 'Delivery Team', address: '/delivery_team', coordinatorAddress: '/delivery_team/coordinator', group: 'Teams' },
    ]
    const wrapper = mount(HandoffManager, {
      props: {
        modelValue: [{ id: 'long', fromAddress: viewFrom[0]!.address, toAddress: viewTo[0]!.address, when: ['The draft is ready.'] }],
        fromOptions: viewFrom,
        toOptions: viewTo,
        mode: 'view',
        scope,
      },
    })

    expect(wrapper.text()).toContain(longLabel)
    expect(wrapper.text()).toContain('Delivery Team')
    expect(wrapper.text()).not.toContain('/editorial_platform/long_form_accessibility_review_specialist')
    expect(wrapper.text()).not.toContain('/delivery_team')
    expect(wrapper.find('span.whitespace-normal.break-words').exists()).toBe(true)
    expect(wrapper.find('.truncate').exists()).toBe(false)
    expect(wrapper.find('.font-mono').exists()).toBe(false)

    const directionGrid = wrapper.get('[data-test="handoff-card-long"] > .grid')
    expect(directionGrid.classes()).toContain('grid-cols-[minmax(0,1fr)]')
    const directionColumns = Array.from(directionGrid.element.children).filter((element) => element.tagName === 'DIV')
    expect(directionColumns).toHaveLength(2)
    expect(directionColumns.every((element) => element.classList.contains('min-w-0'))).toBe(true)
    expect(wrapper.findAllComponents({ name: 'EndpointIdentity' }).every((identity) => (
      identity.classes().includes('min-w-0') && identity.classes().includes('max-w-full')
    ))).toBe(true)
  })

  it('keeps exact canonical addresses as native option values and emitted draft identities', async () => {
    const wrapper = mountManager([])
    await wrapper.get('[data-test="add-handoff"]').trigger('click')

    const sourceSelect = wrapper.get('[data-test="handoff-from"]')
    const sourceOption = sourceSelect.find('option[value="/software/architect"]')
    expect(sourceOption.text()).toBe('Architecture Designer')
    expect(sourceOption.text()).not.toContain('/software/architect')
    expect((sourceOption.element as HTMLOptionElement).value).toBe('/software/architect')

    await sourceSelect.setValue('/requirements')
    await wrapper.get('[data-test="handoff-to"]').setValue('/software')
    await wrapper.get('[data-test="when-condition-0"]').setValue('  Implementation is ready.  ')
    expect(wrapper.get('[data-test="handoff-editor"]').text()).not.toContain('/requirements')
    expect(wrapper.get('[data-test="handoff-editor"]').text()).not.toContain('/software')
    await wrapper.get('[data-test="apply-handoff-draft"]').trigger('click')

    const emitted = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as EditableHandoff[]
    expect(emitted[0]).toMatchObject({
      fromAddress: '/requirements',
      toAddress: '/software',
      when: ['Implementation is ready.'],
    })
  })

  it('adds the shortest human-readable placement suffix only when labels collide', async () => {
    const colliding: HandoffEndpointOption[] = [
      { id: 'marketing', kind: 'agent', label: 'Researcher', address: '/marketing_team/researcher', group: 'Team Agents' },
      { id: 'product', kind: 'agent', label: 'Researcher', address: '/product_team/researcher', group: 'Team Agents' },
      { id: 'writer', kind: 'agent', label: 'Writer', address: '/editorial_team/writer', group: 'Team Agents' },
    ]
    const wrapper = mount(HandoffManager, {
      props: { modelValue: [], fromOptions: colliding, toOptions: colliding, mode: 'edit', scope: 'org' },
    })
    await wrapper.get('[data-test="add-handoff"]').trigger('click')

    const optionText = wrapper.get('[data-test="handoff-from"]').findAll('option').map((option) => option.text())
    expect(optionText).toContain('Researcher (marketing team / researcher)')
    expect(optionText).toContain('Researcher (product team / researcher)')
    expect(optionText).toContain('Writer')
    expect(optionText.some((label) => label.startsWith('Writer ('))).toBe(false)

    await wrapper.get('[data-test="handoff-from"]').setValue('/marketing_team/researcher')
    expect(wrapper.get('[data-test="handoff-editor"]').text()).toContain('Researcher (marketing team / researcher)')
    expect(wrapper.get('[data-test="handoff-editor"]').text()).not.toContain('/marketing_team/researcher')
  })

  it('uses literal non-rooted suffixes only when humanization cannot distinguish placements', async () => {
    const colliding: HandoffEndpointOption[] = [
      { id: 'underscore', kind: 'agent', label: 'Reviewer', address: '/review_agent', group: 'Direct Agents' },
      { id: 'hyphen', kind: 'agent', label: 'Reviewer', address: '/review-agent', group: 'Direct Agents' },
    ]
    const wrapper = mount(HandoffManager, {
      props: { modelValue: [], fromOptions: colliding, toOptions: colliding, mode: 'edit', scope: 'team' },
    })
    await wrapper.get('[data-test="add-handoff"]').trigger('click')

    const optionText = wrapper.get('[data-test="handoff-from"]').findAll('option').map((option) => option.text())
    expect(optionText).toContain('Reviewer (review_agent)')
    expect(optionText).toContain('Reviewer (review-agent)')
    expect(optionText.join(' ')).not.toContain('/review_agent')
    expect(optionText.join(' ')).not.toContain('/review-agent')
  })

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

    expect(wrapper.text()).toContain('Unavailable · requirements')
    expect(wrapper.text()).not.toContain('/requirements')
    expect((wrapper.vm as unknown as { validateAll(): boolean }).validateAll()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Resolve 1 affected handoff before saving.')
  })

  it('uses a localized generic identity for a malformed stale address without exposing the raw value', () => {
    const wrapper = mountManager([
      { id: 'malformed', fromAddress: '../private/raw-address', toAddress: '/software', when: ['Recover the definition.'] },
    ])

    expect(wrapper.text()).toContain('Unavailable · Unknown endpoint')
    expect(wrapper.text()).not.toContain('../private/raw-address')
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

      const stale = mountManager(handoffs, from.filter((option) => option.address !== '/requirements'))
      expect(stale.text()).toContain('不可用 · requirements')
      expect(stale.text()).not.toContain('/requirements')
    } finally {
      await localizationRuntime.setPreference('en')
    }
  })
})
