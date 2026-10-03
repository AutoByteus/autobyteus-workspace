import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick, reactive, shallowRef } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useComposerVoiceTarget } from '../useComposerVoiceTarget'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget'
import { testAgentContext } from '~/test-support/currentTeamTestFixtures'

const target = (runId = 'same-run'): ComposerTarget => ({
  key: runId, context: reactive(testAgentContext({ runId })),
  draftOwner: null, access: 'live', send: vi.fn(async () => undefined),
})
const wrappers: VueWrapper[] = []
function setup(initial: ComposerTarget | null = target()) {
  const current = shallowRef(initial)
  let voice!: ReturnType<typeof useComposerVoiceTarget>
  const wrapper = mount(defineComponent({ setup() {
    voice = useComposerVoiceTarget(() => current.value)
    // Read on every render, as the real composer does; eligibility retirement is observed.
    return () => h('div', { 'data-key': voice.value?.key })
  } }))
  wrappers.push(wrapper)
  return { current, voice, wrapper }
}

describe('mounted composer voice destination lifetime', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()) })

  it('retains the exact sink/key across presentation, draft, and live-access refreshes', async () => {
    const { current, voice } = setup()
    const first = voice.value!
    for (const access of ['draft', 'live'] as const) {
      current.value = { ...current.value!, key: 'presentation-only', access,
        mentionScope: { rootKind: 'agent', rootRunId: 'root', focusedName: 'New label' } }
      await nextTick()
      expect(voice.value).toBe(first)
      expect(voice.value!.key).toBe(first.key)
      expect(first.isCurrent()).toBe(true)
    }
    current.value!.context.requirement = 'existing draft'
    first.appendTranscript('dictated words')
    expect(current.value!.context.requirement).toBe('existing draft dictated words')
    expect(current.value!.send).not.toHaveBeenCalled()
  })

  it('replaces an exact context even if the runId/key are the same, without revival', async () => {
    const original = target()
    const { current, voice } = setup(original)
    const first = voice.value!
    current.value = target()
    expect(first.isCurrent()).toBe(false)
    await nextTick()
    const replacement = voice.value!
    expect(replacement.key).not.toBe(first.key)
    expect(replacement.isCurrent()).toBe(true)
    current.value = original
    await nextTick()
    expect(voice.value!.key).not.toBe(first.key)
    expect(first.isCurrent()).toBe(false)
    expect(replacement.isCurrent()).toBe(false)
  })

  it.each(['null', 'read_only'] as const)('retires observed %s eligibility and never revives that sink', async (kind) => {
    const original = target()
    const { current, voice } = setup(original)
    const first = voice.value!
    current.value = kind === 'null' ? null : { ...original, access: 'read_only' }
    expect(first.isCurrent()).toBe(false)
    await nextTick()
    expect(voice.value).toBeNull()
    current.value = original
    await nextTick()
    expect(voice.value!.key).not.toBe(first.key)
    expect(first.isCurrent()).toBe(false)
  })

  it('retires on actual node rebinding, but not on rebinding the same node', async () => {
    const node = useWindowNodeContextStore()
    node.bindNodeContext('node-a', 'http://node-a.test')
    const { voice } = setup()
    const first = voice.value!
    node.bindNodeContext('node-a', 'http://node-a.test')
    await nextTick()
    expect(voice.value).toBe(first)
    node.bindNodeContext('node-b', 'http://node-b.test')
    expect(first.isCurrent()).toBe(false)
    await nextTick()
    expect(voice.value!.key).not.toBe(first.key)
    expect(voice.value!.isCurrent()).toBe(true)
  })

  it('isolates mounted owners and retires only the unmounted owner', () => {
    const shared = target()
    const one = setup(shared), two = setup(shared)
    const first = one.voice.value!, second = two.voice.value!
    expect(first.key).not.toBe(second.key)
    one.wrapper.unmount()
    expect(first.isCurrent()).toBe(false)
    expect(second.isCurrent()).toBe(true)
  })

  it('starts without a destination and never issues a current sink after teardown', async () => {
    const { current, voice, wrapper } = setup(null)
    expect(voice.value).toBeNull()
    current.value = target()
    await nextTick()
    const first = voice.value!
    wrapper.unmount()
    expect(first.isCurrent()).toBe(false)
  })
})
