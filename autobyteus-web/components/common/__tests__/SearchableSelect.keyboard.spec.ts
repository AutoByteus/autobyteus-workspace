import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import SearchableSelect from '../SearchableSelect.vue'

const options = [
  { id: 'agent_ws_a', name: 'alpha', description: '/work/alpha' },
  { id: 'agent_ws_b', name: 'beta', description: '/work/beta' },
  { id: 'agent_ws_c', name: 'gamma', description: '/work/gamma' },
]

let wrapper: VueWrapper | null = null

const mountSelect = (modelValue: string | null = null) => {
  wrapper = mount(SearchableSelect, {
    props: {
      modelValue,
      options,
      'onUpdate:modelValue': (value: string) => wrapper!.setProps({ modelValue: value }),
    },
    attachTo: document.body,
  })
  return wrapper
}

const trigger = () => wrapper!.get('button[aria-haspopup="listbox"]').element as HTMLButtonElement
const searchInput = () => document.querySelector('input[role="combobox"]') as HTMLInputElement | null
const listbox = () => document.querySelector('[role="listbox"]')
const keydown = async (target: Element, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  await flushPromises()
  return event
}
const open = async () => {
  trigger().focus()
  trigger().click()
  await flushPromises()
}

describe('SearchableSelect keyboard support', () => {
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('exposes combobox/listbox semantics', async () => {
    mountSelect('agent_ws_b')
    expect(trigger().getAttribute('aria-expanded')).toBe('false')

    await open()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(trigger().getAttribute('aria-controls')).toBe(listbox()!.id)
    expect(document.activeElement).toBe(searchInput())
    expect(searchInput()!.getAttribute('aria-controls')).toBe(listbox()!.id)
    const optionEls = Array.from(document.querySelectorAll('[role="option"]'))
    expect(optionEls.map((el) => el.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false'])
    // The selected option starts active.
    expect(searchInput()!.getAttribute('aria-activedescendant')).toBe(optionEls[1]!.id)
  })

  it('moves the active option with arrow keys and selects it with Enter', async () => {
    const select = mountSelect()
    await open()
    const input = searchInput()!
    const optionIds = Array.from(document.querySelectorAll('[role="option"]')).map((el) => el.id)
    expect(input.getAttribute('aria-activedescendant')).toBe(optionIds[0])

    await keydown(input, 'ArrowDown')
    await keydown(input, 'ArrowDown')
    expect(input.getAttribute('aria-activedescendant')).toBe(optionIds[2])
    await keydown(input, 'ArrowDown')
    expect(input.getAttribute('aria-activedescendant')).toBe(optionIds[0])
    await keydown(input, 'ArrowUp')
    expect(input.getAttribute('aria-activedescendant')).toBe(optionIds[2])
    await keydown(input, 'ArrowUp')

    const enter = await keydown(input, 'Enter')
    expect(enter.defaultPrevented).toBe(true)
    expect(select.emitted('update:modelValue')?.at(-1)).toEqual(['agent_ws_b'])
    expect(listbox()).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('keeps the active option within the filtered results', async () => {
    const select = mountSelect()
    await open()
    const input = searchInput()!
    input.value = 'gam'
    input.dispatchEvent(new Event('input'))
    await flushPromises()

    await keydown(input, 'Enter')
    expect(select.emitted('update:modelValue')?.at(-1)).toEqual(['agent_ws_c'])
  })

  it('closes on Escape without propagating and returns focus to the trigger', async () => {
    const select = mountSelect()
    const outerListener = vi.fn()
    document.addEventListener('keydown', outerListener)
    try {
      await open()
      const escape = await keydown(searchInput()!, 'Escape')

      expect(escape.defaultPrevented).toBe(true)
      expect(outerListener).not.toHaveBeenCalled()
      expect(listbox()).toBeNull()
      expect(document.activeElement).toBe(trigger())
      expect(select.emitted('update:modelValue')).toBeUndefined()
    } finally {
      document.removeEventListener('keydown', outerListener)
    }
  })

  it.each([false, true])('closes on Tab (shift=%s) and returns focus to the trigger', async (shiftKey) => {
    mountSelect()
    await open()
    const tab = await keydown(searchInput()!, 'Tab', { shiftKey })

    expect(tab.defaultPrevented).toBe(true)
    expect(listbox()).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('opens from the trigger with ArrowDown', async () => {
    mountSelect()
    trigger().focus()
    await keydown(trigger(), 'ArrowDown')

    expect(listbox()).not.toBeNull()
    expect(document.activeElement).toBe(searchInput())
  })

  it('keeps pointer selection working', async () => {
    const select = mountSelect()
    await open()
    ;(document.querySelectorAll('[role="option"]')[2] as HTMLElement).click()
    await flushPromises()

    expect(select.emitted('update:modelValue')?.at(-1)).toEqual(['agent_ws_c'])
    expect(listbox()).toBeNull()
  })
})
