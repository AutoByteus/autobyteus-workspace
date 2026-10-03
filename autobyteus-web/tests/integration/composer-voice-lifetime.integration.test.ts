/** Narrow renderer integration: actual Team publication/projections/adapter/button/store.
 * Media permission, Web Audio capture and Electron transcription are controlled doubles,
 * not real-microphone, network, model or packaged-desktop certification.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { parseTeamStreamServerMessage, teamRunExecutionTreeDtoSchema } from '@autobyteus/team-stream-contracts'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { useComposerTarget } from '~/composables/agentInput/useComposerTarget'
import { useComposerVoiceTarget } from '~/composables/voiceInput/useComposerVoiceTarget'
import { useVoiceInputStore } from '~/stores/voiceInputStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import VoiceInputButton from '~/components/voiceInput/VoiceInputButton.vue'
import VoiceInputStatusRow from '~/components/agentInput/VoiceInputStatusRow.vue'
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext'

const external = vi.hoisted(() => ({
  team: null as AgentTeamContext | null,
  send: vi.fn(), addToast: vi.fn(),
  extensions: { initialize: vi.fn(async () => undefined),
    voiceInput: { status: 'installed', enabled: true, settings: { audioInputDeviceId: null } } },
}))
// Surrounding owners provide selection/context inputs, not fake composer/voice behavior.
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => ({ selectedType: 'team' }) }))
vi.mock('~/stores/agentTeamContextsStore', () => ({ useAgentTeamContextsStore: () => ({ get activeTeamContext() { return external.team } }) }))
vi.mock('~/stores/agentContextsStore', () => ({ useAgentContextsStore: () => ({}) }))
vi.mock('~/stores/agentRunStore', () => ({ useAgentRunStore: () => ({}) }))
vi.mock('~/stores/agentTeamRunStore', () => ({ useAgentTeamRunStore: () => ({ sendMessageToFocusedMember: external.send }) }))
vi.mock('~/stores/contextFileUploadStore', () => ({ useContextFileUploadStore: () => ({}) }))
vi.mock('~/stores/agentOrgContextsStore', () => ({ useAgentOrgContextsStore: () => ({}) }))
vi.mock('~/stores/agentRunCollaborationStore', () => ({ useAgentRunCollaborationStore: () => ({}) }))
vi.mock('~/stores/extensionsStore', () => ({ useExtensionsStore: () => external.extensions }))
vi.mock('~/composables/useToasts', () => ({ useToasts: () => ({ addToast: external.addToast }) }))

const resources = {
  stop: vi.fn(), close: vi.fn(async () => undefined), getUserMedia: vi.fn(),
  transcribe: vi.fn(), flush: vi.fn(), holdFlush: false,
}
class ControlledAudioContext {
  state = 'running'
  audioWorklet = { addModule: vi.fn(async () => undefined) }
  destination = {}
  createMediaStreamSource() { return { connect: vi.fn() } }
  close = resources.close
}
class ControlledWorklet {
  port = {
    onmessage: null as ((event: any) => void) | null,
    postMessage: (message: unknown) => {
      resources.flush(message)
      if (!resources.holdFlush) queueMicrotask(() => this.deliver())
    },
  }
  connect = vi.fn()
  disconnect = vi.fn()
  deliver() {
    this.port.onmessage?.({ data: { type: 'audio-ready', wavData: new Uint8Array([1, 2, 3]),
      diagnostics: { inputSampleRate: 48000, wavSampleRate: 48000, durationMs: 1000,
        rms: 0.04, peak: 0.3, sampleCount: 48000 } } })
  }
}
const wrappers: VueWrapper[] = []
const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
const originalPermissions = Object.getOwnPropertyDescriptor(navigator, 'permissions')
const originalElectronApi = Object.getOwnPropertyDescriptor(window, 'electronAPI')
const stream = () => ({ getTracks: () => [{ stop: resources.stop }] })
const result = { ok: true, text: 'dictated words', detectedLanguage: 'en', noSpeech: false, error: null }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

async function setup() {
  const team = external.team = buildTestTeamContext({ teamRunId: 'voice-team',
    coordinatorAddress: '/lead', focusedAgentRunId: 'lead', rootChildren: [
      testAgentNode('/lead', { agentRunId: 'lead' }),
      testAgentNode('/reviewer', { agentRunId: 'reviewer' }),
      testAgentNode('/engineer', { agentRunId: 'engineer' }),
    ] })
  teamRunExecutionTreeDtoSchema.parse(team.view.getExecutionTree())
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { render: () => null } }] })
  await router.push('/')
  let composer!: ReturnType<typeof useComposerTarget>
  let voice!: ReturnType<typeof useComposerVoiceTarget>
  const Owner = defineComponent({ setup() {
    const localComposer = useComposerTarget()
    const localVoice = useComposerVoiceTarget(() => localComposer.value)
    if (!voice) { composer = localComposer; voice = localVoice }
    return () => h('section', [h(VoiceInputStatusRow), h(VoiceInputButton, { target: localVoice.value })])
  } })
  const mountOwner = () => {
    const wrapper = mount(Owner, { global: { plugins: [router], stubs: { Icon: true } } })
    wrappers.push(wrapper)
    return wrapper
  }
  const wrapper = mountOwner()
  const store = useVoiceInputStore()
  const context = composer.value!.context
  context.requirement = 'existing draft'
  const refresh = async () => {
    const oldComposer = composer.value!
    const sequence = team.view.getChangeSequence() + 1
    const message = parseTeamStreamServerMessage(JSON.stringify({ type: 'TEAM_COMMUNICATION_MESSAGE', payload: {
      change_sequence: sequence, message: { message_id: `message-${sequence}`,
        sender_agent_run_id: 'engineer', receiver_agent_run_id: 'reviewer', content: 'Review ready',
        message_type: 'result', reference_files: [], created_at: '2026-10-03T12:00:00.000Z' },
    } }))
    if (message.type !== 'TEAM_COMMUNICATION_MESSAGE') throw new Error('Unexpected fixture message')
    expect(team.view.applyMessage(message).disposition).toBe('applied')
    await nextTick()
    expect(composer.value).not.toBe(oldComposer)
    expect(composer.value!.context).toBe(context)
    expect(team.view.getFocusedAgentRunId()).toBe('lead')
  }
  const captureStats = () => store.audioWorklet!.port.onmessage!({ data: { type: 'capture-stats', level: 0.25 } } as MessageEvent)
  const start = async () => {
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(store.isRecording).toBe(true)
    captureStats()
  }
  return { team, wrapper, store, composer, voice, context, refresh, start, captureStats, mountOwner }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  resources.holdFlush = false
  resources.getUserMedia.mockResolvedValue(stream())
  resources.transcribe.mockResolvedValue(result)
  vi.stubGlobal('AudioContext', ControlledAudioContext)
  vi.stubGlobal('AudioWorkletNode', ControlledWorklet)
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: { transcribeVoiceInput: resources.transcribe } })
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    enumerateDevices: vi.fn(async () => [{ kind: 'audioinput', deviceId: 'controlled-mic', label: 'Controlled microphone' }]),
    getUserMedia: resources.getUserMedia, addEventListener: vi.fn(),
  } })
  Object.defineProperty(navigator, 'permissions', { configurable: true,
    value: { query: vi.fn(async () => ({ state: 'granted' })) } })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await useVoiceInputStore().cleanup()
  await flushPromises()
  for (const [object, key, descriptor] of [
    [window, 'electronAPI', originalElectronApi],
    [navigator, 'mediaDevices', originalMediaDevices],
    [navigator, 'permissions', originalPermissions],
  ] as const) {
    if (descriptor) Object.defineProperty(object, key, descriptor)
    else Reflect.deleteProperty(object, key)
  }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('composer voice work across actual unrelated Team publications', () => {
  it('keeps capture active across repeated refreshes, then manual Stop appends once without Send', async () => {
    const { wrapper, voice, store, context, refresh, start } = await setup()
    await start()
    const first = voice.value!
    const cancel = vi.spyOn(store, 'cancelOperationForTarget')
    for (let index = 0; index < 3; index++) {
      await refresh()
      expect(store.isRecording).toBe(true)
      expect(voice.value).toBe(first)
      expect(first.isCurrent()).toBe(true)
      expect(wrapper.text()).toContain('Recording...')
      expect(wrapper.get('button').attributes('aria-label')).toBe('Stop recording')
      expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
    }
    expect(cancel).not.toHaveBeenCalled()
    expect(resources.stop).not.toHaveBeenCalled()
    expect(resources.close).not.toHaveBeenCalled()
    expect(resources.transcribe).not.toHaveBeenCalled()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(resources.flush).toHaveBeenCalledExactlyOnceWith({ type: 'FLUSH' })
    expect(resources.transcribe).toHaveBeenCalledOnce()
    expect(context.requirement).toBe('existing draft dictated words')
    expect(store.latestResult?.outcome).toBe('transcript-ready')
    expect(store.isTranscribing).toBe(false)
    expect(resources.stop).toHaveBeenCalledOnce()
    expect(resources.close).toHaveBeenCalledOnce()
    expect(external.send).not.toHaveBeenCalled()
    expect(external.addToast).not.toHaveBeenCalled()
  })

  it.each(['member', 'node', 'unmount'] as const)('cancels actual %s lifetime loss and disposes capture', async kind => {
    const { team, wrapper, voice, store, start } = await setup()
    await start()
    const first = voice.value!
    if (kind === 'member') expect(team.view.focusAgent('reviewer').disposition).toBe('applied')
    if (kind === 'node') useWindowNodeContextStore().bindNodeContext('other', 'http://other.test')
    if (kind === 'unmount') wrapper.unmount()
    await nextTick()
    await flushPromises()
    expect(first.isCurrent()).toBe(false)
    expect(store.isRecording).toBe(false)
    expect(resources.stop).toHaveBeenCalledOnce()
    expect(resources.close).toHaveBeenCalledOnce()
    expect(resources.flush).not.toHaveBeenCalled()
    expect(resources.transcribe).not.toHaveBeenCalled()
  })

  it.each([false, true])('handles publication during pending microphone startup (genuine invalidation=%s)', async invalidate => {
    const { team, wrapper, store, voice, refresh, captureStats } = await setup()
    const pendingMedia = deferred<MediaStream>()
    resources.getUserMedia.mockReturnValueOnce(pendingMedia.promise)
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(resources.getUserMedia).toHaveBeenCalledOnce())
    const first = voice.value!
    await refresh()
    expect(voice.value).toBe(first)
    expect(store.isStarting).toBe(true)
    if (invalidate) { team.view.focusAgent('reviewer'); await nextTick() }
    pendingMedia.resolve(stream() as unknown as MediaStream)
    if (invalidate) {
      await flushPromises()
      expect(store.isStarting).toBe(false)
      expect(store.isRecording).toBe(false)
      expect(resources.stop).toHaveBeenCalledOnce()
    } else {
      await flushPromises()
      captureStats()
      expect(store.isRecording).toBe(true)
      expect(resources.stop).not.toHaveBeenCalled()
    }
    expect(resources.transcribe).not.toHaveBeenCalled()
  })

  it.each([
    { boundary: 'flush', invalidate: false }, { boundary: 'flush', invalidate: true },
    { boundary: 'ipc', invalidate: false }, { boundary: 'ipc', invalidate: true },
  ] as const)('handles publication during pending $boundary (genuine invalidation=$invalidate)', async ({ boundary, invalidate }) => {
      const { team, wrapper, voice, store, context, refresh, start } = await setup()
      await start()
      const first = voice.value!
      const worklet = store.audioWorklet as unknown as ControlledWorklet
      const pendingResult = deferred<typeof result>()
      resources.holdFlush = boundary === 'flush'
      if (boundary === 'ipc') resources.transcribe.mockReturnValueOnce(pendingResult.promise)
      await wrapper.get('button').trigger('click')
      await flushPromises()
      expect(store.isTranscribing).toBe(true)
      await refresh()
      expect(voice.value).toBe(first)
      expect(first.isCurrent()).toBe(true)
      if (invalidate) { team.view.focusAgent('reviewer'); await nextTick() }
      if (boundary === 'flush') worklet.deliver()
      else pendingResult.resolve(result)
      await flushPromises()
      expect(store.isTranscribing).toBe(false)
      expect(context.requirement).toBe(invalidate ? 'existing draft' : 'existing draft dictated words')
      expect(team.view.getAgentContext('reviewer')!.requirement).toBe('')
      expect(resources.transcribe).toHaveBeenCalledTimes(boundary === 'flush' && invalidate ? 0 : 1)
      expect(resources.stop).toHaveBeenCalledOnce()
      expect(resources.close).toHaveBeenCalledOnce()
      expect(external.send).not.toHaveBeenCalled()
  })

  it('does not cancel another composer owner for the same context', async () => {
    const { wrapper, store, voice, mountOwner } = await setup()
    const first = voice.value!
    const other = mountOwner()
    expect(other.getComponent(VoiceInputButton).props('target').key).not.toBe(first.key)
    await other.get('button').trigger('click')
    await flushPromises()
    expect(store.isRecording).toBe(true)
    store.audioWorklet!.port.onmessage!({ data: { type: 'capture-stats', level: 0.25 } } as MessageEvent)
    wrapper.unmount()
    await flushPromises()
    expect(store.isRecording).toBe(true)
    expect(resources.stop).not.toHaveBeenCalled()
    other.unmount()
    await flushPromises()
    expect(store.isRecording).toBe(false)
    expect(resources.stop).toHaveBeenCalledOnce()
  })

  it.each(['project-task', 'settings-test'] as const)('leaves an independent %s operation intact on composer refresh/teardown', async source => {
    const { wrapper, store, refresh } = await setup()
    const task = { key: 'owned-project-task', isCurrent: () => true, appendTranscript: vi.fn() }
    await store.startRecording(source === 'settings-test' ? { source } : { source, target: task })
    store.audioWorklet!.port.onmessage!({ data: { type: 'capture-stats', level: 0.25 } } as MessageEvent)
    await refresh()
    wrapper.unmount()
    await flushPromises()
    expect(store.isRecording).toBe(true)
    expect(store.recordingSource).toBe(source)
    expect(resources.stop).not.toHaveBeenCalled()
    await store.stopRecording()
    expect(resources.transcribe).toHaveBeenCalledOnce()
    expect(task.appendTranscript).toHaveBeenCalledTimes(source === 'project-task' ? 1 : 0)
    expect(external.send).not.toHaveBeenCalled()
  })
})
