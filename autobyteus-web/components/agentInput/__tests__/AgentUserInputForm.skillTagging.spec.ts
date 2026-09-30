import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import AgentUserInputForm from '../AgentUserInputForm.vue'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'

// D-17: `/` skill tags in the product box, for standalone runs only (the `skillTagging` capability).
const harness = vi.hoisted(() => ({ target: null as any }))
vi.mock('~/composables/agentInput/useComposerTarget', async () => {
  const { computed } = await import('vue')
  return { useComposerTarget: () => computed(() => harness.target) }
})

const buildTarget = () => {
  const context = reactive(new AgentContext({
    agentDefinitionId: 'a', agentDefinitionName: 'A', llmModelIdentifier: 'm', runtimeKind: 'codex_app_server',
    workspaceId: null, workspaceMetadata: null, autoExecuteTools: true, skillAccessMode: 'PRELOADED_ONLY', isLocked: true,
  }, new AgentRunState('run-1', { id: 'run-1', messages: [], createdAt: '', updatedAt: '', agentDefinitionId: 'a' }))) as AgentContext
  context.state.currentStatus = AgentStatus.Idle
  return { key: 'run-1', context, draftOwner: null, access: 'live', send: vi.fn(async () => undefined), interrupt: vi.fn() }
}

const capability = { skills: [{ name: 'writer', description: 'Writes' }, { name: 'researcher', description: 'Finds' }], allInstalled: true, placeholder: 'Reply, or type / to use a skill' }

const mountForm = (skillTagging: typeof capability | null) => mount(AgentUserInputForm, {
  props: { skillTagging },
  attachTo: document.body,
  global: {
    stubs: { ContextFilePathInputArea: true, VoiceInputButton: true, VoiceInputStatusRow: true, NuxtLink: true },
    mocks: { $t: (key: string) => key },
  },
})

const type = async (wrapper: ReturnType<typeof mountForm>, text: string) => {
  const textarea = wrapper.get('textarea')
  const element = textarea.element as HTMLTextAreaElement
  element.value = text
  element.setSelectionRange(text.length, text.length)
  await textarea.trigger('input')
  await flushPromises()
}

describe('AgentUserInputForm skill tagging (standalone runs)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    harness.target = buildTarget()
  })

  it('offers `/` skills, writes the chosen tag, and shows a removable chip', async () => {
    const wrapper = mountForm(capability)
    expect(wrapper.get('textarea').attributes('placeholder')).toBe('Reply, or type / to use a skill')

    await type(wrapper, 'draft /wri')
    expect(wrapper.find('[data-test="chat-skill-menu"]').exists()).toBe(true)
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(harness.target.context.requestedSkillNames).toEqual(['writer'])
    expect(harness.target.context.requirement).toBe('draft ')
    expect(harness.target.send).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="chat-skill-menu"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="agent-input-skill-chips"]').text()).toContain('/writer')

    await wrapper.get('[data-test="chat-skill-chip-writer"] button').trigger('click')
    expect(harness.target.context.requestedSkillNames).toEqual([])
    wrapper.unmount()
  })

  it('enables send for a tags-only message', async () => {
    const wrapper = mountForm(capability)
    const primary = () => wrapper.getComponent({ name: 'MessagePrimaryActionButton' })
    expect(primary().props('disabled')).toBe(true)
    harness.target.context.requestedSkillNames = ['writer']
    await flushPromises()
    expect(primary().props('disabled')).toBe(false)
    wrapper.unmount()
  })

  it('leaves the team/org box unchanged without the capability', async () => {
    const wrapper = mountForm(null)
    await type(wrapper, '/wri')
    expect(wrapper.find('[data-test="chat-skill-menu"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="agent-input-skill-chips"]').exists()).toBe(false)
    expect(wrapper.element.classList.contains('overflow-hidden')).toBe(true)
    wrapper.unmount()
  })
})
