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
  await new DOMWrapper(optionRows()[0]!).trigger('click')

  expect(wrapper.emitted('update:modelValue')).toEqual([['sonnet']])
  expect(document.body.querySelector('input')).toBeNull()

  wrapper.unmount()
})
