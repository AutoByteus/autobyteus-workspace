import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChatMessageInput from '../ChatMessageInput.vue'
import type { AgentContext } from '~/types/agent/AgentContext'

vi.mock('~/composables/agentInput/useComposerFilePathDrop', () => ({
  useComposerFilePathDrop: () => ({ resolveDroppedFilePaths: vi.fn(async () => []) }),
}))

const targetOptions = [
  { key: 'agent:a1', kind: 'agent', id: 'a1', name: 'Researcher', description: 'Finds sources', initials: 'RE' },
  { key: 'team:t1', kind: 'team', id: 't1', name: 'Software team', description: 'Builds software', initials: 'ST' },
]
const skillOptions = [{ name: 'docx', description: 'Word documents' }]

let wrapper: VueWrapper | null = null
/** Mounted inside a positioned "composer card" 234px from the top, as on the New chat page. */
const mountInput = () => {
  const card = document.createElement('div')
  card.style.position = 'relative'
  document.body.appendChild(card)
  vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ top: 234, bottom: 394, left: 0, right: 700, width: 700, height: 160, x: 0, y: 234, toJSON: () => ({}) } as DOMRect)
  const context = reactive({ requirement: '', requestedSkillNames: [] as string[] }) as unknown as AgentContext
  wrapper = mount(ChatMessageInput, {
    props: { context, placeholder: 'Ask anything', skillOptions, skillsAllInstalled: false, targetOptions: targetOptions as never },
    attachTo: card,
    global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
  })
  const root = wrapper.element as HTMLElement
  Object.defineProperty(root, 'offsetParent', { configurable: true, get: () => card })
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => ({ position: element === card ? 'relative' : 'static' }) as CSSStyleDeclaration)
  return wrapper
}
const type = async (input: VueWrapper, text: string) => {
  const textarea = input.get('[data-test="chat-message-input"]')
  ;(textarea.element as HTMLTextAreaElement).value = text
  ;(textarea.element as HTMLTextAreaElement).setSelectionRange(text.length, text.length)
  await textarea.trigger('input')
  await flushPromises()
}
const menuWrapper = (input: VueWrapper, menu: string) => input.get(`[data-test="${menu}"]`).element.parentElement as HTMLElement

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ChatMessageInput menu placement', () => {
  it('opens the @ menu above the composer card, limited by the space above the card (AC-001, AC-004)', async () => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 520)
    const input = mountInput()
    await type(input, '@')

    const box = menuWrapper(input, 'chat-target-menu')
    expect(box.classList.contains('absolute')).toBe(true)
    expect(box.classList.contains('bottom-full')).toBe(true)
    expect(box.classList.contains('mb-1.5')).toBe(true)
    expect(box.classList.contains('top-full')).toBe(false)
    // 234 (card top) − 6 (gap) − 16 (margin)
    expect(box.style.maxHeight).toBe('212px')
    expect(box.classList.contains('flex-col')).toBe(true)

    const menu = input.get('[data-test="chat-target-menu"]')
    expect(menu.classes()).toContain('min-h-0')
    const list = menu.get('[role="listbox"]')
    expect(list.classes()).toEqual(expect.arrayContaining(['min-h-0', 'max-h-64', 'overflow-y-auto']))
    expect(menu.findAll('[role="option"]')).toHaveLength(2)
  })

  it('opens the / menu above the composer card (AC-001)', async () => {
    vi.stubGlobal('innerWidth', 1512)
    vi.stubGlobal('innerHeight', 952)
    const input = mountInput()
    await type(input, '/')

    const box = menuWrapper(input, 'chat-skill-menu')
    expect(box.classList.contains('bottom-full')).toBe(true)
    expect(box.classList.contains('top-full')).toBe(false)
    expect(box.style.maxHeight).toBe('212px')
    const menu = input.get('[data-test="chat-skill-menu"]')
    expect(menu.classes()).toContain('min-h-0')
    expect(menu.get('[role="listbox"]').classes()).toEqual(expect.arrayContaining(['min-h-0', 'max-h-64', 'overflow-y-auto']))
  })

  it('keeps the bottom sheet below 640px wide (AC-005)', async () => {
    vi.stubGlobal('innerWidth', 390)
    vi.stubGlobal('innerHeight', 844)
    const input = mountInput()
    await type(input, '@')

    const box = menuWrapper(input, 'chat-target-menu')
    expect(box.classList.contains('fixed')).toBe(true)
    expect(box.classList.contains('inset-x-2')).toBe(true)
    expect(box.classList.contains('bottom-2')).toBe(true)
    expect(box.classList.contains('bottom-full')).toBe(false)
    expect(box.classList.contains('flex')).toBe(false)
    expect(box.style.maxHeight).toBe('')
    expect(input.find('.bg-black\\/20').exists()).toBe(true)
  })
})
