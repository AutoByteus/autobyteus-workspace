import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChatMessageInput from '../ChatMessageInput.vue'
import type { AgentContext } from '~/types/agent/AgentContext'

vi.mock('~/composables/agentInput/useComposerFilePathDrop', () => ({
  useComposerFilePathDrop: () => ({ resolveDroppedFilePaths: vi.fn(async () => []) }),
}))

vi.mock('~/composables/runSettings/useMentionCandidates', async () => {
  const { computed } = await import('vue')
  return {
    useMentionCandidates: () => ({
      available: computed(() => true),
      candidates: computed(() => [
        { kind: 'agent', definitionId: 'a1', name: 'Researcher', description: 'Finds sources' },
        { kind: 'agent_team', definitionId: 't1', name: 'Software team', description: 'Builds software', memberCount: 3, coordinatorName: 'lead' },
      ]),
      focusedName: computed(() => 'Daily Assistant'),
      refresh: vi.fn(),
    }),
  }
})

const mentionSource = { kind: 'draft', target: { kind: 'agent', agentDefinitionId: 'autobyteus-daily-assistant' }, focusedName: 'Daily Assistant' }
const skillOptions = [{ name: 'docx', description: 'Word documents' }]

let wrapper: VueWrapper | null = null
/** Mounted inside a positioned "composer card" 234px from the top, as on the New chat page. */
const mountInput = () => {
  const card = document.createElement('div')
  card.style.position = 'relative'
  document.body.appendChild(card)
  vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ top: 234, bottom: 394, left: 0, right: 700, width: 700, height: 160, x: 0, y: 234, toJSON: () => ({}) } as DOMRect)
  const context = reactive({ requirement: '', requestedSkillNames: [] as string[], requestedMentions: [] as unknown[] }) as unknown as AgentContext
  wrapper = mount(ChatMessageInput, {
    props: { context, placeholder: 'Ask anything', skillOptions, skillsAllInstalled: false, mentionSource: mentionSource as never },
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

    const box = menuWrapper(input, 'run-mention-menu')
    expect(box.classList.contains('absolute')).toBe(true)
    expect(box.classList.contains('bottom-full')).toBe(true)
    expect(box.classList.contains('mb-1.5')).toBe(true)
    expect(box.classList.contains('top-full')).toBe(false)
    // 234 (card top) − 6 (gap) − 16 (margin)
    expect(box.style.maxHeight).toBe('212px')
    expect(box.classList.contains('flex-col')).toBe(true)

    const menu = input.get('[data-test="run-mention-menu"]')
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

    const box = menuWrapper(input, 'run-mention-menu')
    expect(box.classList.contains('fixed')).toBe(true)
    expect(box.classList.contains('inset-x-2')).toBe(true)
    expect(box.classList.contains('bottom-2')).toBe(true)
    expect(box.classList.contains('bottom-full')).toBe(false)
    expect(box.classList.contains('flex')).toBe(false)
    expect(box.style.maxHeight).toBe('')
    expect(input.find('.bg-black\\/20').exists()).toBe(true)
  })
})

describe('ChatMessageInput `@` (REQ-011)', () => {
  it('brings a collaborator in: inserts `@Name ` as one token, records the mention and never changes the target', async () => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 900)
    const input = mountInput()
    await type(input, 'Ask @res')

    const menu = input.get('[data-test="run-mention-menu"]')
    expect(menu.find('[data-test="run-mention-menu-footer"]').exists()).toBe(true)
    expect(menu.findAll('[role="option"]')).toHaveLength(1)

    await input.get('[data-test="chat-message-input"]').trigger('keydown', { key: 'Enter' })
    const context = input.props('context') as AgentContext
    expect(context.requirement).toBe('Ask @Researcher ')
    expect(context.requestedMentions).toEqual([{ kind: 'agent', definitionId: 'a1', name: 'Researcher' }])
    expect(input.emitted('submit')).toBeUndefined()
  })
})
