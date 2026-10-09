import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import ChatComposer from '../ChatComposer.vue'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget'

vi.mock('~/composables/useToasts', () => ({ useToasts: () => ({ addToast: vi.fn() }) }))

const buildTarget = (overrides: Partial<ComposerTarget> = {}) => {
  const context = reactive(new AgentContext({
    agentDefinitionId: 'a', agentDefinitionName: 'A', llmModelIdentifier: 'm', runtimeKind: 'autobyteus',
    workspaceId: null, workspaceMetadata: null, autoExecuteTools: true, isLocked: false,
  }, new AgentRunState('temp-1', { id: 'temp-1', messages: [], createdAt: '', updatedAt: '', agentDefinitionId: 'a' }))) as AgentContext
  context.state.currentStatus = AgentStatus.Offline
  return {
    key: 'temp-1',
    context,
    draftOwner: null,
    access: 'draft' as const,
    send: vi.fn(async () => undefined),
    interrupt: vi.fn(),
    ...overrides,
  }
}

const mountComposer = (target: ComposerTarget, props: Record<string, unknown> = {}) => mount(ChatComposer, {
  props: { target, placeholder: 'Ask anything', skillOptions: [], ...props },
  slots: {
    'footer-left': '<span data-test="slot-left">left</span>',
    'footer-right': '<span data-test="slot-model">model</span>',
  },
  global: {
    stubs: {
      ContextFilePathInputArea: { template: '<div data-test="context-files" />' },
      VoiceInputButton: { template: '<button data-test="mic" />' },
      VoiceInputStatusRow: true,
    },
    mocks: { $t: (key: string) => key },
  },
})

describe('ChatComposer', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps the footer order: left group, then model controls, mic and send last', () => {
    const wrapper = mountComposer(buildTarget())
    const footer = wrapper.get('[data-test="chat-composer-footer"]').html()
    const order = ['slot-left', 'slot-model', 'data-test="mic"', 'chat-primary-action'].map((marker) => footer.indexOf(marker))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('enables send only for text or a skill tag, never for context files alone', async () => {
    const target = buildTarget()
    const wrapper = mountComposer(target)
    const send = () => wrapper.get('[data-test="chat-primary-action"]')
    expect(send().attributes('disabled')).toBeDefined()

    target.context.requestedSkillNames = ['writer']
    await flushPromises()
    expect(send().attributes('disabled')).toBeUndefined()

    target.context.requestedSkillNames = []
    target.context.contextFilePaths = [{ kind: 'workspace_path', id: 'f', locator: '/a.txt', type: 'Text' } as any]
    await flushPromises()
    expect(send().attributes('disabled')).toBeDefined()
    await send().trigger('click')
    expect(target.send).not.toHaveBeenCalled()

    target.context.requirement = 'summarize this file'
    await flushPromises()
    expect(send().attributes('disabled')).toBeUndefined()
    await send().trigger('click')
    expect(target.send).toHaveBeenCalledTimes(1)
  })

  it('labels a blocked send with its reason', async () => {
    const target = buildTarget()
    target.context.requirement = 'hello'
    const wrapper = mountComposer(target, { sendBlockedReason: 'Codex App Server is unavailable. Choose another runtime.' })
    const send = wrapper.get('[data-test="chat-primary-action"]')
    expect(send.attributes('disabled')).toBeDefined()
    expect(send.attributes('title')).toBe('Codex App Server is unavailable. Choose another runtime.')
  })

  it('shows stop while the run is running and interrupts', async () => {
    const target = buildTarget({ access: 'live' })
    target.context.state.currentStatus = AgentStatus.Running
    const wrapper = mountComposer(target)
    const action = wrapper.get('[data-test="chat-primary-action"]')
    expect(action.attributes('title')).toBe('Stop generation')
    await action.trigger('click')
    expect(target.interrupt).toHaveBeenCalled()
    expect(target.send).not.toHaveBeenCalled()
  })

  it('renders removable skill chips from the context tags', async () => {
    const target = buildTarget()
    target.context.requestedSkillNames = ['writer', 'skill-optimizer']
    const wrapper = mountComposer(target)
    expect(wrapper.get('[data-test="chat-composer-chips"]').text()).toContain('/writer')
    await wrapper.get('[data-test="chat-skill-chip-writer"] button').trigger('click')
    expect(target.context.requestedSkillNames).toEqual(['skill-optimizer'])
  })
})
