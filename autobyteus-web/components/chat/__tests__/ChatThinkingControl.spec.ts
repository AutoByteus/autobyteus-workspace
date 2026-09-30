import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChatThinkingControl from '../ChatThinkingControl.vue'

const labels: Record<string, string> = {
  'chat.thinking.title': 'Thinking',
  'chat.thinking.on': 'On',
  'chat.thinking.off': 'Off',
  'chat.thinking.default': 'Default',
}
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => labels[key] ?? key }) }))

const claudeSdkSchema = {
  thinking_enabled: { type: 'boolean', default: false },
  reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'medium' },
}
const anthropicBudgetSchema = {
  thinking_enabled: { type: 'boolean', default: false },
  thinking_budget_tokens: { type: 'integer', title: 'Thinking budget tokens', default: 1024, minimum: 1024 },
}
const openAiSchema = {
  reasoning_effort: { type: 'string', enum: ['none', 'low', 'high'], default: 'none' },
}

let wrapper: VueWrapper | null = null
const mountControl = (schema: Record<string, unknown> | null, llmConfig: Record<string, unknown> | null) => {
  wrapper = mount(ChatThinkingControl, { props: { schema: schema as never, llmConfig }, attachTo: document.body })
  return wrapper
}
const open = async (control: VueWrapper) => {
  await control.get('[data-test="chat-thinking-trigger"]').trigger('click')
  await flushPromises()
}
const trigger = (control: VueWrapper) => control.get('[data-test="chat-thinking-trigger"]')
const bulbMuted = (control: VueWrapper) => control.get('[data-test="chat-thinking-bulb"]').classes().includes('text-gray-300')
const checked = (control: VueWrapper) => control.findAll('[role="menuitemradio"][aria-checked="true"]').map((item) => item.attributes('data-test'))

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ChatThinkingControl', () => {
  it('shows Off with a muted bulb and one merged list with only Off checked (AC-004)', async () => {
    const control = mountControl(claudeSdkSchema, { thinking_enabled: false, reasoning_effort: 'medium' })
    expect(trigger(control).text()).toBe('Off')
    expect(bulbMuted(control)).toBe(true)
    await open(control)
    const menu = control.get('[data-test="chat-thinking-menu"]')
    expect(menu.text()).toContain('Thinking')
    expect(menu.findAll('[role="menuitemradio"]').map((item) => item.text())).toEqual(['Off', 'Low', 'Medium', 'High', 'Xhigh', 'Max'])
    expect(checked(control)).toEqual(['chat-thinking-option-primary-off'])
    expect(control.find('[data-test="chat-thinking-option-thinking_enabled-true"]').exists()).toBe(false)
  })

  it('picking an effort turns thinking on at that level in one action (AC-001)', async () => {
    const control = mountControl(claudeSdkSchema, null)
    await open(control)
    await control.get('[data-test="chat-thinking-option-primary-high"]').trigger('click')
    expect(control.emitted('update')?.at(-1)?.[0]).toEqual({ thinking_enabled: true, reasoning_effort: 'high' })
    expect(control.find('[data-test="chat-thinking-menu"]').exists()).toBe(false)

    await control.setProps({ llmConfig: { thinking_enabled: true, reasoning_effort: 'high' } })
    expect(trigger(control).text()).toBe('High')
    expect(bulbMuted(control)).toBe(false)
    await open(control)
    expect(checked(control)).toEqual(['chat-thinking-option-primary-high'])
  })

  it('Off turns thinking off in one action, and a level turns it back on (AC-005)', async () => {
    const control = mountControl(claudeSdkSchema, { thinking_enabled: true, reasoning_effort: 'high' })
    await open(control)
    await control.get('[data-test="chat-thinking-option-primary-off"]').trigger('click')
    expect(control.emitted('update')?.at(-1)?.[0]).toEqual({ thinking_enabled: false, reasoning_effort: 'high' })

    await control.setProps({ llmConfig: { thinking_enabled: false, reasoning_effort: 'high' } })
    expect(trigger(control).text()).toBe('Off')
    await open(control)
    await control.get('[data-test="chat-thinking-option-primary-medium"]').trigger('click')
    expect(control.emitted('update')?.at(-1)?.[0]).toEqual({ thinking_enabled: true, reasoning_effort: 'medium' })
  })

  it('shows Off · On and a budget field for a switch without efforts; a budget turns thinking on (AC-003, AC-005)', async () => {
    const control = mountControl(anthropicBudgetSchema, { thinking_enabled: false })
    await open(control)
    const menu = control.get('[data-test="chat-thinking-menu"]')
    expect(menu.findAll('[role="menuitemradio"]').map((item) => item.text())).toEqual(['Off', 'On'])
    expect(menu.find('[role="separator"]').exists()).toBe(true)
    const budget = control.get('[data-test="chat-thinking-input-thinking_budget_tokens"]')
    await budget.setValue('4096')
    await budget.trigger('change')
    expect(control.emitted('update')?.at(-1)?.[0]).toEqual({ thinking_enabled: true, thinking_budget_tokens: 4096 })

    await control.setProps({ llmConfig: { thinking_enabled: true, thinking_budget_tokens: 4096 } })
    expect(trigger(control).text()).toBe('On')
  })

  it('keeps the per-parameter menu for models without an on/off switch (AC-006)', async () => {
    const control = mountControl(openAiSchema, { reasoning_effort: 'high' })
    expect(trigger(control).text()).toBe('High')
    expect(bulbMuted(control)).toBe(false)
    await open(control)
    expect(control.find('[data-test^="chat-thinking-option-primary-"]').exists()).toBe(false)
    expect(checked(control)).toEqual(['chat-thinking-option-reasoning_effort-high'])
    await control.get('[data-test="chat-thinking-option-reasoning_effort-low"]').trigger('click')
    expect(control.emitted('update')?.at(-1)?.[0]).toEqual({ reasoning_effort: 'low' })
  })

  it('is hidden when the model has no thinking parameters', () => {
    const control = mountControl({ temperature: { type: 'number', default: 1 } }, null)
    expect(control.find('[data-test="chat-thinking-trigger"]').exists()).toBe(false)
  })
})

describe('ChatThinkingControl placement', () => {
  const placeRootAt = (control: VueWrapper, top: number) => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({ position: 'relative' }) as CSSStyleDeclaration)
    vi.spyOn(control.element, 'getBoundingClientRect').mockReturnValue({ top, bottom: top + 28, left: 0, right: 80, width: 80, height: 28, x: 0, y: top, toJSON: () => ({}) } as DOMRect)
  }

  it('opens above its trigger even when there is room below (AC-002)', async () => {
    vi.stubGlobal('innerWidth', 1512)
    vi.stubGlobal('innerHeight', 2000)
    const control = mountControl(claudeSdkSchema, null)
    placeRootAt(control, 604)
    await open(control)

    const menu = control.get('[data-test="chat-thinking-menu"]')
    expect(menu.classes()).toEqual(expect.arrayContaining(['absolute', 'right-0', 'bottom-full', 'mb-1.5', 'overflow-y-auto']))
    expect(menu.classes()).not.toContain('top-full')
    expect((menu.element as HTMLElement).style.maxHeight).toBe('240px')
  })

  it('shrinks to the space above in a short window (AC-004)', async () => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 440)
    const control = mountControl(claudeSdkSchema, null)
    placeRootAt(control, 200)
    await open(control)

    const menu = control.get('[data-test="chat-thinking-menu"]')
    expect(menu.classes()).toContain('bottom-full')
    expect((menu.element as HTMLElement).style.maxHeight).toBe('178px')
  })

  it('keeps the bottom sheet below 640px wide (AC-005)', async () => {
    vi.stubGlobal('innerWidth', 390)
    vi.stubGlobal('innerHeight', 844)
    const control = mountControl(claudeSdkSchema, null)
    placeRootAt(control, 700)
    await open(control)

    const menu = control.get('[data-test="chat-thinking-menu"]')
    expect(menu.classes()).toEqual(expect.arrayContaining(['fixed', 'inset-x-2', 'bottom-2']))
    expect(menu.classes()).not.toContain('bottom-full')
    expect(menu.classes()).not.toContain('overflow-y-auto')
    expect((menu.element as HTMLElement).style.maxHeight).toBe('')
  })
})
