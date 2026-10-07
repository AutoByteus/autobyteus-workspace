import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'

const mocks = vi.hoisted(() => ({
  route: { path: '/chat', query: {} as Record<string, string> },
}))

vi.mock('vue-router', () => ({ useRoute: () => mocks.route, useRouter: () => ({ push: vi.fn() }) }))
vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({
    agentDefinitions: [{ id: 'autobyteus-daily-assistant', name: 'Daily Assistant' }],
    fetchAllAgentDefinitions: vi.fn(async () => undefined),
    getAgentDefinitionById: (id: string) => (id === 'autobyteus-daily-assistant' ? { id, name: 'Daily Assistant' } : undefined),
  }),
}))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => ({
    agentTeamDefinitions: [{ id: 'team-1', name: 'Software Engineering Team', coordinatorMemberName: 'lead', nodes: [] }],
    fetchAllAgentTeamDefinitions: vi.fn(async () => undefined),
  }),
}))
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => ({ tempWorkspaceId: 'temp_ws', findWorkspaceInfoByRootPath: () => null }) }))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: () => ({ fetchRuntimeAvailabilities: vi.fn(async () => []), isRuntimeEnabled: () => true }),
}))
vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => ({
    fetchProvidersWithModels: vi.fn(async () => undefined),
    models: () => ['gpt-5.5'],
    modelConfigSchemaByIdentifier: () => null,
  }),
}))

import ChatDraftRows from '../ChatDraftRows.vue'
import { useChatDraftStore } from '~/stores/chatDraftStore'
import { useChatDraftRows } from '~/composables/chat/useChatDraftRows'

// The rows sit under the Chat row inside the Chat item, as in AppLeftPanel.
const Host = defineComponent({
  emits: ['open'],
  setup(_, { emit }) {
    return () => h('li', [
      h('button', { 'data-test': 'app-left-panel-chat' }, 'Chat'),
      h(ChatDraftRows, { onOpen: (id: string) => emit('open', id) }),
    ])
  },
})

const mountRows = () => mount(Host, { attachTo: document.body, global: { stubs: { Icon: true } } })
const rowTexts = (wrapper: ReturnType<typeof mountRows>) =>
  wrapper.findAll('[data-test="chat-draft-preview"]').map((preview) => preview.text())

describe('ChatDraftRows', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.route.path = '/chat'
    mocks.route.query = {}
    document.body.innerHTML = ''
  })

  const draftWith = (text: string, start = () => useChatDraftStore().startNewChat()) => {
    const draft = start()
    draft.context.requirement = text
    return draft
  }

  it('shows no list until a New chat has typed text; attachments alone add no row (REQ-001)', async () => {
    const draft = useChatDraftStore().startNewChat()
    draft.context.contextFilePaths = [{ path: '/tmp/a.png', type: 'Image' } as any]
    const wrapper = mountRows()
    expect(wrapper.findAll('[data-test="chat-draft-row"]')).toHaveLength(0)

    draft.context.requirement = '/rev'
    await nextTick()
    expect(wrapper.findAll('[data-test="chat-draft-row"]')).toHaveLength(0)

    draft.context.requirement = 'Write the release notes'
    await nextTick()
    expect(rowTexts(wrapper)).toEqual(['Write the release notes'])
  })

  it('lists drafts newest started first, one line each, with the open one selected (REQ-002/003)', async () => {
    draftWith('first   draft\nsecond line')
    draftWith('team draft', () => useChatDraftStore().startForDefinition({ kind: 'team', teamDefinitionId: 'team-1' }))
    const open = draftWith('open draft')
    await flushPromises()
    const wrapper = mountRows()

    expect(wrapper.get('[data-test="chat-draft-rows"]').attributes('aria-label')).toBe('Drafts')
    expect(rowTexts(wrapper)).toEqual(['open draft', 'team draft', 'first draft second line'])
    const rows = wrapper.findAll('[data-test="chat-draft-row"]')
    expect(rows[0]!.attributes('aria-current')).toBe('page')
    expect(rows[0]!.classes()).toContain('bg-gray-100')
    expect(rows[1]!.attributes('aria-current')).toBeUndefined()
    expect(rows[1]!.attributes('aria-label')).toBe('Draft: team draft — Software Engineering Team')
    expect(rows[1]!.attributes('title')).toBe('team draft\nSoftware Engineering Team')
    expect(wrapper.findAll('[data-test="chat-draft-discard"]')[1]!.attributes('aria-label')).toBe('Discard draft: team draft')
    expect(useChatDraftStore().openDraftId).toBe(open.id)
  })

  it('selects no row off the New chat surface and hides a cleared open draft there (REQ-008)', async () => {
    const kept = draftWith('kept')
    const cleared = draftWith('soon empty')
    cleared.context.requirement = ''
    const wrapper = mountRows()
    const rows = wrapper.findAll('[data-test="chat-draft-row"]')
    expect(rows.map((row) => row.attributes('aria-label')))
      .toEqual(['Draft: Empty draft — Daily Assistant', 'Draft: kept — Daily Assistant'])
    expect(rows[0]!.attributes('aria-current')).toBe('page')
    expect(wrapper.find('[data-test="chat-draft-preview"]').classes()).toEqual(expect.arrayContaining(['italic', 'text-gray-400']))

    wrapper.unmount()
    mocks.route.query = { id: 'run-1' }
    const elsewhere = mountRows()
    expect(rowTexts(elsewhere)).toEqual(['kept'])
    expect(elsewhere.find('[aria-current="page"]').exists()).toBe(false)
    expect(kept.listed).toBe(true)
  })

  it('emits open with the draft id', async () => {
    const draft = draftWith('open me')
    useChatDraftStore().startNewChat()
    const wrapper = mountRows()
    await wrapper.get('[data-test="chat-draft-row"]').trigger('click')
    expect(wrapper.emitted('open')).toEqual([[draft.id]])
  })

  it('× discards without confirmation and moves focus to the next row, else the previous, else Chat (REQ-007)', async () => {
    const oldest = draftWith('oldest')
    const middle = draftWith('middle')
    draftWith('newest')
    useChatDraftStore().startNewChat()
    const wrapper = mountRows()
    const discard = (index: number) => wrapper.findAll('[data-test="chat-draft-discard"]')[index]!.trigger('click')

    await discard(1)
    await flushPromises()
    expect(useChatDraftStore().drafts.some((draft) => draft.id === middle.id)).toBe(false)
    expect(document.activeElement?.closest('[data-draft-id]')?.getAttribute('data-draft-id')).toBe(oldest.id)

    await discard(1)
    await flushPromises()
    expect(document.activeElement?.textContent).toContain('newest')

    await discard(0)
    await flushPromises()
    expect(document.activeElement?.getAttribute('data-test')).toBe('app-left-panel-chat')
    expect(wrapper.findAll('[data-test="chat-draft-row"]')).toHaveLength(0)
  })

  it('discarding the open draft opens a blank New chat and selects no row', async () => {
    draftWith('open one')
    const wrapper = mountRows()
    await wrapper.get('[data-test="chat-draft-discard"]').trigger('click')
    await flushPromises()

    const store = useChatDraftStore()
    expect(store.drafts).toHaveLength(1)
    expect(store.draft!.context.requirement).toBe('')
    expect(useChatDraftRows().rowSelected.value).toBe(false)
  })
})
