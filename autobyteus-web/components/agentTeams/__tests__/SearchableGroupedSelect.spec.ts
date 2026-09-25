import { afterEach, describe, expect, it } from 'vitest'
import { DOMWrapper, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SearchableGroupedSelect, {
  type GroupedOption,
} from '../SearchableGroupedSelect.vue'

const describedOptions: GroupedOption[] = [
  {
    label: 'Anthropic',
    items: [
      {
        id: 'sonnet',
        name: 'Sonnet',
        description: 'Sonnet 5 · Efficient for routine tasks',
        selectedLabel: 'Anthropic / Sonnet',
      },
      {
        id: 'opus',
        name: 'Opus',
        description: 'Opus 4.8 · Best for everyday, complex tasks',
        selectedLabel: 'Anthropic / Opus',
      },
      {
        id: 'haiku',
        name: 'Haiku',
        description: 'Haiku 4.5 · Fastest for quick answers',
        selectedLabel: 'Anthropic / Haiku',
      },
    ],
  },
]

afterEach(() => {
  document.body.innerHTML = ''
})

const openSelect = async (options: GroupedOption[] = describedOptions, modelValue: string | null = null) => {
  const wrapper = mount(SearchableGroupedSelect, {
    attachTo: document.body,
    props: { modelValue, options },
  })
  await wrapper.get('button').trigger('click')
  await nextTick()
  return wrapper
}

const optionRows = (): HTMLLIElement[] =>
  Array.from(document.body.querySelectorAll<HTMLLIElement>('li'))

it('renders trimmed descriptions as wrapped plain secondary text', async () => {
  const wrapper = await openSelect([
    {
      label: 'Mixed',
      items: [
        {
          id: 'described',
          name: 'Described Model',
          description: '  Model 5 · <strong>Efficient for routine tasks</strong>  ',
        },
        { id: 'name-only', name: 'Name Only', description: ' \n\t ' },
        { id: 'non-model', name: 'Current Workspace' },
      ],
    },
  ], 'described')

  const rows = optionRows()
  expect(rows).toHaveLength(3)
  expect(rows[0]?.textContent).toContain('Model 5 · <strong>Efficient for routine tasks</strong>')
  expect(rows[0]?.querySelector('strong')).toBeNull()
  expect(rows[0]?.querySelector('span.mt-0\\.5')).not.toBeNull()
  expect(rows[0]?.classList.contains('items-start')).toBe(true)
  expect(rows[0]?.querySelector('div.min-w-0')).not.toBeNull()
  expect(rows[0]?.querySelector('span.whitespace-normal.break-words')).not.toBeNull()
  expect(rows[0]?.querySelector('svg')?.classList.contains('flex-shrink-0')).toBe(true)
  expect(rows[1]?.querySelectorAll('span')).toHaveLength(1)
  expect(rows[1]?.textContent?.trim()).toBe('Name Only')
  expect(rows[2]?.querySelectorAll('span')).toHaveLength(1)
  expect(rows[2]?.textContent?.trim()).toBe('Current Workspace')

  wrapper.unmount()
})

it('searches descriptions case-insensitively while preserving existing matches', async () => {
  const wrapper = await openSelect()
  const input = document.body.querySelector<HTMLInputElement>('input')
  expect(input).not.toBeNull()
  expect(document.activeElement).toBe(input)

  await new DOMWrapper(input!).setValue('ROUTINE TASKS')
  expect(optionRows().map((row) => row.textContent)).toEqual([
    expect.stringContaining('Sonnet 5 · Efficient for routine tasks'),
  ])

  await new DOMWrapper(input!).setValue('OPUS')
  expect(optionRows()).toHaveLength(1)
  expect(optionRows()[0]?.textContent).toContain('Opus 4.8')

  wrapper.unmount()
})

it('keeps the closed label compact and emits only the selected identifier', async () => {
  const wrapper = mount(SearchableGroupedSelect, {
    attachTo: document.body,
    props: { modelValue: 'sonnet', options: describedOptions },
  })

  expect(wrapper.get('button').text()).toContain('Anthropic / Sonnet')
  expect(wrapper.get('button').text()).not.toContain('Efficient for routine tasks')

  await wrapper.get('button').trigger('click')
  await nextTick()
  await new DOMWrapper(optionRows()[1]!).trigger('click')

  expect(wrapper.emitted('update:modelValue')).toEqual([['opus']])
  expect(document.body.querySelector('input')).toBeNull()

  wrapper.unmount()
})


it('supports keyboard search, option navigation, selection and Escape focus recovery', async () => {
  const wrapper = await openSelect(describedOptions, 'sonnet')
  const trigger = wrapper.get('button')
  const input = new DOMWrapper(document.body.querySelector<HTMLInputElement>('input')!)
  expect(trigger.attributes('aria-expanded')).toBe('true')
  expect(document.body.querySelector('[role="listbox"]')?.id).toBe(trigger.attributes('aria-controls'))
  expect(optionRows()[0]?.getAttribute('aria-selected')).toBe('true')
  await input.trigger('keydown', { key: 'ArrowDown' })
  expect(document.activeElement).toBe(optionRows()[0])
  await new DOMWrapper(optionRows()[0]!).trigger('keydown', { key: 'ArrowDown' })
  expect(document.activeElement).toBe(optionRows()[1])
  await new DOMWrapper(optionRows()[1]!).trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('update:modelValue')).toEqual([['opus']])
  expect(document.activeElement).toBe(trigger.element)
  expect(trigger.attributes('aria-expanded')).toBe('false')
  await trigger.trigger('click')
  await nextTick()
  await new DOMWrapper(document.body.querySelector('input')!).trigger('keydown', { key: 'Escape' })
  expect(document.body.querySelector('input')).toBeNull()
  expect(document.activeElement).toBe(trigger.element)
  wrapper.unmount()
})

describe('current-only Claude display', () => {
  const claudeOptions: GroupedOption[] = [
    {
      label: 'Anthropic',
      items: [
        {
          id: 'opus[1m]',
          recommended: true,
          name: 'claude-opus-5-5[1m]',
          description: 'Opus (1M context) · Opus 5.5 with 1M context · Best for everyday, complex tasks',
          selectedLabel: 'Anthropic / claude-opus-5-5[1m]',
        },
        {
          id: 'haiku',
          name: 'claude-haiku-4-5-20251001',
          description: 'Haiku · Haiku 4.5 · Fastest for quick answers',
          selectedLabel: 'Anthropic / claude-haiku-4-5-20251001',
        },
        {
          id: 'sonnet',
          name: 'claude-sonnet-5',
          description: 'Sonnet · Sonnet 5 · Efficient for routine tasks',
          selectedLabel: 'Anthropic / claude-sonnet-5',
        },
      ],
    },
  ]

  it('shows current-only display without selecting an offered sibling', async () => {
    const wrapper = mount(SearchableGroupedSelect, { attachTo: document.body,
      props: { modelValue: 'default', options: claudeOptions, selectedDisplay: 'Anthropic / claude-opus-5-5[1m]' } })
    await wrapper.get('button').trigger('click')
    await nextTick()
    expect(wrapper.get('button').text()).toContain('Anthropic / claude-opus-5-5[1m]')
    const rows = optionRows()
    expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false'])
    expect(rows[0]?.querySelector('svg')).toBeNull()
    expect(rows[1]?.querySelector('svg')).toBeNull()
    expect(rows[0]?.querySelector('[data-test="select-item-recommended"]')?.textContent?.trim()).toBe('Recommended')
    expect(rows[1]?.querySelector('[data-test="select-item-recommended"]')).toBeNull()

    wrapper.unmount()
  })

  it('emits the sibling ID only after an explicit click', async () => {
    const wrapper = await openSelect(claudeOptions, 'default')

    await new DOMWrapper(optionRows()[0]!).trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['opus[1m]']])
    expect(document.body.querySelector('input')).toBeNull()

    await wrapper.get('button').trigger('click')
    await nextTick()
    await new DOMWrapper(optionRows()[2]!).trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['opus[1m]'], ['sonnet']])

    wrapper.unmount()
  })

  it.each([
    ['opus', ['claude-opus-5-5[1m]']],
    ['claude-haiku', ['claude-haiku-4-5-20251001']],
    ['haiku', ['claude-haiku-4-5-20251001']],
    ['recommended', ['claude-opus-5-5[1m]']],
  ])('searching %j shows the matching option', async (term, expected) => {
    const wrapper = await openSelect(claudeOptions)
    await new DOMWrapper(document.body.querySelector<HTMLInputElement>('input')!).setValue(term)

    expect(optionRows().map((row) => row.querySelector('span')?.textContent?.trim())).toEqual(expected)

    wrapper.unmount()
  })
})
